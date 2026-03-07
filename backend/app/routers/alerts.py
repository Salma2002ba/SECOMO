import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.alert import Alert
from app.models.user import User
from app.models.device import Device
from app.schemas.alert import AlertOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/", response_model=list[AlertOut])
async def list_alerts(
    device_id: uuid.UUID | None = Query(default=None),
    unread: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Récupérer les device_ids de l'utilisateur
    devices_result = await db.execute(
        select(Device.id).where(Device.user_id == current_user.id)
    )
    user_device_ids = [row[0] for row in devices_result.all()]
    if not user_device_ids:
        return []

    query = select(Alert).where(Alert.device_id.in_(user_device_ids))
    if device_id:
        query = query.where(Alert.device_id == device_id)
    if unread:
        query = query.where(Alert.is_read == False)
    query = query.order_by(Alert.created_at.desc()).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/{alert_id}/read")
async def mark_read(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert:
        alert.is_read = True
        await db.flush()
    return {"status": "ok"}


@router.post("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    devices_result = await db.execute(
        select(Device.id).where(Device.user_id == current_user.id)
    )
    user_device_ids = [row[0] for row in devices_result.all()]
    if user_device_ids:
        await db.execute(
            update(Alert)
            .where(Alert.device_id.in_(user_device_ids), Alert.is_read == False)
            .values(is_read=True)
        )
        await db.flush()
    return {"status": "ok"}
