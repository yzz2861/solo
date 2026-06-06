"""规则执行引擎

整合所有规则，统一执行入口。
"""
from typing import List, Optional
from dataclasses import dataclass, field

from ..objects.models import DetailItem, RiskTag
from ..objects.enums import (
    RiskLevel,
    BusinessConclusion,
    NextAction,
    SourceChannel,
    ProcessAction,
)
from .material_rules import MaterialRuleEngine, MaterialCheckResult
from .risk_rules import RiskRuleEngine, RiskAssessmentResult
from .exceptions import RuleViolationError, RuleConflictError


@dataclass
class RuleExecutionResult:
    """规则执行结果"""
    business_conclusion: BusinessConclusion = BusinessConclusion.PASSED
    next_action: NextAction = NextAction.COMPLETE
    risk_tags: List[RiskTag] = field(default_factory=list)
    missing_items: List[str] = field(default_factory=list)
    risk_level: RiskLevel = RiskLevel.LOW
    material_check_result: Optional[MaterialCheckResult] = None
    risk_assessment_result: Optional[RiskAssessmentResult] = None
    message: str = ""
    require_review: bool = False
    rule_conflicts: List[str] = field(default_factory=list)


class RuleEngine:
    """综合规则引擎

    统一执行材料检查、风险评估、合规检查等所有规则，
    并输出最终业务结论。
    """

    def __init__(self):
        self.material_engine = MaterialRuleEngine()
        self.risk_engine = RiskRuleEngine()

    def execute(
        self,
        items: List[DetailItem],
        source_channel: SourceChannel,
        process_action: ProcessAction,
        review_opinion: Optional[str] = None,
    ) -> RuleExecutionResult:
        """执行所有规则

        Args:
            items: 明细项列表
            source_channel: 来源渠道
            process_action: 处理动作
            review_opinion: 复核意见

        Returns:
            RuleExecutionResult: 规则执行结果

        Raises:
            RuleViolationError: 规则违反
            RuleConflictError: 规则冲突
        """
        result = RuleExecutionResult()

        material_result = self.material_engine.check_materials(items, source_channel)
        result.material_check_result = material_result
        result.missing_items = material_result.missing_items

        risk_result = self.risk_engine.assess_risk(items, source_channel)
        result.risk_assessment_result = risk_result
        result.risk_tags = risk_result.risk_tags
        result.risk_level = risk_result.overall_risk_level

        result = self._derive_conclusion(
            result, process_action, review_opinion
        )

        return result

    def _derive_conclusion(
        self,
        result: RuleExecutionResult,
        process_action: ProcessAction,
        review_opinion: Optional[str],
    ) -> RuleExecutionResult:
        """推导业务结论和下一步动作

        核心规则：
        1. 高风险 -> 必须进入复核，不允许直接通过
        2. 缺材料 -> 必须补材料，不允许直接通过
        3. 正常 -> 可直接通过
        4. 有复核意见 -> 按复核结论处理
        """
        has_high_risk = result.risk_level == RiskLevel.HIGH
        has_missing = len(result.missing_items) > 0

        if process_action == ProcessAction.APPROVE:
            if has_high_risk and not review_opinion:
                raise RuleViolationError(
                    rule_id="RULE_001",
                    rule_name="高风险必复核",
                    message="高风险送达回证必须经过复核才能通过",
                )
            if has_missing and not review_opinion:
                raise RuleViolationError(
                    rule_id="RULE_002",
                    rule_name="缺材料必补全",
                    message=f"缺失材料{result.missing_items}，必须补全或经过复核",
                )

        if process_action == ProcessAction.REVIEW and review_opinion:
            result.message = f"复核完成：{review_opinion}"
            if "通过" in review_opinion or "同意" in review_opinion:
                result.business_conclusion = BusinessConclusion.PASSED
                result.next_action = NextAction.ARCHIVE
                result.require_review = False
            elif "驳回" in review_opinion or "拒绝" in review_opinion:
                result.business_conclusion = BusinessConclusion.REJECTED
                result.next_action = NextAction.COMPLETE
                result.require_review = False
            elif "补材料" in review_opinion or "补充" in review_opinion:
                result.business_conclusion = BusinessConclusion.PENDING_SUPPLEMENT
                result.next_action = NextAction.SUPPLY_MATERIALS
                result.require_review = False
            else:
                result.business_conclusion = BusinessConclusion.PENDING_REVIEW
                result.next_action = NextAction.WAIT_REVIEW
                result.require_review = True
            return result

        if has_high_risk and has_missing:
            result.business_conclusion = BusinessConclusion.PENDING_REVIEW
            result.next_action = NextAction.WAIT_REVIEW
            result.require_review = True
            result.message = f"高风险且缺失材料{result.missing_items}，需复核确认"
            return result

        if has_high_risk:
            result.business_conclusion = BusinessConclusion.PENDING_REVIEW
            result.next_action = NextAction.WAIT_REVIEW
            result.require_review = True
            result.message = "存在高风险项，必须进入复核流程"
            return result

        if has_missing:
            result.business_conclusion = BusinessConclusion.PENDING_SUPPLEMENT
            result.next_action = NextAction.SUPPLY_MATERIALS
            result.require_review = False
            result.message = f"缺失材料{result.missing_items}，请补充"
            return result

        if process_action == ProcessAction.SUBMIT:
            result.business_conclusion = BusinessConclusion.PASSED
            result.next_action = NextAction.COMPLETE
            result.require_review = False
            result.message = "材料齐全，风险等级低，处理通过"
        elif process_action == ProcessAction.APPROVE:
            result.business_conclusion = BusinessConclusion.PASSED
            result.next_action = NextAction.ARCHIVE
            result.require_review = False
            result.message = "审批通过"
        elif process_action == ProcessAction.REJECT:
            result.business_conclusion = BusinessConclusion.REJECTED
            result.next_action = NextAction.COMPLETE
            result.require_review = False
            result.message = "审批驳回"
        elif process_action == ProcessAction.SUPPLEMENT:
            result.business_conclusion = BusinessConclusion.PASSED
            result.next_action = NextAction.COMPLETE
            result.require_review = False
            result.message = "材料补充完成"

        return result

    def validate_review_requirement(
        self,
        items: List[DetailItem],
        source_channel: SourceChannel,
        process_action: ProcessAction,
    ) -> bool:
        """验证是否需要复核

        用于重复处理场景的前置检查。
        """
        material_result = self.material_engine.check_materials(items, source_channel)
        risk_result = self.risk_engine.assess_risk(items, source_channel)

        has_high_risk = risk_result.overall_risk_level == RiskLevel.HIGH
        has_missing = len(material_result.missing_items) > 0

        if process_action == ProcessAction.APPROVE and (has_high_risk or has_missing):
            return True

        return has_high_risk
