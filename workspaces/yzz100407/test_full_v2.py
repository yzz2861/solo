import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from energy_allocation.sample_data import generate_sample_data
from energy_allocation.importer import (
    import_readings, import_shop_areas, import_allocation_rules,
    import_disputed_shops, validate_import_data,
)
from energy_allocation.allocation_engine import AllocationEngine
from energy_allocation.anomaly_detector import detect_anomalies, apply_anomalies_to_bills, mark_disputed_shops
from energy_allocation.bill_number import assign_bill_numbers, generate_bill_no
from energy_allocation.exporter import export_shop_bills, export_internal_report, export_all_explanations
from energy_allocation.models import MeterType, BillStatus, AnomalyType
import pandas as pd

test_dir = "test_output_v2"
sample_dir = os.path.join(test_dir, "sample_data")
output_dir = os.path.join(test_dir, "bills")
billing_month = "2024-06"

print("1. 生成示例数据...")
files = generate_sample_data(sample_dir, billing_month)
print("  OK")

print("2. 导入数据...")
readings = import_readings(files["readings"])
shops = import_shop_areas(files["shops"])
rules = import_allocation_rules(files["rules"])
disputed = import_disputed_shops(files["disputed"])
print(f"  读数{len(readings)}条 店铺{len(shops)}家 规则{len(rules)}条 争议{len(disputed)}家")

print("3. 异常检测...")
anomalies_by_shop, anomaly_details = detect_anomalies(readings, shops, billing_month)
types_found = set(a["anomaly_type"] for a in anomaly_details)
print(f"  异常类型: {sorted(types_found)}")
for a in anomaly_details:
    print(f"    [{a['shop_id']}] {a['description']}")

has_rename = "shop_renamed" in types_found
print(f"  改名检测: {'PASS' if has_rename else 'FAIL'}")

print("4. 费用分摊...")
engine = AllocationEngine(readings, shops, rules, billing_month)
result = engine.allocate()
result.anomalies = anomaly_details
apply_anomalies_to_bills(result.bills, anomalies_by_shop)
mark_disputed_shops(result.bills, disputed)
assign_bill_numbers(result.bills, billing_month, use_sequential=True)
elec = [b for b in result.bills if b.meter_type == MeterType.ELECTRIC]
water = [b for b in result.bills if b.meter_type == MeterType.WATER]
print(f"  电费{len(elec)}笔 水费{len(water)}笔")

print("5. 编号稳定性...")
first_nos = [b.bill_no for b in sorted(result.bills, key=lambda x: x.bill_no)]
assign_bill_numbers(result.bills, billing_month, use_sequential=True)
second_nos = [b.bill_no for b in sorted(result.bills, key=lambda x: x.bill_no)]
print(f"  编号一致: {first_nos == second_nos}")

print("6. 导出...")
shop_files = export_shop_bills(result, output_dir, format="excel")
report_path = export_internal_report(result, output_dir)
explain_dir = os.path.join(test_dir, "explanations")
explain_files = export_all_explanations(result, explain_dir)
print(f"  商户账单{len(shop_files)}个 内部报告1个 解释单{len(explain_files)}份")

print("7. 验证Excel异常清单含改名记录...")
df_a = pd.read_excel(report_path, sheet_name="异常清单")
rename_rows = df_a[df_a["anomaly_type"] == "shop_renamed"]
print(f"  Excel异常清单改名记录: {len(rename_rows)}行")
for _, r in rename_rows.iterrows():
    print(f"    {r['shop_id']}: {r['description']}")

all_ok = has_rename and first_nos == second_nos and len(rename_rows) > 0
print()
print("=" * 50)
print(f"{'✅ 全部验证通过' if all_ok else '❌ 验证失败'}（含改名检测）")
