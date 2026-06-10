"""停用/报废表导入 (CSV 格式)

CSV 字段约定（支持中文表头，自动识别）:
- 设备编号 / equipment_no / 灯具编号 / 编号
- 设备名称 / name / 灯具名称 / 名称
- 停用日期 / decommission_date / 报废日期 / 日期
- 停用原因 / reason / 原因 (normal/damaged/lost/obsolete 或 中文：正常/损坏/丢失/淘汰)
- 原因描述 / reason_detail / 详细原因
- 操作人 / operator / 经办人
- 备注 / remark / 说明
"""

import csv
import os
from typing import List, Dict, Tuple, Optional

from ..database import (
    get_conn,
    check_source_imported,
    record_import_source,
)
from ..utils import file_hash


SOURCE_TYPE = "decommission"

REASON_MAP = {
    "normal": "normal",
    "正常": "normal",
    "常规": "normal",
    "damaged": "damaged",
    "损坏": "damaged",
    "损坏报废": "damaged",
    "故障": "damaged",
    "lost": "lost",
    "丢失": "lost",
    "遗失": "lost",
    "obsolete": "obsolete",
    "淘汰": "obsolete",
    "过时": "obsolete",
    "老旧": "obsolete",
}


def _detect_columns(header: List[str]) -> Dict[str, str]:
    """根据表头自动映射字段名"""
    mapping = {}
    header_lower = [h.strip() for h in header]

    column_patterns = {
        "equipment_no": ["设备编号", "equipment_no", "灯具编号", "equip_no", "编号"],
        "name": ["设备名称", "name", "灯具名称", "名称"],
        "decommission_date": ["停用日期", "decommission_date", "报废日期", "日期", "处理日期"],
        "reason": ["停用原因", "reason", "原因", "报废原因", "处理原因"],
        "reason_detail": ["原因描述", "reason_detail", "详细原因", "原因说明"],
        "operator": ["操作人", "operator", "经办人", "处理人"],
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


def _normalize_reason(raw: str) -> str:
    """标准化停用原因编码"""
    if not raw:
        return "normal"
    key = raw.strip()
    return REASON_MAP.get(key, REASON_MAP.get(key.lower(), "normal"))


def import_decommission_csv(file_path: str, db_path: Optional[str] = None) -> Tuple[int, int, List[str]]:
    """导入停用/报废表

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

    if "equipment_no" not in col_map:
        raise ValueError("无法识别设备编号列，请检查 CSV 表头")

    if "decommission_date" not in col_map:
        warnings.append("未识别到停用日期列，将使用导入当天日期")

    for line_idx, row in enumerate(rows[1:], start=2):
        if not row or all(c.strip() == "" for c in row):
            continue

        def get_col(field):
            idx = col_map.get(field)
            if idx is not None and idx < len(row):
                return row[idx].strip()
            return ""

        equip_no = get_col("equipment_no")
        if not equip_no:
            warnings.append(f"第 {line_idx} 行: 设备编号为空，跳过")
            continue

        decommission_date = get_col("decommission_date")
        if not decommission_date:
            from datetime import date as _date
            decommission_date = _date.today().strftime("%Y-%m-%d")
            warnings.append(f"第 {line_idx} 行: 停用日期为空，使用默认值 {decommission_date}")

        raw_reason = get_col("reason")
        reason = _normalize_reason(raw_reason)
        if raw_reason and reason == "normal" and raw_reason.strip() not in REASON_MAP:
            warnings.append(f"第 {line_idx} 行: 原因 '{raw_reason}' 无法识别，使用默认 normal")

        records.append({
            "source_line_no": line_idx,
            "equipment_no": equip_no,
            "name": get_col("name"),
            "decommission_date": decommission_date,
            "reason": reason,
            "reason_detail": get_col("reason_detail"),
            "operator": get_col("operator"),
            "remark": get_col("remark"),
        })

    source_id = record_import_source(SOURCE_TYPE, file_path, fh, db_path)

    with get_conn(db_path) as conn:
        for rec in records:
            equip = conn.execute(
                "SELECT id FROM equipments WHERE equipment_no = ?",
                (rec["equipment_no"],)
            ).fetchone()

            if not equip:
                conn.execute(
                    "INSERT INTO equipments (equipment_no, name, status, decommissioned) VALUES (?, ?, 'decommissioned', 1)",
                    (rec["equipment_no"], rec["name"] or rec["equipment_no"])
                )
            else:
                conn.execute(
                    "UPDATE equipments SET status = 'decommissioned', decommissioned = 1 WHERE equipment_no = ?",
                    (rec["equipment_no"],)
                )
                if rec["name"]:
                    conn.execute(
                        "UPDATE equipments SET name = ? WHERE equipment_no = ? AND (name IS NULL OR name = '')",
                        (rec["name"], rec["equipment_no"])
                    )

            conn.execute(
                "UPDATE decommission_records SET revoked = 1 WHERE equipment_no = ? AND revoked = 0",
                (rec["equipment_no"],)
            )

            conn.execute("""
                INSERT INTO decommission_records
                (source_id, source_line_no, equipment_no, decommission_date,
                 reason, reason_detail, operator, remark, revoked)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
            """, (
                source_id,
                rec["source_line_no"],
                rec["equipment_no"],
                rec["decommission_date"],
                rec["reason"],
                rec["reason_detail"],
                rec["operator"],
                rec["remark"],
            ))

    return len(records), 0, warnings
