"""通用工具函数"""

import hashlib
import os
from datetime import datetime, date


def file_hash(filepath: str) -> str:
    """计算文件 SHA256 哈希，用于幂等导入检测"""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def parse_date(date_str: str) -> date:
    """解析多种日期格式"""
    if not date_str:
        return None
    date_str = str(date_str).strip()
    formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y年%m月%d日",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"无法解析日期: {date_str}")


def is_overdue(due_date_str: str, return_date_str: str = None, reference_date: date = None) -> bool:
    """检查是否逾期"""
    if not due_date_str:
        return False
    try:
        due = parse_date(due_date_str)
    except ValueError:
        return False
    if return_date_str:
        try:
            returned = parse_date(return_date_str)
            return returned > due
        except ValueError:
            pass
    ref = reference_date or date.today()
    return ref > due


def safe_float(value, default=0.0):
    """安全转换浮点数"""
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int(value, default=0):
    """安全转换整数"""
    if value is None or value == "":
        return default
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default
