# FIRMSync — Project Requirements Document

*NASA Space Apps Challenge 2026 · Challenge: Harmonization of MODIS and VIIRS Hot Spots · Team FIRMSync (solo builder) · Version 0.1 · 14 November 2026*

## 1. Summary

**One-line pitch.** A harmonized MODIS–VIIRS fire calendar for northern Algeria that tells a fire-service officer, in one plain sentence per region, whether this month's burning is below, near or above the long-term norm.

**What gets built in 48 hours.** (1) A reproducible data pipeline that turns NASA FIRMS hotspot records into a single consistent monthly series per region, (2) a static web app with a calendar heatmap, a “this month versus historical median” status view and CSV export, and (3) a public Hugging Face dataset with a method note. A small next-month forecast is a stretch item and is the first thing cut if time runs short.

## 2. Context and problem

- The challenge asks for a web application that harmonizes MODIS and VIIRS active-fire hotspots into a burning-activity calendar, so that the sensor of origin stops mattering and patterns, trends and anomalies become the focus.
- The two records are not directly comparable because the sensors differ in resolution, sensitivity and observation schedule. VIIRS 375 m detects roughly 3 to 25 times more fire pixels than MODIS depending on region and time of day, and MODIS misses many small fires in low-biomass land such as crops and grass.
- Timing matters. FIRMS stopped producing new Suomi NPP VIIRS data on 2 November 2026 and recommends NOAA-20 and NOAA-21 as replacements. MODIS Terra is planned to end data collection around January 2027 and Aqua around September 2027.
- Regional stakes. Algeria is described in the literature as the main fire hotspot on the southern rim of the Mediterranean, with fire concentrated in a narrow northern coastal strip. In late August 2026, wildfires in Jijel, Béjaïa and Tizi Ouzou killed at least 12 people.

## 3. Goals, non-goals and success criteria

### 3.1 Goals (all three matter)

- **G1. Strong local result** at the Boumerdès local event.
- **G2. Global Nominee** consideration.
- **G3. Reusable open asset:** a harmonized regional dataset on Hugging Face (Kaggle mirror optional) with a method note.

### 3.2 Non-goals

- Per-fire tracking, fire perimeters, or burned-area mapping.
- Real-time alerting or operational use by civil protection. The app is a decision aid, not an official warning system.
- Coverage outside the defined study area in version 1.
- Using NOAA-21 data in the harmonized series (see Decision D2).

### 3.3 Failure ranking (from most tolerable to least tolerable)

1. Science criticized by a judge.
2. Demo breaks live.
3. App looks generic.
4. Submission incomplete (**the outcome to avoid above all others**).

This ranking drives every cut rule in section 12.

### 3.4 Measurable success criteria

- **S1.** The project page is submitted before the deadline with all required fields, a public demo link and a public code link.
- **S2.** The harmonized monthly regional CSV exists and is published on Hugging Face by the end of day 1.
- **S3.** A leave-one-year-out validation number for every ratio is published in the dataset and shown on the app's first screen or about panel.
- **S4.** A person who has never seen the app can read the status for Béjaïa in under 10 seconds on a phone.
- **S5.** The demo works with no network call to any external API.

## 4. Users and jobs to be done

- **Civil-protection or regional emergency officer.** Needs to know quickly whether the current month is unusual for a wilaya, and to compare it with past years. Works on a phone, often under stress. Needs a plain-language answer, not a statistic.
- **Forest-service planner.** Needs to see which months and years carry the most fire activity for a region, to plan resources and monitoring.
- **Scientist or analyst.** Needs the harmonized series, the method, the uncertainty and a clean CSV to reuse.

One headline screen serves all three. The status sentence is for the officer, the calendar for the planner, and the CSV plus method note for the scientist.

## 5. Scope

### 5.1 P0 — must ship

- Data pipeline from FIRMS to a harmonized monthly regional table.
- Calendar heatmap (months by years) for a selected region, counts as the default metric with a toggle for fire radiative power (FRP).
- “This month versus historical median” status with a plain-language label and sentence.
- CSV export for the selected region and date range.
- Region presets (wilayas), mobile-readable layout, accessible color ramp.
- Validation figure and limitations text.
- Hugging Face dataset with method note.
- 30-second demo video, public repository, completed project page.

### 5.2 P1 — ship if P0 is done and verified

