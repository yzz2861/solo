from typing import List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from .enums import AuthStatus, ActionType
from .item import AuthItem, AuthItemResult


@dataclass
class AuthBatch:
    batch_no: str
    items: List[AuthItem]
    action: ActionType = ActionType.SUBMIT
    review_opinion: Optional[str] = None
    review_by: Optional[str] = None
    operator: Optional[str] = None
    remark: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        if isinstance(self.action, str):
            self.action = ActionType(self.action)
        if self.items and isinstance(self.items[0], dict):
            self.items = [AuthItem(**item) for item in self.items]

    @property
    def item_count(self) -> int:
        return len(self.items)

    def get_item_by_no(self, item_no: str) -> Optional[AuthItem]:
        for item in self.items:
            if item.item_no == item_no:
                return item
        return None


@dataclass
class AuthBatchResult:
    batch_no: str
    status: AuthStatus
    total_count: int
    passed_count: int
    rejected_count: int
    pending_review_count: int
    item_results: List[AuthItemResult]
    batch_trace_id: str
    processed_at: datetime = field(default_factory=datetime.now)
    review_opinion: Optional[str] = None
    review_by: Optional[str] = None
    error_message: Optional[str] = None

    def __post_init__(self):
        if isinstance(self.status, str):
            self.status = AuthStatus(self.status)

    def get_item_result(self, item_no: str) -> Optional[AuthItemResult]:
        for result in self.item_results:
            if result.item_no == item_no:
                return result
        return None
