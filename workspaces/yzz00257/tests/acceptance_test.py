#!/usr/bin/env python3
"""验收测试脚本：验证正常记录、缺字段、规则冲突、重复处理、坏行隔离"""
import sys
import os
import json
import csv

_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _base)

from plating_waste_cli.processor import PlatingProcessor
from plating_waste_cli.validator import validate_input_params

PASS = 0
FAIL = 0


def assert_eq(actual, expected, msg=""):
    global PASS, FAIL
    if actual == expected:
        PASS += 1
        print(f"  ✓ {msg or '断言通过'}: {actual}")
    else:
        FAIL += 1
        print(f"  ✗ {msg or '断言失败'}: 期望 {expected}, 实际 {actual}")


def assert_true(condition, msg=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ✓ {msg or '断言通过'}")
    else:
        FAIL += 1
        print(f"  ✗ {msg or '断言失败'}")


def test_scenario_1_normal_records():
    """场景1: 正常通过的记录"""
    print("\n【场景1】正常记录 - 应全部通过")
    p = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        history_snapshot='tests/history_snapshot.csv',
        output_dir='tests/output',
        dry_run=True,
        batch_id='ACC-001',
    )
    p.load()
    p.process()

    pass_records = [r for r in p.records if r.status.value == 'pass']
    assert_eq(len(pass_records), 4, "通过记录数")

    expected_pass = ['WO-20260601-001', 'WO-20260601-002', 'WO-20260601-003', 'WO-20260601-004']
    actual_pass = [r.get('工单编号') for r in pass_records]
    for wo in expected_pass:
        assert_true(wo in actual_pass, f"通过记录包含 {wo}")

    for r in pass_records:
        assert_eq(r.status.value, 'pass', f"记录 {r.get('工单编号')} 状态为pass")
        assert_true(len(r.exception_types) == 0, f"记录 {r.get('工单编号')} 无异常类型")
        assert_true('_batch_id' not in r.raw, "原始数据不含内部字段")


def test_scenario_2_missing_fields():
    """场景2: 缺字段的记录"""
    print("\n【场景2】缺字段 - 应标记为missing_field异常")
    p = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        output_dir='tests/output',
        dry_run=True,
        batch_id='ACC-002',
    )
    p.load()
    p.process()

    missing = [r for r in p.records if any(t.value == 'missing_field' for t in r.exception_types)]
    assert_eq(len(missing), 4, "缺字段异常记录数")

    missing_field_examples = {
        12: '工单编号',
        13: '批次号',
        14: '槽号',
        16: '处理日期',
    }
    for line_no, field in missing_field_examples.items():
        rec = next((r for r in missing if r.line_no == line_no), None)
        assert_true(rec is not None, f"行{line_no}有缺字段异常")
        if rec:
            has_msg = any(field in msg for msg in rec.exception_messages)
            assert_true(has_msg, f"行{line_no}异常信息提及{field}")


def test_scenario_3_rule_conflicts():
    """场景3: 规则冲突的记录"""
    print("\n【场景3】规则冲突 - 应标记为rule_conflict异常")
    p = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        output_dir='tests/output',
        dry_run=True,
        batch_id='ACC-003',
    )
    p.load()
    p.process()

    conflicts = [r for r in p.records if any(t.value == 'rule_conflict' for t in r.exception_types)]
    assert_eq(len(conflicts), 5, "规则冲突记录数")

    cases = [
        (7, 'R001', '镍离子浓度超标'),
        (8, 'R002', '铬离子浓度超标'),
        (9, 'R004', 'pH值偏低'),
        (10, 'R003', 'pH值偏高'),
        (11, 'R005', '废液类型无效'),
    ]
    for line_no, rule_id, desc in cases:
        rec = next((r for r in conflicts if r.line_no == line_no), None)
        assert_true(rec is not None, f"行{line_no}有规则冲突 ({desc})")
        if rec:
            assert_true(rule_id in rec.rule_matches, f"行{line_no}匹配规则{rule_id}")


