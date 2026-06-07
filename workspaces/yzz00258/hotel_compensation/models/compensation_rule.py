from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Conclusion(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    REVIEW = "REVIEW"


class NextAction(str, Enum):
    AUTO_COMPENSATE = "AUTO_COMPENSATE"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    REJECT_AND_NOTIFY = "REJECT_AND_NOTIFY"
    SUPPLEMENT_MATERIALS = "SUPPLEMENT_MATERIALS"


@dataclass
class CompensationRule:
    rule_id: str
    version: str
    description: str
    applicable_statuses: List[str]
    applicable_time_windows: List[str]
    risk_level: RiskLevel
    conclusion: Conclusion
    next_action: NextAction
    conditions: Dict[str, Any] = field(default_factory=dict)
    max_amount: Optional[float] = None
    requires_materials: List[str] = field(default_factory=list)
    enabled: bool = True

    def matches(self, obj: 'CompensationObject') -> bool:
        if not self.enabled:
            return False
        if obj.rule_version != self.version:
            return False
        if obj.object_status not in self.applicable_statuses:
            return False
        if obj.time_window not in self.applicable_time_windows:
            return False
        if self.max_amount is not None and obj.compensation_amount is not None:
            if obj.compensation_amount > self.max_amount:
                return False
        if self.conditions:
            for key, expected in self.conditions.items():
                actual = getattr(obj, key, None)
                if actual != expected:
                    return False
        return True


@dataclass
class RuleSet:
    rules: List[CompensationRule] = field(default_factory=list)

    def add_rule(self, rule: CompensationRule) -> None:
        self.rules.append(rule)

    def find_matching_rule(self, obj: 'CompensationObject') -> Optional[CompensationRule]:
        for rule in self.rules:
            if rule.matches(obj):
                return rule
        return None

    def get_rules_by_version(self, version: str) -> List[CompensationRule]:
        return [r for r in self.rules if r.version == version]
