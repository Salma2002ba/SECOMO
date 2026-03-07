import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class WateringTrigger(BaseModel):
    duration_sec: int = Field(ge=5, le=120)
    reason: str = ""


class WateringEventOut(BaseModel):
    id: uuid.UUID
    device_id: uuid.UUID
    mode: str
    duration_sec: int
    reason: str | None
    humidity_before: float | None
    humidity_after: float | None
    started_at: datetime
    ended_at: datetime | None

    model_config = {"from_attributes": True}
