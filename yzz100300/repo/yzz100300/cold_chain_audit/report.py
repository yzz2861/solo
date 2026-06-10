"""报告生成器。

支持三种输出：
1. 主管摘要（早会用）：缺箱 + 超温 + 门店差异
2. 完整报告：所有异常 + 统计
3. 详细 CSV：可导出给运营排查
"""

from __future__ import annotations

import os
import csv
from datetime import datetime
from typing import List, Dict

from .models import BatchResult, BoxLifecycle, Anomaly, ScanRecord


SCAN_TYPE_CN = {
    "outbound": "出库",
    "arrive": "到店",
    "return": "回仓",
    "clean": "清洗",
}


def _fmt_temp(t) -> str:
    if t is None:
        return "-"
    return f"{t:.1f}℃"


def _fmt_time(dt) -> str:
    if dt is None:
        return "-"
    return dt.strftime("%Y-%m-%d %H:%M")


def generate_summary(result: BatchResult) -> str:
    """生成主管早会摘要。"""
    lines = []
    lines.append("=" * 60)
    lines.append(f"  冷链周转箱盘点报告 - {result.batch_date}")
    lines.append(f"  批次号: {result.batch_id}")
    lines.append(f"  生成时间: {result.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 60)
    lines.append("")

    # 总体统计
    lines.append("【总体统计】")
    lines.append(f"  涉及箱数: {result.total_boxes}")
    lines.append(f"  完整流程: {result.complete_boxes}")
    lines.append(f"  未完成:   {result.total_boxes - result.complete_boxes}")
    lines.append(f"  异常数:   {len(result.anomalies)}")
    lines.append("")

    # 1. 缺箱清单
    missing = result.missing_boxes
    lines.append(f"【缺箱清单】（共 {len(missing)} 个）")
    if missing:
        lines.append(f"  {'箱号':<12} {'当前状态':<8} {'出库时间':<18} {'出库门店':<10} {'出库行号':<10}")
        lines.append("  " + "-" * 60)
        for box in sorted(missing, key=lambda b: b.box_id):
            out = box.outbound
            lines.append(
                f"  {box.box_id:<12} {box.status:<8} "
                f"{_fmt_time(out.scan_time if out else None):<18} "
                f"{(out.store if out else ''):<10} "
                f"{(str(out.source_line) if out else '-'):<10}"
            )
    else:
        lines.append("  ✓ 全部回仓，无缺箱")
    lines.append("")

    # 2. 超温箱
    over_temp = result.over_temp_boxes
    lines.append(f"【超温箱】（共 {len(over_temp)} 个，阈值 8℃）")
    if over_temp:
        lines.append(f"  {'箱号':<12} {'环节':<6} {'温度':<10} {'时间':<18} {'来源文件':<20} {'行号':<6}")
        lines.append("  " + "-" * 66)
        for box in sorted(over_temp, key=lambda b: b.box_id):
            for rec in (box.outbound, box.arrive, box.return_, box.clean):
                if rec and rec.temperature is not None and rec.temperature > 8:
                    lines.append(
                        f"  {box.box_id:<12} {SCAN_TYPE_CN.get(rec.scan_type, rec.scan_type):<6} "
                        f"{_fmt_temp(rec.temperature):<10} {_fmt_time(rec.scan_time):<18} "
                        f"{rec.source_file:<20} {rec.source_line:<6}"
                    )
    else:
        lines.append("  ✓ 无超温箱")
    lines.append("")

    # 3. 门店签收差异
    store_diff = result.store_diff_boxes
    lines.append(f"【门店签收差异】（共 {len(store_diff)} 个）")
    if store_diff:
        lines.append(f"  {'箱号':<12} {'出库门店':<12} {'到店门店':<12} {'到店行号':<10}")
        lines.append("  " + "-" * 50)
        for box in sorted(store_diff, key=lambda b: b.box_id):
            out_store = box.outbound.store if box.outbound else ""
            arr_store = box.arrive.store if box.arrive else ""
            arr_line = box.arrive.source_line if box.arrive else 0
            lines.append(
                f"  {box.box_id:<12} {out_store:<12} {arr_store:<12} {arr_line:<10}"
            )
    else:
        lines.append("  ✓ 无门店差异")
    lines.append("")

    return "\n".join(lines)


def generate_full_report(result: BatchResult) -> str:
    """生成完整报告，包含所有异常和详细信息。"""
    lines = [generate_summary(result)]
    lines.append("=" * 60)
    lines.append("【完整异常清单】")
    lines.append("=" * 60)
    lines.append("")

    if not result.anomalies:
        lines.append("  无异常")
        return "\n".join(lines)

    # 按类别分组
    by_category: Dict[str, List[Anomaly]] = {}
    for a in result.anomalies:
        by_category.setdefault(a.category, []).append(a)

    for cat, anomalies in sorted(by_category.items()):
        error_count = sum(1 for a in anomalies if a.level == "error")
        warn_count = sum(1 for a in anomalies if a.level == "warning")
        lines.append(f"■ {cat}（错误 {error_count}, 警告 {warn_count}）")
        lines.append(f"  {'级别':<6} {'箱号':<12} {'环节':<6} {'来源文件':<20} {'行号':<6} 描述")
        lines.append("  " + "-" * 70)
        for a in sorted(anomalies, key=lambda x: (x.level, x.box_id)):
            level_mark = "✗" if a.level == "error" else "!"
            lines.append(
                f"  {level_mark:<5} {a.box_id:<12} "
                f"{SCAN_TYPE_CN.get(a.scan_type, a.scan_type):<6} "
                f"{a.source_file:<20} {a.source_line:<6} {a.message}"
            )
        lines.append("")

    return "\n".join(lines)


def export_anomalies_csv(result: BatchResult, output_path: str) -> str:
    """导出异常明细 CSV，带原始行号，方便运营排查。"""
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "级别", "类别", "箱号", "环节", "描述",
            "来源文件", "原始行号", "原始数据",
        ])
        for a in result.anomalies:
            writer.writerow([
                a.level,
                a.category,
                a.box_id,
                SCAN_TYPE_CN.get(a.scan_type, a.scan_type),
                a.message,
                a.source_file,
                a.source_line,
                str(a.raw),
            ])

    return output_path


def export_boxes_csv(result: BatchResult, output_path: str) -> str:
    """导出全量箱子明细 CSV。"""
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "箱号", "状态", "是否完整",
            "出库时间", "出库门店", "出库温度", "出库来源", "出库行号",
            "到店时间", "到店门店", "到店温度", "到店来源", "到店行号",
            "回仓时间", "回仓门店", "回仓温度", "回仓来源", "回仓行号",
            "清洗时间", "清洗门店", "清洗温度", "清洗来源", "清洗行号",
        ])

        for box_id, box in sorted(result.boxes.items()):
            def rec_cols(rec: ScanRecord | None):
                if rec is None:
                    return ["", "", "", "", ""]
                return [
                    _fmt_time(rec.scan_time),
                    rec.store,
                    _fmt_temp(rec.temperature),
                    rec.source_file,
                    rec.source_line,
                ]

            writer.writerow([
                box.box_id,
                box.status,
                "是" if box.is_complete else "否",
                *rec_cols(box.outbound),
                *rec_cols(box.arrive),
                *rec_cols(box.return_),
                *rec_cols(box.clean),
            ])

    return output_path
