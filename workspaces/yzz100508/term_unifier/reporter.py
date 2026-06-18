from typing import List, Tuple
from .models import Match, ConflictReport, TermStatus, Document


def build_conflict_report(matches: List[Match]) -> ConflictReport:
    report = ConflictReport()
    for m in matches:
        if m.status == TermStatus.FORBIDDEN:
            report.forbidden_matches.append(m)
        elif m.needs_manual_review or m.status == TermStatus.NEEDS_REVIEW:
            report.needs_review_matches.append(m)
        else:
            report.inconsistent_matches.append(m)
    report.total_forbidden = len(report.forbidden_matches)
    report.total_needs_review = len(report.needs_review_matches)
    report.total_inconsistent = len(report.inconsistent_matches)
    report.total_replacements = len(matches)
    return report


def _highlight(term: str, style: str = "red") -> str:
    codes = {
        "red": "\033[91m",
        "green": "\033[92m",
        "yellow": "\033[93m",
        "cyan": "\033[96m",
        "bold": "\033[1m",
        "dim": "\033[2m",
        "reset": "\033[0m",
    }
    return f"{codes.get(style, '')}{term}{codes['reset']}"


def generate_preview(doc: Document, matches: List[Match]) -> str:
    lines = []
    lines.append("=" * 72)
    lines.append(f"文档: {doc.path}  |  类型: {doc.file_type.value}  |  片段数: {len(doc.segments)}")
    lines.append(f"共发现 {len(matches)} 处待处理匹配")
    lines.append("=" * 72)
    lines.append("")
    by_segment: dict = {}
    for m in matches:
        by_segment.setdefault(m.segment_index, []).append(m)
    seg_num = 0
    for seg_idx, seg_matches in sorted(by_segment.items()):
        seg_num += 1
        segment = doc.segments[seg_idx]
        lines.append(_highlight(f"── 片段 #{seg_idx+1} (索引 {segment.index})", "bold"))
        if segment.timestamp:
            lines.append(_highlight(f"   时间轴: {segment.timestamp}", "dim"))
        if segment.chapter:
            lines.append(_highlight(f"   章节: {segment.chapter}", "dim"))
        lines.append("")
        marked_text = _mark_matches_in_text(segment.content, seg_matches)
        lines.append(f"   {marked_text}")
        lines.append("")
        for m in seg_matches:
            status_tag, color = _status_style(m)
            lines.append(f"   · [{_highlight(status_tag, color)}] "
                         f"{_highlight(m.original, 'red')} → {_highlight(m.suggested, 'green')}"
                         f"  [{m.term_source}]")
            if m.reason:
                lines.append(_highlight(f"      理由: {m.reason}", "dim"))
            lines.append(_highlight(
                f"      上下文: …{m.context_before}"
                f"{_highlight(m.original, 'yellow')}"
                f"{m.context_after}…", "dim"))
        lines.append("")
    lines.append("=" * 72)
    return "\n".join(lines)


def _mark_matches_in_text(text: str, matches: List[Match]) -> str:
    sorted_m = sorted(matches, key=lambda m: m.start, reverse=True)
    result = text
    for m in sorted_m:
        style = "red" if m.status == TermStatus.FORBIDDEN else ("yellow" if m.needs_manual_review else "cyan")
        tagged = _highlight(f"【{m.original}→{m.suggested}】", style)
        result = result[:m.start] + tagged + result[m.end:]
    return result


def _status_style(m: Match) -> Tuple[str, str]:
    if m.status == TermStatus.FORBIDDEN:
        return "禁用", "red"
    if m.needs_manual_review or m.status == TermStatus.NEEDS_REVIEW:
        return "待确认", "yellow"
    return "替换", "green"


def generate_report_text(doc: Document, matches: List[Match], report: ConflictReport) -> str:
    lines = []
    lines.append("# 术语统一处理报告")
    lines.append("")
    lines.append(f"- 文档: `{doc.path}`")
    lines.append(f"- 类型: {doc.file_type.value}")
    lines.append(f"- 生成时间: (运行时自动填入)")
    lines.append("")
    lines.append("## 总览")
    lines.append("")
    lines.append(f"| 类别 | 数量 |")
    lines.append(f"|------|------|")
    lines.append(f"| 总匹配数 | {report.total_replacements} |")
    lines.append(f"| 禁用译名 | {report.total_forbidden} |")
    lines.append(f"| 不一致译名(可自动替换) | {report.total_inconsistent} |")
    lines.append(f"| 需人工确认 | {report.total_needs_review} |")
    lines.append("")
    lines.append("## 详细清单")
    lines.append("")
    def _rows(title, row_list):
        if not row_list:
            return
        lines.append(f"### {title} ({len(row_list)})")
        lines.append("")
        lines.append("| # | 片段 | 位置 | 原文 | 建议 | 术语源 | 状态 | 理由 |")
        lines.append("|---|------|------|------|------|--------|------|------|")
        for i, m in enumerate(row_list, 1):
            segment = doc.segments[m.segment_index]
            lines.append(f"| {i} | #{segment.index} | L{segment.line_start} | "
                         f"`{m.original}` | `{m.suggested}` | `{m.term_source}` | "
                         f"{m.status.value} | {m.reason or ''} |")
        lines.append("")
    _rows("一、禁用译名", report.forbidden_matches)
    _rows("二、需人工确认", report.needs_review_matches)
    _rows("三、自动替换", report.inconsistent_matches)
    lines.append("## 按片段查看原文")
    lines.append("")
    by_segment = {}
    for m in matches:
        by_segment.setdefault(m.segment_index, []).append(m)
    for seg_idx, seg_matches in sorted(by_segment.items()):
        seg = doc.segments[seg_idx]
        lines.append(f"### 片段 {seg.index}" + (f" - {seg.chapter}" if seg.chapter else ""))
        lines.append("")
        if seg.timestamp:
            lines.append(f"> 时间轴: {seg.timestamp}")
            lines.append("")
        marked = _mark_matches_plain(seg.content, seg_matches)
        lines.append(marked)
        lines.append("")
    return "\n".join(lines)


def _mark_matches_plain(text: str, matches: List[Match]) -> str:
    sorted_m = sorted(matches, key=lambda m: m.start, reverse=True)
    result = text
    for m in sorted_m:
        tag = "⚠" if m.status == TermStatus.FORBIDDEN else ("?" if m.needs_manual_review else "→")
        tagged = f"【{tag}{m.original}→{m.suggested}】"
        result = result[:m.start] + tagged + result[m.end:]
    return result
