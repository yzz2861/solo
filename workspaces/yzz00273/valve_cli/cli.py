import sys
import argparse
import os
from datetime import datetime
from .models import EXIT_INVALID_ARGS, EXIT_WITH_ERROR, ExportFormat
from .processor import build_config, ValveProcessor


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="valve-cli",
        description="供水管网阀门启闭数据处理工具 - 读取原始数据，执行校验，输出通过/异常清单与汇总",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  valve-cli -i data.csv -o output/
  valve-cli -i a.csv -i b.json -m mapping.json -s 2024-01-01 -e 2024-12-31 -f xlsx
  valve-cli -i data.csv -o out/ --dry-run
  valve-cli -i data.csv -o out/ --pressure-threshold 0.3 --no-require-material
  valve-cli -i new_data.csv -o out/ --history history_2024.csv
        """,
    )

    parser.add_argument(
        "-i", "--input",
        action="append",
        required=True,
        dest="input_files",
        metavar="FILE",
        help="输入原始数据文件，支持多文件 (CSV/JSON/XLSX)",
    )

    parser.add_argument(
        "--history",
        action="append",
        default=None,
        dest="history_files",
        metavar="FILE",
        help="历史数据文件，用于回放检测 (可指定多个)",
    )

    parser.add_argument(
        "-o", "--output-dir",
        default="./output",
        dest="output_dir",
        help="输出目录 (默认: ./output)",
    )

    parser.add_argument(
        "-m", "--mapping",
        default=None,
        dest="mapping_file",
        help="字段映射文件 (JSON 或 CSV格式)",
    )

    parser.add_argument(
        "-s", "--date-start",
        default=None,
        dest="date_start",
        help="起始日期 (YYYY-MM-DD)，早于此日期的记录标记为异常",
    )

    parser.add_argument(
        "-e", "--date-end",
        default=None,
        dest="date_end",
        help="结束日期 (YYYY-MM-DD)，晚于此日期的记录标记为异常",
    )

    parser.add_argument(
        "-f", "--format",
        default="csv",
        dest="export_format",
        choices=["csv", "json", "xlsx"],
        help="导出格式 (默认: csv)",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        dest="dry_run",
        help="预览模式，只打印结果不生成文件",
    )

    parser.add_argument(
        "--pressure-threshold",
        type=float,
        default=0.5,
        dest="pressure_threshold",
        help="压力变化阈值 (MPa)，超过则标记异常 (默认: 0.5)",
    )

    parser.add_argument(
        "--no-require-material",
        action="store_false",
        dest="require_material",
        help="不要求材料字段必填",
    )

    parser.add_argument(
        "--batch-id",
        default="",
        dest="batch_id",
        help="自定义处理批次号 (默认自动生成)",
    )

    parser.add_argument(
        "-q", "--quiet",
        action="store_true",
        dest="quiet",
        help="安静模式，只输出错误",
    )

    return parser


def validate_args(args) -> list:
    errors = []

    for fp in args.input_files:
        if not os.path.exists(fp):
            errors.append(f"输入文件不存在: {fp}")

    if args.history_files:
        for fp in args.history_files:
            if not os.path.exists(fp):
                errors.append(f"历史文件不存在: {fp}")

    if not args.dry_run:
        out_dir = args.output_dir
        parent = os.path.dirname(os.path.abspath(out_dir))
        if not os.path.exists(parent) and parent:
            errors.append(f"输出目录的父目录不存在: {parent}")

    if args.mapping_file and not os.path.exists(args.mapping_file):
        errors.append(f"字段映射文件不存在: {args.mapping_file}")

    if args.pressure_threshold < 0:
        errors.append("压力阈值不能为负数")

    if args.date_start and args.date_end:
        try:
            from .processor import _parse_date_arg
            ds = _parse_date_arg(args.date_start)
            de = _parse_date_arg(args.date_end, end_of_day=True)
            if ds > de:
                errors.append("起始日期不能晚于结束日期")
        except ValueError as e:
            errors.append(str(e))

    return errors


def main(argv=None) -> int:
    parser = build_parser()
    
    try:
        args = parser.parse_args(argv)
    except SystemExit as e:
        return e.code if isinstance(e.code, int) else EXIT_INVALID_ARGS

    arg_errors = validate_args(args)
    if arg_errors:
        print("参数校验失败:", file=sys.stderr)
        for err in arg_errors:
            print(f"  - {err}", file=sys.stderr)
        return EXIT_INVALID_ARGS

    try:
        config = build_config(
            input_files=args.input_files,
            output_dir=args.output_dir,
            mapping_file=args.mapping_file,
            date_start=args.date_start,
            date_end=args.date_end,
            export_format=args.export_format,
            dry_run=args.dry_run,
            pressure_threshold=args.pressure_threshold,
            require_material=args.require_material,
            batch_id=args.batch_id,
            history_files=args.history_files,
        )
    except Exception as e:
        print(f"配置初始化失败: {e}", file=sys.stderr)
        return EXIT_WITH_ERROR

    if not args.quiet:
        mode = "DRY-RUN 预览" if config.dry_run else "正式处理"
        print(f"供水管网阀门启闭数据处理 - {mode}")
        print(f"批次号: {config.batch_id}")
        print(f"输入文件: {len(config.input_files)} 个")
        for f in config.input_files:
            print(f"  - {f}")
        print()

    try:
        processor = ValveProcessor(config)
        exit_code, summary = processor.run()
    except Exception as e:
        print(f"处理失败: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return EXIT_WITH_ERROR

    if not args.quiet and not config.dry_run:
        _print_summary(summary)

    return exit_code


def _print_summary(summary):
    print("=" * 50)
    print("  处理完成")
    print("=" * 50)
    print(f"批次号      : {summary.batch_id}")
    print(f"总记录数    : {summary.total_records}")
    print(f"通过        : {summary.passed_count}")
    print(f"异常        : {summary.exception_count}")
    print(f"坏行        : {summary.bad_count}")
    print(f"通过率      : {summary.to_dict()['pass_rate']}")
    print(f"耗时        : {summary.duration_seconds:.2f} 秒")
    print()
    if summary.output_files:
        print("输出文件:")
        for f in summary.output_files:
            print(f"  - {f}")
    print()


if __name__ == "__main__":
    sys.exit(main())
