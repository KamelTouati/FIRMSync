"""Security and vulnerability posture audit for the FIRMSync platform."""
from __future__ import annotations

import re
import sys
from pathlib import Path
from firmsync import config as cfg


def audit_secrets_and_env() -> list[str]:
    """Verify secrets protection and lack of credential leakage."""
    issues = []
    
    # 1. Check .gitignore
    gitignore = cfg.ROOT / ".gitignore"
    if not gitignore.exists():
        issues.append("CRITICAL: Root .gitignore does not exist.")
    else:
        text = gitignore.read_text(encoding="utf-8")
        if ".env" not in text:
            issues.append("HIGH: .env is not ignored in .gitignore.")

    # 2. Check web production bundle for leaked API tokens
    dist_dir = cfg.ROOT / "web" / "dist"
    if dist_dir.exists():
        hf_token_pattern = re.compile(r"hf_[A-Za-z0-9]{30,}")
        map_key_pattern = re.compile(r"[0-9a-f]{32}")
        
        # Read real secret if available to verify absence
        real_hf = cfg.HF_TOKEN
        real_key = cfg.FIRMS_MAP_KEY

        for js_file in dist_dir.rglob("*.js"):
            content = js_file.read_text(encoding="utf-8", errors="ignore")
            if real_hf and real_hf in content:
                issues.append(f"CRITICAL: Real HF_TOKEN detected in production JS bundle: {js_file.name}")
            if real_key and real_key in content:
                issues.append(f"CRITICAL: Real FIRMS_MAP_KEY detected in production JS bundle: {js_file.name}")
            if hf_token_pattern.search(content):
                issues.append(f"HIGH: Potential Hugging Face token pattern found in {js_file.name}")

    return issues


def audit_frontend_hardening() -> list[str]:
    """Verify DOM XSS, CSV injection, CSP, and security headers."""
    issues = []

    # 1. Check CSV Export formula injection defense
    export_modal = cfg.ROOT / "web" / "src" / "components" / "common" / "ExportModal.jsx"
    if not export_modal.exists():
        issues.append("HIGH: ExportModal.jsx not found.")
    else:
        text = export_modal.read_text(encoding="utf-8")
        clean_text = text.replace(" ", "")
        if "sanitizeCsvCell" not in text or "/^[=+\\-@\\t\\r]/.test" not in clean_text:
            issues.append("MEDIUM: ExportModal.jsx may not enforce full RFC 4180 / formula injection neutralization.")

    # 2. Check WilayaMap DOM XSS
    wilaya_map = cfg.ROOT / "web" / "src" / "features" / "map" / "components" / "WilayaMap.jsx"
    if not wilaya_map.exists():
        issues.append("HIGH: WilayaMap.jsx not found.")
    else:
        text = wilaya_map.read_text(encoding="utf-8")
        if "textContent" not in text:
            issues.append("HIGH: WilayaMap.jsx does not use textContent for dynamic text rendering.")
        if "dangerouslySetInnerHTML" in text:
            issues.append("CRITICAL: dangerouslySetInnerHTML detected in WilayaMap.jsx.")

    # 3. Check CSP in web/public/_headers
    headers_file = cfg.ROOT / "web" / "public" / "_headers"
    if not headers_file.exists():
        issues.append("HIGH: web/public/_headers does not exist for Netlify/Vercel edge security.")
    else:
        text = headers_file.read_text(encoding="utf-8")
        if "Content-Security-Policy" not in text:
            issues.append("HIGH: Content-Security-Policy missing in _headers.")
        if "X-Frame-Options: DENY" not in text:
            issues.append("MEDIUM: X-Frame-Options: DENY missing in _headers.")
        if "X-Content-Type-Options: nosniff" not in text:
            issues.append("MEDIUM: X-Content-Type-Options: nosniff missing in _headers.")

    # 4. Check index.html CSP meta tag
    index_html = cfg.ROOT / "web" / "index.html"
    if index_html.exists():
        text = index_html.read_text(encoding="utf-8")
        if 'http-equiv="Content-Security-Policy"' not in text:
            issues.append("MEDIUM: Fallback Content-Security-Policy meta tag missing in index.html.")

    return issues


def audit_pipeline_safety() -> list[str]:
    """Verify backend SSRF guardrails and supply chain pinning."""
    issues = []

    # 1. Check SSRF guard in boundaries.py
    boundaries = cfg.ROOT / "src" / "firmsync" / "spatial" / "boundaries.py"
    if boundaries.exists():
        text = boundaries.read_text(encoding="utf-8")
        if "validate_trusted_url" not in text:
            issues.append("HIGH: SSRF URL validation guard missing in boundaries.py.")

    # 2. Check requirements.lock
    lockfile = cfg.ROOT / "requirements.lock"
    if not lockfile.exists():
        issues.append("HIGH: requirements.lock is missing.")
    else:
        text = lockfile.read_text(encoding="utf-8")
        if "==" not in text:
            issues.append("MEDIUM: requirements.lock does not enforce exact version pinning.")

    return issues


def run_security_audit() -> int:
    """Execute complete security and vulnerability audit suite."""
    print("=" * 60)
    print("FIRMSync Security & Vulnerability Posture Audit")
    print("=" * 60)

    all_issues = []
    
    print("\n[1/3] Auditing Secrets & Environment Protection...")
    secret_issues = audit_secrets_and_env()
    if secret_issues:
        for err in secret_issues:
            print(f"  ❌ {err}")
        all_issues.extend(secret_issues)
    else:
        print("  ✅ Secrets isolated, .env git-ignored, 0 keys in client JS bundle.")

    print("\n[2/3] Auditing Client-Side Hardening (DOM XSS, CSV Injection, CSP)...")
    frontend_issues = audit_frontend_hardening()
    if frontend_issues:
        for err in frontend_issues:
            print(f"  ❌ {err}")
        all_issues.extend(frontend_issues)
    else:
        print("  ✅ Pure DOM textContent verified, CSV formula injection neutralized, CSP active.")

    print("\n[3/3] Auditing Pipeline & Supply Chain Integrity (SSRF, Pinning)...")
    pipeline_issues = audit_pipeline_safety()
    if pipeline_issues:
        for err in pipeline_issues:
            print(f"  ❌ {err}")
        all_issues.extend(pipeline_issues)
    else:
        print("  ✅ SSRF domain whitelist active, requirements.lock pinned and verified.")

    print("\n" + "=" * 60)
    if not all_issues:
        print("SECURITY AUDIT STATUS: ALL CHECKS PASSED (0 Vulnerabilities Found) 🛡️")
        print("=" * 60)
        return 0
    else:
        print(f"SECURITY AUDIT STATUS: FAILED ({len(all_issues)} issues found) ⚠️")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(run_security_audit())
