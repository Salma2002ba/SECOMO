from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

class Alert(Base):

    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)

    station_id = Column(Integer)

    message = Column(String)

    severity = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)