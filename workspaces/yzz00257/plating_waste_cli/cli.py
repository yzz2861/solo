#!/usr/bin/env python3
"""
电镀废液更换 CLI 工具

读取CSV清单、规则配置、历史快照，输出通过清单、异常清单、坏行隔离和汇总摘要。
"""
import argparse
import sys
import os

from .validator import validate_input_params
from .processor import PlatingProcessor
from .__init__ import __version__


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="plating-waste",
        description="电镀废液更换 - CSV清单批量校验与处理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  plating-waste -i input.csv -r rules.json -o ./output
  plating-waste -i input.csv -r rules.json -s history.csv -o ./output --dry-run
  plating-waste -i input.csv -r rules.json -o ./output --batch-id BATCH-001

退出码:
  0  全部通过，无异常
  1  存在异常记录或坏行
  2  参数错误或配置错误
        """,
    )

    parser.add_argument("-i", "--input", required=True, help="输入CSV清单路径")
    parser.add_argument("-r", "--rules", required=True, help="规则配置JSON路径")
    parser.add_argument("-s", "--snapshot", default="", help="历史快照CSV路径（可选，用于去重）")
    parser.add_argument("-o", "--output-dir", required=True, help="输出目录")
    parser.add_argument("--batch-id", default="", help="指定批次号（不指定则自动生成）")
    parser.add_argument("--dry-run", action="store_true", help="试运行模式，只预览不写入文件")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    parser.add_argument("-q", "--quiet", action="store_true", help="静默模式，减少控制台输出")
    parser.add_argument("-v", "--verbose", action="store_true", help="详细模式，输出更多信息")

    return parser


def print_banner():
    print("=" * 60)
    print("  电镀废液更换 CLI  v{}".format(__version__))
    print("=" * 60)


def print_summary(summary, dry_run: bool):
    print()
    print("-" * 60)
    print("  处理汇总")
    print("-" * 60)
    print(f"  批次号:       {summary.batch_id}")
    print(f"  来源文件:     {summary.source_file}")
    print(f"  试运行模式:   {'是' if dry_run else '否'}")
    print(f"  输入总行数:   {summary.total_input}")
    print(f"  通过数量:     {summary.pass_count}")
    print(f"  异常数量:     {summary.exception_count}")
    print(f"    - 缺字段:   {summary.missing_field_count}")
    print(f"    - 规则冲突: {summary.rule_conflict_count}")
    print(f"    - 重复记录: {summary.duplicate_count}")
    print(f"  坏行数量:     {summary.bad_row_count}")
    print(f"  开始时间:     {summary.started_at.strftime('%Y-%m-%d %H:%M:%S')}")
    if summary.finished_at:
        print(f"  结束时间:     {summary.finished_at.strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)


def print_output_files(files: dict):
    if not files:
        print("  （试运行模式，未生成文件）")
        return
    print()
    print("  输出文件:")
    for label, path in files.items():
        print(f"    [{label}]: {path}")


def print_exception_preview(records, limit: int = 5):
    if not records:
        return
    print()
    print(f"  异常记录预览（前{limit}条）:")
    for i, rec in enumerate(records[:limit]):
        types = ",".join(t.value for t in rec.exception_types)
        msgs = "; ".join(rec.exception_messages[:2])
        print(f"    行{rec.line_no}: [{types}] {msgs}")
    if len(records) > limit:
        print(f"    ... 还有 {len(records) - limit} 条异常记录，详见异常清单")


def main(args=None) -> int:
    parser = build_parser()
    parsed = parser.parse_args(args)

    input_csv = os.path.abspath(parsed.input)
    rule_config = os.path.abspath(parsed.rules)
    history_snapshot = os.path.abspath(parsed.snapshot) if parsed.snapshot else ""
    output_dir = os.path.abspath(parsed.output_dir)
    dry_run = parsed.dry_run
    batch_id = parsed.batch_id
    verbose = parsed.verbose
    quiet = parsed.quiet

    if not quiet:
        print_banner()

    errors = validate_input_params(input_csv, rule_config, history_snapshot, output_dir)
    if errors:
        print("参数校验失败:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 2

    processor = PlatingProcessor(
        input_csv=input_csv,
        rule_config=rule_config,
        history_snapshot=history_snapshot,
        output_dir=output_dir,
        dry_run=dry_run,
        batch_id=batch_id,
    )

    struct_errors, rule_errors = processor.load()

    if rule_errors:
        print("规则配置错误:", file=sys.stderr)
        for e in rule_errors:
            print(f"  - {e}", file=sys.stderr)
        return 2

    if struct_errors and not quiet:
        print("CSV结构警告:")
        for e in struct_errors:
            print(f"  - {e}")
        print()

    if not quiet:
        print(f"  输入文件: {input_csv}")
        print(f"  规则配置: {rule_config}")
        if history_snapshot:
            print(f"  历史快照: {history_snapshot}")
        print(f"  输出目录: {output_dir}")
        print(f"  批次号:   {processor.batch_id}")
        print()
        print("  正在处理...")

    summary = processor.process()

    if not quiet:
        print_summary(summary, dry_run)

    if verbose or not quiet:
        exception_records = [r for r in processor.records if r.status.value == "exception"]
        print_exception_preview(exception_records, limit=5)

    files = processor.export()

    if not quiet:
        print_output_files(files)

    exit_code = processor.get_exit_code()

    if not quiet:
        print()
        if exit_code == 0:
            print("✓ 处理完成，全部通过")
        else:
            print(f"✗ 处理完成，存在异常（退出码: {exit_code}）")
        print()

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
