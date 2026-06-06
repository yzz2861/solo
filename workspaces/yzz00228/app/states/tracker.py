from typing import List, Optional
from datetime import datetime
from dataclasses import dataclass, field
from ..models.enums import AuthStatus, ActionType


@dataclass
class StateHistoryRecord:
    from_status: AuthStatus
    to_status: AuthStatus
    action: ActionType
    operator: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    remark: Optional[str] = None

    def __post_init__(self):
        if isinstance(self.from_status, str):
            self.from_status = AuthStatus(self.from_status)
        if isinstance(self.to_status, str):
            self.to_status = AuthStatus(self.to_status)
        if isinstance(self.action, str):
            self.action = ActionType(self.action)


class StateTracker:
    def __init__(self, initial_status: AuthStatus = AuthStatus.PENDING):
        self.current_status: AuthStatus = initial_status
        self._history: List[StateHistoryRecord] = []

    @property
    def history(self) -> List[StateHistoryRecord]:
        return list(self._history)

    def record_transition(
        self,
        from_status: AuthStatus,
        to_status: AuthStatus,
        action: ActionType,
        operator: Optional[str] = None,
        remark: Optional[str] = None,
    ) -> None:
        record = StateHistoryRecord(
            from_status=from_status,
            to_status=to_status,
            action=action,
            operator=operator,
            remark=remark,
        )
        self._history.append(record)
        self.current_status = to_status

    def get_history_count(self) -> int:
        return len(self._history)

    def has_been_reviewed(self) -> bool:
        return any(
            r.action in {ActionType.REVIEW_PASS, ActionType.REVIEW_REJECT}
            for r in self._history
        )

    def has_been_processed(self) -> bool:
        return len(self._history) > 0

    def get_previous_status(self) -> Optional[AuthStatus]:
        if not self._history:
            return None
        return self._history[-1].from_status

    def get_all_statuses(self) -> List[AuthStatus]:
        if not self._history:
            return [self.current_status]
        statuses = [self._history[0].from_status]
        for record in self._history:
            statuses.append(record.to_status)
        return statuses
