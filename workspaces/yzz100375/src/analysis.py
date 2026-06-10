import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from .utils import format_dt, format_date


def find_over_standard_no_complaint(
    merged_data: pd.DataFrame,
    min_over_rate: float = 30.0,
    min_records: int = 5,
) -> pd.DataFrame:
    if merged_data.empty:
        return pd.DataFrame()
    
    df = merged_data.copy()
    
    mask = (
        (df["over_standard_rate"] >= min_over_rate) &
        (df["decibel_record_count"] >= min_records) &
        (df["total_complaint_count"] == 0)
    )
    
    result = df[mask].copy()
    
    if result.empty:
        return result
    
    result = result.sort_values("over_standard_rate", ascending=False).reset_index(drop=True)
    
    result["issue_type"] = "超标无投诉"
    result["severity"] = pd.cut(
        result["over_standard_rate"],
        bins=[0, 50, 80, 100],
        labels=["一般", "较重", "严重"],
        include_lowest=True,
    )
    
    cols = [
        "analysis_date", "normalized_address", "community", "street", "time_period",
        "avg_db", "max_db", "over_standard_rate", "max_over_threshold",
        "decibel_record_count", "total_complaint_count",
        "issue_type", "severity",
    ]
    cols = [c for c in cols if c in result.columns]
    
    return result[cols]


def find_high_complaint_normal_db(
    merged_data: pd.DataFrame,
    min_complaints: int = 3,
    max_over_rate: float = 10.0,
) -> pd.DataFrame:
    if merged_data.empty:
        return pd.DataFrame()
    
    df = merged_data.copy()
    
    has_db_data = df["decibel_record_count"] > 0
    
    mask = (
        (df["total_complaint_count"] >= min_complaints) &
        (df["over_standard_rate"] <= max_over_rate)
    )
    
    result = df[mask].copy()
    
    if result.empty:
        return result
    
    result = result.sort_values("total_complaint_count", ascending=False).reset_index(drop=True)
    
    result["issue_type"] = "投诉多仪器正常"
    result["has_instrument_data"] = has_db_data[mask].values
    result["severity"] = pd.cut(
        result["total_complaint_count"],
        bins=[0, 3, 5, 10, 100],
        labels=["一般", "较重", "严重", "特别严重"],
        include_lowest=True,
    )
    
    cols = [
        "analysis_date", "normalized_address", "community", "street", "time_period",
        "avg_db", "max_db", "over_standard_rate",
        "total_complaint_count", "unique_complainant_count",
        "noise_types", "has_instrument_data",
        "issue_type", "severity",
    ]
    cols = [c for c in cols if c in result.columns]
    
    return result[cols]


def find_recurrent_points(
    complaint_df: pd.DataFrame,
    decibel_df: Optional[pd.DataFrame] = None,
    min_occurrences: int = 3,
    days_window: int = 7,
) -> pd.DataFrame:
    if complaint_df.empty:
        return pd.DataFrame()
    
    df = complaint_df[~complaint_df["is_duplicate"]].copy()
    
    df["date"] = df["analysis_date"]
    
    recurrent = []
    
    for (normalized_address, time_period), group in df.groupby(["normalized_address", "time_period"]):
        if len(group) < min_occurrences:
            continue
        
        dates = sorted(group["date"].unique())
        date_spans = []
        current_span = [dates[0]]
        
        for i in range(1, len(dates)):
            if (dates[i] - dates[i-1]).days <= days_window:
                current_span.append(dates[i])
            else:
                if len(current_span) >= min_occurrences:
                    date_spans.append(current_span)
                current_span = [dates[i]]
        
        if len(current_span) >= min_occurrences:
            date_spans.append(current_span)
        
        if date_spans:
            for span in date_spans:
                span_df = group[group["date"].isin(span)]
                
                info = {
                    "analysis_date": group["analysis_date"].max(),
                    "normalized_address": normalized_address,
                    "community": group["community"].iloc[0],
                    "street": group["street"].iloc[0],
                    "time_period": time_period,
                    "first_occurrence": min(span),
                    "last_occurrence": max(span),
                    "occurrence_days": len(span),
                    "total_complaints": len(span_df),
                    "unique_complainants": span_df["phone_number"].nunique() if "phone_number" in span_df.columns else 0,
                    "noise_types": ",".join(sorted(set(span_df["noise_type"].dropna().astype(str)))),
                    "issue_type": "反复扰民点",
                    "severity": _get_recurrent_severity(len(span), len(span_df)),
                }
                
                if decibel_df is not None and not decibel_df.empty:
                    addr_mask = (
                        (decibel_df["normalized_address"] == normalized_address) &
                        (decibel_df["time_period"] == time_period) &
                        (decibel_df["analysis_date"].isin(span))
                    )
                    if addr_mask.any():
                        addr_db = decibel_df[addr_mask]
                        info["avg_db"] = round(addr_db["db_value"].mean(), 1)
                        info["max_db"] = round(addr_db["db_value"].max(), 1)
                        info["over_standard_rate"] = round(addr_db["is_over_standard"].mean() * 100, 1)
                    else:
                        info["avg_db"] = None
                        info["max_db"] = None
                        info["over_standard_rate"] = None
                
                recurrent.append(info)
    
    if not recurrent:
        return pd.DataFrame()
    
    result = pd.DataFrame(recurrent)
    result = result.sort_values(["occurrence_days", "total_complaints"], ascending=False).reset_index(drop=True)
    
    return result


