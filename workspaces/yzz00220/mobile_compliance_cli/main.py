#!/usr/bin/env python3
import argparse
import sys
import json
from pathlib import Path

from rules import RuleEngine
from processor import ComplianceProcessor, read_csv, load_last_result
from logger import ComplianceLogger


def parse_filters(filter_str):
    if not filter_str:
        return None

    filters = {}
    pairs = filter_str.split(",")
    for pair in pairs:
        if "=" not in pair:
            continue
        key, val = pair.split("=", 1)
        if "|" in val:
            filters[key.strip()] = val.split("|")
        else:
            filters[key.strip()] = val.strip()
    return filters


def main():
    parser = argparse.ArgumentParser(
        description="移动设备合规检查CLI - 批量处理移动设备合规检查，识别风险、生成结论并保留追溯依据",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python main.py --ledger devices.csv --rules rules.yaml --output ./result
  python main.py -l devices.csv -r rules.yaml -o ./result -f "部门=研发部"
  python main.py -l devices.csv -r rules.yaml -o ./result --last last_result/abnormal.csv
  python main.py -l devices.csv -r rules.yaml -o ./result --log-dir ./logs
        """,
    )

    parser.add_argument("-l", "--ledger", required=True, help="业务台账CSV文件路径")
    parser.add_argument("-r", "--rules", required=True, help="规则/参数文件YAML路径")
    parser.add_argument("-o", "--output", required=True, help="输出目录路径")
    parser.add_argument("--last", help="上次检查结果文件路径，用于对比")
    parser.add_argument("-f", "--filter", help='筛选条件，格式: "字段1=值1,字段2=值2|值3"')
    parser.add_argument("--log-dir", help="日志输出目录，不传则仅控制台输出")
    parser.add_argument("-v", "--verbose", action="store_true", help="详细日志模式")

    args = parser.parse_args()

    logger = ComplianceLogger(log_dir=args.log_dir, verbose=args.verbose)

    ledger_path = Path(args.ledger)
    if not ledger_path.exists():
        logger.error(f"台账文件不存在: {ledger_path}")
        sys.exit(1)

    try:
        rule_engine = RuleEngine(args.rules)
        logger.info(f"加载规则成功: {len(rule_engine.rules)} 条规则")
        logger.info(f"必填字段: {sorted(rule_engine.required_fields)}")
        logger.info(f"去重键: {rule_engine.duplicate_keys}")
    except Exception as e:
        logger.error(f"加载规则失败: {e}")
        sys.exit(1)

    try:
        records, fieldnames = read_csv(ledger_path)
        logger.info(f"加载台账成功: {len(records)} 条记录")
        logger.info(f"台账字段: {fieldnames}")
    except Exception as e:
        logger.error(f"读取台账失败: {e}")
        sys.exit(1)

    last_map = load_last_result(args.last) if args.last else {}
    if last_map:
        logger.info(f"加载上次结果: {len(last_map)} 条记录")

    filters = parse_filters(args.filter)

    processor = ComplianceProcessor(
        rule_engine=rule_engine,
        logger=logger,
        last_result_map=last_map,
        filters=filters,
    )

    processor.process(records)

    result_paths = processor.write_results(args.output, fieldnames)

    logger.print_summary()

    summary = {
        "total": logger.stats["total"],
        "normal": logger.stats["normal"],
        "abnormal": logger.stats["abnormal"],
        "review": logger.stats["review"],
        "missing_field": logger.stats["missing_field"],
        "duplicate": logger.stats["duplicate"],
        "risk_labels": logger.stats["risk_labels"],
        "output_files": result_paths,
    }

    summary_path = Path(args.output) / "summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    logger.info(f"汇总输出: {summary_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
