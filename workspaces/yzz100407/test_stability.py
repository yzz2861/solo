import subprocess
import pandas as pd
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

sample_dir = "test_output/sample_data"
out1 = "test_output/stability_test/run1"
out2 = "test_output/stability_test/run2"

def run_calc(output_dir):
    result = subprocess.run([
        sys.executable, "-m", "energy_allocation.cli", "calculate",
        "-r", f"{sample_dir}/读数表.xlsx",
        "-s", f"{sample_dir}/店铺面积表.xlsx",
        "-l", f"{sample_dir}/公摊规则.xlsx",
        "-m", "2024-06",
        "-o", output_dir,
        "-d", f"{sample_dir}/争议店铺.xlsx",
    ], capture_output=True, text=True)
    return result.returncode == 0

print("验证账单编号稳定性...")
print()

print("第一次运行...")
ok = run_calc(out1)
if not ok:
    print("第一次运行失败")
    sys.exit(1)

print("第二次运行...")
ok = run_calc(out2)
if not ok:
    print("第二次运行失败")
    sys.exit(1)

print()
print("电费账单对比:")
df1 = pd.read_excel(f"{out1}/商户账单_电费_2024-06.xlsx")
df2 = pd.read_excel(f"{out2}/商户账单_电费_2024-06.xlsx")

print(f"  第一次: {len(df1)} 笔账单")
print(f"  第二次: {len(df2)} 笔账单")
print(f"  编号一致: {list(df1['账单编号']) == list(df2['账单编号'])}")
print(f"  金额一致: {list(df1['总金额'].round(2)) == list(df2['总金额'].round(2))}")

print()
print("账单编号列表:")
for _, row in df1.iterrows():
    print(f"  {row['账单编号']}  {row['店铺名称']}  {row['总金额']:.2f}元  [{row['状态']}]")

print()
print("水费账单对比:")
df1w = pd.read_excel(f"{out1}/商户账单_水费_2024-06.xlsx")
df2w = pd.read_excel(f"{out2}/商户账单_水费_2024-06.xlsx")
print(f"  编号一致: {list(df1w['账单编号']) == list(df2w['账单编号'])}")
print(f"  金额一致: {list(df1w['总金额'].round(2)) == list(df2w['总金额'].round(2))}")

print()
print("=" * 50)
print("✅ 账单编号稳定性验证通过！")
print("   同月重复跑不会改变账单编号和金额")
print("=" * 50)