- Free polygon drawing and latitude/longitude input for a custom area, computed from a gridded monthly layer.
- Anomaly view as a month-by-year percentile heatmap.
- Kaggle mirror of the dataset.

### 5.3 P2 — stretch, cut first

- Next-month anomaly-class forecast per region, shown only with its skill score against baselines.

### 5.4 Explicitly deferred (documented as future work)

- Burned-area estimation from hotspot counts (requires biome-specific coefficients with a citable source).
- NOAA-21 integration.
- Extension to Tunisia, Morocco and the wider Mediterranean basin.
- Fire-type separation (wildfire versus agricultural burning).

## 6. Functional requirements

- **FR-1 Region selection.** The user picks a region from a preset list. P0 presets: Béjaïa, Tizi Ouzou, Jijel, Bouira, Skikda, Boumerdès and Algiers. The list is easily extended.
- **FR-2 Calendar heatmap.** For the selected region, show one cell per month per year from 2003 to the latest complete month. Cell color encodes the metric on a sequential, colorblind-safe ramp with a legend. Hovering or tapping a cell shows the value in harmonized units.
- **FR-3 Metric toggle.** Switch between hotspot count and summed FRP. Each has its own harmonization ratio.
- **FR-4 Status view.** For the latest complete month (or a chosen month), show one of four labels: Low, Normal, High, Extreme, based on the percentile of that month against the same calendar month in the baseline period. Show a sentence such as “Activity is higher than X% of past Augusts.” Show the z-score or percentile only in a tooltip.
- **FR-5 Date range.** The user can restrict the displayed years.
- **FR-6 CSV export.** One-click download of the selected region and range with the columns in section 7.4, including the raw and harmonized values.
- **FR-7 About and method panel.** Plain-language explanation of what “harmonized” means here, the validation figure, the limitations and the data acknowledgement.
- **FR-8 Data freshness label.** Show the date of the last data update and the series used for recent months.

## 7. Data requirements

### 7.1 Sources and series

- **MODIS (Terra and Aqua), Collection 6.1.** Long record from 2000 (Aqua from 2002). Used for 2003 onward and as the pre-VIIRS history.
- **VIIRS Suomi NPP, 375 m.** From 2012. Used for 2012 to 2018, and as the calibration reference.
- **VIIRS NOAA-20, 375 m.** From April 2018. Continues the VIIRS series after the Suomi NPP shutdown.
- **VIIRS NOAA-21.** Available from January 2024 but excluded (Decision D2).
- All data comes from NASA FIRMS. Standard-processing data is preferred for completed months, near-real-time data only for the most recent months, and the label must say which was used.

### 7.2 Study area and regions

- **Study area (proposal, fix on day 1):** a bounding box over northern Algeria, roughly 3°W to 10°E and 33°N to 38°N, to be tightened once the hotspot density is checked.
- **Regions:** wilayas. Algeria moved from 58 to 69 wilayas in November 2025 and most open boundary datasets still hold 58. The eleven new wilayas are in the Hautes Plaines and the south, with El Aricha the only northern one, so the Tell and coastal presets are not affected. Use the 58-wilaya boundaries and document this choice.
- Hotspots are assigned to a region by point-in-polygon.

### 7.3 Filtering

- Keep vegetation-fire detections only and remove static sources such as industrial flares and gas facilities.
- Remove duplicate detections in overlapping scan lines where the data allows it.
- Record every filter and its count in the method note.

### 7.4 Output tables

**monthly\_regional.csv**, one row per region, month and series:

- region\_id, region\_name
- year, month
- series (modis, viirs\_snpp, viirs\_noaa20)
- count\_raw, count\_viirs\_eq
- frp\_sum\_raw\_mw, frp\_sum\_viirs\_eq\_mw
- flag\_nrt (true when the month uses near-real-time data)

**ratios.json**, the fitted MODIS-to-VIIRS and NOAA-20-to-Suomi-NPP ratios per region and season, with their sample sizes.

**validation.json**, the leave-one-year-out errors for every ratio.

### 7.5 Required acknowledgement

