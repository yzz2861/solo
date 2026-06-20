from __future__ import annotations

import csv
import json
import os
from datetime import datetime
from typing import Dict, List, Optional

from .types import (
    ISSUE_KIND_LABEL,
    CheckResult,
    Issue,
    IssueKind,
    IssueSeverity,
    Template,
)


def _issue_to_dict(issue: Issue, template: Template) -> dict:
    return {
        "模板路径": template.path,
        "模板名称": template.name,
        "科室": template.department,
        "状态": "停用" if template.is_discontinued else "在用",
        "问题类型": ISSUE_KIND_LABEL.get(issue.kind, issue.kind.value),
        "严重级别": issue.severity.value,
        "行号": issue.line,
        "列号": issue.col,
        "问题描述": issue.message,
        "上下文": issue.context,
    }


def generate_it_report(result: CheckResult) -> str:
    lines: List[str] = []
    lines.append("=" * 72)
    lines.append("医嘱模板变量检查报告 — 信息科")
    lines.append(f"批次: {result.batch_id}")
    lines.append(f"时间: {result.timestamp}")
    lines.append("=" * 72)
    lines.append("")

    lines.append(f"总模板数: {len(result.templates)}")
    lines.append(f"  在用: {len(result.active_templates)}")
    lines.append(f"  停用(参考): {len(result.reference_templates)}")
    lines.append(f"问题总数: {result.total_issues}")
    lines.append(f"  错误: {result.error_count}")
    lines.append(f"  警告: {result.warning_count}")
    lines.append("")

    active = result.active_templates
    has_issues = [t for t in active if t.issues]
    no_issues = [t for t in active if not t.issues]

    lines.append("-" * 72)
    lines.append(f"【需修改的在用模板】 ({len(has_issues)} 个)")
    lines.append("-" * 72)
    for t in has_issues:
        lines.append("")
        lines.append(f"  ▸ {t.name}  (风险分: {t.risk_score})")
        lines.append(f"    路径: {t.path}")
        lines.append(f"    科室: {t.department or '未指定'}")
        for issue in t.issues:
            severity_tag = "✖" if issue.severity == IssueSeverity.ERROR else "⚠"
            kind_label = ISSUE_KIND_LABEL.get(issue.kind, issue.kind.value)
            loc = f"行{issue.line}" if issue.line > 0 else "全局"
            lines.append(f"    {severity_tag} [{kind_label}] {loc}: {issue.message}")
            if issue.context:
                lines.append(f"       上下文: {issue.context}")

    if no_issues:
        lines.append("")
        lines.append("-" * 72)
        lines.append(f"【通过检查的在用模板】 ({len(no_issues)} 个)")
        lines.append("-" * 72)
        for t in no_issues:
            lines.append(f"  ✓ {t.name}  ({t.path})")

    reference = result.reference_templates
    if reference:
        ref_with_issues = [t for t in reference if t.issues]
        lines.append("")
        lines.append("-" * 72)
        lines.append(f"【停用模板 — 仅参考列表】 ({len(reference)} 个)")
        lines.append("-" * 72)
        for t in reference:
            status_tag = f"({len(t.issues)}个问题)" if t.issues else "(无问题)"
            lines.append(f"  ○ {t.name}  ({t.path}) {status_tag}")

    lines.append("")
    lines.append("=" * 72)
    lines.append("报告结束")
    return "\n".join(lines)


def export_clinical_csv(result: CheckResult, output_path: str) -> str:
    rows = []
    for t in result.active_templates:
        for issue in t.issues:
            rows.append(_issue_to_dict(issue, t))
        if not t.issues:
            rows.append(
                {
                    "模板路径": t.path,
                    "模板名称": t.name,
                    "科室": t.department,
                    "状态": "在用",
                    "问题类型": "无",
                    "严重级别": "无",
                    "行号": 0,
                    "列号": 0,
                    "问题描述": "通过检查，无问题",
                    "上下文": "",
                }
            )

    fieldnames = [
        "模板路径",
        "模板名称",
        "科室",
        "状态",
        "问题类型",
        "严重级别",
        "行号",
        "列号",
        "问题描述",
        "上下文",
    ]
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return output_path


def export_exception_csv(result: CheckResult, output_path: str) -> str:
    rows = []
    for t in result.active_templates:
        for issue in t.issues:
            d = _issue_to_dict(issue, t)
            d["是否业务例外"] = ""
            d["例外原因"] = ""
            d["确认人"] = ""
            d["确认日期"] = ""
            rows.append(d)

    fieldnames = [
        "模板路径",
        "模板名称",
        "科室",
        "状态",
        "问题类型",
        "严重级别",
        "行号",
        "列号",
        "问题描述",
        "上下文",
        "是否业务例外",
        "例外原因",
        "确认人",
        "确认日期",
    ]
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return output_path


def record_batch(result: CheckResult, batch_dir: str) -> str:
    os.makedirs(batch_dir, exist_ok=True)
    record = {
        "batch_id": result.batch_id,
        "timestamp": result.timestamp,
        "total_templates": len(result.templates),
        "active_count": len(result.active_templates),
        "discontinued_count": len(result.reference_templates),
        "total_issues": result.total_issues,
        "error_count": result.error_count,
        "warning_count": result.warning_count,
        "templates": [],
    }
    for t in result.templates:
        record["templates"].append(
            {
                "path": t.path,
                "name": t.name,
                "department": t.department,
                "status": "discontinued" if t.is_discontinued else "active",
                "risk_score": t.risk_score,
                "issue_count": len(t.issues),
                "issues": [
                    {
                        "kind": i.kind.value,
                        "severity": i.severity.value,
                        "line": i.line,
                        "message": i.message,
                    }
                    for i in t.issues
                ],
            }
        )
    path = os.path.join(batch_dir, f"batch_{result.batch_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)
    return path
