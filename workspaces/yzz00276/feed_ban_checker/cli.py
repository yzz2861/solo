"""CLI 入口。

提供三个子命令：
- check: 执行禁用料检查
- replay: 数据回放
- init: 生成示例配置
"""
import os
import sys

import click

from .__init__ import __version__
from .pipeline import run_pipeline, validate_params
from .logger import DataReplay


@click.group()
@click.version_option(__version__, prog_name="feed-ban-checker")
def cli():
    """饲料配方禁用料检查CLI工具。"""
    pass


@cli.command()
@click.option(
    "--input", "-i", "input_files",
    multiple=True, required=True,
    help="原始配方文件，可指定多个。支持 CSV/Excel/JSON",
)
@click.option(
    "--banned", "-b", "banned_file",
    required=True,
    help="禁用料清单文件",
)
@click.option(
    "--mapping", "-m", "mapping_file",
    default=None,
    help="字段映射配置文件(JSON)",
)
@click.option(
    "--output", "-o", "output_dir",
    default="./output",
    help="输出目录，默认 ./output",
)
@click.option(
    "--start-date",
    default=None,
    help="开始日期，格式 YYYY-MM-DD",
)
@click.option(
    "--end-date",
    default=None,
    help="结束日期，格式 YYYY-MM-DD",
)
@click.option(
    "--format", "-f", "fmt",
    type=click.Choice(["csv", "excel", "json"]),
    default="csv",
    help="导出格式，默认 csv",
)
@click.option(
    "--dry-run",
    is_flag=True, default=False,
    help="预览模式，仅校验不落文件",
)
@click.option(
    "--batch-id",
    default=None,
    help="自定义批次号，默认自动生成",
)
def check(input_files, banned_file, mapping_file, output_dir,
          start_date, end_date, fmt, dry_run, batch_id):
    """执行饲料配方禁用料检查。"""
    errors = validate_params(
        source_files=list(input_files),
        banned_file=banned_file,
        output_dir=output_dir,
        start_date=start_date,
        end_date=end_date,
        fmt=fmt,
    )

    if errors:
        click.secho("参数校验失败：", fg="red", bold=True)
        for e in errors:
            click.secho(f"  ✗ {e}", fg="red")
        sys.exit(1)

    click.secho(f"{'[Dry-Run] ' if dry_run else ''}开始处理...", fg="cyan", bold=True)
    click.echo(f"  原始文件: {len(input_files)} 个")
    click.echo(f"  禁料清单: {banned_file}")
    click.echo(f"  输出目录: {output_dir}")
    click.echo(f"  导出格式: {fmt}")
    if start_date or end_date:
        click.echo(f"  日期范围: {start_date or '开始'} ~ {end_date or '结束'}")
    click.echo()

    try:
        result = run_pipeline(
            source_files=list(input_files),
            banned_file=banned_file,
            output_dir=output_dir,
            mapping_file=mapping_file,
            start_date=start_date,
            end_date=end_date,
            fmt=fmt,
            dry_run=dry_run,
            batch_id=batch_id,
        )
    except Exception as e:
        click.secho(f"\n处理异常: {e}", fg="red", bold=True)
        sys.exit(2)

    _print_result_summary(result, dry_run)

    if result.task_status.value == "失败":
        sys.exit(1)
    elif result.task_status.value == "部分成功":
        sys.exit(0)


@cli.command()
@click.argument("log_file")
def replay(log_file):
    """数据回放：按批次查看处理历史。"""
    if not os.path.exists(log_file):
        click.secho(f"日志文件不存在: {log_file}", fg="red")
        sys.exit(1)

    try:
        summary = DataReplay.replay_summary(log_file)
        click.echo(summary)
    except Exception as e:
        click.secho(f"回放失败: {e}", fg="red")
        sys.exit(2)


@cli.command()
@click.option(
    "--output", "-o", "output_dir",
    default="./examples",
    help="示例文件输出目录",
)
def init(output_dir):
    """生成示例配置和数据文件。"""
    os.makedirs(output_dir, exist_ok=True)

    _gen_sample_mapping(os.path.join(output_dir, "field_mapping.json"))
    _gen_sample_banned(os.path.join(output_dir, "banned_list.csv"))
    _gen_sample_formula(os.path.join(output_dir, "formula_sample_1.csv"))
    _gen_sample_formula(os.path.join(output_dir, "formula_sample_2.csv"))

    click.secho("示例文件已生成:", fg="green", bold=True)
    for f in os.listdir(output_dir):
        click.echo(f"  ✓ {os.path.join(output_dir, f)}")
    click.echo()
    click.echo("运行示例:")
    click.echo(f"  feed-ban-checker check -i {output_dir}/formula_sample_1.csv "
               f"-i {output_dir}/formula_sample_2.csv "
               f"-b {output_dir}/banned_list.csv "
               f"-m {output_dir}/field_mapping.json "
               f"-o ./output")


