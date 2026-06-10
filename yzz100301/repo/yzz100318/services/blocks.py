from sqlalchemy.orm import Session
from datetime import datetime
import json
import pandas as pd
import io
from models import TemporaryBlock
from schemas import TemporaryBlockCreate, TemporaryBlockUpdate, ImportResult
from typing import List, Optional
from services.applications import parse_km, parse_datetime


def get_block(db: Session, block_id: int) -> Optional[TemporaryBlock]:
    return db.query(TemporaryBlock).filter(TemporaryBlock.id == block_id).first()


def get_block_by_no(db: Session, block_no: str) -> Optional[TemporaryBlock]:
    return db.query(TemporaryBlock).filter(TemporaryBlock.block_no == block_no).first()


def get_blocks(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    line_name: Optional[str] = None,
    status: Optional[str] = None,
    batch_no: Optional[str] = None,
    plan_id: Optional[int] = None,
) -> List[TemporaryBlock]:
    query = db.query(TemporaryBlock)
    if line_name:
        query = query.filter(TemporaryBlock.line_name == line_name)
    if status:
        query = query.filter(TemporaryBlock.status == status)
    if batch_no:
        query = query.filter(TemporaryBlock.batch_no == batch_no)
    if plan_id:
        query = query.filter(TemporaryBlock.plan_id == plan_id)
    return query.offset(skip).limit(limit).all()


def create_block(db: Session, block: TemporaryBlockCreate) -> TemporaryBlock:
    now = datetime.now()
    db_block = TemporaryBlock(**block.model_dump(), created_at=now, updated_at=now)
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block


def update_block(db: Session, block_id: int, block_update: TemporaryBlockUpdate) -> Optional[TemporaryBlock]:
    db_block = get_block(db, block_id)
    if not db_block:
        return None
    update_data = block_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    for key, value in update_data.items():
        setattr(db_block, key, value)
    db.commit()
    db.refresh(db_block)
    return db_block


def delete_block(db: Session, block_id: int) -> bool:
    db_block = get_block(db, block_id)
    if not db_block:
        return False
    db.delete(db_block)
    db.commit()
    return True


def _normalize_block_data(item: dict) -> Optional[dict]:
    key_mapping = {
        "block_no": "block_no",
        "封锁单编号": "block_no",
        "临时封锁单号": "block_no",
        "line_name": "line_name",
        "线路名称": "line_name",
        "线路": "line_name",
        "section": "section",
        "区段": "section",
        "封锁区段": "section",
        "start_km": "start_km",
        "起始公里": "start_km",
        "开始公里": "start_km",
        "起点公里": "start_km",
        "起始里程": "start_km",
        "end_km": "end_km",
        "结束公里": "end_km",
        "终点公里": "end_km",
        "结束里程": "end_km",
        "block_reason": "block_reason",
        "封锁原因": "block_reason",
        "原因": "block_reason",
        "start_time": "start_time",
        "开始时间": "start_time",
        "封锁开始时间": "start_time",
        "end_time": "end_time",
        "结束时间": "end_time",
        "封锁结束时间": "end_time",
        "responsible_person": "responsible_person",
        "施工负责人": "responsible_person",
        "负责人": "responsible_person",
        "phone": "phone",
        "联系电话": "phone",
        "电话": "phone",
        "status": "status",
        "状态": "status",
        "复核状态": "status",
        "review_opinion": "review_opinion",
        "复核意见": "review_opinion",
        "plan_id": "plan_id",
        "关联计划ID": "plan_id",
        "batch_no": "batch_no",
        "批次号": "batch_no",
    }

    data = {}
    for k, v in item.items():
        if v is None:
            continue
        if k in key_mapping:
            data[key_mapping[k]] = v

    if "block_no" not in data or not data["block_no"]:
        return None

    if "start_km" in data:
        data["start_km"] = parse_km(data["start_km"]) if not isinstance(data["start_km"], (int, float)) else float(data["start_km"])
    if "end_km" in data:
        data["end_km"] = parse_km(data["end_km"]) if not isinstance(data["end_km"], (int, float)) else float(data["end_km"])

    if "start_km" not in data:
        data["start_km"] = 0.0
    if "end_km" not in data:
        data["end_km"] = 0.0

    if "start_time" in data:
        if isinstance(data["start_time"], str):
            data["start_time"] = parse_datetime(data["start_time"])
    if "end_time" in data:
        if isinstance(data["end_time"], str):
            data["end_time"] = parse_datetime(data["end_time"])

    if not data.get("start_time") or not data.get("end_time"):
        return None

    if not data.get("line_name"):
        return None

    if not data.get("section"):
        data["section"] = data.get("line_name", "")

    if not data.get("responsible_person"):
        return None

    return data


