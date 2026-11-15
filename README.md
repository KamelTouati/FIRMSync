# FIRMSync: harmonized MODIS/VIIRS fire calendar (northern Algeria)

NASA Space Apps Challenge 2026, challenge "Harmonization of MODIS and VIIRS Hot Spots".
Pipeline that turns NASA FIRMS hotspots into one consistent monthly series per wilaya
(Suomi-NPP-equivalent units), with leave-one-year-out validation.

## Setup
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then edit .env (it is git-ignored)
export FIRMS_MAP_KEY=...        # never paste the key into a script or commit it
```

## Run order
| Step | Command | What it does |
|---|---|---|
| 1 | `python scripts/01_download_archives.py --archives-only` | yearly Algeria archives: MODIS 2000+, VIIRS-SNPP 2012+ (no key) |
| 1b | `python scripts/01_download_archives.py --dry-run` then without flags | area API: NOAA-20 from 2018-04 and the current year (needs key, about 750 small requests, resumable) |
| 2 | `python scripts/02_sanity_check.py` | row counts, `type` column, NOAA-20 start, seasonal peak, MODIS vs SNPP plot |
| 3 | `python scripts/03_prepare_boundaries.py --download` (or `--input file`) | the seven preset wilayas, area check, preview map |
| 5 | `python scripts/04_aggregate_and_fit.py` | monthly aggregation, ratios, validation, harmonized CSV |
| 6 | `python scripts/06_publish_hf.py --repo-id USER/NAME` | dataset card + upload (private first) |

Outputs: `data/processed/monthly_harmonized.csv` (the app input), `monthly_regional.csv`,
`outputs/ratios.json`, `outputs/validation.json`, `outputs/validation_summary.csv`.

## First-run checklist (the scripts were tested only on synthetic data)
1. Step 1: open one downloaded archive CSV and compare a few rows with the FIRMS download page.
2. Step 2: read every `WARN` line. The summer peak, a plausible SNPP/MODIS ratio (the literature says roughly 3 to 25 times) and a NOAA-20 start near 2018-04 should all be there.
3. Step 3: open `outputs/boundaries_preview.html` and confirm the outlines, and read the license printed for the boundary file.
4. Step 5: look at `validation_summary.csv` before trusting any ratio. The sample-size fallbacks are listed in `ratios.json` (`level` column).
5. Known unknowns to verify on real data: whether area-API standard-processing NOAA-20 files carry a `type` column (the code handles both), the exact format of the availability and key-status endpoints (the code degrades gracefully), and the correct SP/NRT split date.

## Design notes
- Series: MODIS (Terra+Aqua) before 2012, VIIRS-SNPP 2012 to March 2018, NOAA-20 scaled to SNPP from April 2018. NOAA-21 is excluded (PRD decision D2).
- Zero-detection months are kept as zeros, not dropped.
- `complete = False` marks partial months. Do not use them for medians or percentiles.
- Parameters live in `config.py` (bbox, presets, overlap years, minimum detections for a ratio).

## Acknowledgement (required)
We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) (https://earthdata.nasa.gov/firms), part of NASA's Land, Atmosphere Near real-time Capability for Earth observations (LANCE) (https://earthdata.nasa.gov/lance) and NASA's Earth Science Data and Information System (ESDIS).
