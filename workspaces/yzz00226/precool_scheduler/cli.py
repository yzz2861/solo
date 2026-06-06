import sys
import os
from datetime import datetime

import click

from .io_utils import read_source_files, filter_sources_by_date
from .mapper import FieldMapper, load_mapping_from_file
from .validator import DataValidator
from .scheduler import PrecoolScheduler, compute_idempotency_key, generate_batch_id
from .exporter import ResultExporter
from .models import ValidationResult


def _parse_date(ctx, param, value):
    if not value:
        return None
    fmts = ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"]
    for fmt in fmts:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise click.BadParameter(f"日期格式无效: {value}，支持 YYYY-MM-DD / YYYY/MM/DD")


def _get_mapper(mapping_file):
    if mapping_file:
        mapping = load_mapping_from_file(mapping_file)
        return FieldMapper(mapping)
    return FieldMapper()


def _print_validation_summary(result, sources_count, filtered_count=None):
    click.echo("=" * 60)
    click.echo("  校验结果汇总")
    click.echo("=" * 60)
    click.echo(f"  输入记录数:    {sources_count}")
    if filtered_count is not None and filtered_count != sources_count:
        click.echo(f"  日期过滤后:    {filtered_count}")
    click.echo(f"  通过校验:      {result.pass_count}")
    click.echo(f"  异常记录:      {result.exception_count}")
    click.echo(f"  待人工复核:    {result.review_count}")
    click.echo("=" * 60)


def _print_detailed_exceptions(result):
    if not result.exceptions:
        return
    click.echo("")
    click.echo("异常明细:")
    click.echo("-" * 60)
    for i, rec in enumerate(result.exceptions[:20], 1):
        click.echo(f"  [{i}] {rec.source_file} 第{rec.row_number}行")
        for err in rec.errors:
            click.echo(f"      - {err}")
    if len(result.exceptions) > 20:
        click.echo(f"  ... 还有 {len(result.exceptions) - 20} 条异常，详见导出文件")


def _print_review_entries(result):
    review_records = [r for r in result.passed if r.review_required]
    if not review_records:
        return
    click.echo("")
    click.echo("人工复核入口:")
    click.echo("-" * 60)
    for i, rec in enumerate(review_records[:10], 1):
        click.echo(f"  [{i}] {rec.record_id}")
        click.echo(f"      产品: {rec.product_name} ({rec.product_type})")
        click.echo(f"      原因: {rec.review_reason}")
        click.echo(f"      来源: {rec.source_file} 第{rec.row_number}行")
    if len(review_records) > 10:
        click.echo(f"  ... 还有 {len(review_records) - 10} 条待复核，详见导出文件")


@click.group()
@click.version_option(version="1.0.0", prog_name="precool-scheduler")
def cli():
    """冷库果蔬预冷排程 CLI - 校验、生成、导出、查看摘要"""
    pass


