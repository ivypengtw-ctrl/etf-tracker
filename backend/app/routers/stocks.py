from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.database import get_db
from app.models import Stock, HoldingsSnapshot, HoldingsChange, ETF
from app.schemas import StockOut

QUICKSCRIBE_BASE = "https://quickscribe.cc/api"

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/search")
async def search_stocks(q: str = Query(default="", min_length=1), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import or_
    from app.models import Stock
    pattern = f"%{q}%"
    result = await db.execute(
        select(Stock)
        .where(or_(Stock.ticker.ilike(pattern), Stock.name.ilike(pattern)))
        .order_by(Stock.ticker)
        .limit(20)
    )
    stocks = result.scalars().all()
    return [{"ticker": s.ticker, "name": s.name, "industry": s.industry} for s in stocks]


@router.get("/turnover-ranking")
async def turnover_ranking(limit: int = Query(default=50, le=100)):
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{QUICKSCRIBE_BASE}/turnover-ranking?limit={limit}")
        r.raise_for_status()
        return r.json()


@router.get("/{ticker}/etf-activity")
async def stock_etf_activity(ticker: str, db: AsyncSession = Depends(get_db)):
    """Return all ETF change events for a specific stock, grouped by date."""
    from collections import defaultdict

    rows = (await db.execute(
        select(
            HoldingsChange.change_date,
            ETF.code.label("etf_code"),
            ETF.name.label("etf_name"),
            HoldingsChange.change_type,
            HoldingsChange.shares_before,
            HoldingsChange.shares_after,
            HoldingsChange.shares_delta,
        )
        .join(ETF, ETF.id == HoldingsChange.etf_id)
        .where(HoldingsChange.stock_ticker == ticker)
        .order_by(desc(HoldingsChange.change_date), ETF.code)
    )).all()

    # Group by date
    by_date: dict = defaultdict(list)
    for r in rows:
        by_date[str(r.change_date)].append({
            "etf_code": r.etf_code,
            "etf_name": r.etf_name,
            "change_type": r.change_type.value,
            "shares_before": r.shares_before,
            "shares_after": r.shares_after,
            "shares_delta": r.shares_delta,
        })

    # Current holders from latest snapshot
    latest_snap = (await db.execute(
        select(func.max(HoldingsSnapshot.snapshot_date))
    )).scalar()

    holders = []
    if latest_snap:
        snap_rows = (await db.execute(
            select(ETF.code, ETF.name, HoldingsSnapshot.shares, HoldingsSnapshot.weight_pct)
            .join(HoldingsSnapshot, HoldingsSnapshot.etf_id == ETF.id)
            .where(
                HoldingsSnapshot.stock_ticker == ticker,
                HoldingsSnapshot.snapshot_date == latest_snap,
            )
            .order_by(HoldingsSnapshot.weight_pct.desc())
        )).all()
        holders = [
            {"etf_code": r.code, "etf_name": r.name, "shares": r.shares, "weight_pct": float(r.weight_pct)}
            for r in snap_rows
        ]

    return {
        "ticker": ticker,
        "snapshot_date": str(latest_snap) if latest_snap else None,
        "holder_count": len(holders),
        "holders": holders,
        "change_dates": [
            {"date": d, "events": evs}
            for d, evs in sorted(by_date.items(), reverse=True)
        ],
    }


@router.get("/{ticker}", response_model=StockOut)
async def get_stock(ticker: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Stock).where(Stock.ticker == ticker))
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    holders_result = await db.execute(
        select(ETF.code, ETF.name, HoldingsSnapshot.weight_pct)
        .join(HoldingsSnapshot, HoldingsSnapshot.etf_id == ETF.id)
        .where(HoldingsSnapshot.stock_ticker == ticker)
        .order_by(HoldingsSnapshot.snapshot_date.desc())
        .limit(50)
    )
    held_by = [
        {"etf_code": r.code, "etf_name": r.name, "weight_pct": float(r.weight_pct)}
        for r in holders_result.all()
    ]

    return StockOut(
        ticker=stock.ticker,
        name=stock.name,
        industry=stock.industry,
        sub_industry=stock.sub_industry,
        founding_year=stock.founding_year,
        main_business=stock.main_business,
        held_by=held_by,
    )
