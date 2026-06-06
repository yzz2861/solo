"""状态层：状态机管理

管理送达回证的任务状态流转，确保状态转换合法，
防止重复处理和非法状态跳转。
"""
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from ..objects.enums import TaskStatus, ProcessAction, BusinessConclusion


@dataclass
class StateTransition:
    """状态转换记录"""
    from_status: TaskStatus
    to_status: TaskStatus
    action: ProcessAction
    condition: str


class StateMachine:
    """送达回证状态机

    状态流转图：

    PENDING --SUBMIT--> PROCESSING
    PROCESSING --SUBMIT/APPROVE (正常)--> APPROVED
    PROCESSING --SUBMIT (高风险/缺材料)--> UNDER_REVIEW / SUPPLEMENTING
    PROCESSING --REJECT--> REJECTED
    UNDER_REVIEW --REVIEW (通过)--> APPROVED
    UNDER_REVIEW --REVIEW (驳回)--> REJECTED
    UNDER_REVIEW --REVIEW (补材料)--> SUPPLEMENTING
    SUPPLEMENTING --SUPPLEMENT--> PROCESSING
    APPROVED --> CLOSED (终态)
    REJECTED --> CLOSED (终态)
    """

    def __init__(self):
        self._transitions: Dict[TaskStatus, Dict[ProcessAction, Tuple[TaskStatus, str]]] = {}
        self._init_transitions()

    def _init_transitions(self):
        """初始化状态转换规则"""
        self._add_transition(
            TaskStatus.PENDING,
            ProcessAction.SUBMIT,
            TaskStatus.PROCESSING,
            "提交送达回证",
        )

        self._add_transition(
            TaskStatus.PROCESSING,
            ProcessAction.APPROVE,
            TaskStatus.APPROVED,
            "审批通过",
        )

        self._add_transition(
            TaskStatus.PROCESSING,
            ProcessAction.REJECT,
            TaskStatus.REJECTED,
            "审批驳回",
        )

        self._add_transition(
            TaskStatus.PROCESSING,
            ProcessAction.REVIEW,
            TaskStatus.UNDER_REVIEW,
            "进入复核",
        )

        self._add_transition(
            TaskStatus.PROCESSING,
            ProcessAction.SUPPLEMENT,
            TaskStatus.SUPPLEMENTING,
            "进入补材料",
        )

        self._add_transition(
            TaskStatus.UNDER_REVIEW,
            ProcessAction.REVIEW,
            TaskStatus.APPROVED,
            "复核通过",
        )

        self._add_transition(
            TaskStatus.UNDER_REVIEW,
            ProcessAction.REJECT,
            TaskStatus.REJECTED,
            "复核驳回",
        )

        self._add_transition(
            TaskStatus.UNDER_REVIEW,
            ProcessAction.SUPPLEMENT,
            TaskStatus.SUPPLEMENTING,
            "复核要求补材料",
        )

        self._add_transition(
            TaskStatus.SUPPLEMENTING,
            ProcessAction.SUPPLEMENT,
            TaskStatus.PROCESSING,
            "材料补充完成",
        )

        self._add_transition(
            TaskStatus.APPROVED,
            ProcessAction.SUBMIT,
            TaskStatus.CLOSED,
            "归档关闭",
        )

    def _add_transition(
        self,
        from_status: TaskStatus,
        action: ProcessAction,
        to_status: TaskStatus,
        condition: str,
    ):
        """添加状态转换规则"""
        if from_status not in self._transitions:
            self._transitions[from_status] = {}
        self._transitions[from_status][action] = (to_status, condition)

    def can_transition(
        self,
        current_status: TaskStatus,
        action: ProcessAction,
    ) -> bool:
        """判断是否可以进行状态转换"""
        if current_status not in self._transitions:
            return False
        return action in self._transitions[current_status]

    def transition(
        self,
        current_status: TaskStatus,
        action: ProcessAction,
    ) -> Tuple[TaskStatus, str]:
        """执行状态转换

        Args:
            current_status: 当前状态
            action: 处理动作

        Returns:
            (目标状态, 转换说明)

        Raises:
            ValueError: 非法状态转换
        """
        if not self.can_transition(current_status, action):
            raise ValueError(
                f"非法状态转换: 从[{current_status.value}]执行[{action.value}]不允许"
            )

        return self._transitions[current_status][action]

    def get_valid_actions(self, current_status: TaskStatus) -> List[ProcessAction]:
        """获取当前状态下允许的动作"""
        if current_status not in self._transitions:
            return []
        return list(self._transitions[current_status].keys())

    def is_terminal(self, status: TaskStatus) -> bool:
        """判断是否为终态"""
        return status in [TaskStatus.CLOSED, TaskStatus.REJECTED]

    def get_all_transitions(self) -> List[StateTransition]:
        """获取所有状态转换规则"""
        transitions = []
        for from_status, actions in self._transitions.items():
            for action, (to_status, condition) in actions.items():
                transitions.append(
                    StateTransition(
                        from_status=from_status,
                        to_status=to_status,
                        action=action,
                        condition=condition,
                    )
                )
        return transitions


