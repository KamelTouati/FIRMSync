"""FIRMSync data ingestion subpackage."""
from __future__ import annotations

from firmsync.ingestion.archives import download_all_archives
from firmsync.ingestion.sanity import run_sanity_checks

__all__ = ["download_all_archives", "run_sanity_checks"]
