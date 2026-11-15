---
license: cc-by-4.0
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

Monthly active-fire hotspot counts and summed fire radiative power (FRP) for 7 wilayas,
2000 to 2026, expressed in **Suomi-NPP-equivalent units** so that the sensor of origin no longer matters.
Built for the NASA Space Apps Challenge 2026 ("Harmonization of MODIS and VIIRS Hot Spots").

## Files
- `monthly_harmonized.csv`: one row per region and month, primary series only (the table the app reads).
- `monthly_regional.csv`: one row per region, month and series, with raw and harmonized values and the ratio applied.
- `ratios.json`: fitted MODIS to SNPP and NOAA-20 to SNPP ratios per region and season, with sample sizes and the fallback level used.
- `validation.json`, `validation_summary.csv`: leave-one-year-out errors.
- `run_metadata.json`: parameters, filter counts, data spans, software versions.

## Method (short)
1. Sources: NASA FIRMS MODIS (Terra+Aqua, from 2000), VIIRS Suomi-NPP 375 m (from 2012), VIIRS NOAA-20 375 m (from April 2018). NOAA-21 is not used.
2. Vegetation fires only (`type == 0`); static sources removed by `type`, or by location for rows without `type`.
3. Detections assigned to wilayas by point-in-polygon, aggregated to months, zero-filled.
4. Ratios (sum of reference / sum of converted series) fitted per region and season over the overlap years, with pooled fallbacks when detections are few.
5. Primary line: MODIS before 2012, Suomi-NPP from 2012 through October 2026, NOAA-20 (scaled to SNPP) following Suomi-NPP decommission in November 2026.

## Validation (leave-one-year-out, weighted MAPE of monthly regional values)
| Conversion | Metric | wMAPE harmonized | wMAPE raw | Bias |
|---|---|---|---|---|
| modis_to_snpp | count | 33.6% | 72.6% | +0.1% |
| modis_to_snpp | frp | 33.0% | 43.7% | +1.9% |
| noaa20_to_snpp | count | 33.6% | 29.1% | -3.6% |
| noaa20_to_snpp | frp | 42.5% | 38.2% | -4.6% |

## Limitations
- Monthly regional scale only: not per-fire, not burned area, not perimeters.
- Ratios may not be stable before 2012 (MODIS-only period) or after satellite orbit changes.
- Hotspot counts depend on detection thresholds and overpass times; small or cloud-covered fires can be missed.
- Months flagged `flag_nrt` include near-real-time data; months with `complete = False` are partial and should not be used for anomaly statistics.
- This is an analytical aid, not an official warning system.

## Acknowledgement
We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) (https://earthdata.nasa.gov/firms), part of NASA's Land, Atmosphere Near real-time Capability for Earth observations (LANCE) (https://earthdata.nasa.gov/lance) and NASA's Earth Science Data and Information System (ESDIS).

Administrative boundaries: geoBoundaries gbOpen ADM1 (OpenStreetMap contributors, ODbL)

Generated 2026-11-15.
