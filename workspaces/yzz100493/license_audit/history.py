from __future__ import annotations

import datetime as _dt
import json
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from license_audit.models import Package, ScanResult


def _snapshot_path(history_dir: Path, timestamp: Optional[str] = None) -> Path:
    if timestamp:
        return history_dir / f"snapshot-{timestamp}.json"
    ts = _dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    return history_dir / f"snapshot-{ts}.json"


def _latest_snapshot(history_dir: Path) -> Optional[Path]:
    if not history_dir.exists():
        return None
    snapshots = sorted(history_dir.glob("snapshot-*.json"))
    if not snapshots:
        return None
    return snapshots[-1]


def save_snapshot(history_dir: Path, scan: ScanResult) -> str:
    history_dir.mkdir(parents=True, exist_ok=True)
    ts = _dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    path = _snapshot_path(history_dir, ts)
    payload = {
        "timestamp": ts,
        "packages": [
            {
                "key": p.key,
                "name": p.name,
                "version": p.version,
                "manager": p.manager.value,
                "license": p.license.identifiers,
                "license_category": p.license.category.value,
                "license_raw": p.license.raw,
                "is_risk": p.is_risk,
                "dep_type": p.dep_type.value,
            }
            for p in scan.packages
        ],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return ts


def load_baseline(history_dir: Path) -> Tuple[Optional[str], Set[str], Set[str]]:
    """
    读取最近一次快照。
    返回 (timestamp, all_package_keys, risk_package_keys)
    """
    latest = _latest_snapshot(history_dir)
    if not latest:
        return None, set(), set()
    try:
        data = json.loads(latest.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None, set(), set()
    ts = data.get("timestamp")
    all_keys: Set[str] = set()
    risk_keys: Set[str] = set()
    for p in data.get("packages", []):
        key = p.get("key", "")
        if not key:
            continue
        all_keys.add(key)
        if p.get("is_risk"):
            risk_keys.add(key)
    return ts, all_keys, risk_keys


def diff_against_baseline(
    current_packages: List[Package],
    baseline_all: Set[str],
    baseline_risks: Set[str],
) -> Tuple[List[Package], List[str]]:
    """
    对比当前扫描结果与基线。
    返回 (新增风险包列表, 已解决风险包 key 列表)
    """
    new_risks: List[Package] = []
    current_risk_keys: Set[str] = set()

    for pkg in current_packages:
        if pkg.is_risk:
            current_risk_keys.add(pkg.key)
            if pkg.key not in baseline_risks and pkg.key not in baseline_all:
                new_risks.append(pkg)
            elif pkg.key not in baseline_risks and pkg.key in baseline_all:
                new_risks.append(pkg)

    resolved = sorted(baseline_risks - current_risk_keys)
    return new_risks, resolved
