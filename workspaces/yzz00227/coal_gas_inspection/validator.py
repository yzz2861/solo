import os
import json
from datetime import datetime
from typing import List, Dict, Tuple


class ValidationError(Exception):
    pass


def validate_input_files(file_paths: List[str]) -> Tuple[List[str], List[str]]:
    existing = []
    missing = []
    for fp in file_paths:
        if os.path.isfile(fp):
            existing.append(fp)
        else:
            missing.append(fp)
    return existing, missing


def validate_date_range(start_date: str, end_date: str) -> Tuple[datetime, datetime]:
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    except ValueError:
        raise ValidationError(f"起始日期格式错误: {start_date}，应为 YYYY-MM-DD")

    try:
        end = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise ValidationError(f"结束日期格式错误: {end_date}，应为 YYYY-MM-DD")

    if start > end:
        raise ValidationError(f"起始日期 {start_date} 晚于结束日期 {end_date}")

    return start, end


def validate_mapping_config(mapping_path: str) -> Dict:
    if not os.path.isfile(mapping_path):
        raise ValidationError(f"字段映射配置文件不存在: {mapping_path}")

    try:
        with open(mapping_path, "r", encoding="utf-8") as f:
            mapping = json.load(f)
    except json.JSONDecodeError as e:
        raise ValidationError(f"字段映射配置文件 JSON 格式错误: {e}")

    required_fields = ["inspection_id", "inspection_time", "gas_concentration", "location"]
    missing = [f for f in required_fields if f not in mapping]
    if missing:
        raise ValidationError(f"字段映射配置缺少必需字段: {', '.join(missing)}")

    return mapping


def validate_export_format(fmt: str) -> str:
    valid_formats = ["csv", "excel", "json"]
    if fmt.lower() not in valid_formats:
        raise ValidationError(f"导出格式不支持: {fmt}，支持: {', '.join(valid_formats)}")
    return fmt.lower()


def validate_output_dir(output_dir: str) -> None:
    if not output_dir:
        raise ValidationError("输出目录不能为空")
    os.makedirs(output_dir, exist_ok=True)
