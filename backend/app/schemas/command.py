import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CommandCreate(BaseModel):
    action: str = Field(
        pattern=r"^(OPEN_VALVE|CLOSE_VALVE|PUMP_ON|PUMP_OFF|FAN_ON|FAN_OFF|LED_ON|LED_OFF)$"
    )
    params: dict = {}


class CommandOut(BaseModel):
    id: uuid.UUID
    action: str
    params: dict
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CommandAck(BaseModel):
    status: str = Field(pattern=r"^(ACKNOWLEDGED|FAILED)$")
    error: str | None = None
