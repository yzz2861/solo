import os
import sys
import click

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .order_builder import (
    scan_and_build_order,
    confirm_item,
    mark_produced,
    mark_delivered,
    update_item_spec,
)
from .state_manager import save_order_state, load_order
from .exporter import (
    export_shop_list,
    export_customer_list,
    export_markdown_shop,
)
from .models import (
    ItemStatus,
    ColorMode,
    PrintSide,
    BindingType,
)

console = Console()


def print_order_summary(order):
    total_files = len(order.items)
    valid_files = sum(1 for i in order.items if i.file_info.is_valid)
    produced = sum(1 for i in order.items if i.status in (ItemStatus.PRODUCED, ItemStatus.DELIVERED))
    issues = sum(1 for i in order.items if i.status == ItemStatus.ISSUE)
    total_copies = sum(i.copies for i in order.items if i.file_info.is_valid)
    total_pages = sum(i.file_info.page_count * i.copies for i in order.items if i.file_info.is_valid)

    summary = Text()
    summary.append(f"订单号: ", style="bold")
    summary.append(f"{order.order_id}\n")
    summary.append(f"客户: ", style="bold")
    summary.append(f"{order.customer_name}\n")
    summary.append(f"文件: ", style="bold")
    summary.append(f"{valid_files}/{total_files} 个有效\n")
    summary.append(f"份数: ", style="bold")
    summary.append(f"{total_copies} 份 | 约 {total_pages} 面\n")
    summary.append(f"进度: ", style="bold")
    summary.append(f"{produced}/{valid_files} 已制作\n")

    console.print(Panel(summary, title="订单概览", border_style="blue"))


def print_items_table(order):
    table = Table(title="文件清单", show_lines=False)
    table.add_column("#", style="dim", width=3)
    table.add_column("状态", width=8)
    table.add_column("文件名", style="cyan", no_wrap=False)
    table.add_column("页数", justify="right", width=6)
    table.add_column("份数", justify="right", width=6)
    table.add_column("颜色", width=6)
    table.add_column("单面/双面", width=8)
    table.add_column("装订", width=8)
    table.add_column("确认", width=6)

    for idx, item in enumerate(order.items, 1):
        status_style = {
            ItemStatus.PENDING: "yellow",
            ItemStatus.CONFIRMED: "blue",
            ItemStatus.PRODUCED: "green",
            ItemStatus.DELIVERED: "green",
            ItemStatus.ISSUE: "red",
        }.get(item.status, "white")

        status_mark = {
            ItemStatus.PENDING: "待制作",
            ItemStatus.CONFIRMED: "已确认",
            ItemStatus.PRODUCED: "已制作",
            ItemStatus.DELIVERED: "已交付",
            ItemStatus.ISSUE: "有问题",
        }.get(item.status, "未知")

        confirmed_mark = "✅" if item.confirmed else "⬜"

        filename = item.file_info.filename
        if not item.file_info.is_valid:
            filename = f"{filename} ({item.file_info.error_msg})"

        table.add_row(
            str(idx),
            f"[{status_style}]{status_mark}[/{status_style}]",
            filename,
            str(item.file_info.page_count),
            str(item.copies),
            item.color_mode.value,
            item.print_side.value,
            item.binding.value if item.binding.value != "无装订" else "无",
            confirmed_mark,
        )

    console.print(table)


def print_issues(order):
    if order.issues:
        console.print("\n[bold red]❌ 问题:[/bold red]")
        for issue in order.issues:
            console.print(f"  • {issue}")

    if order.warnings:
        console.print("\n[bold yellow]⚠️  注意:[/bold yellow]")
        for warning in order.warnings:
            console.print(f"  • {warning}")


@click.group()
def cli():
    """打印店交付清单 CLI - 管理打印订单、文件扫描和交付确认"""
    pass


