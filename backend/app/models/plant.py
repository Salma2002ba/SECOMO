from sqlalchemy import Column, Integer, String, Float
from app.database import Base

class Plant(Base):

    __tablename__ = "plants"

    id = Column(Integer, primary_key=True)

    name = Column(String)

    scientific_name = Column(String)

    perenual_id = Column(Integer)

    soil_min = Column(Float)
    soil_max = Column(Float)

    temp_min = Column(Float)
    temp_max = Column(Float)

    humidity_min = Column(Float)
    humidity_max = Column(Float)

    light_min = Column(Float)