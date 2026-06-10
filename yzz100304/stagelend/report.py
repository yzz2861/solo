"""Markdown 报告导出模块

生成舞台监督可直接发给班组的 Markdown 格式报告。
"""

import os
from datetime import date, datetime
from typing import Dict, List, Optional

from .audit import run_full_audit, get_audit_summary
from .core import get_equipment_summary, list_all_equipments
from .review import get_review_summary


def _render_status_badge(status: str) -> str:
    """渲染状态标记"""
    badges = {
        "available": "🟢 可用",
        "lent": "🟡 借出中",
        "returned": "🔵 已归还待复核",
        "verified": "✅ 已复核",
        "decommissioned": "⚫ 已停用",
    }
    return badges.get(status, status)


def export_markdown_report(
    output_path: str,
    db_path: Optional[str] = None,
    reference_date: date = None,
    title: str = "舞台设备借还审计报告",
) -> str:
    """导出 Markdown 格式报告

    Args:
        output_path: 输出文件路径
        db_path: 数据库路径
        reference_date: 参考日期（用于计算逾期）
        title: 报告标题

    Returns:
        生成的报告文件路径
    """
    ref_date = reference_date or date.today()
    audit_result = run_full_audit(db_path, ref_date)
    audit_summary = get_audit_summary(audit_result)
    equip_summary = get_equipment_summary(db_path)
    review_summary = get_review_summary(db_path)

    lines = []
    lines.append(f"# {title}")
    lines.append("")
    lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"**参考日期**: {ref_date.strftime('%Y-%m-%d')}")
    lines.append("")

    lines.append("## 一、总体概览")
    lines.append("")
    lines.append("### 设备状态统计")
    lines.append("")
    lines.append("| 状态 | 数量 |")
    lines.append("|------|------|")
    for status, count in equip_summary.items():
        if status == "total":
            continue
        lines.append(f"| {_render_status_badge(status)} | {count} |")
    lines.append(f"| **合计** | **{equip_summary.get('total', 0)}** |")
    lines.append("")

    lines.append("### 复核状态统计")
    lines.append("")
    lines.append("| 项目 | 记录数 | 数量 |")
    lines.append("|------|--------|------|")
    lines.append(f"| 待复核 | {review_summary['unverified_records']} | {review_summary['unverified_quantity']} |")
    lines.append(f"| 已复核 | {review_summary['verified_records']} | {review_summary['verified_quantity']} |")
    lines.append(f"| **归还记录合计** | **{review_summary['total_return_records']}** | **{review_summary['unverified_quantity'] + review_summary['verified_quantity']}** |")
    lines.append("")

    lines.append("### 异常统计")
    lines.append("")
    total_issues = audit_summary["total_issues"]
    lines.append(f"**异常总数: {total_issues} 项**")
    lines.append("")
    lines.append("| 异常类型 | 数量 |")
    lines.append("|----------|------|")
    lines.append(f"| ⏰ 逾期未还 | {audit_summary['overdue_count']} |")
    lines.append(f"| ⚠️ 吊点超限 | {audit_summary['hoist_overload_count']} |")
    lines.append(f"| 🔀 人员不一致 | {audit_summary['person_mismatch_count']} |")
    lines.append("")

    if audit_result["overdue"]:
        lines.append("## 二、逾期未还明细")
        lines.append("")
        lines.append("> 以下设备已超过应还日期，请相关班组尽快归还。")
        lines.append("")
        lines.append("| 序号 | 设备编号 | 设备名称 | 借出数量 | 已还数量 | 逾期数量 | 借用人 | 借出日期 | 应还日期 | 用途 | 来源行号 |")
        lines.append("|------|----------|----------|----------|----------|----------|--------|----------|----------|------|----------|")
        for i, item in enumerate(audit_result["overdue"], 1):
            src_line = item.get("source_line_no", "-")
            lines.append(
                f"| {i} | {item['equipment_no']} | {item['equipment_name']} | "
                f"{item['quantity_lent']} | {item['quantity_returned']} | "
                f"**{item['quantity_overdue']}** | {item['borrower']} | "
                f"{item['lend_date']} | **{item['due_date']}** | "
                f"{item['purpose']} | {src_line} |"
            )
        lines.append("")

    if audit_result["hoist_overload"]:
        lines.append("## 三、吊点载荷超限明细")
        lines.append("")
        lines.append("> 以下吊点当前载荷超过额定载荷，存在安全隐患，请立即整改。")
        lines.append("")
        lines.append("| 序号 | 吊点编号 | 额定载荷(kg) | 当前载荷(kg) | 超限(kg) | 超限比例 | 关联设备 | 位置 | 来源行号 |")
        lines.append("|------|----------|-------------|-------------|----------|----------|----------|------|----------|")
        for i, item in enumerate(audit_result["hoist_overload"], 1):
            src_line = item.get("source_line_no", "-")
            lines.append(
                f"| {i} | {item['point_no']} | {item['max_load']} | "
                f"**{item['current_load']}** | **{item['overload_amount']}** | "
                f"**{item['overload_percent']:.1f}%** | {item['equipment_no']} | "
                f"{item['position']} | {src_line} |"
            )
        lines.append("")

    if audit_result["person_mismatch"]:
        lines.append("## 四、归还人与借用人不一致明细")
        lines.append("")
        lines.append("> 以下设备的归还人与原借用人不一致，请核实是否经过授权。")
        lines.append("")
        lines.append("| 序号 | 设备编号 | 设备名称 | 借用人 | 归还人 | 借出日期 | 归还日期 | 借出行 | 归还行 |")
        lines.append("|------|----------|----------|--------|--------|----------|----------|--------|--------|")
        for i, item in enumerate(audit_result["person_mismatch"], 1):
            lines.append(
                f"| {i} | {item['equipment_no']} | {item['equipment_name']} | "
                f"**{item['borrower']}** | **{item['returner']}** | "
                f"{item['lend_date']} | {item['return_date']} | "
                f"{item['lend_source_line']} | {item['return_source_line']} |"
            )
        lines.append("")

    lines.append("## 五、待复核清单")
    lines.append("")
    lines.append("> 以下归还记录尚待复核，请相关人员尽快处理。")
    lines.append("")

    from .review import get_unverified_returns
    unverified = get_unverified_returns(db_path)
    if unverified:
        lines.append("| 序号 | 设备编号 | 设备名称 | 数量 | 归还人 | 归还日期 | 状态 | 来源行号 |")
        lines.append("|------|----------|----------|------|--------|----------|------|----------|")
        for i, item in enumerate(unverified, 1):
            lines.append(
                f"| {i} | {item['equipment_no']} | {item.get('equip_name', '')} | "
                f"{item['quantity']} | {item['returner']} | {item['return_date']} | "
                f"{item.get('condition', '')} | {item.get('source_line_no', '-')} |"
            )
    else:
        lines.append("暂无待复核记录。")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("*本报告由 stagelend 工具自动生成，如有疑问请联系舞台监督。*")

    content = "\n".join(lines)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    return output_path


def export_equipment_list_markdown(
    output_path: str,
    db_path: Optional[str] = None,
    status_filter: str = None,
) -> str:
    """导出设备清单 Markdown"""
    equips = list_all_equipments(db_path, status_filter)

    lines = []
    title = "设备清单"
    if status_filter:
        title = f"设备清单 - {status_filter}"
    lines.append(f"# {title}")
    lines.append("")
    lines.append(f"共 {len(equips)} 台设备")
    lines.append("")
    lines.append("| 设备编号 | 名称 | 状态 | 累计借出 | 累计归还 | 净借出 |")
    lines.append("|----------|------|------|----------|----------|--------|")
    for e in equips:
        lines.append(
            f"| {e['equipment_no']} | {e['name']} | {_render_status_badge(e['status'])} | "
            f"{e['total_lent']} | {e['total_returned']} | {e['net_lent']} |"
        )

    content = "\n".join(lines)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    return output_path
