import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Plant(Base):
    __tablename__ = "plants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # NULL for default/catalog plants visible to everyone; set for user-created plants
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
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
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    owner = relationship("User", back_populates="plants")
