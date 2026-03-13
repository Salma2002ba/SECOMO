import uuid

from sqlalchemy import String, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PlantConfig(Base):
    __tablename__ = "plant_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    plant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plants.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    humidity_min: Mapped[float] = mapped_column(Float, nullable=False)
    humidity_max: Mapped[float] = mapped_column(Float, nullable=False)
    temp_min: Mapped[float] = mapped_column(Float, nullable=False)
    temp_max: Mapped[float] = mapped_column(Float, nullable=False)
    light_min: Mapped[float] = mapped_column(Float, nullable=False)
    light_optimal: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    light_max: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    ph_min: Mapped[float] = mapped_column(Float, nullable=False)
    ph_max: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, default="")

    device = relationship("Device", back_populates="plant_config")
    source_plant = relationship("Plant")
