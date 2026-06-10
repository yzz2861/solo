import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from .utils import format_dt, format_date, get_time_period, get_noise_standard


def _aggregate_decibel_by_group(decibel_df: pd.DataFrame, group_cols: List[str]) -> pd.DataFrame:
    if decibel_df.empty:
        return pd.DataFrame()
    
    agg_dict = {
        "db_value": ["count", "mean", "max", "min", "std"],
        "is_over_standard": ["sum", "mean"],
        "over_threshold": ["max", "mean"],
        "is_missing": ["sum"],
    }
    
    grouped = decibel_df.groupby(group_cols).agg(agg_dict).round(2)
    grouped.columns = ["_".join(col).strip() for col in grouped.columns.values]
    grouped = grouped.reset_index()
    
    grouped = grouped.rename(columns={
        "db_value_count": "decibel_record_count",
        "db_value_mean": "avg_db",
        "db_value_max": "max_db",
        "db_value_min": "min_db",
        "db_value_std": "std_db",
        "is_over_standard_sum": "over_standard_count",
        "is_over_standard_mean": "over_standard_rate",
        "over_threshold_max": "max_over_threshold",
        "over_threshold_mean": "avg_over_threshold",
        "is_missing_sum": "missing_count",
    })
    
    grouped["over_standard_rate"] = (grouped["over_standard_rate"] * 100).round(1)
    
    return grouped


def _aggregate_complaint_by_group(complaint_df: pd.DataFrame, group_cols: List[str]) -> pd.DataFrame:
    if complaint_df.empty:
        return pd.DataFrame()
    
    unique_complaints = complaint_df[~complaint_df["is_duplicate"]].copy()
    
    agg_dict = {
        "phone_number": ["nunique"],
        "is_duplicate": ["sum"],
    }
    
    if "noise_type" in unique_complaints.columns:
        agg_dict["noise_type"] = ["nunique", lambda x: ",".join(sorted(set(x.dropna().astype(str))))]
    
    grouped = unique_complaints.groupby(group_cols).agg(agg_dict)
    grouped.columns = ["_".join(col).strip() for col in grouped.columns.values]
    grouped = grouped.reset_index()
    
    grouped = grouped.rename(columns={
        "phone_number_nunique": "unique_complainant_count",
        "is_duplicate_sum": "duplicate_complaint_count",
        "noise_type_nunique": "noise_type_count",
        "noise_type_<lambda>": "noise_types",
    })
    
    grouped["total_complaint_count"] = grouped["unique_complainant_count"] + grouped["duplicate_complaint_count"]
    
    return grouped


def _aggregate_enforcement_by_group(enforcement_df: pd.DataFrame, group_cols: List[str]) -> pd.DataFrame:
    if enforcement_df.empty:
        return pd.DataFrame()
    
    agg_dict = {
        "case_id": ["nunique"] if "case_id" in enforcement_df.columns else None,
        "closed": ["sum", lambda x: (~x).sum()],
    }
    
    if "noise_type" in enforcement_df.columns:
        agg_dict["noise_type"] = ["nunique", lambda x: ",".join(sorted(set(x.dropna().astype(str))))]
    
    if "action" in enforcement_df.columns:
        agg_dict["action"] = [lambda x: ",".join(sorted(set(x.dropna().astype(str))))]
    
    agg_dict = {k: v for k, v in agg_dict.items() if v is not None}
    
    grouped = enforcement_df.groupby(group_cols).agg(agg_dict)
    grouped.columns = ["_".join(col).strip() for col in grouped.columns.values]
    grouped = grouped.reset_index()
    
    rename_map = {}
    if "case_id_nunique" in grouped.columns:
        rename_map["case_id_nunique"] = "enforcement_case_count"
    rename_map["closed_sum"] = "closed_case_count"
    rename_map["closed_<lambda>"] = "unclosed_case_count"
    if "noise_type_nunique" in grouped.columns:
        rename_map["noise_type_nunique"] = "enforcement_noise_type_count"
    if "noise_type_<lambda>" in grouped.columns:
        rename_map["noise_type_<lambda>"] = "enforcement_noise_types"
    if "action_<lambda>" in grouped.columns:
        rename_map["action_<lambda>"] = "enforcement_actions"
    
    grouped = grouped.rename(columns=rename_map)
    
    return grouped


