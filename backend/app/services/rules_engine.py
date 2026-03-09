def run_rules(station_id, reading):

    print("Running rules for station:", station_id)

    alerts = []

    # sol trop sec
    if reading.soil_moisture < 40:
        print("⚠ Soil too dry → irrigation needed")
        alerts.append("Sol trop sec")

    # température trop élevée
    if reading.temperature_air > 30:
        print("⚠ Temperature too high")
        alerts.append("Température trop élevée")

    # niveau d'eau trop bas
    if reading.water_level < 5:
        print("⚠ Water tank almost empty")
        alerts.append("Réservoir presque vide")

    return alerts