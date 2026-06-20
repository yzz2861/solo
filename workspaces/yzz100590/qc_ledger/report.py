from collections import defaultdict
from datetime import datetime, timedelta
from typing import List
import os
import pandas as pd
from tabulate import tabulate
from .models import (
    MergedRecord, Warning,
    STATUS_REWORK_PASSED, STATUS_CONCESSION, STATUS_PENDING,
    STATUS_SCRAPPED, STATUS_TAKEN_AWAY, STATUS_REWORKING,
)


def _filter_by_date_range(records: List[MergedRecord], start_date, end_date) -> List[MergedRecord]:
    result = []
    for r in records:
        d = r.defect_date or r.reinspection_date
        if d is None:
            continue
        if start_date and d < start_date:
            continue
        if end_date and d > end_date:
            continue
        result.append(r)
    return result


def generate_manager_weekly_report(
    merged: List[MergedRecord],
    warnings: List[Warning],
    output_path: str = None,
    start_date: datetime = None,
    end_date: datetime = None,
) -> str:
    records = _filter_by_date_range(merged, start_date, end_date)
    records.sort(key=lambda r: (r.reinspection_date or r.defect_date or datetime.min), reverse=True)

    process_stats: dict = defaultdict(lambda: {
        "total": 0, "rework_passed": 0, "concession": 0,
        "pending": 0, "scrapped": 0, "taken_away": 0, "reworking": 0,
        "qty": 0,
    })
    team_stats: dict = defaultdict(lambda: {
        "total": 0, "rework_passed": 0, "concession": 0, "pending": 0, "qty": 0,
    })
    defect_stats: dict = defaultdict(int)

    for r in records:
        ps = process_stats[r.process]
        ps["total"] += 1
        ps["qty"] += r.quantity
        if r.status == STATUS_REWORK_PASSED:
            ps["rework_passed"] += 1
        elif r.status == STATUS_CONCESSION:
            ps["concession"] += 1
        elif r.status == STATUS_PENDING:
            ps["pending"] += 1
        elif r.status == STATUS_SCRAPPED:
            ps["scrapped"] += 1
        elif r.status == STATUS_TAKEN_AWAY:
            ps["taken_away"] += 1
        elif r.status == STATUS_REWORKING:
            ps["reworking"] += 1

        ts = team_stats[r.responsible_team]
        ts["total"] += 1
        ts["qty"] += r.quantity
        if r.status == STATUS_REWORK_PASSED:
            ts["rework_passed"] += 1
        elif r.status == STATUS_CONCESSION:
            ts["concession"] += 1
        elif r.status == STATUS_PENDING:
            ts["pending"] += 1

        defect_stats[r.defect_item] += r.quantity

    total_records = len(records)
    total_qty = sum(r.quantity for r in records)
    rework_passed_count = sum(1 for r in records if r.status == STATUS_REWORK_PASSED)
    concession_count = sum(1 for r in records if r.status == STATUS_CONCESSION)
    pending_count = sum(1 for r in records if r.status == STATUS_PENDING)
    scrapped_count = sum(1 for r in records if r.status == STATUS_SCRAPPED)
    taken_away_count = sum(1 for r in records if r.status == STATUS_TAKEN_AWAY)
    reworking_count = sum(1 for r in records if r.status == STATUS_REWORKING)

    date_str = ""
    if start_date and end_date:
        date_str = f"（{start_date.strftime('%Y-%m-%d')} 至 {end_date.strftime('%Y-%m-%d')}）"
    elif start_date:
        date_str = f"（自 {start_date.strftime('%Y-%m-%d')} 起）"
    elif end_date:
        date_str = f"（截至 {end_date.strftime('%Y-%m-%d')}）"

    report_lines = []
    report_lines.append("=" * 80)
    report_lines.append(f"                        质量不合格周报{date_str}")
    report_lines.append("=" * 80)
    report_lines.append("")
    report_lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append("")

    report_lines.append("-" * 80)
    report_lines.append("一、总体统计")
    report_lines.append("-" * 80)
    report_lines.append(f"  不合格记录总数: {total_records} 条")
    report_lines.append(f"  不合格数量总计: {total_qty} 件")
    report_lines.append("")
    report_lines.append(f"  返工通过:   {rework_passed_count:>4} 条  ({rework_passed_count/total_records*100:.1f}%)" if total_records else "  返工通过:      0 条")
    report_lines.append(f"  让步接收:   {concession_count:>4} 条  ({concession_count/total_records*100:.1f}%)" if total_records else "  让步接收:      0 条")
    report_lines.append(f"  返工中:     {reworking_count:>4} 条  ({reworking_count/total_records*100:.1f}%)" if total_records else "  返工中:        0 条")
    report_lines.append(f"  待复检:     {pending_count:>4} 条  ({pending_count/total_records*100:.1f}%)" if total_records else "  待复检:        0 条")
    report_lines.append(f"  未复检取走: {taken_away_count:>4} 条  ({taken_away_count/total_records*100:.1f}%)" if total_records else "  未复检取走:    0 条")
    report_lines.append(f"  报废:       {scrapped_count:>4} 条  ({scrapped_count/total_records*100:.1f}%)" if total_records else "  报废:          0 条")
    report_lines.append("")

    report_lines.append("-" * 80)
    report_lines.append("二、按工序统计（不合格集中点分析）")
    report_lines.append("-" * 80)

    process_table = []
    for process, stats in sorted(process_stats.items(), key=lambda x: -x[1]["total"]):
        process_table.append([
            process, stats["total"], stats["qty"],
            stats["rework_passed"], stats["concession"],
            stats["reworking"], stats["pending"],
            stats["taken_away"], stats["scrapped"],
        ])

    if process_table:
        report_lines.append(tabulate(
            process_table,
            headers=["工序", "记录数", "数量", "返工通过", "让步接收", "返工中", "待复检", "未复检取走", "报废"],
            tablefmt="simple",
        ))
    else:
        report_lines.append("  （无数据）")
    report_lines.append("")

    top_processes = sorted(process_stats.items(), key=lambda x: -x[1]["total"])[:3]
    if top_processes:
        report_lines.append("  ⚠ 重点关注工序:")
        for i, (proc, stats) in enumerate(top_processes, 1):
            pct = stats["total"] / total_records * 100 if total_records else 0
            report_lines.append(f"    {i}. {proc}: {stats['total']} 条 ({pct:.1f}%)")
        report_lines.append("")

    report_lines.append("-" * 80)
    report_lines.append("三、按责任班组统计")
    report_lines.append("-" * 80)

    team_table = []
    for team, stats in sorted(team_stats.items(), key=lambda x: -x[1]["total"]):
        team_table.append([
            team, stats["total"], stats["qty"],
            stats["rework_passed"], stats["concession"], stats["pending"],
        ])

    if team_table:
        report_lines.append(tabulate(
            team_table,
            headers=["责任班组", "记录数", "数量", "返工通过", "让步接收", "待处理"],
            tablefmt="simple",
        ))
    else:
        report_lines.append("  （无数据）")
    report_lines.append("")

    report_lines.append("-" * 80)
    report_lines.append("四、不合格项类型 TOP 10")
    report_lines.append("-" * 80)

    defect_table = []
    for defect, qty in sorted(defect_stats.items(), key=lambda x: -x[1])[:10]:
        defect_table.append([defect, qty])

    if defect_table:
        report_lines.append(tabulate(defect_table, headers=["不合格项", "数量"], tablefmt="simple"))
    else:
        report_lines.append("  （无数据）")
    report_lines.append("")

    report_lines.append("-" * 80)
    report_lines.append("五、问题警示汇总")
    report_lines.append("-" * 80)

    high_warnings = [w for w in warnings if w.level == "HIGH"]
    medium_warnings = [w for w in warnings if w.level == "MEDIUM"]
    low_warnings = [w for w in warnings if w.level == "LOW"]

    report_lines.append(f"  HIGH 级别警示: {len(high_warnings)} 条")
    for w in high_warnings[:20]:
        report_lines.append(f"    [{w.category}] {w.message}")
    if len(high_warnings) > 20:
        report_lines.append(f"    ... 还有 {len(high_warnings) - 20} 条")

    report_lines.append(f"  MEDIUM 级别警示: {len(medium_warnings)} 条")
    for w in medium_warnings[:15]:
        report_lines.append(f"    [{w.category}] {w.message}")
    if len(medium_warnings) > 15:
        report_lines.append(f"    ... 还有 {len(medium_warnings) - 15} 条")

    report_lines.append(f"  LOW 级别警示: {len(low_warnings)} 条")
    for w in low_warnings[:10]:
        report_lines.append(f"    [{w.category}] {w.message}")
    if len(low_warnings) > 10:
        report_lines.append(f"    ... 还有 {len(low_warnings) - 10} 条")
    report_lines.append("")

    report_lines.append("-" * 80)
    report_lines.append("六、明细列表（按复检日期倒序）")
    report_lines.append("-" * 80)

    detail_table = []
    for r in records:
        detail_table.append([
            r.batch_no,
            r.process,
            r.defect_item,
            r.defect_date.strftime("%Y-%m-%d") if r.defect_date else "-",
            r.responsible_team,
            r.quantity,
            r.status,
            r.reinspection_date.strftime("%Y-%m-%d") if r.reinspection_date else "-",
            r.rework_count if r.rework_count > 0 else "-",
            "是" if r.is_concession_approved else ("否" if r.is_concession_approved is False else "-"),
        ])

    if detail_table:
        report_lines.append(tabulate(
            detail_table,
            headers=["批次号", "工序", "不合格项", "发现日期", "责任班组", "数量", "状态", "复检日期", "返工次数", "让步审批"],
            tablefmt="simple",
        ))
    else:
        report_lines.append("  （无数据）")
    report_lines.append("")

    report_lines.append("=" * 80)
    report_text = "\n".join(report_lines)

    if output_path:
        ext = os.path.splitext(output_path)[1].lower()
        if ext in [".xlsx", ".xls"]:
            _export_report_excel(records, warnings, process_stats, team_stats, defect_stats, output_path)
        else:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(report_text)

    return report_text


