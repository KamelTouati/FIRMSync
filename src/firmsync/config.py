"""Central configuration for the FIRMSync package."""
from __future__ import annotations

import os
from datetime import date
from pathlib import Path
from dotenv import load_dotenv

# Resolve repository root: from src/firmsync/config.py -> parents[2]
ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

DATA_RAW = ROOT / "data" / "raw"
DATA_PROCESSED = ROOT / "data" / "processed"
OUTPUTS = ROOT / "outputs"

COUNTRY = "Algeria"

ARCHIVE_PRODUCTS = {"modis": 2000, "viirs-snpp": 2012}

NOAA20_START = date(2018, 4, 1)
SNPP_END = date(2026, 11, 2)

PRESET_BBOX = (2.6, 35.5, 7.6, 37.4)

PRESETS = [
    {"id": "bejaia", "name": "Béjaïa", "aliases": ["bejaia", "bgayet", "bougie"], "ref_km2": 3268},
    {"id": "tizi_ouzou", "name": "Tizi Ouzou", "aliases": ["tizi ouzou", "tizi-ouzou"], "ref_km2": 2956},
    {"id": "jijel", "name": "Jijel", "aliases": ["jijel", "djidjelli"], "ref_km2": 2577},
    {"id": "bouira", "name": "Bouira", "aliases": ["bouira"], "ref_km2": None},
    {"id": "skikda", "name": "Skikda", "aliases": ["skikda"], "ref_km2": None},
    {"id": "boumerdes", "name": "Boumerdès", "aliases": ["boumerdes", "boumerdas"], "ref_km2": None},
    {"id": "algiers", "name": "Algiers", "aliases": ["algiers", "alger", "el djazair"], "ref_km2": 1190},
]

SEASONS = {
    12: "DJF", 1: "DJF", 2: "DJF", 3: "MAM", 4: "MAM", 5: "MAM",
    6: "JJA", 7: "JJA", 8: "JJA", 9: "SON", 10: "SON", 11: "SON"
}

OVERLAP_MODIS_SNPP = (2012, 2025)
OVERLAP_N20_SNPP = (2019, 2025)
MIN_DETECTIONS_FOR_RATIO = 30
PRIMARY_SWITCH_SNPP = (2012, 1)
PRIMARY_SWITCH_N20 = (2026, 11)

# API Keys
FIRMS_MAP_KEY = os.environ.get("FIRMS_MAP_KEY", "")
HF_TOKEN = os.environ.get("HF_TOKEN", "")
