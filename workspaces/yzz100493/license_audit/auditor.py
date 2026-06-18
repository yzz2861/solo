from __future__ import annotations

import datetime as _dt
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set

from license_audit.artifact import detect_dev_in_prod, scan_artifacts
from license_audit.config import AppConfig
from license_audit.history import diff_against_baseline, load_baseline, save_snapshot
from license_audit.models import (
    AuditReport,
    LicenseCategory,
    MultiVersionInfo,
    Package,
    ScanResult,
)
from license_audit.parsers import detect_and_parse


def _collect_multi_version(packages: List[Package]) -> List[MultiVersionInfo]:
    grouped: Dict[str, Dict[str, Package]] = defaultdict(dict)
    for p in packages:
        key = f"{p.manager.value}:{p.name}"
        grouped[key][p.version] = p

    result: List[MultiVersionInfo] = []
    for key, ver_map in grouped.items():
        if len(ver_map) <= 1:
            continue
        manager_val, name = key.split(":", 1)
        versions = sorted(ver_map.keys())
        licenses: Set[str] = set()
        for p in ver_map.values():
            for lid in p.license.identifiers:
                licenses.add(lid)
        from .models import PackageManager
        mgr = PackageManager(manager_val)
        info = MultiVersionInfo(name=name, versions=versions, manager=mgr, licenses=licenses)
        result.append(info)
    return result


def _categorize(
    packages: List[Package],
    report: AuditReport,
) -> None:
    for pkg in packages:
        cat = pkg.license.category
        if not pkg.is_risk:
            report.approved.append(pkg)
        else:
            report.risks.append(pkg)
            if cat == LicenseCategory.MISSING:
                report.missing_license.append(pkg)
            elif cat in {LicenseCategory.RESTRICTED, LicenseCategory.DUAL_RESTRICTED}:
                report.restricted.append(pkg)
            else:
                report.uncertain.append(pkg)

            if pkg.license.is_dual:
                report.dual_licenses.append(pkg)

            if cat in {LicenseCategory.UNCERTAIN, LicenseCategory.DUAL_MIXED}:
                report.need_confirmation.append(pkg)


def run_audit(
    config: AppConfig,
    save_history: bool = True,
) -> AuditReport:
    scan: ScanResult = detect_and_parse(
        project_root=config.scan.project_root,
        whitelist=config.whitelist,
        lockfile_names=config.scan.lockfile_paths,
        include_dev=config.scan.include_dev_dependencies,
    )

    artifact_presence: Dict[str, bool] = {}
    if config.scan.check_build_artifacts:
        artifact_presence = scan_artifacts(
            project_root=config.scan.project_root,
            artifact_paths=config.scan.artifact_paths,
            known_packages=scan.packages,
        )

    for pkg in scan.packages:
        if pkg.key in artifact_presence:
            pkg.in_artifact = artifact_presence[pkg.key]

    report = AuditReport(scan=scan)
    report.timestamp = _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    history_dir = config.scan.project_root / config.scan.history_dir
    baseline_ts, baseline_all, baseline_risks = load_baseline(history_dir)
    report.baseline_timestamp = baseline_ts

    report.new_risks_vs_baseline, report.resolved_vs_baseline = diff_against_baseline(
        scan.packages, baseline_all, baseline_risks
    )

    _categorize(scan.packages, report)

    report.multi_version = _collect_multi_version(scan.packages)

    if config.scan.check_build_artifacts and artifact_presence:
        report.dev_in_prod = detect_dev_in_prod(scan.packages, artifact_presence)

    if save_history:
        save_snapshot(history_dir, scan)

    return report
