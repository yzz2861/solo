import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date
from energy_allocation.models import MeterReading, MeterType, ShopArea, AnomalyType
from energy_allocation.anomaly_detector import detect_anomalies
from energy_allocation.sample_data import generate_sample_data
from energy_allocation.importer import import_readings, import_shop_areas, import_allocation_rules
from energy_allocation.allocation_engine import AllocationEngine
from energy_allocation.anomaly_detector import apply_anomalies_to_bills, mark_disputed_shops
from energy_allocation.bill_number import assign_bill_numbers
from energy_allocation.exporter import export_internal_report


def test_rename_from_memory():
    print("=" * 60)
    print("测试1: 内存构造最小改名场景")
    print("=" * 60)

    readings = [
        MeterReading("EM-001", MeterType.ELECTRIC, "S001", "旧名咖啡", date(2024, 6, 30),
                     5650.0, 5200.0, False),
        MeterReading("WM-001", MeterType.WATER, "S001", "旧名咖啡", date(2024, 6, 30),
                     120.0, 85.0, False),
    ]

    shops = [
        ShopArea("S001", "新名咖啡", 120.5, "1F", True),
    ]

    anomalies_by_shop, anomaly_details = detect_anomalies(readings, shops, "2024-06")

    rename_anomalies = [a for a in anomaly_details if a["anomaly_type"] == AnomalyType.SHOP_RENAMED.value]

    if rename_anomalies:
        print(f"  ✓ 检测到改名异常: {len(rename_anomalies)} 条")
        for a in rename_anomalies:
            print(f"    - shop_id={a['shop_id']}, reading_name={a.get('reading_name')}, area_name={a.get('area_name')}")
            print(f"      描述: {a['description']}")
        assert rename_anomalies[0]["reading_name"] == "旧名咖啡"
        assert rename_anomalies[0]["area_name"] == "新名咖啡"
        print("  ✓ 字段值正确：reading_name=旧名咖啡, area_name=新名咖啡")
    else:
        print("  ✗ 未检测到改名异常！")
        return False

    assert AnomalyType.SHOP_RENAMED in anomalies_by_shop.get("S001", [])
    print("  ✓ S001 的异常列表包含 SHOP_RENAMED")

    print()
    return True


def test_rename_in_excel_output():
    print("=" * 60)
    print("测试2: 完整流程 — 改名异常写入Excel异常清单")
    print("=" * 60)

    test_dir = os.path.join(os.path.dirname(__file__), "test_output_rename")
    sample_dir = os.path.join(test_dir, "sample_data")
    output_dir = os.path.join(test_dir, "output")

    files = generate_sample_data(sample_dir, "2024-06")
    readings = import_readings(files["readings"])
    shops = import_shop_areas(files["shops"])
    rules = import_allocation_rules(files["rules"])

    print(f"  读数记录: {len(readings)} 条")
    print(f"  店铺信息: {len(shops)} 家")

    anomalies_by_shop, anomaly_details = detect_anomalies(readings, shops, "2024-06")

    rename_anomalies = [a for a in anomaly_details if a["anomaly_type"] == AnomalyType.SHOP_RENAMED.value]
    print(f"  改名异常: {len(rename_anomalies)} 条")

    if not rename_anomalies:
        print("  ✗ 改名异常未检测到！")
        return False

    for a in rename_anomalies:
        print(f"    - [{a['shop_id']}] {a['description']}")

    engine = AllocationEngine(readings, shops, rules, "2024-06")
    result = engine.allocate()
    result.anomalies = anomaly_details
    apply_anomalies_to_bills(result.bills, anomalies_by_shop)
    assign_bill_numbers(result.bills, "2024-06")

    report_path = export_internal_report(result, output_dir)
    print(f"  内部报告: {report_path}")

    import pandas as pd
    df_anomaly = pd.read_excel(report_path, sheet_name="异常清单")
    rename_rows = df_anomaly[df_anomaly["anomaly_type"] == "shop_renamed"]
    print(f"  Excel异常清单中改名记录: {len(rename_rows)} 行")

    if len(rename_rows) == 0:
        print("  ✗ Excel异常清单中无改名记录！")
        print(f"  异常清单内容:")
        print(df_anomaly.to_string(index=False))
        return False

    for _, row in rename_rows.iterrows():
        print(f"    - shop_id={row['shop_id']}, reading_name={row.get('reading_name', 'N/A')}, area_name={row.get('area_name', 'N/A')}")
        print(f"      描述: {row['description']}")

    print("  ✓ 改名记录已成功写入Excel异常清单")
    print()
    return True


def test_other_anomalies_unchanged():
    print("=" * 60)
    print("测试3: 原有异常类型不受影响")
    print("=" * 60)

    from energy_allocation.sample_data import generate_sample_data
    from energy_allocation.importer import import_readings, import_shop_areas

    test_dir = os.path.join(os.path.dirname(__file__), "test_output_rename")
    sample_dir = os.path.join(test_dir, "sample_data")
    files = generate_sample_data(sample_dir, "2024-06")
    readings = import_readings(files["readings"])
    shops = import_shop_areas(files["shops"])

    _, anomaly_details = detect_anomalies(readings, shops, "2024-06")

    types_found = set(a["anomaly_type"] for a in anomaly_details)
    print(f"  检测到的异常类型: {sorted(types_found)}")

    expected = {"reading_reversal", "missing_previous", "shop_closed_mid_month", "zero_area", "shop_renamed"}
    missing = expected - types_found
    if missing:
        print(f"  ✗ 缺少异常类型: {missing}")
        return False

    print(f"  ✓ 所有5类异常均检测到（含新增的shop_renamed）")
    print()
    return True


if __name__ == "__main__":
    results = []
    results.append(("内存最小场景", test_rename_from_memory()))
    results.append(("Excel输出验证", test_rename_in_excel_output()))
    results.append(("原有异常不变", test_other_anomalies_unchanged()))

    print("=" * 60)
    print("改名检测测试汇总")
    print("=" * 60)
    all_pass = True
    for name, ok in results:
        status = "✅ 通过" if ok else "❌ 失败"
        print(f"  {name}: {status}")
        if not ok:
            all_pass = False

    if all_pass:
        print("\n✅ 全部通过！")
    else:
        print("\n❌ 有测试失败")

    sys.exit(0 if all_pass else 1)
