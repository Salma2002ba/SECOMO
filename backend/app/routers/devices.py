import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.device import Device
from app.models.plant import Plant
from app.models.plant_config import PlantConfig
from app.models.user import User
from app.schemas.device import (
    DeviceCreate,
    DeviceUpdate,
    DeviceOut,
    PlantConfigCreate,
    PlantConfigOut,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/devices", tags=["devices"])


async def _get_user_device(
    device_id: uuid.UUID, user: User, db: AsyncSession
) -> Device:
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.user_id == user.id)
    )
    device = result.scalar_one_or_none()
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device introuvable")
    return device


@router.get("/", response_model=list[DeviceOut])
async def list_devices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).where(Device.user_id == current_user.id).order_by(Device.created_at)
    )
    return result.scalars().all()


@router.post("/", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
async def create_device(
    body: DeviceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    device = Device(user_id=current_user.id, **body.model_dump())
    db.add(device)
    await db.flush()
    return device


@router.get("/{device_id}", response_model=DeviceOut)
async def get_device(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_user_device(device_id, current_user, db)


@router.patch("/{device_id}", response_model=DeviceOut)
async def update_device(
    device_id: uuid.UUID,
    body: DeviceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    device = await _get_user_device(device_id, current_user, db)
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(device, key, value)
    await db.flush()
    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    device = await _get_user_device(device_id, current_user, db)
    await db.delete(device)


# --- Plant Config (seuils personnalisés par device) ---


@router.get("/{device_id}/plant-config", response_model=PlantConfigOut | None)
async def get_plant_config(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_device(device_id, current_user, db)
    result = await db.execute(
        select(PlantConfig).where(PlantConfig.device_id == device_id)
    )
    return result.scalar_one_or_none()


@router.put("/{device_id}/plant-config", response_model=PlantConfigOut)
async def set_plant_config(
    device_id: uuid.UUID,
    body: PlantConfigCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_device(device_id, current_user, db)

    # Vérifier que la plante source existe si fournie
    if body.plant_id:
        result = await db.execute(select(Plant).where(Plant.id == body.plant_id))
        if result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plante source introuvable",
            )

    # Upsert : remplacer la config existante
    result = await db.execute(
        select(PlantConfig).where(PlantConfig.device_id == device_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        for key, value in body.model_dump().items():
            setattr(existing, key, value)
        await db.flush()
        return existing
    else:
        config = PlantConfig(device_id=device_id, **body.model_dump())
        db.add(config)
        await db.flush()
        return config
