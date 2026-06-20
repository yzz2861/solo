import os
import pandas as pd
from datetime import datetime
from typing import List, Tuple
from .models import DefectRecord, ReinspectionRecord, TEAM_ALIASES


def _parse_date(value) -> datetime:
    if pd.isna(value) or value is None or str(value).strip() == "":
        return None
    if isinstance(value, datetime):
        return value
    for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S"]:
        try:
            return datetime.strptime(str(value).strip(), fmt)
        except ValueError:
            continue
    try:
        return pd.to_datetime(value).to_pydatetime()
    except Exception:
        return None


def _normalize_team(team_name: str) -> str:
    if not team_name:
        return "未指定"
    name = str(team_name).strip()
    return TEAM_ALIASES.get(name, name)


def _read_file(file_path: str) -> pd.DataFrame:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        return pd.read_csv(file_path, dtype=str)
    elif ext in [".xlsx", ".xls"]:
        return pd.read_excel(file_path, dtype=str)
    else:
        raise ValueError(f"不支持的文件格式: {ext}，请使用CSV或Excel文件")


def import_defect_records(file_path: str) -> List[DefectRecord]:
    df = _read_file(file_path)
    df.columns = [str(c).strip() for c in df.columns]

    col_map = {}
    for col in df.columns:
        col_lower = col.lower()
        if "批次" in col or "batch" in col_lower:
            col_map["batch_no"] = col
        elif "工序" in col or "process" in col_lower:
            col_map["process"] = col
        elif "不合格" in col or "缺陷" in col or "defect" in col_lower:
            col_map["defect_item"] = col
        elif "发现" in col or "记录日期" in col or ("日期" in col and "复检" not in col):
            col_map["defect_date"] = col
        elif "责任" in col or "班组" in col or "team" in col_lower:
            col_map["responsible_team"] = col
        elif "数量" in col or "qty" in col_lower or "数量" in col:
            col_map["quantity"] = col
        elif "状态" in col or "status" in col_lower:
            col_map["status"] = col
        elif "检验员" in col or "质检员" in col or "inspector" in col_lower:
            col_map["inspector"] = col
        elif "备注" in col or "remark" in col_lower:
            col_map["remark"] = col
        elif "编号" in col or "id" in col_lower:
            col_map["record_id"] = col

    records: List[DefectRecord] = []
    for idx, row in df.iterrows():
        batch_no = str(row.get(col_map.get("batch_no", ""), "")).strip()
        if not batch_no:
            continue
        process = str(row.get(col_map.get("process", ""), "")).strip() or "未指定"
        defect_item = str(row.get(col_map.get("defect_item", ""), "")).strip() or "未指定"
        defect_date = _parse_date(row.get(col_map.get("defect_date", "")))
        team_raw = str(row.get(col_map.get("responsible_team", ""), "")).strip()
        team = _normalize_team(team_raw)
        try:
            qty = int(float(str(row.get(col_map.get("quantity", ""), "1")).strip() or "1"))
        except ValueError:
            qty = 1
        status = str(row.get(col_map.get("status", ""), "")).strip() or "待复检"
        inspector = str(row.get(col_map.get("inspector", ""), "")).strip()
        remark = str(row.get(col_map.get("remark", ""), "")).strip()
        record_id = str(row.get(col_map.get("record_id", ""), "")).strip() or f"DEF-{idx+1}"

        records.append(DefectRecord(
            batch_no=batch_no,
            process=process,
            defect_item=defect_item,
            defect_date=defect_date,
            responsible_team=team,
            raw_responsible_team=team_raw,
            quantity=qty,
            status=status,
            inspector=inspector,
            remark=remark,
            record_id=record_id,
        ))
    return records


def import_reinspection_records(file_path: str) -> List[ReinspectionRecord]:
    df = _read_file(file_path)
    df.columns = [str(c).strip() for c in df.columns]

    col_map = {}
    for col in df.columns:
        col_lower = col.lower()
        if "批次" in col or "batch" in col_lower:
            col_map["batch_no"] = col
        elif "复检日期" in col or "复查日期" in col:
            col_map["reinspection_date"] = col
        elif "结果" in col or "result" in col_lower:
            col_map["result"] = col
        elif "复检人" in col or "复查人" in col or "reinspector" in col_lower:
            col_map["reinspector"] = col
        elif "审批" in col or "让步" in col:
            col_map["is_concession_approved"] = col
        elif "返工次数" in col or "次数" in col:
            col_map["rework_count"] = col
        elif "备注" in col or "remark" in col_lower:
            col_map["remark"] = col

    records: List[ReinspectionRecord] = []
    for _, row in df.iterrows():
        batch_no = str(row.get(col_map.get("batch_no", ""), "")).strip()
        if not batch_no:
            continue
        reinspection_date = _parse_date(row.get(col_map.get("reinspection_date", "")))
        result = str(row.get(col_map.get("result", ""), "")).strip()

        approval_raw = str(row.get(col_map.get("is_concession_approved", ""), "")).strip()
        is_concession_approved = None
        if approval_raw:
            if approval_raw in ["是", "已审批", "通过", "Y", "y", "YES", "yes", "true", "True"]:
                is_concession_approved = True
            elif approval_raw in ["否", "未审批", "不通过", "N", "n", "NO", "no", "false", "False"]:
                is_concession_approved = False

        try:
            rework_count = int(float(str(row.get(col_map.get("rework_count", ""), "1")).strip() or "1"))
        except ValueError:
            rework_count = 1

        reinspector = str(row.get(col_map.get("reinspector", ""), "")).strip()
        remark = str(row.get(col_map.get("remark", ""), "")).strip()

        records.append(ReinspectionRecord(
            batch_no=batch_no,
            reinspection_date=reinspection_date,
            result=result,
            reinspector=reinspector,
            is_concession_approved=is_concession_approved,
            rework_count=rework_count,
            remark=remark,
        ))
    return records


def import_data(defect_file: str, reinspection_file: str) -> Tuple[List[DefectRecord], List[ReinspectionRecord]]:
    defects = import_defect_records(defect_file)
    reinspections = import_reinspection_records(reinspection_file)
    return defects, reinspections
