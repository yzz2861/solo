from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path

from .crud import (
    get_batches_expiring_soon,
    get_batches_with_negative_inventory,
    get_missing_temperature_logs,
    get_abnormal_temperatures,
    create_alert,
    get_alerts,
    get_batch_by_id,
    get_all_batches,
)
from .config import EXPIRY_WARNING_DAYS, TEMPERATURE_NORMAL_RANGE, TEMP_WINDOW_HOURS


def check_expiring_batches(
    days: int = EXPIRY_WARNING_DAYS,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    expiring = get_batches_expiring_soon(days=days, db_path=db_path)
    alerts = []

    for batch in expiring:
        expiry_date = datetime.strptime(batch["expiry_date"], "%Y-%m-%d").date()
        today = datetime.now().date()
        days_left = (expiry_date - today).days

        severity = "high" if days_left <= 7 else "medium"
        message = (
            f"疫苗批号 [{batch['batch_number']}] {batch['vaccine_name']} "
            f"将在 {days_left} 天后过期（{batch['expiry_date']}），"
            f"剩余库存 {batch['current_quantity']} 支"
        )

        create_alert(
            alert_type="batch_expiring",
            severity=severity,
            message=message,
            related_batch_id=batch["id"],
            db_path=db_path
        )
        alerts.append({"type": "batch_expiring", "severity": severity, "message": message})

    return alerts


def check_negative_inventory(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    negative = get_batches_with_negative_inventory(db_path=db_path)
    alerts = []

    for batch in negative:
        message = (
            f"疫苗批号 [{batch['batch_number']}] {batch['vaccine_name']} "
            f"库存出现负数: {batch['current_quantity']} 支"
        )

        create_alert(
            alert_type="negative_inventory",
            severity="high",
            message=message,
            related_batch_id=batch["id"],
            db_path=db_path
        )
        alerts.append({"type": "negative_inventory", "severity": "high", "message": message})

    return alerts


def check_missing_temperature(
    hours: int = TEMP_WINDOW_HOURS,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    end_time = datetime.now()
    start_time = end_time - timedelta(hours=hours)

    missing = get_missing_temperature_logs(
        start_time=start_time.strftime("%Y-%m-%d %H:%M:%S"),
        end_time=end_time.strftime("%Y-%m-%d %H:%M:%S"),
        db_path=db_path
    )
    alerts = []

    if missing:
        message = f"过去 {hours} 小时内有 {len(missing)} 条温度记录缺失"
        create_alert(
            alert_type="temperature_missing",
            severity="warning",
            message=message,
            db_path=db_path
        )
        alerts.append({"type": "temperature_missing", "severity": "warning", "message": message})

    return alerts


def check_abnormal_temperature(
    hours: int = TEMP_WINDOW_HOURS,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    end_time = datetime.now()
    start_time = end_time - timedelta(hours=hours)

    abnormal = get_abnormal_temperatures(
        start_time=start_time.strftime("%Y-%m-%d %H:%M:%S"),
        end_time=end_time.strftime("%Y-%m-%d %H:%M:%S"),
        db_path=db_path
    )
    alerts = []

    if abnormal:
        min_temp, max_temp = TEMPERATURE_NORMAL_RANGE
        avg_temp = sum(r["temperature"] for r in abnormal) / len(abnormal)
        max_dev = max(abs(r["temperature"] - min_temp) if r["temperature"] < min_temp
                       else abs(r["temperature"] - max_temp) for r in abnormal)

        message = (
            f"过去 {hours} 小时内有 {len(abnormal)} 条超温记录，"
            f"最大偏差 {max_dev:.1f}°C，平均温度 {avg_temp:.1f}°C"
        )
        create_alert(
            alert_type="temperature_abnormal",
            severity="high",
            message=message,
            db_path=db_path
        )
        alerts.append({"type": "temperature_abnormal", "severity": "high", "message": message})

    return alerts


def check_batch_status_against_temperature(
    event_start: str,
    event_end: str,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    abnormal_temps = get_abnormal_temperatures(
        start_time=event_start,
        end_time=event_end,
        db_path=db_path
    )

    if not abnormal_temps:
        return []

    all_batches = get_all_batches(db_path=db_path)
    affected_batches = [b for b in all_batches if b["status"] == "normal" and b["current_quantity"] > 0]

    alerts = []
    for batch in affected_batches:
        message = (
            f"疫苗批号 [{batch['batch_number']}] {batch['vaccine_name']} "
            f"可能受到 {event_start} 至 {event_end} 期间超温影响，"
            f"请评估是否可继续使用"
        )
        create_alert(
            alert_type="batch_temperature_risk",
            severity="high",
            message=message,
            related_batch_id=batch["id"],
            db_path=db_path
        )
        alerts.append({
            "type": "batch_temperature_risk",
            "severity": "high",
            "message": message,
            "batch_id": batch["id"],
            "batch_number": batch["batch_number"]
        })

    return alerts


def run_all_checks(
    db_path: Optional[Path] = None,
    expiry_days: int = EXPIRY_WARNING_DAYS,
    temp_hours: int = TEMP_WINDOW_HOURS
) -> Dict[str, Any]:
    all_alerts = []

    all_alerts.extend(check_expiring_batches(days=expiry_days, db_path=db_path))
    all_alerts.extend(check_negative_inventory(db_path=db_path))
    all_alerts.extend(check_missing_temperature(hours=temp_hours, db_path=db_path))
    all_alerts.extend(check_abnormal_temperature(hours=temp_hours, db_path=db_path))

    existing = get_alerts(include_resolved=False, db_path=db_path)

    return {
        "new_alerts": all_alerts,
        "unresolved_alerts": existing,
        "total_new": len(all_alerts),
        "total_unresolved": len(existing),
    }


def format_alerts(alerts: List[Dict[str, Any]]) -> str:
    if not alerts:
        return "✅ 没有发现异常"

    lines = []
    severity_map = {"high": "🔴 高", "medium": "🟡 中", "warning": "🟠 警告", "low": "🟢 低"}

    for alert in alerts:
        if isinstance(alert, dict) and "message" in alert:
            sev = alert.get("severity", "warning")
            lines.append(f"  {severity_map.get(sev, sev)} {alert['message']}")
        elif isinstance(alert, dict) and "alert_type" in alert:
            sev = alert.get("severity", "warning")
            lines.append(f"  {severity_map.get(sev, sev)} {alert['message']}")

    return "\n".join(lines)
