import uuid
from datetime import datetime
from typing import Dict, List, Optional


class AuditLog:
    def __init__(self, trace_id: str, biz_no: str, operator: str,
                 rule_version: str, request_data: Dict, result: Dict,
                 time_window: Dict):
        self.trace_id = trace_id
        self.biz_no = biz_no
        self.operator = operator
        self.rule_version = rule_version
        self.request_data = request_data
        self.result = result
        self.time_window = time_window
        self.created_at = datetime.now()

    def to_dict(self) -> Dict:
        return {
            "trace_id": self.trace_id,
            "biz_no": self.biz_no,
            "operator": self.operator,
            "rule_version": self.rule_version,
            "time_window": self.time_window,
            "request_data": self.request_data,
            "result": self.result,
            "created_at": self.created_at.isoformat()
        }


class AuditStore:
    def __init__(self):
        self._logs: Dict[str, AuditLog] = {}
        self._biz_index: Dict[str, List[str]] = {}

    def add_log(self, log: AuditLog) -> None:
        self._logs[log.trace_id] = log
        if log.biz_no not in self._biz_index:
            self._biz_index[log.biz_no] = []
        self._biz_index[log.biz_no].append(log.trace_id)

    def get_by_trace_id(self, trace_id: str) -> Optional[AuditLog]:
        return self._logs.get(trace_id)

    def get_by_biz_no(self, biz_no: str) -> List[Dict]:
        trace_ids = self._biz_index.get(biz_no, [])
        return [self._logs[tid].to_dict() for tid in trace_ids]

    def list_all(self, limit: int = 100) -> List[Dict]:
        all_logs = sorted(self._logs.values(), key=lambda x: x.created_at, reverse=True)
        return [log.to_dict() for log in all_logs[:limit]]

    def exists(self, trace_id: str) -> bool:
        return trace_id in self._logs


audit_store = AuditStore()
