import uuid
from datetime import datetime

from pydantic import BaseModel


class SensorReadingIn(BaseModel):
    temp_air: float | None = None
    temp_water: float | None = None
    humidity_air: float | None = None
    humidity_soil: float | None = None
    light: float | None = None
    soil_ph: float | None = None
    watts: float | None = None
    battery_level: float | None = None
    water_tank_level: float | None = None


class SensorReadingOut(BaseModel):
    id: int
    device_id: uuid.UUID
    timestamp: datetime
    temp_air: float | None
    temp_water: float | None
    humidity_air: float | None
    humidity_soil: float | None
    light: float | None
    soil_ph: float | None
    watts: float | None
    battery_level: float | None
    water_tank_level: float | None

    model_config = {"from_attributes": True}
