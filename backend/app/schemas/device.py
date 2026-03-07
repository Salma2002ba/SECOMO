import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class DeviceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    size: str = Field(default="Moyen", pattern=r"^(Petit|Moyen|Grand)$")
    level: str = Field(default="Base", pattern=r"^(Base|Intermédiaire|Final)$")
    location_label: str = ""


class DeviceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    size: str | None = Field(default=None, pattern=r"^(Petit|Moyen|Grand)$")
    level: str | None = Field(default=None, pattern=r"^(Base|Intermédiaire|Final)$")
    location_label: str | None = None
    automation_enabled: bool | None = None


class DeviceOut(BaseModel):
    id: uuid.UUID
    name: str
    api_key: str
    size: str
    level: str
    location_label: str | None
    automation_enabled: bool
    is_online: bool
    last_seen_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PlantConfigCreate(BaseModel):
    plant_id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=100)
    humidity_min: float = Field(ge=0, le=100)
    humidity_max: float = Field(ge=0, le=100)
    temp_min: float = Field(ge=-20, le=60)
    temp_max: float = Field(ge=-20, le=60)
    light_min: float = Field(ge=0)
    ph_min: float = Field(ge=0, le=14)
    ph_max: float = Field(ge=0, le=14)
    notes: str = ""


class PlantConfigOut(BaseModel):
    id: uuid.UUID
    device_id: uuid.UUID
    plant_id: uuid.UUID | None
    name: str
    humidity_min: float
    humidity_max: float
    temp_min: float
    temp_max: float
    light_min: float
    ph_min: float
    ph_max: float
    notes: str | None

    model_config = {"from_attributes": True}
