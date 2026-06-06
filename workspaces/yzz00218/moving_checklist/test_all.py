#!/usr/bin/env python3
"""测试脚本：验证幂等性、可追溯性、边界条件"""

import sys
import os
import hashlib
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.models import (
    load_items_from_json, load_config_from_json,
    generate_trace_id, generate_batch_no, ParameterConfig
)
from core.generator import Generator, compute_items_hash
from core.validator import Validator
from core.summary import SummaryViewer
from core.exporter import Exporter


def test_idempotency():
    """测试幂等性：同一输入重复执行结果完全一致"""
    print("=" * 60)
    print("测试1: 幂等性验证")
    print("=" * 60)

    items = load_items_from_json("data/samples/compliant/items.json")
    config = load_config_from_json("data/samples/default_config.json")

    gen = Generator(config, "北京-朝阳仓")
    result1 = gen.generate(items)

    with open("/tmp/test_result1.json", "w", encoding="utf-8") as f:
        json.dump(result1.to_dict(), f, ensure_ascii=False, sort_keys=True)

    result2 = gen.generate(items, prev_result_path="/tmp/test_result1.json")

    with open("/tmp/test_result2.json", "w", encoding="utf-8") as f:
        json.dump(result2.to_dict(), f, ensure_ascii=False, sort_keys=True)

    with open("/tmp/test_result1.json", "rb") as f:
        h1 = hashlib.md5(f.read()).hexdigest()
    with open("/tmp/test_result2.json", "rb") as f:
        h2 = hashlib.md5(f.read()).hexdigest()

    print(f"  第一次结果MD5:  {h1}")
    print(f"  第二次结果MD5:  {h2}")
    print(f"  完全一致:       {'✓ 通过' if h1 == h2 else '✗ 失败'}")
    print(f"  批次号相同:     {'✓ 通过' if result1.batch_no == result2.batch_no else '✗ 失败'}")
    print(f"  通过数量相同:   {'✓ 通过' if result1.passed_count == result2.passed_count else '✗ 失败'}")
    print(f"  问题数量相同:   {'✓ 通过' if len(result1.issues) == len(result2.issues) else '✗ 失败'}")
    print()
    return h1 == h2


def test_traceability():
    """测试可追溯编号：同一物品同一批次trace_id相同"""
    print("=" * 60)
    print("测试2: 可追溯编号验证")
    print("=" * 60)

    source = "测试仓库"
    item_id = "ITEM001"
    batch_no = "B20250101000000ABCDEF"

    trace_id1 = generate_trace_id(source, item_id, batch_no)
    trace_id2 = generate_trace_id(source, item_id, batch_no)
    trace_id3 = generate_trace_id("其他仓库", item_id, batch_no)
    trace_id4 = generate_trace_id(source, "ITEM002", batch_no)
    trace_id5 = generate_trace_id(source, item_id, "B20250102000000XYZ123")

    print(f"  相同输入生成相同ID: {'✓ 通过' if trace_id1 == trace_id2 else '✗ 失败'}")
    print(f"  不同来源产生不同ID: {'✓ 通过' if trace_id1 != trace_id3 else '✗ 失败'}")
    print(f"  不同物品产生不同ID: {'✓ 通过' if trace_id1 != trace_id4 else '✗ 失败'}")
    print(f"  不同批次产生不同ID: {'✓ 通过' if trace_id1 != trace_id5 else '✗ 失败'}")
    print(f"  追溯ID格式: {trace_id1}")
    print(f"  追溯ID长度: {len(trace_id1)}字符")
    print()

    items = load_items_from_json("data/samples/compliant/items.json")
    config = load_config_from_json("data/samples/default_config.json")
    validator = Validator(config, batch_no, source)
    validator.validate(items)
    issues = validator.get_issues()

    all_have_trace = all(issue.trace_id for issue in issues)
    all_have_batch = all(issue.batch_no for issue in issues)
    all_have_source = all(issue.source for issue in issues)

    print(f"  问题都有追溯号: {'✓ 通过' if all_have_trace else '✗ 失败'}")
    print(f"  问题都有批次号: {'✓ 通过' if all_have_batch else '✗ 失败'}")
    print(f"  问题都有来源标识: {'✓ 通过' if all_have_source else '✗ 失败'}")
    print()

    return trace_id1 == trace_id2 and trace_id1 != trace_id3


