import hashlib
import json
import os
from datetime import datetime
from typing import List, Dict
from .models import ProcessBatch, FHRRecord, SupplementRecord


class BatchManager:
    def __init__(self, output_dir: str, source_identifier: str = ""):
        self.output_dir = output_dir
        self.source_identifier = source_identifier
        self.batch_dir = os.path.join(output_dir, "batches")
        os.makedirs(self.batch_dir, exist_ok=True)

    def generate_batch_id(self) -> str:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"FHR-{timestamp}"

    def compute_checksum(
        self,
        main_records: List[FHRRecord],
        supplement_records: List[SupplementRecord] = None,
        rules_hash: str = ""
    ) -> str:
        main_data = []
        for r in sorted(main_records, key=lambda x: x.record_id):
            record_dict = {
                "record_id": r.record_id,
                "patient_id": r.patient_id,
                "patient_name": r.patient_name,
                "admission_no": r.admission_no,
                "exam_time": r.exam_time,
                "fhr_baseline": r.fhr_baseline,
                "fhr_variability": r.fhr_variability,
                "acceleration_count": r.acceleration_count,
                "deceleration_count": r.deceleration_count,
                "late_deceleration": r.late_deceleration,
                "variable_deceleration": r.variable_deceleration,
                "duration_minutes": r.duration_minutes,
                "exam_doctor": r.exam_doctor,
                "conclusion": r.conclusion,
                "extra": r.extra,
            }
            main_data.append(record_dict)

        data = {
            "main_count": len(main_records),
            "main_records": main_data,
            "rules_hash": rules_hash,
        }

        if supplement_records:
            sup_data = []
            for r in sorted(supplement_records, key=lambda x: x.record_id):
                sup_dict = {
                    "record_id": r.record_id,
                    "maternal_age": r.maternal_age,
                    "gestational_weeks": r.gestational_weeks,
                    "gravidity": r.gravidity,
                    "parity": r.parity,
                    "high_risk_factors": r.high_risk_factors,
                    "delivery_outcome": r.delivery_outcome,
                    "apgar_score": r.apgar_score,
                    "extra": r.extra,
                }
                sup_data.append(sup_dict)
            data["supplement_count"] = len(supplement_records)
            data["supplement_records"] = sup_data

        content = json.dumps(data, sort_keys=True, ensure_ascii=False, default=str)
        return hashlib.md5(content.encode("utf-8")).hexdigest()

    def find_existing_batch(self, checksum: str) -> ProcessBatch:
        batch_file = os.path.join(self.batch_dir, "batch_index.json")
        if not os.path.exists(batch_file):
            return None

        with open(batch_file, "r", encoding="utf-8") as f:
            index = json.load(f)

        for entry in index:
            if entry.get("checksum") == checksum:
                return ProcessBatch(
                    batch_id=entry["batch_id"],
                    source_identifier=entry.get("source_identifier", ""),
                    processed_at=entry.get("processed_at", ""),
                    record_count=entry.get("record_count", 0),
                    input_files=entry.get("input_files", []),
                    checksum=entry.get("checksum", ""),
                )

        return None

    def register_batch(
        self,
        batch_id: str,
        record_count: int,
        checksum: str,
        input_files: List[str] = None
    ) -> ProcessBatch:
        batch = ProcessBatch(
            batch_id=batch_id,
            source_identifier=self.source_identifier,
            processed_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            record_count=record_count,
            input_files=input_files or [],
            checksum=checksum,
        )

        batch_file = os.path.join(self.batch_dir, "batch_index.json")
        index = []
        if os.path.exists(batch_file):
            with open(batch_file, "r", encoding="utf-8") as f:
                index = json.load(f)

        entry = {
            "batch_id": batch.batch_id,
            "source_identifier": batch.source_identifier,
            "processed_at": batch.processed_at,
            "record_count": batch.record_count,
            "input_files": batch.input_files,
            "checksum": batch.checksum,
        }

        existing_idx = None
        for i, e in enumerate(index):
            if e["batch_id"] == batch.batch_id:
                existing_idx = i
                break

        if existing_idx is not None:
            index[existing_idx] = entry
        else:
            index.append(entry)

        with open(batch_file, "w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, indent=2)

        detail_file = os.path.join(self.batch_dir, f"{batch_id}.json")
        with open(detail_file, "w", encoding="utf-8") as f:
            json.dump(entry, f, ensure_ascii=False, indent=2)

        return batch

    def get_batch_history(self, limit: int = 10) -> List[ProcessBatch]:
        batch_file = os.path.join(self.batch_dir, "batch_index.json")
        if not os.path.exists(batch_file):
            return []

        with open(batch_file, "r", encoding="utf-8") as f:
            index = json.load(f)

        batches = []
        for entry in index[-limit:]:
            batches.append(ProcessBatch(
                batch_id=entry["batch_id"],
                source_identifier=entry.get("source_identifier", ""),
                processed_at=entry.get("processed_at", ""),
                record_count=entry.get("record_count", 0),
                input_files=entry.get("input_files", []),
                checksum=entry.get("checksum", ""),
            ))

        return batches