class TaskStateManager:
    """任务状态管理器

    管理每个批次号的任务状态，防止重复处理。
    """

    def __init__(self):
        self._state_machine = StateMachine()
        self._task_states: Dict[str, TaskStatus] = {}
        self._state_history: Dict[str, List[Tuple[TaskStatus, ProcessAction, TaskStatus]]] = {}

    def get_status(self, batch_no: str) -> TaskStatus:
        """获取批次当前状态"""
        return self._task_states.get(batch_no, TaskStatus.PENDING)

    def has_task(self, batch_no: str) -> bool:
        """检查批次是否已存在"""
        return batch_no in self._task_states

    def process_action(
        self,
        batch_no: str,
        action: ProcessAction,
    ) -> Tuple[TaskStatus, TaskStatus]:
        """处理动作并更新状态

        Args:
            batch_no: 批次号
            action: 处理动作

        Returns:
            (旧状态, 新状态)

        Raises:
            ValueError: 非法状态转换或重复处理
        """
        current_status = self.get_status(batch_no)

        new_status, _ = self._state_machine.transition(current_status, action)

        if batch_no not in self._state_history:
            self._state_history[batch_no] = []
        self._state_history[batch_no].append((current_status, action, new_status))

        old_status = current_status
        self._task_states[batch_no] = new_status

        return old_status, new_status

    def is_duplicate_process(
        self,
        batch_no: str,
        action: ProcessAction,
    ) -> bool:
        """检查是否为重复处理

        终态或已处理状态不允许重复提交。
        """
        if not self.has_task(batch_no):
            return False

        current_status = self.get_status(batch_no)

        if action == ProcessAction.SUBMIT:
            if current_status == TaskStatus.PENDING:
                return False
            if current_status == TaskStatus.SUPPLEMENTING:
                return False
            return True

        if action == ProcessAction.REVIEW:
            if current_status == TaskStatus.UNDER_REVIEW:
                return False
            if current_status == TaskStatus.PROCESSING:
                return False
            return True

        if action == ProcessAction.APPROVE:
            if current_status in [TaskStatus.APPROVED, TaskStatus.REJECTED, TaskStatus.CLOSED]:
                return True
            return False

        if action == ProcessAction.REJECT:
            if current_status in [TaskStatus.APPROVED, TaskStatus.REJECTED, TaskStatus.CLOSED]:
                return True
            return False

        if current_status in [TaskStatus.CLOSED, TaskStatus.REJECTED, TaskStatus.APPROVED]:
            return True

        return False

    def get_state_history(self, batch_no: str) -> List[Tuple[TaskStatus, ProcessAction, TaskStatus]]:
        """获取状态历史"""
        return self._state_history.get(batch_no, [])

    def reset_task(self, batch_no: str):
        """重置任务状态 - 用于测试或异常恢复"""
        if batch_no in self._task_states:
            del self._task_states[batch_no]
        if batch_no in self._state_history:
            del self._state_history[batch_no]

    def get_state_machine(self) -> StateMachine:
        """获取状态机实例"""
        return self._state_machine


def map_conclusion_to_status(
    conclusion: BusinessConclusion,
    current_status: TaskStatus,
) -> TaskStatus:
    """根据业务结论推导目标状态

    这是规则层到状态层的适配函数。
    """
    mapping = {
        BusinessConclusion.PASSED: TaskStatus.APPROVED,
        BusinessConclusion.REJECTED: TaskStatus.REJECTED,
        BusinessConclusion.PENDING_REVIEW: TaskStatus.UNDER_REVIEW,
        BusinessConclusion.PENDING_SUPPLEMENT: TaskStatus.SUPPLEMENTING,
    }
    return mapping.get(conclusion, current_status)
