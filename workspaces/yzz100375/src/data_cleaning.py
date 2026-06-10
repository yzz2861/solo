import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from .utils import (
    normalize_address,
    extract_community,
    extract_street,
    handle_cross_midnight,
    get_time_period,
    get_noise_standard,
    is_weekend,
    format_dt,
    format_date,
)


def clean_decibel_data(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    
    df = df.copy()
    
    missing_count = df["is_missing"].sum()
    if missing_count > 0:
        print(f"警告: 分贝数据中有 {missing_count} 条记录存在时间或数值缺失")
    
    df = df[~df["is_missing"]].copy()
    
    df = df.sort_values("record_time").reset_index(drop=True)
    
    df["normalized_address"] = df.get("address", df.get("location", "")).apply(normalize_address)
    df["community"] = df["normalized_address"].apply(extract_community)
    df["street"] = df["normalized_address"].apply(extract_street)
    
    df["hour"] = df["record_time"].dt.hour
    df["date"] = df["record_time"].dt.date
    df["time_period"] = df["hour"].apply(get_time_period)
    df["noise_standard"] = df["hour"].apply(get_noise_standard)
    df["is_over_standard"] = df["db_value"] > df["noise_standard"]
    df["over_threshold"] = df["db_value"] - df["noise_standard"]
    df["is_weekend"] = df["record_time"].apply(is_weekend)
    
    df = _fill_missing_decibel(df)
    
    df["hour"] = df["record_time"].dt.hour
    df["date"] = df["record_time"].dt.date
    df["time_period"] = df["hour"].apply(get_time_period)
    df["noise_standard"] = df["hour"].apply(get_noise_standard)
    df["is_over_standard"] = df["db_value"] > df["noise_standard"]
    df["over_threshold"] = df["db_value"] - df["noise_standard"]
    df["is_weekend"] = df["record_time"].apply(is_weekend)
    df["analysis_date"] = df["record_time"].apply(_get_analysis_date)
    
    return df


def _fill_missing_decibel(df: pd.DataFrame, gap_minutes: int = 30) -> pd.DataFrame:
    if df.empty:
        return df
    
    df = df.copy()
    locations = df["normalized_address"].unique()
    
    filled_records = []
    
    for loc in locations:
        loc_df = df[df["normalized_address"] == loc].sort_values("record_time").reset_index(drop=True).copy()
        
        if len(loc_df) < 2:
            filled_records.append(loc_df)
            continue
        
        time_diff = loc_df["record_time"].diff()
        gaps = time_diff > timedelta(minutes=gap_minutes)
        
        if gaps.any():
            gap_positions = gaps[gaps].index.tolist()
            
            for pos in gap_positions:
                if pos == 0:
                    continue
                prev_pos = pos - 1
                prev_time = loc_df.iloc[prev_pos]["record_time"]
                curr_time = loc_df.iloc[pos]["record_time"]
                
                if pd.notna(prev_time) and pd.notna(curr_time):
                    gap_duration = (curr_time - prev_time).total_seconds() / 60
                    
                    if gap_duration > gap_minutes * 2:
                        num_points = int(gap_duration / gap_minutes)
                        for i in range(1, num_points):
                            interp_time = prev_time + timedelta(minutes=i * gap_minutes)
                            interp_db = np.nan
                            
                            filled_records.append(pd.DataFrame([{
                                "record_time": interp_time,
                                "db_value": interp_db,
                                "normalized_address": loc,
                                "community": loc_df.iloc[0]["community"],
                                "street": loc_df.iloc[0]["street"],
                                "is_interpolated": True,
                                "is_missing": True,
                                "data_source": "decibel_meter",
                            }]))
        
        filled_records.append(loc_df)
    
    if filled_records:
        result = pd.concat(filled_records, ignore_index=True)
        result = result.sort_values("record_time").reset_index(drop=True)
        
        if "is_interpolated" not in result.columns:
            result["is_interpolated"] = False
        
        result["is_interpolated"] = result["is_interpolated"].apply(
            lambda x: False if (x is None or (isinstance(x, float) and np.isnan(x))) else bool(x)
        )
        
        return result
    else:
        df["is_interpolated"] = False
        return df


def _get_analysis_date(dt: datetime) -> datetime.date:
    if dt.hour < 6:
        return (dt - timedelta(days=1)).date()
    return dt.date()


def clean_complaint_data(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    
    df = df.copy()
    
    df = df[df["call_time"].notna()].copy()
    df = df[df["address"].notna()].copy()
    
    df = df.sort_values("call_time").reset_index(drop=True)
    
    df["normalized_address"] = df["address"].apply(normalize_address)
    df["community"] = df["normalized_address"].apply(extract_community)
    df["street"] = df["normalized_address"].apply(extract_street)
    
    df["hour"] = df["call_time"].dt.hour
    df["date"] = df["call_time"].dt.date
    df["time_period"] = df["hour"].apply(get_time_period)
    df["is_weekend"] = df["call_time"].apply(is_weekend)
    
    df = _mark_duplicate_complaints(df)
    
    df["analysis_date"] = df["call_time"].apply(_get_analysis_date)
    
    return df


def _mark_duplicate_complaints(df: pd.DataFrame, time_window_hours: int = 2) -> pd.DataFrame:
    if df.empty:
        return df
    
    df = df.copy()
    df["is_duplicate"] = False
    df["duplicate_group_id"] = None
    
    if "phone_number" in df.columns:
        has_phone = df["phone_number"].notna() & (df["phone_number"] != "")
        phone_df = df[has_phone].copy()
        
        if not phone_df.empty:
            phone_df = phone_df.sort_values(["phone_number", "call_time"])
            
            for phone, group in phone_df.groupby("phone_number"):
                if len(group) > 1:
                    group = group.sort_values("call_time")
                    times = group["call_time"].values
                    addresses = group["normalized_address"].values
                    
                    group_id = f"{phone}_{group.iloc[0]['call_time'].strftime('%Y%m%d')}"
                    
                    for i in range(1, len(group)):
                        time_diff = (times[i] - times[i-1]).astype('timedelta64[h]').astype(float)
                        same_addr = addresses[i] == addresses[i-1]
                        
                        if time_diff < time_window_hours and same_addr:
                            idx = group.index[i]
                            df.loc[idx, "is_duplicate"] = True
                            df.loc[idx, "duplicate_group_id"] = group_id
                            
                            first_idx = group.index[0]
                            if df.loc[first_idx, "duplicate_group_id"] is None:
                                df.loc[first_idx, "duplicate_group_id"] = group_id
    
    df["duplicate_count"] = df.groupby("duplicate_group_id")["duplicate_group_id"].transform("count")
    df["duplicate_count"] = df["duplicate_count"].fillna(0).astype(int)
    
    return df


def clean_enforcement_data(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    
    df = df.copy()
    
    df = df[df["register_time"].notna()].copy()
    df = df[df["address"].notna()].copy()
    
    df = df.sort_values("register_time").reset_index(drop=True)
    
    df["normalized_address"] = df["address"].apply(normalize_address)
    df["community"] = df["normalized_address"].apply(extract_community)
    df["street"] = df["normalized_address"].apply(extract_street)
    
    df["hour"] = df["register_time"].dt.hour
    df["date"] = df["register_time"].dt.date
    df["time_period"] = df["hour"].apply(get_time_period)
    df["is_weekend"] = df["register_time"].apply(is_weekend)
    
    df["analysis_date"] = df["register_time"].apply(_get_analysis_date)
    
    if "process_time" in df.columns:
        df["process_duration_hours"] = (
            (df["process_time"] - df["register_time"]).dt.total_seconds() / 3600
        ).round(2)
    
    return df


def clean_all_data(
    decibel_df: Optional[pd.DataFrame] = None,
    complaint_df: Optional[pd.DataFrame] = None,
    enforcement_df: Optional[pd.DataFrame] = None,
) -> Dict[str, pd.DataFrame]:
    result = {}
    
    if decibel_df is not None and not decibel_df.empty:
        result["decibel"] = clean_decibel_data(decibel_df)
    
    if complaint_df is not None and not complaint_df.empty:
        result["complaint"] = clean_complaint_data(complaint_df)
    
    if enforcement_df is not None and not enforcement_df.empty:
        result["enforcement"] = clean_enforcement_data(enforcement_df)
    
    return result


def get_cleaning_report(cleaned_data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    report = []
    
    for name, df in cleaned_data.items():
        if df.empty:
            continue
        
        valid_dates = df["date"].dropna()
        
        info = {
            "数据源": name,
            "清洗后记录数": len(df),
            "涉及小区数": df["community"].nunique() if "community" in df.columns else 0,
            "涉及路段数": df["street"].nunique() if "street" in df.columns else 0,
            "时间范围": f"{format_date(valid_dates.min())} ~ {format_date(valid_dates.max())}" if len(valid_dates) > 0 else "无有效日期",
        }
        
        if name == "decibel":
            info["缺失值记录"] = int(df["is_missing"].sum()) if "is_missing" in df.columns else 0
            info["超标记录数"] = int(df["is_over_standard"].sum()) if "is_over_standard" in df.columns else 0
            info["周末记录数"] = int(df["is_weekend"].sum()) if "is_weekend" in df.columns else 0
        
        if name == "complaint":
            info["重复投诉数"] = int(df["is_duplicate"].sum()) if "is_duplicate" in df.columns else 0
            info["涉及投诉人数"] = df["phone_number"].nunique() if "phone_number" in df.columns else 0
            info["周末投诉数"] = int(df["is_weekend"].sum()) if "is_weekend" in df.columns else 0
        
        if name == "enforcement":
            info["未闭环数"] = int((~df["closed"]).sum()) if "closed" in df.columns else 0
            info["周末执法数"] = int(df["is_weekend"].sum()) if "is_weekend" in df.columns else 0
        
        report.append(info)
    
    return pd.DataFrame(report)
