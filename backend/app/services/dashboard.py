from datetime import date
from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HoldingsChange, ETF


async def get_summary_stats(db: AsyncSession, target_date: date) -> dict:
    result = await db.execute(
        select(
            func.sum(HoldingsChange.amount_billion).filter(HoldingsChange.shares_delta > 0).label("total_buy"),
            func.sum(HoldingsChange.amount_billion).filter(HoldingsChange.shares_delta < 0).label("total_sell"),
        ).where(HoldingsChange.change_date == target_date)
    )
    row = result.one()

    buy_etfs = await db.execute(
        select(func.count(HoldingsChange.etf_id.distinct())).where(
            HoldingsChange.change_date == target_date,
            HoldingsChange.shares_delta > 0,
        )
    )
    sell_etfs = await db.execute(
        select(func.count(HoldingsChange.etf_id.distinct())).where(
            HoldingsChange.change_date == target_date,
            HoldingsChange.shares_delta < 0,
        )
    )

    return {
        "total_buy_billion": row.total_buy or Decimal("0"),
        "total_sell_billion": row.total_sell or Decimal("0"),
        "etf_count_buy": buy_etfs.scalar() or 0,
        "etf_count_sell": sell_etfs.scalar() or 0,
    }


async def get_cross_etf_rankings(
    db: AsyncSession,
    target_date: date,
    direction: str,  # "buy" or "sell"
    top_n: int = 3,
) -> list[dict]:
    condition = HoldingsChange.shares_delta > 0 if direction == "buy" else HoldingsChange.shares_delta < 0

    result = await db.execute(
        select(
            HoldingsChange.stock_ticker,
            func.count(HoldingsChange.etf_id.distinct()).label("etf_count"),
            func.sum(HoldingsChange.amount_billion).label("total_amount"),
        )
        .where(HoldingsChange.change_date == target_date, condition)
        .group_by(HoldingsChange.stock_ticker)
        .order_by(func.sum(HoldingsChange.amount_billion).desc() if direction == "buy"
                  else func.sum(HoldingsChange.amount_billion).asc())
        .limit(top_n)
    )

    return [
        {"ticker": r.stock_ticker, "etf_count": r.etf_count, "total_amount_billion": r.total_amount}
        for r in result.all()
    ]


async def get_top_etfs(
    db: AsyncSession,
    target_date: date,
    direction: str,
    top_n: int = 3,
) -> list[dict]:
    condition = HoldingsChange.shares_delta > 0 if direction == "buy" else HoldingsChange.shares_delta < 0

    result = await db.execute(
        select(
            HoldingsChange.etf_id,
            ETF.code,
            ETF.name,
            func.sum(HoldingsChange.amount_billion).label("total_amount"),
        )
        .join(ETF, ETF.id == HoldingsChange.etf_id)
        .where(HoldingsChange.change_date == target_date, condition)
        .group_by(HoldingsChange.etf_id, ETF.code, ETF.name)
        .order_by(func.sum(HoldingsChange.amount_billion).desc() if direction == "buy"
                  else func.sum(HoldingsChange.amount_billion).asc())
        .limit(top_n)
    )

    return [
        {"etf_code": r.code, "etf_name": r.name, "total_amount_billion": r.total_amount}
        for r in result.all()
    ]
