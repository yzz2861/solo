import sys
import os
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from energy_allocation.sample_data import generate_sample_data
from energy_allocation.importer import (
    import_readings, import_shop_areas, import_allocation_rules,
    import_disputed_shops, validate_import_data,
)
from energy_allocation.allocation_engine import AllocationEngine
from energy_allocation.anomaly_detector import detect_anomalies, apply_anomalies_to_bills, mark_disputed_shops
from energy_allocation.bill_number import assign_bill_numbers, generate_bill_no
from energy_allocation.exporter import (
    export_shop_bills, export_internal_report, export_bill_explain, export_all_explanations,
)
from energy_allocation.models import MeterType, BillStatus


def run_tests():
    print("=" * 60)
    print("店铺能耗分摊账 - 功能测试")
    print("=" * 60)

    test_dir = os.path.join(os.path.dirname(__file__), "test_output")
    sample_dir = os.path.join(test_dir, "sample_data")
    billing_month = "2024-06"

    print("\n[1/8] 生成示例数据...")
    try:
        files = generate_sample_data(sample_dir, billing_month)
        print(f"  ✓ 示例数据已生成到 {sample_dir}")
        for name, path in files.items():
            print(f"    - {name}: {os.path.basename(path)}")
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        traceback.print_exc()
        return False

    print("\n[2/8] 数据导入测试...")
    try:
        readings = import_readings(files["readings"])
        shops = import_shop_areas(files["shops"])
        rules = import_allocation_rules(files["rules"])
        disputed = import_disputed_shops(files["disputed"])

        print(f"  ✓ 读数记录: {len(readings)} 条")
        print(f"  ✓ 店铺信息: {len(shops)} 家")
        print(f"  ✓ 分摊规则: {len(rules)} 条")
        print(f"  ✓ 争议店铺: {len(disputed)} 家")

        errors, warnings = validate_import_data(readings, shops, rules)
        if errors:
            print(f"  ⚠ 验证错误: {len(errors)} 个")
        if warnings:
            print(f"  ⚠ 验证警告: {len(warnings)} 个")
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        traceback.print_exc()
        return False

    print("\n[3/8] 异常检测测试...")
    try:
        anomalies_by_shop, anomaly_details = detect_anomalies(readings, shops, billing_month)
        anomaly_shop_count = len([s for s, a in anomalies_by_shop.items() if a])
        print(f"  ✓ 异常店铺: {anomaly_shop_count} 家")
        print(f"  ✓ 异常项数: {len(anomaly_details)} 项")
        for a in anomaly_details:
            print(f"    - [{a['shop_id']}] {a['description']}")
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        traceback.print_exc()
        return False

    print("\n[4/8] 费用分摊计算测试...")
    try:
        engine = AllocationEngine(readings, shops, rules, billing_month)
        result = engine.allocate()
        result.anomalies = anomaly_details

        electric_bills = [b for b in result.bills if b.meter_type == MeterType.ELECTRIC]
        water_bills = [b for b in result.bills if b.meter_type == MeterType.WATER]

        print(f"  ✓ 电费账单: {len(electric_bills)} 笔")
        print(f"  ✓ 水费账单: {len(water_bills)} 笔")
        print(f"  ✓ 电费合计: {result.total_billed_amount.get(MeterType.ELECTRIC, 0):.2f} 元")
        print(f"  ✓ 水费合计: {result.total_billed_amount.get(MeterType.WATER, 0):.2f} 元")

        if electric_bills:
            first_bill = electric_bills[0]
            print(f"\n  首笔账单示例 ({first_bill.shop_name}):")
            print(f"    总金额: {first_bill.total_amount:.2f} 元")
            for item in first_bill.items:
                print(f"      - {item.item_name}: {item.amount:.2f} 元")
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        traceback.print_exc()
        return False

    print("\n[5/8] 账单编号稳定性测试...")
    try:
        apply_anomalies_to_bills(result.bills, anomalies_by_shop)
        mark_disputed_shops(result.bills, disputed)
        assign_bill_numbers(result.bills, billing_month, use_sequential=True)

        first_run_nos = [b.bill_no for b in sorted(result.bills, key=lambda x: x.bill_no)]

        assign_bill_numbers(result.bills, billing_month, use_sequential=True)
        second_run_nos = [b.bill_no for b in sorted(result.bills, key=lambda x: x.bill_no)]

        if first_run_nos == second_run_nos:
            print(f"  ✓ 顺序编号稳定: 两次运行结果一致 ({len(first_run_nos)} 个编号)")
        else:
            print(f"  ✗ 顺序编号不稳定")
            return False

        hash_nos = set()
        for bill in result.bills:
            no = generate_bill_no(bill.shop_id, billing_month, bill.meter_type)
            hash_nos.add(no)
        if len(hash_nos) == len(result.bills):
            print(f"  ✓ 哈希编号唯一: {len(hash_nos)} 个唯一编号")
        else:
            print(f"  ✗ 哈希编号有重复")
            return False

        disputed_count = len([b for b in result.bills if b.status == BillStatus.DISPUTED])
        abnormal_count = len([b for b in result.bills if b.anomalies])
        print(f"  ✓ 争议账单: {disputed_count} 笔")
        print(f"  ✓ 异常账单: {abnormal_count} 笔")
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        traceback.print_exc()
        return False

    print("\n[6/8] 商户账单导出测试...")
    try:
        output_dir = os.path.join(test_dir, "bills")
        shop_files = export_shop_bills(result, output_dir, format="excel")
        for f in shop_files:
            size = os.path.getsize(f)
            print(f"  ✓ {os.path.basename(f)} ({size} 字节)")
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        traceback.print_exc()
        return False

    print("\n[7/8] 内部报告导出测试...")
    try:
        report_path = export_internal_report(result, output_dir)
        size = os.path.getsize(report_path)
        print(f"  ✓ {os.path.basename(report_path)} ({size} 字节)")

        import pandas as pd
        xl = pd.ExcelFile(report_path)
        print(f"  ✓ Sheet列表: {xl.sheet_names}")
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        traceback.print_exc()
        return False

    print("\n[8/8] 费用解释单测试...")
    try:
        explain_dir = os.path.join(test_dir, "explanations")
        explain_files = export_all_explanations(result, explain_dir)
        print(f"  ✓ 生成 {len(explain_files)} 份解释单")

        if explain_files:
            sample_file = explain_files[0]
            print(f"\n  示例解释单 ({os.path.basename(sample_file)}):")
            with open(sample_file, "r", encoding="utf-8") as f:
                content = f.read()
                for line in content.split("\n")[:15]:
                    print(f"    {line}")
                print(f"    ... (共 {len(content)} 字符)")
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        traceback.print_exc()
        return False

    print("\n" + "=" * 60)
    print("✅ 所有测试通过！")
    print("=" * 60)
    print(f"\n测试输出目录: {test_dir}")
    print(f"  - 示例数据: {sample_dir}/")
    print(f"  - 商户账单: {output_dir}/")
    print(f"  - 内部报告: {report_path}")
    print(f"  - 费用解释单: {explain_dir}/")
    return True


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
