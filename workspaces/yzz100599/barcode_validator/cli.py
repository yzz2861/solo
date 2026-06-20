import argparse
import sys
import os

from .parser import parse_csv
from .rules import load_rules
from .validator import validate_all
from .report import compute_stats, write_qualified_csv, write_anomaly_csv, print_summary


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="barcode-validator",
        description="仓库条码批量验真CLI - 读取扫码CSV和供应商批次规则，检查条码合规性",
    )
    p.add_argument(
        "scan_csv",
        help="扫码枪导出的 CSV 文件路径（必需列: barcode, supplier_code）",
    )
    p.add_argument(
        "rules_json",
        help="供应商批次规则 JSON 文件路径",
    )
    p.add_argument(
        "-o", "--output-dir",
        default=".",
        help="输出目录（默认当前目录）",
    )
    p.add_argument(
        "--qualified",
        default="qualified.csv",
        help="合格清单文件名（默认 qualified.csv）",
    )
    p.add_argument(
        "--anomaly",
        default="anomaly.csv",
        help="异常清单文件名（默认 anomaly.csv）",
    )
    p.add_argument(
        "--encoding",
        default="utf-8-sig",
        help="CSV 文件编码（默认 utf-8-sig）",
    )
    p.add_argument(
        "--quiet",
        action="store_true",
        help="静默模式，不输出统计摘要",
    )
    return p


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if not os.path.isfile(args.scan_csv):
        print(f"错误: 扫码文件不存在: {args.scan_csv}", file=sys.stderr)
        return 1

    if not os.path.isfile(args.rules_json):
        print(f"错误: 规则文件不存在: {args.rules_json}", file=sys.stderr)
        return 1

    try:
        rules = load_rules(args.rules_json)
    except Exception as e:
        print(f"错误: 加载规则文件失败: {e}", file=sys.stderr)
        return 1

    try:
        records = parse_csv(args.scan_csv, encoding=args.encoding)
    except Exception as e:
        print(f"错误: 解析扫码CSV失败: {e}", file=sys.stderr)
        return 1

    validate_all(records, rules)

    stats = compute_stats(records, rules)

    os.makedirs(args.output_dir, exist_ok=True)

    qualified_path = os.path.join(args.output_dir, args.qualified)
    anomaly_path = os.path.join(args.output_dir, args.anomaly)

    qualified = [r for r in records if r.is_valid]
    write_qualified_csv(qualified, qualified_path)

    anomalous = [r for r in records if not r.is_valid]
    write_anomaly_csv(anomalous, anomaly_path)

    if not args.quiet:
        print_summary(stats, rules)
        print()
        print(f"合格清单已导出: {qualified_path}  ({len(qualified)} 条)")
        print(f"异常清单已导出: {anomaly_path}  ({len(anomalous)} 条)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
