from __future__ import annotations

from typing import Dict, List, Tuple

from .types import (
    ISSUE_KIND_DEFAULT_SEVERITY,
    Issue,
    IssueKind,
    IssueSeverity,
    SEVERITY_WEIGHT,
    SimilarDrug,
    Template,
    UnitRule,
    VariableRule,
)
from .validators.default_missing import check_default_missing
from .validators.forbidden_expr import check_forbidden_expressions
from .validators.unclosed_var import check_multiline_variable, check_unclosed_variables
from .validators.unit_consistency import check_unit_consistency, check_unit_consistency_single


def compute_risk_score(issues: List[Issue]) -> int:
    score = 0
    for issue in issues:
        score += SEVERITY_WEIGHT.get(issue.severity, 1)
        if issue.kind == IssueKind.FORBIDDEN_EXPR:
            score += 5
        elif issue.kind == IssueKind.UNIT_INCONSISTENT:
            score += 3
    return score


def run_checks(
    templates: List[Template],
    variable_rules: Dict[str, VariableRule],
    unit_rules: Dict[str, UnitRule],
    forbidden_rules: List,
    similar_drugs: List[SimilarDrug],
) -> None:
    cross_template_data = [
        (t.path, t.content) for t in templates if not t.is_discontinued
    ]
    cross_issues = check_unit_consistency(cross_template_data, unit_rules, similar_drugs)

    for template in templates:
        all_issues: List[Issue] = []

        all_issues.extend(check_unclosed_variables(template.content))
        all_issues.extend(check_multiline_variable(template.content))
        all_issues.extend(check_default_missing(template.content, variable_rules))
        all_issues.extend(check_unit_consistency_single(template.content, unit_rules))
        all_issues.extend(check_forbidden_expressions(template.content, forbidden_rules))

        if template.path in cross_issues:
            all_issues.extend(cross_issues[template.path])

        template.issues = all_issues
        template.risk_score = compute_risk_score(all_issues)


def sort_by_risk(templates: List[Template]) -> List[Template]:
    active = [t for t in templates if not t.is_discontinued]
    reference = [t for t in templates if t.is_discontinued]
    active.sort(key=lambda t: t.risk_score, reverse=True)
    reference.sort(key=lambda t: t.risk_score, reverse=True)
    return active + reference
