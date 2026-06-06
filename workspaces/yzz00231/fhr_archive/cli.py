import argparse
import os
import sys
import json

from .reader import read_main_list, read_supplement, read_validation_rules
from .validator import ValidationEngine
from .generator import ArchiveGenerator
from .exporter import ReportExporter
from .summary import ConsoleSummary, ProcessLogger
from .batch import BatchManager
from . import __version__


def main():
    parser = argparse.ArgumentParser(
        prog="fhr-archive",
        description="产房胎心监护归档CLI工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--version", action="version", version=f"fhr-archive {__version__}")

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    _add_validate_parser(subparsers)
    _add_generate_parser(subparsers)
    _add_export_parser(subparsers)
    _add_summary_parser(subparsers)
    _add_history_parser(subparsers)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "validate":
        cmd_validate(args)
    elif args.command == "generate":
        cmd_generate(args)
    elif args.command == "export":
        cmd_export(args)
    elif args.command == "summary":
        cmd_summary(args)
    elif args.command == "history":
        cmd_history(args)


def _add_validate_parser(subparsers):
    p = subparsers.add_parser("validate", help="校验胎心监护记录")
    p.add_argument("--main", "-m", required=True, help="主清单文件路径 (CSV/JSON)")
    p.add_argument("--supplement", "-s", help="补充表文件路径 (CSV/JSON)")
    p.add_argument("--rules", "-r", required=True, help="校验规则文件路径 (CSV/JSON)")
    p.add_argument("--output", "-o", default="./output", help="输出目录 (默认: ./output)")
    p.add_argument("--source-id", default="", help="来源标识")
    p.add_argument("--no-color", action="store_true", help="禁用彩色输出")
    p.add_argument("--detail", action="store_true", help="显示详细校验结果")


def _add_generate_parser(subparsers):
    p = subparsers.add_parser("generate", help="生成归档明细和复核列表")
    p.add_argument("--main", "-m", required=True, help="主清单文件路径 (CSV/JSON)")
    p.add_argument("--supplement", "-s", help="补充表文件路径 (CSV/JSON)")
    p.add_argument("--rules", "-r", required=True, help="校验规则文件路径 (CSV/JSON)")
    p.add_argument("--output", "-o", default="./output", help="输出目录 (默认: ./output)")
    p.add_argument("--source-id", default="", help="来源标识")
    p.add_argument("--batch-id", default="", help="指定批次ID (不指定则自动生成)")
    p.add_argument("--format", choices=["csv", "json", "both"], default="csv",
                   help="输出格式 (默认: csv)")
    p.add_argument("--no-color", action="store_true", help="禁用彩色输出")
    p.add_argument("--force", action="store_true",
                   help="强制执行，即使已存在相同校验和的批次")


def _add_export_parser(subparsers):
    p = subparsers.add_parser("export", help="导出可发送报告")
    p.add_argument("--main", "-m", required=True, help="主清单文件路径 (CSV/JSON)")
    p.add_argument("--supplement", "-s", help="补充表文件路径 (CSV/JSON)")
    p.add_argument("--rules", "-r", required=True, help="校验规则文件路径 (CSV/JSON)")
    p.add_argument("--output", "-o", default="./output", help="输出目录 (默认: ./output)")
    p.add_argument("--source-id", default="", help="来源标识")
    p.add_argument("--batch-id", default="", help="指定批次ID")
    p.add_argument("--format", choices=["txt", "html", "csv", "all"], default="all",
                   help="报告格式 (默认: all)")
    p.add_argument("--no-color", action="store_true", help="禁用彩色输出")
    p.add_argument("--force", action="store_true",
                   help="强制执行，即使已存在相同校验和的批次")


def _add_summary_parser(subparsers):
    p = subparsers.add_parser("summary", help="查看处理摘要")
    p.add_argument("--batch-id", "-b", help="指定批次ID查看摘要")
    p.add_argument("--output", "-o", default="./output", help="输出目录 (默认: ./output)")
    p.add_argument("--main", "-m", help="主清单文件路径 (用于实时计算)")
    p.add_argument("--supplement", "-s", help="补充表文件路径")
    p.add_argument("--rules", "-r", help="校验规则文件路径")
    p.add_argument("--source-id", default="", help="来源标识")
    p.add_argument("--no-color", action="store_true", help="禁用彩色输出")
    p.add_argument("--show-review", action="store_true", help="显示复核列表")
    p.add_argument("--show-details", action="store_true", help="显示明细记录")


