from sqlalchemy.orm import Session
from datetime import datetime
import pandas as pd
import io
from models import ConstructionApplication
from schemas import ConstructionApplicationCreate, ConstructionApplicationUpdate, ImportResult
from typing import List, Optional


def get_application(db: Session, app_id: int) -> Optional[ConstructionApplication]:
    return db.query(ConstructionApplication).filter(ConstructionApplication.id == app_id).first()


def get_application_by_no(db: Session, application_no: str) -> Optional[ConstructionApplication]:
    return db.query(ConstructionApplication).filter(ConstructionApplication.application_no == application_no).first()


def get_applications(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    line_name: Optional[str] = None,
    status: Optional[str] = None,
    batch_no: Optional[str] = None,
) -> List[ConstructionApplication]:
    query = db.query(ConstructionApplication)
    if line_name:
        query = query.filter(ConstructionApplication.line_name == line_name)
    if status:
        query = query.filter(ConstructionApplication.status == status)
    if batch_no:
        query = query.filter(ConstructionApplication.batch_no == batch_no)
    return query.offset(skip).limit(limit).all()


def create_application(db: Session, app: ConstructionApplicationCreate) -> ConstructionApplication:
    now = datetime.now()
    db_app = ConstructionApplication(**app.model_dump(), created_at=now, updated_at=now)
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app


def update_application(db: Session, app_id: int, app_update: ConstructionApplicationUpdate) -> Optional[ConstructionApplication]:
    db_app = get_application(db, app_id)
    if not db_app:
        return None
    update_data = app_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    for key, value in update_data.items():
        setattr(db_app, key, value)
    db.commit()
    db.refresh(db_app)
    return db_app


def delete_application(db: Session, app_id: int) -> bool:
    db_app = get_application(db, app_id)
    if not db_app:
        return False
    db.delete(db_app)
    db.commit()
    return True


def parse_km(km_str: str) -> float:
    if not km_str:
        return 0.0
    km_str = str(km_str).strip().replace("km", "").replace("KM", "").replace("+", ".").replace("K", "")
    try:
        return float(km_str)
    except ValueError:
        return 0.0


def parse_datetime(dt_str: str) -> Optional[datetime]:
    if not dt_str:
        return None
    dt_str = str(dt_str).strip()
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    return None


def import_applications_from_csv(db: Session, csv_content: bytes, source_file: str, batch_no: Optional[str] = None) -> ImportResult:
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
        "申请编号": "application_no",
        "施工申请编号": "application_no",
        "线路名称": "line_name",
        "线路": "line_name",
        "区段": "section",
        "施工区段": "section",
        "起始公里": "start_km",
        "开始公里": "start_km",
        "起点公里": "start_km",
        "起始里程": "start_km",
        "结束公里": "end_km",
        "终点公里": "end_km",
        "结束里程": "end_km",
        "施工类型": "construction_type",
        "施工内容": "construction_content",
        "开始时间": "start_time",
        "施工开始时间": "start_time",
        "结束时间": "end_time",
        "施工结束时间": "end_time",
        "施工负责人": "responsible_person",
        "负责人": "responsible_person",
        "联系电话": "phone",
        "电话": "phone",
        "状态": "status",
        "审批状态": "status",
        "批次号": "batch_no",
    }

    for idx, row in df.iterrows():
        result.total += 1
        try:
            data = {}
            for col_cn, col_en in col_map.items():
                if col_cn in df.columns and pd.notna(row[col_cn]):
                    data[col_en] = str(row[col_cn]).strip()

            if "application_no" not in data or not data["application_no"]:
                result.errors.append(f"第{idx+2}行: 缺少申请编号")
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

            existing = get_application_by_no(db, data["application_no"])
            if existing:
                result.skipped += 1
                continue

            if batch_no and "batch_no" not in data:
                data["batch_no"] = batch_no

            data["source_file"] = source_file
            app_create = ConstructionApplicationCreate(**data)
            create_application(db, app_create)
            result.created += 1

        except Exception as e:
            result.errors.append(f"第{idx+2}行: {str(e)}")

    return result
