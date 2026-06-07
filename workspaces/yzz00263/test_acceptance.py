#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import csv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from garbage_supervision import GarbageSupervisionAnalyzer


class TestResult:
    def __init__(self, name):
        self.name = name
        self.passed = True
        self.failures = []

    def assert_true(self, condition, message):
        if not condition:
            self.passed = False
            self.failures.append(f'FAIL: {message}')
        else:
            print(f'  ✓ {message}')

    def assert_equal(self, actual, expected, message):
        if actual != expected:
            self.passed = False
            self.failures.append(f'FAIL: {message} (期望: {expected}, 实际: {actual})')
        else:
            print(f'  ✓ {message}')

    def summary(self):
        status = '通过' if self.passed else '失败'
        print(f'\n【{self.name}】测试结果: {status}')
        if not self.passed:
            for f in self.failures:
                print(f'  {f}')
        return self.passed


def test_compliant_sample():
    """测试1: 合规样例 - 所有数据应全部正常"""
    print('\n' + '=' * 60)
    print('测试1: 合规样例验收')
    print('=' * 60)

    result = TestResult('合规样例')

    analyzer = GarbageSupervisionAnalyzer('config.yaml')
    analyzer.run_analysis(['logs/source_a_compliant.csv'])

    result.assert_equal(len(analyzer.records), 10, '应加载10条记录')
    result.assert_equal(len(analyzer.bad_records), 0, '应无异常记录')
    result.assert_equal(len(analyzer.records) - len(analyzer.bad_records), 10, '正常记录数应为10')

    result.assert_true('阳光花园' in analyzer.summary, '应包含阳光花园小区')
    result.assert_true('翠湖小区' in analyzer.summary, '应包含翠湖小区')

    yg = analyzer.summary['阳光花园']
    result.assert_equal(yg['total_records'], 8, '阳光花园应有8条记录')
    result.assert_equal(yg['bad_data_count'], 0, '阳光花园应无异常数据')

    ch = analyzer.summary['翠湖小区']
    result.assert_equal(ch['total_records'], 2, '翠湖小区应有2条记录')
    result.assert_equal(ch['bad_data_count'], 0, '翠湖小区应无异常数据')

    result.assert_true('可回收物' in yg['by_category'], '应包含可回收物分类')
    result.assert_true('厨余垃圾' in yg['by_category'], '应包含厨余垃圾分类')

    group_report = analyzer.generate_group_report()
    result.assert_true('分组报表' in group_report, '分组报表应包含标题')
    result.assert_true('阳光花园' in group_report, '分组报表应包含阳光花园')
    result.assert_true('督导员统计' in group_report, '分组报表应包含督导员统计')

    bad_data_list = analyzer.generate_bad_data_list()
    result.assert_true('坏数据清单' in bad_data_list, '坏数据清单应包含标题')
    result.assert_true('坏数据总数: 0' in bad_data_list, '坏数据总数应为0')

    json_result = json.loads(analyzer.generate_json_result())
    result.assert_equal(json_result['total_records'], 10, 'JSON中总记录数正确')
    result.assert_equal(json_result['bad_records'], 0, 'JSON中异常记录数正确')
    result.assert_true('community_summary' in json_result, 'JSON应包含小区汇总')

    review_table = analyzer.generate_review_table()
    lines = review_table.strip().split('\n')
    result.assert_equal(len(lines), 1, '复核表应只有表头（无坏数据）')
    result.assert_true('记录ID' in lines[0], '复核表应包含记录ID列')
    result.assert_true('问题类型' in lines[0], '复核表应包含问题类型列')
    result.assert_true('复核状态' in lines[0], '复核表应包含复核状态列')

    return result.summary()


