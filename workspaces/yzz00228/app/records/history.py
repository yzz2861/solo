from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime
from .audit import AuditRecord, AuditLogger
from .trace import TraceIdGenerator
from ..models.enums import AuthStatus, ActionType, RiskLevel


@dataclass
class PlaybackSnapshot:
    batch_no: str
    item_no: Optional[str]
    status: AuthStatus
    risk_level: Optional[RiskLevel]
    risk_score: Optional[float]
    reasons: List[str]
    step_index: int
    trace_id: str
    timestamp: datetime


class HistoryPlayer:
    def __init__(self, audit_logger: AuditLogger):
        self.audit_logger = audit_logger

    def get_item_history(self, batch_no: str, item_no: str) -> List[AuditRecord]:
        records = self.audit_logger.get_records_by_item(batch_no, item_no)
        return sorted(records, key=lambda r: r.timestamp)

    def get_batch_history(self, batch_no: str) -> List[AuditRecord]:
        records = self.audit_logger.get_records_by_batch(batch_no)
        return sorted(records, key=lambda r: r.timestamp)

    def play_item_back(self, batch_no: str, item_no: str) -> List[PlaybackSnapshot]:
        records = self.get_item_history(batch_no, item_no)
        snapshots: List[PlaybackSnapshot] = []

        for i, record in enumerate(records):
            snapshot = PlaybackSnapshot(
                batch_no=record.batch_no,
                item_no=record.item_no,
                status=record.to_status,
                risk_level=record.risk_level_after,
                risk_score=record.risk_score_after,
                reasons=record.reasons,
                step_index=i + 1,
                trace_id=record.trace_id,
                timestamp=record.timestamp,
            )
            snapshots.append(snapshot)

        return snapshots

    def get_state_at_step(self, batch_no: str, item_no: str,
                          step_index: int) -> Optional[PlaybackSnapshot]:
        snapshots = self.play_item_back(batch_no, item_no)
        if 0 < step_index <= len(snapshots):
            return snapshots[step_index - 1]
        return None

    def get_processing_count(self, batch_no: str, item_no: str) -> int:
        records = self.get_item_history(batch_no, item_no)
        return len([r for r in records if r.action == ActionType.REPROCESS])

    def has_duplicate_processing(self, batch_no: str, item_no: str) -> bool:
        records = self.get_item_history(batch_no, item_no)
        seen_statuses = {}
        for record in records:
            key = (record.action, record.to_status)
            if key in seen_statuses:
                return True
            seen_statuses[key] = True
        return False

    def traceable(self, trace_id: str) -> bool:
        return self.audit_logger.get_record_by_trace_id(trace_id) is not None

    def get_record_by_trace_id(self, trace_id: str) -> Optional[AuditRecord]:
        return self.audit_logger.get_record_by_trace_id(trace_id)
