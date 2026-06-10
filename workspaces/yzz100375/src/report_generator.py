import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Optional
import os
from .utils import ensure_dir, format_date, format_dt


def _df_to_excel_sheet(df: pd.DataFrame, writer: pd.ExcelWriter, sheet_name: str):
    if df is None or df.empty:
        df = pd.DataFrame({"说明": ["无数据"]})
    
    df = df.copy()
    
    for col in df.columns:
        if pd.api.types.is_categorical_dtype(df[col]):
            df[col] = df[col].astype(str)
    
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].apply(lambda x: x.isoformat() if hasattr(x, 'isoformat') and not isinstance(x, str) else x)
    
    df.to_excel(writer, sheet_name=sheet_name, index=False)
    
    worksheet = writer.sheets[sheet_name]
    
    from openpyxl.utils import get_column_letter
    
    for idx, col in enumerate(df.columns):
        series = df[col]
        try:
            max_len = max(
                series.astype(str).map(len).max(),
                len(str(col))
            ) + 2
        except:
            max_len = 15
        col_letter = get_column_letter(idx + 1)
        worksheet.column_dimensions[col_letter].width = min(max_len, 30)


def generate_street_meeting_report(
    merged_data: Dict[str, pd.DataFrame],
    analysis_result: Dict[str, pd.DataFrame],
    output_path: str,
) -> str:
    ensure_dir(os.path.dirname(output_path))
    
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        by_street = merged_data.get("by_street", pd.DataFrame())
        if not by_street.empty:
            key_streets = by_street.copy()
            if "over_standard_rate" in key_streets.columns:
                key_streets = key_streets[key_streets["over_standard_rate"] > 0].copy()
                key_streets = key_streets.sort_values(
                    ["over_standard_rate", "total_complaint_count"],
                    ascending=False
                ).head(10)
            _df_to_excel_sheet(key_streets, writer, "重点路段")
        
        trend = analysis_result.get("trend", pd.DataFrame())
        _df_to_excel_sheet(trend, writer, "每日趋势")
        
        by_time = merged_data.get("by_time_period", pd.DataFrame())
        _df_to_excel_sheet(by_time, writer, "时段分布")
        
        by_community = merged_data.get("by_community", pd.DataFrame())
        if not by_community.empty:
            by_community = by_community.sort_values(
                "total_complaint_count", ascending=False
            )
        _df_to_excel_sheet(by_community, writer, "小区汇总")
        
        issue_summary = _get_issue_summary_df(analysis_result)
        _df_to_excel_sheet(issue_summary, writer, "问题汇总")
        
        over_std = analysis_result.get("over_standard_no_complaint", pd.DataFrame())
        if not over_std.empty:
            over_std = _add_risk_level(over_std, "over_standard_rate")
        _df_to_excel_sheet(over_std, writer, "超标无投诉")
        
        high_complaint = analysis_result.get("high_complaint_normal_db", pd.DataFrame())
        if not high_complaint.empty:
            high_complaint = _add_risk_level(high_complaint, "total_complaint_count")
        _df_to_excel_sheet(high_complaint, writer, "投诉多仪器正常")
    
    return output_path


def generate_enforcement_report(
    analysis_result: Dict[str, pd.DataFrame],
    output_path: str,
) -> str:
    ensure_dir(os.path.dirname(output_path))
    
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        unclosed = analysis_result.get("unclosed_cases", pd.DataFrame())
        if not unclosed.empty:
            unclosed = unclosed.sort_values("pending_hours", ascending=False)
            priority_cols = [
                "severity", "pending_hours", "normalized_address", "community",
                "register_time", "case_id", "noise_type", "action", "remark"
            ]
            priority_cols = [c for c in priority_cols if c in unclosed.columns]
            unclosed = unclosed[priority_cols]
        _df_to_excel_sheet(unclosed, writer, "未闭环清单")
        
        recurrent = analysis_result.get("recurrent_points", pd.DataFrame())
        if not recurrent.empty:
            recurrent = recurrent.sort_values(
                ["severity", "occurrence_days"], ascending=[True, False]
            )
        _df_to_excel_sheet(recurrent, writer, "反复扰民点")
        
        priority_tasks = _generate_priority_tasks(analysis_result)
        _df_to_excel_sheet(priority_tasks, writer, "优先级任务")
    
    return output_path


