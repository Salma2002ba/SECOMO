import uuid
import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.user import User
from app.schemas.sensor import SensorReadingIn, SensorReadingOut
from app.services.alert_engine import evaluate_reading
from app.services.watering_engine import maybe_auto_water
from app.utils.auth import get_current_user
from app.utils.esp_auth import get_device_by_api_key
from app.utils.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sensors"])


# --- ESP32 → Backend ---

@router.post("/api/esp/readings", status_code=201)
async def post_reading(
    body: SensorReadingIn,
    device: Device = Depends(get_device_by_api_key),
    db: AsyncSession = Depends(get_db),
):
    reading = SensorReading(device_id=device.id, **body.model_dump())
    db.add(reading)

    # Mettre à jour le statut online du device
    device.is_online = True
    device.last_seen_at = datetime.now(timezone.utc)
    await db.flush()

    # --- Pipeline Phase 2-3 ---

    # 1. Push la mesure en temps réel via WebSocket
    await ws_manager.broadcast_to_device_owner(
        user_id=device.user_id,
        event_type="sensor_reading",
        device_id=device.id,
        data=body.model_dump(),
    )

    # 2. Évaluer les seuils → générer des alertes
    alerts = await evaluate_reading(device, reading, db)
    for alert in alerts:
        await ws_manager.broadcast_to_device_owner(
            user_id=device.user_id,
            event_type="alert",
            device_id=device.id,
            data={
                "id": str(alert.id),
                "type": alert.type,
                "category": alert.category,
                "message": alert.message,
            },
        )

    # 3. Arrosage automatique si nécessaire
    watering_event = await maybe_auto_water(device, reading, db)
    if watering_event:
        await ws_manager.broadcast_to_device_owner(
            user_id=device.user_id,
            event_type="watering_status",
            device_id=device.id,
            data={
                "is_watering": True,
                "mode": "AUTO",
                "duration_sec": watering_event.duration_sec,
                "reason": watering_event.reason,
            },
        )
        logger.info(
            "Auto-watering device %s: %ds (%s)",
            device.name, watering_event.duration_sec, watering_event.reason,
        )

    return {"status": "ok", "reading_id": reading.id}


# --- Frontend → Backend ---

@router.get("/api/devices/{device_id}/readings", response_model=list[SensorReadingOut])
async def get_readings(
    device_id: uuid.UUID,
    last: int = Query(default=60, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SensorReading)
        .where(SensorReading.device_id == device_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(last)
    )
    readings = list(result.scalars().all())
    readings.reverse()  # Ordre chronologique
    return readings
