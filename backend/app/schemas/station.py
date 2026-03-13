import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class StationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    location_label: str = ""
    night_start: int = Field(default=22, ge=0, le=23)
    night_end: int = Field(default=6, ge=0, le=23)


class StationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    location_label: str | None = None
    night_start: int | None = Field(default=None, ge=0, le=23)
    night_end: int | None = Field(default=None, ge=0, le=23)


class StationOut(BaseModel):
    id: uuid.UUID
    name: str
    location_label: str
    night_start: int
    night_end: int
    created_at: datetime

    model_config = {"from_attributes": True}
