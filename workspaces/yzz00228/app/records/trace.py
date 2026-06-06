import uuid
import hashlib
from datetime import datetime
from typing import Optional


class TraceIdGenerator:
    @staticmethod
    def generate(prefix: str = "AUTH") -> str:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_part = uuid.uuid4().hex[:12].upper()
        return f"{prefix}-{timestamp}-{random_part}"

    @staticmethod
    def generate_batch_trace() -> str:
        return TraceIdGenerator.generate("BATCH")

    @staticmethod
    def generate_item_trace() -> str:
        return TraceIdGenerator.generate("ITEM")

    @staticmethod
    def generate_record_trace() -> str:
        return TraceIdGenerator.generate("REC")

    @staticmethod
    def generate_deterministic(batch_no: str, item_no: Optional[str] = None,
                                action: Optional[str] = None) -> str:
        raw = f"{batch_no}"
        if item_no:
            raw += f":{item_no}"
        if action:
            raw += f":{action}"
        raw += f":{datetime.now().strftime('%Y%m%d%H%M%S')}"

        hash_digest = hashlib.sha256(raw.encode()).hexdigest()[:16].upper()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"TRACE-{timestamp}-{hash_digest}"

    @staticmethod
    def validate(trace_id: str) -> bool:
        if not trace_id or not isinstance(trace_id, str):
            return False
        parts = trace_id.split("-")
        if len(parts) < 3:
            return False
        return True
