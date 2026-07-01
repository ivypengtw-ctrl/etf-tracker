from datetime import date as Date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import ETF, HoldingsChange, ChangeType, Stock, HoldingsSnapshot
from app.schemas import ETFOut, ETFChangesOut, ETFDailySummary, HoldingsChangeOut, ETFHoldingsOut, HoldingSnapshotOut

router = APIRouter(prefix="/etfs", tags=["etfs"])


@router.get("", response_model=list[ETFOut])
async def list_etfs(
    search: str | None = Query(None),
    type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(ETF)
        .options(selectinload(ETF.manager))
        .order_by(ETF.market_cap_billion.desc().nullslast(), ETF.code)
    )
    if search:
        q = q.where(ETF.name.ilike(f"%{search}%") | ETF.code.ilike(f"%{search}%"))
    if type:
        q = q.where(ETF.type == type)
    result = await db.execute(q)
    etfs = result.scalars().all()

    if not etfs:
        return []

    # For each ETF get changes from its most recent change_date
    etf_ids = [e.id for e in etfs]

    # Subquery: max change_date per ETF
    max_date_sq = (
        select(
            HoldingsChange.etf_id,
            func.max(HoldingsChange.change_date).label("max_date"),
        )
        .where(HoldingsChange.etf_id.in_(etf_ids))
        .group_by(HoldingsChange.etf_id)
        .subquery()
    )

    # Also fetch max_date map for populating last_change_date
    max_dates_result = await db.execute(
        select(HoldingsChange.etf_id, func.max(HoldingsChange.change_date).label("max_date"))
        .where(HoldingsChange.etf_id.in_(etf_ids))
        .group_by(HoldingsChange.etf_id)
    )
    max_dates: dict = {r.etf_id: r.max_date for r in max_dates_result.all()}

    # Fetch all changes for each ETF's most recent date
    recent_changes_result = await db.execute(
        select(HoldingsChange).join(
            max_date_sq,
            and_(
                HoldingsChange.etf_id == max_date_sq.c.etf_id,
                HoldingsChange.change_date == max_date_sq.c.max_date,
            ),
        )
    )
    all_changes = recent_changes_result.scalars().all()

    from collections import defaultdict
    changes_by_etf: dict = defaultdict(list)
    for c in all_changes:
        changes_by_etf[c.etf_id].append(c)

    out = []
    for etf in etfs:
        changes = changes_by_etf[etf.id]
        added = sum(1 for c in changes if c.change_type == ChangeType.added)
        removed = sum(1 for c in changes if c.change_type == ChangeType.removed)
        buy = sum(
            (c.amount_billion or Decimal("0"))
            for c in changes
            if c.change_type in (ChangeType.added, ChangeType.increased)
        )
        sell = sum(
            abs(c.amount_billion or Decimal("0"))
            for c in changes
            if c.change_type in (ChangeType.removed, ChangeType.decreased)
        )
        etf_data = ETFOut.model_validate(etf)
        etf_data.today_summary = ETFDailySummary(
            added_count=added,
            removed_count=removed,
            buy_billion=buy if buy > 0 else None,
            sell_billion=sell if sell > 0 else None,
            last_change_date=max_dates.get(etf.id),
        )
        out.append(etf_data)
    return out


@router.get("/{code}", response_model=ETFOut)
async def get_etf(code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ETF).options(selectinload(ETF.manager)).where(ETF.code == code)
    )
    etf = result.scalar_one_or_none()
    if not etf:
        raise HTTPException(status_code=404, detail="ETF not found")
    return etf


@router.get("/{code}/changes", response_model=ETFChangesOut)
async def get_etf_changes(
    code: str,
    date: Date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ETF).options(selectinload(ETF.manager)).where(ETF.code == code)
    )
    etf = result.scalar_one_or_none()
    if not etf:
        raise HTTPException(status_code=404, detail="ETF not found")

    # If no date given, use the most recent date that has data for this ETF
    if date is None:
        max_date_result = await db.execute(
            select(func.max(HoldingsChange.change_date)).where(
                HoldingsChange.etf_id == etf.id
            )
        )
        date = max_date_result.scalar_one_or_none()
        if date is None:
            return ETFChangesOut(etf=etf, change_date=None, changes=[])

    changes_result = await db.execute(
        select(HoldingsChange, Stock.name.label("stock_name"))
        .outerjoin(Stock, Stock.ticker == HoldingsChange.stock_ticker)
        .where(
            HoldingsChange.etf_id == etf.id,
            HoldingsChange.change_date == date,
        )
    )
    rows = changes_result.all()
    changes = [
        HoldingsChangeOut(
            stock_ticker=r.HoldingsChange.stock_ticker,
            stock_name=r.stock_name,
            change_type=r.HoldingsChange.change_type,
            shares_before=r.HoldingsChange.shares_before,
            shares_after=r.HoldingsChange.shares_after,
            shares_delta=r.HoldingsChange.shares_delta,
            amount_billion=r.HoldingsChange.amount_billion,
        )
        for r in rows
    ]
    return ETFChangesOut(etf=etf, change_date=date, changes=changes)


@router.get("/{code}/holdings", response_model=ETFHoldingsOut)
async def get_etf_holdings(code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ETF).where(ETF.code == code))
    etf = result.scalar_one_or_none()
    if not etf:
        raise HTTPException(status_code=404, detail="ETF not found")

    max_date_result = await db.execute(
        select(func.max(HoldingsSnapshot.snapshot_date)).where(
            HoldingsSnapshot.etf_id == etf.id
        )
    )
    snapshot_date = max_date_result.scalar_one_or_none()
    if snapshot_date is None:
        return ETFHoldingsOut(snapshot_date=None, count=0, holdings=[])

    rows_result = await db.execute(
        select(HoldingsSnapshot, Stock.name.label("stock_name"), Stock.industry.label("industry"))
        .outerjoin(Stock, Stock.ticker == HoldingsSnapshot.stock_ticker)
        .where(
            HoldingsSnapshot.etf_id == etf.id,
            HoldingsSnapshot.snapshot_date == snapshot_date,
        )
        .order_by(HoldingsSnapshot.weight_pct.desc())
    )
    rows = rows_result.all()
    holdings = [
        HoldingSnapshotOut(
            stock_ticker=r.HoldingsSnapshot.stock_ticker,
            stock_name=r.stock_name,
            industry=r.industry,
            shares=r.HoldingsSnapshot.shares,
            weight_pct=r.HoldingsSnapshot.weight_pct,
        )
        for r in rows
    ]
    return ETFHoldingsOut(snapshot_date=snapshot_date, count=len(holdings), holdings=holdings)
