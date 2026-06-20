from __future__ import annotations

import re
from typing import List, Tuple

from ..types import (
    ALL_CLOSE_FOR_OPEN,
    BRACKET_PAIRS,
    CLOSE_BRACKETS,
    OPEN_BRACKETS,
    Issue,
    IssueKind,
    IssueSeverity,
)

_BRACKET_RE = re.compile(r'[{【〔〖《】〕〗》}]')


def _classify_bracket(ch: str) -> str:
    if ch in OPEN_BRACKETS:
        return "open"
    if ch in CLOSE_BRACKETS:
        return "close"
    return "other"


def _find_matching_close(open_ch: str) -> str:
    return BRACKET_PAIRS.get(open_ch, "")


def check_unclosed_variables(content: str) -> List[Issue]:
    issues: List[Issue] = []
    lines = content.splitlines()
    bracket_stack: List[Tuple[str, int, int]] = []

    for line_idx, line in enumerate(lines):
        line_num = line_idx + 1
        for col_idx, ch in enumerate(line):
            if ch in OPEN_BRACKETS:
                bracket_stack.append((ch, line_num, col_idx + 1))
            elif ch in CLOSE_BRACKETS:
                if not bracket_stack:
                    issues.append(
                        Issue(
                            kind=IssueKind.UNCLOSED_VAR,
                            severity=IssueSeverity.ERROR,
                            line=line_num,
                            col=col_idx + 1,
                            message=f"多余的闭合括号 '{ch}'，没有对应的开放括号",
                            context=line.strip(),
                        )
                    )
                    continue
                last_open, last_line, last_col = bracket_stack[-1]
                expected_close = _find_matching_close(last_open)
                if ch == expected_close:
                    bracket_stack.pop()
                elif ch in ALL_CLOSE_FOR_OPEN.get(last_open, set()):
                    issues.append(
                        Issue(
                            kind=IssueKind.UNCLOSED_VAR,
                            severity=IssueSeverity.ERROR,
                            line=last_line,
                            col=last_col,
                            message=f"括号不匹配：开放 '{last_open}' 与闭合 '{ch}' 配对，期望 '{expected_close}'",
                            context=line.strip(),
                        )
                    )
                    bracket_stack.pop()
                else:
                    issues.append(
                        Issue(
                            kind=IssueKind.UNCLOSED_VAR,
                            severity=IssueSeverity.ERROR,
                            line=line_num,
                            col=col_idx + 1,
                            message=f"闭合括号 '{ch}' 与开放括号 '{last_open}' 类型不匹配",
                            context=line.strip(),
                        )
                    )

    for open_ch, line_num, col in bracket_stack:
        expected = _find_matching_close(open_ch)
        context_line = lines[line_num - 1].strip() if line_num <= len(lines) else ""
        issues.append(
            Issue(
                kind=IssueKind.UNCLOSED_VAR,
                severity=IssueSeverity.ERROR,
                line=line_num,
                col=col,
                message=f"未闭合的变量括号 '{open_ch}'，缺少闭合符号 '{expected}'",
                context=context_line,
            )
        )

    return issues


def check_multiline_variable(content: str) -> List[Issue]:
    issues: List[Issue] = []
    lines = content.splitlines()
    bracket_stack: List[Tuple[str, int, int]] = []

    for line_idx, line in enumerate(lines):
        line_num = line_idx + 1
        for col_idx, ch in enumerate(line):
            if ch in OPEN_BRACKETS:
                bracket_stack.append((ch, line_num, col_idx + 1))
            elif ch in CLOSE_BRACKETS:
                if bracket_stack:
                    last_open, last_line, last_col = bracket_stack[-1]
                    if ch == _find_matching_close(last_open):
                        if last_line != line_num:
                            issues.append(
                                Issue(
                                    kind=IssueKind.UNCLOSED_VAR,
                                    severity=IssueSeverity.WARNING,
                                    line=last_line,
                                    col=last_col,
                                    message=f"变量跨越多行（从第{last_line}行到第{line_num}行），建议将变量写在同一行",
                                    context=f"第{last_line}行 → 第{line_num}行",
                                )
                            )
                        bracket_stack.pop()

    return issues
