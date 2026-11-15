"""Backward-compatible wrapper re-exporting core functions from firmsync.core."""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from firmsync.core import *  # noqa: F401, F403
