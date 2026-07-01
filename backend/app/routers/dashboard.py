from collections import defaultdict
from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.database import get_db
from app.models import ETF, HoldingsChange, HoldingsSnapshot, Stock, ChangeType
from app.services.dashboard import get_summary_stats, get_cross_etf_rankings, get_top_etfs
from app.services.summary_text import generate_summary_text

QUICKSCRIBE_BASE = "https://quickscribe.cc/api"

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def _latest_date(db: AsyncSession) -> date:
    """Return the most recent date that has any holdings change data."""
    result = await db.execute(select(func.max(HoldingsChange.change_date)))
    return result.scalar() or date.today()


@router.get("/summary")
async def dashboard_summary(
    target_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    if target_date is None:
        target_date = await _latest_date(db)

    stats = await get_summary_stats(db, target_date)
    cross_buys = await get_cross_etf_rankings(db, target_date, "buy")
    cross_sells = await get_cross_etf_rankings(db, target_date, "sell")
    top_buy = await get_top_etfs(db, target_date, "buy")
    top_sell = await get_top_etfs(db, target_date, "sell")

    total_etf_count_result = await db.execute(select(func.count(ETF.id)))
    total_etf_count = total_etf_count_result.scalar() or 0

    updated_count_result = await db.execute(
        select(func.count(HoldingsChange.etf_id.distinct())).where(
            HoldingsChange.change_date == target_date
        )
    )
    updated_count = updated_count_result.scalar() or 0

    top_etf = top_buy[0] if top_buy else None
    top_industry = cross_buys[0]["ticker"] if cross_buys else "N/A"
    summary_text = generate_summary_text(
        total_buy=stats["total_buy_billion"],
        total_sell=stats["total_sell_billion"],
        top_industry=top_industry,
        top_industry_amount=cross_buys[0]["total_amount_billion"] if cross_buys else 0,
        top_etf_code=top_etf["etf_code"] if top_etf else "N/A",
        top_etf_name=top_etf["etf_name"] if top_etf else "",
        top_etf_amount=top_etf["total_amount_billion"] if top_etf else 0,
    )

    return {
        "date": target_date,
        "total_buy_billion": stats["total_buy_billion"],
        "total_sell_billion": stats["total_sell_billion"],
        "etf_count_buy": stats["etf_count_buy"],
        "etf_count_sell": stats["etf_count_sell"],
        "updated_count": updated_count,
        "total_etf_count": total_etf_count,
        "summary_text": summary_text,
        "top_cross_buys": cross_buys,
        "top_cross_sells": cross_sells,
        "top_etfs_buy": top_buy,
        "top_etfs_sell": top_sell,
    }


@router.get("/common-holdings")
async def common_holdings(db: AsyncSession = Depends(get_db)):
    # ── 1. Latest snapshot date ───────────────────────────────────────────────
    latest_snap = (await db.execute(select(func.max(HoldingsSnapshot.snapshot_date)))).scalar()
    if not latest_snap:
        return {"analysis_date": str(date.today()), "top_overlap": [], "recent_multi_etf_increases": [], "weekly_new_holdings": []}

    # ── 2. Top overlap: stocks held by most ETFs (from latest snapshots) ─────
    # Get the latest snapshot_date per ETF, then find cross-ETF holdings
    latest_per_etf_sq = (
        select(
            HoldingsSnapshot.etf_id,
            func.max(HoldingsSnapshot.snapshot_date).label("max_date"),
        )
        .group_by(HoldingsSnapshot.etf_id)
        .subquery()
    )
    overlap_rows = (await db.execute(
        select(
            HoldingsSnapshot.stock_ticker,
            Stock.name.label("stock_name"),
            func.count(HoldingsSnapshot.etf_id.distinct()).label("etf_count"),
            func.sum(HoldingsSnapshot.shares).label("total_shares"),
        )
        .join(latest_per_etf_sq, and_(
            HoldingsSnapshot.etf_id == latest_per_etf_sq.c.etf_id,
            HoldingsSnapshot.snapshot_date == latest_per_etf_sq.c.max_date,
        ))
        .outerjoin(Stock, Stock.ticker == HoldingsSnapshot.stock_ticker)
        .group_by(HoldingsSnapshot.stock_ticker, Stock.name)
        .having(func.count(HoldingsSnapshot.etf_id.distinct()) >= 2)
        .order_by(func.count(HoldingsSnapshot.etf_id.distinct()).desc())
        .limit(30)
    )).all()

    # For each overlap stock, collect ETF codes
    overlap_etf_codes: dict[str, list[str]] = {}
    if overlap_rows:
        tickers = [r.stock_ticker for r in overlap_rows]
        etf_snap_rows = (await db.execute(
            select(HoldingsSnapshot.stock_ticker, ETF.code)
            .join(latest_per_etf_sq, and_(
                HoldingsSnapshot.etf_id == latest_per_etf_sq.c.etf_id,
                HoldingsSnapshot.snapshot_date == latest_per_etf_sq.c.max_date,
            ))
            .join(ETF, ETF.id == HoldingsSnapshot.etf_id)
            .where(HoldingsSnapshot.stock_ticker.in_(tickers))
        )).all()
        for row in etf_snap_rows:
            overlap_etf_codes.setdefault(row.stock_ticker, []).append(row.code)

    top_overlap = [
        {
            "stock_code": r.stock_ticker,
            "stock_name": r.stock_name or r.stock_ticker,
            "etf_count": r.etf_count,
            "total_shares": r.total_shares,
            "etf_codes": sorted(overlap_etf_codes.get(r.stock_ticker, [])),
        }
        for r in overlap_rows
    ]

    # ── 3. Recent multi-ETF increases ─────────────────────────────────────────
    # Stocks where 2+ ETFs have added/increased in recent changes
    cutoff = date.today() - timedelta(days=14)
    inc_rows = (await db.execute(
        select(
            HoldingsChange.stock_ticker,
            Stock.name.label("stock_name"),
            func.count(HoldingsChange.etf_id.distinct()).label("etf_count"),
            func.sum(HoldingsChange.shares_delta).label("total_delta"),
        )
        .outerjoin(Stock, Stock.ticker == HoldingsChange.stock_ticker)
        .where(
            HoldingsChange.change_type.in_([ChangeType.added, ChangeType.increased]),
            HoldingsChange.change_date >= cutoff,
        )
        .group_by(HoldingsChange.stock_ticker, Stock.name)
        .having(func.count(HoldingsChange.etf_id.distinct()) >= 2)
        .order_by(func.count(HoldingsChange.etf_id.distinct()).desc(), func.sum(HoldingsChange.shares_delta).desc())
        .limit(20)
    )).all()

    # Collect per-ETF detail for each stock
    if inc_rows:
        inc_tickers = [r.stock_ticker for r in inc_rows]
        detail_rows = (await db.execute(
            select(HoldingsChange.stock_ticker, ETF.code, HoldingsChange.shares_delta, HoldingsChange.change_date)
            .join(ETF, ETF.id == HoldingsChange.etf_id)
            .where(
                HoldingsChange.change_type.in_([ChangeType.added, ChangeType.increased]),
                HoldingsChange.change_date >= cutoff,
                HoldingsChange.stock_ticker.in_(inc_tickers),
            )
        )).all()
        inc_detail: dict[str, dict[str, int]] = defaultdict(dict)
        for r in detail_rows:
            inc_detail[r.stock_ticker][r.code] = r.shares_delta
    else:
        inc_detail = {}

    recent_multi_etf_increases = [
        {
            "stock_code": r.stock_ticker,
            "stock_name": r.stock_name or r.stock_ticker,
            "etf_count": r.etf_count,
            "total_delta": r.total_delta,
            "etf_codes": sorted(inc_detail.get(r.stock_ticker, {}).keys()),
            "increase_info": inc_detail.get(r.stock_ticker, {}),
        }
        for r in inc_rows
    ]

    # ── 4. Weekly new holdings: ETFs that added NEW stocks recently ───────────
    new_rows = (await db.execute(
        select(
            ETF.code.label("etf_code"),
            ETF.name.label("etf_name"),
            HoldingsChange.stock_ticker,
            Stock.name.label("stock_name"),
            HoldingsChange.shares_after,
            HoldingsChange.change_date,
        )
        .join(ETF, ETF.id == HoldingsChange.etf_id)
        .outerjoin(Stock, Stock.ticker == HoldingsChange.stock_ticker)
        .where(
            HoldingsChange.change_type == ChangeType.added,
            HoldingsChange.change_date >= cutoff,
        )
        .order_by(HoldingsChange.change_date.desc(), ETF.code)
    )).all()

    etf_new: dict[str, dict] = {}
    for r in new_rows:
        if r.etf_code not in etf_new:
            etf_new[r.etf_code] = {"etf_code": r.etf_code, "etf_name": r.etf_name, "stocks": []}
        etf_new[r.etf_code]["stocks"].append({
            "stock_code": r.stock_ticker,
            "stock_name": r.stock_name or r.stock_ticker,
            "shares": r.shares_after,
            "date": str(r.change_date),
        })

    return {
        "analysis_date": str(latest_snap),
        "top_overlap": top_overlap,
        "recent_multi_etf_increases": recent_multi_etf_increases,
        "weekly_new_holdings": list(etf_new.values()),
    }


@router.get("/weekly-manager-summary")
async def weekly_manager_summary():
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{QUICKSCRIBE_BASE}/etfs/weekly-manager-summary")
        r.raise_for_status()
        return r.json()


@router.get("/cross-etf")
async def cross_etf(
    target_date: date | None = Query(default=None),
    direction: str = Query(default="buy"),
    top_n: int = Query(default=3),
    db: AsyncSession = Depends(get_db),
):
    if target_date is None:
        target_date = await _latest_date(db)
    return await get_cross_etf_rankings(db, target_date, direction, top_n)
