#!/usr/bin/env python3
import sys
import os
_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _base)

from plating_waste_cli.processor import PlatingProcessor

def test_dry_run():
    print("=" * 60)
    print("测试1: dry-run 模式")
    print("=" * 60)
    p = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        history_snapshot='tests/history_snapshot.csv',
        output_dir='tests/output',
        dry_run=True,
        batch_id='TEST-BATCH-001',
    )
    struct_errors, rule_errors = p.load()
    print(f"结构错误: {struct_errors}")
    print(f"规则错误: {rule_errors}")
    print(f"加载记录数: {len(p.records)}")
    print(f"坏行数: {len(p.bad_rows)}")
    print(f"字段: {p.fieldnames}")

    summary = p.process()
    print()
    print("处理汇总:")
    print(f"  总输入: {summary.total_input}")
    print(f"  通过: {summary.pass_count}")
    print(f"  异常: {summary.exception_count}")
    print(f"  坏行: {summary.bad_row_count}")
    print(f"  缺字段: {summary.missing_field_count}")
    print(f"  规则冲突: {summary.rule_conflict_count}")
    print(f"  重复: {summary.duplicate_count}")

    print()
    print("异常记录详情:")
    for r in p.records:
        if r.status.value != 'pass':
            types = [t.value for t in r.exception_types]
            print(f"  行{r.line_no}: {r.status.value} - {types}")
            for msg in r.exception_messages:
                print(f"    - {msg}")

    print()
    print("坏行详情:")
    for br in p.bad_rows:
        print(f"  行{br['line_no']}: {br['reason']}")

    print()
    files = p.export()
    print(f"导出文件 (dry-run): {files}")
    print(f"退出码: {p.get_exit_code()}")
    return p


def test_full_run():
    print()
    print("=" * 60)
    print("测试2: 完整运行，生成输出文件")
    print("=" * 60)
    p = PlatingProcessor(
        input_csv='tests/test_input.csv',
        rule_config='examples/rules.json',
        history_snapshot='tests/history_snapshot.csv',
        output_dir='tests/output',
        dry_run=False,
        batch_id='TEST-BATCH-002',
    )
    struct_errors, rule_errors = p.load()
    summary = p.process()
    files = p.export()

    print(f"通过文件: {files.get('pass', '')}")
    print(f"异常文件: {files.get('exception', '')}")
    print(f"坏行文件: {files.get('bad_rows', '')}")
    print(f"汇总JSON: {files.get('summary_json', '')}")
    print(f"汇总CSV: {files.get('summary_csv', '')}")
    print(f"退出码: {p.get_exit_code()}")

    print()
    print("检查输出文件是否存在:")
    for k, v in files.items():
        exists = os.path.exists(v)
        size = os.path.getsize(v) if exists else 0
        print(f"  {k}: {'存在' if exists else '不存在'} ({size} bytes)")

    return p, files


def test_output_content(files):
    print()
    print("=" * 60)
    print("测试3: 输出文件内容验证")
    print("=" * 60)

    print()
    print("通过清单前3行:")
    with open(files['pass'], 'r', encoding='utf-8-sig') as f:
        for i, line in enumerate(f):
            if i >= 4:
                break
            print(f"  {line.rstrip()}")

    print()
    print("异常清单前3行:")
    with open(files['exception'], 'r', encoding='utf-8-sig') as f:
        for i, line in enumerate(f):
            if i >= 4:
                break
            print(f"  {line.rstrip()}")

    print()
    print("坏行隔离文件内容:")
    with open(files['bad_rows'], 'r', encoding='utf-8-sig') as f:
        for i, line in enumerate(f):
            print(f"  {line.rstrip()}")

    print()
    print("汇总摘要:")
    import json
    with open(files['summary_json'], 'r', encoding='utf-8') as f:
        data = json.load(f)
        for k, v in data.items():
            print(f"  {k}: {v}")


def test_missing_field_validation():
    print()
    print("=" * 60)
    print("测试4: 参数校验 - 文件不存在")
    print("=" * 60)
    from plating_waste_cli.validator import validate_input_params
    errors = validate_input_params(
        'nonexistent.csv',
        'examples/rules.json',
        '',
        'tests/output'
    )
    print(f"错误列表: {errors}")


def test_rule_config_validation():
    print()
    print("=" * 60)
    print("测试5: 规则配置校验")
    print("=" * 60)
    from plating_waste_cli.validator import validate_rule_config
    valid, errors, engine = validate_rule_config('examples/rules.json')
    print(f"有效: {valid}")
    print(f"错误: {errors}")
    if engine:
        print(f"规则数: {len(engine.rules)}")
        print(f"必填字段数: {len(engine.required_fields)}")


def main():
    test_dry_run()
    test_missing_field_validation()
    test_rule_config_validation()
    _, files = test_full_run()
    test_output_content(files)

    print()
    print("=" * 60)
    print("所有测试完成!")
    print("=" * 60)


if __name__ == '__main__':
    main()
