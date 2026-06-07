"""命令行入口 - 农田灌溉轮灌 CLI"""

import os
import sys

import click
from rich.console import Console

from .config_loader import (
    load_plots_from_csv, load_rules_from_yaml,
    validate_plots, validate_rules,
)
from .scheduler import generate_schedule
from .idempotent import (
    check_idempotent, save_snapshot, snapshot_to_result,
    load_snapshot_by_batch, list_snapshots,
)
from .exporter import export_all
from .console_summary import (
    print_summary, print_snapshot_list, print_validation_result,
)

console = Console()


@click.group()
@click.version_option(version="0.1.0", prog_name="irrigation")
def cli():
    """🌾 农田灌溉轮灌调度 CLI 工具

    支持校验、生成、导出和查看摘要等命令。
    """
    pass


@cli.command()
@click.option("--csv", "csv_path", required=True, help="地块清单 CSV 文件路径")
@click.option("--rules", "rules_path", required=True, help="规则配置 YAML 文件路径")
def validate(csv_path, rules_path):
    """校验输入数据和规则配置"""
    console.print("[bold]🔍 数据校验中...[/bold]")

    plots, plot_errors = load_plots_from_csv(csv_path)
    rules, rule_errors = load_rules_from_yaml(rules_path)

    all_errors = plot_errors + rule_errors

    plot_val_errors = validate_plots(plots) if plots else []
    rule_val_errors = validate_rules(rules) if rules else []

    all_errors.extend(plot_val_errors)
    all_errors.extend(rule_val_errors)

    warnings = []

    if plots and len(plots) < 3:
        warnings.append("地块数量较少，可能影响轮灌组分配效果")

    print_validation_result(all_errors, warnings)

    if all_errors:
        sys.exit(1)


@cli.command()
@click.option("--csv", "csv_path", required=True, help="地块清单 CSV 文件路径")
@click.option("--rules", "rules_path", required=True, help="规则配置 YAML 文件路径")
@click.option("--output", "output_dir", required=True, help="输出目录")
@click.option("--snapshot", "snapshot_path", default=None, help="历史快照文件路径（可选）")
@click.option("--batch-name", default="", help="批次名称（可选）")
@click.option("--force", is_flag=True, help="忽略幂等检查，强制重新生成")
def generate(csv_path, rules_path, output_dir, snapshot_path, batch_name, force):
    """生成轮灌计划"""
    console.print("[bold]⚙️  生成轮灌计划...[/bold]")

    plots, plot_errors = load_plots_from_csv(csv_path)
    if plot_errors:
        console.print(f"[red]地块清单加载失败: {plot_errors[0]}[/red]")
        sys.exit(1)

    rules, rule_errors = load_rules_from_yaml(rules_path)
    if rule_errors:
        console.print(f"[red]规则配置加载失败: {rule_errors[0]}[/red]")
        sys.exit(1)

    val_errors = validate_plots(plots) + validate_rules(rules)
    if val_errors:
        console.print(f"[red]数据校验未通过，共 {len(val_errors)} 个错误[/red]")
        for e in val_errors[:5]:
            console.print(f"  ✗ {e}")
        sys.exit(1)

    from .models import BatchInfo
    input_hash = BatchInfo.compute_hash(plots, rules)

    snapshot = None
    hit_cache = False

    if not force:
        snapshot, hit_cache = check_idempotent(output_dir, input_hash)

        if not hit_cache and snapshot_path:
            from .config_loader import load_snapshot as load_snap
            snap, snap_errors = load_snap(snapshot_path)
            if snap and snap.input_hash == input_hash:
                snapshot = snap
                hit_cache = True
            elif snap_errors:
                console.print(f"[yellow]快照文件加载异常: {snap_errors[0]}[/yellow]")

    if hit_cache and snapshot:
        console.print(f"[yellow]⏱  命中幂等缓存，来源批次: {snapshot.batch_id}[/yellow]")
        result = snapshot_to_result(snapshot, batch_name)
    else:
        result = generate_schedule(plots, rules, batch_name)

    os.makedirs(output_dir, exist_ok=True)
    file_paths = export_all(result, output_dir)

    if not result.is_idempotent:
        save_snapshot(output_dir, result)

    print_summary(result)

    console.print("[bold]📁 输出文件:[/bold]")
    for name, path in file_paths.items():
        console.print(f"  • {name}: {path}")

    console.print(f"\n[green]✓ 轮灌计划生成完成，批次号: {result.batch.batch_id}[/green]")


