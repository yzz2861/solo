"""报告生成：运营报告 + 客户经理报告（CSV / Excel）。"""
from __future__ import annotations

import csv
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List

from .classifier import summary
from .models import BounceCategory, BounceRecord


OPERATION_COLUMNS = [
    "收件人邮箱",
    "分类",
    "退回次数",
    "首次退回时间",
    "最近退回时间",
    "错误码",
    "退信原因",
    "原活动",
    "原邮件主题",
    "是否转发失败",
    "是否建议清理",
    "合并说明",
    "来源文件",
]

MANAGER_COLUMNS = [
    "收件人邮箱",
    "分类",
    "退回次数",
    "最近退回时间",
    "退信原因",
    "原活动",
    "原邮件主题",
    "是否转发失败",
    "建议动作",
    "联系确认结果(占位)",
    "合并说明",
]


def _fmt_dt(value) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    return str(value)


def _operation_rows(records: Iterable[BounceRecord]) -> List[list]:
    rows = []
    for r in records:
        rows.append([
            r.recipient,
            r.category.value,
            r.bounce_count,
            _fmt_dt(r.first_bounce_time),
            _fmt_dt(r.last_bounce_time),
            r.reason_code,
            r.reason_text,
            r.original_campaign,
            r.original_subject,
            "是" if r.is_forward_failure else "否",
            "是" if r.needs_cleanup else "否",
            "\n".join(r.merged_notes),
            r.source_file,
        ])
    return rows


def _manager_rows(records: Iterable[BounceRecord]) -> List[list]:
    rows = []
    for r in records:
        if r.is_forward_failure:
            action = "确认转发地址有效性或更新主邮箱"
        elif r.category == BounceCategory.MANUAL:
            action = "电话确认邮箱是否仍在使用"
        elif r.bounce_count >= 3 and r.category != BounceCategory.HARD:
            action = "多次软退，联系确认是否更换邮箱"
        else:
            action = "核实联系人信息"
        rows.append([
            r.recipient,
            r.category.value,
            r.bounce_count,
            _fmt_dt(r.last_bounce_time),
            r.reason_text,
            r.original_campaign,
            r.original_subject,
            "是" if r.is_forward_failure else "否",
            action,
            "",
            "\n".join(r.merged_notes),
        ])
    return rows


def write_csv(path: str, header: List[str], rows: List[list]) -> str:
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(header)
        writer.writerows(rows)
    return path


def write_xlsx(path: str, sheets: Dict[str, tuple]) -> str:
    try:
        from openpyxl import Workbook  # type: ignore
    except ImportError:
        raise ImportError(
            "请安装 openpyxl 以支持 Excel 输出: pip install openpyxl"
        )
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    wb = Workbook()
    default = wb.active
    first = True
    for sheet_name, (header, rows) in sheets.items():
        if first:
            ws = default
            ws.title = sheet_name
            first = False
        else:
            ws = wb.create_sheet(title=sheet_name)
        ws.append(header)
        for row in rows:
            ws.append(row)
        widths = _auto_width(header, rows)
        for idx, width in enumerate(widths, start=1):
            ws.column_dimensions[chr(64 + idx) if idx <= 26 else "A"].width = width
    wb.save(path)
    return path


def _auto_width(header: List[str], rows: List[list]) -> List[int]:
    widths = [len(str(h)) for h in header]
    for row in rows:
        for i, cell in enumerate(row):
            if i >= len(widths):
                continue
            value = str(cell) if cell is not None else ""
            widths[i] = max(widths[i], min(60, len(value)))
    return [w + 2 for w in widths]


def _group_by_category(records: List[BounceRecord]) -> Dict[str, List[BounceRecord]]:
    groups: Dict[str, List[BounceRecord]] = {
        "硬退": [],
        "软退": [],
        "黑名单": [],
        "需要人工联系": [],
        "其他": [],
    }
    for r in records:
        groups.setdefault(r.category.value, []).append(r)
    return groups