def test_scenario_4_duplicates():
    """场景4: 重复处理的记录"""
    print("\n【场景4】重复处理 - 本批次内重复+历史快照重复")
    p = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        history_snapshot='tests/history_snapshot.csv',
        output_dir='tests/output',
        dry_run=True,
        batch_id='ACC-004',
    )
    p.load()
    p.process()

    dups = [r for r in p.records if any(t.value == 'duplicate' for t in r.exception_types)]
    assert_eq(len(dups), 3, "重复记录总数")

    history_dups = [r for r in dups if '历史快照' in ';'.join(r.exception_messages)]
    assert_eq(len(history_dups), 2, "历史快照重复数")

    batch_dups = [r for r in dups if '本批次' in ';'.join(r.exception_messages)]
    assert_eq(len(batch_dups), 1, "本批次内重复数")


def test_scenario_5_bad_rows():
    """场景5: 坏行隔离"""
    print("\n【场景5】坏行隔离 - 无法解析的行应被隔离")
    p = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        output_dir='tests/output',
        dry_run=True,
        batch_id='ACC-005',
    )
    p.load()
    p.process()

    assert_eq(len(p.bad_rows), 1, "坏行数量")
    assert_eq(p.bad_rows[0]['line_no'], 17, "坏行行号")
    assert_true('字段数不匹配' in p.bad_rows[0]['reason'], "坏行原因描述")


def test_scenario_6_dry_run():
    """场景6: dry-run 不生成文件"""
    print("\n【场景6】dry-run模式 - 不应生成输出文件")
    import shutil
    out_dir = 'tests/output_dryrun_test'
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)

    p = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        output_dir=out_dir,
        dry_run=True,
        batch_id='ACC-006',
    )
    p.load()
    p.process()
    files = p.export()

    assert_eq(len(files), 0, "dry-run无输出文件")
    assert_true(not os.path.exists(out_dir) or len(os.listdir(out_dir)) == 0, "输出目录无文件")

    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)