def _add_history_parser(subparsers):
    p = subparsers.add_parser("history", help="查看历史批次记录")
    p.add_argument("--output", "-o", default="./output", help="输出目录 (默认: ./output)")
    p.add_argument("--limit", "-n", type=int, default=10, help="显示条数 (默认: 10)")
    p.add_argument("--no-color", action="store_true", help="禁用彩色输出")


def _load_data(args):
    main_records = read_main_list(args.main)

    supplement_records = None
    if args.supplement and os.path.exists(args.supplement):
        supplement_records = read_supplement(args.supplement)

    rules = read_validation_rules(args.rules)

    return main_records, supplement_records, rules


def _process(args, generate_output: bool = True):
    main_records, supplement_records, rules = _load_data(args)

    output_dir = os.path.abspath(args.output)
    source_id = args.source_id or os.path.basename(args.main)

    batch_manager = BatchManager(output_dir, source_id)

    rules_str = json.dumps([r.__dict__ for r in rules], sort_keys=True, ensure_ascii=False)
    import hashlib
    rules_hash = hashlib.md5(rules_str.encode("utf-8")).hexdigest()

    checksum = batch_manager.compute_checksum(main_records, supplement_records, rules_hash)

    existing_batch = batch_manager.find_existing_batch(checksum)
    if existing_batch and not getattr(args, "force", False):
        print(f"检测到相同数据的历史批次: {existing_batch.batch_id}")
        print(f"处理时间: {existing_batch.processed_at}")
        print("使用 --force 参数可强制重新处理")
        return _load_existing_results(output_dir, existing_batch.batch_id)

    batch_id = args.batch_id if hasattr(args, "batch_id") and args.batch_id else batch_manager.generate_batch_id()

    logger = ProcessLogger(os.path.join(output_dir, "logs"), batch_id)
    logger.info(f"开始处理批次: {batch_id}")
    logger.info(f"来源标识: {source_id}")
    logger.info(f"主清单记录数: {len(main_records)}")
    if supplement_records:
        logger.info(f"补充表记录数: {len(supplement_records)}")
    logger.info(f"启用规则数: {len(rules)}")

    engine = ValidationEngine(rules)
    validation_results = engine.validate_all(main_records, supplement_records)

    failed_count = sum(1 for results in validation_results.values()
                       if any(not r.passed for r in results))
    logger.info(f"校验完成: {len(main_records)} 条记录, {failed_count} 条存在问题")

    generator = ArchiveGenerator(batch_id, source_id)
    details = generator.generate_details(main_records, validation_results, supplement_records)
    review_items = generator.generate_review_list(details)
    summary = generator.generate_summary(details)

    logger.info(f"汇总: 总计{summary.total_records}条, "
                f"正常{summary.valid_records}条, "
                f"需复核{summary.review_required}条")

    if generate_output:
        out_detail_dir = os.path.join(output_dir, "details")
        out_review_dir = os.path.join(output_dir, "review")
        out_summary_dir = os.path.join(output_dir, "summary")

        fmt = getattr(args, "format", "csv")

        if fmt in ("csv", "both"):
            generator.save_details_csv(details, os.path.join(out_detail_dir, f"{batch_id}_details.csv"))
            generator.save_review_csv(review_items, os.path.join(out_review_dir, f"{batch_id}_review.csv"))
            logger.info("已生成CSV格式明细和复核列表")

        if fmt in ("json", "both"):
            generator.save_details_json(details, os.path.join(out_detail_dir, f"{batch_id}_details.json"))
            logger.info("已生成JSON格式明细")

        generator.save_summary_json(summary, os.path.join(out_summary_dir, f"{batch_id}_summary.json"))
        logger.info("已生成摘要文件")

        input_files = [args.main]
        if args.supplement:
            input_files.append(args.supplement)
        input_files.append(args.rules)

        batch_manager.register_batch(
            batch_id=batch_id,
            record_count=len(main_records),
            checksum=checksum,
            input_files=input_files,
        )
        logger.info(f"批次 {batch_id} 已注册")

        logger.save()
        print(f"日志文件: {logger.save()}")

    return {
        "summary": summary,
        "details": details,
        "review_items": review_items,
        "validation_results": validation_results,
        "batch_id": batch_id,
        "source_id": source_id,
    }


