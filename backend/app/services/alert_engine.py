"""
Moteur d'alertes SECOMO.
Compare chaque lecture capteur aux seuils de la plant_config du device.
Génère des alertes info / warning / critical selon les écarts.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert
from app.models.device import Device
from app.models.plant_config import PlantConfig
from app.models.sensor_reading import SensorReading


async def evaluate_reading(
    device: Device,
    reading: SensorReading,
    db: AsyncSession,
) -> list[Alert]:
    """
    Compare un reading aux seuils de la plant_config du device.
    Retourne la liste des alertes créées (peut être vide).
    """
    # Récupérer la config plante active du device
    result = await db.execute(
        select(PlantConfig).where(PlantConfig.device_id == device.id)
    )
    config = result.scalar_one_or_none()

    if config is None:
        return []  # Pas de config plante → pas d'alertes

    alerts: list[Alert] = []

    # --- Humidité sol ---
    if reading.humidity_soil is not None:
        if reading.humidity_soil < config.humidity_min:
            deficit = config.humidity_min - reading.humidity_soil
            severity = "critical" if deficit > 15 else "warning"
            alerts.append(Alert(
                device_id=device.id,
                type=severity,
                category="humidity",
                message=(
                    f"Humidité sol basse : {reading.humidity_soil:.0f}% "
                    f"(seuil min : {config.humidity_min:.0f}%)"
                ),
            ))
        elif reading.humidity_soil > config.humidity_max:
            alerts.append(Alert(
                device_id=device.id,
                type="warning",
                category="humidity",
                message=(
                    f"Humidité sol élevée : {reading.humidity_soil:.0f}% "
                    f"(seuil max : {config.humidity_max:.0f}%)"
                ),
            ))

    # --- Température air ---
    if reading.temp_air is not None:
        if reading.temp_air < config.temp_min:
            deficit = config.temp_min - reading.temp_air
            severity = "critical" if deficit > 5 else "warning"
            alerts.append(Alert(
                device_id=device.id,
                type=severity,
                category="temperature",
                message=(
                    f"Température basse : {reading.temp_air:.1f}°C "
                    f"(seuil min : {config.temp_min:.1f}°C)"
                ),
            ))
        elif reading.temp_air > config.temp_max:
            excess = reading.temp_air - config.temp_max
            severity = "critical" if excess > 5 else "warning"
            alerts.append(Alert(
                device_id=device.id,
                type=severity,
                category="temperature",
                message=(
                    f"Température élevée : {reading.temp_air:.1f}°C "
                    f"(seuil max : {config.temp_max:.1f}°C)"
                ),
            ))

    # --- pH sol ---
    if reading.soil_ph is not None:
        if reading.soil_ph < config.ph_min:
            alerts.append(Alert(
                device_id=device.id,
                type="warning",
                category="ph",
                message=(
                    f"pH sol bas : {reading.soil_ph:.1f} "
                    f"(seuil min : {config.ph_min:.1f})"
                ),
            ))
        elif reading.soil_ph > config.ph_max:
            alerts.append(Alert(
                device_id=device.id,
                type="warning",
                category="ph",
                message=(
                    f"pH sol élevé : {reading.soil_ph:.1f} "
                    f"(seuil max : {config.ph_max:.1f})"
                ),
            ))

    # --- Luminosité ---
    if reading.light is not None:
        if reading.light < config.light_min:
            alerts.append(Alert(
                device_id=device.id,
                type="info",
                category="light",
                message=(
                    f"Luminosité insuffisante : {reading.light:.0f} lux "
                    f"(seuil min : {config.light_min:.0f} lux). "
                    f"Pensez à activer les LEDs."
                ),
            ))

    # Persister les alertes
    if alerts:
        db.add_all(alerts)
        await db.flush()

    return alerts
