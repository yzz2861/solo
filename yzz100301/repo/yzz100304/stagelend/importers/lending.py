"""灯具借出表导入 (CSV 格式)

CSV 字段约定（支持中文表头，自动识别）:
- 设备编号 / equipment_no / 灯具编号
- 设备名称 / name / 灯具名称
- 数量 / quantity / qty
- 借出人 / lender / 发放人
- 借用人 / borrower / 领取人
- 借出日期 / lend_date / 发放日期
- 应还日期 / due_date / 归还日期
- 用途 / purpose / 使用场景
- 位置 / location / 吊挂位置
- 备注 / remark
- 批次号 / batch_no / 批次
"""

import csv
import os
from typing import List, Dict, Tuple, Optional

from ..database import (
    get_conn,
    check_source_imported,
    record_import_source,
)
from ..utils import file_hash, safe_int


SOURCE_TYPE = "lending"


def _detect_columns(header: List[str]) -> Dict[str, str]:
    """根据表头自动映射字段名"""
    mapping = {}
    header_lower = [h.strip() for h in header]

    column_patterns = {
        "equipment_no": ["设备编号", "equipment_no", "灯具编号", "equip_no", "编号"],
        "name": ["设备名称", "name", "灯具名称", "名称"],
        "quantity": ["数量", "quantity", "qty", "借出数量"],
        "borrower": ["借用人", "borrower", "领取人", "使用人", "班组"],
        "lender": ["借出人", "lender", "发放人", "管理员", "出库人"],
        "lend_date": ["借出日期", "lend_date", "发放日期", "出库日期", "日期"],
        "due_date": ["应还日期", "due_date", "归还日期", "预计归还"],
        "purpose": ["用途", "purpose", "使用场景", "节目", "剧目"],
        "location": ["位置", "location", "吊挂位置", "安装位置", "区域"],
        "remark": ["备注", "remark", "说明", "remark"],
        "batch_no": ["批次号", "batch_no", "批次", "batch"],
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


def import_lending_csv(file_path: str, db_path: Optional[str] = None) -> Tuple[int, int, List[str]]:
    """导入灯具借出表

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

        quantity = safe_int(get_col("quantity"), 1)
        if quantity <= 0:
            warnings.append(f"第 {line_idx} 行: 数量无效 ({get_col('quantity')})，使用默认值 1")
            quantity = 1

        records.append({
            "source_line_no": line_idx,
            "equipment_no": equip_no,
            "name": get_col("name"),
            "quantity": quantity,
            "borrower": get_col("borrower"),
            "lender": get_col("lender"),
            "lend_date": get_col("lend_date"),
            "due_date": get_col("due_date"),
            "purpose": get_col("purpose"),
            "location": get_col("location"),
            "remark": get_col("remark"),
            "batch_no": get_col("batch_no"),
        })

    source_id = record_import_source(SOURCE_TYPE, file_path, fh, db_path)

    with get_conn(db_path) as conn:
        for rec in records:
            conn.execute("""
                INSERT INTO lending_records
                (source_id, source_line_no, equipment_no, quantity, borrower, lender,
                 lend_date, due_date, purpose, location, remark, batch_no)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                source_id,
                rec["source_line_no"],
                rec["equipment_no"],
                rec["quantity"],
                rec["borrower"],
                rec["lender"],
                rec["lend_date"],
                rec["due_date"],
                rec["purpose"],
                rec["location"],
                rec["remark"],
                rec["batch_no"],
            ))

            conn.execute("""
                INSERT OR IGNORE INTO equipments (equipment_no, name, status)
                VALUES (?, ?, 'available')
            """, (rec["equipment_no"], rec["name"]))

    return len(records), 0, warnings