The app and dataset README must carry the FIRMS acknowledgement: “We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) (https://earthdata.nasa.gov/firms), part of NASA's Land, Atmosphere Near real-time Capability for Earth observations (LANCE) (https://earthdata.nasa.gov/lance) and NASA's Earth Science Data and Information System (ESDIS).”

## 8. Harmonization method

### 8.1 Principle

A hotspot count is the number of pixels that crossed a detection threshold at overpass time. It is not a count of fires. Harmonization here means estimating a transfer between sensors at monthly regional scale, not merging raw tables.

### 8.2 Steps

1. Aggregate to monthly counts and monthly summed FRP per region and series.
2. Fit a MODIS-to-VIIRS ratio per region and per season, pooled across the 2012–2024 overlap, so that each ratio rests on hundreds of detections rather than a dozen.
3. Fit a NOAA-20-to-Suomi-NPP ratio on the 2018–2026 overlap so the VIIRS line continues smoothly after the Suomi NPP shutdown.
4. Express the whole history in VIIRS-equivalent units. Counts and FRP use separate ratios.
5. Baseline period for the median and percentiles: 2003 to 2025, the first complete year with both MODIS satellites through the last complete year. This is a parameter, not a fixed rule.

### 8.3 Validation (acceptance criteria)

- Leave-one-year-out: for each year in the overlap, refit without it and compare predicted to observed monthly regional values. Publish the errors per region.
- No accuracy claim is made until the number exists. A target threshold is set after the first computation, and the app shows the measured error whatever it is.
- The limitations text states plainly: monthly regional scale only, not per-fire, not burned area, and ratios may not be stable before 2012 or after orbit changes.

## 9. Forecast specification (P2)

- One small gradient-boosted classifier predicting next month's anomaly class per region from lagged anomalies and monthly temperature and precipitation reanalysis values.
- Always report skill against two baselines, climatology and persistence, with time-ordered cross-validation.
- If it does not beat both baselines, the app shows the baseline and labels the model experimental.
- Pre-computed as a static file. It must not be able to break the build. It runs on CPU; the Kaggle T4 is optional.

## 10. Non-functional requirements

- **Static delivery.** All data is pre-computed and served as static JSON and CSV. No API call at demo time.
- **Performance.** First meaningful view in under 3 seconds on a mid-range phone on a mobile connection. Keep the per-region data files small enough to load on demand.
- **Accessibility.** Colorblind-safe sequential ramp, text labels in addition to color, keyboard-operable controls, sufficient contrast.
- **Mobile first.** The status view must be readable on a phone without scrolling horizontally.
- **Language.** English interface for judging. Optional French labels are a nice-to-have and not required.
- **Reproducibility.** The pipeline is a set of documented scripts or notebooks that rebuild every output from raw downloads.
- **Licensing.** Code under an open license. Dataset license to be confirmed (Decision D5).

## 11. Architecture

- **Pipeline (Python, Kaggle or local).** Download from FIRMS, filter, assign regions, aggregate, fit ratios, validate, export CSV and JSON.
- **Storage.** Output files committed to the repository and mirrored to Hugging Face.
- **Frontend.** React with a free, tokenless map library (MapLibre or Leaflet) and a lightweight chart layer. Hosted on a free static host.
- **No backend at demo time.**

## 12. Plan, checkpoints and cut rules (48 hours)

- **Day 1, hours 0–8.** Obtain the FIRMS MAP\_KEY, download data, filter, assign regions, aggregate to monthly and save to the repository.
- **Day 1, hours 8–16.** Fit ratios, run leave-one-year-out validation, produce the harmonized monthly table. **Checkpoint 1: the CSV and the validation numbers exist.**
- **Day 1, evening.** Publish the first dataset version to Hugging Face with a draft method note.
- **Day 2, hours 0–10.** Build the app: presets, heatmap, status view, CSV, about panel.
- **Day 2, hours 10–14.** **Checkpoint 2: P0 works end to end on a phone.** Then, only if Checkpoint 2 is met, start P1 and P2.
- **Day 2, final hours.** Record the 30-second English demo, finish the project page, verify all links are public, and submit well before the deadline.

**Cut rules, in order:** forecast first, then polygon drawing, then the anomaly percentile heatmap, then the FRP toggle. Never cut the validation figure, the limitations text or the submission itself.

## 13. Deliverables and submission checklist

- Project page with all required fields completed in English.
- Public demo link. The demo video pitch must be 30 seconds or less, in English or with English subtitles, hosted on an external site with a public link.
- Public code repository with README and rebuild instructions.
- Hugging Face dataset with method note, ratios and validation files.
- Clear statement of which NASA data was used (FIRMS MODIS and VIIRS) and the required acknowledgement.
- Judging criteria to design for: Impact, Creativity, Validity, Relevance and Presentation. The retrieved guide is the 2025 edition, so re-check the 2026 guide for changes.

## 14. Risks and mitigations

- **Incomplete submission.** Mitigation: Checkpoints 1 and 2, early dataset publication, strict cut rules.
- **Ratios are noisy or unstable.** Mitigation: pool by region and season, publish validation errors honestly, show uncertainty in the about panel.
- **Mixing satellites creates false jumps.** Mitigation: single continuous VIIRS series (Suomi NPP then NOAA-20), NOAA-21 excluded and documented.
- **FIRMS download limits or outages.** Mitigation: download once on day 1, commit raw-derived files, respect the 5,000 transactions per 10 minutes limit.
- **Demo failure.** Mitigation: static files only and a pre-recorded video as fallback.
- **Misread as an official warning.** Mitigation: a visible disclaimer that the app is an analytical aid based on satellite hotspots, which can miss small or cloud-covered fires.
- **Generic look.** Mitigation: one clear idea, plain-language status, regional story and presets.

## 15. Decisions log, assumptions and open items

### Decisions already taken

- **D0.** Scope is limited to three user-facing features: calendar heatmap, status versus historical median, CSV export.
- **D1.** Harmonization uses a simple, explainable ratio method with leave-one-year-out validation, not a complex model.
- **D2.** The VIIRS series is Suomi NPP for 2012–2018 and NOAA-20 from April 2018; NOAA-21 is excluded in version 1. *(Assumed; to confirm.)*
- **D3.** Regions are wilayas using the 58-wilaya boundaries. *(Assumed; to confirm.)*
- **D4.** Burned-area estimation is deferred to future work; counts are primary and FRP is a secondary layer. *(Assumed; to confirm, because burned area was requested earlier.)*
- **D5.** Dataset published on Hugging Face under an open license such as CC BY 4.0, with the FIRMS acknowledgement. *(Assumed; to confirm.)*

### Open items

- Exact 2026 submission closing time for the Boumerdès local event.
- Final study-area bounding box after checking hotspot density.
- Hugging Face repository name.
- Whether French labels are wanted in version 1.

## 16. Sources

- NASA Earthdata, Transitioning from Suomi NPP VIIRS: https://www.earthdata.nasa.gov/news/blog/transitioning-from-s-npp-viirs-omps-what-nasa-firms-users-need-know
- ARSET advanced FIRMS Q&A (NOAA-20 and NOAA-21 start dates): https://www.earthdata.nasa.gov/s3fs-public/2026-01/arset-2026-advfirms-part1-qa.pdf
- CAMS on MODIS retirement: https://atmosphere.copernicus.eu/drifting-away-modis-cams-global-fire-assimilation-system
- ESSD preprint on VIIRS versus MODIS detection: https://essd.copernicus.org/preprints/essd-2026-387/essd-2026-387.pdf
- NASA MODIS archive on MODIS omissions: https://modarch.gsfc.nasa.gov/sci\_team/pubs/abstract\_new.php?id=38581
- FIRMS API limits (Q&A): https://appliedsciences.nasa.gov/sites/default/files/2025-05/Part%203%20FIRMS%202025%20Q&A%20Session.docx.pdf
- Algeria as a Mediterranean fire hotspot: https://mdpi.com/2072-4292/16/13/2500 and https://mdpi.com/2571-6255/3/4/58
- August 2026 Algeria wildfires: https://www.aljazeera.com/news/2026/8/27/at-least-12-dead-54-injured-as-wildfires-ravage-northeastern-algeria
- Algeria's 69 wilayas: https://en.wikipedia.org/wiki/Provinces\_of\_Algeria and https://www.tsa-algerie.com/algerie-onze-nouvelles-wilayas-creees-voici-la-liste/
- Space Apps project submission guide: https://www.spaceappschallenge.org/resources/project-submission-guide
- Space Apps judging and awards guide: https://spaceappschallenge.org/resources/judging-awards-guide
- Space Apps participant FAQs: https://www.spaceappschallenge.org/resources/participant-faqs/
