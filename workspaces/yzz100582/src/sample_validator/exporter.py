import os
from datetime import datetime
from typing import List
from jinja2 import Template

from .models import ValidationReport, BoxOccupancy, SampleRecord, RiskLevel


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>冻存盒清单 - {{ generated_at }}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    padding: 20px;
    font-size: 12px;
    color: #333;
    background: #f5f5f5;
  }
  .header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #333;
  }
  .header h1 {
    font-size: 24px;
    margin-bottom: 8px;
  }
  .header .meta {
    font-size: 12px;
    color: #666;
  }
  .summary {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 20px;
    display: flex;
    gap: 30px;
    flex-wrap: wrap;
  }
  .summary-item {
    text-align: center;
  }
  .summary-item .num {
    font-size: 20px;
    font-weight: bold;
    color: #2563eb;
  }
  .summary-item .label {
    font-size: 11px;
    color: #666;
    margin-top: 2px;
  }
  .box-section {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 6px;
    margin-bottom: 20px;
    page-break-inside: avoid;
  }
  .box-header {
    background: #f0f4ff;
    padding: 10px 16px;
    border-bottom: 1px solid #ddd;
    border-radius: 6px 6px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .box-header h2 {
    font-size: 16px;
    color: #1e40af;
  }
  .box-header .box-desc {
    font-size: 12px;
    color: #666;
    margin-left: 10px;
  }
  .box-stats {
    font-size: 12px;
    color: #666;
  }
  .box-stats .rate {
    font-weight: bold;
    margin-left: 4px;
  }
  .rate-high { color: #dc2626; }
  .rate-mid { color: #d97706; }
  .rate-low { color: #16a34a; }
  .grid-container {
    padding: 12px 16px;
    overflow-x: auto;
  }
  table.grid {
    border-collapse: collapse;
    width: 100%;
    font-size: 11px;
  }
  table.grid th {
    background: #f3f4f6;
    font-weight: 600;
    color: #374151;
    padding: 6px 4px;
    text-align: center;
    border: 1px solid #d1d5db;
    min-width: 28px;
  }
  table.grid th.row-label {
    min-width: 24px;
    width: 24px;
  }
  table.grid td {
    border: 1px solid #d1d5db;
    padding: 4px;
    text-align: center;
    height: 32px;
    vertical-align: middle;
    position: relative;
  }
  .cell-empty {
    background: #f9fafb;
    color: #d1d5db;
    font-size: 10px;
  }
  .cell-occupied {
    background: #dbeafe;
    color: #1e40af;
    font-weight: 500;
    cursor: pointer;
  }
  .cell-temp {
    background: #fef3c7;
    color: #92400e;
    font-weight: 500;
  }
  .cell-conflict {
    background: #fee2e2;
    color: #dc2626;
    font-weight: bold;
  }
  .cell-sample-id {
    font-size: 9px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 60px;
    display: block;
  }
  .sample-list {
    padding: 10px 16px;
    border-top: 1px solid #eee;
  }
  .sample-list h3 {
    font-size: 13px;
    color: #374151;
    margin-bottom: 8px;
  }
  .sample-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  .sample-table th {
    background: #f3f4f6;
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid #d1d5db;
  }
  .sample-table td {
    padding: 4px 8px;
    border-bottom: 1px solid #f0f0f0;
  }
  .legend {
    display: flex;
    gap: 16px;
    padding: 8px 16px;
    background: #fafafa;
    border-top: 1px solid #eee;
    font-size: 11px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .legend-box {
    width: 16px;
    height: 16px;
    border: 1px solid #d1d5db;
    border-radius: 2px;
  }
  .free-positions {
    padding: 10px 16px;
    border-top: 1px solid #eee;
    font-size: 11px;
  }
  .free-positions h3 {
    font-size: 12px;
    color: #374151;
    margin-bottom: 6px;
  }
  .free-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .free-tag {
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
  }
  .footer {
    text-align: center;
    color: #999;
    font-size: 10px;
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #eee;
  }
  @media print {
    body {
      background: #fff;
      padding: 10mm;
      font-size: 10px;
    }
    .box-section {
      page-break-inside: avoid;
    }
    @page {
      size: A4;
      margin: 15mm;
    }
  }
  .warnings-section {
    background: #fff7ed;
    border: 1px solid #fdba74;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 20px;
  }
  .warnings-section h2 {
    font-size: 14px;
    color: #c2410c;
    margin-bottom: 8px;
  }
  .warning-item {
    padding: 4px 0;
    font-size: 12px;
    color: #92400e;
    border-bottom: 1px dashed #fed7aa;
  }
  .warning-item:last-child {
    border-bottom: none;
  }
</style>
</head>
<body>

<div class="header">
  <h1>实验室冻存盒清单</h1>
  <div class="meta">
    生成时间: {{ generated_at }} |
    总样本: {{ report.total_samples }} |
    冻存盒: {{ report.total_boxes }}
  </div>
</div>

{% if high_risk_count > 0 %}
<div class="warnings-section">
  <h2>⚠ 高风险问题 ({{ high_risk_count }})</h2>
  {% for issue in high_risk_issues %}
  <div class="warning-item">{{ issue.message }} [{{ issue.issue_type }}]</div>
  {% endfor %}
</div>
{% endif %}

<div class="summary">
  <div class="summary-item">
    <div class="num">{{ report.total_samples }}</div>
    <div class="label">总样本数</div>
  </div>
  <div class="summary-item">
    <div class="num">{{ report.active_samples }}</div>
    <div class="label">在库样本</div>
  </div>
  <div class="summary-item">
    <div class="num">{{ report.temporary_samples }}</div>
    <div class="label">临时样本</div>
  </div>
  <div class="summary-item">
    <div class="num">{{ report.total_boxes }}</div>
    <div class="label">冻存盒数</div>
  </div>
  <div class="summary-item">
    <div class="num" style="color: {{ 'red' if report.high_risk_count > 0 else 'green' }}">
      {{ report.high_risk_count }}
    </div>
    <div class="label">高风险问题</div>
  </div>
</div>

{% for box_id in box_ids_sorted %}
{% set box = report.boxes[box_id] %}
<div class="box-section">
  <div class="box-header">
    <div>
      <h2>{{ box_id }}</h2>
      <span class="box-desc">{{ box.layout.description }}</span>
    </div>
    <div class="box-stats">
      {{ box.used_slots }} / {{ box.total_slots }}
      <span class="rate {{ get_rate_class(box.occupancy_rate) }}">
        ({{ '%.1f'|format(box.occupancy_rate * 100) }}%)
      </span>
    </div>
  </div>

  <div class="grid-container">
    <table class="grid">
      <thead>
        <tr>
          <th class="row-label"></th>
          {% for col in box.layout.col_labels %}
          <th>{{ col }}</th>
          {% endfor %}
        </tr>
      </thead>
      <tbody>
        {% for row_label in box.layout.row_labels %}
        <tr>
          <th class="row-label">{{ row_label }}</th>
          {% for col_label in box.layout.col_labels %}
          {% set pos = row_label + col_label %}
          {% set sample = box.occupied.get(pos) %}
          {% if sample %}
          {% set cell_class = 'cell-temp' if sample.status.value == 'temporary' else 'cell-occupied' %}
          {% if pos in conflict_positions.get(box_id, []) %}
          {% set cell_class = 'cell-conflict' %}
          {% endif %}
          <td class="{{ cell_class }}">
            <span class="cell-sample-id" title="{{ sample.sample_id }}">{{ sample.sample_id }}</span>
          </td>
          {% else %}
          <td class="cell-empty" title="空位">{{ pos }}</td>
          {% endif %}
          {% endfor %}
        </tr>
        {% endfor %}
      </tbody>
    </table>
  </div>

  <div class="legend">
    <div class="legend-item">
      <div class="legend-box" style="background: #dbeafe;"></div>
      <span>在库样本</span>
    </div>
    <div class="legend-item">
      <div class="legend-box" style="background: #fef3c7;"></div>
      <span>临时样本</span>
    </div>
    <div class="legend-item">
      <div class="legend-box" style="background: #fee2e2;"></div>
      <span>冲突位置</span>
    </div>
    <div class="legend-item">
      <div class="legend-box" style="background: #f9fafb;"></div>
      <span>空位 ({{ box.free_slots }})</span>
    </div>
  </div>

  <div class="free-positions">
    <h3>可用空位 ({{ box.free_slots }} 个)</h3>
    <div class="free-tags">
      {% for free_pos in box.get_free_positions() %}
      <span class="free-tag">{{ free_pos }}</span>
      {% endfor %}
    </div>
  </div>

</div>
{% endfor %}

<div class="footer">
  本清单由样本编号校验器自动生成 | 打印前请确认数据为最新版本
</div>

</body>
</html>
"""


def get_rate_class(rate: float) -> str:
    if rate >= 0.9:
        return 'rate-high'
    elif rate >= 0.7:
        return 'rate-mid'
    else:
        return 'rate-low'


def get_conflict_positions(report: ValidationReport) -> dict:
    conflicts = {}
    from .models import RiskLevel
    for issue in report.issues:
        if issue.issue_type == 'position_conflict' and issue.box_id and issue.position:
            box_id = issue.box_id
            pos = issue.position.strip().upper()
            if box_id not in conflicts:
                conflicts[box_id] = set()
            conflicts[box_id].add(pos)
    return conflicts


def export_html_report(report: ValidationReport, output_path: str):
    template = Template(HTML_TEMPLATE)

    conflict_positions = get_conflict_positions(report)
    high_risk_issues = report.get_issues_by_severity(RiskLevel.HIGH)

    box_ids_sorted = sorted(report.boxes.keys())

    html = template.render(
        report=report,
        box_ids_sorted=box_ids_sorted,
        generated_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        high_risk_count=len(high_risk_issues),
        high_risk_issues=high_risk_issues,
        conflict_positions=conflict_positions,
        get_rate_class=get_rate_class
    )

    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)


def export_csv_report(report: ValidationReport, output_dir: str):
    import csv

    os.makedirs(output_dir, exist_ok=True)

    issues_path = os.path.join(output_dir, 'issues.csv')
    with open(issues_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['严重性', '问题类型', '样本号', '盒号', '孔位', '描述', '详情'])
        for issue in report.issues:
            details_str = '; '.join(f'{k}: {v}' for k, v in issue.details.items())
            writer.writerow([
                issue.severity.value,
                issue.issue_type,
                issue.sample_id or '',
                issue.box_id or '',
                issue.position or '',
                issue.message,
                details_str
            ])

    samples_path = os.path.join(output_dir, 'box_inventory.csv')
    with open(samples_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['盒号', '孔位', '样本号', '状态', '批次', '类型', '负责人', '备注'])
        for box_id in sorted(report.boxes.keys()):
            box = report.boxes[box_id]
            for pos, sample in sorted(box.occupied.items()):
                writer.writerow([
                    box_id,
                    pos,
                    sample.sample_id,
                    sample.status.value,
                    sample.batch_id or '',
                    sample.sample_type or '',
                    sample.owner or '',
                    sample.notes or ''
                ])

    summary_path = os.path.join(output_dir, 'summary.csv')
    with open(summary_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['盒号', '描述', '总孔位', '已用', '空位', '占用率'])
        for box_id in sorted(report.boxes.keys()):
            box = report.boxes[box_id]
            writer.writerow([
                box_id,
                box.layout.description,
                box.total_slots,
                box.used_slots,
                box.free_slots,
                f'{box.occupancy_rate:.1%}'
            ])