def _get_recurrent_severity(days: int, complaints: int) -> str:
    if days >= 7 or complaints >= 10:
        return "特别严重"
    elif days >= 5 or complaints >= 7:
        return "严重"
    elif days >= 3 or complaints >= 5:
        return "较重"
    else:
        return "一般"


def find_unclosed_cases(
    enforcement_df: pd.DataFrame,
    complaint_df: Optional[pd.DataFrame] = None,
    decibel_df: Optional[pd.DataFrame] = None,
) -> pd.DataFrame:
    if enforcement_df.empty:
        return pd.DataFrame()
    
    df = enforcement_df.copy()
    unclosed = df[~df["closed"]].copy()
    
    if unclosed.empty:
        return unclosed
    
    unclosed = unclosed.sort_values("register_time", ascending=True).reset_index(drop=True)
    
    unclosed["pending_hours"] = (
        (datetime.now() - unclosed["register_time"]).dt.total_seconds() / 3600
    ).round(1)
    
    unclosed["severity"] = pd.cut(
        unclosed["pending_hours"],
        bins=[0, 24, 72, 168, 10000],
        labels=["一般", "较重", "严重", "特别严重"],
        include_lowest=True,
    )
    
    if complaint_df is not None and not complaint_df.empty:
        complaint_df = complaint_df.copy()
        complaint_df["date_str"] = complaint_df["analysis_date"].astype(str)
        unclosed["date_str"] = unclosed["analysis_date"].astype(str)
        
        related_complaints = []
        for _, row in unclosed.iterrows():
            mask = (
                (complaint_df["normalized_address"] == row["normalized_address"]) &
                (complaint_df["date_str"] == row["date_str"])
            )
            related = complaint_df[mask]
            if not related.empty:
                related_complaints.append({
                    "case_id": row.get("case_id", ""),
                    "related_complaint_count": len(related),
                    "related_complainants": related["phone_number"].nunique() if "phone_number" in related.columns else 0,
                })
        
        if related_complaints:
            related_df = pd.DataFrame(related_complaints)
            if "case_id" in unclosed.columns:
                unclosed = unclosed.merge(related_df, on="case_id", how="left")
            else:
                unclosed = pd.concat([unclosed, related_df], axis=1)
    
    unclosed["issue_type"] = "未闭环案件"
    
    cols = [
        "analysis_date", "normalized_address", "community", "street", "time_period",
        "register_time", "case_id", "noise_type", "party", "action", "remark",
        "pending_hours", "severity", "issue_type",
    ]
    
    if "related_complaint_count" in unclosed.columns:
        cols.extend(["related_complaint_count", "related_complainants"])
    
    cols = [c for c in cols if c in unclosed.columns]
    
    return unclosed[cols]


