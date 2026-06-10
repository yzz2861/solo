import csv
import json
from datetime import datetime
from typing import Dict, Any, List

from .auditor import (
    get_schedule_summary,
    get_sales_summary,
    get_refund_summary,
    get_all_issues,
    find_cancelled_sales,
    find_duplicate_refunds,
    find_amount_mismatch,
    find_sales_no_schedule,
    find_refunds_no_sale,
)
from .storage import DB_PATH


def generate_report(db_path: str = DB_PATH) -> Dict[str, Any]:
    """生成完整的核对报告数据"""
    sched_summary = get_schedule_summary(db_path)
    sales_summary = get_sales_summary(db_path)
    refund_summary = get_refund_summary(db_path)
    issues = get_all_issues(db_path)

    report = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "summary": {
            **sched_summary,
            **sales_summary,
            **refund_summary,
            "total_issues": sum(v["count"] for v in issues.values()),
        },
        "issues": issues,
    }
    return report


def export_json(output_path: str, db_path: str = DB_PATH) -> str:
    """导出 JSON 格式报告"""
    report = generate_report(db_path)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    return output_path


def export_csv(output_dir: str, db_path: str = DB_PATH) -> List[str]:
    """导出多份 CSV 报告（经理核对用）"""
    import os
    os.makedirs(output_dir, exist_ok=True)

    files = []

    summary_path = os.path.join(output_dir, "00_汇总.csv")
    sched_summary = get_schedule_summary(db_path)
    sales_summary = get_sales_summary(db_path)
    refund_summary = get_refund_summary(db_path)
    issues = get_all_issues(db_path)
    with open(summary_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["指标", "数值"])
        writer.writerow(["总场次", sched_summary["total_schedules"]])
        writer.writerow(["正常场次", sched_summary["normal_schedules"]])
        writer.writerow(["取消场次", sched_summary["cancelled_schedules"]])
        writer.writerow(["售票订单数", sales_summary["total_orders"]])
        writer.writerow(["售票总金额", round(sales_summary["total_sales_amount"], 2)])
        writer.writerow(["退票笔数", refund_summary["total_refunds"]])
        writer.writerow(["退票总金额", round(refund_summary["total_refund_amount"], 2)])
        writer.writerow(["异常总数", sum(v["count"] for v in issues.values())])
    files.append(summary_path)

    cancelled = find_cancelled_sales(db_path)
    if cancelled:
        path = os.path.join(output_dir, "01_取消场次有售票.csv")
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["场次编号", "影片", "场次时间", "影厅", "状态", "订单号", "座位", "票价", "购票时间"])
            for r in cancelled:
                writer.writerow([
                    r["show_id"], r["film_name"], r["show_time"], r["hall"],
                    r["status"], r["order_id"], r["seat_no"],
                    r["amount"], r["sale_time"],
                ])
        files.append(path)

    dup = find_duplicate_refunds(db_path)
    if dup:
        path = os.path.join(output_dir, "02_重复退款订单.csv")
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["订单号", "关联场次", "票价", "退款次数", "累计退款金额", "退款单号"])
            for r in dup:
                writer.writerow([
                    r["order_id"], r.get("show_id", ""),
                    r.get("sale_amount", ""), r["refund_count"],
                    round(r["total_refund_amount"], 2), r["refund_ids"],
                ])
        files.append(path)

    mismatch = find_amount_mismatch(db_path)
    if mismatch:
        path = os.path.join(output_dir, "03_退票金额不符.csv")
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "退票单号", "订单号", "场次编号", "影片", "场次时间",
                "影厅", "票价", "退票金额", "差额", "退票时间",
            ])
            for r in mismatch:
                diff = round(r["refund_amount"] - (r["ticket_amount"] or 0), 2)
                writer.writerow([
                    r["refund_id"], r["order_id"], r.get("show_id", ""),
                    r.get("film_name", ""), r.get("show_time", ""),
                    r.get("hall", ""), r.get("ticket_amount", ""),
                    r["refund_amount"], diff, r["refund_time"],
                ])
        files.append(path)

    no_sched = find_sales_no_schedule(db_path)
    if no_sched:
        path = os.path.join(output_dir, "04_售票无对应排片.csv")
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["订单号", "场次编号", "座位", "金额", "购票时间"])
            for r in no_sched:
                writer.writerow([
                    r["order_id"], r["show_id"], r["seat_no"],
                    r["amount"], r["sale_time"],
                ])
        files.append(path)

    no_sale = find_refunds_no_sale(db_path)
    if no_sale:
        path = os.path.join(output_dir, "05_退票无对应售票.csv")
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["退票单号", "订单号", "退票金额", "退票时间"])
            for r in no_sale:
                writer.writerow([
                    r["refund_id"], r["order_id"],
                    r["refund_amount"], r["refund_time"],
                ])
        files.append(path)

    return files


def export_text_report(db_path: str = DB_PATH) -> str:
    """生成文本格式报告（控制台输出用）"""
    report = generate_report(db_path)
    s = report["summary"]
    lines = []
    lines.append("=" * 60)
    lines.append("  影城排片退票冲突核对报告")
    lines.append(f"  生成时间：{report['generated_at']}")
    lines.append("=" * 60)
    lines.append("")
    lines.append("【数据汇总】")
    lines.append(f"  总场次: {s['total_schedules']}  "
                 f"(正常 {s['normal_schedules']} / 取消 {s['cancelled_schedules']})")
    lines.append(f"  售票订单: {s['total_orders']} 笔，金额 ¥{s['total_sales_amount']:.2f}")
    lines.append(f"  退票: {s['total_refunds']} 笔，金额 ¥{s['total_refund_amount']:.2f}")
    lines.append(f"  异常总数: {s['total_issues']}")
    lines.append("")
    lines.append("【异常明细】")
    issues = report["issues"]
    lines.append(f"  1. 取消场次仍有售票: {issues['cancelled_sales']['count']} 条")
    lines.append(f"  2. 重复退款: {issues['duplicate_refunds']['count']} 笔订单")
    lines.append(f"  3. 退票金额与票价不符: {issues['amount_mismatch']['count']} 条")
    lines.append(f"  4. 售票无对应排片: {issues['sales_no_schedule']['count']} 条")
    lines.append(f"  5. 退票无对应售票: {issues['refunds_no_sale']['count']} 条")
    lines.append("")
    lines.append("=" * 60)
    return "\n".join(lines)
