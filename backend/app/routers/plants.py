import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.plant import Plant
from app.models.user import User
from app.schemas.plant import PlantCreate, PlantUpdate, PlantOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/plants", tags=["plants"])


@router.get("/", response_model=list[PlantOut])
async def list_plants(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Return plants owned by this user + default/catalog plants (user_id IS NULL or is_default)
    result = await db.execute(
        select(Plant)
        .where(or_(Plant.user_id == current_user.id, Plant.is_default == True))
        .order_by(Plant.name)
    )
    return result.scalars().all()


@router.post("/", response_model=PlantOut, status_code=status.HTTP_201_CREATED)
async def create_plant(
    body: PlantCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plant = Plant(user_id=current_user.id, **body.model_dump())
    db.add(plant)
    await db.flush()
    return plant


@router.get("/{plant_id}", response_model=PlantOut)
async def get_plant(
    plant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Plant).where(
            Plant.id == plant_id,
            or_(Plant.user_id == current_user.id, Plant.is_default == True),
        )
    )
    plant = result.scalar_one_or_none()
    if plant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plante introuvable")
    return plant


@router.patch("/{plant_id}", response_model=PlantOut)
async def update_plant(
    plant_id: uuid.UUID,
    body: PlantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Plant).where(Plant.id == plant_id))
    plant = result.scalar_one_or_none()
    if plant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plante introuvable")
    if plant.is_default:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Les plantes par défaut ne peuvent pas être modifiées",
        )
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plant, key, value)
    await db.flush()
    return plant


@router.delete("/{plant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plant(
    plant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Plant).where(Plant.id == plant_id))
    plant = result.scalar_one_or_none()
    if plant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plante introuvable")
    if plant.is_default:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Les plantes par défaut ne peuvent pas être supprimées",
        )
    if plant.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    await db.delete(plant)