def test_boundary_conditions():
    """测试边界条件"""
    print("=" * 60)
    print("测试3: 边界条件验证")
    print("=" * 60)

    config = load_config_from_json("data/samples/default_config.json")
    batch_no = generate_batch_no()
    source = "边界测试仓"
    validator = Validator(config, batch_no, source)

    from core.models import MovingItem

    boundary_items = [
        MovingItem(
            item_id="BND001",
            name="刚好等于最大重量",
            category="家具",
            quantity=1,
            weight_kg=200.0,
            volume_cbm=1.0,
            value=1000.0,
            source=source,
        ),
        MovingItem(
            item_id="BND002",
            name="刚好等于最小数量",
            category="家具",
            quantity=1,
            weight_kg=10.0,
            volume_cbm=0.1,
            value=100.0,
            source=source,
        ),
        MovingItem(
            item_id="BND003",
            name="零重量",
            category="杂物",
            quantity=1,
            weight_kg=0.0,
            volume_cbm=0.0,
            value=0.0,
            source=source,
        ),
        MovingItem(
            item_id="BND004",
            name="刚好等于最大体积",
            category="家具",
            quantity=1,
            weight_kg=50.0,
            volume_cbm=5.0,
            value=1000.0,
            source=source,
        ),
    ]

    passed, failed = validator.validate(boundary_items)
    issues = validator.get_issues()

    print(f"  边界物品总数:   {len(boundary_items)}")
    print(f"  通过数量:       {len(passed)}")
    print(f"  异常数量:       {len(failed)}")
    print(f"  问题总数:       {len(issues)}")
    print(f"  刚好最大重量通过: {'✓ 通过' if any(i.item_id == 'BND001' for i in passed) else '✗ 失败'}")
    print(f"  刚好最小数量通过: {'✓ 通过' if any(i.item_id == 'BND002' for i in passed) else '✗ 失败'}")
    print(f"  零重量零体积通过: {'✓ 通过' if any(i.item_id == 'BND003' for i in passed) else '✗ 失败'}")
    print(f"  刚好最大体积通过: {'✓ 通过' if any(i.item_id == 'BND004' for i in passed) else '✗ 失败'}")
    print()

    return len(passed) == 4 and len(failed) == 0


def test_error_handling():
    """测试失败提示和错误处理"""
    print("=" * 60)
    print("测试4: 错误处理验证")
    print("=" * 60)

    all_passed = True

    try:
        load_items_from_json("/nonexistent/file.json")
        print("  不存在的文件:    ✗ 失败（应抛出异常）")
        all_passed = False
    except Exception as e:
        print(f"  不存在的文件:    ✓ 通过（正确抛出异常: {type(e).__name__}）")

    try:
        load_config_from_json("/nonexistent/config.json")
        print("  不存在的配置:    ✗ 失败（应抛出异常）")
        all_passed = False
    except Exception as e:
        print(f"  不存在的配置:    ✓ 通过（正确抛出异常: {type(e).__name__}）")

    empty_items = []
    config = ParameterConfig()
    gen = Generator(config, "空数据测试")
    result = gen.generate(empty_items)

    print(f"  空输入物品数:    {result.total_count}（应为0）")
    print(f"  空输入通过数:    {result.passed_count}（应为0）")
    print(f"  空输入异常数:    {result.failed_count}（应为0）")
    all_passed = all_passed and result.total_count == 0

    print(f"  错误处理总评:    {'✓ 通过' if all_passed else '✗ 失败'}")
    print()

    return all_passed


def test_sample_data():
    """测试四类样例数据"""
    print("=" * 60)
    print("测试5: 样例数据验证")
    print("=" * 60)

    config = load_config_from_json("data/samples/default_config.json")
    batch_no = generate_batch_no()

    test_cases = [
        ("合规样例", "data/samples/compliant/items.json", "北京-朝阳仓", 0, 0),
        ("超阈值样例", "data/samples/over_threshold/items.json", "上海-浦东仓", 4, 3),
        ("材料缺失样例", "data/samples/missing_material/items.json", "广州-天河仓", 8, 0),
    ]

    all_passed = True

    for name, path, source, exp_errors, exp_warnings in test_cases:
        items = load_items_from_json(path)
        validator = Validator(config, batch_no, source)
        validator.validate(items)
        errors = validator.get_error_count()
        warnings = validator.get_warning_count()

        status = "✓ 通过" if errors == exp_errors and warnings == exp_warnings else "✗ 失败"
        print(f"  {name}:")
        print(f"    物品数: {len(items)}, 错误: {errors}/{exp_errors}, 警告: {warnings}/{exp_warnings}")
        print(f"    结果: {status}")

        if errors != exp_errors or warnings != exp_warnings:
            all_passed = False

    print()

    return all_passed


