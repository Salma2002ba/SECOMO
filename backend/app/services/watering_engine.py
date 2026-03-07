"""
Moteur d'arrosage automatique SECOMO.
Calcule la durée de pompage nécessaire pour remonter l'humidité du sol
jusqu'à la cible, en respectant un cooldown entre arrosages.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.command import Command
from app.models.device import Device
from app.models.plant_config import PlantConfig
from app.models.sensor_reading import SensorReading
from app.models.watering_event import WateringEvent


# --- Constantes du modèle ---
PUMP_FLOW_RATE = 2.0  # L/min
HUMIDITY_GAIN_PER_LITER = {
    "Petit": 8.0,   # ~5L de terre
    "Moyen": 4.0,   # ~15L de terre
    "Grand": 2.0,   # ~40L de terre
}
MIN_DURATION_SEC = 5
MAX_DURATION_SEC = 120
COOLDOWN_MINUTES = 15


def calculate_watering(
    current_humidity: float,
    target_humidity: float,
    device_size: str,
    last_watering_at: datetime | None,
) -> dict | None:
    """
    Retourne {"duration_sec": int, "reason": str} ou None si pas nécessaire.
    """
    now = datetime.now(timezone.utc)

    # 1. Vérifier cooldown
    if last_watering_at:
        elapsed = (now - last_watering_at).total_seconds() / 60
        if elapsed < COOLDOWN_MINUTES:
            return None

    # 2. Calculer le déficit
    deficit = target_humidity - current_humidity
    if deficit <= 0:
        return None

    # 3. Calculer le volume d'eau nécessaire
    gain_per_liter = HUMIDITY_GAIN_PER_LITER.get(device_size, 4.0)
    liters_needed = deficit / gain_per_liter

    # 4. Convertir en durée de pompage
    duration_sec = (liters_needed / PUMP_FLOW_RATE) * 60

    # 5. Appliquer bornes de sécurité
    duration_sec = max(MIN_DURATION_SEC, min(MAX_DURATION_SEC, round(duration_sec)))

    return {
        "duration_sec": duration_sec,
        "reason": (
            f"Auto : humidité {current_humidity:.0f}% → cible {target_humidity:.0f}% "
            f"(+{deficit:.0f}%, ~{liters_needed:.1f}L)"
        ),
    }


async def maybe_auto_water(
    device: Device,
    reading: SensorReading,
    db: AsyncSession,
) -> WateringEvent | None:
    """
    Vérifie si un arrosage automatique est nécessaire.
    Si oui, crée les commandes + l'événement et les retourne.
    """
    # Conditions préalables
    if not device.automation_enabled:
        return None
    if reading.humidity_soil is None:
        return None

    # Récupérer la config plante
    result = await db.execute(
        select(PlantConfig).where(PlantConfig.device_id == device.id)
    )
    config = result.scalar_one_or_none()
    if config is None:
        return None

    # Pas besoin d'arroser si au-dessus du minimum
    if reading.humidity_soil >= config.humidity_min:
        return None

    # Dernier arrosage (pour le cooldown)
    result = await db.execute(
        select(WateringEvent)
        .where(WateringEvent.device_id == device.id)
        .order_by(WateringEvent.started_at.desc())
        .limit(1)
    )
    last_event = result.scalar_one_or_none()
    last_watering_at = last_event.started_at if last_event else None

    # Calculer
    calc = calculate_watering(
        current_humidity=reading.humidity_soil,
        target_humidity=config.humidity_max,
        device_size=device.size,
        last_watering_at=last_watering_at,
    )

    if calc is None:
        return None

    # Créer les commandes ESP32
    cmd_open = Command(
        device_id=device.id,
        action="OPEN_VALVE",
        params={"duration_sec": calc["duration_sec"]},
    )
    cmd_pump = Command(
        device_id=device.id,
        action="PUMP_ON",
        params={"duration_sec": calc["duration_sec"]},
    )
    db.add_all([cmd_open, cmd_pump])

    # Créer l'événement d'arrosage
    event = WateringEvent(
        device_id=device.id,
        mode="AUTO",
        duration_sec=calc["duration_sec"],
        reason=calc["reason"],
        humidity_before=reading.humidity_soil,
    )
    db.add(event)
    await db.flush()

    return event
