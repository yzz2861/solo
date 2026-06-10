"""数据解析器：CSV 扫码记录 + JSON 手工补录。

支持灵活的列名映射，适配不同扫码枪导出格式。
"""

from __future__ import annotations

import csv
import json
import os
from datetime import datetime
from typing import List, Dict, Set, Tuple

from .models import ScanRecord, Anomaly


# 常见的列名别名映射
COLUMN_ALIASES = {
    "box_id": ["箱号", "箱子编号", "box_id", "boxid", "箱编号", "rfid", "标签号"],
    "scan_type": ["环节", "类型", "scan_type", "type", "操作类型", "状态"],
    "scan_time": ["时间", "扫码时间", "scan_time", "time", "datetime", "日期时间", "操作时间"],
    "store": ["门店", "门店名称", "store", "shop", "门店简称", "店铺"],
    "temperature": ["温度", "温度(℃)", "温度(°C)", "temperature", "temp", "探头温度"],
}

# 环节名称到标准类型的映射
SCAN_TYPE_MAP = {
    "出库": "outbound",
    "出仓": "outbound",
    "发货": "outbound",
    "outbound": "outbound",
    "到店": "arrive",
    "送达": "arrive",
    "签收": "arrive",
    "arrive": "arrive",
    "arrival": "arrive",
    "回仓": "return",
    "回库": "return",
    "回收": "return",
    "return": "return",
    "清洗": "clean",
    "消毒": "clean",
    "洗消": "clean",
    "clean": "clean",
}

# 时间格式候选
TIME_FORMATS = [
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y/%m/%d %H:%M",
    "%Y-%m-%dT%H:%M:%S",
    "%Y%m%d%H%M%S",
    "%Y-%m-%d",
    "%Y/%m/%d",
]


def _map_columns(fieldnames: List[str]) -> Dict[str, str]:
    """将 CSV 实际列名映射为标准字段名。

    返回 {标准字段名: 实际列名}
    """
    mapping = {}
    lowered = {fn.strip().lower(): fn for fn in fieldnames}
    for std_name, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias.lower() in lowered:
                mapping[std_name] = lowered[alias.lower()]
                break
    return mapping


def _parse_time(value: str) -> datetime:
    """尝试多种格式解析时间字符串。"""
    value = value.strip()
    for fmt in TIME_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise ValueError(f"无法解析时间: {value}")


def _parse_temp(value: str) -> float | None:
    """解析温度值，空值返回 None。"""
    if not value or value.strip() == "":
        return None
    try:
        return float(value.strip())
    except ValueError:
        return None


def _normalize_scan_type(value: str) -> str:
    """标准化环节名称。"""
    v = value.strip()
    if v in SCAN_TYPE_MAP:
        return SCAN_TYPE_MAP[v]
    if v.lower() in SCAN_TYPE_MAP:
        return SCAN_TYPE_MAP[v.lower()]
    raise ValueError(f"无法识别的环节: {value}")


def parse_csv(file_path: str) -> Tuple[List[ScanRecord], List[Anomaly]]:
    """解析 CSV 扫码记录。

    返回 (记录列表, 解析异常列表)
    """
    records: List[ScanRecord] = []
    anomalies: List[Anomaly] = []
    filename = os.path.basename(file_path)

    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("CSV 文件为空或没有表头")

        col_map = _map_columns(reader.fieldnames)

        if "box_id" not in col_map:
            raise ValueError("CSV 中找不到箱号列")
        if "scan_type" not in col_map:
            raise ValueError("CSV 中找不到环节/类型列")
        if "scan_time" not in col_map:
            raise ValueError("CSV 中找不到时间列")

        for line_num, row in enumerate(reader, start=2):  # 2 = 表头1行 + 数据第1行
            try:
                box_id = row[col_map["box_id"]].strip()
                if not box_id:
                    raise ValueError("箱号为空")

                scan_type = _normalize_scan_type(row[col_map["scan_type"]])
                scan_time = _parse_time(row[col_map["scan_time"]])
                store = row.get(col_map.get("store", ""), "").strip() if col_map.get("store") else ""
                temperature = (
                    _parse_temp(row[col_map["temperature"]])
                    if col_map.get("temperature")
                    else None
                )

                record = ScanRecord(
                    box_id=box_id,
                    scan_type=scan_type,
                    scan_time=scan_time,
                    store=store,
                    temperature=temperature,
                    source="csv",
                    source_file=filename,
                    source_line=line_num,
                    raw=dict(row),
                )
                records.append(record)
            except Exception as e:
                anomalies.append(
                    Anomaly(
                        level="error",
                        category="parse_error",
                        message=f"解析失败: {e}",
                        source_file=filename,
                        source_line=line_num,
                        raw=dict(row),
                    )
                )

    return records, anomalies


def parse_manual_json(file_path: str) -> Tuple[List[ScanRecord], List[Anomaly]]:
    """解析手工补录 JSON。

    JSON 格式示例：
    [
      {
        "box_id": "BOX001",
        "scan_type": "clean",
        "scan_time": "2026-06-09 18:30:00",
        "store": "",
        "temperature": 5.2,
        "note": "手工补录清洗记录"
      }
    ]
    """
    records: List[ScanRecord] = []
    anomalies: List[Anomaly] = []
    filename = os.path.basename(file_path)

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("JSON 顶层必须是数组")

    for idx, item in enumerate(data):
        line_num = idx + 1  # JSON 行号用索引+1
        try:
            box_id = str(item.get("box_id", "")).strip()
            if not box_id:
                raise ValueError("箱号为空")

            scan_type_raw = str(item.get("scan_type", "")).strip()
            scan_type = _normalize_scan_type(scan_type_raw)
            scan_time = _parse_time(str(item.get("scan_time", "")))
            store = str(item.get("store", "")).strip()
            temperature = _parse_temp(str(item.get("temperature", "")))

            record = ScanRecord(
                box_id=box_id,
                scan_type=scan_type,
                scan_time=scan_time,
                store=store,
                temperature=temperature,
                source="manual",
                source_file=filename,
                source_line=line_num,
                raw=item,
            )
            records.append(record)
        except Exception as e:
            anomalies.append(
                Anomaly(
                    level="error",
                    category="parse_error",
                    message=f"手工补录解析失败: {e}",
                    source_file=filename,
                    source_line=line_num,
                    raw=item,
                )
            )

    return records, anomalies


def deduplicate_records(records: List[ScanRecord]) -> Tuple[List[ScanRecord], List[Anomaly]]:
    """对记录去重，返回 (去重后的记录, 重复记录异常)。

    去重规则：同一箱号+同一环节+同一分钟+同一门店 视为重复。
    保留最早的一条，后续的标记为重复异常。
    """
    seen: Dict[str, ScanRecord] = {}
    result: List[ScanRecord] = []
    anomalies: List[Anomaly] = []

    # 先按时间排序，保证保留最早的
    sorted_records = sorted(records, key=lambda r: r.scan_time)

    for rec in sorted_records:
        fp = rec.fingerprint
        if fp in seen:
            anomalies.append(
                Anomaly(
                    level="warning",
                    category="duplicate_scan",
                    message=f"重复扫码：与 {seen[fp].source_file} 第 {seen[fp].source_line} 行重复",
                    box_id=rec.box_id,
                    scan_type=rec.scan_type,
                    source_file=rec.source_file,
                    source_line=rec.source_line,
                    raw=rec.raw,
                )
            )
        else:
            seen[fp] = rec
            result.append(rec)

    return result, anomalies
