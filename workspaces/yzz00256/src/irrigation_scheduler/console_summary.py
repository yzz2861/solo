"""控制台摘要展示 - 使用 rich 美化输出"""

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from typing import Optional

from .models import ScheduleResult, PlotStatus, Snapshot


def print_summary(result: ScheduleResult, console: Optional[Console] = None) -> None:
    """在控制台打印轮灌计划摘要"""
    if console is None:
        console = Console()

    console.print()

    title = Text("🌾 农田灌溉轮灌计划摘要", style="bold green")
    console.print(Panel(title, expand=False))

    console.print()

    batch_info = Table(title="批次信息", show_header=False, border_style="blue")
    batch_info.add_column("项目", style="dim")
    batch_info.add_column("值")
    batch_info.add_row("批次号", result.batch.batch_id)
    batch_info.add_row("批次名称", result.batch.batch_name)
    batch_info.add_row("生成时间", result.batch.created_at)
    batch_info.add_row("输入哈希", result.batch.input_hash)
    if result.is_idempotent:
        batch_info.add_row(
            "幂等状态",
            "[yellow]命中缓存 (来源: " + result.source_batch_id + ")[/yellow]",
        )
    else:
        batch_info.add_row("幂等状态", "[green]新生成[/green]")
    if result.batch.source_files:
        batch_info.add_row("来源文件", ", ".join(result.batch.source_files))
    console.print(batch_info)

    console.print()

    stats_table = Table(title="执行统计", show_header=True, border_style="green")
    stats_table.add_column("指标", style="dim")
    stats_table.add_column("数量", justify="right")
    stats_table.add_column("占比", justify="right")

    total = result.total_plots
    stats_table.add_row("总地块数", str(total), "100.0%")
    stats_table.add_row(
        "[green]✓ 成功分配[/green]",
        str(result.success_count),
        f"{result.success_count / total * 100:.1f}%" if total > 0 else "0.0%",
    )
    stats_table.add_row(
        "[red]✗ 分配失败[/red]",
        str(result.failed_count),
        f"{result.failed_count / total * 100:.1f}%" if total > 0 else "0.0%",
    )
    stats_table.add_row(
        "[yellow]⚠ 待复核[/yellow]",
        str(result.review_count),
        f"{result.review_count / total * 100:.1f}%" if total > 0 else "0.0%",
    )
    console.print(stats_table)

    console.print()

    group_stats: dict[str, dict] = {}
    for r in result.plot_results:
        if r.status != PlotStatus.SUCCESS:
            continue
        gname = r.group_name
        if gname not in group_stats:
            group_stats[gname] = {"count": 0, "groups": set()}
        group_stats[gname]["count"] += 1
        group_stats[gname]["groups"].add(r.sequence)

    if group_stats:
        group_table = Table(title="轮灌组分布", show_header=True, border_style="cyan")
        group_table.add_column("轮灌规则")
        group_table.add_column("地块数", justify="right")
        group_table.add_column("组数", justify="right")
        group_table.add_column("组号范围")

        for gname, stats in sorted(group_stats.items()):
            seqs = sorted(stats["groups"])
            seq_range = f"{seqs[0]}-{seqs[-1]}" if len(seqs) > 1 else str(seqs[0])
            group_table.add_row(gname, str(stats["count"]), str(len(seqs)), seq_range)

        console.print(group_table)
        console.print()

    if result.warnings:
        warn_panel = Panel(
            "\n".join(f"⚠️  {w}" for w in result.warnings),
            title="警告信息",
            border_style="yellow",
        )
        console.print(warn_panel)
        console.print()

    if result.failed_count > 0:
        failed_items = [r for r in result.plot_results if r.status == PlotStatus.FAILED][:5]
        failed_table = Table(title="失败明细 (前5条)", show_header=True, border_style="red")
        failed_table.add_column("地块ID")
        failed_table.add_column("地块名称")
        failed_table.add_column("失败原因")
        for r in failed_items:
            failed_table.add_row(r.plot_id, r.plot_name, r.error_reason)
        console.print(failed_table)
        console.print()

    if result.review_count > 0:
        review_items = [r for r in result.plot_results if r.status == PlotStatus.REVIEW][:5]
        review_table = Table(title="待复核明细 (前5条)", show_header=True, border_style="yellow")
        review_table.add_column("地块ID")
        review_table.add_column("地块名称")
        review_table.add_column("复核原因")
        for r in review_items:
            review_table.add_row(r.plot_id, r.plot_name, r.review_reason)
        console.print(review_table)
        console.print()


def print_snapshot_list(snapshots: list, console: Optional[Console] = None) -> None:
    """打印历史快照列表"""
    if console is None:
        console = Console()

    if not snapshots:
        console.print("[dim]暂无历史快照[/dim]")
        return

    table = Table(title="历史批次列表", show_header=True, border_style="blue")
    table.add_column("批次号")
    table.add_column("批次名称")
    table.add_column("创建时间")
    table.add_column("输入哈希")
    table.add_column("总数", justify="right")
    table.add_column("成功", justify="right")
    table.add_column("失败", justify="right")
    table.add_column("复核", justify="right")

    for s in snapshots:
        table.add_row(
            s["batch_id"],
            s["batch_name"],
            s["created_at"],
            s["input_hash"],
            str(s["total"]),
            f"[green]{s['success']}[/green]",
            f"[red]{s['failed']}[/red]",
            f"[yellow]{s['review']}[/yellow]",
        )

    console.print(table)


def print_validation_result(errors: list, warnings: list, console: Optional[Console] = None) -> None:
    """打印校验结果"""
    if console is None:
        console = Console()

    console.print()

    if not errors and not warnings:
        console.print("[green]✓ 校验通过，未发现问题[/green]")
        return

    if errors:
        error_panel = Panel(
            "\n".join(f"✗ {e}" for e in errors),
            title=f"错误 ({len(errors)})",
            border_style="red",
        )
        console.print(error_panel)

    if warnings:
        warn_panel = Panel(
            "\n".join(f"⚠ {w}" for w in warnings),
            title=f"警告 ({len(warnings)})",
            border_style="yellow",
        )
        console.print(warn_panel)

    console.print()
