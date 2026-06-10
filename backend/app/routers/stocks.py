from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Stock, HoldingsSnapshot, ETF
from app.schemas import StockOut

router = APIRouter(prefix="/stocks", tags=["stocks"])


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
