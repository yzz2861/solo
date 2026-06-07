from ..models import CompensationRule, RuleSet, RiskLevel, Conclusion, NextAction


def create_default_rules() -> RuleSet:
    rule_set = RuleSet()

    rule_set.add_rule(CompensationRule(
        rule_id="RULE_LOW_001",
        version="v1.0",
        description="低风险小额补偿-快速通过",
        applicable_statuses=["PENDING_PROCESS", "PROCESSING"],
        applicable_time_windows=["WORKING_HOURS", "ANYTIME"],
        risk_level=RiskLevel.LOW,
        conclusion=Conclusion.APPROVE,
        next_action=NextAction.AUTO_COMPENSATE,
        max_amount=500.0,
        requires_materials=["complaint_form"],
        conditions={"complaint_type": "一般投诉"}
    ))

    rule_set.add_rule(CompensationRule(
        rule_id="RULE_MED_001",
        version="v1.0",
        description="中风险补偿-需人工复核",
        applicable_statuses=["PENDING_PROCESS", "PROCESSING"],
        applicable_time_windows=["WORKING_HOURS", "ANYTIME"],
        risk_level=RiskLevel.MEDIUM,
        conclusion=Conclusion.APPROVE,
        next_action=NextAction.AUTO_COMPENSATE,
        max_amount=2000.0,
        requires_materials=["complaint_form", "evidence"],
        conditions={"complaint_type": "服务投诉"}
    ))

    rule_set.add_rule(CompensationRule(
        rule_id="RULE_HIGH_001",
        version="v1.0",
        description="高风险大额补偿-必须复核",
        applicable_statuses=["PENDING_PROCESS", "PROCESSING"],
        applicable_time_windows=["WORKING_HOURS"],
        risk_level=RiskLevel.HIGH,
        conclusion=Conclusion.REVIEW,
        next_action=NextAction.MANUAL_REVIEW,
        max_amount=10000.0,
        requires_materials=["complaint_form", "evidence", "approval_doc"],
        conditions={"complaint_type": "重大投诉"}
    ))

    rule_set.add_rule(CompensationRule(
        rule_id="RULE_REJECT_001",
        version="v1.0",
        description="无效投诉-直接拒绝",
        applicable_statuses=["PENDING_PROCESS"],
        applicable_time_windows=["ANYTIME"],
        risk_level=RiskLevel.LOW,
        conclusion=Conclusion.REJECT,
        next_action=NextAction.REJECT_AND_NOTIFY,
        conditions={"complaint_type": "无效投诉"}
    ))

    rule_set.add_rule(CompensationRule(
        rule_id="RULE_LOW_002",
        version="v2.0",
        description="v2低风险快速通过",
        applicable_statuses=["PENDING_PROCESS", "PROCESSING"],
        applicable_time_windows=["WORKING_HOURS", "ANYTIME", "WEEKEND"],
        risk_level=RiskLevel.LOW,
        conclusion=Conclusion.APPROVE,
        next_action=NextAction.AUTO_COMPENSATE,
        max_amount=1000.0,
        requires_materials=["complaint_form"]
    ))

    rule_set.add_rule(CompensationRule(
        rule_id="RULE_HIGH_002",
        version="v2.0",
        description="v2高风险豪华酒店补偿",
        applicable_statuses=["PENDING_PROCESS", "PROCESSING"],
        applicable_time_windows=["WORKING_HOURS"],
        risk_level=RiskLevel.HIGH,
        conclusion=Conclusion.REVIEW,
        next_action=NextAction.MANUAL_REVIEW,
        max_amount=50000.0,
        requires_materials=["complaint_form", "evidence", "approval_doc", "manager_signoff"],
        conditions={"hotel_level": "五星"}
    ))

    return rule_set
