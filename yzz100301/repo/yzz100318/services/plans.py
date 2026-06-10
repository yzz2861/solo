from sqlalchemy.orm import Session
from datetime import datetime
import json
from models import SkylightPlan, ConstructionApplication
from schemas import SkylightPlanCreate, SkylightPlanUpdate, ImportResult
from typing import List, Optional
from services.applications import parse_km, parse_datetime


def get_plan(db: Session, plan_id: int) -> Optional[SkylightPlan]:
    return db.query(SkylightPlan).filter(SkylightPlan.id == plan_id).first()


def get_plan_by_no(db: Session, plan_no: str) -> Optional[SkylightPlan]:
    return db.query(SkylightPlan).filter(SkylightPlan.plan_no == plan_no).first()


def get_plans(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    line_name: Optional[str] = None,
    status: Optional[str] = None,
    batch_no: Optional[str] = None,
    application_id: Optional[int] = None,
) -> List[SkylightPlan]:
    query = db.query(SkylightPlan)
    if line_name:
        query = query.filter(SkylightPlan.line_name == line_name)
    if status:
        query = query.filter(SkylightPlan.status == status)
    if batch_no:
        query = query.filter(SkylightPlan.batch_no == batch_no)
    if application_id:
        query = query.filter(SkylightPlan.application_id == application_id)
    return query.offset(skip).limit(limit).all()


def create_plan(db: Session, plan: SkylightPlanCreate) -> SkylightPlan:
    now = datetime.now()
    db_plan = SkylightPlan(**plan.model_dump(), created_at=now, updated_at=now)
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan


def update_plan(db: Session, plan_id: int, plan_update: SkylightPlanUpdate) -> Optional[SkylightPlan]:
    db_plan = get_plan(db, plan_id)
    if not db_plan:
        return None
    update_data = plan_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    for key, value in update_data.items():
        setattr(db_plan, key, value)
    db.commit()
    db.refresh(db_plan)
    return db_plan


def delete_plan(db: Session, plan_id: int) -> bool:
    db_plan = get_plan(db, plan_id)
    if not db_plan:
        return False
    db.delete(db_plan)
    db.commit()
    return True


def _normalize_plan_data(item: dict) -> Optional[dict]:
    key_mapping = {
        "plan_no": "plan_no",
        "计划编号": "plan_no",
        "天窗计划编号": "plan_no",
        "line_name": "line_name",
        "线路名称": "line_name",
        "线路": "line_name",
        "section": "section",
        "区段": "section",
        "施工区段": "section",
        "start_km": "start_km",
        "起始公里": "start_km",
        "开始公里": "start_km",
        "起点公里": "start_km",
        "起始里程": "start_km",
        "end_km": "end_km",
        "结束公里": "end_km",
        "终点公里": "end_km",
        "结束里程": "end_km",
        "skylight_type": "skylight_type",
        "天窗类型": "skylight_type",
        "start_time": "start_time",
        "开始时间": "start_time",
        "天窗开始时间": "start_time",
        "end_time": "end_time",
        "结束时间": "end_time",
        "天窗结束时间": "end_time",
        "construction_content": "construction_content",
        "施工内容": "construction_content",
        "responsible_person": "responsible_person",
        "施工负责人": "responsible_person",
        "负责人": "responsible_person",
        "phone": "phone",
        "联系电话": "phone",
        "电话": "phone",
        "status": "status",
        "状态": "status",
        "review_opinion": "review_opinion",
        "复核意见": "review_opinion",
        "application_id": "application_id",
        "关联申请ID": "application_id",
        "batch_no": "batch_no",
        "批次号": "batch_no",
    }

    data = {}
    for k, v in item.items():
        if v is None:
            continue
        if k in key_mapping:
            data[key_mapping[k]] = v

    if "plan_no" not in data or not data["plan_no"]:
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


def import_plans_from_json(db: Session, json_content: bytes, source_file: str, batch_no: Optional[str] = None) -> ImportResult:
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
        if "plans" in data and isinstance(data["plans"], list):
            items = data["plans"]
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
            normalized = _normalize_plan_data(item)
            if not normalized:
                result.errors.append(f"第{idx+1}条: 关键字段缺失或格式错误")
                continue

            existing = get_plan_by_no(db, normalized["plan_no"])
            if existing:
                result.skipped += 1
                continue

            if batch_no and "batch_no" not in normalized:
                normalized["batch_no"] = batch_no

            normalized["source_file"] = source_file
            plan_create = SkylightPlanCreate(**normalized)
            create_plan(db, plan_create)
            result.created += 1

        except Exception as e:
            result.errors.append(f"第{idx+1}条: {str(e)}")

    return result