@cli.command()
@click.argument("directory", type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.option("--notes", "-n", default="", help="客户备注/聊天记录")
@click.option("--notes-file", type=click.Path(exists=True), help="从文件读取备注")
@click.option("--customer", "-c", default="", help="客户姓名")
@click.option("--no-recursive", is_flag=True, help="不递归扫描子目录")
@click.option("--save/--no-save", default=True, help="是否保存状态")
def scan(directory, notes, notes_file, customer, no_recursive, save):
    """扫描目录并生成订单"""

    if notes_file:
        with open(notes_file, 'r', encoding='utf-8') as f:
            notes = f.read()

    recursive = not no_recursive
    order = scan_and_build_order(directory, notes, customer, recursive)

    if save:
        save_order_state(directory, order)

    print_order_summary(order)
    print_items_table(order)
    print_issues(order)

    if save:
        console.print(f"\n[dim]状态已保存到: {os.path.join(directory, '.print_order_state.json')}[/dim]")


@cli.command()
@click.argument("directory", type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument("item_num", type=int, required=False)
@click.option("--all", "-a", "all_items", is_flag=True, help="确认所有项目")
def confirm(directory, item_num, all_items):
    """确认订单项目"""

    order = load_order(directory)
    if not order:
        console.print("[red]未找到订单，请先运行 scan 命令[/red]")
        sys.exit(1)

    valid_items = [i for i in order.items if i.status != ItemStatus.ISSUE]

    if all_items:
        for item in valid_items:
            confirm_item(order, item.id)
        console.print(f"[green]已确认全部 {len(valid_items)} 个项目[/green]")
    elif item_num is not None:
        if 1 <= item_num <= len(order.items):
            item = order.items[item_num - 1]
            confirm_item(order, item.id)
            console.print(f"[green]已确认: {item.file_info.filename}[/green]")
        else:
            console.print(f"[red]无效的项目编号: {item_num}[/red]")
            sys.exit(1)
    else:
        console.print("[yellow]请指定项目编号或使用 --all[/yellow]")
        console.print("[dim]用法: confirm <目录> <编号> 或 confirm <目录> --all[/dim]")
        sys.exit(1)

    save_order_state(directory, order)
    print_items_table(order)


@cli.command()
@click.argument("directory", type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument("item_num", type=int, required=False)
@click.option("--all", "-a", "all_items", is_flag=True, help="标记所有项目为已制作")
def produced(directory, item_num, all_items):
    """标记项目为已制作完成"""

    order = load_order(directory)
    if not order:
        console.print("[red]未找到订单，请先运行 scan 命令[/red]")
        sys.exit(1)

    valid_items = [i for i in order.items if i.status == ItemStatus.PENDING or i.status == ItemStatus.CONFIRMED]

    if all_items:
        for item in valid_items:
            mark_produced(order, item.id)
        console.print(f"[green]已标记 {len(valid_items)} 个项目为已制作[/green]")
    elif item_num is not None:
        if 1 <= item_num <= len(order.items):
            item = order.items[item_num - 1]
            mark_produced(order, item.id)
            console.print(f"[green]已制作: {item.file_info.filename}[/green]")
        else:
            console.print(f"[red]无效的项目编号: {item_num}[/red]")
            sys.exit(1)
    else:
        console.print("[yellow]请指定项目编号或使用 --all[/yellow]")
        sys.exit(1)

    save_order_state(directory, order)
    print_items_table(order)


@cli.command()
@click.argument("directory", type=click.Path(exists=True, file_okay=False, dir_okay=True))
def status(directory):
    """查看订单状态"""

    order = load_order(directory)
    if not order:
        console.print("[red]未找到订单，请先运行 scan 命令[/red]")
        sys.exit(1)

    print_order_summary(order)
    print_items_table(order)
    print_issues(order)


@cli.command()
@click.argument("directory", type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.option("--type", "-t", "list_type",
              type=click.Choice(["shop", "customer", "both"]),
              default="both",
              help="清单类型: shop(制作清单), customer(交付清单), both(都生成)")
@click.option("--format", "-f", "fmt",
              type=click.Choice(["txt", "md"]),
              default="txt",
              help="输出格式: txt 或 md")
@click.option("--output", "-o", default="", help="输出目录，默认为当前目录")
def export(directory, list_type, fmt, output):
    """导出生成制作清单和/或交付清单"""

    order = load_order(directory)
    if not order:
        console.print("[red]未找到订单，请先运行 scan 命令[/red]")
        sys.exit(1)

    out_dir = output or directory

    if list_type in ("shop", "both"):
        if fmt == "txt":
            shop_path = os.path.join(out_dir, f"制作清单_{order.order_id}.txt")
            content = export_shop_list(order, shop_path)
        else:
            shop_path = os.path.join(out_dir, f"制作清单_{order.order_id}.md")
            content = export_markdown_shop(order, shop_path)
        console.print(f"[green]✓ 制作清单已导出: {shop_path}[/green]")

    if list_type in ("customer", "both"):
        customer_path = os.path.join(out_dir, f"交付清单_{order.order_id}.txt")
        content = export_customer_list(order, customer_path)
        console.print(f"[green]✓ 客户交付清单已导出: {customer_path}[/green]")


@cli.command()
@click.argument("directory", type=click.Path(exists=True, file_okay=False, dir_okay=True))
def check(directory):
    """重新检查订单，检测遗漏或问题"""

    order = load_order(directory)
    if not order:
        console.print("[red]未找到订单，请先运行 scan 命令[/red]")
        sys.exit(1)

    from .validator import validate_order
    order = validate_order(order)

    save_order_state(directory, order)

    print_order_summary(order)
    print_items_table(order)
    print_issues(order)

    valid_items = [i for i in order.items if i.file_info.is_valid]
    produced = sum(1 for i in valid_items if i.status in (ItemStatus.PRODUCED, ItemStatus.DELIVERED))
    pending = len(valid_items) - produced

    if pending == 0 and not order.issues:
        console.print("\n[bold green]✅ 全部完成，没有问题！可以交付。[/bold green]")
    elif pending > 0:
        console.print(f"\n[bold yellow]⚠️  还有 {pending} 项待制作[/bold yellow]")
    else:
        console.print(f"\n[bold red]❌ 有 {len(order.issues)} 个问题需要处理[/bold red]")


@cli.command()
@click.argument("directory", type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument("item_num", type=int)
@click.option("--copies", "-n", type=int, help="设置份数")
@click.option("--color", type=click.Choice(["color", "black"]), help="颜色模式")
@click.option("--side", type=click.Choice(["single", "double"]), help="单面/双面")
@click.option("--binding", "-b", type=click.Choice(["none", "staple", "perfect", "ring"]), help="装订方式")
@click.option("--paper", type=str, help="纸张尺寸")
def edit(directory, item_num, copies, color, side, binding, paper):
    """编辑指定项目的规格"""

    order = load_order(directory)
    if not order:
        console.print("[red]未找到订单，请先运行 scan 命令[/red]")
        sys.exit(1)

    if not (1 <= item_num <= len(order.items)):
        console.print(f"[red]无效的项目编号: {item_num}[/red]")
        sys.exit(1)

    item = order.items[item_num - 1]

    color_mode = None
    if color == "color":
        color_mode = ColorMode.COLOR
    elif color == "black":
        color_mode = ColorMode.BLACK

    print_side = None
    if side == "single":
        print_side = PrintSide.SINGLE
    elif side == "double":
        print_side = PrintSide.DOUBLE

    binding_type = None
    if binding == "none":
        binding_type = BindingType.NONE
    elif binding == "staple":
        binding_type = BindingType.STAPLE
    elif binding == "perfect":
        binding_type = BindingType.PERFECT
    elif binding == "ring":
        binding_type = BindingType.RING

    update_item_spec(
        order,
        item.id,
        copies=copies,
        color_mode=color_mode,
        print_side=print_side,
        binding=binding_type,
        paper_size=paper,
    )

    save_order_state(directory, order)
    console.print(f"[green]已更新: {item.file_info.filename}[/green]")
    print_items_table(order)


def main():
    cli()


if __name__ == "__main__":
    main()
