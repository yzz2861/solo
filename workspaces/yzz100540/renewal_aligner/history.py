from __future__ import annotations

import hashlib
import json
import pickle
import uuid
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

from .models import (
    CustomerRenewalRecord,
    RiskFlag,
    RiskLevel,
    RiskType,
    Snapshot,
)
from .risk_engine import RISK_ORDER


RISK_LEVEL_SCORE = {
    RiskLevel.NONE: 0,
    RiskLevel.LOW: 1,
    RiskLevel.MEDIUM: 2,
    RiskLevel.HIGH: 3,
    RiskLevel.CRITICAL: 4,
}


@dataclass
class CustomerChange:
    canonical_customer_name: str
    previous_level: RiskLevel
    current_level: RiskLevel
    level_delta: int
    added_risks: list[dict[str, Any]] = field(default_factory=list)
    removed_risks: list[dict[str, Any]] = field(default_factory=list)
    escalated_risks: list[dict[str, Any]] = field(default_factory=list)
    is_new_customer: bool = False
    notes: str = ""

    @property
    def is_improved(self) -> bool:
        return self.level_delta < 0

    @property
    def is_worsened(self) -> bool:
        return self.level_delta > 0


@dataclass
class DiffResult:
    new_run_id: str
    previous_run_id: Optional[str]
    baseline_date: date
    new_customers: list[str] = field(default_factory=list)
    lost_customers: list[str] = field(default_factory=list)
    worsened: list[CustomerChange] = field(default_factory=list)
    improved: list[CustomerChange] = field(default_factory=list)
    unchanged_high_risk: list[CustomerChange] = field(default_factory=list)
    summary: dict[str, int] = field(default_factory=dict)


def _risk_key(risk: RiskFlag) -> str:
    return f"{risk.risk_type.value}|{risk.message}"


def _snapshot_record(record: CustomerRenewalRecord) -> dict[str, Any]:
    return {
        "canonical_customer_name": record.canonical_customer_name,
        "highest_risk_level": record.highest_risk_level.value,
        "risks": [
            {
                "risk_type": r.risk_type.value,
                "risk_level": r.risk_level.value,
                "message": r.message,
                "key": _risk_key(r),
                "details": r.details,
            }
            for r in record.risks
        ],
        "csm_owner": record.csm_owner,
        "sales_owner": record.sales_owner,
        "contract_value": record.contract_value,
        "upcoming_end_date": record.upcoming_end_date.isoformat() if record.upcoming_end_date else None,
        "all_names": record.all_names,
        "was_renamed": record.was_renamed,
        "next_action": record.next_action,
        "follow_up_date": record.follow_up_date.isoformat() if record.follow_up_date else None,
    }


def _serialize_snapshot(snapshot: Snapshot) -> dict[str, Any]:
    return {
        "run_id": snapshot.run_id,
        "run_time": snapshot.run_time.isoformat(),
        "baseline_date": snapshot.baseline_date.isoformat(),
        "previous_run_id": snapshot.previous_run_id,
        "records": {k: _snapshot_record(v) for k, v in snapshot.records.items()},
        "risk_summary": snapshot.risk_summary,
    }


def _deserialize_snapshot(data: dict[str, Any]) -> Snapshot:
    return Snapshot(
        run_id=data["run_id"],
        run_time=datetime.fromisoformat(data["run_time"]),
        baseline_date=date.fromisoformat(data["baseline_date"]),
        previous_run_id=data.get("previous_run_id"),
        records={},
        risk_summary=data.get("risk_summary", {}),
    )


