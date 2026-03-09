from fastapi import APIRouter

router = APIRouter(prefix="/stations")


@router.get("/")
def list_stations():
    return {"stations": []}