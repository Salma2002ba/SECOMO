import requests
from app.config import TREFLE_TOKEN

BASE_URL = "https://trefle.io/api/v1"


def search_plant(name):

    url = f"{BASE_URL}/plants/search"

    params = {
        "q": name,
        "token": TREFLE_TOKEN
    }

    r = requests.get(url, params=params)

    data = r.json()

    if "data" not in data or len(data["data"]) == 0:
        return {"error": "Plant not found"}

    plant = data["data"][0]

    return {
        "id": plant["id"],
        "common_name": plant["common_name"],
        "scientific_name": plant["scientific_name"],
        "image": plant.get("image_url")
    }


def get_plant_details(plant_id):

    url = f"{BASE_URL}/plants/{plant_id}"

    params = {
        "token": TREFLE_TOKEN
    }

    r = requests.get(url, params=params)
    data = r.json()

    plant = data.get("data")

    if not plant:
        return {"error": "Plant not found"}

    growth = plant.get("growth") or {}

    return {
        "light": growth.get("light"),
        "soil_humidity": growth.get("atmospheric_humidity"),
        "min_temp": (growth.get("minimum_temperature") or {}).get("deg_c"),
        "max_temp": (growth.get("maximum_temperature") or {}).get("deg_c")
    }