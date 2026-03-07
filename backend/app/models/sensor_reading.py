from datetime import datetime, timezone

from sqlalchemy import Float, DateTime, ForeignKey, BigInteger, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    __table_args__ = (
        Index("idx_readings_device_time", "device_id", "timestamp"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    temp_air: Mapped[float | None] = mapped_column(Float, nullable=True)
    temp_water: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity_air: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity_soil: Mapped[float | None] = mapped_column(Float, nullable=True)
    light: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_ph: Mapped[float | None] = mapped_column(Float, nullable=True)
    watts: Mapped[float | None] = mapped_column(Float, nullable=True)

    device = relationship("Device", back_populates="readings")
