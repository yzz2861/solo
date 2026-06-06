from typing import Dict, List, Set, Optional
from dataclasses import dataclass
from ..models.enums import AuthStatus, ActionType


@dataclass
class StateTransition:
    from_status: AuthStatus
    action: ActionType
    to_status: AuthStatus
    description: str


class StateTransitionError(Exception):
    def __init__(self, from_status: AuthStatus, action: ActionType, message: str = ""):
        self.from_status = from_status
        self.action = action
        self.message = message
        super().__init__(f"状态流转失败: {from_status.value} -> {action.value}: {message}")


class StateMachine:
    def __init__(self):
        self._transitions: List[StateTransition] = []
        self._valid_paths: set = set()
        self._action_map: Dict[AuthStatus, Dict[ActionType, AuthStatus]] = {}
        self._init_transitions()

    def _init_transitions(self):
        transitions = [
            StateTransition(
                from_status=AuthStatus.PENDING,
                action=ActionType.SUBMIT,
                to_status=AuthStatus.IN_PROGRESS,
                description="提交鉴定",
            ),
            StateTransition(
                from_status=AuthStatus.PENDING,
                action=ActionType.AUTO_AUTH,
                to_status=AuthStatus.PASSED,
                description="自动鉴定通过",
            ),
            StateTransition(
                from_status=AuthStatus.PENDING,
                action=ActionType.AUTO_AUTH,
                to_status=AuthStatus.REJECTED,
                description="自动鉴定拦截",
            ),
            StateTransition(
                from_status=AuthStatus.PENDING,
                action=ActionType.AUTO_AUTH,
                to_status=AuthStatus.PENDING_REVIEW,
                description="自动鉴定转复核",
            ),
            StateTransition(
                from_status=AuthStatus.PENDING,
                action=ActionType.MANUAL_PASS,
                to_status=AuthStatus.PASSED,
                description="人工鉴定通过",
            ),
            StateTransition(
                from_status=AuthStatus.PENDING,
                action=ActionType.MANUAL_REJECT,
                to_status=AuthStatus.REJECTED,
                description="人工鉴定拦截",
            ),
            StateTransition(
                from_status=AuthStatus.IN_PROGRESS,
                action=ActionType.MANUAL_PASS,
                to_status=AuthStatus.PASSED,
                description="人工鉴定通过",
            ),
            StateTransition(
                from_status=AuthStatus.IN_PROGRESS,
                action=ActionType.MANUAL_REJECT,
                to_status=AuthStatus.REJECTED,
                description="人工鉴定拦截",
            ),
            StateTransition(
                from_status=AuthStatus.IN_PROGRESS,
                action=ActionType.AUTO_AUTH,
                to_status=AuthStatus.PENDING_REVIEW,
                description="鉴定转复核",
            ),
            StateTransition(
                from_status=AuthStatus.IN_PROGRESS,
                action=ActionType.AUTO_AUTH,
                to_status=AuthStatus.PASSED,
                description="自动鉴定通过",
            ),
            StateTransition(
                from_status=AuthStatus.IN_PROGRESS,
                action=ActionType.AUTO_AUTH,
                to_status=AuthStatus.REJECTED,
                description="自动鉴定拦截",
            ),
            StateTransition(
                from_status=AuthStatus.PENDING_REVIEW,
                action=ActionType.REVIEW_PASS,
                to_status=AuthStatus.REVIEW_PASSED,
                description="复核通过",
            ),
            StateTransition(
                from_status=AuthStatus.PENDING_REVIEW,
                action=ActionType.REVIEW_REJECT,
                to_status=AuthStatus.REVIEW_REJECTED,
                description="复核拦截",
            ),
            StateTransition(
                from_status=AuthStatus.PENDING_REVIEW,
                action=ActionType.REPROCESS,
                to_status=AuthStatus.IN_PROGRESS,
                description="重新鉴定",
            ),
            StateTransition(
                from_status=AuthStatus.PASSED,
                action=ActionType.REPROCESS,
                to_status=AuthStatus.IN_PROGRESS,
                description="重新鉴定",
            ),
            StateTransition(
                from_status=AuthStatus.REJECTED,
                action=ActionType.REPROCESS,
                to_status=AuthStatus.IN_PROGRESS,
                description="重新鉴定",
            ),
            StateTransition(
                from_status=AuthStatus.REVIEW_PASSED,
                action=ActionType.REPROCESS,
                to_status=AuthStatus.IN_PROGRESS,
                description="重新鉴定",
            ),
            StateTransition(
                from_status=AuthStatus.REVIEW_REJECTED,
                action=ActionType.REPROCESS,
                to_status=AuthStatus.IN_PROGRESS,
                description="重新鉴定",
            ),
        ]

        self._transitions = transitions
        for t in transitions:
            self._valid_paths.add((t.from_status, t.to_status))
            if t.from_status not in self._action_map:
                self._action_map[t.from_status] = {}
            if t.action not in self._action_map[t.from_status]:
                self._action_map[t.from_status][t.action] = t.to_status

    def can_transition(self, from_status: AuthStatus, action: ActionType) -> bool:
        return (
            from_status in self._action_map
            and action in self._action_map[from_status]
        )

    def can_go_to(self, from_status: AuthStatus, to_status: AuthStatus) -> bool:
        return (from_status, to_status) in self._valid_paths

    def get_next_status(
        self, from_status: AuthStatus, action: ActionType
    ) -> Optional[AuthStatus]:
        if self.can_transition(from_status, action):
            return self._action_map[from_status][action]
        return None

    def get_possible_statuses(
        self, from_status: AuthStatus, action: ActionType
    ) -> List[AuthStatus]:
        return [
            t.to_status
            for t in self._transitions
            if t.from_status == from_status and t.action == action
        ]

    def transition(self, from_status: AuthStatus, action: ActionType,
                   target_status: Optional[AuthStatus] = None) -> AuthStatus:
        if target_status is not None:
            if not self.can_go_to(from_status, target_status):
                raise StateTransitionError(
                    from_status, action,
                    f"不支持从 {from_status.value} 流转到 {target_status.value}"
                )
            return target_status

        if not self.can_transition(from_status, action):
            raise StateTransitionError(
                from_status, action, "不支持该状态流转"
            )
        return self._action_map[from_status][action]

    def get_available_actions(self, status: AuthStatus) -> List[ActionType]:
        if status not in self._transitions:
            return []
        return list(self._transitions[status].keys())

    def get_all_transitions(self) -> List[StateTransition]:
        all_transitions = []
        for status_actions in self._transitions.values():
            all_transitions.extend(status_actions.values())
        return all_transitions

    def is_terminal(self, status: AuthStatus) -> bool:
        terminal_statuses = {
            AuthStatus.PASSED,
            AuthStatus.REJECTED,
            AuthStatus.REVIEW_PASSED,
            AuthStatus.REVIEW_REJECTED,
        }
        return status in terminal_statuses

    def needs_review(self, status: AuthStatus) -> bool:
        return status == AuthStatus.PENDING_REVIEW

    def is_passed(self, status: AuthStatus) -> bool:
        return status in {AuthStatus.PASSED, AuthStatus.REVIEW_PASSED}

    def is_rejected(self, status: AuthStatus) -> bool:
        return status in {AuthStatus.REJECTED, AuthStatus.REVIEW_REJECTED}
