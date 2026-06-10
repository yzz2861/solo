import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Optional, List
import os
from .utils import ensure_dir


DECIBEL_COLUMN_MAPPING = {
    "时间": "record_time",
    "监测时间": "record_time",
    "datetime": "record_time",
    "time": "record_time",
    "地点": "location",
    "监测点": "location",
    "点位": "location",
    "location": "location",
    "地址": "address",
    "address": "address",
    "分贝值": "db_value",
    "噪声值": "db_value",
    "LAeq": "db_value",
    "db": "db_value",
    "dB": "db_value",
    "仪器编号": "device_id",
    "设备编号": "device_id",
    "device_id": "device_id",
    "天气": "weather",
    "风向": "wind_direction",
    "风速": "wind_speed",
}

COMPLAINT_COLUMN_MAPPING = {
    "来电时间": "call_time",
    "投诉时间": "call_time",
    "时间": "call_time",
    "datetime": "call_time",
    "来电号码": "phone_number",
    "投诉人电话": "phone_number",
    "phone": "phone_number",
    "phone_number": "phone_number",
    "投诉人": "complainant",
    "姓名": "complainant",
    "name": "complainant",
    "投诉地址": "address",
    "事发地址": "address",
    "地址": "address",
    "address": "address",
    "投诉内容": "content",
    "内容": "content",
    "description": "content",
    "噪声类型": "noise_type",
    "噪声来源": "noise_source",
    "来源": "noise_source",
    "type": "noise_type",
    "处理状态": "status",
    "状态": "status",
    "是否处理": "status",
}

ENFORCEMENT_COLUMN_MAPPING = {
    "登记时间": "register_time",
    "处理时间": "process_time",
    "时间": "register_time",
    "datetime": "register_time",
    "执法编号": "case_id",
    "案件编号": "case_id",
    "id": "case_id",
    "事发地点": "address",
    "地址": "address",
    "location": "address",
    "噪声类型": "noise_type",
    "类型": "noise_type",
    "type": "noise_type",
    "当事人": "party",
    "相对人": "party",
    "处理措施": "action",
    "处理方式": "action",
    "处理结果": "result",
    "结果": "result",
    "处理人员": "officer",
    "执法人员": "officer",
    "是否闭环": "closed",
    "闭环状态": "closed",
    "处理状态": "status",
    "备注": "remark",
    "处理备注": "remark",
}

NOISE_TYPE_MAPPING = {
    "广场舞": "广场舞",
    "跳舞": "广场舞",
    "音响": "广场舞",
    "施工": "施工",
    "工地": "施工",
    "装修": "施工",
    "夜宵": "夜宵摊",
    "大排档": "夜宵摊",
    "烧烤": "夜宵摊",
    "摆摊": "夜宵摊",
    "交通": "交通",
    "车辆": "交通",
    "商业": "商业",
    "生活": "生活",
    "其他": "其他",
}


def _read_file(file_path: str) -> pd.DataFrame:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")
    
    ext = os.path.splitext(file_path)[1].lower()
    if ext in [".csv"]:
        try:
            return pd.read_csv(file_path, encoding="utf-8")
        except UnicodeDecodeError:
            return pd.read_csv(file_path, encoding="gbk")
    elif ext in [".xlsx", ".xls"]:
        return pd.read_excel(file_path)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def _map_columns(df: pd.DataFrame, mapping: Dict[str, str]) -> pd.DataFrame:
    renamed = {}
    for col in df.columns:
        col_clean = col.strip()
        if col_clean in mapping:
            renamed[col] = mapping[col_clean]
        elif col_clean.lower() in mapping:
            renamed[col] = mapping[col_clean.lower()]
    
    if renamed:
        df = df.rename(columns=renamed)
    
    return df


def _parse_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def _parse_db_value(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _normalize_noise_type(series: pd.Series) -> pd.Series:
    def map_type(val):
        if pd.isna(val):
            return "未分类"
        val_str = str(val).strip()
        for key, mapped in NOISE_TYPE_MAPPING.items():
            if key in val_str:
                return mapped
        return val_str if val_str else "未分类"
    
    return series.apply(map_type)


def import_decibel_data(file_path: str) -> pd.DataFrame:
    df = _read_file(file_path)
    df = _map_columns(df, DECIBEL_COLUMN_MAPPING)
    
    required_cols = ["record_time", "db_value"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"分贝数据缺少必要列: {col}")
    
    df["record_time"] = _parse_datetime(df["record_time"])
    df["db_value"] = _parse_db_value(df["db_value"])
    
    if "location" not in df.columns:
        df["location"] = df.get("address", "")
    
    df["data_source"] = "decibel_meter"
    df["import_time"] = datetime.now()
    
    missing_mask = df["record_time"].isna() | df["db_value"].isna()
    df["is_missing"] = missing_mask
    
    return df


def import_complaint_data(file_path: str) -> pd.DataFrame:
    df = _read_file(file_path)
    df = _map_columns(df, COMPLAINT_COLUMN_MAPPING)
    
    required_cols = ["call_time", "address"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"投诉数据缺少必要列: {col}")
    
    df["call_time"] = _parse_datetime(df["call_time"])
    
    if "phone_number" in df.columns:
        df["phone_number"] = df["phone_number"].astype(str).str.strip()
    
    if "noise_type" in df.columns:
        df["noise_type"] = _normalize_noise_type(df["noise_type"])
    else:
        df["noise_type"] = "未分类"
    
    df["data_source"] = "complaint"
    df["import_time"] = datetime.now()
    
    return df


def import_enforcement_data(file_path: str) -> pd.DataFrame:
    df = _read_file(file_path)
    df = _map_columns(df, ENFORCEMENT_COLUMN_MAPPING)
    
    required_cols = ["register_time", "address"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"执法数据缺少必要列: {col}")
    
    df["register_time"] = _parse_datetime(df["register_time"])
    
    if "process_time" in df.columns:
        df["process_time"] = _parse_datetime(df["process_time"])
    
    if "noise_type" in df.columns:
        df["noise_type"] = _normalize_noise_type(df["noise_type"])
    
    if "closed" not in df.columns and "status" in df.columns:
        df["closed"] = df["status"].astype(str).str.contains(
            r"闭环|完成|结案|已处理", case=False, na=False
        )
    elif "closed" not in df.columns:
        df["closed"] = False
    else:
        closed_str = df["closed"].astype(str)
        df["closed"] = closed_str.str.contains(
            r"是|true|yes|闭环|完成|结案|已处理", case=False, na=False
        )
    
    df["data_source"] = "enforcement"
    df["import_time"] = datetime.now()
    
    return df


def import_all_data(
    decibel_path: Optional[str] = None,
    complaint_path: Optional[str] = None,
    enforcement_path: Optional[str] = None,
) -> Dict[str, pd.DataFrame]:
    result = {}
    
    if decibel_path:
        result["decibel"] = import_decibel_data(decibel_path)
    
    if complaint_path:
        result["complaint"] = import_complaint_data(complaint_path)
    
    if enforcement_path:
        result["enforcement"] = import_enforcement_data(enforcement_path)
    
    return result


def get_data_summary(data_dict: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    summary = []
    for name, df in data_dict.items():
        summary.append({
            "数据源": name,
            "记录数": len(df),
            "时间范围": f"{df.iloc[:, 0].min()} ~ {df.iloc[:, 0].max()}" if len(df) > 0 else "无数据",
            "字段数": len(df.columns),
        })
    return pd.DataFrame(summary)