def _export_report_excel(records, warnings, process_stats, team_stats, defect_stats, output_path):
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame([{
            "批次号": r.batch_no,
            "工序": r.process,
            "不合格项": r.defect_item,
            "发现日期": r.defect_date.strftime("%Y-%m-%d") if r.defect_date else "",
            "责任班组": r.responsible_team,
            "数量": r.quantity,
            "状态": r.status,
            "复检日期": r.reinspection_date.strftime("%Y-%m-%d") if r.reinspection_date else "",
            "复检结果": r.reinspection_result,
            "复检人": r.reinspector,
            "返工次数": r.rework_count,
            "让步审批": "是" if r.is_concession_approved else ("否" if r.is_concession_approved is False else ""),
            "检验员": r.inspector,
            "备注": r.defect_remark,
        } for r in records]).to_excel(writer, sheet_name="明细", index=False)

        pd.DataFrame([{
            "工序": proc,
            "记录数": s["total"],
            "数量": s["qty"],
            "返工通过": s["rework_passed"],
            "让步接收": s["concession"],
            "返工中": s["reworking"],
            "待复检": s["pending"],
            "未复检取走": s["taken_away"],
            "报废": s["scrapped"],
        } for proc, s in process_stats.items()]).to_excel(writer, sheet_name="工序统计", index=False)

        pd.DataFrame([{
            "责任班组": team,
            "记录数": s["total"],
            "数量": s["qty"],
            "返工通过": s["rework_passed"],
            "让步接收": s["concession"],
            "待处理": s["pending"],
        } for team, s in team_stats.items()]).to_excel(writer, sheet_name="班组统计", index=False)

        pd.DataFrame([{
            "不合格项": defect,
            "数量": qty,
        } for defect, qty in defect_stats.items()]).to_excel(writer, sheet_name="不合格项统计", index=False)

        pd.DataFrame([{
            "级别": w.level,
            "类别": w.category,
            "批次号": w.batch_no,
            "工序": w.process,
            "信息": w.message,
        } for w in warnings]).to_excel(writer, sheet_name="警示信息", index=False)
