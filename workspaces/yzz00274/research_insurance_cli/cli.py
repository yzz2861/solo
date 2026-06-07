"""研学活动保险名单 CLI 入口"""

import os
import json
import sys
from datetime import datetime
from typing import Optional

import click

from . import __version__
from .pipeline import process_files
from .batch_manager import BatchManager
from .config import DEFAULT_FIELD_MAPPING, EXPORT_FORMATS
from .utils import parse_date


def _parse_field_mapping(mapping_str: Optional[str]) -> Optional[dict]:
    if not mapping_str:
        return None

    if os.path.exists(mapping_str):
        with open(mapping_str, "r", encoding="utf-8") as f:
            return json.load(f)

    try:
        return json.loads(mapping_str)
    except json.JSONDecodeError:
        mapping = {}
        pairs = mapping_str.split(",")
        for pair in pairs:
            if "=" in pair:
                key, value = pair.split("=", 1)
                mapping[key.strip()] = value.strip()
        return mapping if mapping else None


def _print_summary(result):
    click.echo()
    click.secho("=" * 60, fg="cyan")
    click.secho("  研学活动保险名单 - 处理结果摘要", fg="cyan", bold=True)
    click.secho("=" * 60, fg="cyan")
    click.echo()
    click.echo(f"  批次号:    {result.batch_id}")
    click.echo(f"  处理时间:  {result.processed_at.strftime('%Y-%m-%d %H:%M:%S')}")
    click.echo(f"  来源文件:  {', '.join(result.source_files)}")
    click.echo()
    click.echo(f"  总记录数:  {result.total_count}")
    click.secho(f"  正常记录:  {result.normal_count}", fg="green")
    click.secho(f"  异常记录:  {result.abnormal_count}", fg="red")
    click.secho(f"  待复核:    {result.pending_count}", fg="yellow")
    click.echo()


@click.group()
@click.version_option(__version__, "-v", "--version", prog_name="research-insurance")
def cli():
    """研学活动保险名单 CLI 工具

    面向政务金融法务人员，围绕研学活动保险名单完成
    数据校验、状态分流和后续闭环管理。
    """
    pass


@cli.command()
@click.argument("files", nargs=-1, required=True, type=click.Path(exists=True))
@click.option(
    "-m", "--mapping",
    help="字段映射配置（JSON文件路径或JSON字符串，或 key=val,key=val 格式）",
)
@click.option(
    "-s", "--start-date",
    help="活动开始日期范围（格式：YYYY-MM-DD）",
)
@click.option(
    "-e", "--end-date",
    help="活动结束日期范围（格式：YYYY-MM-DD）",
)
@click.option(
    "-f", "--format", "export_format",
    type=click.Choice(EXPORT_FORMATS),
    default="csv",
    show_default=True,
    help="导出文件格式",
)
@click.option(
    "-o", "--output-dir",
    default="./output",
    show_default=True,
    help="输出目录",
)
@click.option(
    "--no-split",
    is_flag=True,
    help="不拆分文件，所有记录输出到一个文件",
)
@click.option(
    "--batch-prefix",
    default="INS",
    show_default=True,
    help="批次号前缀",
)
@click.option(
    "--filter-date/--no-filter-date",
    default=False,
    help="是否按日期范围过滤记录（默认只做校验标记，不删除记录）",
)
def process(files, mapping, start_date, end_date, export_format, output_dir, no_split, batch_prefix, filter_date):
    """处理保险名单文件，进行校验、分流和导出

    FILES: 一个或多个输入文件路径（支持 CSV/Excel/JSON）
    """
    field_mapping = _parse_field_mapping(mapping)

    start = parse_date(start_date) if start_date else None
    end = parse_date(end_date) if end_date else None

    if (start_date and not start) or (end_date and not end):
        click.secho("错误：日期格式不正确，请使用 YYYY-MM-DD 格式", fg="red")
        sys.exit(1)

    if start and end and start > end:
        click.secho("错误：开始日期不能晚于结束日期", fg="red")
        sys.exit(1)

    if filter_date and (not start or not end):
        click.secho("错误：启用日期过滤时必须同时指定 --start-date 和 --end-date", fg="red")
        sys.exit(1)

    click.echo(f"正在处理 {len(files)} 个文件...")

    try:
        result = process_files(
            file_paths=list(files),
            field_mapping=field_mapping,
            start_date=start,
            end_date=end,
            filter_by_date=filter_date,
            output_dir=output_dir,
            export_format=export_format,
            split_files=not no_split,
            batch_prefix=batch_prefix,
        )
    except Exception as e:
        click.secho(f"处理失败：{e}", fg="red")
        sys.exit(1)

    _print_summary(result)

    click.secho("  导出文件：", fg="cyan")
    batch_manager = BatchManager(data_dir=output_dir)
    batch_info = batch_manager.get_batch(result.batch_id)
    if batch_info and "output_files" in batch_info:
        for label, path in batch_info["output_files"].items():
            click.echo(f"    - {label}: {path}")

    click.echo()
    click.secho("处理完成！", fg="green", bold=True)