def test_scenario_7_output_files():
    """场景7: 输出文件内容验证"""
    print("\n【场景7】输出文件 - 验证文件内容和批次/来源标识")
    p = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        history_snapshot='tests/history_snapshot.csv',
        output_dir='tests/output',
        dry_run=False,
        batch_id='ACC-007',
    )
    p.load()
    p.process()
    files = p.export()

    assert_true(os.path.exists(files['pass']), "通过清单文件存在")
    assert_true(os.path.exists(files['exception']), "异常清单文件存在")
    assert_true(os.path.exists(files['bad_rows']), "坏行隔离文件存在")
    assert_true(os.path.exists(files['summary_json']), "汇总JSON存在")
    assert_true(os.path.exists(files['summary_csv']), "汇总CSV存在")

    with open(files['pass'], 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        pass_rows = list(reader)
    assert_true(len(pass_rows) > 0, "通过清单有数据")
    assert_true('_batch_id' in pass_rows[0], "通过清单含_batch_id字段")
    assert_true('_source_file' in pass_rows[0], "通过清单含_source_file字段")
    assert_eq(pass_rows[0]['_batch_id'], 'ACC-007', "通过清单批次号正确")
    assert_eq(pass_rows[0]['_source_file'], 'test_input.csv', "通过清单来源文件正确")

    with open(files['exception'], 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        exc_rows = list(reader)
    assert_true(len(exc_rows) > 0, "异常清单有数据")
    assert_true('_exception_types' in exc_rows[0], "异常清单含异常类型字段")
    assert_true('_exception_messages' in exc_rows[0], "异常清单含异常信息字段")
    assert_true('_rule_matches' in exc_rows[0], "异常清单含规则匹配字段")

    with open(files['bad_rows'], 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        bad_rows = list(reader)
    assert_true(len(bad_rows) > 0, "坏行隔离文件有数据")
    assert_true('line_no' in bad_rows[0], "坏行文件含行号")
    assert_true('reason' in bad_rows[0], "坏行文件含原因")
    assert_true('raw' in bad_rows[0], "坏行文件含原始数据")
    assert_eq(bad_rows[0]['_batch_id'], 'ACC-007', "坏行文件批次号正确")

    with open(files['summary_json'], 'r', encoding='utf-8') as f:
        summary = json.load(f)
    assert_eq(summary['batch_id'], 'ACC-007', "汇总批次号正确")
    assert_true(summary['total_input'] > 0, "汇总有输入总数")
    assert_true(summary['output_pass_file'], "汇总含通过文件路径")
    assert_true(summary['output_exception_file'], "汇总含异常文件路径")
    assert_true(summary['bad_row_file'], "汇总含坏行文件路径")


def test_scenario_8_exit_codes():
    """场景8: 退出码验证"""
    print("\n【场景8】退出码 - 0=全通过, 1=有异常, 2=参数错误")

    errors = validate_input_params('', 'examples/rules.json', '', 'tests/output')
    assert_true(len(errors) > 0, "缺失input参数时报错")

    p_ok = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        output_dir='tests/output',
        dry_run=True,
        batch_id='ACC-008',
    )
    p_ok.load()
    p_ok.process()
    code = p_ok.get_exit_code()
    assert_eq(code, 1, "有异常记录时退出码为1")

    from plating_waste_cli.models import ProcessingSummary
    summary_clean = ProcessingSummary(batch_id='TEST', source_file='test.csv')
    summary_clean.pass_count = 10
    summary_clean.exception_count = 0
    summary_clean.bad_row_count = 0
    p_clean = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        output_dir='tests/output',
        dry_run=True,
    )
    p_clean.summary = summary_clean
    assert_eq(p_clean.get_exit_code(), 0, "无异常时退出码为0")

    p_none = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        output_dir='tests/output',
        dry_run=True,
    )
    assert_eq(p_none.get_exit_code(), 2, "未处理时退出码为2")


def test_scenario_9_review_trail():
    """场景9: 复核入口 - 可通过批次号+行号回溯原始数据"""
    print("\n【场景9】复核入口 - 通过批次/来源/行号可回溯")
    p = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        history_snapshot='tests/history_snapshot.csv',
        output_dir='tests/output',
        dry_run=False,
        batch_id='ACC-009',
    )
    p.load()
    p.process()
    files = p.export()

    with open(files['exception'], 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        first_exc = next(reader)

    assert_true('_source_file' in first_exc, "异常记录含来源文件")
    assert_true('_batch_id' in first_exc, "异常记录含批次号")
    assert_true('_line_no' in first_exc, "异常记录含行号")

    source_file = first_exc['_source_file']
    line_no = int(first_exc['_line_no'])
    batch_id = first_exc['_batch_id']

    print(f"  复核示例: 批次 {batch_id}, 来源 {source_file}, 行号 {line_no}")
    assert_eq(batch_id, 'ACC-009', "可通过批次号追溯")
    assert_eq(source_file, 'test_input.csv', "可通过来源文件追溯")
    assert_true(line_no > 1, "行号有效可回溯原文件")


def main():
    print("=" * 60)
    print("  电镀废液更换CLI 验收测试")
    print("=" * 60)

    test_scenario_1_normal_records()
    test_scenario_2_missing_fields()
    test_scenario_3_rule_conflicts()
    test_scenario_4_duplicates()
    test_scenario_5_bad_rows()
    test_scenario_6_dry_run()
    test_scenario_7_output_files()
    test_scenario_8_exit_codes()
    test_scenario_9_review_trail()

    print()
    print("=" * 60)
    print(f"  测试结果: 通过 {PASS} / 共 {PASS + FAIL}")
    print("=" * 60)

    return 0 if FAIL == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
