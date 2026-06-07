import json
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class Rule:
    id: str
    name: str
    field: str
    operator: str
    value: str
    action: str = "flag"
    severity: str = "error"
    message: str = ""

    def matches(self, record) -> bool:
        val = record.get(self.field, "").strip()
        if not val:
            return False
        return self._compare(val, self.value)

    def _compare(self, actual: str, expected: str) -> bool:
        op = self.operator.lower()
        if op == "equals" or op == "eq":
            return actual == expected
        elif op == "not_equals" or op == "ne":
            return actual != expected
        elif op == "contains":
            return expected in actual
        elif op == "not_contains":
            return expected not in actual
        elif op == "in":
            return actual in [x.strip() for x in expected.split(",")]
        elif op == "not_in":
            return actual not in [x.strip() for x in expected.split(",")]
        elif op == "greater_than" or op == "gt":
            try:
                return float(actual) > float(expected)
            except (ValueError, TypeError):
                return False
        elif op == "less_than" or op == "lt":
            try:
                return float(actual) < float(expected)
            except (ValueError, TypeError):
                return False
        elif op == "greater_equal" or op == "ge":
            try:
                return float(actual) >= float(expected)
            except (ValueError, TypeError):
                return False
        elif op == "less_equal" or op == "le":
            try:
                return float(actual) <= float(expected)
            except (ValueError, TypeError):
                return False
        elif op == "regex" or op == "match":
            import re
            try:
                return bool(re.search(expected, actual))
            except re.error:
                return False
        elif op == "starts_with":
            return actual.startswith(expected)
        elif op == "ends_with":
            return actual.endswith(expected)
        return False


@dataclass
class RequiredField:
    name: str
    allow_empty: bool = False
    description: str = ""


class RuleEngine:
    def __init__(self, rules: List[Rule], required_fields: List[RequiredField]):
        self.rules = rules
        self.required_fields = required_fields

    @classmethod
    def from_config(cls, config_path: str) -> "RuleEngine":
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

        rules = []
        for r in config.get("rules", []):
            rules.append(Rule(
                id=r.get("id", ""),
                name=r.get("name", ""),
                field=r.get("field", ""),
                operator=r.get("operator", "equals"),
                value=str(r.get("value", "")),
                action=r.get("action", "flag"),
                severity=r.get("severity", "error"),
                message=r.get("message", ""),
            ))

        required = []
        for rf in config.get("required_fields", []):
            if isinstance(rf, str):
                required.append(RequiredField(name=rf))
            else:
                required.append(RequiredField(
                    name=rf.get("name", ""),
                    allow_empty=rf.get("allow_empty", False),
                    description=rf.get("description", ""),
                ))

        return cls(rules, required)

    def check_required_fields(self, record) -> List[str]:
        missing = []
        for rf in self.required_fields:
            if not rf.allow_empty and not record.has_field(rf.name):
                desc = rf.description or rf.name
                missing.append(f"缺少必填字段: {desc}({rf.name})")
        return missing

    def check_rules(self, record) -> List[Rule]:
        matched = []
        for rule in self.rules:
            if rule.matches(record):
                matched.append(rule)
        return matched

    def get_conflicting_rules(self, record) -> List[Rule]:
        matched = self.check_rules(record)
        return [r for r in matched if r.action == "reject" or r.severity == "error"]


def load_rule_config(config_path: str) -> Dict[str, Any]:
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)
