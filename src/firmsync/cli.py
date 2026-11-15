"""Unified Command-Line Interface for the FIRMSync platform."""
from __future__ import annotations

import argparse
import sys

from firmsync.ingestion.archives import download_all_archives
from firmsync.ingestion.sanity import run_sanity_checks
from firmsync.spatial.boundaries import prepare_boundaries
from firmsync.harmonization.fitting import run_harmonization
from firmsync.harmonization.export import export_frontend_bundle
from firmsync.harmonization.publish import publish_to_huggingface
from firmsync.models.forecasting import train_and_export_forecasts
from firmsync.audit.run_audit import run_pipeline_audit
from firmsync.audit.feature_audit import run_feature_audit
from firmsync.audit.security_audit import run_security_audit


def main():
    parser = argparse.ArgumentParser(
        prog="firmsync",
        description="FIRMSync - Calibrated 25-Year Satellite Fire Intelligence Platform (NASA Space Apps 2026)"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # Ingest
    sub_ingest = subparsers.add_parser("ingest", help="Download raw FIRMS satellite archives")
    sub_ingest.add_argument("--dry-run", action="store_true")
    sub_ingest.add_argument("--archives-only", action="store_true")

    # Sanity
    subparsers.add_parser("sanity", help="Run sanity checks on raw data")

    # Boundaries
    sub_bound = subparsers.add_parser("boundaries", help="Prepare regional Wilaya GeoJSON boundaries")
    sub_bound.add_argument("--download", action="store_true")

    # Harmonize
    subparsers.add_parser("harmonize", help="Fit multi-sensor transfer ratios and validate via LOOCV")

    # Export
    subparsers.add_parser("export", help="Compile and export static frontend dataset bundle")

    # Forecast
    subparsers.add_parser("forecast", help="Train autoregressive hazard model and compute burned footprint")

    # Audit
    subparsers.add_parser("audit", help="Run full pipeline & feature quality control audit")

    # Publish
    sub_pub = subparsers.add_parser("publish", help="Publish harmonized tables to Hugging Face")
    sub_pub.add_argument("--repo-id", required=True)
    sub_pub.add_argument("--public", action="store_true")

    args = parser.parse_args()

    if args.command == "ingest":
        return download_all_archives(args)
    elif args.command == "sanity":
        return run_sanity_checks()
    elif args.command == "boundaries":
        return prepare_boundaries(download=args.download)
    elif args.command == "harmonize":
        return run_harmonization()
    elif args.command == "export":
        return export_frontend_bundle()
    elif args.command == "forecast":
        return train_and_export_forecasts()
    elif args.command == "audit":
        rc1 = run_pipeline_audit()
        print("\n--- Running Feature & Physics Audit ---")
        rc2 = run_feature_audit()
        print("\n--- Running Security & Vulnerability Audit ---")
        rc3 = run_security_audit()
        return rc1 if rc1 != 0 else (rc2 if rc2 != 0 else rc3)
    elif args.command == "publish":
        return publish_to_huggingface(repo_id=args.repo_id, is_public=args.public)
    else:
        parser.print_help()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