@cli.command("list")
@click.option(
    "-n", "--limit",
    type=int,
    default=10,
    show_default=True,
    help="显示最近的批次数量",
)
@click.option(
    "-d", "--data-dir",
    default="./output",
    show_default=True,
    help="数据目录",
)
def list_batches(limit, data_dir):
    """查看历史处理批次列表"""
    batch_manager = BatchManager(data_dir=data_dir)
    batches = batch_manager.list_batches(limit=limit)

    if not batches:
        click.echo("暂无历史批次记录")
        return

    click.secho("=" * 80, fg="cyan")
    click.secho(f"  历史批次列表（最近 {len(batches)} 个）", fg="cyan", bold=True)
    click.secho("=" * 80, fg="cyan")
    click.echo()

    for i, batch in enumerate(batches, 1):
        status_icon = "✓" if batch.get("reviewed") else "○"
        status_color = "green" if batch.get("reviewed") else "yellow"

        click.secho(f"  [{i}] {batch['batch_id']}", fg="white", bold=True)
        click.echo(f"      处理时间: {batch['processed_at']}")
        click.echo(f"      来源文件: {', '.join(batch['source_files'])}")
        click.echo(
            f"      记录统计: 总数 {batch['total_count']} | "
            f"{click.style('正常 ' + str(batch['normal_count']), fg='green')} | "
            f"{click.style('异常 ' + str(batch['abnormal_count']), fg='red')} | "
            f"{click.style('待复核 ' + str(batch['pending_count']), fg='yellow')}"
        )
        click.echo(
            f"      验收状态: {click.style(status_icon + ' ' + ('已验收' if batch.get('reviewed') else '待验收'), fg=status_color)}"
        )
        if batch.get("review_notes"):
            click.echo(f"      验收备注: {batch['review_notes']}")
        click.echo()


@cli.command()
@click.argument("batch_id")
@click.option(
    "-d", "--data-dir",
    default="./output",
    show_default=True,
    help="数据目录",
)
def show(batch_id, data_dir):
    """查看指定批次的详细信息"""
    batch_manager = BatchManager(data_dir=data_dir)
    batch = batch_manager.get_batch(batch_id)

    if not batch:
        click.secho(f"未找到批次：{batch_id}", fg="red")
        sys.exit(1)

    click.secho("=" * 60, fg="cyan")
    click.secho(f"  批次详情 - {batch_id}", fg="cyan", bold=True)
    click.secho("=" * 60, fg="cyan")
    click.echo()
    click.echo(f"  处理时间: {batch['processed_at']}")
    click.echo(f"  来源文件: {', '.join(batch['source_files'])}")
    click.echo()
    click.echo(f"  总记录数: {batch['total_count']}")
    click.secho(f"  正常记录: {batch['normal_count']}", fg="green")
    click.secho(f"  异常记录: {batch['abnormal_count']}", fg="red")
    click.secho(f"  待复核:   {batch['pending_count']}", fg="yellow")
    click.echo()

    if batch.get("reviewed"):
        click.secho("  验收状态: 已验收", fg="green")
        click.echo(f"  验收时间: {batch.get('reviewed_at', 'N/A')}")
        if batch.get("review_status"):
            click.echo(f"  验收结论: {batch['review_status']}")
        if batch.get("review_notes"):
            click.echo(f"  验收备注: {batch['review_notes']}")
    else:
        click.secho("  验收状态: 待验收", fg="yellow")

    click.echo()
    if "output_files" in batch:
        click.secho("  导出文件：", fg="cyan")
        for label, path in batch["output_files"].items():
            click.echo(f"    - {label}: {path}")
    click.echo()


