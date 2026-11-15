#!/usr/bin/env python3
"""Run automated security and vulnerability posture audit for FIRMSync."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from firmsync.audit.security_audit import run_security_audit

if __name__ == "__main__":
    sys.exit(run_security_audit())
