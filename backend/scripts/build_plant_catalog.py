"""
Télécharge les 5500+ fiches plantes depuis vrachieru/plant-database (GitHub)
et les fusionne en un seul fichier plants_catalog.json utilisable par SECOMO.

Usage: python scripts/build_plant_catalog.py
Produit: app/data/plants_catalog.json
"""

import json
import os
import sys
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

REPO = "vrachieru/plant-database"
BRANCH = "master"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/json"
API_TREE = f"https://api.github.com/repos/{REPO}/git/trees/{BRANCH}?recursive=1"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "app", "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "plants_catalog.json")


def get_json_file_list() -> list[str]:
    """Récupère la liste de tous les fichiers .json du dossier json/ via l'API Git Tree."""
    print("Fetching file tree from GitHub API...")
    req = urllib.request.Request(API_TREE, headers={"User-Agent": "SECOMO-Bot"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        tree = json.loads(resp.read())

    files = []
    for item in tree["tree"]:
        if item["path"].startswith("json/") and item["path"].endswith(".json"):
            files.append(item["path"])
    print(f"Found {len(files)} plant JSON files")
    return files


def download_one(path: str) -> dict | None:
    """Télécharge et parse un fichier JSON de plante."""
    url = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/{path}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SECOMO-Bot"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def transform_plant(raw: dict) -> dict | None:
    """Transforme une fiche brute en format SECOMO simplifié."""
    params = raw.get("parameter", {})
    if not params:
        return None

    # Vérifier qu'on a au moins temp + humidité
    if params.get("max_temp") is None or params.get("min_env_humid") is None:
        return None

    display = raw.get("display_pid", raw.get("pid", ""))
    if not display:
        return None

    # Catégorie depuis basic.category
    basic = raw.get("basic", {})
    category = basic.get("category", "")

    return {
        "name": display,
        "pid": raw.get("pid", ""),
        "category": category,
        "origin": basic.get("origin", ""),
        "temp_min": params.get("min_temp"),
        "temp_max": params.get("max_temp"),
        "humidity_min": params.get("min_env_humid"),
        "humidity_max": params.get("max_env_humid"),
        "soil_moisture_min": params.get("min_soil_moist"),
        "soil_moisture_max": params.get("max_soil_moist"),
        "light_min_lux": params.get("min_light_lux"),
        "light_max_lux": params.get("max_light_lux"),
        "soil_ec_min": params.get("min_soil_ec"),
        "soil_ec_max": params.get("max_soil_ec"),
    }


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    files = get_json_file_list()

    print(f"Downloading {len(files)} files (parallel)...")
    plants = []
    errors = 0

    with ThreadPoolExecutor(max_workers=20) as pool:
        futures = {pool.submit(download_one, f): f for f in files}
        done = 0
        for future in as_completed(futures):
            done += 1
            if done % 200 == 0:
                print(f"  {done}/{len(files)}...")

            raw = future.result()
            if raw is None:
                errors += 1
                continue

            plant = transform_plant(raw)
            if plant:
                plants.append(plant)

    # Trier par nom
    plants.sort(key=lambda p: p["name"].lower())

    print(f"\nDone! {len(plants)} plants with valid data ({errors} errors)")
    print(f"Writing to {OUTPUT_FILE}...")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(plants, f, ensure_ascii=False, indent=None)

    size_mb = os.path.getsize(OUTPUT_FILE) / 1024 / 1024
    print(f"Output: {size_mb:.1f} MB")


if __name__ == "__main__":
    main()
