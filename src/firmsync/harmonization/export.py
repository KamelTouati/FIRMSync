"""Compile all harmonized data, raw counts, baselines, and GeoJSON into a frontend bundle."""
from __future__ import annotations

import json
from pathlib import Path
import numpy as np
import pandas as pd

from firmsync import config as cfg

BASELINE_START = 2003
BASELINE_END = 2025


def compute_baselines(df: pd.DataFrame) -> dict:
    base_df = df[(df["year"] >= BASELINE_START) & (df["year"] <= BASELINE_END)]
    baselines = {}
    for region_id, rg in base_df.groupby("region_id"):
        baselines[region_id] = {}
        for metric in ["count_viirs_eq", "frp_sum_viirs_eq_mw"]:
            baselines[region_id][metric] = {}
            for month, mg in rg.groupby("month"):
                vals = mg[metric].values
                med = float(np.median(vals))
                p25 = float(np.percentile(vals, 25))
                p75 = float(np.percentile(vals, 75))
                p90 = float(np.percentile(vals, 90))
                mean = float(np.mean(vals))
                std = float(np.std(vals))
                baselines[region_id][metric][int(month)] = {
                    "median": round(med, 1),
                    "p25": round(p25, 1),
                    "p75": round(p75, 1),
                    "p90": round(p90, 1),
                    "mean": round(mean, 1),
                    "std": round(std, 1),
                    "min": round(float(np.min(vals)), 1),
                    "max": round(float(np.max(vals)), 1),
                }
    return baselines


def classify_status(val: float, b_stats: dict) -> tuple[str, float]:
    med = b_stats["median"]
    p75 = b_stats["p75"]
    p90 = b_stats["p90"]
    std = b_stats["std"] if b_stats["std"] > 0 else 1.0
    z_score = round((val - b_stats["mean"]) / std, 2)
    if val > p90:
        status = "extreme"
    elif val > p75:
        status = "high"
    elif val >= med:
        status = "normal"
    else:
        status = "low"
    return status, z_score


def export_frontend_bundle() -> int:
    reg_path = cfg.DATA_PROCESSED / "monthly_regional.csv"
    geo_path = cfg.DATA_PROCESSED / "preset_wilayas.geojson"
    val_path = cfg.OUTPUTS / "validation.json"
    rat_path = cfg.OUTPUTS / "ratios.json"
    fc_path = cfg.OUTPUTS / "forecasts_2026_2027.json"

    df_reg = pd.read_csv(reg_path)
    primary_df = df_reg[df_reg["is_primary"]].copy()

    with open(geo_path, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    validation = json.loads(val_path.read_text(encoding="utf-8")) if val_path.exists() else {}
    ratios = json.loads(rat_path.read_text(encoding="utf-8")) if rat_path.exists() else {}
    fc_data = json.loads(fc_path.read_text(encoding="utf-8")) if fc_path.exists() else {"forecasts": {}}

    baselines = compute_baselines(primary_df)
    records = []
    base_window = primary_df[(primary_df["year"] >= BASELINE_START) & (primary_df["year"] <= BASELINE_END)]

    for _, row in primary_df.iterrows():
        rid = row["region_id"]
        m = int(row["month"])
        y = int(row["year"])
        c_val = float(row["count_viirs_eq"])
        f_val = float(row["frp_sum_viirs_eq_mw"])
        c_raw = int(row["count_raw"]) if pd.notna(row["count_raw"]) else 0
        f_raw = float(row["frp_sum_raw_mw"]) if pd.notna(row["frp_sum_raw_mw"]) else 0.0
        ratio_c = float(row["ratio_count"]) if pd.notna(row["ratio_count"]) else 1.0

        c_base = baselines.get(rid, {}).get("count_viirs_eq", {}).get(m, {})
        f_base = baselines.get(rid, {}).get("frp_sum_viirs_eq_mw", {}).get(m, {})

        c_status, c_z = classify_status(c_val, c_base) if c_base else ("normal", 0.0)
        f_status, f_z = classify_status(f_val, f_base) if f_base else ("normal", 0.0)

        hist_same_m = base_window[(base_window["region_id"] == rid) & (base_window["month"] == m)]["count_viirs_eq"].values
        pct_rank = int(round((hist_same_m <= c_val).mean() * 100)) if len(hist_same_m) > 0 else 50

        records.append({
            "region_id": rid,
            "region_name": row["region_name"],
            "year": y,
            "month": m,
            "series_used": row["series"],
            "count": round(c_val, 1),
            "count_raw": c_raw,
            "ratio_count": round(ratio_c, 2),
            "frp": round(f_val, 1),
            "frp_raw": round(f_raw, 1),
            "flag_nrt": bool(row["flag_nrt"]),
            "complete": bool(row["complete"]),
            "count_status": c_status,
            "count_z": c_z,
            "count_pct": pct_rank,
            "count_base_median": c_base.get("median", 0.0) if c_base else 0.0,
            "burned_ha_min": int(round(c_val * 6.2)),
            "burned_ha_max": int(round(c_val * 14.8)),
            "frp_status": f_status,
            "frp_z": f_z,
            "frp_base_median": f_base.get("median", 0.0) if f_base else 0.0,
        })

    regions = []
    for f in geojson["features"]:
        props = f["properties"]
        rid = props["region_id"]
        r_rows = [r for r in records if r["region_id"] == rid]
        latest_complete = next((r for r in reversed(r_rows) if r["complete"]), r_rows[-1] if r_rows else None)
        regions.append({
            "id": rid,
            "name": props["region_name"],
            "area_km2": props.get("area_km2", 0),
            "latest": latest_complete,
        })

    bundle = {
        "metadata": {
            "title": "FIRMSync - Harmonized MODIS/VIIRS Fire Intelligence",
            "study_area": "Northern Algeria & Mediterranean Tell Atlas",
            "baseline_period": f"{BASELINE_START}-{BASELINE_END}",
            "last_updated": "2026-11-15",
            "disclaimer": "Analytical decision aid based on satellite thermal anomalies; not an official operational wildfire warning system.",
            "nasa_firms_ack": "We acknowledge the use of data from NASA's Fire Information for Resource Management System (FIRMS), part of NASA's LANCE and ESDIS projects.",
            "boundaries_ack": "Administrative boundaries derived from geoBoundaries gbOpen ADM1 (OpenStreetMap contributors, ODbL).",
        },
        "regions": regions,
        "geojson": geojson,
        "baselines": baselines,
        "timeseries": records,
        "validation": validation,
        "ratios": ratios,
        "forecasts": fc_data.get("forecasts", {}),
        "forecast_metadata": fc_data.get("metadata", {}),
        "forecast_metrics": fc_data.get("validation_metrics", {}),
    }

    out_processed = cfg.DATA_PROCESSED / "frontend_data.json"
    with open(out_processed, "w", encoding="utf-8") as f:
        json.dump(bundle, f, separators=(",", ":"))

    web_data = cfg.ROOT / "web" / "src" / "data"
    web_data.mkdir(parents=True, exist_ok=True)
    out_web = web_data / "firmsync_data.json"
    with open(out_web, "w", encoding="utf-8") as f:
        json.dump(bundle, f, separators=(",", ":"))

    print(f"Exported frontend bundle ({out_web.stat().st_size / 1024:.1f} KB)")
    return 0


def main():
    return export_frontend_bundle()


if __name__ == "__main__":
    raise SystemExit(main())
