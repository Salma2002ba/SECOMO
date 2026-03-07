import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.command import Command
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.user import User
from app.models.watering_event import WateringEvent
from app.schemas.watering import WateringTrigger, WateringEventOut
from app.utils.auth import get_current_user

router = APIRouter(tags=["watering"])


@router.post(
    "/api/devices/{device_id}/watering",
    response_model=WateringEventOut,
    status_code=status.HTTP_201_CREATED,
)
async def trigger_watering(
    device_id: uuid.UUID,
    body: WateringTrigger,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.user_id == current_user.id)
    )
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device introuvable")

    # Récupérer la dernière mesure d'humidité
    reading_result = await db.execute(
        select(SensorReading)
        .where(SensorReading.device_id == device_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(1)
    )
    last_reading = reading_result.scalar_one_or_none()
    humidity_before = last_reading.humidity_soil if last_reading else None

    # Créer l'événement d'arrosage
    event = WateringEvent(
        device_id=device_id,
        mode="MANUAL",
        duration_sec=body.duration_sec,
        reason=body.reason,
        humidity_before=humidity_before,
    )
    db.add(event)

    # Envoyer les commandes à l'ESP32
    cmd_open = Command(
        device_id=device_id,
        action="OPEN_VALVE",
        params={"duration_sec": body.duration_sec},
    )
    cmd_pump = Command(
        device_id=device_id,
        action="PUMP_ON",
        params={"duration_sec": body.duration_sec},
    )
    db.add_all([cmd_open, cmd_pump])
    await db.flush()

    return event


@router.get("/api/devices/{device_id}/watering-history", response_model=list[WateringEventOut])
async def watering_history(
    device_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WateringEvent)
        .where(WateringEvent.device_id == device_id)
        .order_by(WateringEvent.started_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
