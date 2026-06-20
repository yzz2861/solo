from typing import List, Optional
from datetime import date
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

from .models import MatchedOrder, OrderStatus
from .date_utils import format_date, describe_date_relative
from .matcher import (
    summarize,
    group_by_status,
    get_delayed_orders,
    get_no_promise_orders,
    get_promised_not_arrived,
    group_by_supplier,
)

console = Console()


def _status_style(status: OrderStatus) -> str:
    styles = {
        OrderStatus.FULLY_DELIVERED: "green",
        OrderStatus.PARTIALLY_DELIVERED: "cyan",
        OrderStatus.DELAYED: "bold red",
        OrderStatus.PROMISED_PENDING: "yellow",
        OrderStatus.PENDING: "blue",
        OrderStatus.NO_PROMISE: "bold magenta",
    }
    return styles.get(status, "white")


def print_summary(matched: List[MatchedOrder], today: Optional[date] = None) -> None:
    today = today or date.today()
    summary = summarize(matched)

    summary_panel = Table.grid(padding=(0, 2))
    summary_panel.add_column(style="bold")
    summary_panel.add_column()

    summary_panel.add_row("分析日期", f"{today.strftime('%Y-%m-%d')}")
    summary_panel.add_row("订单总数", f"[bold]{summary['total_orders']}[/bold] 单")
    summary_panel.add_row("总数量", f"{summary['total_quantity']:,.0f}")
    summary_panel.add_row("已到货", f"[green]{summary['delivered_quantity']:,.0f}[/green]")
    summary_panel.add_row("未到货", f"[yellow]{summary['remaining_quantity']:,.0f}[/yellow]")
    summary_panel.add_row(
        "整体到货率",
        f"[bold]{summary['overall_delivery_rate']:.1f}%[/bold]",
    )

    status_panel = Table.grid(padding=(0, 2))
    status_panel.add_column(style="bold")
    status_panel.add_column()
    for status_name, count in summary["by_status"].items():
        color = "green" if "已到" in status_name else (
            "red" if "延期" in status_name else (
                "magenta" if "无承诺" in status_name else "yellow"
            )
        )
        status_panel.add_row(f"  {status_name}", f"[{color}]{count} 单[/{color}]")

    risk_panel = Table.grid(padding=(0, 2))
    risk_panel.add_column(style="bold")
    risk_panel.add_column()
    risk_panel.add_row(
        ":warning: 延期订单",
        f"[bold red]{summary['delayed_count']} 单[/bold red]",
    )
    risk_panel.add_row(
        ":question: 无承诺订单",
        f"[bold magenta]{summary['no_promise_count']} 单[/bold magenta]",
    )
    risk_panel.add_row(
        ":hourglass: 承诺未到货",
        f"[bold yellow]{summary['promised_pending_count']} 单[/bold yellow]",
    )
    if summary["delayed_count"] > 0:
        risk_panel.add_row(
            "累计延期天数",
            f"[bold red]{summary['total_delay_days']} 天[/bold red] "
            f"(平均 {summary['avg_delay_days']} 天/单)",
        )

    grid = Table.grid(padding=2)
    grid.add_column()
    grid.add_column()
    grid.add_column()
    grid.add_row(
        Panel(summary_panel, title=":bar_chart: 总体概览", border_style="blue"),
        Panel(status_panel, title=":clipboard: 订单状态分布", border_style="cyan"),
        Panel(risk_panel, title=":fire: 风险提示", border_style="red"),
    )

    console.print(grid)


def print_orders_table(
    matched: List[MatchedOrder],
    title: str = "订单明细",
    limit: Optional[int] = None,
    today: Optional[date] = None,
) -> None:
    today = today or date.today()
    table = Table(
        title=title,
        box=box.ROUNDED,
        show_lines=False,
        header_style="bold white on blue",
        border_style="blue",
    )

    table.add_column("优先级", justify="center", width=8)
    table.add_column("状态", justify="center", width=10)
    table.add_column("供应商", justify="left", width=12)
    table.add_column("订单号", justify="left", width=14)
    table.add_column("物料", justify="left", width=18)
    table.add_column("订单量", justify="right", width=8)
    table.add_column("已到", justify="right", width=8)
    table.add_column("完成率", justify="center", width=8)
    table.add_column("计划交期", justify="center", width=16)
    table.add_column("承诺交期", justify="center", width=16)
    table.add_column("延期", justify="right", width=6)

    orders = matched if limit is None else matched[:limit]

    for m in orders:
        po = m.purchase_order
        style = _status_style(m.status)

        delivery_rate_str = f"{m.delivery_rate:.0f}%"
        if m.delivery_rate >= 100:
            rate_style = "green"
        elif m.delivery_rate >= 50:
            rate_style = "yellow"
        else:
            rate_style = "red"

        priority = _get_priority_text(m)

        material_desc = po.material_name[:16] if po.material_name else po.material_code

        table.add_row(
            f"{priority}",
            f"[{style}]{m.status.value}[/{style}]",
            po.supplier_short or po.supplier_full[:10] or "-",
            po.order_key,
            material_desc,
            f"{po.quantity:,.0f}",
            f"{m.delivered_quantity:,.0f}",
            f"[{rate_style}]{delivery_rate_str}[/{rate_style}]",
            format_date(po.plan_date),
            format_date(m.latest_promise_date) if m.has_promise else "[magenta]无[/magenta]",
            f"[red]{m.delay_days}[/red]" if m.delay_days > 0 else "-",
        )

    if limit and len(matched) > limit:
        table.add_row(
            "",
            f"... 还有 {len(matched) - limit} 个订单未显示 ...",
            "", "", "", "", "", "", "", "", "",
            style="dim",
        )

    console.print(table)


