"""Publish the harmonized dataset to Hugging Face."""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date
from pathlib import Path
import pandas as pd
from huggingface_hub import HfApi

from firmsync import config as cfg

FILES = [
    (cfg.DATA_PROCESSED / "monthly_harmonized.csv", "monthly_harmonized.csv"),
    (cfg.DATA_PROCESSED / "monthly_regional.csv", "monthly_regional.csv"),
    (cfg.OUTPUTS / "ratios.json", "ratios.json"),
    (cfg.OUTPUTS / "validation.json", "validation.json"),
    (cfg.OUTPUTS / "validation_summary.csv", "validation_summary.csv"),
    (cfg.OUTPUTS / "run_metadata.json", "run_metadata.json"),
]

CARD = """---
license: {license}
pretty_name: FIRMSync - harmonized MODIS/VIIRS monthly fire activity, northern Algeria
language:
- en
tags:
- wildfire
- remote-sensing
- NASA-FIRMS
- MODIS
- VIIRS
- Algeria
- time-series
task_categories:
- time-series-forecasting
size_categories:
- n<1K
---

# FIRMSync: harmonized MODIS/VIIRS monthly fire activity (northern Algeria)

Monthly active-fire hotspot counts and summed fire radiative power (FRP) for {n_regions} wilayas,
2000 to {last_year}, expressed in **Suomi-NPP-equivalent units** so that the sensor of origin no longer matters.
Built for the NASA Space Apps Challenge 2026 ("Harmonization of MODIS and VIIRS Hot Spots").

## Files
- `monthly_harmonized.csv`: one row per region and month, primary series only.
- `monthly_regional.csv`: one row per region, month and series, with raw and harmonized values.
- `ratios.json`: fitted MODIS to SNPP and NOAA-20 to SNPP ratios per region and season.
- `validation.json`, `validation_summary.csv`: leave-one-year-out errors.
- `run_metadata.json`: parameters, filter counts, data spans, software versions.

## Method (short)
1. Sources: NASA FIRMS MODIS (Terra+Aqua, from 2000), VIIRS Suomi-NPP 375 m (from 2012), VIIRS NOAA-20 375 m (from April 2018).
2. Vegetation fires only (`type == 0`); static sources removed.
3. Detections assigned to wilayas by point-in-polygon, aggregated to months, zero-filled.
4. Ratios fitted per region and season over the overlap years.
5. Primary line: MODIS before 2012, Suomi-NPP from 2012 through October 2026, NOAA-20 (scaled to SNPP) following Suomi-NPP decommission in November 2026.

## Validation (leave-one-year-out, weighted MAPE of monthly regional values)
{validation_table}

## Acknowledgement
We acknowledge the use of data from NASA's Fire Information for Resource Management System (FIRMS), part of NASA's LANCE and ESDIS projects.
Administrative boundaries: {boundaries_credit}

Generated {today}.
"""


def validation_table() -> tuple[str, int]:
    path = cfg.OUTPUTS / "validation.json"
    if not path.exists():
        return "_validation.json not found._", 0
    v = json.loads(path.read_text())
    rows = ["| Conversion | Metric | wMAPE harmonized | wMAPE raw | Bias |", "|---|---|---|---|---|"]
    for pair in ("modis_to_snpp", "noaa20_to_snpp"):
        for metric in ("count", "frp"):
            o = v.get(pair, {}).get(metric, {}).get("overall", {})
            if o.get("wmape") is not None:
                rows.append(f"| {pair} | {metric} | {o['wmape']:.1%} | {o['wmape_unharmonized']:.1%} | {o['bias']:+.1%} |")
    return "\n".join(rows), len(rows) - 2


def publish_to_huggingface(repo_id: str, is_public: bool = False,
                           license_str: str = "cc-by-4.0",
                           boundaries_credit: str = "geoBoundaries gbOpen ADM1 (OpenStreetMap contributors, ODbL)") -> int:
    token = cfg.HF_TOKEN
    if not token and (cfg.ROOT / ".env").exists():
        for line in (cfg.ROOT / ".env").read_text().splitlines():
            if line.startswith("HF_TOKEN="):
                token = line.split("=", 1)[1].strip()
                break
    if not token:
        print("HF_TOKEN is not set.", file=sys.stderr)
        return 2

    harm = pd.read_csv(cfg.DATA_PROCESSED / "monthly_harmonized.csv")
    table, _ = validation_table()
    card = CARD.format(license=license_str, n_regions=harm["region_id"].nunique(),
                       last_year=int(harm["year"].max()), validation_table=table,
                       boundaries_credit=boundaries_credit, today=date.today().isoformat())
    card_path = cfg.OUTPUTS / "DATASET_CARD.md"
    card_path.write_text(card, encoding="utf-8")

    api = HfApi(token=token)
    api.create_repo(repo_id, repo_type="dataset", private=not is_public, exist_ok=True)
    for src, name in FILES:
        if src.exists():
            api.upload_file(path_or_fileobj=str(src), path_in_repo=name, repo_id=repo_id, repo_type="dataset")
            print("uploaded", name)
    api.upload_file(path_or_fileobj=str(card_path), path_in_repo="README.md", repo_id=repo_id, repo_type="dataset")
    print(f"Done: https://huggingface.co/datasets/{repo_id}")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--repo-id", required=True)
    ap.add_argument("--license", default="cc-by-4.0")
    ap.add_argument("--boundaries-credit", default="geoBoundaries gbOpen ADM1 (OpenStreetMap contributors, ODbL)")
    ap.add_argument("--public", action="store_true")
    args = ap.parse_args()
    return publish_to_huggingface(repo_id=args.repo_id, is_public=args.public,
                                  license_str=args.license, boundaries_credit=args.boundaries_credit)


if __name__ == "__main__":
    raise SystemExit(main())
