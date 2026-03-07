import uuid
import secrets
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def generate_api_key() -> str:
    return secrets.token_hex(32)


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    api_key: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, default=generate_api_key, index=True
    )
    size: Mapped[str] = mapped_column(String(20), default="Moyen")
    level: Mapped[str] = mapped_column(String(20), default="Base")
    location_label: Mapped[str | None] = mapped_column(String(200), default="")
    automation_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    owner = relationship("User", back_populates="devices")
    plant_config = relationship(
        "PlantConfig", back_populates="device", uselist=False, cascade="all, delete-orphan"
    )
    readings = relationship("SensorReading", back_populates="device", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="device", cascade="all, delete-orphan")
    commands = relationship("Command", back_populates="device", cascade="all, delete-orphan")
    watering_events = relationship(
        "WateringEvent", back_populates="device", cascade="all, delete-orphan"
    )
