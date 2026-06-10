"""归还 JSON 导入

JSON 格式约定:
{
  "batch_no": "BATCH-2024-01",
  "return_date": "2024-01-15",
  "returner": "张三",
  "verifier": "李四",
  "items": [
    {
      "equipment_no": "LIGHT-001",
      "name": "成像灯",
      "quantity": 5,
      "condition": "完好",
      "remark": ""
    }
  ]
}

也支持数组格式:
[
  {
    "equipment_no": "LIGHT-001",
    ...
  }
]
"""

import json
import os
from typing import List, Dict, Tuple, Optional

from ..database import (
    get_conn,
    check_source_imported,
    record_import_source,
)
from ..utils import file_hash, safe_int


SOURCE_TYPE = "returns"


def _normalize_items(data) -> List[Dict]:
    """将 JSON 数据标准化为 items 列表"""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        items = data.get("items", [])
        batch_no = data.get("batch_no", "")
        return_date = data.get("return_date", "")
        returner = data.get("returner", "")
        verifier = data.get("verifier", "")
        verified = data.get("verified", 0)
        for item in items:
            item.setdefault("batch_no", batch_no)
            item.setdefault("return_date", return_date)
            item.setdefault("returner", returner)
            item.setdefault("verifier", verifier)
            item.setdefault("verified", verified)
        return items
    return []


def import_returns_json(file_path: str, db_path: Optional[str] = None) -> Tuple[int, int, List[str]]:
    """导入归还 JSON

    Returns:
        (新增记录数, 跳过记录数, 警告信息列表)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    fh = file_hash(file_path)
    if check_source_imported(SOURCE_TYPE, fh, db_path):
        return 0, 0, [f"文件已导入过，跳过: {os.path.basename(file_path)}"]

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = _normalize_items(data)
    if not items:
        return 0, 0, ["JSON 中没有找到归还记录"]

    warnings = []
    records = []

    for idx, item in enumerate(items, start=1):
        equip_no = item.get("equipment_no") or item.get("equip_no") or item.get("编号")
        if not equip_no:
            warnings.append(f"第 {idx} 项: 设备编号为空，跳过")
            continue

        quantity = safe_int(item.get("quantity") or item.get("数量") or item.get("qty"), 1)
        if quantity <= 0:
            warnings.append(f"第 {idx} 项: 数量无效，使用默认值 1")
            quantity = 1

        verified_raw = item.get("verified", item.get("已复核", 0))
        if isinstance(verified_raw, bool):
            verified = 1 if verified_raw else 0
        else:
            verified = safe_int(verified_raw, 0)

        records.append({
            "source_line_no": idx,
            "equipment_no": str(equip_no),
            "name": item.get("name", item.get("名称", "")),
            "quantity": quantity,
            "returner": item.get("returner", item.get("归还人", "")),
            "return_date": item.get("return_date", item.get("归还日期", "")),
            "verifier": item.get("verifier", item.get("复核人", "")),
            "verified": verified,
            "condition": item.get("condition", item.get("状态", item.get("完好情况", ""))),
            "remark": item.get("remark", item.get("备注", "")),
            "batch_no": item.get("batch_no", item.get("批次号", item.get("批次", ""))),
        })

    source_id = record_import_source(SOURCE_TYPE, file_path, fh, db_path)

    with get_conn(db_path) as conn:
        for rec in records:
            conn.execute("""
                INSERT INTO return_records
                (source_id, source_line_no, equipment_no, quantity, returner,
                 return_date, verifier, verified, condition, remark, batch_no)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                source_id,
                rec["source_line_no"],
                rec["equipment_no"],
                rec["quantity"],
                rec["returner"],
                rec["return_date"],
                rec["verifier"],
                rec["verified"],
                rec["condition"],
                rec["remark"],
                rec["batch_no"],
            ))

            conn.execute("""
                INSERT OR IGNORE INTO equipments (equipment_no, name, status)
                VALUES (?, ?, 'available')
            """, (rec["equipment_no"], rec["name"]))

    return len(records), 0, warnings
