from __future__ import annotations

import re
from typing import List

from ..types import ForbiddenRule, Issue, IssueKind, IssueSeverity

_PLACEHOLDER_PATTERNS = [
    (r"XXX+", "连续占位符 XXX"),
    (r"xxx+", "连续占位符 xxx"),
    (r"〇+", "连续占位符 〇"),
    (r"待填写", "待填写占位符"),
    (r"待补充", "待补充占位符"),
    (r"TODO", "TODO 占位符"),
    (r"FIXME", "FIXME 占位符"),
    (r"TBD", "TBD 占位符"),
    (r"__+", "下划线占位符"),
    (r"……+", "省略号占位符"),
    (r"填入", "填入提示占位符"),
    (r"请输入", "请输入提示占位符"),
    (r"请填写", "请填写提示占位符"),
    (r"示例[:：]", "示例占位符"),
    (r"同上", "同上占位符（复制模板遗留）"),
    (r"复制修改", "复制修改提示占位符"),
]


def _is_span_covered(span: tuple, reported_spans: set) -> bool:
    s, e = span
    for rs, re_ in reported_spans:
        if rs <= s and e <= re_:
            return True
    return False


def check_forbidden_expressions(
    content: str, forbidden_rules: List[ForbiddenRule]
) -> List[Issue]:
    issues: List[Issue] = []
    lines = content.splitlines()

    for line_idx, line in enumerate(lines):
        line_num = line_idx + 1
        reported_spans: set = set()

        for pattern, label in _PLACEHOLDER_PATTERNS:
            for m in re.finditer(pattern, line, re.IGNORECASE):
                span = (m.start(), m.end())
                if _is_span_covered(span, reported_spans):
                    continue
                reported_spans.add(span)
                issues.append(
                    Issue(
                        kind=IssueKind.FORBIDDEN_EXPR,
                        severity=IssueSeverity.ERROR,
                        line=line_num,
                        col=m.start() + 1,
                        message=f"发现占位符/禁用表述: {label} → '{m.group()}'",
                        context=line.strip(),
                    )
                )

        for rule in forbidden_rules:
            if rule.is_regex:
                try:
                    for m in re.finditer(rule.pattern, line):
                        span = (m.start(), m.end())
                        if _is_span_covered(span, reported_spans):
                            continue
                        reported_spans.add(span)
                        issues.append(
                            Issue(
                                kind=IssueKind.FORBIDDEN_EXPR,
                                severity=IssueSeverity.ERROR,
                                line=line_num,
                                col=m.start() + 1,
                                message=f"禁用表述: {rule.reason} → '{m.group()}'",
                                context=line.strip(),
                            )
                        )
                except re.error:
                    pass
            else:
                idx = line.find(rule.pattern)
                while idx != -1:
                    span = (idx, idx + len(rule.pattern))
                    if not _is_span_covered(span, reported_spans):
                        reported_spans.add(span)
                        issues.append(
                            Issue(
                                kind=IssueKind.FORBIDDEN_EXPR,
                                severity=IssueSeverity.ERROR,
                                line=line_num,
                                col=idx + 1,
                                message=f"禁用表述: {rule.reason} → '{rule.pattern}'",
                                context=line.strip(),
                            )
                        )
                    idx = line.find(rule.pattern, idx + len(rule.pattern))

    return issues
