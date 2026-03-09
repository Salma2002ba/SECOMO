from fastapi import FastAPI

from app.routers import plants
from app.routers import auth
from app.routers import stations

app = FastAPI()

app.include_router(auth.router)
app.include_router(stations.router)
app.include_router(plants.router)