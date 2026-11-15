"""Download raw FIRMS archives and area-API windows."""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path
import requests

from firmsync import config as cfg

HOST = "https://firms.modaps.eosdis.nasa.gov"
ARCHIVE_BASE = f"{HOST}/data/country"
API_BASE = f"{HOST}/api"
MAX_DAYS = 5
UA = {"User-Agent": "firmsync-hackathon/0.1 (NASA Space Apps 2026)"}


def redact(text: str, key: str | None) -> str:
    return text.replace(key, "<MAP_KEY>") if key else text


def get(session: requests.Session, url: str, *, key: str | None = None, stream=False,
        tries: int = 4, timeout=(10, 120)) -> requests.Response:
    """GET with retries; honours 429/503 by waiting."""
    last = None
    for attempt in range(1, tries + 1):
        try:
            r = session.get(url, stream=stream, timeout=timeout)
            if r.status_code in (429, 503):
                wait = 60 * attempt
                print(f"   server busy ({r.status_code}); waiting {wait}s", flush=True)
                time.sleep(wait)
                continue
            return r
        except requests.RequestException as exc:
            last = redact(str(exc), key)
            time.sleep(3 * attempt)
    raise RuntimeError(f"giving up on {redact(url, key)}: {last}")


def download_archive(session, slug: str, year: int, country: str, out_dir: Path) -> str:
    name = f"{slug}_{year}_{country}.csv"
    dest = out_dir / name
    # Path confinement guard
    if not dest.resolve().is_relative_to(out_dir.resolve()):
        raise ValueError(f"Path traversal detected: {name}")
    if dest.exists() and dest.stat().st_size > 0:
        return "cached"
    url = f"{ARCHIVE_BASE}/{slug}/{year}/{name}"
    r = get(session, url, stream=True)
    if r.status_code == 404:
        return "not published"
    if r.status_code != 200:
        return f"HTTP {r.status_code}"
    part = dest.with_suffix(".part")
    first = True
    with open(part, "wb") as fh:
        for chunk in r.iter_content(chunk_size=1 << 20):
            if first:
                first = False
                if b"latitude" not in chunk[:600]:
                    part.unlink(missing_ok=True)
                    return f"unexpected content: {chunk[:80]!r}"
            fh.write(chunk)
    part.replace(dest)
    return "downloaded"


def run_archives(session, args) -> dict:
    out_dir = cfg.DATA_RAW / "archive"
    out_dir.mkdir(parents=True, exist_ok=True)
    summary = {}
    for slug, first_year in cfg.ARCHIVE_PRODUCTS.items():
        for year in range(first_year, args.until_year + 1):
            status = download_archive(session, slug, year, args.country, out_dir)
            summary[f"{slug}_{year}"] = status
            print(f"[archive] {slug} {year}: {status}", flush=True)
    return summary


def get_availability(session, key: str) -> dict[str, tuple[date, date]]:
    """{SOURCE: (min_date, max_date)} from the data_availability endpoint."""
    try:
        r = get(session, f"{API_BASE}/data_availability/csv/{key}/ALL", key=key, tries=2)
        if r.status_code != 200:
            return {}
        out = {}
        for row in csv.DictReader(io.StringIO(r.text)):
            try:
                out[row["data_id"]] = (date.fromisoformat(row["min_date"]),
                                       date.fromisoformat(row["max_date"]))
            except (KeyError, ValueError):
                continue
        return out
    except Exception as exc:
        print(f"   (availability lookup failed: {redact(str(exc), key)})")
        return {}


def mapkey_status(session, key: str):
    """(used, limit) from the mapkey_status page, or None if unknown."""
    try:
        r = get(session, f"{HOST}/mapserver/mapkey_status/?MAP_KEY={key}", key=key, tries=2)
        data = r.json()
        used = next((v for k, v in data.items() if "current" in k.lower() or "used" in k.lower()), None)
        limit = next((v for k, v in data.items() if "limit" in k.lower()), None)
        return (float(used), float(limit)) if used is not None and limit else None
    except Exception:
        return None


class Budget:
    """Keep under the 5,000 transactions / 10 minutes allowance."""
    def __init__(self, session, key, every=20, threshold=0.7):
        self.session, self.key, self.every, self.threshold = session, key, every, threshold
        self.n = 0
        self.warned = False

    def tick(self):
        self.n += 1
        if self.n % self.every:
            return
        st = mapkey_status(self.session, self.key)
        if st is None:
            if not self.warned:
                print("   (mapkey status unreadable; relying on server back-off)")
                self.warned = True
            return
        used, limit = st
        if used / limit >= self.threshold:
            print(f"   budget {used:.0f}/{limit:.0f}; pausing for the 10-minute window to clear", flush=True)
            for _ in range(24):
                time.sleep(30)
                st = mapkey_status(self.session, self.key)
                if st is None or st[0] / st[1] < 0.4:
                    break


def windows(start: date, end: date) -> list[tuple[date, int]]:
    out, day = [], start
    while day <= end:
        days = min(MAX_DAYS, (end - day).days + 1)
        out.append((day, days))
        day += timedelta(days=days)
    return out


