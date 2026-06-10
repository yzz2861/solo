"""Markdown 报告导出模块

生成舞台监督可直接发给班组的 Markdown 格式报告。
"""

import os
from datetime import date, datetime
from typing import Dict, List, Optional

from .audit import (
    run_full_audit,
    get_audit_summary,
    OVERDUE_UNRETURNED,
    OVERDUE_RETURNED_LATE,
)
from .core import get_equipment_summary, list_all_equipments, list_decommissioned_equipments
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


def _render_reason_label(reason: str) -> str:
    labels = {
        "normal": "正常停用",
        "damaged": "损坏报废",
        "lost": "丢失",
        "obsolete": "淘汰",
    }
    return labels.get(reason, reason)


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

    overdue_unreturned = [o for o in audit_result["overdue"] if o["type"] == OVERDUE_UNRETURNED]
    overdue_returned_late = [o for o in audit_result["overdue"] if o["type"] == OVERDUE_RETURNED_LATE]
    decommissioned = list_decommissioned_equipments(db_path)

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
        if status in ("total", "decommissioned_total", "with_late_return"):
            continue
        lines.append(f"| {_render_status_badge(status)} | {count} |")
    lines.append(f"| **合计** | **{equip_summary.get('total', 0)}** |")
    if equip_summary.get("decommissioned_total"):
        lines.append(f"| ⚫ 停用/报废累计 | {equip_summary.get('decommissioned_total', 0)} |")
    if equip_summary.get("with_late_return"):
        lines.append(f"| ⚠️ 存在逾期归还记录 | {equip_summary.get('with_late_return', 0)} |")
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
    lines.append(f"| ⏰ 逾期未还 | {audit_summary['overdue_unreturned_count']} |")
    lines.append(f"| ⚠️ 逾期归还（已还但超期） | {audit_summary['overdue_returned_late_count']} |")
    lines.append(f"| 📦 吊点超限 | {audit_summary['hoist_overload_count']} |")
    lines.append(f"| 🔀 人员不一致 | {audit_summary['person_mismatch_count']} |")
    if decommissioned:
        lines.append(f"| ⚫ 停用/报废 | {len(decommissioned)} |")
    lines.append("")

    if overdue_unreturned:
        lines.append("## 二、逾期未还明细")
        lines.append("")
        lines.append("> 以下设备已超过应还日期且仍在外，请相关班组尽快归还。")
        lines.append("")
        lines.append("| 序号 | 设备编号 | 设备名称 | 借出数量 | 已还数量 | 未还数量 | 借用人 | 借出日期 | 应还日期 | 用途 | 来源行号 |")
        lines.append("|------|----------|----------|----------|----------|----------|--------|----------|----------|------|----------|")
        for i, item in enumerate(overdue_unreturned, 1):
            src_line = item.get("source_line_no", "-")
            lines.append(
                f"| {i} | {item['equipment_no']} | {item['equipment_name']} | "
                f"{item['quantity_lent']} | {item['quantity_returned']} | "
                f"**{item['quantity_overdue']}** | {item['borrower']} | "
                f"{item['lend_date']} | **{item['due_date']}** | "
                f"{item['purpose']} | {src_line} |"
            )
        lines.append("")

    if overdue_returned_late:
        lines.append("## 三、逾期归还明细（已归还但超期）")
        lines.append("")
        lines.append("> 以下设备已归还，但实际归还日期超过应还日期，请关注归还及时性。")
        lines.append("")
        lines.append("| 序号 | 设备编号 | 设备名称 | 借出数量 | 逾期归还数 | 借用人 | 应还日期 | 实际归还日期 | 用途 | 来源行号 |")
        lines.append("|------|----------|----------|----------|------------|--------|----------|--------------|------|----------|")
        for i, item in enumerate(overdue_returned_late, 1):
            src_line = item.get("source_line_no", "-")
            lines.append(
                f"| {i} | {item['equipment_no']} | {item['equipment_name']} | "
                f"{item['quantity_lent']} | **{item['quantity_overdue']}** | "
                f"{item['borrower']} | {item['due_date']} | "
                f"**{item['latest_return_date']}** | "
                f"{item['purpose']} | {src_line} |"
            )
        lines.append("")

    next_num = 4 if overdue_unreturned or overdue_returned_late else 2
    if audit_result["hoist_overload"]:
        lines.append(f"## {_chinese_num(next_num)}、吊点载荷超限明细")
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
        next_num += 1

    if audit_result["person_mismatch"]:
        lines.append(f"## {_chinese_num(next_num)}、归还人与借用人不一致明细")
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
        next_num += 1

    if decommissioned:
        lines.append(f"## {_chinese_num(next_num)}、停用/报废设备清单")
        lines.append("")
        lines.append("> 以下设备已停用或报废，请从在用设备中移除。")
        lines.append("")
        lines.append("| 序号 | 设备编号 | 设备名称 | 停用日期 | 原因 | 原因详情 | 操作人 | 备注 |")
        lines.append("|------|----------|----------|----------|------|----------|--------|------|")
        for i, item in enumerate(decommissioned, 1):
            lines.append(
                f"| {i} | {item['equipment_no']} | {item.get('equip_name', '')} | "
                f"{item['decommission_date']} | **{_render_reason_label(item['reason'])}** | "
                f"{item.get('reason_detail', '')} | {item.get('operator', '')} | "
                f"{item.get('remark', '')} |"
            )
        lines.append("")
        next_num += 1

    lines.append(f"## {_chinese_num(next_num)}、待复核清单")
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


def _chinese_num(n: int) -> str:
    """阿拉伯数字转中文（1-9）"""
    mapping = {1: "一", 2: "二", 3: "三", 4: "四", 5: "五",
               6: "六", 7: "七", 8: "八", 9: "九", 10: "十"}
    return mapping.get(n, str(n))


def export_equipment_list_markdown(
    output_path: str,
    db_path: Optional[str] = None,
    status_filter: str = None,
) -> str:
    """导出设备清单 Markdown"""
    equips = list_all_equipments(db_path, status_filter)
    decommissioned_map = {}
    for d in list_decommissioned_equipments(db_path):
        decommissioned_map[d["equipment_no"]] = d

    lines = []
    title = "设备清单"
    if status_filter:
        title = f"设备清单 - {status_filter}"
    lines.append(f"# {title}")
    lines.append("")
    lines.append(f"共 {len(equips)} 台设备")
    lines.append("")
    lines.append("| 设备编号 | 名称 | 状态 | 累计借出 | 累计归还 | 净借出 | 停用/报废说明 |")
    lines.append("|----------|------|------|----------|----------|--------|--------------|")
    for e in equips:
        decom_note = ""
        if e.get("decommissioned") and e["equipment_no"] in decommissioned_map:
            d = decommissioned_map[e["equipment_no"]]
            parts = [f"停用日期:{d['decommission_date']}", f"原因:{_render_reason_label(d['reason'])}"]
            if d.get("reason_detail"):
                parts.append(f"详情:{d['reason_detail']}")
            decom_note = "；".join(parts)
        lines.append(
            f"| {e['equipment_no']} | {e['name']} | {_render_status_badge(e['status'])} | "
            f"{e['total_lent']} | {e['total_returned']} | {e['net_lent']} | {decom_note} |"
        )

    content = "\n".join(lines)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    return output_path
