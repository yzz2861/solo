#!/usr/bin/env python3
"""跨城搬家物品清单 CLI 工具"""

import argparse
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from moving_checklist.core.models import (
    load_items_from_json, load_config_from_json,
    ParameterConfig, generate_trace_id
)
from moving_checklist.core.validator import Validator
from moving_checklist.core.generator import Generator, compute_items_hash
from moving_checklist.core.exporter import Exporter
from moving_checklist.core.summary import SummaryViewer


def cmd_validate(args):
    """validate 命令：校验物品清单"""
    try:
        items = load_items_from_json(args.items)
    except Exception as e:
        print(f"[错误] 加载业务台账失败: {e}", file=sys.stderr)
        return 2

    try:
        if args.config:
            config = load_config_from_json(args.config)
        else:
            config = ParameterConfig()
    except Exception as e:
        print(f"[错误] 加载参数文件失败: {e}", file=sys.stderr)
        return 2

    source = args.source or (items[0].source if items else "unknown")
    batch_no = args.batch or _generate_batch_no_simple()

    validator = Validator(config, batch_no, source)
    passed_items, failed_items = validator.validate(items)
    issues = validator.get_issues()

    print("=" * 60)
    print("  校验结果")
    print("=" * 60)
    print(f"  批次号:     {batch_no}")
    print(f"  来源:       {source}")
    print(f"  物品总数:   {len(items)}")
    print(f"  通过数量:   {len(passed_items)}")
    print(f"  异常数量:   {len(failed_items)}")
    print(f"  问题总数:   {len(issues)}")
    print(f"  错误数:     {validator.get_error_count()}")
    print(f"  警告数:     {validator.get_warning_count()}")
    print()

    if issues:
        print("-" * 60)
        print("  问题详情")
        print("-" * 60)
        for i, issue in enumerate(issues, 1):
            tag = "❌错误" if issue.severity == "error" else "⚠️警告"
            print(f"  {i:02d}. [{tag}] {issue.rule_name} ({issue.rule_id})")
            print(f"      物品ID:  {issue.item_id}")
            print(f"      字段:    {issue.field}")
            print(f"      实际值:  {issue.actual_value}")
            print(f"      期望值:  {issue.expected_value}")
            print(f"      描述:    {issue.description}")
            print(f"      追溯号:  {issue.trace_id}")
            print()

    if args.output:
        try:
            os.makedirs(args.output, exist_ok=True)
            issues_path = os.path.join(args.output, f"{batch_no}_validation_issues.json")
            with open(issues_path, "w", encoding="utf-8") as f:
                json.dump([i.to_dict() for i in issues], f, ensure_ascii=False, indent=2)
            print(f"  校验问题已保存到: {issues_path}")
        except Exception as e:
            print(f"[警告] 保存结果失败: {e}", file=sys.stderr)

    print("=" * 60)

    if validator.get_error_count() > 0:
        return 1
    return 0


def cmd_generate(args):
    """generate 命令：生成处理结果"""
    try:
        items = load_items_from_json(args.items)
    except Exception as e:
        print(f"[错误] 加载业务台账失败: {e}", file=sys.stderr)
        return 2

    try:
        if args.config:
            config = load_config_from_json(args.config)
        else:
            config = ParameterConfig()
    except Exception as e:
        print(f"[错误] 加载参数文件失败: {e}", file=sys.stderr)
        return 2

    source = args.source or (items[0].source if items else "unknown")

    filters = {}
    if args.category:
        filters["category"] = [c.strip() for c in args.category.split(",") if c.strip()]
    if args.fragile is not None:
        filters["fragile"] = args.fragile
    if args.min_value is not None:
        filters["min_value"] = args.min_value
    if args.max_value is not None:
        filters["max_value"] = args.max_value
    if args.min_weight is not None:
        filters["min_weight"] = args.min_weight
    if args.max_weight is not None:
        filters["max_weight"] = args.max_weight
    if args.keyword:
        filters["keyword"] = args.keyword

    generator = Generator(config, source)

    prev_result_path = args.previous or None
    force = args.force or False

    result = generator.generate(
        items,
        filters=filters,
        prev_result_path=prev_result_path,
        force_regenerate=force,
    )

    output_dir = args.output or config.output_dir
    saved_files = generator.save_result(result, output_dir)

    print("=" * 60)
    print("  生成结果")
    print("=" * 60)
    print(f"  批次号:        {result.batch_no}")
    print(f"  来源:          {result.source}")
    print(f"  处理时间:      {result.process_time}")
    if result.previous_batch_no:
        print(f"  上一批次:      {result.previous_batch_no}")
    print()
    print(f"  物品总数:      {result.total_count}")
    print(f"  通过数量:      {result.passed_count}")
    print(f"  异常数量:      {result.failed_count}")
    print()

    summary = result.summary
    print(f"  总数量:        {summary.get('total_quantity', 0)}")
    print(f"  总重量:        {summary.get('total_weight_kg', 0):.2f} kg")
    print(f"  总体积:        {summary.get('total_volume_cbm', 0):.2f} cbm")
    print(f"  总价值:        ¥{summary.get('total_value', 0):.2f}")
    print()

    if filters:
        print("  筛选条件:")
        for k, v in filters.items():
            print(f"    {k}: {v}")
        print()

    print("  输出文件:")
    for name, path in saved_files.items():
        print(f"    {name:8s}: {path}")
    print()

    print("=" * 60)

    error_count = summary.get("error_count", 0)
    if error_count > 0:
        return 1
    return 0


