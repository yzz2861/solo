from __future__ import annotations
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from app.models.inventory import (
    InventoryCheckRequest,
    InventoryCheckResponse,
    RuleHitDetail,
    DecisionType,
    HitSource,
    TraceRecord,
    ReviewRecord,
)
from app.services.rule_engine import rule_engine
from app.services.storage import storage


DECISION_LABELS = {
    DecisionType.PASS: "通过",
    DecisionType.BLOCK: "拦截",
    DecisionType.PENDING_REVIEW: "待复核",
}


def _generate_trace_id() -> str:
    return f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8].upper()}"


def _aggregate_decision(hits: List[RuleHitDetail]) -> DecisionType:
    if not hits:
        return DecisionType.PASS

    has_block = any(h.decision == DecisionType.BLOCK for h in hits)
    if has_block:
        return DecisionType.BLOCK

    has_pending = any(h.decision == DecisionType.PENDING_REVIEW for h in hits)
    if has_pending:
        return DecisionType.PENDING_REVIEW

    return DecisionType.PASS


def _build_reason_summary(hits: List[RuleHitDetail], decision: DecisionType) -> str:
    if decision == DecisionType.PASS:
        return "所有校验规则通过，盘点结果合规"

    reasons = []
    for hit in hits:
        if hit.decision == DecisionType.BLOCK:
            reasons.append(f"【拦截】{hit.reason_message}")
        elif hit.decision == DecisionType.PENDING_REVIEW:
            reasons.append(f"【待复核】{hit.reason_message}")

    if not reasons:
        reasons = [h.reason_message for h in hits]

    return "；".join(reasons)


def _check_duplicate(business_no: str, rule_version: str) -> Tuple[bool, Optional[str]]:
    is_dup = storage.is_duplicate_submission(business_no, rule_version)
    original_id = storage.get_original_trace_id(business_no) if is_dup else None
    return is_dup, original_id


def _build_duplicate_hit(original_trace_id: str, rule_version: str) -> RuleHitDetail:
    return RuleHitDetail(
        rule_id="SYS-DUP-001",
        rule_name="重复提交检测",
        rule_version=rule_version,
        hit_source=HitSource.DUPLICATE_SUBMISSION,
        decision=DecisionType.PASS,
        reason_code="DUPLICATE_SUBMISSION",
        reason_message=f"检测到重复提交，首次提交追溯号：{original_trace_id}",
        evidence={"original_trace_id": original_trace_id},
    )


def perform_inventory_check(request: InventoryCheckRequest) -> InventoryCheckResponse:
    check_time = datetime.now()
    trace_id = _generate_trace_id()

    is_duplicate, original_trace_id = _check_duplicate(request.business_no, request.rule_version)

    hits = rule_engine.evaluate(request)

    if is_duplicate and original_trace_id:
        dup_hit = _build_duplicate_hit(original_trace_id, request.rule_version)
        hits.insert(0, dup_hit)

    decision = _aggregate_decision(hits)

    if is_duplicate and original_trace_id:
        original = storage.get_by_trace_id(original_trace_id)
        if original and not any(h.hit_source == HitSource.DUPLICATE_SUBMISSION and h.decision == DecisionType.BLOCK for h in hits):
            decision = original.decision

    reason_summary = _build_reason_summary(hits, decision)

    review_required = decision == DecisionType.PENDING_REVIEW
    review_deadline = None
    if review_required:
        review_deadline = check_time + timedelta(hours=48)

    response = InventoryCheckResponse(
        trace_id=trace_id,
        business_no=request.business_no,
        decision=decision,
        decision_label=DECISION_LABELS.get(decision, decision.value),
        reason_summary=reason_summary,
        hit_details=hits,
        is_duplicate=is_duplicate,
        original_trace_id=original_trace_id,
        rule_version=request.rule_version,
        operator=request.operator,
        check_time=check_time,
        review_required=review_required,
        review_deadline=review_deadline,
    )

    storage.save_check_result(response)

    return response


def get_trace_record(trace_id: str) -> Optional[TraceRecord]:
    return storage.get_by_trace_id(trace_id)


def list_by_business_no(business_no: str) -> List[TraceRecord]:
    return storage.list_by_business_no(business_no)


def perform_review(
    trace_id: str,
    reviewer: str,
    final_decision: DecisionType,
    review_comment: str,
) -> Optional[ReviewRecord]:
    record = storage.get_by_trace_id(trace_id)
    if not record:
        return None

    review = ReviewRecord(
        trace_id=trace_id,
        business_no=record.business_no,
        reviewer=reviewer,
        review_time=datetime.now(),
        original_decision=record.decision,
        final_decision=final_decision,
        review_comment=review_comment,
        rule_version=record.rule_version,
    )

    storage.save_review(review)

    return review


def replay_history(business_no: str) -> List[TraceRecord]:
    return storage.list_by_business_no(business_no)


def get_available_rule_versions() -> List[str]:
    return rule_engine.get_available_versions()
