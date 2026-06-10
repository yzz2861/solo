#!/usr/bin/env python3
import os
import sys
import argparse
from datetime import datetime
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src import (
    data_import,
    data_cleaning,
    data_merge,
    analysis,
    report_generator,
)
from src.utils import format_date, ensure_dir
from data.sample_data_generator import generate_all_sample_data


def run_analysis_pipeline(
    decibel_path: Optional[str] = None,
    complaint_path: Optional[str] = None,
    enforcement_path: Optional[str] = None,
    output_dir: Optional[str] = None,
    analysis_date: Optional[str] = None,
    generate_sample: bool = False,
) -> dict:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    
    if output_dir is None:
        output_dir = os.path.join(base_dir, "output")
    
    ensure_dir(output_dir)
    
    if generate_sample:
        print("正在生成样本数据...")
        paths = generate_all_sample_data(data_dir)
        decibel_path = paths["decibel"]
        complaint_path = paths["complaint"]
        enforcement_path = paths["enforcement"]
    
    print("\n" + "=" * 60)
    print("社区噪声夜报分析系统")
    print("=" * 60)
    
    print("\n【步骤1/5】数据导入中...")
    imported_data = data_import.import_all_data(
        decibel_path=decibel_path,
        complaint_path=complaint_path,
        enforcement_path=enforcement_path,
    )
    
    if not imported_data:
        print("错误: 未导入任何数据，请检查文件路径！")
        return {}
    
    import_summary = data_import.get_data_summary(imported_data)
    print("\n数据导入完成:")
    print(import_summary.to_string(index=False))
    
    print("\n【步骤2/5】数据清洗中...")
    cleaned_data = data_cleaning.clean_all_data(
        decibel_df=imported_data.get("decibel"),
        complaint_df=imported_data.get("complaint"),
        enforcement_df=imported_data.get("enforcement"),
    )
    
    cleaning_report = data_cleaning.get_cleaning_report(cleaned_data)
    print("\n数据清洗完成:")
    print(cleaning_report.to_string(index=False))
    
    print("\n【步骤3/5】数据合并中...")
    merged_data = data_merge.merge_all(cleaned_data, analysis_date)
    
    merge_summary = data_merge.get_merge_summary(merged_data)
    print("\n数据合并完成:")
    print(merge_summary.to_string(index=False))
    
    print("\n【步骤4/5】核心分析中...")
    analysis_result = analysis.run_all_analysis(cleaned_data, merged_data)
    
    issue_summary = analysis.get_issue_summary(analysis_result)
    if not issue_summary.empty:
        print("\n发现问题汇总:")
        print(issue_summary.to_string(index=False))
    else:
        print("\n未发现符合条件的问题")
    
    print("\n【步骤5/5】生成报告中...")
    reports = report_generator.generate_full_report(
        cleaned_data,
        merged_data,
        analysis_result,
        output_dir,
        analysis_date,
    )
    
    print("\n报告生成完成:")
    for name, path in reports.items():
        print(f"  {name}: {path}")
    
    report_generator.print_console_summary(cleaned_data, merged_data, analysis_result)
    
    result = {
        "imported_data": imported_data,
        "cleaned_data": cleaned_data,
        "merged_data": merged_data,
        "analysis_result": analysis_result,
        "reports": reports,
    }
    
    return result


def main():
    parser = argparse.ArgumentParser(description="社区噪声夜报分析系统")
    parser.add_argument("--decibel", "-d", help="分贝记录文件路径")
    parser.add_argument("--complaint", "-c", help="投诉记录表文件路径")
    parser.add_argument("--enforcement", "-e", help="执法登记表文件路径")
    parser.add_argument("--output", "-o", help="报告输出目录")
    parser.add_argument("--date", help="分析日期 (YYYY-MM-DD)，不指定则分析全部数据")
    parser.add_argument("--generate-sample", "-g", action="store_true", help="生成样本数据并运行分析")
    
    args = parser.parse_args()
    
    if not any([args.decibel, args.complaint, args.enforcement, args.generate_sample]):
        parser.print_help()
        print("\n提示: 首次运行建议使用 --generate-sample 参数生成样本数据测试")
        return
    
    result = run_analysis_pipeline(
        decibel_path=args.decibel,
        complaint_path=args.complaint,
        enforcement_path=args.enforcement,
        output_dir=args.output,
        analysis_date=args.date,
        generate_sample=args.generate_sample,
    )
    
    if result.get("reports"):
        print("\n" + "=" * 60)
        print("分析完成！报告已保存到 output 目录。")
        print("=" * 60)


if __name__ == "__main__":
    main()
