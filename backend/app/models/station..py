from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base

class Station(Base):

    __tablename__ = "stations"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    city = Column(String)
    mode_auto = Column(Boolean, default=True)