class SnapshotStore:
    def __init__(self, storage_dir: Path):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._index_path = self.storage_dir / "index.json"
        self._load_index()

    def _load_index(self) -> None:
        if self._index_path.exists():
            try:
                with open(self._index_path, "r", encoding="utf-8") as f:
                    self._index = json.load(f)
            except Exception:
                self._index = {"runs": []}
        else:
            self._index = {"runs": []}

    def _save_index(self) -> None:
        with open(self._index_path, "w", encoding="utf-8") as f:
            json.dump(self._index, f, ensure_ascii=False, indent=2)

    def list_runs(self, limit: int = 20) -> list[dict[str, Any]]:
        return list(reversed(self._index.get("runs", [])))[:limit]

    def latest_run_id(self) -> Optional[str]:
        runs = self._index.get("runs", [])
        if not runs:
            return None
        return runs[-1]["run_id"]

    def save_snapshot(self, snapshot: Snapshot) -> str:
        run_id = snapshot.run_id or datetime.now().strftime("run-%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:6]
        snapshot.run_id = run_id
        json_path = self.storage_dir / f"{run_id}.json"
        pkl_path = self.storage_dir / f"{run_id}.pkl"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(_serialize_snapshot(snapshot), f, ensure_ascii=False, indent=2)
        with open(pkl_path, "wb") as f:
            pickle.dump(snapshot, f)
        entry = {
            "run_id": run_id,
            "run_time": snapshot.run_time.isoformat(),
            "baseline_date": snapshot.baseline_date.isoformat(),
            "total_customers": len(snapshot.records),
            "risk_summary": snapshot.risk_summary,
            "file": str(json_path),
            "pkl": str(pkl_path),
        }
        self._index.setdefault("runs", []).append(entry)
        self._save_index()
        return run_id

    def load_snapshot(self, run_id: str) -> Optional[Snapshot]:
        pkl_path = self.storage_dir / f"{run_id}.pkl"
        if not pkl_path.exists():
            for run in self._index.get("runs", []):
                if run["run_id"] == run_id and "pkl" in run:
                    pkl_path = Path(run["pkl"])
                    break
        if pkl_path.exists():
            try:
                with open(pkl_path, "rb") as f:
                    return pickle.load(f)
            except Exception:
                pass
        json_path = self.storage_dir / f"{run_id}.json"
        if not json_path.exists():
            for run in self._index.get("runs", []):
                if run["run_id"] == run_id:
                    json_path = Path(run["file"])
                    break
        if not json_path.exists():
            return None
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return _deserialize_snapshot(data)

    def _load_snapshot_data(self, run_id: str) -> Optional[dict[str, Any]]:
        file_path = self.storage_dir / f"{run_id}.json"
        if not file_path.exists():
            for run in self._index.get("runs", []):
                if run["run_id"] == run_id:
                    file_path = Path(run["file"])
                    break
        if not file_path.exists():
            return None
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def compute_diff(self, current_run_id: str, previous_run_id: Optional[str] = None) -> DiffResult:
        if previous_run_id is None:
            previous_run_id = self._find_previous(current_run_id)
        current_data = self._load_snapshot_data(current_run_id)
        previous_data = self._load_snapshot_data(previous_run_id) if previous_run_id else None
        baseline_date = date.fromisoformat(current_data["baseline_date"]) if current_data else date.today()
        diff = DiffResult(
            new_run_id=current_run_id,
            previous_run_id=previous_run_id,
            baseline_date=baseline_date,
        )
        if not current_data:
            return diff

        current_records = current_data.get("records", {})
        previous_records = previous_data.get("records", {}) if previous_data else {}

        current_names = set(current_records.keys())
        previous_names = set(previous_records.keys())

        diff.new_customers = sorted(current_names - previous_names)
        diff.lost_customers = sorted(previous_names - current_names)

        for name in current_names:
            curr = current_records[name]
            prev = previous_records.get(name)

            curr_level = RiskLevel(curr.get("highest_risk_level", RiskLevel.NONE.value))
            prev_level = RiskLevel(prev.get("highest_risk_level", RiskLevel.NONE.value)) if prev else RiskLevel.NONE

            change = CustomerChange(
                canonical_customer_name=name,
                previous_level=prev_level,
                current_level=curr_level,
                level_delta=RISK_LEVEL_SCORE[curr_level] - RISK_LEVEL_SCORE[prev_level],
                is_new_customer=name in diff.new_customers,
            )

            curr_risks = {r["key"]: r for r in curr.get("risks", [])}
            prev_risks = {r["key"]: r for r in (prev.get("risks", []) if prev else [])}

            for key, r in curr_risks.items():
                if key not in prev_risks:
                    change.added_risks.append(r)
                else:
                    pr = prev_risks[key]
                    if RISK_LEVEL_SCORE.get(RiskLevel(r["risk_level"]), 0) > RISK_LEVEL_SCORE.get(RiskLevel(pr["risk_level"]), 0):
                        change.escalated_risks.append({
                            "risk": r,
                            "previous_level": pr["risk_level"],
                            "current_level": r["risk_level"],
                        })

            for key, r in prev_risks.items():
                if key not in curr_risks:
                    change.removed_risks.append(r)

            if change.is_new_customer and curr_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
                diff.unchanged_high_risk.append(change)
            elif change.is_worsened:
                diff.worsened.append(change)
            elif change.is_improved:
                diff.improved.append(change)
            elif curr_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
                diff.unchanged_high_risk.append(change)

        diff.worsened.sort(key=lambda c: (-c.level_delta, c.canonical_customer_name))
        diff.improved.sort(key=lambda c: (c.level_delta, c.canonical_customer_name))
        diff.unchanged_high_risk.sort(key=lambda c: (-RISK_LEVEL_SCORE[c.current_level], c.canonical_customer_name))

        diff.summary = {
            "new_customers": len(diff.new_customers),
            "lost_customers": len(diff.lost_customers),
            "worsened": len(diff.worsened),
            "improved": len(diff.improved),
            "unchanged_high_risk": len(diff.unchanged_high_risk),
            "total_added_risks": sum(len(c.added_risks) for c in diff.worsened + diff.unchanged_high_risk),
            "total_removed_risks": sum(len(c.removed_risks) for c in diff.improved),
        }

        return diff

    def _find_previous(self, current_run_id: str) -> Optional[str]:
        runs = self._index.get("runs", [])
        found = False
        for run in reversed(runs):
            if run["run_id"] == current_run_id:
                found = True
                continue
            if found:
                return run["run_id"]
        return None if not runs or runs[-1]["run_id"] == current_run_id else (
            runs[-2]["run_id"] if len(runs) >= 2 else None
        )

    def annotate_with_changes(
        self,
        records: dict[str, CustomerRenewalRecord],
        current_run_id: str,
        previous_run_id: Optional[str] = None,
    ) -> DiffResult:
        diff = self.compute_diff(current_run_id, previous_run_id)
        for change in diff.worsened + diff.improved + diff.unchanged_high_risk:
            name = change.canonical_customer_name
            if name in records:
                rec = records[name]
                for risk in rec.risks:
                    key = _risk_key(risk)
                    if any(r["key"] == key for r in change.added_risks):
                        risk.previously_reported = False
                        risk.change_since_last = "新增"
                    elif any(ar["risk"]["key"] == key for ar in change.escalated_risks):
                        risk.previously_reported = True
                        for ar in change.escalated_risks:
                            if ar["risk"]["key"] == key:
                                risk.change_since_last = f"升级 {ar['previous_level']}→{ar['current_level']}"
                    else:
                        risk.previously_reported = True
                        risk.change_since_last = "持续"
                for r in change.removed_risks:
                    if not any(_risk_key(risk) == r["key"] for risk in rec.risks):
                        resolved = RiskFlag(
                            risk_type=RiskType(r["risk_type"]),
                            risk_level=RiskLevel(r["risk_level"]),
                            message="[已解决] " + r["message"],
                            details=r.get("details", {}),
                            previously_reported=True,
                            change_since_last="已解决 ✓",
                        )
                        rec.risks.insert(0, resolved)
        return diff


def build_snapshot(
    records: dict[str, CustomerRenewalRecord],
    baseline_date: Optional[date] = None,
    previous_run_id: Optional[str] = None,
) -> Snapshot:
    run_time = datetime.now()
    baseline = baseline_date or date.today()
    risk_summary: dict[str, int] = {}
    for rec in records.values():
        lvl = rec.highest_risk_level.value
        risk_summary[lvl] = risk_summary.get(lvl, 0) + 1
    for rec in records.values():
        types = {r.risk_type.value for r in rec.risks}
        for t in types:
            key = f"type:{t}"
            risk_summary[key] = risk_summary.get(key, 0) + 1
    return Snapshot(
        run_id="",
        run_time=run_time,
        baseline_date=baseline,
        records=records,
        risk_summary=risk_summary,
        previous_run_id=previous_run_id,
    )