@cli.command()
@click.argument("batch_id")
@click.option(
    "-s", "--status",
    type=click.Choice(["低风险通过", "中风险需关注", "高风险需整改", "无法判定需补充"]),
    help="验收结论",
)
@click.option(
    "-n", "--notes",
    help="验收备注",
)
@click.option(
    "-d", "--data-dir",
    default="./output",
    show_default=True,
    help="数据目录",
)
def review(batch_id, status, notes, data_dir):
    """对指定批次进行验收确认

    BATCH_ID: 批次号
    """
    batch_manager = BatchManager(data_dir=data_dir)
    batch = batch_manager.get_batch(batch_id)

    if not batch:
        click.secho(f"未找到批次：{batch_id}", fg="red")
        sys.exit(1)

    if batch.get("reviewed"):
        click.echo(f"该批次已验收于 {batch.get('reviewed_at')}")
        if not click.confirm("是否重新验收？", default=False):
            return

    click.echo()
    click.secho("  批次信息确认：", fg="cyan")
    click.echo(f"    批次号:   {batch['batch_id']}")
    click.echo(f"    总记录数: {batch['total_count']}")
    click.echo(f"    正常: {batch['normal_count']} | "
               f"异常: {batch['abnormal_count']} | "
               f"待复核: {batch['pending_count']}")
    click.echo()

    if not status:
        click.echo("请选择验收结论：")
        options = [
            ("低风险通过", "数据质量良好，风险可控"),
            ("中风险需关注", "存在一些问题，需持续关注"),
            ("高风险需整改", "存在严重问题，需立即整改"),
            ("无法判定需补充", "信息不足，需补充材料"),
        ]
        for i, (label, desc) in enumerate(options, 1):
            click.echo(f"  [{i}] {label} - {desc}")

        choice = click.prompt("请输入选项编号", type=int, default=1)
        if 1 <= choice <= len(options):
            status = options[choice - 1][0]
        else:
            click.secho("无效选项", fg="red")
            sys.exit(1)

    if not notes:
        notes = click.prompt("请输入验收备注（可留空）", default="", show_default=False)

    success = batch_manager.review_batch(batch_id, notes=notes, status=status)

    if success:
        click.echo()
        click.secho(f"  批次 {batch_id} 验收完成！", fg="green", bold=True)
        click.echo(f"  验收结论: {status}")
        if notes:
            click.echo(f"  验收备注: {notes}")
    else:
        click.secho("验收失败", fg="red")
        sys.exit(1)


@cli.command()
@click.option(
    "-d", "--data-dir",
    default="./output",
    show_default=True,
    help="数据目录",
)
def stats(data_dir):
    """查看整体统计数据"""
    batch_manager = BatchManager(data_dir=data_dir)
    stats_data = batch_manager.get_statistics()

    click.secho("=" * 60, fg="cyan")
    click.secho("  整体统计数据", fg="cyan", bold=True)
    click.secho("=" * 60, fg="cyan")
    click.echo()

    for key, value in stats_data.items():
        click.echo(f"  {key}: {value}")

    click.echo()


@cli.command()
@click.option(
    "-o", "--output",
    default="./field_mapping_template.json",
    show_default=True,
    help="输出文件路径",
)
def template(output):
    """生成字段映射配置模板"""
    with open(output, "w", encoding="utf-8") as f:
        json.dump(DEFAULT_FIELD_MAPPING, f, ensure_ascii=False, indent=2)
    click.secho(f"字段映射模板已生成：{output}", fg="green")


def main():
    cli()


if __name__ == "__main__":
    main()
