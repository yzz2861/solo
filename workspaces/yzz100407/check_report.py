import pandas as pd

report_path = "test_output/cli_output/内部报告_2024-06.xlsx"

xl = pd.ExcelFile(report_path)
print("内部报告包含的Sheet:", xl.sheet_names)
print()

print("【汇总Sheet】:")
df_summary = pd.read_excel(report_path, sheet_name="汇总")
print(df_summary.to_string(index=False))
print()

print("【账单明细Sheet】(前15行):")
df_detail = pd.read_excel(report_path, sheet_name="账单明细")
print(f"共 {len(df_detail)} 行")
print(df_detail.head(15).to_string(index=False))
print()

print("【异常清单Sheet】:")
df_anomaly = pd.read_excel(report_path, sheet_name="异常清单")
print(df_anomaly.to_string(index=False))
print()

print("【争议店铺Sheet】:")
df_disputed = pd.read_excel(report_path, sheet_name="争议店铺")
print(df_disputed.to_string(index=False))
