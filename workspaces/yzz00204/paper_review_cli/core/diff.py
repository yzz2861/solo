"""差异比较模块 - 保证幂等性"""
from typing import List, Dict, Any
from ..models import AssignmentResult, ProcessResult, RecordStatus


def _assignment_key(a: AssignmentResult) -> str:
    return f"{a.paper_id}|{a.reviewer_id}"


def _assignment_signature(a: AssignmentResult) -> str:
    conflicts_str = ",".join(sorted(c.value for c in a.conflicts))
    return f"{a.paper_id}|{a.reviewer_id}|{a.status.value}|{conflicts_str}"


def compare_with_snapshot(current: List[AssignmentResult],
                          snapshot_data: Dict[str, Any],
                          batch_id: str) -> List[Dict[str, Any]]:
    diff_records: List[Dict[str, Any]] = []

    snapshot_assignments = snapshot_data.get("assignments", [])
    if not snapshot_assignments:
        for a in current:
            diff_records.append({
                "paper_id": a.paper_id,
                "reviewer_id": a.reviewer_id,
                "diff_type": "new",
                "field": "assignment",
                "old_value": "",
                "new_value": _assignment_signature(a),
                "batch_id": batch_id,
            })
        return diff_records

    snap_map: Dict[str, Dict[str, Any]] = {}
    for sa in snapshot_assignments:
        key = f"{sa.get('paper_id', '')}|{sa.get('reviewer_id', '')}"
        snap_map[key] = sa

    current_map: Dict[str, AssignmentResult] = {}
    for a in current:
        current_map[_assignment_key(a)] = a

    for key, a in current_map.items():
        if key not in snap_map:
            diff_records.append({
                "paper_id": a.paper_id,
                "reviewer_id": a.reviewer_id,
                "diff_type": "new",
                "field": "assignment",
                "old_value": "",
                "new_value": _assignment_signature(a),
                "batch_id": batch_id,
            })
        else:
            sa = snap_map[key]
            old_status = sa.get("status", "")
            new_status = a.status.value
            if old_status != new_status:
                diff_records.append({
                    "paper_id": a.paper_id,
                    "reviewer_id": a.reviewer_id,
                    "diff_type": "modified",
                    "field": "status",
                    "old_value": old_status,
                    "new_value": new_status,
                    "batch_id": batch_id,
                })

            old_conflicts = set(sa.get("conflicts", []))
            new_conflicts = set(c.value for c in a.conflicts)
            if old_conflicts != new_conflicts:
                diff_records.append({
                    "paper_id": a.paper_id,
                    "reviewer_id": a.reviewer_id,
                    "diff_type": "modified",
                    "field": "conflicts",
                    "old_value": ",".join(sorted(old_conflicts)),
                    "new_value": ",".join(sorted(new_conflicts)),
                    "batch_id": batch_id,
                })

    for key, sa in snap_map.items():
        if key not in current_map:
            diff_records.append({
                "paper_id": sa.get("paper_id", ""),
                "reviewer_id": sa.get("reviewer_id", ""),
                "diff_type": "removed",
                "field": "assignment",
                "old_value": f"{sa.get('paper_id', '')}|{sa.get('reviewer_id', '')}|{sa.get('status', '')}",
                "new_value": "",
                "batch_id": batch_id,
            })

    return diff_records


def apply_diff_to_result(result: ProcessResult, snapshot_data: Dict[str, Any]):
    diffs = compare_with_snapshot(
        result.assignments, snapshot_data, result.batch.batch_id
    )
    result.diff_records = diffs

    new_count = sum(1 for d in diffs if d["diff_type"] == "new")
    mod_count = sum(1 for d in diffs if d["diff_type"] == "modified")
    rem_count = sum(1 for d in diffs if d["diff_type"] == "removed")

    result.add_log("info", f"与历史快照比较: 新增 {new_count} 条，修改 {mod_count} 条，删除 {rem_count} 条")

    if not diffs:
        result.add_log("info", "与历史快照完全一致，无新增差异（幂等验证通过）")
