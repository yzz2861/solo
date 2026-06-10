import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src import data_import, data_cleaning, data_merge, analysis, report_generator
from src.utils import ensure_dir

print("=" * 60)
print("社区噪声夜报分析系统 - 测试运行")
print("=" * 60)

print("\n【步骤1/5】数据导入中...")
imported_data = data_import.import_all_data(
    decibel_path="data/分贝记录.xlsx",
    complaint_path="data/投诉记录表.xlsx",
    enforcement_path="data/执法登记表.xlsx",
)

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
merged_data = data_merge.merge_all(cleaned_data, None)

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
ensure_dir("output")
reports = report_generator.generate_full_report(
    cleaned_data,
    merged_data,
    analysis_result,
    "output",
    None,
)

print("\n报告生成完成:")
for name, path in reports.items():
    print(f"  {name}: {path}")

report_generator.print_console_summary(cleaned_data, merged_data, analysis_result)

print("\n" + "=" * 60)
print("测试完成！请查看 output 目录下的报告文件。")
print("=" * 60)
