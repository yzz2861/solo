import csv
from datetime import datetime
from typing import List
from .models import BoxState, BoxStatus


def _format_time(dt) -> str:
    if dt is None:
        return ""
    if isinstance(dt, str):
        return dt
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def export_report_csv(boxes: List[BoxState], filepath: str):
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "药箱编号", "状态", "借出人", "借出时间", "药品名称", "药品批号",
            "回收人", "回收时间", "最高温度", "最低温度", "平均温度",
            "超温", "回收人不一致", "批号缺失",
            "复核结果", "复核人", "复核时间", "复核意见"
        ])
        for b in boxes:
            writer.writerow([
                b.box_id,
                b.status.value,
                b.borrow.borrower if b.borrow else "",
                _format_time(b.borrow.borrow_time) if b.borrow else "",
                b.borrow.drug_name if b.borrow else "",
                b.borrow.drug_batch if b.borrow else "",
                b.return_record.returner if b.return_record else "",
                _format_time(b.return_record.return_time) if b.return_record else "",
                f"{b.return_record.max_temp:.2f}" if (b.return_record and b.return_record.max_temp is not None) else "",
                f"{b.return_record.min_temp:.2f}" if (b.return_record and b.return_record.min_temp is not None) else "",
                f"{b.return_record.avg_temp:.2f}" if (b.return_record and b.return_record.avg_temp is not None) else "",
                "是" if b.has_overtemp else "否",
                "是" if b.returner_mismatch else "否",
                "是" if b.batch_missing else "否",
                b.review_result.value,
                b.reviewer,
                _format_time(b.review_time),
                b.review_comment,
            ])


def export_report_html(boxes: List[BoxState], filepath: str, title: str = "冷链药箱交接报告"):
    stats = {
        "total": len(boxes),
        "returned": sum(1 for b in boxes if b.status == BoxStatus.RETURNED),
        "reviewed": sum(1 for b in boxes if b.status == BoxStatus.REVIEWED),
        "isolated": sum(1 for b in boxes if b.status == BoxStatus.ISOLATED),
        "overtemp": sum(1 for b in boxes if b.has_overtemp),
        "mismatch": sum(1 for b in boxes if b.returner_mismatch),
        "batch_missing": sum(1 for b in boxes if b.batch_missing),
        "issues": sum(1 for b in boxes if b.has_issues),
    }

    def _row_style(box: BoxState) -> str:
        if box.status == BoxStatus.ISOLATED:
            return "background:#ffe0e0;"
        if box.has_issues:
            return "background:#fff8e0;"
        return ""

    def _temp_cell(box: BoxState) -> str:
        if not box.return_record or box.return_record.max_temp is None:
            return "<td>-</td>"
        t = box.return_record.max_temp
        color = "red" if t > 8.0 else "green"
        return f'<td style="color:{color};font-weight:bold;">{t:.2f}℃</td>'

    rows_html = ""
    for b in boxes:
        style = _row_style(b)
        borrow_t = _format_time(b.borrow.borrow_time) if b.borrow else "-"
        return_t = _format_time(b.return_record.return_time) if b.return_record else "-"
        borrower = b.borrow.borrower if b.borrow else "-"
        returner = b.return_record.returner if b.return_record else "-"
        drug_name = b.borrow.drug_name if b.borrow else "-"
        drug_batch = b.borrow.drug_batch if b.borrow else "-"
        batch_miss = "是" if b.batch_missing else "否"
        mismatch = "是" if b.returner_mismatch else "否"
        temp_cell = _temp_cell(b)
        review_res = b.review_result.value
        reviewer = b.reviewer or "-"
        review_t = _format_time(b.review_time) or "-"
        comment = b.review_comment or "-"

        rows_html += f"""
        <tr style="{style}">
            <td>{b.box_id}</td>
            <td>{b.status.value}</td>
            <td>{borrower}</td>
            <td>{borrow_t}</td>
            <td>{drug_name}</td>
            <td>{drug_batch}</td>
            <td>{returner}</td>
            <td>{return_t}</td>
            {temp_cell}
            <td>{mismatch}</td>
            <td>{batch_miss}</td>
            <td>{review_res}</td>
            <td>{reviewer}</td>
            <td>{review_t}</td>
            <td>{comment}</td>
        </tr>
        """

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<style>
  body {{ font-family: "PingFang SC", "Microsoft YaHei", sans-serif; margin: 30px; color: #333; }}
  h1 {{ color: #1a5490; border-bottom: 3px solid #1a5490; padding-bottom: 10px; }}
  .summary {{ display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }}
  .stat-card {{ background: #f5f7fa; border-left: 4px solid #1a5490; padding: 12px 20px; border-radius: 4px; min-width: 120px; }}
  .stat-card .num {{ font-size: 28px; font-weight: bold; color: #1a5490; }}
  .stat-card .label {{ font-size: 13px; color: #666; margin-top: 4px; }}
  .stat-card.warn {{ border-left-color: #e6a23c; }}
  .stat-card.warn .num {{ color: #e6a23c; }}
  .stat-card.danger {{ border-left-color: #f56c6c; }}
  .stat-card.danger .num {{ color: #f56c6c; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }}
  th {{ background: #1a5490; color: white; padding: 10px 8px; text-align: left; font-weight: normal; }}
  td {{ padding: 8px; border-bottom: 1px solid #e0e0e0; }}
  tr:hover {{ background: #f0f5fa; }}
  .footer {{ margin-top: 30px; color: #999; font-size: 12px; text-align: right; }}
  .section-title {{ font-size: 16px; font-weight: bold; color: #1a5490; margin-top: 30px; border-left: 4px solid #1a5490; padding-left: 10px; }}
</style>
</head>
<body>
  <h1>{title}</h1>
  <div class="summary">
    <div class="stat-card"><div class="num">{stats['total']}</div><div class="label">药箱总数</div></div>
    <div class="stat-card"><div class="num">{stats['returned']}</div><div class="label">已回收待复核</div></div>
    <div class="stat-card"><div class="num">{stats['reviewed']}</div><div class="label">已复核</div></div>
    <div class="stat-card danger"><div class="num">{stats['isolated']}</div><div class="label">已隔离</div></div>
    <div class="stat-card danger"><div class="num">{stats['overtemp']}</div><div class="label">超温</div></div>
    <div class="stat-card warn"><div class="num">{stats['mismatch']}</div><div class="label">回收人不一致</div></div>
    <div class="stat-card warn"><div class="num">{stats['batch_missing']}</div><div class="label">批号缺失</div></div>
    <div class="stat-card danger"><div class="num">{stats['issues']}</div><div class="label">异常总计</div></div>
  </div>

  <div class="section-title">交接明细</div>
  <table>
    <thead>
      <tr>
        <th>药箱编号</th><th>状态</th><th>借出人</th><th>借出时间</th>
        <th>药品名称</th><th>药品批号</th><th>回收人</th><th>回收时间</th>
        <th>最高温度</th><th>回收人不一致</th><th>批号缺失</th>
        <th>复核结果</th><th>复核人</th><th>复核时间</th><th>复核意见</th>
      </tr>
    </thead>
    <tbody>
      {rows_html}
    </tbody>
  </table>

  <div class="footer">报告生成时间：{now}</div>
</body>
</html>
"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)
