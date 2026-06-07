from abc import ABC, abstractmethod
from typing import List, Any, Optional
from app.domain import CriticalValueReceipt, ReceiptStatus, RiskLevel


class RuleResult:
    def __init__(self):
        self.passed: bool = True
        self.failure_reasons: List[str] = []
        self.risk_tags: List[str] = []
        self.missing_materials: List[str] = []
        self.need_review: bool = False
        self.target_status: Optional[ReceiptStatus] = None

    def add_failure(self, reason: str):
        self.failure_reasons.append(reason)
        self.passed = False

    def add_risk_tag(self, tag: str):
        if tag not in self.risk_tags:
            self.risk_tags.append(tag)

    def add_missing_material(self, material: str):
        if material not in self.missing_materials:
            self.missing_materials.append(material)

    def merge(self, other: "RuleResult"):
        self.passed = self.passed and other.passed
        self.failure_reasons.extend(other.failure_reasons)
        for tag in other.risk_tags:
            self.add_risk_tag(tag)
        for mat in other.missing_materials:
            self.add_missing_material(mat)
        self.need_review = self.need_review or other.need_review
        if other.target_status and not self.target_status:
            self.target_status = other.target_status


class BaseRule(ABC):
    name: str = "base_rule"

    @abstractmethod
    def apply(self, receipt: CriticalValueReceipt, context: dict = None) -> RuleResult:
        pass


class RuleEngine:
    def __init__(self):
        self._rules: List[BaseRule] = []

    def register(self, rule: BaseRule):
        self._rules.append(rule)

    def register_all(self, rules: List[BaseRule]):
        self._rules.extend(rules)

    def execute(self, receipt: CriticalValueReceipt, context: dict = None) -> RuleResult:
        combined = RuleResult()
        for rule in self._rules:
            result = rule.apply(receipt, context or {})
            combined.merge(result)
        return combined
