"""文件与日志工具"""
import os
import json
import csv
from datetime import datetime
from typing import List, Dict, Any
from ..models import ProcessResult, BatchInfo


def ensure_output_dir(output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def write_log_file(log_path: str, logs: List[str]):
    os.makedirs(os.path.dirname(log_path) or ".", exist_ok=True)
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("\n".join(logs))
        if logs and not logs[-1].endswith("\n"):
            f.write("\n")


def write_batch_snapshot(snapshot_path: str, result: ProcessResult):
    os.makedirs(os.path.dirname(snapshot_path) or ".", exist_ok=True)
    data = {
        "batch_info": {
            "batch_id": result.batch.batch_id,
            "command": result.batch.command,
            "start_time": result.batch.start_time,
            "end_time": result.batch.end_time,
            "status": result.batch.status.value,
            "input_file": result.batch.input_file,
            "rules_file": result.batch.rules_file,
            "snapshot_file": result.batch.snapshot_file,
            "output_dir": result.batch.output_dir,
            "total_count": result.batch.total_count,
            "success_count": result.batch.success_count,
            "failed_count": result.batch.failed_count,
            "bad_count": result.batch.bad_count,
            "manual_review_count": result.batch.manual_review_count,
        },
        "assignments": [a.to_dict() for a in result.assignments],
        "bad_records": result.bad_records,
        "diff_records": result.diff_records,
        "logs": result.logs,
        "snapshot_version": "1.0",
        "snapshot_time": datetime.now().isoformat(),
    }
    with open(snapshot_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def read_batch_snapshot(snapshot_path: str) -> Dict[str, Any]:
    if not os.path.exists(snapshot_path):
        return {}
    with open(snapshot_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_snapshot_list(output_dir: str) -> List[Dict[str, Any]]:
    snapshot_dir = os.path.join(output_dir, "snapshots")
    if not os.path.exists(snapshot_dir):
        return []

    snapshots = []
    for fn in sorted(os.listdir(snapshot_dir), reverse=True):
        if fn.endswith(".json"):
            path = os.path.join(snapshot_dir, fn)
            try:
                data = read_batch_snapshot(path)
                bi = data.get("batch_info", {})
                snapshots.append({
                    "batch_id": bi.get("batch_id", ""),
                    "command": bi.get("command", ""),
                    "status": bi.get("status", ""),
                    "start_time": bi.get("start_time", 0),
                    "total_count": bi.get("total_count", 0),
                    "success_count": bi.get("success_count", 0),
                    "snapshot_file": path,
                })
            except Exception:
                pass
    return snapshots
