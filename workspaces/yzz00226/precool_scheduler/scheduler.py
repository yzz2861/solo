from typing import List, Dict, Optional
from datetime import datetime, date
import hashlib
import json
import os
from .models import (
    SourceRecord,
    PrecoolRecord,
    ValidationResult,
    BatchSummary,
    generate_batch_id,
)
from .validator import DataValidator
from .mapper import FieldMapper


class IdempotencyStore:
    def __init__(self, store_dir: str = "./output/.idempotency"):
        self.store_dir = store_dir
        os.makedirs(store_dir, exist_ok=True)

    def _key_path(self, key: str) -> str:
        return os.path.join(self.store_dir, f"{key}.json")

    def exists(self, key: str) -> bool:
        return os.path.exists(self._key_path(key))

    def save(self, key: str, data: Dict):
        with open(self._key_path(key), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load(self, key: str) -> Optional[Dict]:
        path = self._key_path(key)
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)


def compute_idempotency_key(
    sources: List[SourceRecord],
    mapper: FieldMapper,
    date_start: Optional[date],
    date_end: Optional[date],
) -> str:
    source_signatures = []
    for src in sorted(sources, key=lambda s: (s.source_file, s.row_number)):
        source_signatures.append({
            "source_file": src.source_file,
            "row_number": src.row_number,
            "row_hash": src.compute_row_hash(),
        })
    payload = {
        "sources": source_signatures,
        "mapping": mapper.mapping,
        "date_start": date_start.isoformat() if date_start else None,
        "date_end": date_end.isoformat() if date_end else None,
        "version": "1.0",
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


class PrecoolScheduler:
    def __init__(
        self,
        mapper: FieldMapper,
        batch_id: str = None,
        date_start: Optional[date] = None,
        date_end: Optional[date] = None,
        output_dir: str = "./output",
        idempotent: bool = True,
    ):
        self.mapper = mapper
        self.batch_id = batch_id or generate_batch_id()
        self.date_start = date_start
        self.date_end = date_end
        self.output_dir = output_dir
        self.idempotent = idempotent
        self.validator = DataValidator(mapper, self.batch_id)
        self.idempotency_store = IdempotencyStore(os.path.join(output_dir, ".idempotency"))

    def generate(self, sources: List[SourceRecord]) -> Dict:
        filtered = self._filter_by_date(sources)
        idem_key = compute_idempotency_key(filtered, self.mapper, self.date_start, self.date_end)

        if self.idempotent and self.idempotency_store.exists(idem_key):
            cached = self.idempotency_store.load(idem_key)
            return {
                "batch_id": cached["batch_id"],
                "idempotency_key": idem_key,
                "is_cached": True,
                "passed": cached["passed"],
                "exceptions": cached["exceptions"],
                "summary": cached["summary"],
                "message": "检测到相同输入，返回已缓存结果（幂等性保证）",
            }

        validation = self.validator.validate(filtered)
        for rec in validation.passed:
            rec.status = "scheduled"

        summary = self._build_summary(validation, idem_key, [s.source_file for s in sources])

        result = {
            "batch_id": self.batch_id,
            "idempotency_key": idem_key,
            "is_cached": False,
            "passed": [r.to_dict() for r in validation.passed],
            "exceptions": [r.to_dict() for r in validation.exceptions],
            "summary": summary.to_dict(),
            "message": "排程生成完成",
        }

        if self.idempotent:
            self.idempotency_store.save(idem_key, result)

        return result

    def _filter_by_date(self, sources: List[SourceRecord]) -> List[SourceRecord]:
        if not self.date_start and not self.date_end:
            return sources
        filtered = []
        for src in sources:
            mapped = self.mapper.map_record(src)
            date_str = mapped.get("inbound_date")
            if not date_str:
                filtered.append(src)
                continue
            try:
                from .validator import DataValidator
                d = DataValidator._parse_date(str(date_str).strip())
                if d is None:
                    filtered.append(src)
                    continue
                if self.date_start and d < self.date_start:
                    continue
                if self.date_end and d > self.date_end:
                    continue
                filtered.append(src)
            except Exception:
                filtered.append(src)
        return filtered

    def _build_summary(
        self,
        validation: ValidationResult,
        idem_key: str,
        source_files: List[str],
    ) -> BatchSummary:
        rooms = sorted(set(r.precool_room for r in validation.passed if r.precool_room))
        total_hours = round(sum(r.precool_hours for r in validation.passed), 2)
        return BatchSummary(
            batch_id=self.batch_id,
            generated_at=datetime.now().isoformat(),
            source_files=sorted(set(source_files)),
            date_range_start=self.date_start.isoformat() if self.date_start else "",
            date_range_end=self.date_end.isoformat() if self.date_end else "",
            total_records=validation.total_count,
            passed_records=validation.pass_count,
            exception_records=validation.exception_count,
            review_records=validation.review_count,
            precool_rooms=rooms,
            total_precool_hours=total_hours,
            idempotency_key=idem_key,
        )