def analyze_weekend_situation(
    decibel_df: Optional[pd.DataFrame] = None,
    complaint_df: Optional[pd.DataFrame] = None,
    enforcement_df: Optional[pd.DataFrame] = None,
) -> Dict[str, pd.DataFrame]:
    result = {}
    
    if complaint_df is not None and not complaint_df.empty:
        weekend_complaints = complaint_df[complaint_df["is_weekend"]].copy()
        if not weekend_complaints.empty:
            weekend_complaints = weekend_complaints[~weekend_complaints["is_duplicate"]]
            
            agg = weekend_complaints.groupby(
                ["analysis_date", "normalized_address", "community", "street", "time_period"]
            ).agg({
                "phone_number": "nunique",
                "noise_type": lambda x: ",".join(sorted(set(x.dropna().astype(str)))),
            }).reset_index()
            
            agg = agg.rename(columns={
                "phone_number": "complaint_count",
                "noise_type": "noise_types",
            })
            
            agg["is_weekend"] = True
            result["weekend_complaints"] = agg.sort_values("complaint_count", ascending=False)
    
    if decibel_df is not None and not decibel_df.empty:
        weekend_decibel = decibel_df[decibel_df["is_weekend"]].copy()
        if not weekend_decibel.empty:
            agg = weekend_decibel.groupby(
                ["analysis_date", "normalized_address", "community", "street", "time_period"]
            ).agg({
                "db_value": ["mean", "max"],
                "is_over_standard": ["sum", "mean"],
            }).round(2)
            
            agg.columns = ["avg_db", "max_db", "over_standard_count", "over_standard_rate"]
            agg = agg.reset_index()
            agg["over_standard_rate"] = (agg["over_standard_rate"] * 100).round(1)
            agg["is_weekend"] = True
            
            result["weekend_decibel"] = agg.sort_values("over_standard_rate", ascending=False)
    
    if enforcement_df is not None and not enforcement_df.empty:
        weekend_enforcement = enforcement_df[enforcement_df["is_weekend"]].copy()
        if not weekend_enforcement.empty:
            result["weekend_enforcement"] = weekend_enforcement
    
    return result


def analyze_trend(
    decibel_df: Optional[pd.DataFrame] = None,
    complaint_df: Optional[pd.DataFrame] = None,
    days: int = 7,
) -> pd.DataFrame:
    data = []
    
    if decibel_df is not None and not decibel_df.empty:
        decibel_trend = decibel_df.groupby("analysis_date").agg({
            "db_value": "mean",
            "is_over_standard": "sum",
        }).round(2).reset_index()
        
        decibel_trend = decibel_trend.rename(columns={
            "db_value": "avg_db",
            "is_over_standard": "over_standard_count",
        })
        
        data.append(decibel_trend)
    
    if complaint_df is not None and not complaint_df.empty:
        unique_complaints = complaint_df[~complaint_df["is_duplicate"]]
        complaint_trend = unique_complaints.groupby("analysis_date").agg({
            "phone_number": "nunique",
            "is_duplicate": "sum",
        }).reset_index()
        
        complaint_trend = complaint_trend.rename(columns={
            "phone_number": "complaint_count",
            "is_duplicate": "duplicate_count",
        })
        
        data.append(complaint_trend)
    
    if not data:
        return pd.DataFrame()
    
    result = data[0]
    for df in data[1:]:
        result = result.merge(df, on="analysis_date", how="outer")
    
    result = result.sort_values("analysis_date").tail(days).reset_index(drop=True)
    
    for col in result.columns:
        if col != "analysis_date":
            result[col] = result[col].fillna(0)
    
    return result


def run_all_analysis(
    cleaned_data: Dict[str, pd.DataFrame],
    merged_data: Dict[str, pd.DataFrame],
) -> Dict[str, pd.DataFrame]:
    decibel_df = cleaned_data.get("decibel", pd.DataFrame())
    complaint_df = cleaned_data.get("complaint", pd.DataFrame())
    enforcement_df = cleaned_data.get("enforcement", pd.DataFrame())
    
    location_period = merged_data.get("by_location_period", pd.DataFrame())
    
    result = {
        "over_standard_no_complaint": find_over_standard_no_complaint(location_period),
        "high_complaint_normal_db": find_high_complaint_normal_db(location_period),
        "recurrent_points": find_recurrent_points(complaint_df, decibel_df),
        "unclosed_cases": find_unclosed_cases(enforcement_df, complaint_df, decibel_df),
        "trend": analyze_trend(decibel_df, complaint_df),
    }
    
    weekend = analyze_weekend_situation(decibel_df, complaint_df, enforcement_df)
    result.update(weekend)
    
    return result


def get_issue_summary(analysis_result: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    summary = []
    
    issue_map = {
        "over_standard_no_complaint": "超标无投诉",
        "high_complaint_normal_db": "投诉多仪器正常",
        "recurrent_points": "反复扰民点",
        "unclosed_cases": "未闭环案件",
    }
    
    for key, name in issue_map.items():
        df = analysis_result.get(key, pd.DataFrame())
        if not df.empty:
            severity_counts = df["severity"].value_counts().to_dict()
            summary.append({
                "问题类型": name,
                "数量": len(df),
                "一般": severity_counts.get("一般", 0),
                "较重": severity_counts.get("较重", 0),
                "严重": severity_counts.get("严重", 0),
                "特别严重": severity_counts.get("特别严重", 0),
            })
    
    return pd.DataFrame(summary)
