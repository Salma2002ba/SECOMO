from fastapi import APIRouter
from app.database import SessionLocal
from app.models.sensor import SensorReading
from app.services.rules_engine import run_rules
from app.services.csv_sensor_service import read_sensor_data

router = APIRouter()

@router.post("/stations/{station_id}/ingest")
def ingest(station_id: int, data: dict):

    db = SessionLocal()

    reading = SensorReading(
        station_id=station_id,
        temperature_air=data["temperature"],
        humidity_air=data["humidity"],
        soil_moisture=data["soil"],
        light=data["light"],
        water_level=data["water"],
        ph=data["ph"]
    )

    db.add(reading)
    db.commit()

    run_rules(station_id, reading)

    return {"status": "ok"}

@router.post("/sensors/import-csv")

def import_csv():

    db = SessionLocal()

    data = read_sensor_data()

    for row in data:

        reading = SensorReading(
            station_id=1,
            temperature_air=row["temperature_air"],
            humidity_air=row["humidity_air"],
            soil_moisture=row["soil_moisture"],
            light=row["light"],
            water_level=row["water_level"],
            ph=row["ph"],
            timestamp=row["timestamp"]
        )

        db.add(reading)

    db.commit()

    return {"status": "csv imported"}
    
@router.get("/test")
def test():
    return {"message": "ok"}