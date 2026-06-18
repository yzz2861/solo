from __future__ import annotations

import csv
import json
import os
import sys
from datetime import date, datetime
from pathlib import Path
from typing import TextIO

from .models import IssueRecord, IssueType, LedgerEntry, ReorderResult


def generate_preview(
    result: ReorderResult,
    out: TextIO | None = None,
) -> str:
    if out is None:
        out = sys.stdout

    lines: list[str] = []

    lines.append("=" * 90)
    lines.append("  环保台账编号重排 — 预览")
    lines.append("=" * 90)
    lines.append("")

    lines.append(f"  台账条目总数: {len(result.entries)}")
    lines.append(f"  检出问题数量: {len(result.issues)}")
    lines.append("")

    issue_summary: dict[str, int] = {}
    for issue in result.issues:
        label = issue.issue_type.value
        issue_summary[label] = issue_summary.get(label, 0) + 1

    if issue_summary:
        lines.append("  问题汇总:")
        for label, count in sorted(issue_summary.items()):
            lines.append(f"    • {label}: {count} 项")
        lines.append("")

    lines.append("-" * 90)
    lines.append(
        f"{'序号':>4}  {'原编号':<16} {'新编号':<22} "
        f"{'桶号':<12} {'废物类别':<10} {'产生日期':<12} "
        f"{'批次号':<12} {'联单号':<14} {'重量':<10} {'单位':<4}"
    )
    lines.append("-" * 90)

    for idx, entry in enumerate(result.entries, 1):
        lines.append(
            f"{idx:>4}  {entry.original_id:<16} {entry.new_id or '—':<22} "
            f"{entry.barrel_no:<12} {entry.waste_category:<10} "
            f"{entry.production_date.strftime('%Y-%m-%d'):<12} "
            f"{entry.batch_no:<12} {entry.manifest_no or '—':<14} "
            f"{entry.weight:<10.2f} {entry.weight_unit.value:<4}"
        )

    lines.append("-" * 90)
    lines.append("")

    if result.issues:
        lines.append("=" * 90)
        lines.append("  检出问题详情")
        lines.append("=" * 90)
        lines.append("")

        for idx, issue in enumerate(result.issues, 1):
            lines.append(f"  [{idx}] {issue.issue_type.value}")
            if issue.barrel_no:
                lines.append(f"      桶号: {issue.barrel_no}")
            if issue.batch_no:
                lines.append(f"      批次: {issue.batch_no}")
            if issue.manifest_no:
                lines.append(f"      联单: {issue.manifest_no}")
            lines.append(f"      详情: {issue.detail}")
            lines.append(f"      建议: {issue.suggestion}")
            lines.append("")

    text = "\n".join(lines)
    out.write(text)
    return text


def confirm_and_export(
    result: ReorderResult,
    output_dir: str | Path,
    confirmed: bool = False,
    remark: str = "",
) -> dict[str, str]:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    exported_files: dict[str, str] = {}

    ledger_path = output_dir / f"台账_重排_{timestamp}.csv"
    _export_ledger_csv(result.entries, ledger_path, remark)
    exported_files["台账"] = str(ledger_path)

    if result.issues:
        report_path = output_dir / f"问题报告_{timestamp}.csv"
        _export_issues_csv(result.issues, report_path)
        exported_files["问题报告"] = str(report_path)

    mapping_path = output_dir / f"编号映射_{timestamp}.json"
    _export_id_mapping(result, mapping_path)
    exported_files["编号映射"] = str(mapping_path)

    return exported_files


def _export_ledger_csv(
    entries: list[LedgerEntry],
    path: Path,
    remark: str = "",
) -> None:
    fieldnames = [
        "新编号",
        "原编号",
        "桶号",
        "批次编号",
        "废物类别",
        "废物代码",
        "产生日期",
        "重量",
        "单位",
        "联单编号",
        "存放位置",
        "备注",
    ]

    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for entry in entries:
            entry_remark = entry.remark or ""
            if remark:
                entry_remark = f"{entry_remark}; {remark}" if entry_remark else remark

            writer.writerow(
                {
                    "新编号": entry.new_id or "",
                    "原编号": entry.original_id,
                    "桶号": entry.barrel_no,
                    "批次编号": entry.batch_no,
                    "废物类别": entry.waste_category,
                    "废物代码": entry.waste_code,
                    "产生日期": entry.production_date.strftime("%Y-%m-%d"),
                    "重量": f"{entry.weight:.2f}",
                    "单位": entry.weight_unit.value,
                    "联单编号": entry.manifest_no or "",
                    "存放位置": entry.storage_location or "",
                    "备注": entry_remark,
                }
            )


def _export_issues_csv(
    issues: list[IssueRecord],
    path: Path,
) -> None:
    fieldnames = [
        "问题类型",
        "桶号",
        "批次编号",
        "联单编号",
        "台账编号",
        "详情",
        "建议",
        "已解决",
        "处理结果",
    ]

    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for issue in issues:
            writer.writerow(
                {
                    "问题类型": issue.issue_type.value,
                    "桶号": issue.barrel_no or "",
                    "批次编号": issue.batch_no or "",
                    "联单编号": issue.manifest_no or "",
                    "台账编号": issue.ledger_id or "",
                    "详情": issue.detail,
                    "建议": issue.suggestion,
                    "已解决": "是" if issue.resolved else "否",
                    "处理结果": issue.resolution or "",
                }
            )


def _export_id_mapping(
    result: ReorderResult,
    path: Path,
) -> None:
    mapping = {
        "export_time": datetime.now().isoformat(),
        "total_entries": len(result.entries),
        "total_issues": len(result.issues),
        "id_mapping": result.id_mapping,
        "original_id_mapping": result.original_id_mapping,
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
