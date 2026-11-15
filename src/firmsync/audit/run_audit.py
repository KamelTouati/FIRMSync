"""Audit a finished run (read-only) across validation, ratios, and completeness."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
import numpy as np
import pandas as pd

from firmsync import config as cfg


def run_pipeline_audit() -> int:
    issues: list[str] = []

    def flag(msg: str) -> None:
        issues.append(msg)
        print(f"  !! {msg}")

    def section(t: str) -> None:
        print(f"\n=== {t} ===")

    # A. validation
    section("A. validation (wMAPE harmonized vs raw; lower is better)")
    vs = pd.read_csv(cfg.OUTPUTS / "validation_summary.csv")
    vs["worse_than_raw"] = vs["wmape"] > vs["wmape_unharmonized"]
    show = vs[["pair", "metric", "region_id", "n_months", "wmape", "wmape_unharmonized", "bias", "pearson_r", "worse_than_raw"]]
    print(show.round(3).to_string(index=False))
    for r in vs[vs["worse_than_raw"]].itertuples():
        flag(f"{r.pair}/{r.metric}/{r.region_id}: harmonized error {r.wmape:.1%} is WORSE than raw {r.wmape_unharmonized:.1%}")

    # B. NOAA-20 vs SNPP
    section("B. NOAA-20 vs SNPP: yearly sum(SNPP)/sum(NOAA-20) per region (raw counts)")
    m = pd.read_csv(cfg.DATA_PROCESSED / "monthly_regional.csv")
    raw = m.pivot_table(index=["region_id", "year", "month"], columns="series", values="count_raw", aggfunc="sum").reset_index()
    if {"viirs_snpp", "viirs_noaa20"} <= set(raw.columns):
        both = raw.dropna(subset=["viirs_snpp", "viirs_noaa20"])
        both = both[both["year"].between(2019, 2025)]
        yr = both.groupby(["region_id", "year"])[["viirs_snpp", "viirs_noaa20"]].sum()
        yr["ratio"] = yr["viirs_snpp"] / yr["viirs_noaa20"].where(yr["viirs_noaa20"] > 0)
        piv = yr["ratio"].unstack("year").round(2)
        print(piv.to_string())
        spread = piv.max(axis=1) - piv.min(axis=1)
        for region, s in spread.items():
            if s > 0.25:
                flag(f"{region}: SNPP/NOAA-20 ratio varies by {s:.2f} across years (drift or a processing difference); a single pooled ratio is questionable")
        tot = both["viirs_snpp"].sum() / both["viirs_noaa20"].sum()
        print(f"  overall SNPP/NOAA-20 = {tot:.3f} (two near-identical sensors in near-identical orbits should be close to 1)")
        if abs(tot - 1) > 0.25:
            flag(f"overall SNPP/NOAA-20 = {tot:.2f}; investigate masking (type vs location) and SP/NRT mixing before trusting the NOAA-20 line")

    # C. ratios.json
    section("C. ratios.json")
    ratios = json.loads((cfg.OUTPUTS / "ratios.json").read_text())
    for pair, rows in ratios.items():
        df = pd.DataFrame(rows)
        c = df[df["metric"] == "count"]
        print(f"{pair}: levels {c['level'].value_counts().to_dict()}  ratio range {c['ratio'].min():.3f}..{c['ratio'].max():.3f}")
        if (c["level"] != "region_season").any():
            flag(f"{pair}: {(c['level'] != 'region_season').sum()} of {len(c)} count ratios use a pooled fallback")
        if pair == "noaa20_to_snpp" and ((c["ratio"] < 0.7) | (c["ratio"] > 1.4)).any():
            flag("noaa20_to_snpp ratios outside 0.7..1.4: unexpected for near-identical sensors")

    # D. recent months
    section("D. recent months and percentile vs 2003-2025 baseline (primary series, VIIRS-equivalent counts)")
    h = pd.read_csv(cfg.DATA_PROCESSED / "monthly_harmonized.csv")
    base = h[h["year"].between(2003, 2025)]
    rows = []
    for region, g in h.groupby("region_id"):
        g = g.sort_values(["year", "month"])
        for r in g.tail(6).itertuples():
            hist = base[(base["region_id"] == region) & (base["month"] == r.month) & (base["year"] != r.year)]["count_viirs_eq"]
            pct = float((hist <= r.count_viirs_eq).mean()) if len(hist) else np.nan
            rows.append(dict(region=region, ym=f"{r.year}-{r.month:02d}", series=r.series_used, nrt=r.flag_nrt,
                             complete=r.complete, count_eq=round(r.count_viirs_eq, 1),
                             hist_median=round(float(hist.median()), 1) if len(hist) else None,
                             hist_max=round(float(hist.max()), 1) if len(hist) else None, percentile=round(pct, 2)))
    print(pd.DataFrame(rows).to_string(index=False))
    aug = h[(h["year"] == 2026) & (h["month"] == 8)]
    for r in aug.itertuples():
        if r.flag_nrt:
            flag(f"{r.region_id} Aug 2026 uses near-real-time data (no `type`, different processing): treat its percentile as provisional")

    # E. publish readiness
    section("E. publish readiness")
    card = cfg.OUTPUTS / "DATASET_CARD.md"
    if card.exists():
        txt = card.read_text(encoding="utf-8")
        if "TODO" in txt:
            flag("dataset card still contains TODO (boundary credit); fix before making the dataset public")
        if "cc-by-4.0" in txt:
            print("  license in card: cc-by-4.0 (placeholder until you confirm decision D5)")
    env = cfg.ROOT / ".env"
    if env.exists():
        try:
            ign = subprocess.run(["git", "check-ignore", "-q", ".env"], cwd=cfg.ROOT).returncode == 0
            print(f"  .env present; git-ignored: {ign}")
            if not ign:
                flag(".env is NOT ignored by git: do not commit it")
        except FileNotFoundError:
            pass

    meta = cfg.OUTPUTS / "run_metadata.json"
    if meta.exists():
        md = json.loads(meta.read_text())
        print("  run args:", md.get("args"))
        print("  vegetation filter:", md.get("vegetation_filter"))
        print("  versions:", md.get("versions"))

    print(f"\nAUDIT: {len(issues)} item(s) to look at" if issues else "\nAUDIT: nothing flagged")
    return 0


def main():
    return run_pipeline_audit()


if __name__ == "__main__":
    raise SystemExit(main())
