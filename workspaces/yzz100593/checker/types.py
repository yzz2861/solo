from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple


class IssueSeverity(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class IssueKind(Enum):
    UNCLOSED_VAR = "unclosed_var"
    DEFAULT_MISSING = "default_missing"
    UNIT_INCONSISTENT = "unit_inconsistent"
    FORBIDDEN_EXPR = "forbidden_expr"


class TemplateStatus(Enum):
    ACTIVE = "active"
    DISCONTINUED = "discontinued"


SEVERITY_WEIGHT = {
    IssueSeverity.ERROR: 10,
    IssueSeverity.WARNING: 5,
    IssueSeverity.INFO: 1,
}

ISSUE_KIND_DEFAULT_SEVERITY = {
    IssueKind.UNCLOSED_VAR: IssueSeverity.ERROR,
    IssueKind.DEFAULT_MISSING: IssueSeverity.WARNING,
    IssueKind.UNIT_INCONSISTENT: IssueSeverity.ERROR,
    IssueKind.FORBIDDEN_EXPR: IssueSeverity.ERROR,
}

ISSUE_KIND_LABEL = {
    IssueKind.UNCLOSED_VAR: "未闭合变量",
    IssueKind.DEFAULT_MISSING: "默认值缺失",
    IssueKind.UNIT_INCONSISTENT: "剂量单位不一致",
    IssueKind.FORBIDDEN_EXPR: "禁用表述",
}


@dataclass
class Issue:
    kind: IssueKind
    severity: IssueSeverity
    line: int
    col: int
    message: str
    context: str = ""


@dataclass
class VariableRule:
    name: str
    required: bool = True
    default: Optional[str] = None
    allowed_units: List[str] = field(default_factory=list)
    description: str = ""


@dataclass
class UnitRule:
    canonical: str
    aliases: List[str] = field(default_factory=list)
    category: str = ""


@dataclass
class ForbiddenRule:
    pattern: str
    reason: str
    is_regex: bool = False


@dataclass
class SimilarDrug:
    canonical: str
    variants: List[str] = field(default_factory=list)


@dataclass
class Template:
    path: str
    name: str
    department: str = ""
    status: TemplateStatus = TemplateStatus.ACTIVE
    content: str = ""
    issues: List[Issue] = field(default_factory=list)
    risk_score: int = 0

    @property
    def is_discontinued(self) -> bool:
        return self.status == TemplateStatus.DISCONTINUED


@dataclass
class CheckResult:
    templates: List[Template] = field(default_factory=list)
    batch_id: str = ""
    timestamp: str = ""

    @property
    def active_templates(self) -> List[Template]:
        return [t for t in self.templates if not t.is_discontinued]

    @property
    def reference_templates(self) -> List[Template]:
        return [t for t in self.templates if t.is_discontinued]

    @property
    def total_issues(self) -> int:
        return sum(len(t.issues) for t in self.templates)

    @property
    def error_count(self) -> int:
        return sum(
            1 for t in self.templates for i in t.issues if i.severity == IssueSeverity.ERROR
        )

    @property
    def warning_count(self) -> int:
        return sum(
            1 for t in self.templates for i in t.issues if i.severity == IssueSeverity.WARNING
        )


BRACKET_PAIRS = {
    "{": "}",
    "【": "】",
    "〔": "〕",
    "〖": "〗",
    "《": "》",
}

OPEN_BRACKETS = set(BRACKET_PAIRS.keys())
CLOSE_BRACKETS = set(BRACKET_PAIRS.values())

ALL_CLOSE_FOR_OPEN: Dict[str, set] = {}
for _o, _c in BRACKET_PAIRS.items():
    ALL_CLOSE_FOR_OPEN.setdefault(_o, set()).add(_c)
    for _o2, _c2 in BRACKET_PAIRS.items():
        if _o2 != _o:
            ALL_CLOSE_FOR_OPEN[_o].add(_c2)

VARIABLE_PATTERN_GROUPS = [
    (r"{", r"}"),
    (r"【", r"】"),
]
