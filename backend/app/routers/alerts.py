from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AlertSubscription, AlertChannel
from app.schemas import AlertCreate, AlertOut

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("", response_model=AlertOut, status_code=201)
async def create_alert(payload: AlertCreate, db: AsyncSession = Depends(get_db)):
    if payload.channel not in ("email", "line"):
        raise HTTPException(status_code=422, detail="channel must be 'email' or 'line'")
    sub = AlertSubscription(
        channel=AlertChannel[payload.channel],
        contact=payload.contact,
        etf_code=payload.etf_code,
        threshold_pct=payload.threshold_pct,
    )
    db.add(sub)
    await db.flush()
    return sub


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(alert_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertSubscription).where(AlertSubscription.id == alert_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(sub)
