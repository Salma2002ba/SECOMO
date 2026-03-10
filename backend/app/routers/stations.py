import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.station import Station
from app.models.user import User
from app.schemas.station import StationCreate, StationUpdate, StationOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/stations", tags=["stations"])


@router.get("/", response_model=list[StationOut])
async def list_stations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Station).where(Station.user_id == current_user.id).order_by(Station.created_at)
    )
    return result.scalars().all()


@router.post("/", response_model=StationOut, status_code=status.HTTP_201_CREATED)
async def create_station(
    body: StationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    station = Station(user_id=current_user.id, **body.model_dump())
    db.add(station)
    await db.flush()
    return station


@router.patch("/{station_id}", response_model=StationOut)
async def update_station(
    station_id: uuid.UUID,
    body: StationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Station).where(Station.id == station_id, Station.user_id == current_user.id)
    )
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Station introuvable")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(station, k, v)
    await db.flush()
    return station


@router.delete("/{station_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_station(
    station_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Station).where(Station.id == station_id, Station.user_id == current_user.id)
    )
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Station introuvable")
    await db.delete(station)
