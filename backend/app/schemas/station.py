import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class StationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    location_label: str = ""


class StationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    location_label: str | None = None


class StationOut(BaseModel):
    id: uuid.UUID
    name: str
    location_label: str
    created_at: datetime

    model_config = {"from_attributes": True}
