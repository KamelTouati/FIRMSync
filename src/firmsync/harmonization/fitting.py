"""Aggregate monthly regional series, fit sensor transfer ratios, and validate via LOOCV."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
import geopandas as gpd
import numpy as np
import pandas as pd

from firmsync import config as cfg
from firmsync.core import SERIES_ORDER, in_bbox, load_hotspots

PAIRS = {
    "modis_to_snpp": ("modis", "viirs_snpp"),
    "noaa20_to_snpp": ("viirs_noaa20", "viirs_snpp"),
}
SHORT = {"modis": "modis", "viirs_snpp": "snpp", "viirs_noaa20": "n20"}


def filter_vegetation(df: pd.DataFrame, cell_deg=0.01, min_cell_n=3, share=0.5):
    stats = {"rows_in": int(len(df))}
    df = df.copy()
    df["cell"] = (np.floor(df["latitude"] / cell_deg).astype("int64") * 100000
                  + np.floor(df["longitude"] / cell_deg).astype("int64") + 5_000_000)
    known = df["type"].notna()
    hist = df[known]
    g = hist.groupby("cell")["type"].agg(n="size", nonveg=lambda s: (s != 0).mean())
    static_cells = set(g.index[(g["n"] >= min_cell_n) & (g["nonveg"] >= share)])
    stats["static_cells"] = len(static_cells)

    drop_typed = known & (df["type"] != 0)
    drop_untyped_static = (~known) & df["cell"].isin(static_cells)
    stats["dropped_by_type"] = int(drop_typed.sum())
    stats["dropped_untyped_in_static_cells"] = int(drop_untyped_static.sum())
    stats["kept_without_type"] = int(((~known) & ~df["cell"].isin(static_cells)).sum())
    out = df[~(drop_typed | drop_untyped_static)].drop(columns="cell")
    stats["rows_out"] = int(len(out))
    return out, stats


def aggregate(df: pd.DataFrame, regions: gpd.GeoDataFrame, spans: dict) -> pd.DataFrame:
    pts = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df["longitude"], df["latitude"]), crs=4326)
    joined = gpd.sjoin(pts, regions[["region_id", "geometry"]], predicate="within", how="inner")
    joined["ym"] = joined["acq_date"].dt.to_period("M")
    agg = (joined.groupby(["region_id", "series", "ym"])
           .agg(count_raw=("frp", "size"), frp_sum_raw_mw=("frp", "sum"), nrt_rows=("is_nrt", "sum"))
           .reset_index())
    agg["flag_nrt"] = agg["nrt_rows"] > 0
    agg = agg.drop(columns="nrt_rows")

    frames = []
    for series, (first, last) in spans.items():
        months = pd.period_range(first.to_period("M"), last.to_period("M"), freq="M")
        grid = pd.MultiIndex.from_product([regions["region_id"], [series], months],
                                          names=["region_id", "series", "ym"]).to_frame(index=False)
        frames.append(grid)
    grid = pd.concat(frames, ignore_index=True)
    out = grid.merge(agg, on=["region_id", "series", "ym"], how="left")
    out["count_raw"] = out["count_raw"].fillna(0).astype(int)
    out["frp_sum_raw_mw"] = out["frp_sum_raw_mw"].fillna(0.0)
    out["flag_nrt"] = out["flag_nrt"].fillna(False).astype(bool)
    last_day = {s: pd.Timestamp(v[1]) for s, v in spans.items()}
    out["complete"] = [p.end_time.normalize() <= last_day[s] for p, s in zip(out["ym"], out["series"])]
    out["year"] = out["ym"].dt.year
    out["month"] = out["ym"].dt.month
    out["season"] = out["month"].map(cfg.SEASONS)
    return out


def wide_table(monthly: pd.DataFrame) -> pd.DataFrame:
    w = monthly.pivot_table(index=["region_id", "year", "month", "season"], columns="series",
                            values=["count_raw", "frp_sum_raw_mw"], aggfunc="sum")
    w.columns = [f"{'count' if a == 'count_raw' else 'frp'}_{SHORT[b]}" for a, b in w.columns]
    return w.reset_index()


def fit_ratios(w: pd.DataFrame, den: str, ref: str, years, min_n: int, regions) -> pd.DataFrame:
    sub = w[w["year"].between(*years)]
    sub = sub.dropna(subset=[f"count_{den}", f"count_{ref}"])
    rows = []
    for metric in ("count", "frp"):
        d, r = f"{metric}_{den}", f"{metric}_{ref}"
        cols = list(dict.fromkeys([d, r, f"count_{den}"]))
        pooled = {
            "region_season": sub.groupby(["region_id", "season"])[cols].sum(),
            "region": sub.groupby("region_id")[cols].sum(),
            "season": sub.groupby("season")[cols].sum(),
            "global": pd.DataFrame([sub[cols].sum()]),
        }

        def ok(row):
            return row[f"count_{den}"] >= min_n and row[d] > 0 and row[r] > 0

        for region in regions:
            for season in ("DJF", "MAM", "JJA", "SON"):
                chosen = None
                for level, key in (("region_season", (region, season)), ("region", region),
                                   ("season", season), ("global", 0)):
                    tab = pooled[level]
                    if key in tab.index:
                        row = tab.loc[key]
                        if ok(row):
                            chosen = (level, row)
                            break
                if chosen is None:
                    rows.append(dict(region_id=region, season=season, metric=metric, ratio=np.nan,
                                     level="none", n_den=0, sum_den=0.0, sum_ref=0.0))
                else:
                    level, row = chosen
                    rows.append(dict(region_id=region, season=season, metric=metric,
                                     ratio=float(row[r] / row[d]), level=level,
                                     n_den=int(row[f"count_{den}"]), sum_den=float(row[d]), sum_ref=float(row[r])))
    return pd.DataFrame(rows)


def ratio_lookup(tab: pd.DataFrame, metric: str) -> dict:
    t = tab[tab["metric"] == metric]
    return {(r.region_id, r.season): r.ratio for r in t.itertuples()}


def loyo(w: pd.DataFrame, den: str, ref: str, years, min_n: int, regions) -> dict:
    usable = w[w["year"].between(*years)].dropna(subset=[f"count_{den}", f"count_{ref}"])
    out = {}
    for metric in ("count", "frp"):
        recs = []
        for y in sorted(usable["year"].unique()):
            train = w[w["year"].between(*years) & (w["year"] != y)]
            tab = fit_ratios(train, den, ref, years, min_n, regions)
            lk = ratio_lookup(tab, metric)
            test = usable[usable["year"] == y]
            factor = np.array([lk.get((r, s), np.nan) for r, s in zip(test["region_id"], test["season"])])
            recs.append(pd.DataFrame({
                "region_id": test["region_id"].values, "year": y, "month": test["month"].values,
                "season": test["season"].values,
                "obs": test[f"{metric}_{ref}"].values,
                "raw": test[f"{metric}_{den}"].values,
                "pred": test[f"{metric}_{den}"].values * factor,
            }))
        d = pd.concat(recs, ignore_index=True).dropna(subset=["pred"])

        def summarize(g: pd.DataFrame) -> dict:
            so = g["obs"].sum()
            if so <= 0 or len(g) < 3:
                return {"n_months": int(len(g)), "wmape": None}
            r = np.corrcoef(g["pred"], g["obs"])[0, 1] if g["obs"].std() > 0 and g["pred"].std() > 0 else None
            return {"n_months": int(len(g)),
                    "wmape": float((g["pred"] - g["obs"]).abs().sum() / so),
                    "wmape_unharmonized": float((g["raw"] - g["obs"]).abs().sum() / so),
                    "bias": float(g["pred"].sum() / so - 1),
                    "pearson_r": None if r is None or np.isnan(r) else float(r)}

        annual = d.groupby(["region_id", "year"])[["obs", "pred"]].sum()
        annual["rel_err"] = (annual["pred"] - annual["obs"]) / annual["obs"].where(annual["obs"] > 0)
        out[metric] = {
            "overall": summarize(d),
            "by_region": {k: summarize(g) for k, g in d.groupby("region_id")},
            "by_season": {k: summarize(g) for k, g in d.groupby("season")},
            "annual_total_rel_err_median_abs": float(annual["rel_err"].abs().median()) if len(annual) else None,
            "folds": {int(y): summarize(g) for y, g in d.groupby("year")},
        }
    return out


def run_harmonization(regions_path: Path = cfg.DATA_PROCESSED / "preset_wilayas.geojson",
                      overlap_modis=cfg.OVERLAP_MODIS_SNPP,
                      overlap_n20=cfg.OVERLAP_N20_SNPP,
                      min_n=cfg.MIN_DETECTIONS_FOR_RATIO,
                      viirs_drop_low=False, modis_min_conf=None) -> int:
    t0 = time.time()
    regions = gpd.read_file(regions_path).to_crs(4326)
    region_ids = list(regions["region_id"])
    names = dict(zip(regions["region_id"], regions["region_name"]))

    df = load_hotspots()
    spans = {s: (g["acq_date"].min().normalize(), g["acq_date"].max().normalize())
             for s, g in df.groupby("series")}

    meta: dict = {"args": {}, "warnings": []}
    df, fstats = filter_vegetation(df)
    meta["vegetation_filter"] = fstats

    if viirs_drop_low:
        df = df[~(df["series"].isin(["viirs_snpp", "viirs_noaa20"]) & (df["confidence"] == "l"))]
    if modis_min_conf is not None:
        conf = pd.to_numeric(df["confidence"], errors="coerce")
        df = df[~((df["series"] == "modis") & (conf < modis_min_conf))]

    df = df[in_bbox(df, tuple(regions.total_bounds))]
    monthly = aggregate(df, regions, spans)

    w = wide_table(monthly)
    tabs = {}
    for name, (den_s, ref_s) in PAIRS.items():
        yrs = overlap_modis if name.startswith("modis") else overlap_n20
        den, ref = SHORT[den_s], SHORT[ref_s]
        if f"count_{den}" not in w.columns or f"count_{ref}" not in w.columns:
            continue
        tabs[name] = fit_ratios(w, den, ref, yrs, min_n, region_ids)

    monthly["ratio_count"] = np.nan
    monthly["ratio_frp"] = np.nan
    monthly.loc[monthly["series"] == "viirs_snpp", ["ratio_count", "ratio_frp"]] = 1.0
    for name, (den_s, _) in PAIRS.items():
        if name not in tabs:
            continue
        for metric, col in (("count", "ratio_count"), ("frp", "ratio_frp")):
            lk = ratio_lookup(tabs[name], metric)
            m = monthly["series"] == den_s
            monthly.loc[m, col] = [lk.get((r, s), np.nan) for r, s in zip(monthly.loc[m, "region_id"], monthly.loc[m, "season"])]
    monthly["count_viirs_eq"] = monthly["count_raw"] * monthly["ratio_count"]
    monthly["frp_sum_viirs_eq_mw"] = monthly["frp_sum_raw_mw"] * monthly["ratio_frp"]

    key = monthly["year"] * 100 + monthly["month"]
    sn, n2 = cfg.PRIMARY_SWITCH_SNPP, cfg.PRIMARY_SWITCH_N20
    primary = np.where(key >= n2[0] * 100 + n2[1], "viirs_noaa20",
                       np.where(key >= sn[0] * 100 + sn[1], "viirs_snpp", "modis"))
    monthly["is_primary"] = monthly["series"].to_numpy() == primary
    monthly["region_name"] = monthly["region_id"].map(names)

    validation = {"definition": {"wmape": "sum|pred-obs| / sum(obs) over leave-one-year-out months",
                                 "wmape_unharmonized": "same error if the raw numbers were used as-is",
                                 "reference_units": "Suomi-NPP-equivalent"},
                  "params": {"min_n": min_n, "overlap_modis": list(overlap_modis),
                             "overlap_n20": list(overlap_n20)}}
    for name, (den_s, ref_s) in PAIRS.items():
        if name in tabs:
            yrs = overlap_modis if name.startswith("modis") else overlap_n20
            validation[name] = loyo(w, SHORT[den_s], SHORT[ref_s], yrs, min_n, region_ids)

    cfg.DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    cfg.OUTPUTS.mkdir(parents=True, exist_ok=True)
    cols = ["region_id", "region_name", "year", "month", "series", "count_raw", "count_viirs_eq",
            "frp_sum_raw_mw", "frp_sum_viirs_eq_mw", "ratio_count", "ratio_frp",
            "flag_nrt", "complete", "is_primary"]
    out = monthly.sort_values(["region_id", "year", "month", "series"])[cols]
    out.to_csv(cfg.DATA_PROCESSED / "monthly_regional.csv", index=False, float_format="%.4f")
    out.to_parquet(cfg.DATA_PROCESSED / "monthly_regional.parquet", index=False)

    harm = out[out["is_primary"]].rename(columns={"series": "series_used", "frp_sum_viirs_eq_mw": "frp_viirs_eq_mw"})
    harm = harm.drop(columns=["count_raw", "frp_sum_raw_mw", "ratio_count", "ratio_frp", "is_primary"])
    harm.to_csv(cfg.DATA_PROCESSED / "monthly_harmonized.csv", index=False, float_format="%.4f")
    harm.to_parquet(cfg.DATA_PROCESSED / "monthly_harmonized.parquet", index=False)

    ratios_json = {n: t.replace({np.nan: None}).to_dict(orient="records") for n, t in tabs.items()}
    (cfg.OUTPUTS / "ratios.json").write_text(json.dumps(ratios_json, indent=2))
    (cfg.OUTPUTS / "validation.json").write_text(json.dumps(validation, indent=2))

    rows = []
    for name in tabs:
        for metric in ("count", "frp"):
            v = validation[name][metric]
            for region, s in v["by_region"].items():
                rows.append({"pair": name, "metric": metric, "region_id": region, **s})
            rows.append({"pair": name, "metric": metric, "region_id": "ALL", **v["overall"]})
    pd.DataFrame(rows).to_csv(cfg.OUTPUTS / "validation_summary.csv", index=False)
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--regions", type=Path, default=cfg.DATA_PROCESSED / "preset_wilayas.geojson")
    ap.add_argument("--overlap-modis", type=int, nargs=2, default=cfg.OVERLAP_MODIS_SNPP)
    ap.add_argument("--overlap-n20", type=int, nargs=2, default=cfg.OVERLAP_N20_SNPP)
    ap.add_argument("--min-n", type=int, default=cfg.MIN_DETECTIONS_FOR_RATIO)
    ap.add_argument("--viirs-drop-low", action="store_true")
    ap.add_argument("--modis-min-conf", type=int, default=None)
    args = ap.parse_args()
    return run_harmonization(regions_path=args.regions, overlap_modis=args.overlap_modis,
                             overlap_n20=args.overlap_n20, min_n=args.min_n,
                             viirs_drop_low=args.viirs_drop_low, modis_min_conf=args.modis_min_conf)


if __name__ == "__main__":
    raise SystemExit(main())