def test_threshold_sample():
    """测试2: 超阈值样例 - 越界数据应被正确标注"""
    print('\n' + '=' * 60)
    print('测试2: 超阈值样例验收')
    print('=' * 60)

    result = TestResult('超阈值样例')

    analyzer = GarbageSupervisionAnalyzer('config.yaml')
    analyzer.run_analysis(['logs/source_b_threshold.csv'])

    result.assert_equal(len(analyzer.records), 7, '应加载7条记录')

    out_of_range_count = sum(
        1 for r in analyzer.bad_records
        if any('越界' in i for i in r['_issues'])
    )
    result.assert_equal(out_of_range_count, 5, '应有5条越界记录')

    r101 = next((r for r in analyzer.records if r.get('record_id') == 'R101'), None)
    result.assert_true(r101 is not None, '应找到R101记录')
    if r101:
        result.assert_true(r101['_is_bad'], 'R101应被标记为坏数据')
        result.assert_true(
            any('超过上限' in i for i in r101['_issues']),
            'R101应被标记为超过上限'
        )

    r105 = next((r for r in analyzer.records if r.get('record_id') == 'R105'), None)
    result.assert_true(r105 is not None, '应找到R105记录')
    if r105:
        result.assert_true(r105['_is_bad'], 'R105应被标记为坏数据')
        result.assert_true(
            any('低于下限' in i for i in r105['_issues']),
            'R105应被标记为低于下限'
        )

    r106 = next((r for r in analyzer.records if r.get('record_id') == 'R106'), None)
    result.assert_true(r106 is not None, '应找到R106记录')
    if r106:
        result.assert_true(not r106['_is_bad'], 'R106(0.5kg有害垃圾)应为正常数据')

    r107 = next((r for r in analyzer.records if r.get('record_id') == 'R107'), None)
    result.assert_true(r107 is not None, '应找到R107记录')
    if r107:
        result.assert_true(not r107['_is_bad'], 'R107(750kg其他垃圾)应为正常数据（阈值800）')

    bad_data_list = analyzer.generate_bad_data_list()
    result.assert_true('重量越界' in bad_data_list, '坏数据清单应包含重量越界统计')
    result.assert_true('R101' in bad_data_list, '坏数据清单应包含R101')
    result.assert_true('R105' in bad_data_list, '坏数据清单应包含R105')

    json_result = json.loads(analyzer.generate_json_result())
    result.assert_equal(json_result['bad_records'], 5, 'JSON中异常记录数应为5')
    bad_detail = json_result['bad_data_details']
    result.assert_true(len(bad_detail) > 0, 'JSON应包含坏数据详情')
    has_range_issue = any(
        any('越界' in issue for issue in d['issues'])
        for d in bad_detail
    )
    result.assert_true(has_range_issue, 'JSON坏数据详情应包含越界问题')

    review_table = analyzer.generate_review_table()
    lines = review_table.strip().split('\n')
    result.assert_true(len(lines) > 1, '复核表应包含坏数据行')
    has_yuejie = any('越界' in line for line in lines)
    result.assert_true(has_yuejie, '复核表应包含越界类型')

    return result.summary()


