"""核心处理流程：导入 → 去重 → 追踪 → 异常检测 → 生成结果。"""

import os
from datetime import datetime
from typing import List, Optional, Set, Tuple

from .models import BatchResult, ScanRecord, Anomaly
from .parsers import parse_csv, parse_manual_json, deduplicate_records
from .tracker import build_lifecycle, detect_anomalies
from .storage import save_batch, load_batch, generate_batch_id


def _anomaly_key(a: Anomaly) -> Tuple[str, str, str, str, int]:
    """生成异常的唯一标识键，用于去重。"""
    return (a.category, a.box_id, a.scan_type, a.source_file, a.source_line)


def _deduplicate_anomalies(anomalies: List[Anomaly]) -> List[Anomaly]:
    """对异常列表去重，保留第一个出现的。"""
    seen: Set[Tuple[str, str, str, str, int]] = set()
    result: List[Anomaly] = []
    for a in anomalies:
        key = _anomaly_key(a)
        if key not in seen:
            seen.add(key)
            result.append(a)
    return result


def process_batch(
    csv_files: List[str],
    manual_json: Optional[str] = None,
    batch_date: Optional[str] = None,
    batch_id: Optional[str] = None,
    existing_batch_id: Optional[str] = None,
) -> BatchResult:
    """处理一个盘点批次。

    Args:
        csv_files: CSV 扫码记录文件列表
        manual_json: 手工补录 JSON 文件（可选）
        batch_date: 批次日期（YYYY-MM-DD），默认今天
        batch_id: 自定义批次号（可选）
        existing_batch_id: 追加到已有批次（可选，用于增量补录）

    Returns:
        BatchResult 批次结果
    """
    if not batch_date:
        batch_date = datetime.now().strftime("%Y-%m-%d")

    source_files: List[str] = []
    all_records: List[ScanRecord] = []
    all_parse_anomalies: List[Anomaly] = []
    existing_source_files: Set[str] = set()

    # 如果是追加到已有批次，先加载已有数据
    if existing_batch_id:
        existing = load_batch(existing_batch_id)
        if existing:
            all_records.extend(existing.records)
            all_parse_anomalies.extend(existing.anomalies)
            source_files.extend(existing.source_files)
            existing_source_files = set(existing.source_files)
            batch_date = existing.batch_date
            batch_id = existing.batch_id
        else:
            raise ValueError(f"找不到批次: {existing_batch_id}")

    # 解析所有 CSV（跳过已存在的文件）
    for csv_path in csv_files:
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV 文件不存在: {csv_path}")
        csv_basename = os.path.basename(csv_path)
        if csv_basename in existing_source_files:
            continue
        records, anomalies = parse_csv(csv_path)
        all_records.extend(records)
        all_parse_anomalies.extend(anomalies)
        source_files.append(csv_basename)

    # 解析手工补录 JSON（跳过已存在的文件）
    if manual_json:
        if not os.path.exists(manual_json):
            raise FileNotFoundError(f"手工补录文件不存在: {manual_json}")
        manual_basename = os.path.basename(manual_json)
        if manual_basename not in existing_source_files:
            records, anomalies = parse_manual_json(manual_json)
            all_records.extend(records)
            all_parse_anomalies.extend(anomalies)
            source_files.append(manual_basename)

    if not all_records and not all_parse_anomalies:
        raise ValueError("没有解析到任何记录")

    # 去重（记录）
    deduped_records, dup_anomalies = deduplicate_records(all_records)

    # 构建生命周期
    boxes = build_lifecycle(deduped_records)

    # 异常检测
    tracker_anomalies = detect_anomalies(boxes)

    # 汇总所有异常并去重
    all_anomalies = _deduplicate_anomalies(
        all_parse_anomalies + dup_anomalies + tracker_anomalies
    )

    # 统计
    total_boxes = len(boxes)
    complete_boxes = sum(1 for b in boxes.values() if b.is_complete)

    # 生成批次号
    if not batch_id:
        batch_id = generate_batch_id(batch_date)

    # 构建结果
    result = BatchResult(
        batch_id=batch_id,
        batch_date=batch_date,
        created_at=datetime.now(),
        total_boxes=total_boxes,
        complete_boxes=complete_boxes,
        records=deduped_records,
        boxes=boxes,
        anomalies=all_anomalies,
        source_files=sorted(set(source_files)),
    )

    # 保存到本地
    save_batch(result)

    return result
