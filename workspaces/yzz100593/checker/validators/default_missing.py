from __future__ import annotations

import re
from typing import Dict, List, Set

from ..types import (
    BRACKET_PAIRS,
    CLOSE_BRACKETS,
    OPEN_BRACKETS,
    Issue,
    IssueKind,
    IssueSeverity,
    VariableRule,
)

_VAR_RE = re.compile(
    r'[{【〔〖《](.*?)[】〕〗》}]'
    r'|[{](.*?)[}]',
    re.DOTALL,
)


def _extract_variables(content: str) -> List[tuple]:
    results: List[tuple] = []
    lines = content.splitlines()
    for line_idx, line in enumerate(lines):
        line_num = line_idx + 1
        for open_b, close_b in [("【", "】"), ("{", "}"), ("〔", "〕"), ("〖", "〗"), ("《", "》")]:
            pattern = re.escape(open_b) + r'(.*?)' + re.escape(close_b)
            for m in re.finditer(pattern, line):
                var_name = m.group(1).strip()
                if var_name:
                    results.append((var_name, line_num, m.start() + 1, line.strip()))
    return results


def check_default_missing(
    content: str, variable_rules: Dict[str, VariableRule]
) -> List[Issue]:
    issues: List[Issue] = []
    found_vars = _extract_variables(content)
    seen: Set[str] = set()

    for var_name, line_num, col, context in found_vars:
        if var_name in seen:
            continue
        seen.add(var_name)

        if var_name in variable_rules:
            rule = variable_rules[var_name]
            if rule.required and rule.default is None:
                issues.append(
                    Issue(
                        kind=IssueKind.DEFAULT_MISSING,
                        severity=IssueSeverity.WARNING,
                        line=line_num,
                        col=col,
                        message=f"必填变量 '{var_name}' 没有默认值",
                        context=context,
                    )
                )
        else:
            issues.append(
                Issue(
                    kind=IssueKind.DEFAULT_MISSING,
                    severity=IssueSeverity.WARNING,
                    line=line_num,
                    col=col,
                    message=f"变量 '{var_name}' 不在变量规则定义中，无法确认是否有默认值",
                    context=context,
                )
            )

    for rule_name, rule in variable_rules.items():
        if rule_name not in seen and rule.required and rule.default is None:
            issues.append(
                Issue(
                    kind=IssueKind.DEFAULT_MISSING,
                    severity=IssueSeverity.WARNING,
                    line=0,
                    col=0,
                    message=f"规则要求的变量 '{rule_name}' 在模板中未出现且无默认值",
                    context="",
                )
            )

    return issues
