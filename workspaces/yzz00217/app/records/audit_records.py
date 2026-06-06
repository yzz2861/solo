from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any
import json
import os
import csv

from app.models import InspectionOutput


@dataclass
class BadRowRecord:
    row_number: int
    raw_data: Dict[str, Any]
    error_type: str
    error_message: str
    process_time: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "row_number": self.row_number,
            "raw_data": self.raw_data,
            "error_type": self.error_type,
            "error_message": self.error_message,
            "process_time": self.process_time,
        }


class AuditRecordManager:
    def __init__(self, output_dir: str = "data/output", bad_dir: str = "data/bad"):
        self.output_dir = output_dir
        self.bad_dir = bad_dir
        self.results: List[InspectionOutput] = []
        self.bad_rows: List[BadRowRecord] = []
        self.batch_id = datetime.now().strftime("%Y%m%d%H%M%S")

        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.bad_dir, exist_ok=True)

    def add_result(self, output: InspectionOutput):
        self.results.append(output)

    def add_bad_row(self, bad_row: BadRowRecord):
        self.bad_rows.append(bad_row)

    def get_summary(self) -> Dict[str, Any]:
        total = len(self.results) + len(self.bad_rows)
        passed = sum(1 for r in self.results if r.business_conclusion.value == "pass")
        review = sum(1 for r in self.results if r.business_conclusion.value == "review_required")
        rejected = sum(1 for r in self.results if r.business_conclusion.value == "reject")

        risk_counts = {}
        for r in self.results:
            label = r.risk_label.value
            risk_counts[label] = risk_counts.get(label, 0) + 1

        return {
            "batch_id": self.batch_id,
            "total_records": total,
            "successful_processed": len(self.results),
            "bad_rows_count": len(self.bad_rows),
            "conclusion_counts": {
                "pass": passed,
                "review_required": review,
                "reject": rejected,
                "pending": total - passed - review - rejected - len(self.bad_rows),
            },
            "risk_counts": risk_counts,
            "process_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }


def save_result_to_file(
    results: List[InspectionOutput],
    output_dir: str = "data/output",
    batch_id: str = "",
) -> str:
    if not batch_id:
        batch_id = datetime.now().strftime("%Y%m%d%H%M%S")

    os.makedirs(output_dir, exist_ok=True)

    json_file = os.path.join(output_dir, f"inspection_results_{batch_id}.json")
    csv_file = os.path.join(output_dir, f"inspection_results_{batch_id}.csv")

    result_dicts = [r.to_dict() for r in results]

    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(result_dicts, f, ensure_ascii=False, indent=2)

    if result_dicts:
        fieldnames = list(result_dicts[0].keys())
        with open(csv_file, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(result_dicts)

    return json_file


def save_bad_rows_to_file(
    bad_rows: List[BadRowRecord],
    bad_dir: str = "data/bad",
    batch_id: str = "",
) -> str:
    if not batch_id:
        batch_id = datetime.now().strftime("%Y%m%d%H%M%S")

    os.makedirs(bad_dir, exist_ok=True)

    bad_file = os.path.join(bad_dir, f"bad_rows_{batch_id}.json")

    bad_dicts = [br.to_dict() for br in bad_rows]

    with open(bad_file, "w", encoding="utf-8") as f:
        json.dump(bad_dicts, f, ensure_ascii=False, indent=2)

    return bad_file


def save_audit_summary(
    summary: Dict[str, Any],
    output_dir: str = "data/output",
    batch_id: str = "",
) -> str:
    if not batch_id:
        batch_id = summary.get("batch_id", datetime.now().strftime("%Y%m%d%H%M%S"))

    os.makedirs(output_dir, exist_ok=True)

    summary_file = os.path.join(output_dir, f"audit_summary_{batch_id}.json")

    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    return summary_file
