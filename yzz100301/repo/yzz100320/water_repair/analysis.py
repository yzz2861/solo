"""核心分析逻辑：串联派单、通知、回执、复核状态"""
from datetime import datetime
from typing import List, Dict, Optional
from .database import get_conn

DATETIME_FORMATS = [
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y/%m/%d %H:%M:%S",
    "%Y/%m/%d %H:%M",
    "%Y-%m-%d",
    "%Y/%m/%d",
]


def parse_datetime(s: str) -> Optional[datetime]:
    """尝试多种格式解析时间字符串"""
    if not s or not s.strip():
        return None
    s = s.strip()
    for fmt in DATETIME_FORMATS:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def get_all_orders(db_path: Optional[str] = None) -> List[Dict]:
    """获取所有抢修单及其关联的停水范围和短信回执"""
    with get_conn(db_path) as conn:
        orders = [dict(r) for r in conn.execute("""
            SELECT * FROM repair_orders ORDER BY id
        """).fetchall()]

        outages = [dict(r) for r in conn.execute("""
            SELECT * FROM outage_areas ORDER BY id
        """).fetchall()]

        sms_list = [dict(r) for r in conn.execute("""
            SELECT * FROM sms_receipts ORDER BY id
        """).fetchall()]

    outages_by_order: Dict[str, List[Dict]] = {}
    for o in outages:
        outages_by_order.setdefault(o["order_no"], []).append(o)

    sms_by_order: Dict[str, List[Dict]] = {}
    for s in sms_list:
        if s["order_no"]:
            sms_by_order.setdefault(s["order_no"], []).append(s)

    result = []
    for order in orders:
        order_no = order["order_no"]
        order_outages = outages_by_order.get(order_no, [])
        order_sms = sms_by_order.get(order_no, [])
        result.append({
            "order": order,
            "outages": order_outages,
            "sms_list": order_sms,
        })

    return result


def compute_order_status(order_data: Dict) -> Dict:
    """计算单个抢修单的整体状态及各小区状态"""
    order = order_data["order"]
    outages = order_data["outages"]
    sms_list = order_data["sms_list"]

    sms_by_community: Dict[str, List[Dict]] = {}
    for s in sms_list:
        comm = s["community_name"] or ""
        sms_by_community.setdefault(comm, []).append(s)

    communities_status = []
    missing_receipt = []
    missing_phone = []
    late_notification = []

    for outage in outages:
        comm_name = outage["community_name"]
        comm_sms_list = sms_by_community.get(comm_name, [])

        has_valid_sms = False
        has_missing_phone = False
        is_late = False
        late_detail = None

        outage_start = parse_datetime(outage["outage_start_time"])

        for sms in comm_sms_list:
            if not sms["phone_number"] or not sms["phone_number"].strip():
                has_missing_phone = True
                continue

            has_valid_sms = True

            if outage_start:
                send_time = parse_datetime(sms["send_time"])
                if send_time and send_time > outage_start:
                    is_late = True
                    late_detail = {
                        "send_time": sms["send_time"],
                        "outage_start": outage["outage_start_time"],
                        "phone": sms["phone_number"],
                        "source_row": sms["source_row"],
                    }

        comm_status = {
            "community_name": comm_name,
            "building_no": outage["building_no"],
            "outage_start_time": outage["outage_start_time"],
            "outage_end_time": outage["outage_end_time"],
            "outage_source_row": outage["source_row"],
            "has_notification": len(comm_sms_list) > 0,
            "has_valid_receipt": has_valid_sms,
            "sms_count": len(comm_sms_list),
            "has_missing_phone": has_missing_phone,
            "is_late_notification": is_late,
            "late_detail": late_detail,
            "contact_person": outage["contact_person"],
            "contact_phone": outage["contact_phone"],
        }
        communities_status.append(comm_status)

        if not has_valid_sms:
            missing_receipt.append(comm_status)
        if has_missing_phone:
            missing_phone.append(comm_status)
        if is_late:
            late_notification.append(comm_status)

    overall = {
        "order_no": order["order_no"],
        "order_type": order["order_type"],
        "fault_address": order["fault_address"],
        "report_time": order["report_time"],
        "dispatch_time": order["dispatch_time"],
        "repair_team": order["repair_team"],
        "order_status": order["status"],
        "remark": order["remark"],
        "order_source_row": order["source_row"],
        "communities_count": len(communities_status),
        "communities": communities_status,
        "missing_receipt_count": len(missing_receipt),
        "missing_phone_count": len(missing_phone),
        "late_notification_count": len(late_notification),
        "missing_receipt": missing_receipt,
        "missing_phone": missing_phone,
        "late_notification": late_notification,
    }

    return overall