def _load_existing_results(output_dir: str, batch_id: str):
    summary_path = os.path.join(output_dir, "summary", f"{batch_id}_summary.json")
    detail_path = os.path.join(output_dir, "details", f"{batch_id}_details.json")
    review_path = os.path.join(output_dir, "review", f"{batch_id}_review.csv")

    summary = None
    details = []
    review_items = []

    if os.path.exists(summary_path):
        with open(summary_path, "r", encoding="utf-8") as f:
            import json
            data = json.load(f)
            from .models import ArchiveSummary
            summary = ArchiveSummary(**data)

    if os.path.exists(detail_path):
        with open(detail_path, "r", encoding="utf-8") as f:
            import json
            data = json.load(f)
            from .models import DetailRecord, ValidationResult, ReviewItem
            for item in data:
                vr_list = []
                rec_id = item.get("record_id", "")
                for vr in item.get("validation_results", []):
                    if "record_id" not in vr:
                        vr["record_id"] = rec_id
                    vr_list.append(ValidationResult(**vr))
                item["validation_results"] = vr_list
                details.append(DetailRecord(**item))

            review_items = [
                ReviewItem(
                    record_id=d.record_id,
                    patient_name=d.patient_name,
                    exam_time=d.exam_time,
                    risk_level=d.risk_level,
                    review_reason=d.review_reason,
                    risk_tags=d.risk_tags,
                    batch_id=d.batch_id,
                    source_identifier=d.source_identifier,
                )
                for d in details if d.needs_review
            ]

    return {
        "summary": summary,
        "details": details,
        "review_items": review_items,
        "validation_results": {},
        "batch_id": batch_id,
        "source_id": summary.source_identifier if summary else "",
        "loaded_from_history": True,
    }


def cmd_validate(args):
    console = ConsoleSummary(use_color=not args.no_color)

    result = _process(args, generate_output=False)
    summary = result["summary"]
    validation_results = result["validation_results"]
    details = result["details"]

    console.print_summary(summary)

    if args.detail:
        for d in details[:5]:
            console.print_validation_detail(d.validation_results, d.record_id)

    failed_records = [d for d in details if d.risk_level != "normal"]
    if failed_records:
        console.print_review_list(result["review_items"])

    print(f"校验完成: 共 {summary.total_records} 条记录")
    print(f"  通过: {summary.valid_records} 条")
    print(f"  未通过: {summary.invalid_records} 条")


def cmd_generate(args):
    console = ConsoleSummary(use_color=not args.no_color)

    result = _process(args, generate_output=True)

    if result.get("loaded_from_history"):
        print("\n检测到历史批次，直接使用已有结果 (使用 --force 可重新生成)")

    summary = result["summary"]
    review_items = result["review_items"]

    console.print_summary(summary)
    console.print_review_list(review_items)

    print(f"\n✅ 生成完成")
    print(f"  批次ID: {summary.batch_id}")
    print(f"  输出目录: {os.path.abspath(args.output)}")


def cmd_export(args):
    console = ConsoleSummary(use_color=not args.no_color)

    result = _process(args, generate_output=True)

    if result.get("loaded_from_history"):
        print("\n检测到历史批次，直接使用已有结果导出")

    summary = result["summary"]
    details = result["details"]
    review_items = result["review_items"]

    output_dir = os.path.abspath(args.output)
    report_dir = os.path.join(output_dir, "reports")
    exporter = ReportExporter(report_dir)

    fmt = args.format
    generated_files = []

    if fmt in ("txt", "all"):
        f = exporter.export_text_report(summary, details, review_items)
        generated_files.append(f)

    if fmt in ("html", "all"):
        f = exporter.export_html_report(summary, details, review_items)
        generated_files.append(f)

    if fmt in ("csv", "all"):
        files = exporter.export_csv_package(summary, details, review_items)
        generated_files.extend(files)

    console.print_summary(summary)
    console.print_review_list(review_items)

    print(f"\n✅ 导出完成")
    print(f"  批次ID: {summary.batch_id}")
    print(f"  报告文件:")
    for f in generated_files:
        print(f"    - {f}")


def cmd_summary(args):
    console = ConsoleSummary(use_color=not args.no_color)

    if args.batch_id:
        output_dir = os.path.abspath(args.output)
        result = _load_existing_results(output_dir, args.batch_id)
    elif args.main and args.rules:
        result = _process(args, generate_output=False)
    else:
        print("请指定 --batch-id 或同时指定 --main 和 --rules")
        sys.exit(1)

    summary = result["summary"]
    details = result["details"]
    review_items = result["review_items"]

    console.print_summary(summary)

    if args.show_review:
        console.print_review_list(review_items, limit=20)

    if args.show_details:
        console.print_details(details, limit=10)


def cmd_history(args):
    console = ConsoleSummary(use_color=not args.no_color)

    output_dir = os.path.abspath(args.output)
    batch_manager = BatchManager(output_dir, "")

    batches = batch_manager.get_batch_history(limit=args.limit)
    console.print_batch_history(list(reversed(batches)))


if __name__ == "__main__":
    main()