def merge_by_community(
    decibel_df: Optional[pd.DataFrame] = None,
    complaint_df: Optional[pd.DataFrame] = None,
    enforcement_df: Optional[pd.DataFrame] = None,
    analysis_date: Optional[str] = None,
) -> pd.DataFrame:
    group_cols = ["analysis_date", "community"]
    
    decibel_agg = pd.DataFrame()
    complaint_agg = pd.DataFrame()
    enforcement_agg = pd.DataFrame()
    
    if decibel_df is not None and not decibel_df.empty:
        if analysis_date:
            decibel_df = decibel_df[decibel_df["analysis_date"].astype(str) == analysis_date]
        decibel_agg = _aggregate_decibel_by_group(decibel_df, group_cols)
    
    if complaint_df is not None and not complaint_df.empty:
        if analysis_date:
            complaint_df = complaint_df[complaint_df["analysis_date"].astype(str) == analysis_date]
        complaint_agg = _aggregate_complaint_by_group(complaint_df, group_cols)
    
    if enforcement_df is not None and not enforcement_df.empty:
        if analysis_date:
            enforcement_df = enforcement_df[enforcement_df["analysis_date"].astype(str) == analysis_date]
        enforcement_agg = _aggregate_enforcement_by_group(enforcement_df, group_cols)
    
    merged = _merge_dataframes([decibel_agg, complaint_agg, enforcement_agg], group_cols)
    
    merged = _fill_merged_nas(merged)
    
    return merged


def merge_by_time_period(
    decibel_df: Optional[pd.DataFrame] = None,
    complaint_df: Optional[pd.DataFrame] = None,
    enforcement_df: Optional[pd.DataFrame] = None,
    analysis_date: Optional[str] = None,
) -> pd.DataFrame:
    group_cols = ["analysis_date", "time_period"]
    
    decibel_agg = pd.DataFrame()
    complaint_agg = pd.DataFrame()
    enforcement_agg = pd.DataFrame()
    
    if decibel_df is not None and not decibel_df.empty:
        if analysis_date:
            decibel_df = decibel_df[decibel_df["analysis_date"].astype(str) == analysis_date]
        decibel_agg = _aggregate_decibel_by_group(decibel_df, group_cols)
    
    if complaint_df is not None and not complaint_df.empty:
        if analysis_date:
            complaint_df = complaint_df[complaint_df["analysis_date"].astype(str) == analysis_date]
        complaint_agg = _aggregate_complaint_by_group(complaint_df, group_cols)
    
    if enforcement_df is not None and not enforcement_df.empty:
        if analysis_date:
            enforcement_df = enforcement_df[enforcement_df["analysis_date"].astype(str) == analysis_date]
        enforcement_agg = _aggregate_enforcement_by_group(enforcement_df, group_cols)
    
    merged = _merge_dataframes([decibel_agg, complaint_agg, enforcement_agg], group_cols)
    
    merged = _fill_merged_nas(merged)
    
    period_order = ["晚间(18-22点)", "夜间(22-24点)", "凌晨(0-6点)", "早间(6-8点)", "日间"]
    if "time_period" in merged.columns:
        merged["time_period"] = pd.Categorical(merged["time_period"], categories=period_order, ordered=True)
        merged = merged.sort_values(group_cols).reset_index(drop=True)
    
    return merged


def merge_by_street(
    decibel_df: Optional[pd.DataFrame] = None,
    complaint_df: Optional[pd.DataFrame] = None,
    enforcement_df: Optional[pd.DataFrame] = None,
    analysis_date: Optional[str] = None,
) -> pd.DataFrame:
    group_cols = ["analysis_date", "street"]
    
    decibel_agg = pd.DataFrame()
    complaint_agg = pd.DataFrame()
    enforcement_agg = pd.DataFrame()
    
    if decibel_df is not None and not decibel_df.empty:
        if analysis_date:
            decibel_df = decibel_df[decibel_df["analysis_date"].astype(str) == analysis_date]
        decibel_agg = _aggregate_decibel_by_group(decibel_df, group_cols)
    
    if complaint_df is not None and not complaint_df.empty:
        if analysis_date:
            complaint_df = complaint_df[complaint_df["analysis_date"].astype(str) == analysis_date]
        complaint_agg = _aggregate_complaint_by_group(complaint_df, group_cols)
    
    if enforcement_df is not None and not enforcement_df.empty:
        if analysis_date:
            enforcement_df = enforcement_df[enforcement_df["analysis_date"].astype(str) == analysis_date]
        enforcement_agg = _aggregate_enforcement_by_group(enforcement_df, group_cols)
    
    merged = _merge_dataframes([decibel_agg, complaint_agg, enforcement_agg], group_cols)
    
    merged = _fill_merged_nas(merged)
    
    return merged


