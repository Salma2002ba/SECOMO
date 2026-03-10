from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device
from app.models.plant import Plant
from app.models.plant_config import PlantConfig
from app.models.user import User
from app.utils.auth import hash_password

# ---------------------------------------------------------------------------
# Plantes par défaut (globales, partagées entre tous les utilisateurs)
# ---------------------------------------------------------------------------

DEFAULT_PLANTS = [
    {
        "name": "Basilic Grand Vert",
        "humidity_min": 50,
        "humidity_max": 70,
        "temp_min": 18,
        "temp_max": 28,
        "light_min": 60,
        "ph_min": 6.0,
        "ph_max": 7.5,
        "notes": "Aime la chaleur et l'humidité constante.",
        "is_default": True,
    },
    {
        "name": "Tomates Cerises",
        "humidity_min": 60,
        "humidity_max": 85,
        "temp_min": 20,
        "temp_max": 32,
        "light_min": 75,
        "ph_min": 5.5,
        "ph_max": 6.8,
        "notes": "Exige beaucoup de lumière et de nutriments.",
        "is_default": True,
    },
    {
        "name": "Menthe Poivrée",
        "humidity_min": 65,
        "humidity_max": 90,
        "temp_min": 12,
        "temp_max": 25,
        "light_min": 40,
        "ph_min": 6.0,
        "ph_max": 7.0,
        "notes": "Très robuste, préfère un sol toujours humide.",
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
    print("[SEED] Plantes par défaut créées.")


# ---------------------------------------------------------------------------
# Compte de test — données persistées en base PostgreSQL
# Email : test@secomo.io  |  Mot de passe : Test1234!
# ---------------------------------------------------------------------------

TEST_EMAIL = "test@secomo.io"
TEST_PASSWORD = "Test1234!"

# Chaque device avec le nom de la plante à associer (depuis les plants globaux)
TEST_DEVICES = [
    {
        "name": "Bac Principal",
        "size": "Grand",
        "level": "Intermédiaire",
        "location_label": "Serre centrale",
        "automation_enabled": True,
        "_plant_name": "Basilic Grand Vert",
    },
    {
        "name": "Bac Aromatiques",
        "size": "Moyen",
        "level": "Base",
        "location_label": "Bord de fenêtre",
        "automation_enabled": False,
        "_plant_name": "Menthe Poivrée",
    },
    {
        "name": "Bac Tomates",
        "size": "Grand",
        "level": "Avancé",
        "location_label": "Paroi Sud",
        "automation_enabled": True,
        "_plant_name": "Tomates Cerises",
    },
]


async def seed_test_account(db: AsyncSession) -> None:
    """
    Crée le compte de test une seule fois au démarrage.
    Les données persistent en base PostgreSQL avec le volume Docker pgdata.
    Survit aux redémarrages du conteneur et aux déco/reco.
    """
    # Vérifier si le compte existe déjà
    result = await db.execute(select(User).where(User.email == TEST_EMAIL))
    if result.scalar_one_or_none() is not None:
        return  # Déjà seedé, rien à faire

    # 1. Créer l'utilisateur test
    user = User(
        email=TEST_EMAIL,
        password_hash=hash_password(TEST_PASSWORD),
        first_name="Compte",
        last_name="Test",
        role="USER",
        theme="dark",
        language="FR",
        unit="celsius",
        timezone="Europe/Paris",
    )
    db.add(user)
    await db.flush()  # génère user.id sans commit

    # 2. Créer les 3 bacs et les associer aux plantes globales
    for dev_data in TEST_DEVICES:
        plant_name = dev_data.pop("_plant_name")

        # Récupérer la plante globale correspondante
        plant_result = await db.execute(
            select(Plant).where(Plant.name == plant_name)
        )
        plant = plant_result.scalar_one_or_none()

        device = Device(user_id=user.id, **dev_data)
        db.add(device)
        await db.flush()  # génère device.id

        # Associer la plante au bac via plant_config
        if plant:
            config = PlantConfig(
                device_id=device.id,
                plant_id=plant.id,
                name=plant.name,
                humidity_min=plant.humidity_min,
                humidity_max=plant.humidity_max,
                temp_min=plant.temp_min,
                temp_max=plant.temp_max,
                light_min=plant.light_min,
                ph_min=plant.ph_min,
                ph_max=plant.ph_max,
                notes=plant.notes or "",
            )
            db.add(config)

    await db.commit()
    print(f"[SEED] ✓ Compte test créé — {TEST_EMAIL} / {TEST_PASSWORD}")
    print(f"[SEED] ✓ 3 bacs créés : Bac Principal, Bac Aromatiques, Bac Tomates")
