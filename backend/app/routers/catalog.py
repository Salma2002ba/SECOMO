import json
import os
from functools import lru_cache

from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/catalog", tags=["catalog"])

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
CATALOG_FILE = os.path.join(DATA_DIR, "plants_catalog.json")
ALIASES_FILE = os.path.join(DATA_DIR, "plant_aliases.json")


@lru_cache(maxsize=1)
def _load_catalog() -> list[dict]:
    with open(CATALOG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def _load_aliases() -> dict:
    """Load alias file and build a reverse index: scientific_pid -> list of common names."""
    with open(ALIASES_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)

    # Build: { "fr": { common_name: [pid, ...] }, "en": { ... } }
    # Also build reverse: pid -> { "fr": [names], "en": [names] }
    by_lang = raw  # already in correct format
    reverse: dict[str, dict[str, list[str]]] = {}

    for lang, mapping in by_lang.items():
        for common_name, pids in mapping.items():
            for pid in pids:
                pid_lower = pid.lower()
                if pid_lower not in reverse:
                    reverse[pid_lower] = {}
                if lang not in reverse[pid_lower]:
                    reverse[pid_lower][lang] = []
                if common_name not in reverse[pid_lower][lang]:
                    reverse[pid_lower][lang].append(common_name)

    return {"by_lang": by_lang, "reverse": reverse}


def _enrich_catalog(catalog: list[dict], aliases_data: dict) -> list[dict]:
    """Add common_names field to each catalog entry."""
    reverse = aliases_data["reverse"]
    enriched = []
    for plant in catalog:
        pid = plant.get("pid", "").lower()
        common = reverse.get(pid, {})
        enriched.append({**plant, "common_names": common})
    return enriched


@lru_cache(maxsize=1)
def _get_enriched_catalog() -> list[dict]:
    return _enrich_catalog(_load_catalog(), _load_aliases())


@router.get("/plants")
async def search_plants(
    q: str = Query(default="", min_length=0, max_length=100),
    lang: str = Query(default="fr", max_length=5),
    limit: int = Query(default=20, ge=1, le=100),
):
    catalog = _get_enriched_catalog()
    aliases_data = _load_aliases()

    if not q:
        return catalog[:limit]

    query = q.lower().strip()

    # 1) Check if query matches a common name alias -> get matching PIDs
    alias_pids: set[str] = set()
    for lang_key in [lang, "fr", "en"]:  # prioritize requested lang
        lang_aliases = aliases_data["by_lang"].get(lang_key, {})
        for common_name, pids in lang_aliases.items():
            if query in common_name.lower():
                alias_pids.update(p.lower() for p in pids)

    # 2) Search: match by scientific name OR by alias PID match
    results = []
    seen_pids: set[str] = set()

    # First: alias matches (most relevant for common name searches)
    for plant in catalog:
        pid = plant.get("pid", "").lower()
        if pid in alias_pids and pid not in seen_pids:
            results.append(plant)
            seen_pids.add(pid)

    # Then: scientific name matches
    for plant in catalog:
        pid = plant.get("pid", "").lower()
        if pid not in seen_pids and query in plant["name"].lower():
            results.append(plant)
            seen_pids.add(pid)

    return results[:limit]


@router.get("/plants/count")
async def plants_count():
    return {"count": len(_load_catalog())}