def build_plan(args, avail) -> list[tuple[str, date, int]]:
    today = date.today()
    archive_end = date(args.until_year, 12, 31)
    plan: list[tuple[str, date, int]] = []

    def sp_max_for(sp_source: str) -> date:
        if sp_source in avail:
            return avail[sp_source][1]
        return today - timedelta(days=args.sp_lag_days)

    families = [
        ("MODIS", archive_end + timedelta(days=1), today),
        ("VIIRS_SNPP", archive_end + timedelta(days=1), min(today, cfg.SNPP_END)),
        ("VIIRS_NOAA20", cfg.NOAA20_START, today),
    ]
    for fam, start, end in families:
        if end < start:
            continue
        sp, nrt = f"{fam}_SP", f"{fam}_NRT"
        sp_max = min(sp_max_for(sp), end)
        if sp_max >= start:
            plan += [(sp, d, n) for d, n in windows(start, sp_max)]
            nrt_start = sp_max + timedelta(days=1)
        else:
            nrt_start = start
        if nrt_start <= end:
            plan += [(nrt, d, n) for d, n in windows(nrt_start, end)]
    return plan


def fetch_window(session, key, source, bbox, start: date, days: int, dest: Path, *, cache_empty: bool) -> str:
    if dest.exists():
        return "cached"
    area = ",".join(f"{c:g}" for c in bbox)
    url = f"{API_BASE}/area/csv/{key}/{source}/{area}/{days}/{start.isoformat()}"
    for attempt in range(3):
        r = get(session, url, key=key)
        text = r.text
        low = text.lower()
        if r.status_code == 200 and (text.startswith(("country_id", "latitude")) or text.strip() == ""):
            break
        if "transaction" in low or "exceed" in low or "limit" in low:
            print("   transaction limit hit; waiting 120s", flush=True)
            time.sleep(120)
            continue
        raise RuntimeError(f"{source} {start}: HTTP {r.status_code}: {redact(text[:150], key)}")
    else:
        raise RuntimeError(f"{source} {start}: repeated transaction-limit errors")
    has_rows = text.count("\n") > 1
    if not has_rows and not cache_empty:
        return "empty (not cached)"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding="utf-8")
    return "downloaded" if has_rows else "downloaded (no detections)"


def run_area(session, args, key) -> dict:
    avail = get_availability(session, key)
    plan = build_plan(args, avail)
    print(f"[area] {len(plan)} windows planned for bbox {args.bbox}")
    if args.dry_run:
        by = {}
        for s, _, _ in plan:
            by[s] = by.get(s, 0) + 1
        return {"planned": by}
    budget = Budget(session, key)
    counts: dict[str, int] = {}
    failed = []
    consecutive = 0
    for i, (source, start, days) in enumerate(plan, 1):
        dest = cfg.DATA_RAW / "area" / source / f"{start.isoformat()}_{days}.csv"
        cache_empty = source.endswith("_NRT") or (date.today() - start).days > args.sp_lag_days + 30
        try:
            status = fetch_window(session, key, source, args.bbox, start, days, dest, cache_empty=cache_empty)
        except Exception as exc:
            status = "FAILED"
            failed.append(f"{source} {start}: {exc}")
        counts[status] = counts.get(status, 0) + 1
        consecutive = consecutive + 1 if status == "FAILED" else 0
        if consecutive >= 3:
            print("[area] 3 failures in a row, stopping.")
            break
        if status not in ("cached",):
            budget.tick()
            time.sleep(0.15)
        if i % 25 == 0 or status == "FAILED":
            print(f"[area] {i}/{len(plan)} {source} {start} -> {status}", flush=True)
    return {"counts": counts, "failed": failed}


def download_all_archives(args=None) -> int:
    if args is None:
        ap = argparse.ArgumentParser(description=__doc__)
        ap.add_argument("--country", default=cfg.COUNTRY)
        ap.add_argument("--until-year", type=int, default=date.today().year - 1)
        ap.add_argument("--bbox", type=float, nargs=4, default=list(cfg.PRESET_BBOX))
        ap.add_argument("--sp-lag-days", type=int, default=180)
        ap.add_argument("--archives-only", action="store_true")
        ap.add_argument("--area-only", action="store_true")
        ap.add_argument("--dry-run", action="store_true")
        args = ap.parse_args()
        args.bbox = tuple(args.bbox)

    session = requests.Session()
    session.headers.update(UA)
    log: dict = {"started": time.strftime("%Y-%m-%dT%H:%M:%S"), "args": {k: str(v) for k, v in vars(args).items()}}

    if not args.area_only and not args.dry_run:
        log["archives"] = run_archives(session, args)

    if not args.archives_only:
        key = cfg.FIRMS_MAP_KEY
        if not key:
            print("FIRMS_MAP_KEY is not set. Export it or set in .env.", file=sys.stderr)
            return 2
        log["area"] = run_area(session, args, key)

    if not args.dry_run:
        cfg.DATA_RAW.mkdir(parents=True, exist_ok=True)
        (cfg.DATA_RAW / "download_log.json").write_text(json.dumps(log, indent=2, default=str))
    return 0


def main():
    return download_all_archives()


if __name__ == "__main__":
    raise SystemExit(main())