def get_all_order_statuses(db_path: Optional[str] = None) -> List[Dict]:
    """获取所有抢修单的状态分析"""
    orders = get_all_orders(db_path)
    return [compute_order_status(o) for o in orders]


def get_audit_stats(db_path: Optional[str] = None) -> Dict:
    """获取整体审计统计数据"""
    orders = get_all_order_statuses(db_path)

    total_orders = len(orders)
    total_communities = sum(o["communities_count"] for o in orders)
    total_missing_receipt = sum(o["missing_receipt_count"] for o in orders)
    total_missing_phone = sum(o["missing_phone_count"] for o in orders)
    total_late = sum(o["late_notification_count"] for o in orders)

    orders_with_issues = [o for o in orders
                          if o["missing_receipt_count"] > 0
                          or o["missing_phone_count"] > 0
                          or o["late_notification_count"] > 0]

    fully_ok_orders = [o for o in orders
                       if o["missing_receipt_count"] == 0
                       and o["missing_phone_count"] == 0
                       and o["late_notification_count"] == 0
                       and o["communities_count"] > 0]

    return {
        "total_orders": total_orders,
        "total_communities": total_communities,
        "total_missing_receipt": total_missing_receipt,
        "total_missing_phone": total_missing_phone,
        "total_late_notification": total_late,
        "orders_with_issues": len(orders_with_issues),
        "fully_ok_orders": len(fully_ok_orders),
        "orders": orders,
        "orders_with_issues_list": orders_with_issues,
    }


def get_missing_receipt_communities(db_path: Optional[str] = None) -> List[Dict]:
    """获取所有无回执的停水小区"""
    statuses = get_all_order_statuses(db_path)
    result = []
    for s in statuses:
        for comm in s["missing_receipt"]:
            result.append({
                "order_no": s["order_no"],
                "order_status": s["order_status"],
                "community_name": comm["community_name"],
                "building_no": comm["building_no"],
                "outage_start_time": comm["outage_start_time"],
                "outage_source_row": comm["outage_source_row"],
                "issue": "无短信回执",
                "reason": "停水小区在短信回执中无匹配记录，或所有回执均无有效手机号",
            })
    return result


def get_missing_phone_sms(db_path: Optional[str] = None) -> List[Dict]:
    """获取所有手机号缺失的回执记录"""
    with get_conn(db_path) as conn:
        rows = conn.execute("""
            SELECT s.*, o.community_name as outage_community
            FROM sms_receipts s
            LEFT JOIN outage_areas o ON s.order_no = o.order_no AND s.community_name = o.community_name
            WHERE s.phone_number IS NULL OR s.phone_number = ''
            ORDER BY s.batch_id, s.source_row
        """).fetchall()
    return [dict(r) for r in rows]


def get_late_notifications(db_path: Optional[str] = None) -> List[Dict]:
    """获取所有通知时间晚于停水时间的记录"""
    statuses = get_all_order_statuses(db_path)
    result = []
    for s in statuses:
        for comm in s["late_notification"]:
            if comm["late_detail"]:
                result.append({
                    "order_no": s["order_no"],
                    "community_name": comm["community_name"],
                    "phone_number": comm["late_detail"]["phone"],
                    "outage_start_time": comm["late_detail"]["outage_start"],
                    "send_time": comm["late_detail"]["send_time"],
                    "sms_source_row": comm["late_detail"]["source_row"],
                    "outage_source_row": comm["outage_source_row"],
                    "issue": "通知晚于停水",
                })
    return result
