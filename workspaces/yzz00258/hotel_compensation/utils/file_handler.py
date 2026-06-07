import json
import csv
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..models import CompensationResult, CompensationRecord


class FileHandler:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "bad_rows"), exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "results"), exist_ok=True)

    def _timestamp(self) -> str:
        return datetime.now().strftime("%Y%m%d_%H%M%S")

    def save_results_json(self, results: List[CompensationResult],
                         filename: Optional[str] = None) -> str:
        if not filename:
            filename = f"results_{self._timestamp()}.json"
        filepath = os.path.join(self.output_dir, "results", filename)

        data = [r.to_dict() for r in results]
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return filepath

    def save_results_csv(self, results: List[CompensationResult],
                        filename: Optional[str] = None) -> str:
        if not filename:
            filename = f"results_{self._timestamp()}.csv"
        filepath = os.path.join(self.output_dir, "results", filename)

        fieldnames = [
            "business_no", "conclusion", "risk_label", "next_action",
            "audit_id", "matched_rule_id", "review_required", "review_reason",
            "missing_materials", "is_duplicate", "error_message", "success", "timestamp"
        ]

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for result in results:
                row = result.to_dict()
                row["missing_materials"] = ",".join(row.get("missing_materials", []))
                writer.writerow(row)

        return filepath

    def save_bad_rows(self, bad_rows: List[Dict[str, Any]],
                     filename: Optional[str] = None,
                     reason: str = "") -> str:
        if not filename:
            filename = f"bad_rows_{self._timestamp()}.json"
        filepath = os.path.join(self.output_dir, "bad_rows", filename)

        data = {
            "reason": reason,
            "count": len(bad_rows),
            "timestamp": datetime.now().isoformat(),
            "rows": bad_rows
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return filepath

    def save_record(self, record: CompensationRecord,
                   filename: Optional[str] = None) -> str:
        if not filename:
            filename = f"record_{record.business_no}_{self._timestamp()}.json"
        filepath = os.path.join(self.output_dir, "results", filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(record.to_dict(), f, ensure_ascii=False, indent=2)

        return filepath

    def save_batch_report(self, results: List[CompensationResult],
                         bad_rows: List[Dict[str, Any]] = None,
                         filename: Optional[str] = None) -> str:
        if not filename:
            filename = f"batch_report_{self._timestamp()}.json"
        filepath = os.path.join(self.output_dir, filename)

        total = len(results)
        success_count = sum(1 for r in results if r.success and not r.is_duplicate)
        failed_count = sum(1 for r in results if not r.success)
        review_count = sum(1 for r in results if r.success and r.review_required)
        duplicate_count = sum(1 for r in results if r.is_duplicate)

        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": total,
                "success": success_count,
                "failed": failed_count,
                "review_required": review_count,
                "duplicate": duplicate_count,
                "bad_rows_count": len(bad_rows) if bad_rows else 0
            },
            "results": [r.to_dict() for r in results],
            "bad_rows": bad_rows or []
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        return filepath

    def load_records_from_csv(self, filepath: str) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        bad_rows = []

        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, start=2):
                is_valid, errors = self._validate_row(row)
                if is_valid:
                    records.append(row)
                else:
                    bad_rows.append({
                        "line_number": line_num,
                        "row": row,
                        "errors": errors
                    })

        return records, bad_rows

    def _validate_row(self, row: Dict[str, Any]) -> tuple[bool, List[str]]:
        errors = []
        required_fields = ["business_no", "object_status", "time_window", "rule_version", "operator"]
        for field in required_fields:
            if not row.get(field):
                errors.append(f"缺少必需字段: {field}")
        return len(errors) == 0, errors
