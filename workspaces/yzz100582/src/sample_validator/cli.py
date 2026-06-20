import os
import sys
import click
from rich.console import Console

from . import __version__
from .reader import read_samples, get_column_analysis
from .config import (
    load_box_layouts, load_batch_rules, load_id_format_rules,
    generate_default_config
)
from .validator import validate_samples
from .reporter import print_full_report, print_box_grid, console
from .exporter import export_html_report, export_csv_report


@click.group()
@click.version_option(version=__version__, prog_name='sample-validator')
def main():
    """科研样本编号校验器 - 冻存样本管理工具

    用于校验实验室冻存样本表，检查编号格式、盒位冲突、缺失孔位和批次日期等问题。
    """
    pass


@main.command()
@click.argument('sample_file', type=click.Path(exists=True))
@click.option('-c', '--config', 'config_file', type=click.Path(exists=True),
              help='配置文件路径 (YAML格式)')
@click.option('--show-grid', is_flag=True, help='显示每个盒子的孔位网格图')
@click.option('--high-only', is_flag=True, help='只显示高风险问题')
@click.option('-o', '--output', type=click.Path(), help='导出HTML报告的输出路径')
@click.option('--csv-output', type=click.Path(), help='导出CSV报告的输出目录')
def check(sample_file, config_file, show_grid, high_only, output, csv_output):
    """校验样本表，检查各种问题"""

    console.print(f"[dim]正在读取样本文件: {sample_file}[/dim]")
    try:
        samples = read_samples(sample_file)
    except Exception as e:
        console.print(f"[red]读取样本文件失败: {e}[/red]")
        sys.exit(1)

    console.print(f"[dim]共读取 {len(samples)} 条样本记录[/dim]")

    box_layouts = {}
    batch_rules = []
    id_format = {}

    if config_file:
        console.print(f"[dim]正在加载配置: {config_file}[/dim]")
        try:
            box_layouts = load_box_layouts(config_file)
            batch_rules = load_batch_rules(config_file)
            id_format = load_id_format_rules(config_file)
        except Exception as e:
            console.print(f"[yellow]配置加载警告: {e}[/yellow]")
    else:
        console.print("[dim]未指定配置文件，将使用默认设置[/dim]")

    console.print("[dim]正在执行校验...[/dim]")
    report = validate_samples(samples, box_layouts, batch_rules, id_format)

    if high_only:
        from .reporter import print_summary, print_high_risk_issues
        print_summary(report)
        print_high_risk_issues(report)
    else:
        print_full_report(report, show_grids=show_grid)

    if output:
        try:
            export_html_report(report, output)
            console.print(f"[green]✓ HTML报告已导出: {output}[/green]")
        except Exception as e:
            console.print(f"[red]导出HTML失败: {e}[/red]")

    if csv_output:
        try:
            export_csv_report(report, csv_output)
            console.print(f"[green]✓ CSV报告已导出到目录: {csv_output}[/green]")
        except Exception as e:
            console.print(f"[red]导出CSV失败: {e}[/red]")

    if report.high_risk_count > 0:
        sys.exit(2)


@main.command()
@click.argument('sample_file', type=click.Path(exists=True))
@click.argument('box_id', required=False)
@click.option('-c', '--config', 'config_file', type=click.Path(exists=True),
              help='配置文件路径')
