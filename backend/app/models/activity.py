from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

class Activity(Base):

    __tablename__ = "activities"

    id = Column(Integer, primary_key=True)

    station_id = Column(Integer)

    type = Column(String)

    description = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)