@cli.command()
@click.argument("files", nargs=-1, required=True, type=click.Path(exists=True))
@click.option("--mapping", "-m", type=click.Path(exists=True), help="字段映射文件 (JSON/CSV)")
@click.option("--date-start", type=str, callback=_parse_date, help="日期范围开始 (YYYY-MM-DD)")
@click.option("--date-end", type=str, callback=_parse_date, help="日期范围结束 (YYYY-MM-DD)")
@click.option("--output", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--format", "-f", "fmt", type=click.Choice(["csv", "json", "excel"]), default="csv", help="导出格式")
@click.option("--no-idempotent", is_flag=True, help="禁用幂等性检查")
def validate(files, mapping, date_start, date_end, output, fmt, no_idempotent):
    """校验原始数据，输出通过/异常/复核清单"""
    try:
        sources = read_source_files(list(files))
        mapper = _get_mapper(mapping)
        batch_id = generate_batch_id()

        filtered = filter_sources_by_date(sources, mapper, date_start, date_end)

        validator = DataValidator(mapper, batch_id)
        result = validator.validate(filtered)

        _print_validation_summary(result, len(sources), len(filtered))
        _print_detailed_exceptions(result)
        _print_review_entries(result)

        passed_dicts = [r.to_dict() for r in result.passed]
        exception_dicts = [r.to_dict() for r in result.exceptions]

        scheduler_result = {
            "batch_id": batch_id,
            "idempotency_key": "",
            "is_cached": False,
            "passed": passed_dicts,
            "exceptions": exception_dicts,
            "summary": {
                "batch_id": batch_id,
                "generated_at": datetime.now().isoformat(),
                "source_files": sorted(set(f for f in files)),
                "date_range_start": date_start.isoformat() if date_start else "",
                "date_range_end": date_end.isoformat() if date_end else "",
                "total_records": result.total_count,
                "passed_records": result.pass_count,
                "exception_records": result.exception_count,
                "review_records": result.review_count,
                "precool_rooms": sorted(set(r.precool_room for r in result.passed if r.precool_room)),
                "total_precool_hours": round(sum(r.precool_hours for r in result.passed), 2),
                "idempotency_key": "",
            },
            "message": "校验完成",
        }

        exporter = ResultExporter(output)
        exported = exporter.export(scheduler_result, fmt)
        click.echo("")
        click.echo("导出文件:")
        for k, v in exported.items():
            click.echo(f"  - {k}: {v}")

        exit_code = 0 if result.exception_count == 0 else 1
        sys.exit(exit_code)
    except Exception as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(2)


@cli.command()
@click.argument("files", nargs=-1, required=True, type=click.Path(exists=True))
@click.option("--mapping", "-m", type=click.Path(exists=True), help="字段映射文件 (JSON/CSV)")
@click.option("--date-start", type=str, callback=_parse_date, help="日期范围开始 (YYYY-MM-DD)")
@click.option("--date-end", type=str, callback=_parse_date, help="日期范围结束 (YYYY-MM-DD)")
@click.option("--output", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--format", "-f", "fmt", type=click.Choice(["csv", "json", "excel"]), default="csv", help="导出格式")
@click.option("--no-idempotent", is_flag=True, help="禁用幂等性检查")
@click.option("--batch-id", type=str, help="指定批次号（默认自动生成）")
def generate(files, mapping, date_start, date_end, output, fmt, no_idempotent, batch_id):
    """生成预冷排程计划"""
    try:
        sources = read_source_files(list(files))
        mapper = _get_mapper(mapping)

        scheduler = PrecoolScheduler(
            mapper=mapper,
            batch_id=batch_id,
            date_start=date_start,
            date_end=date_end,
            output_dir=output,
            idempotent=not no_idempotent,
        )
        result = scheduler.generate(sources)

        summary = result["summary"]
        click.echo("=" * 60)
        click.echo("  预冷排程生成结果")
        click.echo("=" * 60)
        click.echo(f"  批次号:        {summary['batch_id']}")
        click.echo(f"  幂等键:        {result['idempotency_key']}")
        if result.get("is_cached"):
            click.echo(f"  状态:          命中缓存（幂等）")
        else:
            click.echo(f"  状态:          新生成")
        click.echo(f"  来源文件:      {', '.join(summary['source_files'])}")
        click.echo(f"  总记录数:      {summary['total_records']}")
        click.echo(f"  通过排程:      {summary['passed_records']}")
        click.echo(f"  异常记录:      {summary['exception_records']}")
        click.echo(f"  待人工复核:    {summary['review_records']}")
        click.echo(f"  预冷库位:      {', '.join(summary['precool_rooms'])}")
        click.echo(f"  总预冷时长:    {summary['total_precool_hours']} 小时")
        click.echo("=" * 60)

        if result["exceptions"]:
            click.echo("")
            click.echo("异常明细 (前5条):")
            click.echo("-" * 60)
            for i, rec in enumerate(result["exceptions"][:5], 1):
                click.echo(f"  [{i}] {rec['source_file']} 第{rec['row_number']}行")
                for err in rec["errors"]:
                    click.echo(f"      - {err}")

        review_records = [r for r in result["passed"] if r.get("review_required")]
        if review_records:
            click.echo("")
            click.echo("人工复核入口 (前5条):")
            click.echo("-" * 60)
            for i, rec in enumerate(review_records[:5], 1):
                click.echo(f"  [{i}] {rec['record_id']}")
                click.echo(f"      产品: {rec['product_name']}")
                click.echo(f"      原因: {rec['review_reason']}")
                click.echo(f"      来源: {rec['source_file']} 第{rec['row_number']}行")

        exporter = ResultExporter(output)
        exported = exporter.export(result, fmt)
        click.echo("")
        click.echo("导出文件:")
        for k, v in exported.items():
            click.echo(f"  - {k}: {v}")

        exit_code = 0 if summary["exception_records"] == 0 else 1
        sys.exit(exit_code)
    except Exception as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(2)


@cli.command(name="export")
@click.argument("files", nargs=-1, required=True, type=click.Path(exists=True))
@click.option("--mapping", "-m", type=click.Path(exists=True), help="字段映射文件 (JSON/CSV)")
@click.option("--date-start", type=str, callback=_parse_date, help="日期范围开始 (YYYY-MM-DD)")
@click.option("--date-end", type=str, callback=_parse_date, help="日期范围结束 (YYYY-MM-DD)")
@click.option("--output", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--format", "-f", "fmt", type=click.Choice(["csv", "json", "excel"]), default="csv", help="导出格式")
@click.option("--no-idempotent", is_flag=True, help="禁用幂等性检查")
@click.option("--batch-id", type=str, help="指定批次号")
def export_cmd(files, mapping, date_start, date_end, output, fmt, no_idempotent, batch_id):
    """生成并排程并导出（generate + export 一体化）"""
    try:
        sources = read_source_files(list(files))
        mapper = _get_mapper(mapping)

        scheduler = PrecoolScheduler(
            mapper=mapper,
            batch_id=batch_id,
            date_start=date_start,
            date_end=date_end,
            output_dir=output,
            idempotent=not no_idempotent,
        )
        result = scheduler.generate(sources)

        exporter = ResultExporter(output)
        exported = exporter.export(result, fmt)

        click.echo("=" * 60)
        click.echo("  导出完成")
        click.echo("=" * 60)
        click.echo(f"  批次号: {result['summary']['batch_id']}")
        if result.get("is_cached"):
            click.echo(f"  状态: 命中缓存（幂等）")
        click.echo(f"  格式:   {fmt}")
        for k, v in exported.items():
            click.echo(f"  {k}: {v}")
        click.echo("=" * 60)

        exit_code = 0 if result["summary"]["exception_records"] == 0 else 1
        sys.exit(exit_code)
    except Exception as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(2)


@cli.command()
@click.argument("batch_file", required=False, type=click.Path(exists=True))
@click.option("--batch-id", type=str, help="指定批次号，从 output 目录查找")
@click.option("--output", "-o", type=click.Path(), default="./output", help="输出目录")
def summary(batch_file, batch_id, output):
    """查看批次排程摘要"""
    try:
        target_file = None
        if batch_file:
            target_file = batch_file
        elif batch_id:
            json_path = os.path.join(output, f"{batch_id}_result.json")
            summary_path = os.path.join(output, f"{batch_id}_summary.json")
            if os.path.exists(json_path):
                target_file = json_path
            elif os.path.exists(summary_path):
                target_file = summary_path
            else:
                raise click.ClickException(f"未找到批次 {batch_id} 的结果文件")
        else:
            raise click.UsageError("请指定 --batch-id 或提供结果文件路径")

        import json
        with open(target_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        if "summary" in data:
            s = data["summary"]
            passed = data.get("passed", [])
            exceptions = data.get("exceptions", [])
        else:
            s = data
            passed = []
            exceptions = []

        click.echo("=" * 60)
        click.echo("  批次排程摘要")
        click.echo("=" * 60)
        click.echo(f"  批次号:        {s.get('batch_id', 'N/A')}")
        click.echo(f"  生成时间:      {s.get('generated_at', 'N/A')}")
        click.echo(f"  来源文件:      {', '.join(s.get('source_files', []))}")
        click.echo(f"  日期范围:      {s.get('date_range_start', '')} ~ {s.get('date_range_end', '')}")
        click.echo(f"  总记录数:      {s.get('total_records', 0)}")
        click.echo(f"  通过排程:      {s.get('passed_records', 0)}")
        click.echo(f"  异常记录:      {s.get('exception_records', 0)}")
        click.echo(f"  待人工复核:    {s.get('review_records', 0)}")
        click.echo(f"  预冷库位:      {', '.join(s.get('precool_rooms', []))}")
        click.echo(f"  总预冷时长:    {s.get('total_precool_hours', 0)} 小时")
        click.echo(f"  幂等键:        {s.get('idempotency_key', 'N/A')}")
        click.echo("=" * 60)

        if exceptions:
            click.echo("")
            click.echo(f"异常 {len(exceptions)} 条 (前3条):")
            for i, rec in enumerate(exceptions[:3], 1):
                click.echo(f"  [{i}] {rec.get('source_file','')} 第{rec.get('row_number','')}行 - {'; '.join(rec.get('errors', []))}")

        review_records = [r for r in passed if r.get("review_required")]
        if review_records:
            click.echo("")
            click.echo(f"待复核 {len(review_records)} 条 (前3条):")
            for i, rec in enumerate(review_records[:3], 1):
                click.echo(f"  [{i}] {rec.get('record_id','')} - {rec.get('product_name','')} - {rec.get('review_reason','')}")

        sys.exit(0)
    except click.ClickException:
        raise
    except Exception as e:
        click.echo(f"错误: {e}", err=True)
        sys.exit(2)


def main():
    cli()


if __name__ == "__main__":
    main()
