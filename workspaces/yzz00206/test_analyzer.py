#!/usr/bin/env python3
"""
种子批次发芽率脚本 - 验收测试
覆盖场景：单条成功、批量部分失败、人工复核、重复提交
核对：控制台输出、结果文件、坏行隔离、复核入口
"""

import csv
import json
import os
import sys
import tempfile
import shutil


TEST_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_BASE = os.path.join(TEST_DIR, 'test_output')

sys.path.insert(0, TEST_DIR)
from germination_analyzer import SeedGerminationAnalyzer


def create_test_file(filename, content, dirpath):
    filepath = os.path.join(dirpath, filename)
    with open(filepath, 'w', encoding='utf-8-sig') as f:
        f.write(content)
    return filepath


def run_test(test_name, raw_content, dict_content, threshold_content,
             expected_valid, expected_bad, expected_review,
             period_start=None, period_end=None):
    print(f"\n{'='*60}")
    print(f"【测试场景】{test_name}")
    print('='*60)

    test_dir = os.path.join(OUTPUT_BASE, test_name.replace(' ', '_'))
    os.makedirs(test_dir, exist_ok=True)

    raw_file = create_test_file('raw.csv', raw_content, test_dir)
    dict_file = create_test_file('dict.csv', dict_content, test_dir)
    threshold_file = create_test_file('threshold.json', threshold_content, test_dir)
    output_dir = os.path.join(test_dir, 'output')

    analyzer = SeedGerminationAnalyzer(
        raw_file=raw_file,
        dict_file=dict_file,
        threshold_file=threshold_file,
        period_start=period_start,
        period_end=period_end,
        output_dir=output_dir,
    )
    result = analyzer.run()

    print(f"\n--- 结果验证 ---")
    all_pass = True

    checks = [
        ('有效记录数', result['valid_records'], expected_valid),
        ('坏数据数', result['bad_records'], expected_bad),
        ('待复核数', result['review_records'], expected_review),
    ]

    for name, actual, expected in checks:
        status = '✓ 通过' if actual == expected else '✗ 失败'
        if actual != expected:
            all_pass = False
        print(f"  {status}: {name} = {actual} (预期 {expected})")

    group_report = os.path.join(output_dir, 'group_report.csv')
    bad_data = os.path.join(output_dir, 'bad_data_list.csv')
    json_result = os.path.join(output_dir, 'result.json')
    review_table = os.path.join(output_dir, 'manual_review_table.csv')

    files = [
        ('分组报表', group_report),
        ('坏数据清单', bad_data),
        ('JSON结果', json_result),
        ('人工复核表', review_table),
    ]

    print(f"\n--- 文件存在性验证 ---")
    for name, path in files:
        exists = os.path.exists(path)
        status = '✓ 存在' if exists else '✗ 缺失'
        if not exists:
            all_pass = False
        print(f"  {status}: {name} -> {os.path.basename(path)}")

    print(f"\n--- 坏数据隔离验证 ---")
    if os.path.exists(bad_data):
        with open(bad_data, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            bad_rows = list(reader)
            print(f"  ✓ 坏数据清单包含 {len(bad_rows)} 条记录")
            if bad_rows:
                print(f"  ✓ 首条坏数据问题类型: {bad_rows[0].get('问题类型', 'N/A')}")

    print(f"\n--- 复核入口验证 ---")
    if os.path.exists(review_table):
        with open(review_table, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            review_rows = list(reader)
            print(f"  ✓ 人工复核表包含 {len(review_rows)} 条待复核记录")
            if review_rows:
                print(f"  ✓ 首条复核原因: {review_rows[0].get('复核原因', 'N/A')[:50]}...")
                print(f"  ✓ 复核状态字段存在: {'复核状态' in review_rows[0]}")
                print(f"  ✓ 复核人字段存在: {'复核人' in review_rows[0]}")
                print(f"  ✓ 复核意见字段存在: {'复核意见' in review_rows[0]}")

    print(f"\n--- JSON结构验证 ---")
    if os.path.exists(json_result):
        with open(json_result, 'r', encoding='utf-8') as f:
            data = json.load(f)
            keys = list(data.keys())
            print(f"  ✓ JSON包含顶层键: {', '.join(keys)}")
            has_group = '分组统计' in data
            has_detail = '有效记录明细' in data
            has_bad = '坏数据明细' in data
            has_review = '待复核明细' in data
            print(f"  ✓ 分组统计: {'有' if has_group else '无'}")
            print(f"  ✓ 有效记录明细: {'有' if has_detail else '无'}")
            print(f"  ✓ 坏数据明细: {'有' if has_bad else '无'}")
            print(f"  ✓ 待复核明细: {'有' if has_review else '无'}")

    final_status = '全部通过 ✓' if all_pass else '存在失败 ✗'
    print(f"\n>>> {test_name}: {final_status}")
    return all_pass


def test_single_success():
    """场景1: 单条成功 - 只有一条完全正常的记录"""
    raw = """记录编号,批次编号,品种编号,试验日期,培养皿编号,种子粒数,发芽粒数,试验员,备注
R001,B202401001,V001,2024-01-15,P01,100,92,张三,正常
"""
    dict_content = """品种编号,品种名称,作物类型,供应商编号,供应商名称
V001,郑单958,玉米,S001,河南金博士种业
"""
    threshold = json.dumps({
        "germination_rate": {
            "excellent": 90, "qualified": 85, "min_acceptable": 70,
            "max_possible": 100, "min_possible": 0
        },
        "seed_count": {"min": 1, "max": 1000, "standard_per_petri": 100},
        "review_triggers": {
            "below_qualified": True, "abnormal_count": True, "data_quality_issue": True
        }
    }, ensure_ascii=False)

    return run_test(
        '单条成功',
        raw, dict_content, threshold,
        expected_valid=1, expected_bad=0, expected_review=0
    )


def test_batch_partial_failure():
    """场景2: 批量部分失败 - 多条记录，部分正常部分有问题"""
    raw = """记录编号,批次编号,品种编号,试验日期,培养皿编号,种子粒数,发芽粒数,试验员,备注
R001,B202401001,V001,2024-01-15,P01,100,92,张三,正常
R002,B202401001,V001,2024-01-15,P02,100,88,张三,正常
R003,B202401001,V001,2024-01-16,P03,,80,李四,种子粒数缺失
R004,B202401002,V002,2024-01-15,P01,100,78,王五,偏低
R005,B202401002,V002,2024-01-16,P02,100,105,王五,越界
R006,B202401002,V002,2024-01-16,P03,100,85,王五,刚好合格
"""
    dict_content = """品种编号,品种名称,作物类型,供应商编号,供应商名称
V001,郑单958,玉米,S001,河南金博士种业
V002,登海605,玉米,S002,山东登海种业
"""
    threshold = json.dumps({
        "germination_rate": {
            "excellent": 90, "qualified": 85, "min_acceptable": 70,
            "max_possible": 100, "min_possible": 0
        },
        "seed_count": {"min": 1, "max": 1000, "standard_per_petri": 100},
        "review_triggers": {
            "below_qualified": True, "abnormal_count": True, "data_quality_issue": True
        }
    }, ensure_ascii=False)

    return run_test(
        '批量部分失败',
        raw, dict_content, threshold,
        expected_valid=4, expected_bad=2, expected_review=3
    )


def test_manual_review():
    """场景3: 人工复核 - 多种触发复核的情况"""
    raw = """记录编号,批次编号,品种编号,试验日期,培养皿编号,种子粒数,发芽粒数,试验员,备注
R001,B202401001,V001,2024-01-15,P01,100,92,张三,优秀 正常
R002,B202401001,V001,2024-01-15,P02,100,80,张三,低于合格线
R003,B202401001,V001,2024-01-16,P03,50,45,李四,种子数偏离标准
R004,B202401002,V002,2024-01-15,P01,100,65,王五,严重不合格
R005,B202401002,V002,2024-01-16,P02,100,88,王五,正常合格
"""
    dict_content = """品种编号,品种名称,作物类型,供应商编号,供应商名称
V001,郑单958,玉米,S001,河南金博士种业
V002,登海605,玉米,S002,山东登海种业
"""
    threshold = json.dumps({
        "germination_rate": {
            "excellent": 90, "qualified": 85, "min_acceptable": 70,
            "max_possible": 100, "min_possible": 0
        },
        "seed_count": {"min": 1, "max": 1000, "standard_per_petri": 100},
        "review_triggers": {
            "below_qualified": True, "abnormal_count": True, "data_quality_issue": True
        }
    }, ensure_ascii=False)

    return run_test(
        '人工复核',
        raw, dict_content, threshold,
        expected_valid=5, expected_bad=0, expected_review=3
    )


def test_duplicate_submission():
    """场景4: 重复提交 - 相同记录重复出现"""
    raw = """记录编号,批次编号,品种编号,试验日期,培养皿编号,种子粒数,发芽粒数,试验员,备注
R001,B202401001,V001,2024-01-15,P01,100,92,张三,原始记录
R002,B202401001,V001,2024-01-15,P02,100,88,张三,正常
R001,B202401001,V001,2024-01-15,P01,100,92,张三,第一次重复
R003,B202401002,V002,2024-01-16,P01,100,85,李四,正常
R001,B202401001,V001,2024-01-15,P01,100,92,张三,第二次重复
"""
    dict_content = """品种编号,品种名称,作物类型,供应商编号,供应商名称
V001,郑单958,玉米,S001,河南金博士种业
V002,登海605,玉米,S002,山东登海种业
"""
    threshold = json.dumps({
        "germination_rate": {
            "excellent": 90, "qualified": 85, "min_acceptable": 70,
            "max_possible": 100, "min_possible": 0
        },
        "seed_count": {"min": 1, "max": 1000, "standard_per_petri": 100},
        "review_triggers": {
            "below_qualified": True, "abnormal_count": True, "data_quality_issue": True
        }
    }, ensure_ascii=False)

    return run_test(
        '重复提交',
        raw, dict_content, threshold,
        expected_valid=3, expected_bad=2, expected_review=2
    )


def test_period_filter():
    """附加场景: 统计周期过滤"""
    raw = """记录编号,批次编号,品种编号,试验日期,培养皿编号,种子粒数,发芽粒数,试验员,备注
R001,B202401001,V001,2024-01-10,P01,100,92,张三,周期前
R002,B202401001,V001,2024-01-15,P02,100,88,张三,周期内
R003,B202401001,V001,2024-01-20,P03,100,95,张三,周期内
R004,B202401002,V002,2024-01-25,P01,100,78,王五,周期后
"""
    dict_content = """品种编号,品种名称,作物类型,供应商编号,供应商名称
V001,郑单958,玉米,S001,河南金博士种业
V002,登海605,玉米,S002,山东登海种业
"""
    threshold = json.dumps({
        "germination_rate": {
            "excellent": 90, "qualified": 85, "min_acceptable": 70,
            "max_possible": 100, "min_possible": 0
        },
        "seed_count": {"min": 1, "max": 1000, "standard_per_petri": 100},
        "review_triggers": {
            "below_qualified": True, "abnormal_count": True, "data_quality_issue": True
        }
    }, ensure_ascii=False)

    return run_test(
        '统计周期过滤',
        raw, dict_content, threshold,
        expected_valid=2, expected_bad=2, expected_review=0,
        period_start='2024-01-15', period_end='2024-01-20'
    )


def main():
    print("*" * 60)
    print("种子批次发芽率脚本 - 验收测试套件")
    print("*" * 60)

    if os.path.exists(OUTPUT_BASE):
        shutil.rmtree(OUTPUT_BASE)
    os.makedirs(OUTPUT_BASE)

    tests = [
        ('单条成功', test_single_success),
        ('批量部分失败', test_batch_partial_failure),
        ('人工复核', test_manual_review),
        ('重复提交', test_duplicate_submission),
        ('统计周期过滤', test_period_filter),
    ]

    results = {}
    for name, test_func in tests:
        try:
            results[name] = test_func()
        except Exception as e:
            print(f"\n✗ {name}: 执行异常 - {e}")
            import traceback
            traceback.print_exc()
            results[name] = False

    print(f"\n{'='*60}")
    print("测试汇总")
    print('='*60)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    for name, result in results.items():
        status = '✓ 通过' if result else '✗ 失败'
        print(f"  {status}: {name}")
    print(f"\n总计: {passed}/{total} 通过")

    if passed == total:
        print("\n🎉 所有测试通过！")
    else:
        print(f"\n⚠️  有 {total - passed} 个测试失败，请检查")

    return 0 if passed == total else 1


if __name__ == '__main__':
    sys.exit(main())