def import_blocks_from_json(db: Session, json_content: bytes, source_file: str, batch_no: Optional[str] = None) -> ImportResult:
    result = ImportResult()
    try:
        content_str = json_content.decode("utf-8-sig") if json_content.startswith(b"\xef\xbb\xbf") else json_content.decode("utf-8")
    except UnicodeDecodeError:
        content_str = json_content.decode("gbk", errors="ignore")

    try:
        data = json.loads(content_str)
    except Exception as e:
        result.errors.append(f"JSON解析失败: {str(e)}")
        return result

    if isinstance(data, dict):
        if "blocks" in data and isinstance(data["blocks"], list):
            items = data["blocks"]
        elif "data" in data and isinstance(data["data"], list):
            items = data["data"]
        else:
            items = [data]
    elif isinstance(data, list):
        items = data
    else:
        result.errors.append("JSON格式错误，应为对象数组")
        return result

    for idx, item in enumerate(items):
        result.total += 1
        try:
            normalized = _normalize_block_data(item)
            if not normalized:
                result.errors.append(f"第{idx+1}条: 关键字段缺失或格式错误")
                continue

            existing = get_block_by_no(db, normalized["block_no"])
            if existing:
                result.skipped += 1
                continue

            if batch_no and "batch_no" not in normalized:
                normalized["batch_no"] = batch_no

            normalized["source_file"] = source_file
            block_create = TemporaryBlockCreate(**normalized)
            create_block(db, block_create)
            result.created += 1

        except Exception as e:
            result.errors.append(f"第{idx+1}条: {str(e)}")

    return result


def import_blocks_from_csv(db: Session, csv_content: bytes, source_file: str, batch_no: Optional[str] = None) -> ImportResult:
    result = ImportResult()
    try:
        content_str = csv_content.decode("utf-8-sig") if csv_content.startswith(b"\xef\xbb\xbf") else csv_content.decode("utf-8")
    except UnicodeDecodeError:
        content_str = csv_content.decode("gbk", errors="ignore")

    try:
        df = pd.read_csv(io.StringIO(content_str))
    except Exception as e:
        result.errors.append(f"CSV解析失败: {str(e)}")
        return result

    df.columns = [c.strip() for c in df.columns]

    col_map = {
        "封锁单编号": "block_no",
        "临时封锁单号": "block_no",
        "线路名称": "line_name",
        "线路": "line_name",
        "区段": "section",
        "封锁区段": "section",
        "起始公里": "start_km",
        "开始公里": "start_km",
        "起点公里": "start_km",
        "起始里程": "start_km",
        "结束公里": "end_km",
        "终点公里": "end_km",
        "结束里程": "end_km",
        "封锁原因": "block_reason",
        "原因": "block_reason",
        "开始时间": "start_time",
        "封锁开始时间": "start_time",
        "结束时间": "end_time",
        "封锁结束时间": "end_time",
        "施工负责人": "responsible_person",
        "负责人": "responsible_person",
        "联系电话": "phone",
        "电话": "phone",
        "状态": "status",
        "复核状态": "status",
        "批次号": "batch_no",
    }

    for idx, row in df.iterrows():
        result.total += 1
        try:
            data = {}
            for col_cn, col_en in col_map.items():
                if col_cn in df.columns and pd.notna(row[col_cn]):
                    data[col_en] = str(row[col_cn]).strip()

            if "block_no" not in data or not data["block_no"]:
                result.errors.append(f"第{idx+2}行: 缺少封锁单编号")
                continue

            if "start_km" in data:
                data["start_km"] = parse_km(data["start_km"])
            if "end_km" in data:
                data["end_km"] = parse_km(data["end_km"])
            if "start_time" in data:
                data["start_time"] = parse_datetime(data["start_time"])
            if "end_time" in data:
                data["end_time"] = parse_datetime(data["end_time"])

            if "start_km" not in data:
                data["start_km"] = 0.0
            if "end_km" not in data:
                data["end_km"] = 0.0

            if not data.get("start_time") or not data.get("end_time"):
                result.errors.append(f"第{idx+2}行: 开始时间或结束时间格式错误")
                continue

            if not data.get("line_name"):
                result.errors.append(f"第{idx+2}行: 缺少线路名称")
                continue

            if not data.get("section"):
                data["section"] = data.get("line_name", "")

            if not data.get("responsible_person"):
                result.errors.append(f"第{idx+2}行: 缺少施工负责人")
                continue

            existing = get_block_by_no(db, data["block_no"])
            if existing:
                result.skipped += 1
                continue

            if batch_no and "batch_no" not in data:
                data["batch_no"] = batch_no

            data["source_file"] = source_file
            block_create = TemporaryBlockCreate(**data)
            create_block(db, block_create)
            result.created += 1

        except Exception as e:
            result.errors.append(f"第{idx+2}行: {str(e)}")

    return result
