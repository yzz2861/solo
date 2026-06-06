import argparse
import sys
import os
import uuid
from datetime import datetime

from .config import load_rule_config
from .csv_reader import read_bike_csv, read_snapshot_csv
from .snapshot import compare_with_snapshot
from .assessor import assess_records, summarize_assessments
from .exporter import ResultExporter
from .models import ProcessingSummary, RiskLevel


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="bike-clearing",
        description="城市共享单车淤积清运CLI - 读取CSV清单进行淤积风险评估与清运决策",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  bike-clearing --input bikes.csv --config rules.yaml --snapshot last_snapshot.csv --output ./output
  bike-clearing -i bikes.csv -c rules.yaml -s snap.csv -o ./output --batch BATCH001 --source 美团单车
  bike-clearing -i bikes.csv -c rules.yaml -o ./output --dry-run
        """,
    )

    parser.add_argument(
        "-i", "--input",
        required=True,
        help="待处理的共享单车CSV清单文件路径",
    )
    parser.add_argument(
        "-c", "--config",
        default=None,
        help="规则配置YAML文件路径（可选，不填使用默认规则）",
    )
    parser.add_argument(
        "-s", "--snapshot",
        default=None,
        help="历史快照CSV文件路径（可选，用于生成差异表和历史轨迹）",
    )
    parser.add_argument(
        "-o", "--output",
        required=True,
        help="输出目录路径",
    )
    parser.add_argument(
        "--batch",
        default=None,
        help="处理批次号（可选，不填自动生成）",
    )
    parser.add_argument(
        "--source",
        default="unknown",
        help="数据来源标识（可选，默认 unknown）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="试运行模式，只预览不落正式结果文件",
    )
    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 1.0.0",
    )

    return parser


def validate_args(args: argparse.Namespace) -> list[str]:
    errors = []

    if not os.path.exists(args.input):
        errors.append(f"输入文件不存在: {args.input}")
    elif not os.path.isfile(args.input):
        errors.append(f"输入路径不是文件: {args.input}")
    elif not args.input.lower().endswith(".csv"):
        errors.append(f"输入文件必须是CSV格式: {args.input}")

    if args.config:
        if not os.path.exists(args.config):
            errors.append(f"规则配置文件不存在: {args.config}")
        elif not os.path.isfile(args.config):
            errors.append(f"规则配置路径不是文件: {args.config}")
        elif not args.config.lower().endswith((".yaml", ".yml")):
            errors.append(f"规则配置文件必须是YAML格式: {args.config}")

    if args.snapshot:
        if not os.path.exists(args.snapshot):
            errors.append(f"快照文件不存在: {args.snapshot}")
        elif not os.path.isfile(args.snapshot):
            errors.append(f"快照路径不是文件: {args.snapshot}")
        elif not args.snapshot.lower().endswith(".csv"):
            errors.append(f"快照文件必须是CSV格式: {args.snapshot}")

    if args.batch and len(args.batch) > 64:
        errors.append("批次号长度不能超过64字符")

    if args.source and len(args.source) > 64:
        errors.append("来源标识长度不能超过64字符")

    return errors


def run(args: argparse.Namespace) -> int:
    arg_errors = validate_args(args)
    if arg_errors:
        print("参数校验失败:", file=sys.stderr)
        for e in arg_errors:
            print(f"  - {e}", file=sys.stderr)
        return 2

    batch_id = args.batch or _generate_batch_id()
    source = args.source

    summary = ProcessingSummary(
        batch_id=batch_id,
        source=source,
        is_dry_run=args.dry_run,
    )

    exporter = ResultExporter(
        output_dir=args.output,
        batch_id=batch_id,
        source=source,
        is_dry_run=args.dry_run,
    )

    try:
        print(f"批次 {batch_id} 开始处理 (来源: {source})")
        if args.dry_run:
            print("[DRY-RUN] 试运行模式，仅预览不落盘")

        exporter.log(f"加载规则配置: {args.config or '默认规则'}")
        rule_config = load_rule_config(args.config)
        exporter.log(f"规则加载完成: 高风险阈值={rule_config.occupancy_rate_high}, "
                     f"中风险阈值={rule_config.occupancy_rate_medium}")

        exporter.log(f"读取CSV清单: {args.input}")
        good_records, bad_records = read_bike_csv(
            csv_path=args.input,
            rule_config=rule_config,
            batch_id=batch_id,
            source=source,
        )
        summary.total_count = len(good_records) + len(bad_records)
        summary.success_count = len(good_records)
        summary.bad_count = len(bad_records)
        exporter.log(
            f"CSV读取完成: 总计{summary.total_count}条, "
            f"成功{summary.success_count}条, 坏行{summary.bad_count}条"
        )

        exporter.log(f"加载历史快照: {args.snapshot or '无'}")
        snapshot_map = read_snapshot_csv(args.snapshot) if args.snapshot else {}
        exporter.log(f"快照加载完成: {len(snapshot_map)} 条记录")

        exporter.log("生成差异对比表")
        diffs = compare_with_snapshot(
            current_records=good_records,
            snapshot_map=snapshot_map,
            rule_config=rule_config,
            batch_id=batch_id,
            source=source,
        )
        summary.diff_count = len(diffs)
        exporter.log(f"差异对比完成: 共{summary.diff_count}条差异")

        exporter.log("执行淤积风险评估")
        results = assess_records(
            records=good_records,
            rule_config=rule_config,
            snapshot_map=snapshot_map,
            batch_id=batch_id,
            source=source,
        )

        risk_summary = summarize_assessments(results)
        summary.low_risk_count = risk_summary.get(RiskLevel.LOW, 0)
        summary.medium_risk_count = risk_summary.get(RiskLevel.MEDIUM, 0)
        summary.high_risk_count = risk_summary.get(RiskLevel.HIGH, 0)
        summary.unknown_risk_count = risk_summary.get(RiskLevel.UNKNOWN, 0)

        exporter.log(
            f"风险评估完成: 低风险{summary.low_risk_count}, "
            f"中风险{summary.medium_risk_count}, "
            f"高风险{summary.high_risk_count}, "
            f"无法判定{summary.unknown_risk_count}"
        )

        summary.finished_at = datetime.now()

        exporter.log("开始导出结果文件")
        paths = exporter.export_all(results, bad_records, diffs, summary)

        summary.finished_at = datetime.now()

        print("\n" + "=" * 60)
        print("处理完成")
        print("=" * 60)
        print(f"批次号: {batch_id}")
        print(f"来源: {source}")
        print(f"模式: {'试运行 (dry-run)' if args.dry_run else '正式运行'}")
        print(f"总记录: {summary.total_count}")
        print(f"  成功: {summary.success_count}")
        print(f"  坏行: {summary.bad_count}")
        print(f"  差异: {summary.diff_count}")
        print(f"风险分级:")
        print(f"  低风险: {summary.low_risk_count}")
        print(f"  中风险: {summary.medium_risk_count}")
        print(f"  高风险: {summary.high_risk_count}")
        print(f"  无法判定: {summary.unknown_risk_count}")
        print("-" * 60)

        if args.dry_run:
            print(f"试运行日志: {paths.get('log', 'N/A')}")
            print("提示: 去掉 --dry-run 参数执行正式导出")
        else:
            print("输出文件:")
            for name, path in paths.items():
                print(f"  {name}: {path}")
        print("=" * 60)

        return 0

    except Exception as e:
        exporter.log(f"处理失败: {str(e)}", level="ERROR")
        if not args.dry_run:
            try:
                exporter._export_log()
            except Exception:
                pass
        print(f"处理失败: {e}", file=sys.stderr)
        return 1


def _generate_batch_id() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    suffix = uuid.uuid4().hex[:6].upper()
    return f"BATCH-{timestamp}-{suffix}"


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    sys.exit(run(args))


if __name__ == "__main__":
    main()
