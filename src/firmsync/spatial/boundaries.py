"""Boundary polygon ingestion, area checking, and GeoJSON preparation."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urlparse
import geopandas as gpd
import requests

from firmsync import config as cfg
from firmsync.core import match_preset

NAME_COLUMNS = ["shapeName", "NAME_1", "name", "name_en", "ADM1_EN", "ADM1_NAME", "NAME", "wilaya", "admin1Name"]
API = "https://www.geoboundaries.org/api/current/gbOpen/DZA/ADM1/"
ALLOWED_HOSTS = {"geoboundaries.org", "github.com", "githubusercontent.com"}
MAX_FILE_BYTES = 100 * 1024 * 1024  # 100 MB


def validate_trusted_url(url: str) -> str:
    """Validate URL scheme and restrict hosts to trusted domains (SSRF mitigation)."""
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"Insecure protocol: {parsed.scheme}. Only HTTPS is permitted.")
    host = (parsed.hostname or "").lower()
    if not any(host == h or host.endswith("." + h) for h in ALLOWED_HOSTS):
        raise ValueError(f"Untrusted host rejected by SSRF guard: {host}")
    return url


def download_geoboundaries(dest_dir: Path) -> Path:
    validate_trusted_url(API)
    meta = requests.get(API, timeout=60)
    meta.raise_for_status()
    info = meta.json()
    info = info[0] if isinstance(info, list) else info
    url = validate_trusted_url(info["gjDownloadURL"])
    dest_dir.mkdir(parents=True, exist_ok=True)
    out = dest_dir / "geoBoundaries-DZA-ADM1.geojson"
    with requests.get(url, timeout=180, stream=True) as r:
        r.raise_for_status()
        total_size = 0
        with open(out, "wb") as f:
            for chunk in r.iter_content(chunk_size=65536):
                total_size += len(chunk)
                if total_size > MAX_FILE_BYTES:
                    raise ValueError(f"Boundary file exceeds maximum allowable size of {MAX_FILE_BYTES} bytes")
                f.write(chunk)
    return out


def prepare_boundaries(input_path: Path | None = None, download: bool = False,
                       name_col: str | None = None, tolerance: float = 0.20) -> int:
    path = download_geoboundaries(cfg.DATA_RAW / "boundaries") if download else input_path
    if path is None:
        raise ValueError("Must provide either input_path or download=True")
    gdf = gpd.read_file(path)
    if gdf.crs is None:
        gdf = gdf.set_crs(4326)
    gdf = gdf.to_crs(4326)
    col = name_col or next((c for c in NAME_COLUMNS if c in gdf.columns), None)
    if col is None:
        raise ValueError(f"Cannot find a name column among {list(gdf.columns)}")

    gdf["region_id"] = gdf[col].map(match_preset)
    picked = gdf[gdf["region_id"].notna()].copy()
    names = {p["id"]: p["name"] for p in cfg.PRESETS}
    picked["region_name"] = picked["region_id"].map(names)
    picked["area_km2"] = picked.to_crs(6933).area / 1e6

    lines, ok = ["region_id,region_name,area_km2,reference_km2,rel_error,status"], True
    for p in cfg.PRESETS:
        row = picked[picked["region_id"] == p["id"]].iloc[0]
        ref = p["ref_km2"]
        if ref:
            err = row["area_km2"] / ref - 1
            status = "OK" if abs(err) <= tolerance else "CHECK"
            ok &= status == "OK"
            lines.append(f"{p['id']},{p['name']},{row['area_km2']:.0f},{ref},{err:+.1%},{status}")
        else:
            lines.append(f"{p['id']},{p['name']},{row['area_km2']:.0f},,,no reference")
    report = "\n".join(lines)

    cfg.DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    cfg.OUTPUTS.mkdir(parents=True, exist_ok=True)
    keep = picked[["region_id", "region_name", "geometry"]].sort_values("region_id")
    keep.to_file(cfg.DATA_PROCESSED / "preset_wilayas.geojson", driver="GeoJSON")
    (cfg.OUTPUTS / "boundaries_report.txt").write_text(report + "\n")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--input", type=Path)
    src.add_argument("--download", action="store_true")
    ap.add_argument("--name-col")
    ap.add_argument("--tolerance", type=float, default=0.20)
    args = ap.parse_args()
    return prepare_boundaries(input_path=args.input, download=args.download,
                              name_col=args.name_col, tolerance=args.tolerance)


if __name__ == "__main__":
    raise SystemExit(main())
