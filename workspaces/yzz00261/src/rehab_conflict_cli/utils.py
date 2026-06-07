"""工具函数"""
import csv
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import hashlib

from .models import AppointmentRecord, ConfigParams, ProcessResult, LogEntry, DiffRecord, BatchSummary


def generate_batch_id(prefix: str = "REHAB") -> str:
    """生成批次号"""
    now = datetime.now()
    timestamp = now.strftime("%Y%m%d%H%M%S")
    return f"{prefix}-{timestamp}"


def now_str() -> str:
    """当前时间字符串"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def calculate_risk_label(conflict_count: int, conflict_types: List[str]) -> str:
    """根据冲突情况计算风险标签"""
    if conflict_count == 0:
        return "无风险"

    severity_score = 0
    if "therapist" in conflict_types:
        severity_score += 3
    if "patient" in conflict_types:
        severity_score += 2
    if "room" in conflict_types:
        severity_score += 1

    if severity_score >= 4 or conflict_count >= 2:
        return "高风险"
    elif severity_score >= 2:
        return "中风险"
    else:
        return "低风险"


def parse_time_to_minutes(time_str: str) -> int:
    """将 HH:MM 格式的时间转换为分钟数"""
    h, m = time_str.split(":")
    return int(h) * 60 + int(m)


def check_time_overlap(start1: str, end1: str, start2: str, end2: str,
                       allowed_gap: int = 0) -> bool:
    """检查两个时间段是否重叠，允许设置间隔时间"""
    s1 = parse_time_to_minutes(start1)
    e1 = parse_time_to_minutes(end1)
    s2 = parse_time_to_minutes(start2)
    e2 = parse_time_to_minutes(end2)

    return s1 < e2 + allowed_gap and s2 < e1 + allowed_gap


def load_ledger(file_path: str) -> List[AppointmentRecord]:
    """加载业务台账 CSV 文件"""
    records = []
    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            record = AppointmentRecord(
                source_id=row.get("source_id", row.get("id", "")),
                patient_id=row.get("patient_id", ""),
                patient_name=row.get("patient_name", ""),
                therapist_id=row.get("therapist_id", ""),
                therapist_name=row.get("therapist_name", ""),
                treatment_type=row.get("treatment_type", ""),
                appointment_date=row.get("appointment_date", ""),
                start_time=row.get("start_time", ""),
                end_time=row.get("end_time", ""),
                room=row.get("room", ""),
                source_system=row.get("source_system", "manual"),
                status=row.get("status", "pending")
            )
            records.append(record)
    return records


def load_params(file_path: str) -> ConfigParams:
    """加载参数文件 JSON"""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "batch_id" not in data:
        data["batch_id"] = generate_batch_id()
    return ConfigParams.from_dict(data)


def load_previous_results(file_path: str) -> Dict[str, ProcessResult]:
    """加载上次处理结果，返回以 source_id 为键的字典"""
    results = {}
    if not os.path.exists(file_path):
        return results

    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            result = ProcessResult(
                source_id=row.get("source_id", ""),
                row_hash=row.get("row_hash", ""),
                status=row.get("status", ""),
                risk_label=row.get("risk_label", ""),
                conflict_with=row.get("conflict_with", "").split("|") if row.get("conflict_with") else [],
                error_message=row.get("error_message", ""),
                batch_id=row.get("batch_id", ""),
                processed_at=row.get("processed_at", "")
            )
            results[result.source_id] = result
    return results


def validate_record(record: AppointmentRecord) -> Tuple[bool, str]:
    """校验单条记录的完整性"""
    errors = []

    if not record.source_id:
        errors.append("source_id不能为空")
    if not record.patient_id:
        errors.append("patient_id不能为空")
    if not record.therapist_id:
        errors.append("therapist_id不能为空")
    if not record.treatment_type:
        errors.append("treatment_type不能为空")
    if not record.appointment_date:
        errors.append("appointment_date不能为空")
    if not record.start_time:
        errors.append("start_time不能为空")
    if not record.end_time:
        errors.append("end_time不能为空")

    if record.start_time and record.end_time:
        try:
            s = parse_time_to_minutes(record.start_time)
            e = parse_time_to_minutes(record.end_time)
            if s >= e:
                errors.append("开始时间必须早于结束时间")
        except (ValueError, IndexError):
            errors.append("时间格式错误，应为HH:MM")

    return (len(errors) == 0, ";".join(errors))


def filter_records(records: List[AppointmentRecord],
                   filters: Dict[str, Any]) -> List[AppointmentRecord]:
    """根据筛选条件过滤记录"""
    if not filters:
        return records

    result = records
    if "treatment_type" in filters and filters["treatment_type"]:
        types = filters["treatment_type"].split(",")
        result = [r for r in result if r.treatment_type in types]

    if "date_from" in filters and filters["date_from"]:
        result = [r for r in result if r.appointment_date >= filters["date_from"]]

    if "date_to" in filters and filters["date_to"]:
        result = [r for r in result if r.appointment_date <= filters["date_to"]]

    if "therapist_id" in filters and filters["therapist_id"]:
        result = [r for r in result if r.therapist_id == filters["therapist_id"]]

    if "patient_id" in filters and filters["patient_id"]:
        result = [r for r in result if r.patient_id == filters["patient_id"]]

    if "source_system" in filters and filters["source_system"]:
        result = [r for r in result if r.source_system == filters["source_system"]]

    return result


def ensure_dir(dir_path: str):
    """确保目录存在"""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)


def save_csv(file_path: str, rows: List[Dict[str, Any]], fieldnames: List[str]):
    """保存 CSV 文件"""
    ensure_dir(os.path.dirname(file_path) if os.path.dirname(file_path) else ".")
    with open(file_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})


def save_json(file_path: str, data: Any):
    """保存 JSON 文件"""
    ensure_dir(os.path.dirname(file_path) if os.path.dirname(file_path) else ".")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_json(file_path: str) -> Any:
    """加载 JSON 文件"""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)