def test_missing_sample():
    """测试3: 材料缺失样例 - 缺失、重复、格式错误、无效分类应被正确标注"""
    print('\n' + '=' * 60)
    print('测试3: 材料缺失样例验收')
    print('=' * 60)

    result = TestResult('材料缺失样例')

    analyzer = GarbageSupervisionAnalyzer('config.yaml')
    analyzer.run_analysis(['logs/source_c_missing.csv'])

    result.assert_equal(len(analyzer.records), 12, '应加载12条记录')

    missing_count = sum(
        1 for r in analyzer.bad_records
        if any('缺失字段' in i for i in r['_issues'])
    )
    result.assert_true(missing_count >= 5, '至少应有5条缺失字段记录')

    duplicate_count = sum(
        1 for r in analyzer.bad_records
        if any('重复记录' in i for i in r['_issues'])
    )
    result.assert_equal(duplicate_count, 4, '应有4条重复记录（R001和R002各2条都被标记）')

    invalid_cat_count = sum(
        1 for r in analyzer.bad_records
        if any('无效分类' in i for i in r['_issues'])
    )
    result.assert_equal(invalid_cat_count, 1, '应有1条无效分类记录')

    format_error_count = sum(
        1 for r in analyzer.bad_records
        if any('格式错误' in i for i in r['_issues'])
    )
    result.assert_equal(format_error_count, 1, '应有1条重量格式错误记录')

    r201 = next((r for r in analyzer.records if r.get('record_id') == 'R201'), None)
    result.assert_true(r201 is not None, '应找到R201记录')
    if r201:
        result.assert_true(r201['_is_bad'], 'R201应被标记为坏数据（督导员缺失）')
        result.assert_true(
            any('缺失字段:supervisor' in i for i in r201['_issues']),
            'R201应包含supervisor缺失问题'
        )

    r202 = next((r for r in analyzer.records if r.get('record_id') == 'R202'), None)
    result.assert_true(r202 is not None, '应找到R202记录')
    if r202:
        result.assert_true(r202['_is_bad'], 'R202应被标记为坏数据（楼栋缺失）')
        result.assert_true(
            any('缺失字段:building' in i for i in r202['_issues']),
            'R202应包含building缺失问题'
        )

    r207 = next((r for r in analyzer.records if r.get('record_id') == 'R207'), None)
    result.assert_true(r207 is not None, '应找到R207记录')
    if r207:
        result.assert_true(r207['_is_bad'], 'R207应被标记为坏数据（无效分类）')
        result.assert_true(
            any('无效分类' in i for i in r207['_issues']),
            'R207应包含无效分类问题'
        )

    r208 = next((r for r in analyzer.records if r.get('record_id') == 'R208'), None)
    result.assert_true(r208 is not None, '应找到R208记录')
    if r208:
        result.assert_true(r208['_is_bad'], 'R208应被标记为坏数据（重量格式错误）')
        result.assert_true(
            any('格式错误' in i for i in r208['_issues']),
            'R208应包含格式错误问题'
        )

    bad_data_list = analyzer.generate_bad_data_list()
    result.assert_true('缺失字段' in bad_data_list, '坏数据清单应包含缺失字段统计')
    result.assert_true('重复记录' in bad_data_list, '坏数据清单应包含重复记录统计')
    result.assert_true('无效分类' in bad_data_list, '坏数据清单应包含无效分类统计')
    result.assert_true('格式错误' in bad_data_list, '坏数据清单应包含格式错误统计')

    json_result = json.loads(analyzer.generate_json_result())
    bad_details = json_result['bad_data_details']
    has_missing = any(any('缺失字段' in i for i in d['issues']) for d in bad_details)
    has_duplicate = any(any('重复记录' in i for i in d['issues']) for d in bad_details)
    result.assert_true(has_missing, 'JSON应包含缺失字段问题')
    result.assert_true(has_duplicate, 'JSON应包含重复记录问题')

    review_table = analyzer.generate_review_table()
    lines = review_table.strip().split('\n')
    has_queshi = any('缺失' in line for line in lines)
    has_chongfu = any('重复' in line for line in lines)
    has_wuxiao = any('无效分类' in line for line in lines)
    result.assert_true(has_queshi, '复核表应包含缺失类型')
    result.assert_true(has_chongfu, '复核表应包含重复类型')
    result.assert_true(has_wuxiao, '复核表应包含无效分类类型')

    return result.summary()


def test_history_sample():
    """测试4: 历史回放样例 - 基线对比功能应正常工作"""
    print('\n' + '=' * 60)
    print('测试4: 历史回放样例验收')
    print('=' * 60)

    result = TestResult('历史回放样例')

    analyzer = GarbageSupervisionAnalyzer('config.yaml', baseline_path='baseline.json')
    analyzer.run_analysis(['logs/source_d_history.csv'])

    result.assert_equal(len(analyzer.records), 10, '应加载10条记录')
    result.assert_equal(len(analyzer.bad_records), 0, '应无异常记录')

    result.assert_true(analyzer.baseline is not None, '应成功加载基线数据')
    result.assert_true('baseline_date' in analyzer.baseline, '基线应包含日期')

    comparison = analyzer.compare_with_baseline()
    result.assert_true(comparison is not None, '基线对比结果不应为空')
    result.assert_true('阳光花园' in comparison, '对比应包含阳光花园')
    result.assert_true('翠湖小区' in comparison, '对比应包含翠湖小区')

    yg_comp = comparison['阳光花园']
    result.assert_true('records_change' in yg_comp, '应包含记录数变化')
    result.assert_true('records_change_pct' in yg_comp, '应包含记录数变化百分比')
    result.assert_true('weight_change' in yg_comp, '应包含重量变化')
    result.assert_true('weight_change_pct' in yg_comp, '应包含重量变化百分比')
    result.assert_true('bad_data_change' in yg_comp, '应包含异常数据变化')

    yg = analyzer.summary['阳光花园']
    expected_rec_change = yg['total_records'] - 120
    result.assert_equal(yg_comp['records_change'], expected_rec_change, '阳光花园记录数变化计算正确')

    group_report = analyzer.generate_group_report()
    result.assert_true('历史基线对比' in group_report, '分组报表应包含历史基线对比')
    result.assert_true('记录数变化' in group_report, '分组报表应包含记录数变化')
    result.assert_true('重量变化' in group_report, '分组报表应包含重量变化')

    json_result = json.loads(analyzer.generate_json_result())
    result.assert_true('baseline_comparison' in json_result, 'JSON应包含基线对比')
    result.assert_true(
        json_result['baseline_comparison'] is not None,
        'JSON基线对比不应为空'
    )

    baseline_comp = json_result['baseline_comparison']
    result.assert_true('阳光花园' in baseline_comp, '基线对比应包含阳光花园')
    result.assert_true('翠湖小区' in baseline_comp, '基线对比应包含翠湖小区')

    result.assert_true(
        'records_change_pct' in baseline_comp['阳光花园'],
        '基线对比应包含变化百分比'
    )

    return result.summary()


