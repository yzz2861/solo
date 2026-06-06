"""导出模块"""
import os
import json
from typing import Dict, Any
from ..models import ProcessResult, RecordStatus
from ..utils.csv_io import write_assignments_csv, write_bad_records_csv, write_diff_csv
from ..utils.file_io import write_log_file, write_batch_snapshot


def export_results(result: ProcessResult, output_dir: str) -> Dict[str, str]:
    batch_id = result.batch.batch_id
    batch_dir = os.path.join(output_dir, batch_id)
    os.makedirs(batch_dir, exist_ok=True)

    files = {}

    success_assignments = [a for a in result.assignments if a.status == RecordStatus.SUCCESS]
    success_file = os.path.join(batch_dir, "success_results.csv")
    write_assignments_csv(success_file, success_assignments)
    files["success"] = success_file

    bad_file = os.path.join(batch_dir, "bad_records.csv")
    write_bad_records_csv(bad_file, result.bad_records)
    files["bad_records"] = bad_file

    manual_assignments = [a for a in result.assignments if a.status == RecordStatus.MANUAL_REVIEW]
    manual_file = os.path.join(batch_dir, "manual_review.csv")
    write_assignments_csv(manual_file, manual_assignments)
    files["manual_review"] = manual_file

    diff_file = os.path.join(batch_dir, "diff_results.csv")
    write_diff_csv(diff_file, result.diff_records)
    files["diff"] = diff_file

    log_file = os.path.join(batch_dir, "operation.log")
    write_log_file(log_file, result.logs)
    files["log"] = log_file

    snapshot_dir = os.path.join(output_dir, "snapshots")
    snapshot_file = os.path.join(snapshot_dir, f"{batch_id}.json")
    write_batch_snapshot(snapshot_file, result)
    files["snapshot"] = snapshot_file

    all_file = os.path.join(batch_dir, "all_results.csv")
    write_assignments_csv(all_file, result.assignments)
    files["all_results"] = all_file

    result.add_log("info", f"结果已导出到目录: {batch_dir}")
    for name, path in files.items():
        result.add_log("info", f"  - {name}: {os.path.basename(path)}")

    return files


def export_summary(result: ProcessResult) -> Dict[str, Any]:
    return {
        "batch_id": result.batch.batch_id,
        "command": result.batch.command,
        "status": result.batch.status.value,
        "total_count": result.batch.total_count,
        "success_count": result.batch.success_count,
        "bad_count": result.batch.bad_count,
        "manual_review_count": result.batch.manual_review_count,
        "diff_count": len(result.diff_records),
        "assignments_count": len(result.assignments),
        "bad_records_count": len(result.bad_records),
    }
