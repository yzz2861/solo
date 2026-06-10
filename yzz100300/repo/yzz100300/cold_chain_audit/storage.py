"""本地数据存储与历史批次管理。

数据存放在 ~/.cold_chain_audit/batches/ 目录下，
每个批次一个 JSON 文件。
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Optional

from .models import BatchResult, ScanRecord, BoxLifecycle, Anomaly


def get_data_dir() -> str:
    """获取数据存储目录。"""
    home = os.path.expanduser("~")
    data_dir = os.path.join(home, ".cold_chain_audit", "batches")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


def _scan_record_to_dict(rec: ScanRecord) -> dict:
    return {
        "box_id": rec.box_id,
        "scan_type": rec.scan_type,
        "scan_time": rec.scan_time.isoformat(),
        "store": rec.store,
        "temperature": rec.temperature,
        "source": rec.source,
        "source_file": rec.source_file,
        "source_line": rec.source_line,
        "raw": rec.raw,
        "fingerprint": rec.fingerprint,
    }


def _scan_record_from_dict(d: dict) -> ScanRecord:
    return ScanRecord(
        box_id=d["box_id"],
        scan_type=d["scan_type"],
        scan_time=datetime.fromisoformat(d["scan_time"]),
        store=d.get("store", ""),
        temperature=d.get("temperature"),
        source=d.get("source", "csv"),
        source_file=d.get("source_file", ""),
        source_line=d.get("source_line", 0),
        raw=d.get("raw", {}),
        fingerprint=d.get("fingerprint", ""),
    )


def _anomaly_to_dict(a: Anomaly) -> dict:
    return {
        "level": a.level,
        "category": a.category,
        "message": a.message,
        "box_id": a.box_id,
        "scan_type": a.scan_type,
        "source_file": a.source_file,
        "source_line": a.source_line,
        "raw": a.raw,
    }


def _anomaly_from_dict(d: dict) -> Anomaly:
    return Anomaly(
        level=d["level"],
        category=d["category"],
        message=d["message"],
        box_id=d.get("box_id", ""),
        scan_type=d.get("scan_type", ""),
        source_file=d.get("source_file", ""),
        source_line=d.get("source_line", 0),
        raw=d.get("raw", {}),
    )


def save_batch(result: BatchResult) -> str:
    """保存一个批次到本地存储。

    返回保存的文件路径。
    """
    data_dir = get_data_dir()
    file_path = os.path.join(data_dir, f"{result.batch_id}.json")

    # 序列化
    data = {
        "batch_id": result.batch_id,
        "batch_date": result.batch_date,
        "created_at": result.created_at.isoformat(),
        "total_boxes": result.total_boxes,
        "complete_boxes": result.complete_boxes,
        "source_files": result.source_files,
        "records": [_scan_record_to_dict(r) for r in result.records],
        "boxes": {
            bid: {
                "box_id": box.box_id,
                "outbound": _scan_record_to_dict(box.outbound) if box.outbound else None,
                "arrive": _scan_record_to_dict(box.arrive) if box.arrive else None,
                "return_": _scan_record_to_dict(box.return_) if box.return_ else None,
                "clean": _scan_record_to_dict(box.clean) if box.clean else None,
                "anomalies": [_anomaly_to_dict(a) for a in box.anomalies],
            }
            for bid, box in result.boxes.items()
        },
        "anomalies": [_anomaly_to_dict(a) for a in result.anomalies],
    }

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return file_path


def load_batch(batch_id: str) -> Optional[BatchResult]:
    """从本地存储加载一个批次。"""
    data_dir = get_data_dir()
    file_path = os.path.join(data_dir, f"{batch_id}.json")

    if not os.path.exists(file_path):
        return None

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    boxes = {}
    for bid, bd in data["boxes"].items():
        box = BoxLifecycle(
            box_id=bd["box_id"],
            outbound=_scan_record_from_dict(bd["outbound"]) if bd.get("outbound") else None,
            arrive=_scan_record_from_dict(bd["arrive"]) if bd.get("arrive") else None,
            return_=_scan_record_from_dict(bd["return_"]) if bd.get("return_") else None,
            clean=_scan_record_from_dict(bd["clean"]) if bd.get("clean") else None,
            anomalies=[_anomaly_from_dict(a) for a in bd.get("anomalies", [])],
        )
        boxes[bid] = box

    result = BatchResult(
        batch_id=data["batch_id"],
        batch_date=data["batch_date"],
        created_at=datetime.fromisoformat(data["created_at"]),
        total_boxes=data.get("total_boxes", 0),
        complete_boxes=data.get("complete_boxes", 0),
        records=[_scan_record_from_dict(r) for r in data.get("records", [])],
        boxes=boxes,
        anomalies=[_anomaly_from_dict(a) for a in data.get("anomalies", [])],
        source_files=data.get("source_files", []),
    )

    return result


def list_batches(date: Optional[str] = None) -> List[dict]:
    """列出所有历史批次，按日期倒序、时间倒序排列。

    Args:
        date: 可选，只列出指定日期的批次（YYYY-MM-DD）
    """
    data_dir = get_data_dir()
    batches = []

    for filename in os.listdir(data_dir):
        if not filename.endswith(".json"):
            continue

        file_path = os.path.join(data_dir, filename)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            if date and data.get("batch_date") != date:
                continue

            batches.append({
                "batch_id": data["batch_id"],
                "batch_date": data.get("batch_date", ""),
                "created_at": data.get("created_at", ""),
                "total_boxes": data.get("total_boxes", 0),
                "complete_boxes": data.get("complete_boxes", 0),
                "anomaly_count": len(data.get("anomalies", [])),
                "source_files": data.get("source_files", []),
            })
        except Exception:
            continue

    # 按日期+时间倒序
    batches.sort(key=lambda b: (b["batch_date"], b["created_at"]), reverse=True)
    return batches


def delete_batch(batch_id: str) -> bool:
    """删除一个批次。"""
    data_dir = get_data_dir()
    file_path = os.path.join(data_dir, f"{batch_id}.json")

    if os.path.exists(file_path):
        os.remove(file_path)
        return True
    return False


def generate_batch_id(batch_date: str) -> str:
    """生成批次号：日期 + 短UUID。"""
    short_uuid = uuid.uuid4().hex[:8]
    return f"{batch_date}-{short_uuid}"
