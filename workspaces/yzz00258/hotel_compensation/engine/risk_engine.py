from typing import List, Tuple
from ..models import CompensationObject, CompensationRule, RiskLevel


class RiskEngine:
    def __init__(self):
        self.high_risk_factors = [
            "amount_exceeds_threshold",
            "complaint_severity_high",
            "repeat_complaint",
            "hotel_level_luxury"
        ]

    def assess(self, obj: CompensationObject, rule: CompensationRule = None) -> Tuple[RiskLevel, List[str]]:
        risk_factors = []

        if obj.compensation_amount and obj.compensation_amount > 5000:
            risk_factors.append("amount_exceeds_threshold")

        if obj.complaint_type and "重大" in str(obj.complaint_type):
            risk_factors.append("complaint_severity_high")

        if obj.hotel_level and obj.hotel_level in ["五星", "豪华", "LUXURY"]:
            risk_factors.append("hotel_level_luxury")

        if rule and rule.risk_level == RiskLevel.HIGH:
            risk_factors.append("rule_high_risk")

        if rule and rule.risk_level == RiskLevel.LOW and not risk_factors:
            return RiskLevel.LOW, risk_factors

        if len(risk_factors) >= 2 or (rule and rule.risk_level == RiskLevel.HIGH):
            return RiskLevel.HIGH, risk_factors
        elif len(risk_factors) == 1:
            return RiskLevel.MEDIUM, risk_factors
        else:
            return RiskLevel.LOW, risk_factors

    def is_high_risk(self, obj: CompensationObject, rule: CompensationRule = None) -> bool:
        level, _ = self.assess(obj, rule)
        return level == RiskLevel.HIGH