def generate_community_report(
    merged_data: Dict[str, pd.DataFrame],
    analysis_result: Dict[str, pd.DataFrame],
    output_path: str,
) -> str:
    ensure_dir(os.path.dirname(output_path))
    
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        weekend_complaints = analysis_result.get("weekend_complaints", pd.DataFrame())
        _df_to_excel_sheet(weekend_complaints, writer, "周末夜间投诉")
        
        weekend_decibel = analysis_result.get("weekend_decibel", pd.DataFrame())
        _df_to_excel_sheet(weekend_decibel, writer, "周末夜间噪声")
        
        recurrent = analysis_result.get("recurrent_points", pd.DataFrame())
        if not recurrent.empty:
            recurrent = recurrent.sort_values("occurrence_days", ascending=False)
        _df_to_excel_sheet(recurrent, writer, "反复扰民点")
        
        by_community = merged_data.get("by_community", pd.DataFrame())
        if not by_community.empty:
            available_cols = [c for c in [
                "analysis_date", "community", "avg_db", "max_db",
                "over_standard_rate", "total_complaint_count",
                "unique_complainant_count", "unclosed_case_count",
                "enforcement_case_count", "closed_case_count"
            ] if c in by_community.columns]
            community_detail = by_community[available_cols].copy()
            community_detail = community_detail.sort_values(
                "total_complaint_count", ascending=False
            )
        else:
            community_detail = by_community
        _df_to_excel_sheet(community_detail, writer, "小区明细")
        
        location_detail = merged_data.get("by_location_period", pd.DataFrame())
        if not location_detail.empty:
            location_detail = location_detail[
                location_detail["total_complaint_count"] > 0
            ].copy()
            location_detail = location_detail.sort_values(
                "total_complaint_count", ascending=False
            )
        _df_to_excel_sheet(location_detail, writer, "点位时段明细")
    
    return output_path


def generate_full_report(
    cleaned_data: Dict[str, pd.DataFrame],
    merged_data: Dict[str, pd.DataFrame],
    analysis_result: Dict[str, pd.DataFrame],
    output_dir: str,
    report_date: Optional[str] = None,
) -> Dict[str, str]:
    if report_date is None:
        report_date = format_date(datetime.now())
    
    report_date_str = str(report_date).replace("-", "")
    
    reports = {}
    
    street_path = os.path.join(output_dir, f"街道例会噪声报告_{report_date_str}.xlsx")
    reports["street_meeting"] = generate_street_meeting_report(
        merged_data, analysis_result, street_path
    )
    
    enforcement_path = os.path.join(output_dir, f"执法队噪声报告_{report_date_str}.xlsx")
    reports["enforcement"] = generate_enforcement_report(
        analysis_result, enforcement_path
    )
    
    community_path = os.path.join(output_dir, f"社区噪声报告_{report_date_str}.xlsx")
    reports["community"] = generate_community_report(
        merged_data, analysis_result, community_path
    )
    
    summary_path = os.path.join(output_dir, f"噪声夜报分析汇总_{report_date_str}.xlsx")
    reports["summary"] = generate_summary_report(
        cleaned_data, merged_data, analysis_result, summary_path
    )
    
    return reports


def generate_summary_report(
    cleaned_data: Dict[str, pd.DataFrame],
    merged_data: Dict[str, pd.DataFrame],
    analysis_result: Dict[str, pd.DataFrame],
    output_path: str,
) -> str:
    ensure_dir(os.path.dirname(output_path))
    
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        overview = _generate_overview(cleaned_data, merged_data, analysis_result)
        _df_to_excel_sheet(overview, writer, "总体概览")
        
        issue_summary = _get_issue_summary_df(analysis_result)
        _df_to_excel_sheet(issue_summary, writer, "问题汇总")
        
        trend = analysis_result.get("trend", pd.DataFrame())
        _df_to_excel_sheet(trend, writer, "趋势分析")
        
        over_std = analysis_result.get("over_standard_no_complaint", pd.DataFrame())
        _df_to_excel_sheet(over_std, writer, "超标无投诉")
        
        high_complaint = analysis_result.get("high_complaint_normal_db", pd.DataFrame())
        _df_to_excel_sheet(high_complaint, writer, "投诉多仪器正常")
        
        recurrent = analysis_result.get("recurrent_points", pd.DataFrame())
        _df_to_excel_sheet(recurrent, writer, "反复扰民点")
        
        unclosed = analysis_result.get("unclosed_cases", pd.DataFrame())
        _df_to_excel_sheet(unclosed, writer, "未闭环案件")
        
        by_street = merged_data.get("by_street", pd.DataFrame())
        _df_to_excel_sheet(by_street, writer, "路段汇总")
        
        by_community = merged_data.get("by_community", pd.DataFrame())
        _df_to_excel_sheet(by_community, writer, "小区汇总")
        
        by_time = merged_data.get("by_time_period", pd.DataFrame())
        _df_to_excel_sheet(by_time, writer, "时段汇总")
    
    return output_path


