from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plant import Plant

DEFAULT_PLANTS = [
    {
        "name": "Basilic Grand Vert",
        "humidity_min": 40,
        "humidity_max": 60,
        "temp_min": 18,
        "temp_max": 30,
        "light_min": 600,
        "ph_min": 5.5,
        "ph_max": 7.0,
        "notes": "Plante aromatique, soleil direct, arrosage régulier.",
        "is_default": True,
    },
    {
        "name": "Tomates Cerises",
        "humidity_min": 50,
        "humidity_max": 70,
        "temp_min": 15,
        "temp_max": 35,
        "light_min": 800,
        "ph_min": 6.0,
        "ph_max": 6.8,
        "notes": "Besoin de beaucoup de lumière et d'eau régulière.",
        "is_default": True,
    },
    {
        "name": "Menthe Poivrée",
        "humidity_min": 50,
        "humidity_max": 70,
        "temp_min": 12,
        "temp_max": 25,
        "light_min": 400,
        "ph_min": 6.0,
        "ph_max": 7.5,
        "notes": "Pousse rapide, supporte la mi-ombre, sol humide.",
        "is_default": True,
    },
]


async def seed_default_plants(db: AsyncSession) -> None:
    result = await db.execute(select(Plant).where(Plant.is_default == True).limit(1))
    if result.scalar_one_or_none() is not None:
        return  # Déjà initialisé

    for plant_data in DEFAULT_PLANTS:
        db.add(Plant(**plant_data))
    await db.commit()
