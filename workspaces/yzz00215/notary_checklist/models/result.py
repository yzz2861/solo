from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from .batch import BatchInfo
from .ledger import LedgerRecord


@dataclass
class MaterialItem:
    record_id: str
    material_name: str
    rule_id: str
    rule_name: str
    required: bool = True
    status: str = "pending"
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            'record_id': self.record_id,
            'material_name': self.material_name,
            'rule_id': self.rule_id,
            'rule_name': self.rule_name,
            'required': self.required,
            'status': self.status,
            'notes': self.notes,
        }


@dataclass
class ReviewItem:
    record_id: str
    issue_type: str
    issue_detail: str
    severity: str = "warning"
    field_name: str = ""
    suggestion: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            'record_id': self.record_id,
            'issue_type': self.issue_type,
            'issue_detail': self.issue_detail,
            'severity': self.severity,
            'field_name': self.field_name,
            'suggestion': self.suggestion,
        }


@dataclass
class ProcessResult:
    batch: BatchInfo
    total_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    total_materials: int = 0
    material_items: List[MaterialItem] = field(default_factory=list)
    review_items: List[ReviewItem] = field(default_factory=list)
    record_map: Dict[str, LedgerRecord] = field(default_factory=dict)
    summary_stats: Dict[str, Any] = field(default_factory=dict)
    idempotency_key: str = ""
    is_idempotent_replay: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            'batch': self.batch.to_dict(),
            'total_records': self.total_records,
            'valid_records': self.valid_records,
            'invalid_records': self.invalid_records,
            'total_materials': self.total_materials,
            'material_items': [m.to_dict() for m in self.material_items],
            'review_items': [r.to_dict() for r in self.review_items],
            'summary_stats': self.summary_stats,
            'idempotency_key': self.idempotency_key,
            'is_idempotent_replay': self.is_idempotent_replay,
        }

    def get_materials_by_record(self, record_id: str) -> List[MaterialItem]:
        return [m for m in self.material_items if m.record_id == record_id]

    def get_review_by_record(self, record_id: str) -> List[ReviewItem]:
        return [r for r in self.review_items if r.record_id == record_id]

    def get_review_by_type(self, issue_type: str) -> List[ReviewItem]:
        return [r for r in self.review_items if r.issue_type == issue_type]

    def get_summary(self) -> Dict[str, Any]:
        if self.summary_stats:
            return self.summary_stats

        stats = {
            'total_records': self.total_records,
            'valid_records': self.valid_records,
            'invalid_records': self.invalid_records,
            'total_materials': self.total_materials,
            'review_issues': len(self.review_items),
            'issue_types': {},
            'material_by_rule': {},
            'batch_id': self.batch.batch_id,
            'batch_time': self.batch.batch_time,
            'task_status': self.batch.task_status,
        }

        for r in self.review_items:
            t = r.issue_type
            stats['issue_types'][t] = stats['issue_types'].get(t, 0) + 1

        for m in self.material_items:
            rn = m.rule_name
            stats['material_by_rule'][rn] = stats['material_by_rule'].get(rn, 0) + 1

        self.summary_stats = stats
        return stats

    def is_same_result(self, other: 'ProcessResult') -> bool:
        if self.idempotency_key != other.idempotency_key:
            return False
        if len(self.material_items) != len(other.material_items):
            return False
        if len(self.review_items) != len(other.review_items):
            return False
        return True
