from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import FundManager
from app.schemas import FundManagerOut

router = APIRouter(prefix="/managers", tags=["managers"])


@router.get("/{manager_id}", response_model=FundManagerOut)
async def get_manager(manager_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FundManager).where(FundManager.id == manager_id))
    manager = result.scalar_one_or_none()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
    return manager
