"""结果导出模块 - 明细、复核列表、可发送报告"""

import csv
import json
import os
from typing import List
from datetime import datetime

from .models import ScheduleResult, PlotResult, PlotStatus


DETAIL_FILENAME = "detail.csv"
REVIEW_FILENAME = "review_list.csv"
REPORT_MD_FILENAME = "report.md"
REPORT_JSON_FILENAME = "report.json"
SUMMARY_FILENAME = "summary.txt"


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def export_detail_csv(result: ScheduleResult, output_dir: str) -> str:
    """导出明细 CSV"""
    _ensure_dir(output_dir)
    filepath = os.path.join(output_dir, DETAIL_FILENAME)

    fieldnames = [
        "batch_id", "batch_name", "plot_id", "plot_name", "status",
        "group_id", "group_name", "sequence", "start_time", "end_time",
        "error_reason", "review_reason",
    ]

    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in result.plot_results:
            row = r.to_dict()
            row["batch_id"] = result.batch.batch_id
            row["batch_name"] = result.batch.batch_name
            writer.writerow(row)

    return filepath


def export_review_csv(result: ScheduleResult, output_dir: str) -> str:
    """导出人工复核列表 CSV"""
    _ensure_dir(output_dir)
    filepath = os.path.join(output_dir, REVIEW_FILENAME)

    fieldnames = [
        "batch_id", "plot_id", "plot_name", "review_reason",
        "suggestion", "reviewer", "review_time",
    ]

    review_items = [r for r in result.plot_results if r.status == PlotStatus.REVIEW]

    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in review_items:
            writer.writerow({
                "batch_id": result.batch.batch_id,
                "plot_id": r.plot_id,
                "plot_name": r.plot_name,
                "review_reason": r.review_reason,
                "suggestion": "",
                "reviewer": "",
                "review_time": "",
            })

    return filepath


def generate_report_markdown(result: ScheduleResult) -> str:
    """生成 Markdown 格式的可发送报告"""
    lines = []

    lines.append(f"# 农田灌溉轮灌计划报告")
    lines.append("")
    lines.append(f"**批次号**：{result.batch.batch_id}  ")
    lines.append(f"**批次名称**：{result.batch.batch_name}  ")
    lines.append(f"**生成时间**：{result.batch.created_at}  ")
    lines.append(f"**输入哈希**：{result.batch.input_hash}  ")
    if result.is_idempotent:
        lines.append(f"**幂等复用**：是（来源批次：{result.source_batch_id}）  ")
    lines.append("")

    lines.append("## 一、执行摘要")
    lines.append("")
    lines.append(f"- **总地块数**：{result.total_plots}")
    lines.append(f"- **成功分配**：{result.success_count}")
    lines.append(f"- **分配失败**：{result.failed_count}")
    lines.append(f"- **待人工复核**：{result.review_count}")
    success_rate = (result.success_count / result.total_plots * 100) if result.total_plots > 0 else 0
    lines.append(f"- **成功率**：{success_rate:.1f}%")
    lines.append("")

    lines.append("## 二、轮灌组统计")
    lines.append("")

    group_stats: dict[str, dict] = {}
    for r in result.plot_results:
        if r.status != PlotStatus.SUCCESS:
            continue
        gname = r.group_name
        if gname not in group_stats:
            group_stats[gname] = {"count": 0, "sequences": set()}
        group_stats[gname]["count"] += 1
        group_stats[gname]["sequences"].add(r.sequence)

    if group_stats:
        lines.append("| 轮灌规则 | 地块数 | 组数 |")
        lines.append("|---------|-------|------|")
        for gname, stats in sorted(group_stats.items()):
            lines.append(f"| {gname} | {stats['count']} | {len(stats['sequences'])} |")
    else:
        lines.append("_无成功分配的轮灌组_")
    lines.append("")

    if result.failed_count > 0:
        lines.append("## 三、分配失败明细")
        lines.append("")
        failed_items = [r for r in result.plot_results if r.status == PlotStatus.FAILED]
        lines.append("| 地块ID | 地块名称 | 失败原因 |")
        lines.append("|--------|---------|---------|")
        for r in failed_items[:20]:
            lines.append(f"| {r.plot_id} | {r.plot_name} | {r.error_reason} |")
        if len(failed_items) > 20:
            lines.append(f"| ... 共 {len(failed_items)} 条，更多见明细文件 ... | | |")
        lines.append("")

    if result.review_count > 0:
        lines.append("## 四、待人工复核明细")
        lines.append("")
        review_items = [r for r in result.plot_results if r.status == PlotStatus.REVIEW]
        lines.append("| 地块ID | 地块名称 | 复核原因 |")
        lines.append("|--------|---------|---------|")
        for r in review_items[:20]:
            lines.append(f"| {r.plot_id} | {r.plot_name} | {r.review_reason} |")
        if len(review_items) > 20:
            lines.append(f"| ... 共 {len(review_items)} 条，更多见复核列表文件 ... | | |")
        lines.append("")

    if result.warnings:
        lines.append("## 五、警告信息")
        lines.append("")
        for w in result.warnings:
            lines.append(f"- ⚠️ {w}")
        lines.append("")

    lines.append("## 六、数据溯源")
    lines.append("")
    lines.append(f"- **来源文件**：{', '.join(result.batch.source_files) if result.batch.source_files else '无'}")
    lines.append(f"- **处理批次**：{result.batch.batch_id}")
    lines.append("- **数据口径说明**：")
    lines.append("  - 按优先级从高到低排序分配")
    lines.append("  - 同片区、同作物类型地块优先归组")
    lines.append("  - 满足规则限制条件（最大地块数/面积/用水量）方可入组")
    lines.append("  - 无匹配规则的地块标记为待复核")
    lines.append("  - 所有适用规则均超限的地块标记为失败")
    lines.append("")

    lines.append("---")
    lines.append(f"_报告生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_")

    return "\n".join(lines)


def export_report(result: ScheduleResult, output_dir: str) -> dict:
    """导出报告（Markdown + JSON）"""
    _ensure_dir(output_dir)

    md_content = generate_report_markdown(result)
    md_path = os.path.join(output_dir, REPORT_MD_FILENAME)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    json_data = {
        "batch_id": result.batch.batch_id,
        "batch_name": result.batch.batch_name,
        "created_at": result.batch.created_at,
        "input_hash": result.batch.input_hash,
        "is_idempotent": result.is_idempotent,
        "source_batch_id": result.source_batch_id,
        "summary": {
            "total": result.total_plots,
            "success": result.success_count,
            "failed": result.failed_count,
            "review": result.review_count,
            "success_rate": (
                result.success_count / result.total_plots * 100
                if result.total_plots > 0 else 0
            ),
        },
        "source_files": result.batch.source_files,
        "warnings": result.warnings,
        "results": [r.to_dict() for r in result.plot_results],
    }

    json_path = os.path.join(output_dir, REPORT_JSON_FILENAME)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

    return {"markdown": md_path, "json": json_path}


def export_all(result: ScheduleResult, output_dir: str) -> dict:
    """导出所有结果文件"""
    _ensure_dir(output_dir)

    detail_path = export_detail_csv(result, output_dir)
    review_path = export_review_csv(result, output_dir)
    report_paths = export_report(result, output_dir)

    return {
        "detail": detail_path,
        "review": review_path,
        "report_md": report_paths["markdown"],
        "report_json": report_paths["json"],
    }
