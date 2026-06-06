"""服务层：业务编排

整合对象、规则、状态、记录四层，提供统一的业务服务接口。
"""
from typing import Optional, List

from ..objects.models import (
    ServiceReceiptRequest,
    ServiceReceiptResponse,
    DetailItem,
    ReceiptRecord,
)
from ..objects.enums import (
    ProcessAction,
    BusinessConclusion,
    NextAction,
    TaskStatus,
    SourceChannel,
)
from ..rules.rule_engine import RuleEngine
from ..rules.exceptions import RuleViolationError, DuplicateProcessError
from ..states.state_machine import TaskStateManager, map_conclusion_to_status
from ..records.audit import AuditManager
from ..records.playback import PlaybackManager, PlaybackResult


class ServiceReceiptService:
    """送达回证服务

    核心业务服务类，协调各层完成送达回证处理。
    """

    def __init__(self):
        self.rule_engine = RuleEngine()
        self.state_manager = TaskStateManager()
        self.audit_manager = AuditManager()
        self.playback_manager = PlaybackManager()

    def process_receipt(
        self,
        request: ServiceReceiptRequest,
    ) -> ServiceReceiptResponse:
        """处理送达回证

        核心流程：
        1. 检查重复处理
        2. 执行规则引擎
        3. 更新状态
        4. 生成审计记录
        5. 记录数据快照

        Args:
            request: 送达回证请求

        Returns:
            ServiceReceiptResponse: 处理响应

        Raises:
            RuleViolationError: 规则违反
            DuplicateProcessError: 重复处理
            ValueError: 参数错误
        """
        self._validate_request(request)

        batch_no = request.batch_no
        action = request.process_action

        self._check_duplicate(batch_no, action)

        rule_result = self.rule_engine.execute(
            items=request.items,
            source_channel=request.source_channel,
            process_action=request.process_action,
            review_opinion=request.review_opinion,
        )

        previous_status = self.state_manager.get_status(batch_no)

        target_status = self._resolve_target_status(
            rule_result.business_conclusion,
            action,
            previous_status,
        )

        old_status, new_status = self._update_status(
            batch_no, action, target_status, rule_result
        )

        audit_record = self.audit_manager.create_audit_record(
            batch_no=batch_no,
            action=action.value,
            before_status=old_status.value,
            after_status=new_status.value,
            risk_level=rule_result.risk_level.value,
            operator=request.operator,
            missing_items=rule_result.missing_items,
            data_content=str([item.model_dump() for item in request.items]),
            remark=rule_result.message,
        )

        self.playback_manager.record_snapshot(
            batch_no=batch_no,
            source_channel=request.source_channel,
            process_action=action,
            previous_status=old_status,
            current_status=new_status,
            items=request.items,
            risk_tags=rule_result.risk_tags,
            business_conclusion=rule_result.business_conclusion,
            audit_no=audit_record.audit_no,
            review_opinion=request.review_opinion,
            operator=request.operator,
            remark=rule_result.message,
        )

        response = ServiceReceiptResponse(
            batch_no=batch_no,
            business_conclusion=rule_result.business_conclusion,
            risk_tags=rule_result.risk_tags,
            next_action=rule_result.next_action,
            audit_no=audit_record.audit_no,
            task_status=new_status,
            missing_items=rule_result.missing_items,
            message=rule_result.message,
        )

        return response

    def _validate_request(self, request: ServiceReceiptRequest):
        """校验请求参数"""
        if not request.batch_no or not request.batch_no.strip():
            raise ValueError("批次号不能为空")
        if not request.source_channel:
            raise ValueError("来源渠道不能为空")
        if not request.process_action:
            raise ValueError("处理动作不能为空")

    def _check_duplicate(self, batch_no: str, action: ProcessAction):
        """检查重复处理"""
        if self.state_manager.is_duplicate_process(batch_no, action):
            current_status = self.state_manager.get_status(batch_no)
            raise DuplicateProcessError(batch_no, current_status.value)

    def _resolve_target_status(
        self,
        conclusion: BusinessConclusion,
        action: ProcessAction,
        current_status: TaskStatus,
    ) -> TaskStatus:
        """根据业务结论和动作解析目标状态"""
        sm = self.state_manager.get_state_machine()

        if sm.can_transition(current_status, action):
            target_status, _ = sm.transition(current_status, action)

            conclusion_status = map_conclusion_to_status(conclusion, current_status)

            if target_status == conclusion_status:
                return target_status

            if conclusion in [BusinessConclusion.PENDING_REVIEW]:
                return TaskStatus.UNDER_REVIEW
            if conclusion in [BusinessConclusion.PENDING_SUPPLEMENT]:
                return TaskStatus.SUPPLEMENTING

            return target_status

        return map_conclusion_to_status(conclusion, current_status)

    def _update_status(
        self,
        batch_no: str,
        action: ProcessAction,
        target_status: TaskStatus,
        rule_result,
    ) -> tuple:
        """更新任务状态

        根据规则执行结果调整最终状态，业务结论优先级高于状态机默认流转。
        """
        current_status = self.state_manager.get_status(batch_no)
        old_status = current_status

        conclusion = rule_result.business_conclusion

        if conclusion == BusinessConclusion.PASSED:
            new_status = TaskStatus.APPROVED
        elif conclusion == BusinessConclusion.REJECTED:
            new_status = TaskStatus.REJECTED
        elif conclusion == BusinessConclusion.PENDING_REVIEW:
            new_status = TaskStatus.UNDER_REVIEW
        elif conclusion == BusinessConclusion.PENDING_SUPPLEMENT:
            new_status = TaskStatus.SUPPLEMENTING
        else:
            new_status = target_status

        self.state_manager._task_states[batch_no] = new_status

        if batch_no not in self.state_manager._state_history:
            self.state_manager._state_history[batch_no] = []
        self.state_manager._state_history[batch_no].append(
            (old_status, action, new_status)
        )

        return old_status, new_status

    def get_task_status(self, batch_no: str) -> TaskStatus:
        """查询任务状态"""
        return self.state_manager.get_status(batch_no)

    def playback(self, batch_no: str) -> PlaybackResult:
        """数据回放"""
        return self.playback_manager.playback(batch_no)

    def get_audit_record(self, audit_no: str):
        """查询审计记录"""
        return self.audit_manager.get_audit_record(audit_no)

    def get_batch_records(self, batch_no: str) -> List[ReceiptRecord]:
        """获取批次的所有处理记录"""
        return self.playback_manager.get_batch_records(batch_no)

    def get_record_by_audit_no(self, audit_no: str) -> Optional[ReceiptRecord]:
        """根据审计编号查询处理记录"""
        return self.playback_manager.get_record_by_audit_no(audit_no)