@cli.command()
@click.option("--batch", "batch_id", default=None, help="指定批次号查看（不指定则列出所有）")
@click.option("--output", "output_dir", required=True, help="输出目录（存放快照的目录）")
def summary(batch_id, output_dir):
    """查看轮灌计划摘要"""
    if batch_id:
        snapshot = load_snapshot_by_batch(output_dir, batch_id)
        if not snapshot:
            console.print(f"[red]未找到批次: {batch_id}[/red]")
            sys.exit(1)

        from .models import ScheduleResult, BatchInfo, PlotResult, PlotStatus, TaskStatus
        result = snapshot_to_result(snapshot, snapshot.batch_name)
        result.batch.batch_id = snapshot.batch_id
        result.batch.created_at = snapshot.created_at
        result.is_idempotent = False

        print_summary(result)
    else:
        snapshots = list_snapshots(output_dir)
        if not snapshots:
            console.print("[dim]暂无历史批次记录[/dim]")
        else:
            print_snapshot_list(snapshots)


@cli.command()
@click.option("--csv", "csv_path", required=True, help="地块清单 CSV 文件路径")
@click.option("--rules", "rules_path", required=True, help="规则配置 YAML 文件路径")
@click.option("--output", "output_dir", required=True, help="输出目录")
@click.option("--batch-name", default="", help="批次名称")
@click.option("--force", is_flag=True, help="忽略幂等检查")
def export(csv_path, rules_path, output_dir, batch_name, force):
    """导出完整结果（明细+复核列表+报告）

    等同于 generate 命令，会自动生成所有输出文件。
    """
    from .scheduler import generate_schedule as gen

    plots, plot_errors = load_plots_from_csv(csv_path)
    if plot_errors:
        console.print(f"[red]地块清单加载失败: {plot_errors[0]}[/red]")
        sys.exit(1)

    rules, rule_errors = load_rules_from_yaml(rules_path)
    if rule_errors:
        console.print(f"[red]规则配置加载失败: {rule_errors[0]}[/red]")
        sys.exit(1)

    from .models import BatchInfo
    input_hash = BatchInfo.compute_hash(plots, rules)

    snapshot = None
    hit_cache = False
    if not force:
        snapshot, hit_cache = check_idempotent(output_dir, input_hash)

    if hit_cache and snapshot:
        console.print(f"[yellow]⏱  命中幂等缓存，来源批次: {snapshot.batch_id}[/yellow]")
        result = snapshot_to_result(snapshot, batch_name)
    else:
        result = gen(plots, rules, batch_name)

    os.makedirs(output_dir, exist_ok=True)
    file_paths = export_all(result, output_dir)

    if not result.is_idempotent:
        save_snapshot(output_dir, result)

    console.print("[green]✓ 导出完成[/green]")
    for name, path in file_paths.items():
        console.print(f"  • {name}: {path}")


@cli.command()
@click.option("--output", "output_dir", required=True, help="输出目录")
@click.option("--batch", "batch_id", help="指定批次号（可不填，列出所有）")
def history(output_dir, batch_id):
    """查看历史批次记录"""
    if batch_id:
        snapshot = load_snapshot_by_batch(output_dir, batch_id)
        if not snapshot:
            console.print(f"[red]未找到批次: {batch_id}[/red]")
            sys.exit(1)

        result = snapshot_to_result(snapshot, snapshot.batch_name)
        result.batch.batch_id = snapshot.batch_id
        result.batch.created_at = snapshot.created_at
        result.is_idempotent = False
        print_summary(result)
    else:
        snapshots = list_snapshots(output_dir)
        print_snapshot_list(snapshots)


from .idempotent import snapshot_to_result  # noqa: E402


def main():
    cli()


if __name__ == "__main__":
    main()
