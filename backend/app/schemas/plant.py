import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PlantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    humidity_min: float = Field(ge=0, le=100)
    humidity_max: float = Field(ge=0, le=100)
    temp_min: float = Field(ge=-20, le=60)
    temp_max: float = Field(ge=-20, le=60)
    light_min: float = Field(ge=0)
    light_optimal: float = Field(ge=0, default=0)
    light_max: float = Field(ge=0, default=0)
    ph_min: float = Field(ge=0, le=14)
    ph_max: float = Field(ge=0, le=14)
    notes: str = ""


class PlantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    humidity_min: float | None = Field(default=None, ge=0, le=100)
    humidity_max: float | None = Field(default=None, ge=0, le=100)
    temp_min: float | None = Field(default=None, ge=-20, le=60)
    temp_max: float | None = Field(default=None, ge=-20, le=60)
    light_min: float | None = Field(default=None, ge=0)
    light_optimal: float | None = Field(default=None, ge=0)
    light_max: float | None = Field(default=None, ge=0)
    ph_min: float | None = Field(default=None, ge=0, le=14)
    ph_max: float | None = Field(default=None, ge=0, le=14)
    notes: str | None = None


class PlantOut(BaseModel):
    id: uuid.UUID
    name: str
    humidity_min: float
    humidity_max: float
    temp_min: float
    temp_max: float
    light_min: float
    light_optimal: float
    light_max: float
    ph_min: float
    ph_max: float
    notes: str | None
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}
