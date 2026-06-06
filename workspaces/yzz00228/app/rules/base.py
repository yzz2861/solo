from abc import ABC, abstractmethod
from typing import List, Optional
from dataclasses import dataclass, field
from ..models.item import AuthItem
from ..models.enums import RiskLevel


@dataclass
class RuleResult:
    rule_name: str
    rule_code: str
    passed: bool
    risk_score: float = 0.0
    risk_level: Optional[RiskLevel] = None
    reasons: List[str] = field(default_factory=list)
    missing_materials: List[str] = field(default_factory=list)


class BaseRule(ABC):
    name: str = "base_rule"
    code: str = "RULE_000"
    description: str = "基础规则"

    @abstractmethod
    def evaluate(self, item: AuthItem) -> RuleResult:
        pass


class RuleChain:
    def __init__(self, rules: Optional[List[BaseRule]] = None):
        self.rules: List[BaseRule] = rules or []

    def add_rule(self, rule: BaseRule) -> None:
        self.rules.append(rule)

    def add_rules(self, rules: List[BaseRule]) -> None:
        self.rules.extend(rules)

    def evaluate(self, item: AuthItem) -> List[RuleResult]:
        results = []
        for rule in self.rules:
            result = rule.evaluate(item)
            results.append(result)
        return results
