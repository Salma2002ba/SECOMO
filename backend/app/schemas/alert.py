import uuid
from datetime import datetime

from pydantic import BaseModel


class AlertOut(BaseModel):
    id: uuid.UUID
    device_id: uuid.UUID
    type: str
    category: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
