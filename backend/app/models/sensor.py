from sqlalchemy import Column, Integer, Float, DateTime
from datetime import datetime
from app.database import Base

class SensorReading(Base):

    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True)

    station_id = Column(Integer)

    temperature_air = Column(Float)

    humidity_air = Column(Float)

    soil_moisture = Column(Float)

    light = Column(Float)

    water_level = Column(Float)

    ph = Column(Float)

    timestamp = Column(DateTime, default=datetime.utcnow)