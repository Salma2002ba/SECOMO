from fastapi import APIRouter
from app.services.plant_service import search_plant, get_plant_details

router = APIRouter(prefix="/plants")


@router.get("/search/{name}")
def search(name: str):
    return search_plant(name)


@router.get("/{plant_id}")
def details(plant_id: int):
    return get_plant_details(plant_id)