def test_export():
    """测试导出功能"""
    print("=" * 60)
    print("测试6: 导出功能验证")
    print("=" * 60)

    items = load_items_from_json("data/samples/compliant/items.json")
    config = load_config_from_json("data/samples/default_config.json")
    gen = Generator(config, "导出测试")
    result = gen.generate(items)

    exporter = Exporter("/tmp/test_export")
    files = exporter.export_all(result.to_dict(), "csv")

    all_exist = all(os.path.exists(path) for path in files.values())
    all_csv = all(path.endswith(".csv") for path in files.values())

    print(f"  导出文件数:      {len(files)}")
    print(f"  文件都存在:      {'✓ 通过' if all_exist else '✗ 失败'}")
    print(f"  都是CSV格式:     {'✓ 通过' if all_csv else '✗ 失败'}")

    for name, path in files.items():
        size = os.path.getsize(path) if os.path.exists(path) else 0
        print(f"    {name:8s}: {path} ({size} bytes)")

    print()

    return all_exist


def test_summary():
    """测试摘要功能"""
    print("=" * 60)
    print("测试7: 摘要功能验证")
    print("=" * 60)

    items = load_items_from_json("data/samples/compliant/items.json")
    config = load_config_from_json("data/samples/default_config.json")
    gen = Generator(config, "摘要测试")
    result = gen.generate(items)

    result_dict = result.to_dict()

    formatted = SummaryViewer.format_summary(result_dict, detailed=True)
    has_title = "跨城搬家物品清单" in formatted
    has_batch = "批次号" in formatted
    has_source = "来源标识" in formatted
    has_stats = "总重量" in formatted and "总体积" in formatted

    exit_code = SummaryViewer.get_exit_code(result_dict)

    print(f"  包含标题:        {'✓ 通过' if has_title else '✗ 失败'}")
    print(f"  包含批次号:      {'✓ 通过' if has_batch else '✗ 失败'}")
    print(f"  包含来源标识:    {'✓ 通过' if has_source else '✗ 失败'}")
    print(f"  包含统计数据:    {'✓ 通过' if has_stats else '✗ 失败'}")
    print(f"  合规结果退出码:  {exit_code}（应为0）{'✓ 通过' if exit_code == 0 else '✗ 失败'}")

    items2 = load_items_from_json("data/samples/missing_material/items.json")
    result2 = gen.generate(items2)
    exit_code2 = SummaryViewer.get_exit_code(result2.to_dict())
    print(f"  异常结果退出码:  {exit_code2}（应为1）{'✓ 通过' if exit_code2 == 1 else '✗ 失败'}")

    print()

    return exit_code == 0 and exit_code2 == 1


def test_force_regenerate():
    """测试强制重新生成"""
    print("=" * 60)
    print("测试8: 强制重新生成验证")
    print("=" * 60)

    items = load_items_from_json("data/samples/compliant/items.json")
    config = load_config_from_json("data/samples/default_config.json")
    gen = Generator(config, "强制生成测试")

    result1 = gen.generate(items)
    result1_dict = result1.to_dict()

    with open("/tmp/force_test.json", "w", encoding="utf-8") as f:
        json.dump(result1_dict, f, ensure_ascii=False)

    result2 = gen.generate(items, prev_result_path="/tmp/force_test.json", force_regenerate=True)

    batch_different = result1.batch_no != result2.batch_no
    print(f"  强制生成新批次:  {'✓ 通过' if batch_different else '✗ 失败'}")
    print(f"    批次1: {result1.batch_no}")
    print(f"    批次2: {result2.batch_no}")

    print()

    return batch_different


def main():
    """主测试函数"""
    print("\n" + "=" * 60)
    print("  跨城搬家物品清单 CLI - 综合测试")
    print("=" * 60)
    print()

    results = []

    results.append(("幂等性", test_idempotency()))
    results.append(("可追溯编号", test_traceability()))
    results.append(("边界条件", test_boundary_conditions()))
    results.append(("错误处理", test_error_handling()))
    results.append(("样例数据", test_sample_data()))
    results.append(("导出功能", test_export()))
    results.append(("摘要功能", test_summary()))
    results.append(("强制生成", test_force_regenerate()))

    print("=" * 60)
    print("  测试结果汇总")
    print("=" * 60)

    passed = 0
    for name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"  {name:12s}: {status}")
        if result:
            passed += 1

    total = len(results)
    print()
    print(f"  总计: {passed}/{total} 通过")
    print("=" * 60)

    return 0 if passed == total else 1


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    sys.exit(main())
