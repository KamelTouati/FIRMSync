"""Core data loading, spatial filtering, and entity matching utilities for FIRMSync."""
from __future__ import annotations

import re
import unicodedata
from pathlib import Path
import numpy as np
import pandas as pd

from firmsync import config as cfg

WANTED = {
    "latitude", "longitude", "acq_date", "acq_time", "satellite",
    "confidence", "frp", "daynight", "type"
}
ARCHIVE_RE = re.compile(r"^(modis|viirs-snpp)_(\d{4})_(.+)\.csv$")
ARCHIVE_SERIES = {"modis": "modis", "viirs-snpp": "viirs_snpp"}
AREA_SERIES = {
    "MODIS_SP": "modis", "MODIS_NRT": "modis",
    "VIIRS_SNPP_SP": "viirs_snpp", "VIIRS_SNPP_NRT": "viirs_snpp",
    "VIIRS_NOAA20_SP": "viirs_noaa20", "VIIRS_NOAA20_NRT": "viirs_noaa20",
}
SERIES_ORDER = ["modis", "viirs_snpp", "viirs_noaa20"]


MAX_CSV_BYTES = 250 * 1024 * 1024  # 250 MB guardrail against DoS


def read_csv_safe(path: Path) -> pd.DataFrame | None:
    """Read one raw FIRMS CSV safely; None if empty, header-only, or oversized."""
    if not path.is_file():
        return None
    if path.stat().st_size > MAX_CSV_BYTES:
        raise ValueError(f"CSV file exceeds {MAX_CSV_BYTES} byte security threshold: {path}")
    try:
        df = pd.read_csv(
            path,
            usecols=lambda c: c in WANTED,
            dtype={"confidence": "string", "acq_time": "string"},
            low_memory=False
        )
    except pd.errors.EmptyDataError:
        return None
    return df if len(df) else None


def load_hotspots(raw_dir: Path = cfg.DATA_RAW) -> pd.DataFrame:
    """Load all raw archive and area-API files as one clean tidy table."""
    frames: list[pd.DataFrame] = []
    archive_dir = raw_dir / "archive"
    if archive_dir.exists():
        for p in sorted(archive_dir.glob("*.csv")):
            m = ARCHIVE_RE.match(p.name)
            if not m:
                continue
            df = read_csv_safe(p)
            if df is None:
                continue
            df["series"] = ARCHIVE_SERIES[m.group(1)]
            df["is_nrt"] = False
            df["source"] = f"{m.group(1)}_archive"
            frames.append(df)
            
    area_dir = raw_dir / "area"
    if area_dir.exists():
        for d in sorted(area_dir.iterdir()):
            if not d.is_dir() or d.name not in AREA_SERIES:
                continue
            for p in sorted(d.glob("*.csv")):
                df = read_csv_safe(p)
                if df is None:
                    continue
                df["series"] = AREA_SERIES[d.name]
                df["is_nrt"] = d.name.endswith("_NRT")
                df["source"] = d.name
                frames.append(df)
                
    if not frames:
        raise SystemExit(f"No raw hotspot files found under {raw_dir}. Run download first.")
        
    df = pd.concat(frames, ignore_index=True)
    for col in WANTED:
        if col not in df.columns:
            df[col] = np.nan
            
    df["acq_date"] = pd.to_datetime(df["acq_date"], errors="coerce")
    for col in ("latitude", "longitude", "frp", "type"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
        
    df = df.dropna(subset=["acq_date", "latitude", "longitude"])
    df["frp"] = df["frp"].fillna(0.0)
    df = df.sort_values("is_nrt", kind="stable")
    df = df.drop_duplicates(subset=["series", "latitude", "longitude", "acq_date", "acq_time", "satellite"])
    return df.reset_index(drop=True)


def in_bbox(df: pd.DataFrame, bbox=cfg.PRESET_BBOX) -> pd.Series:
    """Filter rows inside a bounding box (west, south, east, north)."""
    w, s, e, n = bbox
    return df["longitude"].between(w, e) & df["latitude"].between(s, n)


def normalize_name(text: str) -> str:
    """Normalize regional name: lower-case, strip accents and punctuation."""
    text = unicodedata.normalize("NFKD", str(text))
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    words = [w for w in text.split() if w not in {"province", "wilaya", "de", "of"}]
    return " ".join(words)


def match_preset(name: str) -> str | None:
    """Match boundary feature name to standard preset wilaya id."""
    norm = normalize_name(name)
    for p in cfg.PRESETS:
        keys = {normalize_name(p["name"]), *(normalize_name(a) for a in p["aliases"])}
        if norm in keys:
            return p["id"]
    return None
