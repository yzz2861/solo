from typing import List
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box as rich_box

from .models import ValidationReport, ValidationIssue, RiskLevel, BoxOccupancy


console = Console()


def print_summary(report: ValidationReport):
    title = Text("科研样本编号校验 - 汇总报告", style="bold blue")
    console.print(Panel(title, border_style="blue"))

    stat_table = Table(show_header=False, box=rich_box.SIMPLE, padding=(0, 2))
    stat_table.add_column("项目", style="dim")
    stat_table.add_column("数值", style="bold", justify="right")

    stat_table.add_row("总样本数", str(report.total_samples))
    stat_table.add_row("  在库样本", str(report.active_samples))
    stat_table.add_row("  临时样本", str(report.temporary_samples))
    stat_table.add_row("  已销毁样本", str(report.destroyed_samples))
    stat_table.add_row("冻存盒数", str(report.total_boxes))
    stat_table.add_row()
    stat_table.add_row("高风险问题", f"[red]{report.high_risk_count}[/red]")
    stat_table.add_row("中风险问题", f"[yellow]{report.medium_risk_count}[/yellow]")
    stat_table.add_row("低风险问题", f"[green]{report.low_risk_count}[/green]")

    console.print(stat_table)
    console.print()


def print_high_risk_issues(report: ValidationReport):
    high_issues = report.get_issues_by_severity(RiskLevel.HIGH)
    if not high_issues:
        console.print("[green]✓ 没有发现高风险问题[/green]")
        console.print()
        return

    title = Text(f"⚠ 高风险问题 ({len(high_issues)})", style="bold red")
    console.print(Panel(title, border_style="red"))

    issue_table = Table(box=rich_box.SIMPLE, show_lines=False, padding=(0, 1))
    issue_table.add_column("类型", style="bold", width=16)
    issue_table.add_column("描述", style="")
    issue_table.add_column("详情", style="dim", overflow="fold")

    for issue in high_issues:
        details_str = ", ".join(f"{k}: {v}" for k, v in issue.details.items() if k != 'row')
        issue_table.add_row(
            issue.issue_type,
            issue.message,
            details_str
        )

    console.print(issue_table)
    console.print()


def print_medium_risk_issues(report: ValidationReport):
    med_issues = report.get_issues_by_severity(RiskLevel.MEDIUM)
    if not med_issues:
        return

    title = Text(f"  中风险问题 ({len(med_issues)})", style="bold yellow")
    console.print(Panel(title, border_style="yellow"))

    issue_table = Table(box=rich_box.SIMPLE, show_lines=False, padding=(0, 1))
    issue_table.add_column("类型", style="bold", width=16)
    issue_table.add_column("描述", style="")
    issue_table.add_column("详情", style="dim", overflow="fold")

    for issue in med_issues:
        details_str = ", ".join(f"{k}: {v}" for k, v in issue.details.items() if k != 'row')
        issue_table.add_row(
            issue.issue_type,
            issue.message,
            details_str
        )

    console.print(issue_table)
    console.print()


def print_low_risk_issues(report: ValidationReport):
    low_issues = report.get_issues_by_severity(RiskLevel.LOW)
    if not low_issues:
        return

    title = Text(f"  低风险/提示 ({len(low_issues)})", style="bold green")
    console.print(Panel(title, border_style="green"))

    issue_table = Table(box=rich_box.SIMPLE, show_lines=False, padding=(0, 1))
    issue_table.add_column("类型", style="bold", width=16)
    issue_table.add_column("描述", style="")

    for issue in low_issues:
        issue_table.add_row(issue.issue_type, issue.message)

    console.print(issue_table)
    console.print()


def print_info_items(report: ValidationReport):
    info_issues = report.get_issues_by_severity(RiskLevel.INFO)
    if not info_issues:
        return

    title = Text(f"  信息提示 ({len(info_issues)})", style="bold blue")
    console.print(Panel(title, border_style="blue"))

    issue_table = Table(box=rich_box.SIMPLE, show_lines=False, padding=(0, 1))
    issue_table.add_column("类型", style="bold", width=18)
    issue_table.add_column("描述", style="")

    for issue in info_issues:
        issue_table.add_row(issue.issue_type, issue.message)

    console.print(issue_table)
    console.print()


def print_box_summary(report: ValidationReport):
    if not report.boxes:
        return

    title = Text("冻存盒占用情况", style="bold cyan")
    console.print(Panel(title, border_style="cyan"))

    box_table = Table(box=rich_box.SIMPLE, padding=(0, 2))
    box_table.add_column("盒号", style="bold")
    box_table.add_column("描述", style="dim")
    box_table.add_column("已用", justify="right")
    box_table.add_column("容量", justify="right")
    box_table.add_column("空位", justify="right")
    box_table.add_column("占用率", justify="right")

    for box_id in sorted(report.boxes.keys()):
        box = report.boxes[box_id]
        rate = box.occupancy_rate
        rate_str = f"{rate:.1%}"
        if rate >= 0.9:
            rate_str = f"[red]{rate_str}[/red]"
        elif rate >= 0.7:
            rate_str = f"[yellow]{rate_str}[/yellow]"
        else:
            rate_str = f"[green]{rate_str}[/green]"

        box_table.add_row(
            box_id,
            box.layout.description,
            str(box.used_slots),
            str(box.total_slots),
            str(box.free_slots),
            rate_str
        )

    console.print(box_table)
    console.print()


def print_box_grid(box: BoxOccupancy):
    layout = box.layout
    grid = Table(
        title=f"[bold]{box.box_id}[/bold] - {layout.description}",
        box=rich_box.ROUNDED,
        show_header=True,
        header_style="bold dim"
    )

    grid.add_column("", style="dim", justify="center", width=3)
    for col in layout.col_labels:
        grid.add_column(col, justify="center", width=6)

    for row_idx, row_label in enumerate(layout.row_labels):
        row_cells = [row_label]
        for col_label in layout.col_labels:
            pos = f"{row_label}{col_label}"
            sample = box.occupied.get(pos)
            if sample:
                if sample.status.value == 'temporary':
                    cell_text = f"[yellow]●[/yellow]"
                else:
                    cell_text = f"[cyan]●[/cyan]"
            else:
                cell_text = "[dim]○[/dim]"
            row_cells.append(cell_text)
        grid.add_row(*row_cells)

    console.print(grid)

    legend = Table(box=None, show_header=False, padding=(0, 1))
    legend.add_column()
    legend.add_column()
    legend.add_column()
    legend.add_row(
        "[cyan]●[/cyan] 在库样本",
        "[yellow]●[/yellow] 临时样本",
        "[dim]○[/dim] 空位"
    )
    console.print(legend)
    console.print()


def print_full_report(report: ValidationReport, show_grids: bool = False):
    print_summary(report)
    print_high_risk_issues(report)
    print_medium_risk_issues(report)
    print_low_risk_issues(report)
    print_info_items(report)
    print_box_summary(report)

    if show_grids and report.boxes:
        console.print()
        for box_id in sorted(report.boxes.keys()):
            print_box_grid(report.boxes[box_id])
