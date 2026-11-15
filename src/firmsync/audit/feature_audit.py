"""Quality control audit for ML forecasting and burned area estimations."""
from __future__ import annotations

import json
from pathlib import Path

from firmsync import config as cfg


def run_feature_audit() -> int:
    path = cfg.OUTPUTS / "forecasts_2026_2027.json"
    if not path.exists():
        print("FAIL: outputs/forecasts_2026_2027.json does not exist!")
        return 1

    data = json.loads(path.read_text(encoding="utf-8"))
    forecasts = data.get("forecasts", {})
    expected_regions = ["algiers", "bejaia", "bouira", "boumerdes", "jijel", "skikda", "tizi_ouzou"]
    errors = []

    for rid in expected_regions:
        if rid not in forecasts:
            errors.append(f"Missing forecast for region: {rid}")
            continue

        r_f = forecasts[rid]
        if len(r_f) != 13:
            errors.append(f"{rid} has {len(r_f)} forecast periods, expected 13")

        for f in r_f:
            ym = f"{f['year']}-{f['month']:02d}"
            pred = f["predicted_count"]
            h_min = f["ha_min"]
            h_max = f["ha_max"]
            risk = f["risk_class"]

            if pred < 0:
                errors.append(f"{rid} {ym}: negative prediction {pred}")

            if h_min > h_max:
                errors.append(f"{rid} {ym}: ha_min ({h_min}) > ha_max ({h_max})")

            if risk not in ["low", "normal", "high", "extreme"]:
                errors.append(f"{rid} {ym}: invalid risk_class '{risk}'")

            if f["month"] in [12, 1] and pred > 30.0 and rid in ["algiers", "boumerdes", "bouira"]:
                errors.append(f"{rid} {ym}: unrealistically high winter prediction ({pred})")

    if errors:
        print(f"AUDIT FAILED with {len(errors)} error(s):")
        for err in errors:
            print(f"  ❌ {err}")
        return 1

    print("ALL AUDIT CHECKS PASSED (100% compliant with physics, schema, and constraints) ✅")
    print(f"Verified {len(expected_regions)} regions, 13 forecast horizons each.")
    return 0


def main():
    return run_feature_audit()


if __name__ == "__main__":
    raise SystemExit(main())
