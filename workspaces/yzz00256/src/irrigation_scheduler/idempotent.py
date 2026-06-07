"""幂等机制与历史快照管理"""

from __future__ import annotations

import json
import os
from typing import List, Optional, Tuple
from datetime import datetime

from .models import (
    Plot, IrrigationRule, PlotResult, PlotStatus,
    ScheduleResult, BatchInfo, Snapshot, TaskStatus,
)


SNAPSHOT_DIR_NAME = "snapshots"
SNAPSHOT_INDEX_FILE = "index.json"


def _get_snapshot_dir(output_dir: str) -> str:
    return os.path.join(output_dir, SNAPSHOT_DIR_NAME)


def _get_index_path(output_dir: str) -> str:
    return os.path.join(_get_snapshot_dir(output_dir), SNAPSHOT_INDEX_FILE)


def _load_index(output_dir: str) -> dict:
    index_path = _get_index_path(output_dir)
    if not os.path.exists(index_path):
        return {"by_hash": {}, "by_batch": {}}
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {"by_hash": {}, "by_batch": {}}


def _save_index(output_dir: str, index: dict) -> None:
    snapshot_dir = _get_snapshot_dir(output_dir)
    os.makedirs(snapshot_dir, exist_ok=True)
    with open(_get_index_path(output_dir), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


def _get_snapshot_path(output_dir: str, batch_id: str) -> str:
    return os.path.join(_get_snapshot_dir(output_dir), f"{batch_id}.json")


def check_idempotent(
    output_dir: str,
    input_hash: str,
) -> Tuple[Optional[Snapshot], bool]:
    """
    检查是否存在相同输入的历史快照（幂等校验）

    返回: (快照对象, 是否命中)
    """
    if not output_dir or not os.path.exists(_get_index_path(output_dir)):
        return None, False

    index = _load_index(output_dir)
    batch_id = index.get("by_hash", {}).get(input_hash)

    if not batch_id:
        return None, False

    snapshot_path = _get_snapshot_path(output_dir, batch_id)
    if not os.path.exists(snapshot_path):
        return None, False

    try:
        with open(snapshot_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return Snapshot.from_dict(data), True
    except (json.JSONDecodeError, KeyError, ValueError, OSError):
        return None, False


def save_snapshot(output_dir: str, result: ScheduleResult) -> str:
    """保存执行快照到输出目录"""
    snapshot_dir = _get_snapshot_dir(output_dir)
    os.makedirs(snapshot_dir, exist_ok=True)

    snapshot = Snapshot(
        batch_id=result.batch.batch_id,
        batch_name=result.batch.batch_name,
        input_hash=result.batch.input_hash,
        created_at=result.batch.created_at,
        result_count=result.total_plots,
        success_count=result.success_count,
        failed_count=result.failed_count,
        review_count=result.review_count,
        results=[r.to_dict() for r in result.plot_results],
    )

    snapshot_path = _get_snapshot_path(output_dir, result.batch.batch_id)
    with open(snapshot_path, "w", encoding="utf-8") as f:
        json.dump(snapshot.to_dict(), f, ensure_ascii=False, indent=2)

    index = _load_index(output_dir)
    index["by_hash"][result.batch.input_hash] = result.batch.batch_id
    index["by_batch"][result.batch.batch_id] = {
        "input_hash": result.batch.input_hash,
        "created_at": result.batch.created_at,
        "snapshot_path": snapshot_path,
    }
    _save_index(output_dir, index)

    return snapshot_path


def load_snapshot_by_batch(output_dir: str, batch_id: str) -> Optional[Snapshot]:
    """根据批次号加载快照"""
    snapshot_path = _get_snapshot_path(output_dir, batch_id)
    if not os.path.exists(snapshot_path):
        return None
    try:
        with open(snapshot_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return Snapshot.from_dict(data)
    except (json.JSONDecodeError, KeyError, ValueError, OSError):
        return None


def snapshot_to_result(snapshot: Snapshot, batch_name: str = "") -> ScheduleResult:
    """将快照转换为 ScheduleResult（用于幂等复用）"""
    plot_results: List[PlotResult] = []
    for r_data in snapshot.results:
        result = PlotResult(
            plot_id=r_data["plot_id"],
            plot_name=r_data["plot_name"],
            status=PlotStatus(r_data["status"]),
            group_id=r_data.get("group_id", ""),
            group_name=r_data.get("group_name", ""),
            sequence=r_data.get("sequence", 0),
            start_time=r_data.get("start_time", ""),
            end_time=r_data.get("end_time", ""),
            error_reason=r_data.get("error_reason", ""),
            review_reason=r_data.get("review_reason", ""),
        )
        plot_results.append(result)

    new_batch_id = BatchInfo.generate_id()
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    batch = BatchInfo(
        batch_id=new_batch_id,
        batch_name=batch_name or f"轮灌批次-{new_batch_id}",
        created_at=created_at,
        input_hash=snapshot.input_hash,
        source_files=[],
    )

    return ScheduleResult(
        batch=batch,
        status=TaskStatus.GENERATED,
        groups=[],
        plot_results=plot_results,
        is_idempotent=True,
        source_batch_id=snapshot.batch_id,
    )


def list_snapshots(output_dir: str) -> List[dict]:
    """列出所有历史快照摘要"""
    index = _load_index(output_dir)
    batches = index.get("by_batch", {})

    result = []
    for batch_id, info in sorted(batches.items(), key=lambda x: x[1].get("created_at", ""), reverse=True):
        snapshot = load_snapshot_by_batch(output_dir, batch_id)
        if snapshot:
            result.append({
                "batch_id": snapshot.batch_id,
                "batch_name": snapshot.batch_name,
                "created_at": snapshot.created_at,
                "input_hash": snapshot.input_hash,
                "total": snapshot.result_count,
                "success": snapshot.success_count,
                "failed": snapshot.failed_count,
                "review": snapshot.review_count,
            })
    return result
