"""Sanity check raw FIRMS hotspot datasets before pipeline processing."""
from __future__ import annotations

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

from firmsync import config as cfg
from firmsync.core import SERIES_ORDER, in_bbox, load_hotspots


def run_sanity_checks() -> int:
    cfg.OUTPUTS.mkdir(parents=True, exist_ok=True)
    warnings: list[str] = []

    def warn(msg: str) -> None:
        warnings.append(msg)
        print(f"WARN: {msg}")

    df = load_hotspots()
    df["year"] = df["acq_date"].dt.year
    df["month"] = df["acq_date"].dt.month
    inbox = in_bbox(df)
    print(f"Loaded {len(df):,} detections; {inbox.sum():,} inside the preset bbox {cfg.PRESET_BBOX}\n")

    # 1. rows per year per series
    country = df.groupby(["year", "series"]).size().unstack("series").reindex(columns=SERIES_ORDER)
    local = df[inbox].groupby(["year", "series"]).size().unstack("series").reindex(columns=SERIES_ORDER)
    country.to_csv(cfg.OUTPUTS / "sanity_rows_per_year_country.csv")
    local.to_csv(cfg.OUTPUTS / "sanity_rows_per_year_bbox.csv")

    # 2. `type` column check
    for (series, nrt), g in df.groupby(["series", "is_nrt"]):
        known = g["type"].notna()
        share_known = known.mean()
        if not nrt and share_known < 0.99:
            warn(f"{series}: standard-processing rows without `type` ({1 - share_known:.1%})")

    # 3. date coverage
    spans = df.groupby("series")["acq_date"].agg(["min", "max", "count"]).reindex(SERIES_ORDER)
    n20_first = spans.loc["viirs_noaa20", "min"] if "viirs_noaa20" in df["series"].values else pd.NaT
    if pd.isna(n20_first):
        warn("no NOAA-20 data loaded")
    elif n20_first > pd.Timestamp(2018, 4, 15) or n20_first < pd.Timestamp(2018, 1, 1):
        warn(f"NOAA-20 first detection is {n20_first.date()}, expected ~2018-04")

    # 4. monthly MODIS vs SNPP in bbox, 2012-2025
    sub = df[inbox & df["year"].between(2012, 2025) & df["series"].isin(["modis", "viirs_snpp"])]
    monthly = (sub.groupby([sub["acq_date"].dt.to_period("M"), "series"]).size()
               .unstack("series").reindex(columns=["modis", "viirs_snpp"]).fillna(0))
    monthly.index = monthly.index.to_timestamp()
    monthly.to_csv(cfg.OUTPUTS / "sanity_monthly_modis_vs_snpp.csv")
    seasonal = monthly.groupby(monthly.index.month).mean()
    seasonal["ratio_snpp_over_modis"] = seasonal["viirs_snpp"] / seasonal["modis"].where(seasonal["modis"] > 0)

    # 5. plots
    fig, axes = plt.subplots(3, 1, figsize=(11, 11))
    ax = axes[0]
    for s, c in (("modis", "tab:orange"), ("viirs_snpp", "tab:blue")):
        ax.plot(monthly.index, monthly[s].where(monthly[s] > 0), label=s, color=c, lw=1.2)
    ax.set_yscale("log")
    ax.set_title("Monthly detections inside the preset bbox, 2012-2025 (log scale)")
    ax.legend()
    ax.grid(alpha=.3)

    ax = axes[1]
    ax.bar(seasonal.index, seasonal["ratio_snpp_over_modis"], color="tab:green")
    ax.set_title("SNPP / MODIS count ratio by calendar month")
    ax.set_xlabel("month")
    ax.set_xticks(range(1, 13))
    ax.grid(alpha=.3)

    ax = axes[2]
    local.plot(ax=ax, marker="o", lw=1)
    ax.set_title("Detections per year inside preset bbox, by series")
    ax.grid(alpha=.3)
    fig.tight_layout()

    out = cfg.OUTPUTS / "sanity_monthly_modis_vs_viirs.png"
    fig.savefig(out, dpi=130)
    print(f"SANITY CHECK COMPLETE: {len(warnings)} warning(s)")
    return 0


def main():
    return run_sanity_checks()


if __name__ == "__main__":
    raise SystemExit(main())
