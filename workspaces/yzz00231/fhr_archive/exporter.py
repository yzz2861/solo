import csv
import json
import os
from datetime import datetime
from typing import List
from .models import DetailRecord, ReviewItem, ArchiveSummary


class ReportExporter:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def export_text_report(
        self,
        summary: ArchiveSummary,
        details: List[DetailRecord],
        review_items: List[ReviewItem],
        filename: str = None
    ) -> str:
        if not filename:
            filename = f"report_{summary.batch_id}.txt"

        filepath = os.path.join(self.output_dir, filename)

        lines = []
        lines.append("=" * 60)
        lines.append("产房胎心监护归档报告")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"批次ID: {summary.batch_id}")
        lines.append(f"来源标识: {summary.source_identifier}")
        lines.append(f"生成时间: {summary.generated_at}")
        lines.append("")
        lines.append("-" * 40)
        lines.append("一、汇总统计")
        lines.append("-" * 40)
        lines.append(f"总记录数: {summary.total_records}")
        lines.append(f"正常记录: {summary.valid_records}")
        lines.append(f"异常记录: {summary.invalid_records}")
        lines.append(f"需复核记录: {summary.review_required}")
        lines.append(f"材料缺失记录: {summary.missing_material_count}")
        lines.append(f"超阈值记录: {summary.over_threshold_count}")
        lines.append("")
        lines.append("风险等级分布:")
        for level in ["critical", "high", "medium", "low", "normal"]:
            count = summary.risk_counts.get(level, 0)
            label = self._risk_label(level)
            lines.append(f"  {label}: {count}")
        lines.append("")
        lines.append("-" * 40)
        lines.append("二、需复核列表")
        lines.append("-" * 40)

        if review_items:
            for i, item in enumerate(review_items, 1):
                lines.append(f"{i}. [{self._risk_label(item.risk_level)}] {item.patient_name}")
                lines.append(f"   记录ID: {item.record_id}")
                lines.append(f"   检查时间: {item.exam_time}")
                lines.append(f"   复核原因: {item.review_reason}")
                lines.append(f"   风险标签: {', '.join(item.risk_tags)}")
                lines.append("")
        else:
            lines.append("  暂无需要复核的记录")
            lines.append("")

        lines.append("-" * 40)
        lines.append("三、明细记录")
        lines.append("-" * 40)

        for i, d in enumerate(details, 1):
            status = "需复核" if d.needs_review else "正常"
            lines.append(f"{i}. {d.patient_name} ({status})")
            lines.append(f"   记录ID: {d.record_id} | 住院号: {d.admission_no}")
            lines.append(f"   检查时间: {d.exam_time}")
            lines.append(f"   风险等级: {self._risk_label(d.risk_level)}")
            if d.risk_tags:
                lines.append(f"   风险标签: {', '.join(d.risk_tags)}")
            if d.review_reason:
                lines.append(f"   复核原因: {d.review_reason}")
            lines.append("")

        lines.append("=" * 60)
        lines.append("报告结束")
        lines.append("=" * 60)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return filepath

    def export_html_report(
        self,
        summary: ArchiveSummary,
        details: List[DetailRecord],
        review_items: List[ReviewItem],
        filename: str = None
    ) -> str:
        if not filename:
            filename = f"report_{summary.batch_id}.html"

        filepath = os.path.join(self.output_dir, filename)

        risk_color = {
            "critical": "#dc2626",
            "high": "#ea580c",
            "medium": "#ca8a04",
            "low": "#2563eb",
            "normal": "#16a34a",
        }

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>产房胎心监护归档报告</title>
<style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; color: #333; }}
    h1 {{ color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }}
    h2 {{ color: #1e3a8a; margin-top: 30px; }}
    .summary-card {{ background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 15px 0; }}
    .summary-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }}
    .summary-item {{ text-align: center; padding: 15px; background: white; border-radius: 6px; }}
    .summary-item .number {{ font-size: 28px; font-weight: bold; color: #1e40af; }}
    .summary-item .label {{ color: #666; margin-top: 5px; }}
    .risk-badge {{ display: inline-block; padding: 2px 8px; border-radius: 12px; color: white; font-size: 12px; }}
    table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
    th, td {{ border: 1px solid #e5e7eb; padding: 10px; text-align: left; }}
    th {{ background: #f3f4f6; font-weight: 600; }}
    tr:nth-child(even) {{ background: #f9fafb; }}
    .meta {{ color: #666; font-size: 14px; margin-bottom: 20px; }}
    .risk-distribution {{ display: flex; gap: 10px; flex-wrap: wrap; }}
    .risk-item {{ padding: 8px 16px; border-radius: 6px; color: white; }}
</style>
</head>
<body>
<h1>🏥 产房胎心监护归档报告</h1>

<div class="meta">
    <p><strong>批次ID:</strong> {summary.batch_id} &nbsp;|&nbsp;
    <strong>来源标识:</strong> {summary.source_identifier} &nbsp;|&nbsp;
    <strong>生成时间:</strong> {summary.generated_at}</p>
</div>

<h2>📊 汇总统计</h2>
<div class="summary-card">
    <div class="summary-grid">
        <div class="summary-item">
            <div class="number">{summary.total_records}</div>
            <div class="label">总记录数</div>
        </div>
        <div class="summary-item">
            <div class="number" style="color: #16a34a;">{summary.valid_records}</div>
            <div class="label">正常记录</div>
        </div>
        <div class="summary-item">
            <div class="number" style="color: #dc2626;">{summary.review_required}</div>
            <div class="label">需复核记录</div>
        </div>
    </div>
    <div style="margin-top: 20px;">
        <p><strong>风险等级分布:</strong></p>
        <div class="risk-distribution">
"""

        for level in ["critical", "high", "medium", "low", "normal"]:
            count = summary.risk_counts.get(level, 0)
            label = self._risk_label(level)
            color = risk_color.get(level, "#666")
            html += f'            <div class="risk-item" style="background: {color};">{label}: {count}</div>\n'

        html += f"""
        </div>
    </div>
    <p style="margin-top: 15px;">
        <strong>材料缺失:</strong> {summary.missing_material_count} 条 &nbsp;|&nbsp;
        <strong>超阈值:</strong> {summary.over_threshold_count} 条
    </p>
</div>

<h2>⚠️ 需复核列表</h2>
"""

        if review_items:
            html += '<table>\n<tr><th>序号</th><th>患者姓名</th><th>记录ID</th><th>检查时间</th><th>风险等级</th><th>复核原因</th><th>风险标签</th></tr>\n'
            for i, item in enumerate(review_items, 1):
                color = risk_color.get(item.risk_level, "#666")
                label = self._risk_label(item.risk_level)
                tags = ", ".join(item.risk_tags)
                html += f'<tr><td>{i}</td><td>{item.patient_name}</td><td>{item.record_id}</td><td>{item.exam_time}</td><td><span class="risk-badge" style="background: {color};">{label}</span></td><td>{item.review_reason}</td><td>{tags}</td></tr>\n'
            html += '</table>\n'
        else:
            html += '<p style="color: #16a34a;">✅ 暂无需要复核的记录</p>\n'

        html += """
<h2>📋 明细记录</h2>
<table>
<tr><th>序号</th><th>患者姓名</th><th>住院号</th><th>检查时间</th><th>风险等级</th><th>风险标签</th><th>是否需复核</th><th>复核原因</th></tr>
"""

        for i, d in enumerate(details, 1):
            color = risk_color.get(d.risk_level, "#666")
            label = self._risk_label(d.risk_level)
            tags = ", ".join(d.risk_tags) if d.risk_tags else "-"
            review_text = "是" if d.needs_review else "否"
            reason = d.review_reason if d.review_reason else "-"
            html += f'<tr><td>{i}</td><td>{d.patient_name}</td><td>{d.admission_no}</td><td>{d.exam_time}</td><td><span class="risk-badge" style="background: {color};">{label}</span></td><td>{tags}</td><td>{review_text}</td><td>{reason}</td></tr>\n'

        html += """</table>

<p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #999; text-align: center;">
    报告由产房胎心监护归档系统自动生成
</p>
</body>
</html>"""

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html)

        return filepath

    def export_csv_package(
        self,
        summary: ArchiveSummary,
        details: List[DetailRecord],
        review_items: List[ReviewItem],
        prefix: str = None
    ) -> List[str]:
        if not prefix:
            prefix = summary.batch_id

        files = []

        detail_file = os.path.join(self.output_dir, f"{prefix}_details.csv")
        with open(detail_file, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "记录ID", "患者ID", "患者姓名", "住院号", "检查时间",
                "风险等级", "风险标签", "是否需复核", "复核原因",
                "批次ID", "来源标识",
            ])
            for d in details:
                writer.writerow([
                    d.record_id, d.patient_id, d.patient_name,
                    d.admission_no, d.exam_time,
                    d.risk_level, "; ".join(d.risk_tags),
                    "是" if d.needs_review else "否", d.review_reason,
                    d.batch_id, d.source_identifier,
                ])
        files.append(detail_file)

        review_file = os.path.join(self.output_dir, f"{prefix}_review.csv")
        with open(review_file, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "记录ID", "患者姓名", "检查时间", "风险等级",
                "复核原因", "风险标签", "批次ID", "来源标识",
            ])
            for item in review_items:
                writer.writerow([
                    item.record_id, item.patient_name, item.exam_time,
                    item.risk_level, item.review_reason,
                    "; ".join(item.risk_tags), item.batch_id, item.source_identifier,
                ])
        files.append(review_file)

        summary_file = os.path.join(self.output_dir, f"{prefix}_summary.csv")
        with open(summary_file, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["指标", "数值"])
            writer.writerow(["总记录数", summary.total_records])
            writer.writerow(["正常记录", summary.valid_records])
            writer.writerow(["异常记录", summary.invalid_records])
            writer.writerow(["需复核记录", summary.review_required])
            writer.writerow(["材料缺失记录", summary.missing_material_count])
            writer.writerow(["超阈值记录", summary.over_threshold_count])
            writer.writerow(["批次ID", summary.batch_id])
            writer.writerow(["来源标识", summary.source_identifier])
            writer.writerow(["生成时间", summary.generated_at])
            for level, count in summary.risk_counts.items():
                writer.writerow([f"风险等级-{self._risk_label(level)}", count])
        files.append(summary_file)

        return files

    def _risk_label(self, level: str) -> str:
        labels = {
            "critical": "危重",
            "high": "高风险",
            "medium": "中风险",
            "low": "低风险",
            "normal": "正常",
        }
        return labels.get(level, level)