def _generate_overview(
    cleaned_data: Dict[str, pd.DataFrame],
    merged_data: Dict[str, pd.DataFrame],
    analysis_result: Dict[str, pd.DataFrame],
) -> pd.DataFrame:
    overview = []
    
    decibel_df = cleaned_data.get("decibel", pd.DataFrame())
    complaint_df = cleaned_data.get("complaint", pd.DataFrame())
    enforcement_df = cleaned_data.get("enforcement", pd.DataFrame())
    
    if not decibel_df.empty:
        overview.append({"指标": "分贝监测记录数", "数值": len(decibel_df)})
        overview.append({
            "指标": "超标记录数",
            "数值": int(decibel_df["is_over_standard"].sum())
        })
        overview.append({
            "指标": "平均分贝值",
            "数值": round(decibel_df["db_value"].mean(), 1)
        })
        overview.append({
            "指标": "最高分贝值",
            "数值": round(decibel_df["db_value"].max(), 1)
        })
        overview.append({
            "指标": "监测点位数量",
            "数值": decibel_df["normalized_address"].nunique()
        })
    
    if not complaint_df.empty:
        unique_complaints = complaint_df[~complaint_df["is_duplicate"]]
        overview.append({"指标": "投诉记录数", "数值": len(complaint_df)})
        overview.append({"指标": "有效投诉数", "数值": len(unique_complaints)})
        overview.append({"指标": "重复投诉数", "数值": int(complaint_df["is_duplicate"].sum())})
        overview.append({
            "指标": "涉及投诉人数",
            "数值": unique_complaints["phone_number"].nunique() if "phone_number" in unique_complaints.columns else 0
        })
        overview.append({
            "指标": "涉及小区数",
            "数值": unique_complaints["community"].nunique()
        })
    
    if not enforcement_df.empty:
        overview.append({"指标": "执法记录数", "数值": len(enforcement_df)})
        overview.append({
            "指标": "未闭环案件数",
            "数值": int((~enforcement_df["closed"]).sum()) if "closed" in enforcement_df.columns else 0
        })
    
    issues = ["over_standard_no_complaint", "high_complaint_normal_db", "recurrent_points", "unclosed_cases"]
    issue_names = ["超标无投诉", "投诉多仪器正常", "反复扰民点", "未闭环案件"]
    
    for key, name in zip(issues, issue_names):
        df = analysis_result.get(key, pd.DataFrame())
        if not df.empty:
            overview.append({"指标": f"{name}数量", "数值": len(df)})
    
    return pd.DataFrame(overview)


