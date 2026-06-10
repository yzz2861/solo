"""吊点载荷表导入 (CSV 格式)

CSV 字段约定:
- 吊点编号 / point_no / 吊点
- 最大载荷 / max_load / 额定载荷
- 当前载荷 / current_load / 实际载荷
- 设备编号 / equipment_no / 灯具编号
- 数量 / quantity / qty
- 位置 / position / 位置
- 备注 / remark
"""

import csv
import os
from typing import List, Dict, Tuple, Optional

from ..database import (
    get_conn,
    check_source_imported,
    record_import_source,
)
from ..utils import file_hash, safe_int, safe_float


SOURCE_TYPE = "hoist"


def _detect_columns(header: List[str]) -> Dict[str, str]:
    mapping = {}
    header_lower = [h.strip() for h in header]

    column_patterns = {
        "point_no": ["吊点编号", "point_no", "吊点", "点位", "point"],
        "max_load": ["最大载荷", "max_load", "额定载荷", "限载", "max load"],
        "current_load": ["当前载荷", "current_load", "实际载荷", "载荷", "load"],
        "equipment_no": ["设备编号", "equipment_no", "灯具编号", "设备"],
        "quantity": ["数量", "quantity", "qty", "台数"],
        "position": ["位置", "position", "区域", "位置描述"],
        "remark": ["备注", "remark", "说明"],
    }

    for field, patterns in column_patterns.items():
        for pattern in patterns:
            for i, h in enumerate(header_lower):
                if pattern.lower() in h.lower() or h.lower() == pattern.lower():
                    mapping[field] = i
                    break
            if field in mapping:
                break

    return mapping


def import_hoist_csv(file_path: str, db_path: Optional[str] = None) -> Tuple[int, int, List[str]]:
    """导入吊点载荷表

    Returns:
        (新增记录数, 跳过记录数, 警告信息列表)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    fh = file_hash(file_path)
    if check_source_imported(SOURCE_TYPE, fh, db_path):
        return 0, 0, [f"文件已导入过，跳过: {os.path.basename(file_path)}"]

    warnings = []
    records = []

    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        rows = list(reader)

    if not rows:
        return 0, 0, ["文件为空"]

    header = rows[0]
    col_map = _detect_columns(header)

    if "point_no" not in col_map:
        raise ValueError("无法识别吊点编号列，请检查 CSV 表头")

    for line_idx, row in enumerate(rows[1:], start=2):
        if not row or all(c.strip() == "" for c in row):
            continue

        def get_col(field):
            idx = col_map.get(field)
            if idx is not None and idx < len(row):
                return row[idx].strip()
            return ""

        point_no = get_col("point_no")
        if not point_no:
            warnings.append(f"第 {line_idx} 行: 吊点编号为空，跳过")
            continue

        max_load = safe_float(get_col("max_load"), 0.0)
        current_load = safe_float(get_col("current_load"), 0.0)
        quantity = safe_int(get_col("quantity"), 1)

        records.append({
            "source_line_no": line_idx,
            "point_no": point_no,
            "max_load": max_load,
            "current_load": current_load,
            "equipment_no": get_col("equipment_no"),
            "quantity": quantity,
            "position": get_col("position"),
            "remark": get_col("remark"),
        })

    source_id = record_import_source(SOURCE_TYPE, file_path, fh, db_path)

    with get_conn(db_path) as conn:
        for rec in records:
            conn.execute("""
                INSERT INTO hoist_points
                (source_id, source_line_no, point_no, max_load, current_load,
                 equipment_no, quantity, position, remark)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                source_id,
                rec["source_line_no"],
                rec["point_no"],
                rec["max_load"],
                rec["current_load"],
                rec["equipment_no"],
                rec["quantity"],
                rec["position"],
                rec["remark"],
            ))

    return len(records), 0, warnings
