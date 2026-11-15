#!/usr/bin/env python3
"""Thin wrapper delegating to firmsync.ingestion.sanity."""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from firmsync.ingestion.sanity import main

if __name__ == "__main__":
    raise SystemExit(main())
