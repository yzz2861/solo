from __future__ import annotations

from pathlib import Path
from typing import Dict, List

from license_audit.models import AuditReport

from license_audit.reporting.dev import generate_dev_csv, generate_dev_json, generate_dev_report
from license_audit.reporting.legal import (
    generate_legal_json,
    generate_legal_report,
    generate_legal_risk_summary,
)


def generate_all_reports(report: AuditReport, output_dir: Path) -> Dict[str, List[Path]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    dev_paths = [
        generate_dev_report(report, output_dir),
        generate_dev_json(report, output_dir),
        generate_dev_csv(report, output_dir),
    ]
    legal_paths = [
        generate_legal_report(report, output_dir),
        generate_legal_json(report, output_dir),
        generate_legal_risk_summary(report, output_dir),
    ]
    return {"dev": dev_paths, "legal": legal_paths}


__all__ = [
    "generate_all_reports",
    "generate_dev_report",
    "generate_dev_json",
    "generate_dev_csv",
    "generate_legal_report",
    "generate_legal_json",
    "generate_legal_risk_summary",
]
