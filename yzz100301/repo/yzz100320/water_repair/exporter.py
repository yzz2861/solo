"""报告导出模块"""
import csv
import json
from typing import Optional, List, Dict
from .analysis import get_audit_stats, get_all_order_statuses
from .database import get_conn


def export_report_csv(output_path: str, db_path: Optional[str] = None):
    """导出完整审计报告为 CSV，包含原始行号和漏通知说明"""
    statuses = get_all_order_statuses(db_path)

    rows = []
    for s in statuses:
        for comm in s["communities"]:
            issues = []
            if not comm["has_valid_receipt"]:
                issues.append("无有效回执")
            if comm["has_missing_phone"]:
                issues.append("回执手机号缺失")
            if comm["is_late_notification"]:
                issues.append("通知晚于停水")

            issue_str = "；".join(issues) if issues else "正常"

            detail = ""
            if not comm["has_valid_receipt"]:
                detail = "该小区停水范围已登记，但短信回执中无有效记录，请补录或核实"
            elif comm["has_missing_phone"]:
                detail = "存在手机号为空的回执记录，无法确认送达对象"
            if comm["is_late_notification"] and comm["late_detail"]:
                detail += f" 通知时间({comm['late_detail']['send_time']})晚于停水开始时间({comm['late_detail']['outage_start']})"

            rows.append({
                "抢修单号": s["order_no"],
                "抢修类型": s["order_type"],
                "故障地址": s["fault_address"],
                "派单时间": s["dispatch_time"],
                "抢修班组": s["repair_team"],
                "工单状态": s["order_status"],
                "小区名称": comm["community_name"],
                "楼栋号": comm["building_no"],
                "停水开始时间": comm["outage_start_time"],
                "停水结束时间": comm["outage_end_time"],
                "回执数量": comm["sms_count"],
                "是否有有效回执": "是" if comm["has_valid_receipt"] else "否",
                "是否有手机号缺失": "是" if comm["has_missing_phone"] else "否",
                "是否通知晚于停水": "是" if comm["is_late_notification"] else "否",
                "状态": issue_str,
                "漏通知说明": detail if issues else "",
                "抢修单原始行号": s["order_source_row"],
                "停水范围原始行号": comm["outage_source_row"],
            })

    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else [])
        writer.writeheader()
        writer.writerows(rows)

    return len(rows)


def export_report_json(output_path: str, db_path: Optional[str] = None):
    """导出完整审计报告为 JSON"""
    stats = get_audit_stats(db_path)

    report = {
        "summary": {
            "总工单数": stats["total_orders"],
            "停水小区总数": stats["total_communities"],
            "无回执小区数": stats["total_missing_receipt"],
            "手机号缺失数": stats["total_missing_phone"],
            "通知晚于停水数": stats["total_late_notification"],
            "存在问题的工单": stats["orders_with_issues"],
            "全部正常的工单": stats["fully_ok_orders"],
        },
        "details": [],
    }

    for s in stats["orders"]:
        order_detail = {
            "抢修单号": s["order_no"],
            "抢修类型": s["order_type"],
            "故障地址": s["fault_address"],
            "派单时间": s["dispatch_time"],
            "抢修班组": s["repair_team"],
            "工单状态": s["order_status"],
            "原始行号": s["order_source_row"],
            "停水小区数": s["communities_count"],
            "小区明细": [],
        }

        for comm in s["communities"]:
            issues = []
            if not comm["has_valid_receipt"]:
                issues.append("无有效回执")
            if comm["has_missing_phone"]:
                issues.append("回执手机号缺失")
            if comm["is_late_notification"]:
                issues.append("通知晚于停水")

            detail = ""
            if not comm["has_valid_receipt"]:
                detail = "该小区停水范围已登记，但短信回执中无有效记录，请补录或核实"
            if comm["has_missing_phone"]:
                detail = "存在手机号为空的回执记录，无法确认送达对象"
            if comm["is_late_notification"] and comm["late_detail"]:
                detail += f" 通知时间({comm['late_detail']['send_time']})晚于停水开始时间({comm['late_detail']['outage_start']})"

            order_detail["小区明细"].append({
                "小区名称": comm["community_name"],
                "楼栋号": comm["building_no"],
                "停水开始时间": comm["outage_start_time"],
                "停水结束时间": comm["outage_end_time"],
                "停水范围原始行号": comm["outage_source_row"],
                "回执数量": comm["sms_count"],
                "问题类型": issues,
                "漏通知说明": detail if issues else "",
            })

        report["details"].append(order_detail)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    return len(stats["orders"])


def export_missing_receipt_csv(output_path: str, db_path: Optional[str] = None) -> int:
    """导出无回执小区清单"""
    from .analysis import get_missing_receipt_communities
    items = get_missing_receipt_communities(db_path)
    if not items:
        return 0

    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(items[0].keys()))
        writer.writeheader()
        writer.writerows(items)
    return len(items)


def get_import_history(db_path: Optional[str] = None) -> List[Dict]:
    """获取导入历史记录"""
    with get_conn(db_path) as conn:
        rows = conn.execute("""
            SELECT * FROM import_batches ORDER BY imported_at DESC
        """).fetchall()
    return [dict(r) for r in rows]