def _get_priority_text(m: MatchedOrder) -> str:
    if m.status == OrderStatus.DELAYED and m.delay_days >= 7:
        return "[bold red]P0[/bold red]"
    elif m.status == OrderStatus.DELAYED:
        return "[red]P1[/red]"
    elif not m.has_promise:
        return "[magenta]P1[/magenta]"
    elif m.status == OrderStatus.PARTIALLY_DELIVERED and m.remaining_quantity > 0:
        return "[yellow]P2[/yellow]"
    elif m.has_promise and not m.has_arrival:
        return "[yellow]P2[/yellow]"
    else:
        return "[dim]P3[/dim]"


def print_delayed_detail(matched: List[MatchedOrder], today: Optional[date] = None) -> None:
    today = today or date.today()
    delayed = get_delayed_orders(matched)
    if not delayed:
        console.print(Panel(":white_check_mark: 没有延期订单，太棒了！", border_style="green"))
        return

    console.print(f"\n[bold red]:alarm_clock: 延期订单明细（共 {len(delayed)} 单）[/bold red]")

    for m in sorted(delayed, key=lambda x: -x.delay_days):
        po = m.purchase_order
        reason_lines = []

        if m.notes:
            reason_lines.extend(m.notes)
        else:
            if m.has_promise and m.latest_promise_date:
                reason_lines.append(
                    f"承诺交期 {format_date(m.latest_promise_date)} "
                    f"({describe_date_relative(m.latest_promise_date, today)})"
                )
            else:
                if po.plan_date:
                    reason_lines.append(
                        f"无供应商承诺，计划交期 {format_date(po.plan_date)}"
                    )
            if m.arrivals:
                reason_lines.append(
                    f"最近到货 {format_date(m.latest_arrival_date)}"
                    f"，共到 {m.delivered_quantity:,.0f}/{po.quantity:,.0f}"
                )
            elif m.has_arrival is False:
                reason_lines.append("完全未到货")

        panel_content = Table.grid(padding=(0, 2))
        panel_content.add_column(style="bold", width=12)
        panel_content.add_column()
        panel_content.add_row("订单号", po.order_key)
        panel_content.add_row("供应商", f"{po.supplier_short or po.supplier_full}")
        panel_content.add_row(
            "物料",
            f"{po.material_code} {po.material_name}"[:50],
        )
        panel_content.add_row(
            "数量",
            f"订 {po.quantity:,.0f}{po.unit} / "
            f"到 {m.delivered_quantity:,.0f} / "
            f"[yellow]欠 {m.remaining_quantity:,.0f}[/yellow]",
        )
        panel_content.add_row("延期天数", f"[bold red]{m.delay_days} 天[/bold red]")
        panel_content.add_row("计划交期", format_date(po.plan_date))
        panel_content.add_row(
            "承诺交期",
            format_date(m.latest_promise_date) if m.has_promise else "[magenta]无[/magenta]",
        )
        panel_content.add_row(
            "到货情况",
            format_date(m.latest_arrival_date) if m.has_arrival else "未到货",
        )
        panel_content.add_row(
            "催办建议",
            "[red]立即联系供应商，要求给出明确交期并要求改善[/red]",
        )

        console.print(
            Panel(
                panel_content,
                title=f":bangbang: 延期 {m.delay_days} 天 - {po.order_key}",
                border_style="red",
            )
        )


def print_risk_grouped(matched: List[MatchedOrder], today: Optional[date] = None) -> None:
    today = today or date.today()

    promised_pending = get_promised_not_arrived(matched)
    no_promise = get_no_promise_orders(matched)
    active_promised = [m for m in promised_pending if m.status != OrderStatus.DELAYED]
    active_no_promise = [m for m in no_promise if m.status != OrderStatus.DELAYED]

    grid = Table.grid(padding=2)
    grid.add_column()
    grid.add_column()

    panel1_content = Table.grid(padding=(0, 1))
    panel1_content.add_column(justify="left", width=14)
    panel1_content.add_column(justify="left", width=14)
    panel1_content.add_column(justify="right", width=8)
    panel1_content.add_column(justify="center", width=18)
    for m in active_promised[:10]:
        po = m.purchase_order
        panel1_content.add_row(
            po.order_key,
            po.supplier_short or "-",
            f"{m.remaining_quantity:,.0f}",
            format_date(m.latest_promise_date),
        )
    if not active_promised:
        panel1_content.add_row("[dim]无[/dim]", "", "", "")
    panel1_title = f":hourglass_flowing_sand: 供应商承诺但未到货 ({len(active_promised)} 单)"

    panel2_content = Table.grid(padding=(0, 1))
    panel2_content.add_column(justify="left", width=14)
    panel2_content.add_column(justify="left", width=14)
    panel2_content.add_column(justify="right", width=8)
    panel2_content.add_column(justify="center", width=18)
    for m in active_no_promise[:10]:
        po = m.purchase_order
        panel2_content.add_row(
            po.order_key,
            po.supplier_short or "-",
            f"{m.remaining_quantity:,.0f}",
            format_date(po.plan_date) + " (计划)",
        )
    if not active_no_promise:
        panel2_content.add_row("[dim]无[/dim]", "", "", "")
    panel2_title = f":question: 无承诺需供应商确认 ({len(active_no_promise)} 单)"

    grid.add_row(
        Panel(panel1_content, title=panel1_title, border_style="yellow"),
        Panel(panel2_content, title=panel2_title, border_style="magenta"),
    )
    console.print(grid)