def merge_by_location_and_period(
    decibel_df: Optional[pd.DataFrame] = None,
    complaint_df: Optional[pd.DataFrame] = None,
    enforcement_df: Optional[pd.DataFrame] = None,
    analysis_date: Optional[str] = None,
) -> pd.DataFrame:
    group_cols = ["analysis_date", "normalized_address", "community", "street", "time_period"]
    
    decibel_agg = pd.DataFrame()
    complaint_agg = pd.DataFrame()
    enforcement_agg = pd.DataFrame()
    
    if decibel_df is not None and not decibel_df.empty:
        if analysis_date:
            decibel_df = decibel_df[decibel_df["analysis_date"].astype(str) == analysis_date]
        decibel_agg = _aggregate_decibel_by_group(decibel_df, group_cols)
    
    if complaint_df is not None and not complaint_df.empty:
        if analysis_date:
            complaint_df = complaint_df[complaint_df["analysis_date"].astype(str) == analysis_date]
        complaint_agg = _aggregate_complaint_by_group(complaint_df, group_cols)
    
    if enforcement_df is not None and not enforcement_df.empty:
        if analysis_date:
            enforcement_df = enforcement_df[enforcement_df["analysis_date"].astype(str) == analysis_date]
        enforcement_agg = _aggregate_enforcement_by_group(enforcement_df, group_cols)
    
    merged = _merge_dataframes([decibel_agg, complaint_agg, enforcement_agg], group_cols)
    
    merged = _fill_merged_nas(merged)
    
    return merged


def _merge_dataframes(dataframes: List[pd.DataFrame], group_cols: List[str]) -> pd.DataFrame:
    dataframes = [df for df in dataframes if not df.empty]
    
    if not dataframes:
        return pd.DataFrame(columns=group_cols)
    
    result = dataframes[0]
    for df in dataframes[1:]:
        result = result.merge(df, on=group_cols, how="outer")
    
    return result


def _fill_merged_nas(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    numeric_cols = [
        "decibel_record_count", "avg_db", "max_db", "min_db", "std_db",
        "over_standard_count", "over_standard_rate", "max_over_threshold",
        "avg_over_threshold", "missing_count",
        "unique_complainant_count", "duplicate_complaint_count",
        "total_complaint_count", "noise_type_count",
        "enforcement_case_count", "closed_case_count", "unclosed_case_count",
        "enforcement_noise_type_count",
    ]
    
    for col in numeric_cols:
        if col in df.columns:
            df[col] = df[col].fillna(0)
    
    string_cols = ["noise_types", "enforcement_noise_types", "enforcement_actions"]
    for col in string_cols:
        if col in df.columns:
            df[col] = df[col].fillna("")
    
    return df


def merge_all(
    cleaned_data: Dict[str, pd.DataFrame],
    analysis_date: Optional[str] = None,
) -> Dict[str, pd.DataFrame]:
    decibel_df = cleaned_data.get("decibel")
    complaint_df = cleaned_data.get("complaint")
    enforcement_df = cleaned_data.get("enforcement")
    
    return {
        "by_community": merge_by_community(decibel_df, complaint_df, enforcement_df, analysis_date),
        "by_time_period": merge_by_time_period(decibel_df, complaint_df, enforcement_df, analysis_date),
        "by_street": merge_by_street(decibel_df, complaint_df, enforcement_df, analysis_date),
        "by_location_period": merge_by_location_and_period(
            decibel_df, complaint_df, enforcement_df, analysis_date
        ),
    }


def get_merge_summary(merged_data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    summary = []
    for name, df in merged_data.items():
        summary.append({
            "合并维度": name,
            "记录数": len(df),
            "字段数": len(df.columns),
        })
    return pd.DataFrame(summary)
