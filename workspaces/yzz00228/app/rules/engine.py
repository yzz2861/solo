from typing import List, Optional
from dataclasses import dataclass
from ..models.item import AuthItem
from ..models.enums import RiskLevel, AuthStatus
from .base import BaseRule, RuleChain, RuleResult
from .risk_rules import ChannelRiskRule, ValueRiskRule, CategoryRiskRule, SerialNumberRule
from .material_rules import MaterialIntegrityRule, MaterialVerifiedRule, AppraisalReportRule


@dataclass
class RuleEvaluationResult:
    overall_risk_score: float
    overall_risk_level: RiskLevel
    needs_review: bool
    can_auto_pass: bool
    triggered_rules: List[str]
    reasons: List[str]
    missing_materials: List[str]
    rule_results: List[RuleResult]


class RuleEngine:
    def __init__(self, rules: Optional[List[BaseRule]] = None):
        if rules is None:
            rules = self._default_rules()
        self.rule_chain = RuleChain(rules)

    def _default_rules(self) -> List[BaseRule]:
        return [
            ChannelRiskRule(),
            ValueRiskRule(),
            CategoryRiskRule(),
            SerialNumberRule(),
            MaterialIntegrityRule(),
            MaterialVerifiedRule(),
            AppraisalReportRule(),
        ]

    RULE_WEIGHTS = {
        "RULE_CHANNEL_001": 2.5,
        "RULE_VALUE_001": 2.0,
        "RULE_CATEGORY_001": 1.0,
        "RULE_SERIAL_001": 1.0,
        "RULE_MATERIAL_001": 2.5,
        "RULE_MATERIAL_002": 1.5,
        "RULE_MATERIAL_003": 1.5,
    }

    def evaluate(self, item: AuthItem) -> RuleEvaluationResult:
        rule_results = self.rule_chain.evaluate(item)

        weighted_score = 0.0
        total_weight = 0.0
        max_score = 0.0
        max_risk = RiskLevel.LOW
        all_reasons: List[str] = []
        all_missing: List[str] = []
        triggered: List[str] = []

        risk_priority = {
            RiskLevel.LOW: 0,
            RiskLevel.MEDIUM: 1,
            RiskLevel.HIGH: 2,
            RiskLevel.CRITICAL: 3,
        }

        has_failed_rule = False
        has_high_risk = False
        has_critical_risk = False
        has_missing_materials = False

        for result in rule_results:
            weight = self.RULE_WEIGHTS.get(result.rule_code, 1.0)
            weighted_score += result.risk_score * weight
            total_weight += weight

            if result.risk_score > max_score:
                max_score = result.risk_score

            if result.risk_level and risk_priority[result.risk_level] > risk_priority[max_risk]:
                max_risk = result.risk_level

            if result.risk_level == RiskLevel.HIGH:
                has_high_risk = True
            if result.risk_level == RiskLevel.CRITICAL:
                has_critical_risk = True

            if not result.passed:
                has_failed_rule = True
                triggered.append(result.rule_code)

            all_reasons.extend(result.reasons)
            all_missing.extend(result.missing_materials)

            if result.missing_materials:
                has_missing_materials = True

        overall_score = (weighted_score / total_weight) if total_weight > 0 else 0.0
        overall_score = max(overall_score, max_score * 0.7)
        overall_score = round(overall_score, 2)

        needs_review = has_high_risk or has_critical_risk or has_missing_materials or overall_score >= 45.0
        can_auto_pass = not needs_review and overall_score < 35.0 and not has_failed_rule

        return RuleEvaluationResult(
            overall_risk_score=round(overall_score, 2),
            overall_risk_level=max_risk,
            needs_review=needs_review,
            can_auto_pass=can_auto_pass,
            triggered_rules=triggered,
            reasons=all_reasons,
            missing_materials=all_missing,
            rule_results=rule_results,
        )

    def determine_status(self, eval_result: RuleEvaluationResult, action: str = "auto_auth") -> AuthStatus:
        if action == "manual_pass":
            if eval_result.needs_review:
                return AuthStatus.PENDING_REVIEW
            return AuthStatus.PASSED

        if action == "manual_reject":
            return AuthStatus.REJECTED

        if eval_result.needs_review:
            return AuthStatus.PENDING_REVIEW

        if eval_result.can_auto_pass:
            return AuthStatus.PASSED

        return AuthStatus.PENDING_REVIEW
