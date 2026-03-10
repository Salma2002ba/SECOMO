from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine, async_session
from app.models.station import Station  # noqa: F401 — ensures table is registered
from app.routers import auth, users, plants, devices, sensors, commands, alerts, watering, catalog, ws, stations
from app.services.seed import seed_default_plants, seed_test_account

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup : créer les tables et insérer les données par défaut
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        await seed_default_plants(db)
        await seed_test_account(db)

    yield

    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="SECOMO API",
    description="Backend de la Serre Connectée Modulaire",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(plants.router)
app.include_router(devices.router)
app.include_router(sensors.router)
app.include_router(commands.router)
app.include_router(alerts.router)
app.include_router(watering.router)
app.include_router(catalog.router)
app.include_router(ws.router)
app.include_router(stations.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "secomo-backend"}
