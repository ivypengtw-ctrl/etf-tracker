from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import ETF, HoldingsChange
from app.schemas import ETFOut, ETFChangesOut

router = APIRouter(prefix="/etfs", tags=["etfs"])


@router.get("", response_model=list[ETFOut])
async def list_etfs(
    search: str | None = Query(None),
    type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(ETF).options(selectinload(ETF.manager))
    if search:
        q = q.where(ETF.name.ilike(f"%{search}%") | ETF.code.ilike(f"%{search}%"))
    if type:
        q = q.where(ETF.type == type)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/top-movers", response_model=list[dict])
async def top_movers(
    target_date: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_db),
):
    from app.services.dashboard import get_top_etfs
    buy = await get_top_etfs(db, target_date, "buy", top_n=4)
    sell = await get_top_etfs(db, target_date, "sell", top_n=4)
    return {"buy": buy, "sell": sell}


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
    date: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ETF).options(selectinload(ETF.manager)).where(ETF.code == code)
    )
    etf = result.scalar_one_or_none()
    if not etf:
        raise HTTPException(status_code=404, detail="ETF not found")

    changes_result = await db.execute(
        select(HoldingsChange).where(
            HoldingsChange.etf_id == etf.id,
            HoldingsChange.change_date == date,
        )
    )
    changes = changes_result.scalars().all()
    return ETFChangesOut(etf=etf, change_date=date, changes=changes)