def test_export_integration():
    """测试5: 集成测试 - 多来源数据和导出功能"""
    print('\n' + '=' * 60)
    print('测试5: 集成测试 - 多来源与导出')
    print('=' * 60)

    result = TestResult('集成测试')

    output_dir = 'output_test'
    os.makedirs(output_dir, exist_ok=True)

    log_files = [
        'logs/source_a_compliant.csv',
        'logs/source_b_threshold.csv',
        'logs/source_c_missing.csv',
    ]

    analyzer = GarbageSupervisionAnalyzer('config.yaml', baseline_path='baseline.json')
    analyzer.run_analysis(log_files)
    analyzer.export_results(output_dir)

    total_expected = 10 + 7 + 12
    result.assert_equal(len(analyzer.records), total_expected, f'应加载{total_expected}条记录')

    output_files = [
        'group_report.txt',
        'bad_data_list.txt',
        'result.json',
        'review_table.csv',
    ]
    for f in output_files:
        path = os.path.join(output_dir, f)
        result.assert_true(os.path.exists(path), f'应导出文件: {f}')
        if os.path.exists(path):
            size = os.path.getsize(path)
            result.assert_true(size > 0, f'文件 {f} 不应为空')

    json_path = os.path.join(output_dir, 'result.json')
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        result.assert_true('generated_at' in data, 'JSON应包含生成时间')
        result.assert_true('community_summary' in data, 'JSON应包含小区汇总')
        result.assert_true('bad_data_details' in data, 'JSON应包含坏数据详情')
        result.assert_true('baseline_comparison' in data, 'JSON应包含基线对比')

    review_path = os.path.join(output_dir, 'review_table.csv')
    if os.path.exists(review_path):
        with open(review_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            rows = list(reader)
        result.assert_true(len(rows) > 1, '复核表应有数据行')
        headers = rows[0]
        result.assert_true('记录ID' in headers, '复核表应包含记录ID列')
        result.assert_true('问题类型' in headers, '复核表应包含问题类型列')
        result.assert_true('复核状态' in headers, '复核表应包含复核状态列')
        result.assert_true('复核意见' in headers, '复核表应包含复核意见列')

    bad_data_path = os.path.join(output_dir, 'bad_data_list.txt')
    if os.path.exists(bad_data_path):
        with open(bad_data_path, 'r', encoding='utf-8') as f:
            content = f.read()
        result.assert_true('坏数据清单' in content, '坏数据清单应包含标题')
        result.assert_true('问题类型统计' in content, '坏数据清单应包含问题类型统计')

    import shutil
    shutil.rmtree(output_dir, ignore_errors=True)

    return result.summary()


def main():
    print('小区垃圾分类督导脚本 - 验收测试套件')
    print('=' * 60)

    tests = [
        test_compliant_sample,
        test_threshold_sample,
        test_missing_sample,
        test_history_sample,
        test_export_integration,
    ]

    passed_count = 0
    failed_count = 0

    for test in tests:
        try:
            if test():
                passed_count += 1
            else:
                failed_count += 1
        except Exception as e:
            failed_count += 1
            print(f'\n【{test.__name__}】测试异常: {e}')
            import traceback
            traceback.print_exc()

    print('\n' + '=' * 60)
    print('验收测试总览')
    print('=' * 60)
    print(f'总测试数: {len(tests)}')
    print(f'通过: {passed_count}')
    print(f'失败: {failed_count}')
    print(f'通过率: {passed_count / len(tests) * 100:.1f}%')

    if failed_count == 0:
        print('\n🎉 所有测试通过！验收合格。')
        return 0
    else:
        print('\n❌ 部分测试失败，请检查代码。')
        return 1


if __name__ == '__main__':
    sys.exit(main())