@click.option('-o', '--output', type=click.Path(), help='导出HTML清单')
def box(sample_file, box_id, config_file, output):
    """查看冻存盒布局和空位分布"""

    samples = read_samples(sample_file)

    box_layouts = {}
    batch_rules = []
    if config_file:
        box_layouts = load_box_layouts(config_file)
        batch_rules = load_batch_rules(config_file)

    report = validate_samples(samples, box_layouts, batch_rules)

    if box_id:
        if box_id not in report.boxes:
            console.print(f"[red]未找到冻存盒: {box_id}[/red]")
            console.print(f"可用的盒号: {', '.join(sorted(report.boxes.keys()))}")
            sys.exit(1)
        print_box_grid(report.boxes[box_id])
        box = report.boxes[box_id]
        console.print(f"[cyan]总孔位:[/cyan] {box.total_slots} | "
                      f"[green]已用:[/green] {box.used_slots} | "
                      f"[yellow]空位:[/yellow] {box.free_slots} | "
                      f"[bold]占用率: {box.occupancy_rate:.1%}[/bold]")

        if box.free_slots > 0:
            console.print(f"\n[dim]空位列表:[/dim]")
            free_positions = box.get_free_positions()
            console.print(", ".join(free_positions))
    else:
        from .reporter import print_box_summary
        print_box_summary(report)
        console.print("[dim]使用 'sample-validator box <样本文件> <盒号>' 查看详细布局[/dim]")

    if output:
        export_html_report(report, output)
        console.print(f"[green]✓ HTML清单已导出: {output}[/green]")


@main.command('init-config')
@click.argument('output_path', type=click.Path())
def init_config(output_path):
    """生成默认配置文件模板"""

    if os.path.exists(output_path):
        if not click.confirm(f"文件 {output_path} 已存在，是否覆盖？"):
            console.print("[yellow]已取消[/yellow]")
            return

    generate_default_config(output_path)
    console.print(f"[green]✓ 配置文件模板已生成: {output_path}[/green]")
    console.print("[dim]请根据实际情况修改盒号、批次规则和编号格式[/dim]")


@main.command()
@click.argument('sample_file', type=click.Path(exists=True))
def inspect(sample_file):
    """检查样本文件结构，识别列名"""

    try:
        info = get_column_analysis(sample_file)
    except Exception as e:
        console.print(f"[red]读取文件失败: {e}[/red]")
        sys.exit(1)

    from rich.table import Table
    from rich import box

    console.print(f"[bold]文件:[/bold] {sample_file}")
    console.print(f"[bold]列数:[/bold] {info['total_columns']}")
    console.print()

    table = Table(box=box.SIMPLE, padding=(0, 2))
    table.add_column("检测项", style="bold")
    table.add_column("匹配的列名", style="cyan")
    table.add_column("状态")

    checks = [
        ("样本号", info.get('sample_id_col')),
        ("盒号", info.get('box_id_col')),
        ("孔位", info.get('position_col')),
        ("状态", info.get('status_col')),
        ("批次", info.get('batch_col')),
        ("日期", info.get('date_col')),
    ]

    for name, col in checks:
        if col:
            status = "[green]✓ 已识别[/green]"
        else:
            status = "[yellow]未识别[/yellow]"
        table.add_row(name, col or '(无)', status)

    console.print(table)

    console.print()
    console.print("[dim]所有列名:[/dim]")
    for i, col in enumerate(info['columns'], 1):
        console.print(f"  {i}. {col}")


@main.command()
@click.argument('sample_file', type=click.Path(exists=True))
@click.option('-c', '--config', 'config_file', type=click.Path(exists=True),
              help='配置文件路径')
@click.option('-o', '--output', type=click.Path(), required=True,
              help='输出HTML文件路径')
def export(sample_file, config_file, output):
    """导出可打印的冻存盒清单（贴冰箱用）"""

    samples = read_samples(sample_file)

    box_layouts = {}
    batch_rules = []
    id_format = {}
    if config_file:
        box_layouts = load_box_layouts(config_file)
        batch_rules = load_batch_rules(config_file)
        id_format = load_id_format_rules(config_file)

    report = validate_samples(samples, box_layouts, batch_rules, id_format)

    export_html_report(report, output)
    console.print(f"[green]✓ 可打印清单已生成: {output}[/green]")
    console.print("[dim]可直接用浏览器打开并打印，建议A4纸纵向打印[/dim]")


if __name__ == '__main__':
    main()