def _print_result_summary(result, dry_run):
    """打印结果摘要。"""
    click.echo()
    click.secho("═" * 50, fg="cyan")
    click.secho("  处理结果摘要", fg="cyan", bold=True)
    click.secho("═" * 50, fg="cyan")

    status_color = {
        "成功": "green",
        "部分成功": "yellow",
        "失败": "red",
    }.get(result.task_status.value, "white")

    click.echo(f"  批次号:     {result.batch_id}")
    click.secho(f"  任务状态:   {result.task_status.value}", fg=status_color, bold=True)
    click.echo(f"  处理时间:   {result.processed_at.strftime('%Y-%m-%d %H:%M:%S')}")
    click.echo(f"  来源文件:   {', '.join(result.source_files)}")
    click.echo()
    click.echo(f"  总行数:     {result.total_rows}")
    click.echo(f"  有效行:     {result.valid_rows}")
    click.secho(f"  坏行:       {result.bad_rows}", fg="yellow" if result.bad_rows > 0 else "white")
    click.echo()
    click.echo(f"  命中禁料:   {result.banned_count}")
    click.secho(f"    高风险:   {result.high_risk_count}", fg="red")
    click.secho(f"    中风险:   {result.medium_risk_count}", fg="yellow")
    click.secho(f"    低风险:   {result.low_risk_count}", fg="green")
    click.secho(f"    无法判定: {result.unknown_risk_count}", fg="white")
    click.echo()

    if dry_run:
        click.secho("  [Dry-Run] 未生成导出文件", fg="yellow", bold=True)
    else:
        click.secho("  输出文件:", fg="green", bold=True)
        for key, path in result.output_files.items():
            click.echo(f"    {key}: {path}")
        if result.log_file:
            click.echo(f"    操作日志: {result.log_file}")

    if result.errors:
        click.secho("\n  错误:", fg="red", bold=True)
        for e in result.errors:
            click.secho(f"    ✗ {e}", fg="red")

    if result.warnings:
        click.secho("\n  警告:", fg="yellow", bold=True)
        for w in result.warnings:
            click.echo(f"    ⚠ {w}")

    click.secho("═" * 50, fg="cyan")


def _gen_sample_mapping(path):
    import json
    data = {
        "formula_id": "配方编号",
        "formula_name": "配方名称",
        "ingredient_name": "原料名称",
        "ingredient_code": "原料编码",
        "dosage": "添加量",
        "dosage_unit": "添加量单位",
        "date_field": "生效日期",
        "remark": "备注",
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _gen_sample_banned(path):
    import csv
    rows = [
        ["ingredient_name", "ingredient_code", "risk_level", "reason", "ban_date"],
        ["瘦肉精", "B001", "高风险", "国家明令禁止使用", "2020-01-01"],
        ["三聚氰胺", "B002", "高风险", "有毒有害物质", "2008-01-01"],
        ["苏丹红", "B003", "高风险", "致癌物质", "2005-01-01"],
        ["氯霉素", "B004", "中风险", "限用抗生素", "2015-01-01"],
        ["金刚烷胺", "B005", "中风险", "抗病毒药物限用", "2016-01-01"],
        ["喹乙醇", "B006", "低风险", "促生长剂需限量", "2018-01-01"],
    ]
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(rows)


def _gen_sample_formula(path):
    import csv
    base = os.path.splitext(os.path.basename(path))[0]
    rows = [
        ["配方编号", "配方名称", "原料名称", "原料编码", "添加量", "添加量单位", "生效日期", "备注"],
        ["F001", "仔猪配合饲料", "玉米", "C001", "60", "%", "2024-01-01", "正常"],
        ["F001", "仔猪配合饲料", "豆粕", "C002", "25", "%", "2024-01-01", "正常"],
        ["F001", "仔猪配合饲料", "瘦肉精", "B001", "0.5", "%", "2024-01-01", "违禁添加"],
        ["F002", "育肥猪配合饲料", "玉米", "C001", "65", "%", "2024-06-01", "正常"],
        ["F002", "育肥猪配合饲料", "麸皮", "C003", "10", "%", "2024-06-01", "正常"],
        ["F002", "育肥猪配合饲料", "氯霉素", "B004", "0.1", "%", "2024-06-01", "抗生素添加"],
        ["F003", "肉鸡配合饲料", "玉米", "C001", "58", "%", "2024-03-01", "正常"],
        ["F003", "肉鸡配合饲料", "豆粕", "C002", "30", "%", "2024-03-01", "正常"],
        ["F003", "肉鸡配合饲料", "喹乙醇预混剂", "B006-1", "0.05", "%", "2024-03-01", "促生长"],
        ["F004", "水产配合饲料", "", "C001", "", "%", "2024-01-01", "坏行：原料名称为空"],
    ]
    if "sample_2" in base:
        for i, row in enumerate(rows):
            if i == 0:
                continue
            row[0] = row[0] + "-2"
            row[1] = row[1] + "（二批）"
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(rows)


def main():
    cli()


if __name__ == "__main__":
    main()