def generate_reports(
    records: List[BounceRecord],
    out_dir: str,
    name_prefix: str = "bounce_report",
    excel: bool = False,
) -> Dict[str, str]:
    """生成运营报告和客户经理报告，返回生成的文件路径映射。"""
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    outputs: Dict[str, str] = {}

    stats = summary(records)
    stats_rows = [[k, v] for k, v in stats.items()]

    operation_records = records
    cleanup_records = [r for r in records if r.needs_cleanup]
    manager_records = [r for r in records if r.needs_contact_manager]

    if excel:
        sheets = {
            "总览统计": (["指标", "数值"], stats_rows),
            "全部退信-运营": (OPERATION_COLUMNS, _operation_rows(operation_records)),
            "建议清理-运营": (OPERATION_COLUMNS, _operation_rows(cleanup_records)),
            "客户经理-电话确认": (MANAGER_COLUMNS, _manager_rows(manager_records)),
        }
        for cat_name, cat_records in _group_by_category(records).items():
            if not cat_records:
                continue
            sheets[f"分类-{cat_name}"] = (
                OPERATION_COLUMNS,
                _operation_rows(cat_records),
            )
        xlsx_path = os.path.join(out_dir, f"{name_prefix}.xlsx")
        outputs["excel"] = write_xlsx(xlsx_path, sheets)
    else:
        stats_csv = os.path.join(out_dir, f"{name_prefix}_stats.csv")
        outputs["统计"] = write_csv(stats_csv, ["指标", "数值"], stats_rows)

        all_csv = os.path.join(out_dir, f"{name_prefix}_all.csv")
        outputs["全部退信"] = write_csv(
            all_csv, OPERATION_COLUMNS, _operation_rows(operation_records)
        )

        cleanup_csv = os.path.join(out_dir, f"{name_prefix}_cleanup.csv")
        outputs["建议清理"] = write_csv(
            cleanup_csv, OPERATION_COLUMNS, _operation_rows(cleanup_records)
        )

        manager_csv = os.path.join(out_dir, f"{name_prefix}_manager.csv")
        outputs["客户经理-电话确认"] = write_csv(
            manager_csv, MANAGER_COLUMNS, _manager_rows(manager_records)
        )

        for cat_name, cat_records in _group_by_category(records).items():
            if not cat_records:
                continue
            safe = cat_name.replace("/", "_")
            path = os.path.join(out_dir, f"{name_prefix}_{safe}.csv")
            outputs[f"分类-{cat_name}"] = write_csv(
                path, OPERATION_COLUMNS, _operation_rows(cat_records)
            )

    text_report = build_text_summary(records, outputs)
    text_path = os.path.join(out_dir, f"{name_prefix}_summary.txt")
    with open(text_path, "w", encoding="utf-8") as fh:
        fh.write(text_report)
    outputs["文字总结"] = text_path

    return outputs


def build_text_summary(
    records: List[BounceRecord], outputs: Dict[str, str]
) -> str:
    stats = summary(records)
    lines = []
    lines.append("=" * 60)
    lines.append("邮件退信分类总结报告")
    lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 60)
    lines.append("")
    lines.append("【总体统计】")
    for k, v in stats.items():
        lines.append(f"  - {k}: {v}")
    lines.append("")
    lines.append("【建议运营清理的地址】 (硬退 + 黑名单)")
    cleanup = [r for r in records if r.needs_cleanup]
    if cleanup:
        for r in cleanup[:50]:
            lines.append(
                f"  - {r.recipient}  [{r.category}]  原因: {r.reason_text[:60]}"
            )
        if len(cleanup) > 50:
            lines.append(f"  ... 以及另外 {len(cleanup) - 50} 个地址（详见报告文件）")
    else:
        lines.append("  (无)")
    lines.append("")
    lines.append("【需客户经理电话确认】 (需人工联系 / 多次软退 / 转发失败)")
    manager = [r for r in records if r.needs_contact_manager]
    if manager:
        for r in manager[:30]:
            reasons = []
            if r.is_forward_failure:
                reasons.append("转发失败")
            if r.bounce_count >= 3:
                reasons.append(f"{r.bounce_count}次退回")
            reason_tag = "、".join(reasons) if reasons else r.category.value
            lines.append(
                f"  - {r.recipient}  [{reason_tag}]  {r.reason_text[:50]}"
            )
        if len(manager) > 30:
            lines.append(f"  ... 以及另外 {len(manager) - 30} 个联系人")
    else:
        lines.append("  (无)")
    lines.append("")
    lines.append("【生成文件】")
    for label, path in outputs.items():
        lines.append(f"  - {label}: {path}")
    lines.append("")
    return "\n".join(lines)
