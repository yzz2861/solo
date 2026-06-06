from typing import List, Optional, Dict, Any
from datetime import datetime
from ..models.batch import AuthBatch, AuthBatchResult
from ..models.item import AuthItem, AuthItemResult
from ..models.enums import AuthStatus, ActionType, RiskLevel
from ..rules.engine import RuleEngine, RuleEvaluationResult
from ..states.machine import StateMachine, StateTransitionError
from ..states.tracker import StateTracker
from ..records.audit import AuditRecord, AuditLogger
from ..records.trace import TraceIdGenerator
from ..records.history import HistoryPlayer


class AuthServiceError(Exception):
    def __init__(self, code: str, message: str, details: Optional[Dict[str, Any]] = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


class AuthService:
    def __init__(self):
        self.rule_engine = RuleEngine()
        self.state_machine = StateMachine()
        self.audit_logger = AuditLogger()
        self.history_player = HistoryPlayer(self.audit_logger)
        self._item_trackers: Dict[str, StateTracker] = {}
        self._batch_results: Dict[str, AuthBatchResult] = {}

    def _get_tracker_key(self, batch_no: str, item_no: str) -> str:
        return f"{batch_no}:{item_no}"

    def _get_or_create_tracker(self, batch_no: str, item_no: str,
                                initial_status: AuthStatus = AuthStatus.PENDING) -> StateTracker:
        key = self._get_tracker_key(batch_no, item_no)
        if key not in self._item_trackers:
            self._item_trackers[key] = StateTracker(initial_status)
        return self._item_trackers[key]

    def process_batch(self, batch: AuthBatch) -> AuthBatchResult:
        if not batch.batch_no:
            raise AuthServiceError("BATCH_NO_EMPTY", "批次号不能为空")

        if not batch.items:
            raise AuthServiceError("BATCH_ITEMS_EMPTY", "批次明细项不能为空")

        item_nos = [item.item_no for item in batch.items]
        if len(item_nos) != len(set(item_nos)):
            raise AuthServiceError(
                "DUPLICATE_ITEM_NO",
                "批次中存在重复的明细项编号",
                {"duplicates": list(set([n for n in item_nos if item_nos.count(n) > 1]))},
            )

        batch_trace_id = TraceIdGenerator.generate_batch_trace()

        item_results: List[AuthItemResult] = []
        passed_count = 0
        rejected_count = 0
        pending_review_count = 0

        for item in batch.items:
            result = self._process_item(batch, item)
            item_results.append(result)

            if self.state_machine.is_passed(result.status):
                passed_count += 1
            elif self.state_machine.is_rejected(result.status):
                rejected_count += 1
            elif result.status == AuthStatus.PENDING_REVIEW:
                pending_review_count += 1

        if pending_review_count > 0:
            batch_status = AuthStatus.PENDING_REVIEW
        elif rejected_count > 0 and passed_count == 0:
            batch_status = AuthStatus.REJECTED
        elif passed_count > 0 and rejected_count == 0:
            batch_status = AuthStatus.PASSED
        else:
            batch_status = AuthStatus.IN_PROGRESS

        batch_result = AuthBatchResult(
            batch_no=batch.batch_no,
            status=batch_status,
            total_count=len(batch.items),
            passed_count=passed_count,
            rejected_count=rejected_count,
            pending_review_count=pending_review_count,
            item_results=item_results,
            batch_trace_id=batch_trace_id,
            review_opinion=batch.review_opinion,
            review_by=batch.review_by,
        )

        self._batch_results[batch.batch_no] = batch_result
        return batch_result

    def _process_item(self, batch: AuthBatch, item: AuthItem) -> AuthItemResult:
        tracker = self._get_or_create_tracker(batch.batch_no, item.item_no)

        if batch.action == ActionType.REPROCESS and tracker.has_been_processed():
            return self._reprocess_item(batch, item, tracker)

        if tracker.has_been_processed() and batch.action not in {
            ActionType.REVIEW_PASS, ActionType.REVIEW_REJECT, ActionType.REPROCESS
        }:
            prev_status = tracker.current_status
            if prev_status not in {AuthStatus.PENDING, AuthStatus.IN_PROGRESS}:
                existing_result = self._build_item_result(item, tracker)
                return existing_result

        eval_result = self.rule_engine.evaluate(item)

        target_status = self._determine_target_status(
            batch.action, eval_result, tracker.current_status
        )

        if eval_result.needs_review and batch.action == ActionType.MANUAL_PASS:
            target_status = AuthStatus.PENDING_REVIEW
            eval_result.reasons.append("高风险或缺材料，必须进入复核流程，不允许直接通过")

        try:
            final_status = self.state_machine.transition(
                tracker.current_status, batch.action, target_status=target_status
            )
        except StateTransitionError as e:
            raise AuthServiceError(
                "STATE_TRANSITION_ERROR",
                f"从 {tracker.current_status.value} 状态执行 {batch.action.value} 操作不合法: {e.message}",
            )

        if final_status == AuthStatus.PENDING_REVIEW and eval_result.needs_review:
            if eval_result.overall_risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
                eval_result.reasons.append(f"综合风险等级为【{eval_result.overall_risk_level.value}】，进入人工复核")
            if eval_result.missing_materials:
                eval_result.reasons.append(f"缺少 {len(eval_result.missing_materials)} 项材料，需补充后复核")

        trace_id = TraceIdGenerator.generate_item_trace()

        self._log_audit_record(
            batch=batch,
            item=item,
            eval_result=eval_result,
            from_status=tracker.current_status,
            to_status=final_status,
            trace_id=trace_id,
        )

        tracker.record_transition(
            from_status=tracker.current_status,
            to_status=final_status,
            action=batch.action,
            operator=batch.operator,
        )

        result = AuthItemResult(
            item_no=item.item_no,
            status=final_status,
            risk_level=eval_result.overall_risk_level,
            risk_score=eval_result.overall_risk_score,
            passed=self.state_machine.is_passed(final_status),
            reasons=eval_result.reasons,
            missing_materials=eval_result.missing_materials,
            triggered_rules=eval_result.triggered_rules,
            reviewed=tracker.has_been_reviewed(),
            review_opinion=batch.review_opinion,
            review_by=batch.review_by,
            trace_id=trace_id,
        )

        return result

    def _determine_target_status(self, action: ActionType,
                                  eval_result: RuleEvaluationResult,
                                  current_status: AuthStatus) -> AuthStatus:
        if action == ActionType.MANUAL_REJECT:
            return AuthStatus.REJECTED

        if action == ActionType.REVIEW_PASS:
            return AuthStatus.REVIEW_PASSED

        if action == ActionType.REVIEW_REJECT:
            return AuthStatus.REVIEW_REJECTED

        if action == ActionType.REPROCESS:
            return AuthStatus.IN_PROGRESS

        if eval_result.needs_review:
            return AuthStatus.PENDING_REVIEW

        if eval_result.can_auto_pass:
            return AuthStatus.PASSED

        return AuthStatus.PENDING_REVIEW

    def _reprocess_item(self, batch: AuthBatch, item: AuthItem,
                         tracker: StateTracker) -> AuthItemResult:
        eval_result = self.rule_engine.evaluate(item)

        try:
            new_status = self.state_machine.transition(
                tracker.current_status, ActionType.REPROCESS
            )
        except StateTransitionError:
            new_status = AuthStatus.IN_PROGRESS

        trace_id = TraceIdGenerator.generate_item_trace()

        self._log_audit_record(
            batch=batch,
            item=item,
            eval_result=eval_result,
            from_status=tracker.current_status,
            to_status=new_status,
            trace_id=trace_id,
        )

        tracker.record_transition(
            from_status=tracker.current_status,
            to_status=new_status,
            action=ActionType.REPROCESS,
            operator=batch.operator,
            remark="重新鉴定",
        )

        return AuthItemResult(
            item_no=item.item_no,
            status=new_status,
            risk_level=eval_result.overall_risk_level,
            risk_score=eval_result.overall_risk_score,
            passed=False,
            reasons=eval_result.reasons + ["重新鉴定中"],
            missing_materials=eval_result.missing_materials,
            triggered_rules=eval_result.triggered_rules,
            reviewed=tracker.has_been_reviewed(),
            trace_id=trace_id,
        )

    def _log_audit_record(self, batch: AuthBatch, item: AuthItem,
                           eval_result: RuleEvaluationResult,
                           from_status: AuthStatus, to_status: AuthStatus,
                           trace_id: str) -> None:
        record = AuditRecord(
            trace_id=trace_id,
            batch_no=batch.batch_no,
            item_no=item.item_no,
            action=batch.action,
            from_status=from_status,
            to_status=to_status,
            operator=batch.operator,
            risk_level_before=item.risk_level,
            risk_level_after=eval_result.overall_risk_level,
            risk_score_before=item.risk_score,
            risk_score_after=eval_result.overall_risk_score,
            reasons=eval_result.reasons,
            triggered_rules=eval_result.triggered_rules,
            review_opinion=batch.review_opinion,
            review_by=batch.review_by,
        )
        self.audit_logger.log(record)

    def _build_item_result(self, item: AuthItem, tracker: StateTracker) -> AuthItemResult:
        eval_result = self.rule_engine.evaluate(item)
        return AuthItemResult(
            item_no=item.item_no,
            status=tracker.current_status,
            risk_level=eval_result.overall_risk_level,
            risk_score=eval_result.overall_risk_score,
            passed=self.state_machine.is_passed(tracker.current_status),
            reasons=eval_result.reasons,
            missing_materials=eval_result.missing_materials,
            triggered_rules=eval_result.triggered_rules,
            reviewed=tracker.has_been_reviewed(),
        )

    def review_item(self, batch_no: str, item_no: str, action: ActionType,
                     review_opinion: str, review_by: str) -> AuthItemResult:
        key = self._get_tracker_key(batch_no, item_no)
        if key not in self._item_trackers:
            raise AuthServiceError("ITEM_NOT_FOUND", f"未找到明细项 {item_no}")

        tracker = self._item_trackers[key]

        if tracker.current_status != AuthStatus.PENDING_REVIEW:
            raise AuthServiceError(
                "INVALID_REVIEW_STATUS",
                f"当前状态 {tracker.current_status.value} 不支持复核操作",
            )

        if action not in {ActionType.REVIEW_PASS, ActionType.REVIEW_REJECT}:
            raise AuthServiceError("INVALID_REVIEW_ACTION", "复核动作必须是 REVIEW_PASS 或 REVIEW_REJECT")

        try:
            new_status = self.state_machine.transition(tracker.current_status, action)
        except StateTransitionError as e:
            raise AuthServiceError("STATE_TRANSITION_ERROR", str(e))

        trace_id = TraceIdGenerator.generate_item_trace()

        record = AuditRecord(
            trace_id=trace_id,
            batch_no=batch_no,
            item_no=item_no,
            action=action,
            from_status=tracker.current_status,
            to_status=new_status,
            operator=review_by,
            review_opinion=review_opinion,
            review_by=review_by,
        )
        self.audit_logger.log(record)

        tracker.record_transition(
            from_status=tracker.current_status,
            to_status=new_status,
            action=action,
            operator=review_by,
            remark=review_opinion,
        )

        return AuthItemResult(
            item_no=item_no,
            status=new_status,
            risk_level=RiskLevel.LOW,
            risk_score=0.0,
            passed=self.state_machine.is_passed(new_status),
            reasons=[f"复核结论：{'通过' if action == ActionType.REVIEW_PASS else '拦截'}，意见：{review_opinion}"],
            reviewed=True,
            review_opinion=review_opinion,
            review_by=review_by,
            trace_id=trace_id,
        )

    def get_item_history(self, batch_no: str, item_no: str) -> List[Dict[str, Any]]:
        return [r.to_dict() for r in self.history_player.get_item_history(batch_no, item_no)]

    def get_batch_result(self, batch_no: str) -> Optional[AuthBatchResult]:
        return self._batch_results.get(batch_no)

    def play_back_item(self, batch_no: str, item_no: str) -> List[Dict[str, Any]]:
        snapshots = self.history_player.play_item_back(batch_no, item_no)
        return [
            {
                "batch_no": s.batch_no,
                "item_no": s.item_no,
                "status": s.status.value,
                "risk_level": s.risk_level.value if s.risk_level else None,
                "risk_score": s.risk_score,
                "reasons": s.reasons,
                "step_index": s.step_index,
                "trace_id": s.trace_id,
                "timestamp": s.timestamp.isoformat(),
            }
            for s in snapshots
        ]

    def get_record_by_trace_id(self, trace_id: str) -> Optional[Dict[str, Any]]:
        record = self.history_player.get_record_by_trace_id(trace_id)
        return record.to_dict() if record else None

    def get_processing_count(self, batch_no: str, item_no: str) -> int:
        return self.history_player.get_processing_count(batch_no, item_no)