def cmd_export(args):
    """export 命令：导出处理结果"""
    try:
        result = Exporter.load_result(args.result)
    except Exception as e:
        print(f"[错误] 加载结果文件失败: {e}", file=sys.stderr)
        return 2

    output_dir = args.output or os.path.dirname(args.result)
    exporter = Exporter(output_dir)
    fmt = args.format or "csv"

    try:
        if args.type == "all":
            files = exporter.export_all(result, fmt)
            print("=" * 60)
            print("  导出结果")
            print("=" * 60)
            for name, path in files.items():
                print(f"  {name:8s}: {path}")
            print("=" * 60)
        elif args.type == "passed":
            path = exporter.export_passed(result, fmt)
            print(f"通过清单已导出: {path}")
        elif args.type == "failed":
            path = exporter.export_failed(result, fmt)
            print(f"异常清单已导出: {path}")
        elif args.type == "issues":
            path = exporter.export_issues(result, fmt)
            print(f"问题清单已导出: {path}")
        elif args.type == "summary":
            path = exporter.export_summary(result, fmt)
            print(f"摘要已导出: {path}")
        else:
            print(f"[错误] 未知导出类型: {args.type}", file=sys.stderr)
            return 2
    except Exception as e:
        print(f"[错误] 导出失败: {e}", file=sys.stderr)
        return 2

    return 0


def cmd_summary(args):
    """summary 命令：查看摘要"""
    try:
        result = SummaryViewer.load_result(args.result)
    except Exception as e:
        print(f"[错误] 加载结果文件失败: {e}", file=sys.stderr)
        return 2

    detailed = args.detailed or False
    output = SummaryViewer.format_summary(result, detailed)
    print(output)

    if args.compare:
        try:
            prev_result = SummaryViewer.load_result(args.compare)
            diff = SummaryViewer.compare_results(prev_result, result)
            print()
            print(SummaryViewer.format_compare(diff))
        except Exception as e:
            print(f"[警告] 对比历史结果失败: {e}", file=sys.stderr)

    if args.exit_code:
        return SummaryViewer.get_exit_code(result)

    return 0


def _generate_batch_no_simple():
    """简单生成批次号"""
    from datetime import datetime
    import uuid
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    suffix = uuid.uuid4().hex[:6].upper()
    return f"B{ts}{suffix}"


def main():
    parser = argparse.ArgumentParser(
        prog="moving-checklist",
        description="跨城搬家物品清单 CLI 工具 - 支持校验、生成、导出和查看摘要",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  校验清单:
    python cli.py validate --items data/samples/compliant/items.json

  生成处理结果:
    python cli.py generate --items data/samples/compliant/items.json --config data/samples/default_config.json

  带筛选生成:
    python cli.py generate --items data/samples/compliant/items.json --category 家具,电器 --min-value 1000

  历史回放（幂等性检查）:
    python cli.py generate --items data/samples/historical/items_v1.json --previous data/samples/historical/prev_result.json

  导出结果:
    python cli.py export --result data/output/B2025..._result.json --type all --format csv

  查看摘要:
    python cli.py summary --result data/output/B2025..._result.json --detailed

  历史对比:
    python cli.py summary --result data/output/new_result.json --compare data/output/old_result.json
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    validate_parser = subparsers.add_parser("validate", help="校验物品清单")
    validate_parser.add_argument("--items", required=True, help="业务台账文件路径(JSON)")
    validate_parser.add_argument("--config", help="参数配置文件路径(JSON)")
    validate_parser.add_argument("--source", help="来源标识")
    validate_parser.add_argument("--batch", help="批次号（自动生成如未指定）")
    validate_parser.add_argument("--output", help="输出目录")
    validate_parser.set_defaults(func=cmd_validate)

    generate_parser = subparsers.add_parser("generate", help="生成处理结果（含幂等性）")
    generate_parser.add_argument("--items", required=True, help="业务台账文件路径(JSON)")
    generate_parser.add_argument("--config", help="参数配置文件路径(JSON)")
    generate_parser.add_argument("--source", help="来源标识")
    generate_parser.add_argument("--previous", help="上次结果文件路径（用于幂等性检查）")
    generate_parser.add_argument("--force", action="store_true", help="强制重新生成（忽略幂等性）")
    generate_parser.add_argument("--output", help="输出目录")
    generate_parser.add_argument("--category", help="按品类筛选，多个用逗号分隔")
    generate_parser.add_argument("--fragile", type=lambda x: x.lower() == "true", help="是否易碎品筛选")
    generate_parser.add_argument("--min-value", type=float, help="最低价值筛选")
    generate_parser.add_argument("--max-value", type=float, help="最高价值筛选")
    generate_parser.add_argument("--min-weight", type=float, help="最低重量筛选(kg)")
    generate_parser.add_argument("--max-weight", type=float, help="最高重量筛选(kg)")
    generate_parser.add_argument("--keyword", help="关键词筛选（名称/备注）")
    generate_parser.set_defaults(func=cmd_generate)

    export_parser = subparsers.add_parser("export", help="导出处理结果")
    export_parser.add_argument("--result", required=True, help="处理结果文件路径(JSON)")
    export_parser.add_argument("--type", default="all",
                               choices=["all", "passed", "failed", "issues", "summary"],
                               help="导出类型 (默认: all)")
    export_parser.add_argument("--format", default="csv", choices=["csv", "json"], help="导出格式 (默认: csv)")
    export_parser.add_argument("--output", help="输出目录")
    export_parser.set_defaults(func=cmd_export)

    summary_parser = subparsers.add_parser("summary", help="查看摘要")
    summary_parser.add_argument("--result", required=True, help="处理结果文件路径(JSON)")
    summary_parser.add_argument("--detailed", action="store_true", help="显示详细信息")
    summary_parser.add_argument("--compare", help="对比历史结果文件")
    summary_parser.add_argument("--exit-code", action="store_true", help="按校验结果返回退出码")
    summary_parser.set_defaults(func=cmd_summary)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 0

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