def _get_issue_summary_df(analysis_result: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    from .analysis import get_issue_summary
    return get_issue_summary(analysis_result)


def _add_risk_level(df: pd.DataFrame, value_col: str) -> pd.DataFrame:
    if df.empty or value_col not in df.columns:
        return df
    
    df = df.copy()
    
    q33 = df[value_col].quantile(0.33)
    q66 = df[value_col].quantile(0.66)
    
    def get_level(val):
        if val >= q66:
            return "高"
        elif val >= q33:
            return "中"
        else:
            return "低"
    
    df["风险等级"] = df[value_col].apply(get_level)
    return df


def _generate_priority_tasks(analysis_result: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    tasks = []
    
    unclosed = analysis_result.get("unclosed_cases", pd.DataFrame())
    if not unclosed.empty:
        high_priority = unclosed[
            unclosed["severity"].isin(["严重", "特别严重"])
        ].copy()
        for _, row in high_priority.iterrows():
            tasks.append({
                "优先级": "紧急",
                "任务类型": "未闭环案件",
                "地址": row.get("normalized_address", ""),
                "小区": row.get("community", ""),
                "时段": row.get("time_period", ""),
                "问题描述": f"案件超时{row.get('pending_hours', 0)}小时未闭环",
                "严重程度": row.get("severity", ""),
            })
    
    recurrent = analysis_result.get("recurrent_points", pd.DataFrame())
    if not recurrent.empty:
        high_priority = recurrent[
            recurrent["severity"].isin(["严重", "特别严重"])
        ].copy()
        for _, row in high_priority.iterrows():
            tasks.append({
                "优先级": "高",
                "任务类型": "反复扰民",
                "地址": row.get("normalized_address", ""),
                "小区": row.get("community", ""),
                "时段": row.get("time_period", ""),
                "问题描述": f"{row.get('occurrence_days', 0)}天内出现{row.get('total_complaints', 0)}次投诉",
                "严重程度": row.get("severity", ""),
            })
    
    over_std = analysis_result.get("over_standard_no_complaint", pd.DataFrame())
    if not over_std.empty:
        high_priority = over_std[
            over_std["severity"].isin(["严重"])
        ].copy()
        for _, row in high_priority.iterrows():
            tasks.append({
                "优先级": "高",
                "任务类型": "超标无投诉",
                "地址": row.get("normalized_address", ""),
                "小区": row.get("community", ""),
                "时段": row.get("time_period", ""),
                "问题描述": f"超标率{row.get('over_standard_rate', 0)}%但无投诉记录，需排查原因",
                "严重程度": row.get("severity", ""),
            })
    
    if not tasks:
        return pd.DataFrame(columns=["优先级", "任务类型", "地址", "小区", "时段", "问题描述", "严重程度"])
    
    priority_order = {"紧急": 0, "高": 1, "中": 2, "低": 3}
    result = pd.DataFrame(tasks)
    result["priority_order"] = result["优先级"].map(priority_order)
    result = result.sort_values(["priority_order", "严重程度"], ascending=[True, False])
    result = result.drop("priority_order", axis=1).reset_index(drop=True)
    
    return result


def print_console_summary(
    cleaned_data: Dict[str, pd.DataFrame],
    merged_data: Dict[str, pd.DataFrame],
    analysis_result: Dict[str, pd.DataFrame],
):
    print("\n" + "=" * 60)
    print("社区噪声夜报分析 - 处理摘要")
    print("=" * 60)
    
    decibel_df = cleaned_data.get("decibel", pd.DataFrame())
    complaint_df = cleaned_data.get("complaint", pd.DataFrame())
    enforcement_df = cleaned_data.get("enforcement", pd.DataFrame())
    
    print(f"\n【数据导入】")
    if not decibel_df.empty:
        print(f"  分贝记录: {len(decibel_df)} 条, 覆盖 {decibel_df['normalized_address'].nunique()} 个点位")
    if not complaint_df.empty:
        print(f"  投诉记录: {len(complaint_df)} 条, 有效投诉 {len(complaint_df[~complaint_df['is_duplicate']])} 条")
    if not enforcement_df.empty:
        print(f"  执法记录: {len(enforcement_df)} 条, 未闭环 {int((~enforcement_df['closed']).sum()) if 'closed' in enforcement_df.columns else 0} 件")
    
    print(f"\n【问题识别】")
    issues = [
        ("超标无投诉", "over_standard_no_complaint"),
        ("投诉多仪器正常", "high_complaint_normal_db"),
        ("反复扰民点", "recurrent_points"),
        ("未闭环案件", "unclosed_cases"),
    ]
    
    for name, key in issues:
        df = analysis_result.get(key, pd.DataFrame())
        if not df.empty:
            severity = df["severity"].value_counts().to_dict()
            severity_str = ", ".join([f"{k}:{v}" for k, v in severity.items()])
            print(f"  {name}: {len(df)} 处 ({severity_str})")
        else:
            print(f"  {name}: 0 处")
    
    weekend_complaints = analysis_result.get("weekend_complaints", pd.DataFrame())
    if not weekend_complaints.empty:
        print(f"\n【周末夜间情况】")
        print(f"  周末投诉: {weekend_complaints['complaint_count'].sum()} 件, "
              f"涉及 {weekend_complaints['normalized_address'].nunique()} 个点位")
    
    print("\n" + "=" * 60)
