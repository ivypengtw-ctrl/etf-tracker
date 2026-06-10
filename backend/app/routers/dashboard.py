from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ETF, HoldingsChange
from app.services.dashboard import get_summary_stats, get_cross_etf_rankings, get_top_etfs
from app.services.summary_text import generate_summary_text

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(
    date: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_db),
):
    stats = await get_summary_stats(db, date)
    cross_buys = await get_cross_etf_rankings(db, date, "buy")
    cross_sells = await get_cross_etf_rankings(db, date, "sell")
    top_buy = await get_top_etfs(db, date, "buy")
    top_sell = await get_top_etfs(db, date, "sell")

    total_etf_count_result = await db.execute(select(func.count(ETF.id)))
    total_etf_count = total_etf_count_result.scalar() or 0

    updated_count_result = await db.execute(
        select(func.count(HoldingsChange.etf_id.distinct())).where(
            HoldingsChange.change_date == date
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
        "date": date,
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


@router.get("/cross-etf")
async def cross_etf(
    date: date = Query(default_factory=date.today),
    direction: str = Query(default="buy"),
    top_n: int = Query(default=3),
    db: AsyncSession = Depends(get_db),
):
    return await get_cross_etf_rankings(db, date, direction, top_n)
