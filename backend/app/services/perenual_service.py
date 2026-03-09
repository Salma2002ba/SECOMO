import requests
from app.config import PERENUAL_API

def search_plant(name):

    url = f"https://perenual.com/api/v2/species-list?key={PERENUAL_API}&q={name}"

    r = requests.get(url)

    data = r.json()

    if "data" not in data or len(data["data"]) == 0:
        return {"error": "Plant not found"}

    plant = data["data"][0]

    return {
        "id": plant["id"],
        "common_name": plant["common_name"],
        "scientific_name": plant["scientific_name"],
        "sunlight": plant.get("sunlight"),
        "watering": plant.get("watering")
    }