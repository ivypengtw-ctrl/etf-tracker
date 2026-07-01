from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HoldingsSnapshot, HoldingsChange, ChangeType


async def compute_daily_diff(
    db: AsyncSession,
    etf_id: UUID,
    target_date: date,
    price_map: dict[str, Decimal] | None = None,
) -> list[HoldingsChange]:
    yesterday = target_date - timedelta(days=1)
    today_rows = await _get_snapshot(db, etf_id, target_date)
    yesterday_rows = await _get_snapshot(db, etf_id, yesterday)

    today_map = {r.stock_ticker: r.shares for r in today_rows}
    yesterday_map = {r.stock_ticker: r.shares for r in yesterday_rows}

    changes: list[HoldingsChange] = []
    for ticker in set(today_map) | set(yesterday_map):
        t = today_map.get(ticker, 0)
        y = yesterday_map.get(ticker, 0)
        if t == y:
            continue

        if y == 0:
            ctype = ChangeType.added
        elif t == 0:
            ctype = ChangeType.removed
        elif t > y:
            ctype = ChangeType.increased
        else:
            ctype = ChangeType.decreased

        delta = t - y
        price = price_map.get(ticker) if price_map else None
        amount = (Decimal(delta) * price / Decimal("1e8")).quantize(Decimal("0.01")) if price else None

        changes.append(HoldingsChange(
            etf_id=etf_id,
            change_date=target_date,
            stock_ticker=ticker,
            change_type=ctype,
            shares_before=y,
            shares_after=t,
            shares_delta=delta,
            amount_billion=amount,
        ))

    return changes


async def _get_snapshot(db: AsyncSession, etf_id: UUID, snap_date: date) -> list[HoldingsSnapshot]:
    result = await db.execute(
        select(HoldingsSnapshot).where(
            HoldingsSnapshot.etf_id == etf_id,
            HoldingsSnapshot.snapshot_date == snap_date,
        )
    )
    return list(result.scalars().all())
