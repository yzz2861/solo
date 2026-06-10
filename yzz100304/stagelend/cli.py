"""CLI 主入口"""

import os
import sys
from datetime import date

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .database import init_db, get_db_path
from .importers import import_lending_csv, import_returns_json, import_hoist_csv, import_decommission_csv
from .audit import run_full_audit, audit_overdue, audit_hoist_overload, audit_person_mismatch
from .core import (
    list_all_equipments,
    get_equipment_status,
    get_equipment_summary,
    decommission_equipment,
    recommission_equipment,
    list_decommissioned_equipments,
    DECOMMISSION_REASON_NORMAL,
    DECOMMISSION_REASON_DAMAGED,
    DECOMMISSION_REASON_LOST,
    DECOMMISSION_REASON_OBSOLETE,
)
from .review import (
    get_unverified_returns,
    get_verified_returns,
    get_review_summary,
    mark_verified,
    get_returns_by_person,
)
from .report import export_markdown_report, export_equipment_list_markdown

console = Console()


def _get_db_path(ctx) -> str:
    return ctx.obj.get("db_path") if ctx.obj else None


@click.group()
@click.option("--db", "db_path", help="数据库文件路径", default=None)
@click.pass_context
def cli(ctx, db_path):
    """剧场舞台设备借还管理工具"""
    ctx.ensure_object(dict)
    ctx.obj["db_path"] = db_path
    init_db(db_path)


# ============== import 命令组 ==============

@cli.group()
def imp():
    """导入数据"""
    pass


@imp.command("lending")
@click.argument("file_path", type=click.Path(exists=True))
@click.pass_context
def import_lending(ctx, file_path):
    """导入灯具借出表 (CSV)"""
    db_path = _get_db_path(ctx)
    try:
        added, skipped, warnings = import_lending_csv(file_path, db_path)
        if added == 0 and skipped == 0 and warnings and any("已导入" in w for w in warnings):
            console.print("[yellow]⚠️ 文件已导入过，跳过（幂等保护）[/yellow]")
            for w in warnings:
                console.print(f"  {w}")
        else:
            console.print(f"[green]✓ 成功导入 {added} 条借出记录[/green]")
            if warnings:
                console.print(f"[yellow]警告 {len(warnings)} 条:[/yellow]")
                for w in warnings:
                    console.print(f"  - {w}")
    except Exception as e:
        console.print(f"[red]✗ 导入失败: {e}[/red]")
        sys.exit(1)


@imp.command("returns")
@click.argument("file_path", type=click.Path(exists=True))
@click.pass_context
def import_returns(ctx, file_path):
    """导入归还记录 (JSON)"""
    db_path = _get_db_path(ctx)
    try:
        added, skipped, warnings = import_returns_json(file_path, db_path)
        if added == 0 and warnings and any("已导入" in w for w in warnings):
            console.print("[yellow]⚠️ 文件已导入过，跳过（幂等保护）[/yellow]")
            for w in warnings:
                console.print(f"  {w}")
        else:
            console.print(f"[green]✓ 成功导入 {added} 条归还记录[/green]")
            if warnings:
                console.print(f"[yellow]警告 {len(warnings)} 条:[/yellow]")
                for w in warnings:
                    console.print(f"  - {w}")
    except Exception as e:
        console.print(f"[red]✗ 导入失败: {e}[/red]")
        sys.exit(1)


@imp.command("hoist")
@click.argument("file_path", type=click.Path(exists=True))
@click.pass_context
def import_hoist(ctx, file_path):
    """导入吊点载荷表 (CSV)"""
    db_path = _get_db_path(ctx)
    try:
        added, skipped, warnings = import_hoist_csv(file_path, db_path)
        if added == 0 and warnings and any("已导入" in w for w in warnings):
            console.print("[yellow]⚠️ 文件已导入过，跳过（幂等保护）[/yellow]")
            for w in warnings:
                console.print(f"  {w}")
        else:
            console.print(f"[green]✓ 成功导入 {added} 条吊点记录[/green]")
            if warnings:
                console.print(f"[yellow]警告 {len(warnings)} 条:[/yellow]")
                for w in warnings:
                    console.print(f"  - {w}")
    except Exception as e:
        console.print(f"[red]✗ 导入失败: {e}[/red]")
        sys.exit(1)


@imp.command("decommission")
@click.argument("file_path", type=click.Path(exists=True))
@click.pass_context
def import_decommission(ctx, file_path):
    """导入停用/报废表 (CSV)"""
    db_path = _get_db_path(ctx)
    try:
        added, skipped, warnings = import_decommission_csv(file_path, db_path)
        if added == 0 and warnings and any("已导入" in w for w in warnings):
            console.print("[yellow]⚠️ 文件已导入过，跳过（幂等保护）[/yellow]")
            for w in warnings:
                console.print(f"  {w}")
        else:
            console.print(f"[green]✓ 成功导入 {added} 条停用/报废记录[/green]")
            if warnings:
                console.print(f"[yellow]警告 {len(warnings)} 条:[/yellow]")
                for w in warnings:
                    console.print(f"  - {w}")
    except Exception as e:
        console.print(f"[red]✗ 导入失败: {e}[/red]")
        sys.exit(1)


@imp.command("all")
@click.option("--lending", help="借出表 CSV 路径", type=click.Path(exists=True))
@click.option("--returns", help="归还记录 JSON 路径", type=click.Path(exists=True))
@click.option("--hoist", help="吊点载荷表 CSV 路径", type=click.Path(exists=True))
@click.option("--decommission", "decom", help="停用/报废表 CSV 路径", type=click.Path(exists=True))
@click.pass_context
def import_all(ctx, lending, returns, hoist, decom):
    """一次性导入四类数据"""
    db_path = _get_db_path(ctx)
    results = {}

    if lending:
        try:
            added, _, warnings = import_lending_csv(lending, db_path)
            results["lending"] = (added, warnings)
        except Exception as e:
            results["lending"] = (0, [f"错误: {e}"])

    if returns:
        try:
            added, _, warnings = import_returns_json(returns, db_path)
            results["returns"] = (added, warnings)
        except Exception as e:
            results["returns"] = (0, [f"错误: {e}"])

    if hoist:
        try:
            added, _, warnings = import_hoist_csv(hoist, db_path)
            results["hoist"] = (added, warnings)
        except Exception as e:
            results["hoist"] = (0, [f"错误: {e}"])

    if decom:
        try:
            added, _, warnings = import_decommission_csv(decom, db_path)
            results["decommission"] = (added, warnings)
        except Exception as e:
            results["decommission"] = (0, [f"错误: {e}"])

    for name, (added, warnings) in results.items():
        label = {"lending": "借出表", "returns": "归还记录", "hoist": "吊点表",
                 "decommission": "停用/报废表"}.get(name, name)
        console.print(f"[green]✓ {label}: 导入 {added} 条[/green]")
        for w in warnings:
            console.print(f"  [yellow]- {w}[/yellow]")


# ============== audit 命令 ==============

@cli.command()
@click.option("--type", "audit_type", type=click.Choice(["all", "overdue", "hoist", "person"]),
              default="all", help="审计类型")
@click.option("--date", "ref_date", help="参考日期 (YYYY-MM-DD)，默认今天", default=None)
@click.pass_context
def audit(ctx, audit_type, ref_date):
    """审计异常（逾期、吊点超限、人员不一致）"""
    db_path = _get_db_path(ctx)

    ref = None
    if ref_date:
        from .utils import parse_date
        ref = parse_date(ref_date)

    console.print()
    console.print(Panel("🎭 舞台设备审计", style="bold blue"))
    console.print()

    if audit_type in ("all", "overdue"):
        overdue_items = audit_overdue(db_path, ref)
        from .audit import OVERDUE_UNRETURNED, OVERDUE_RETURNED_LATE
        unreturned = [o for o in overdue_items if o["type"] == OVERDUE_UNRETURNED]
        returned_late = [o for o in overdue_items if o["type"] == OVERDUE_RETURNED_LATE]
        _print_overdue_unreturned_table(unreturned)
        _print_overdue_returned_late_table(returned_late)

    if audit_type in ("all", "hoist"):
        _print_hoist_overload_table(audit_hoist_overload(db_path))

    if audit_type in ("all", "person"):
        _print_person_mismatch_table(audit_person_mismatch(db_path))

    console.print()

    result = run_full_audit(db_path, ref)
    total = len(result["overdue"]) + len(result["hoist_overload"]) + len(result["person_mismatch"])
    console.print()
    console.print(f"[bold]异常总计: {total} 项[/bold]")

    from .audit import get_audit_summary
    summary = get_audit_summary(result)
    console.print(f"  - 逾期未还: {summary['overdue_unreturned_count']} 项")
    console.print(f"  - 逾期归还: {summary['overdue_returned_late_count']} 项")
    console.print(f"  - 吊点超限: {summary['hoist_overload_count']} 项")
    console.print(f"  - 人员不一致: {summary['person_mismatch_count']} 项")


def _print_overdue_unreturned_table(items):
    console.print("[bold red]⏰ 逾期未还（仍在外）[/bold red]")
    if not items:
        console.print("  [green]无逾期未还记录 ✓[/green]")
        console.print()
        return

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("设备编号", style="cyan")
    table.add_column("设备名称")
    table.add_column("借出数", justify="right")
    table.add_column("已还数", justify="right")
    table.add_column("未还数", justify="right", style="bold red")
    table.add_column("借用人")
    table.add_column("借出日期")
    table.add_column("应还日期")
    table.add_column("用途")
    table.add_column("来源行")

    for item in items:
        table.add_row(
            item["equipment_no"],
            item["equipment_name"],
            str(item["quantity_lent"]),
            str(item["quantity_returned"]),
            str(item["quantity_overdue"]),
            item["borrower"],
            item["lend_date"],
            item["due_date"],
            item.get("purpose", ""),
            str(item.get("source_line_no", "-")),
        )

    console.print(table)


def _print_overdue_returned_late_table(items):
    console.print("[bold yellow]⚠️ 逾期归还（已归还但超期）[/bold yellow]")
    if not items:
        console.print("  [green]无逾期归还记录 ✓[/green]")
        console.print()
        return

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("设备编号", style="cyan")
    table.add_column("设备名称")
    table.add_column("借出数", justify="right")
    table.add_column("逾期归还数", justify="right", style="bold yellow")
    table.add_column("借用人")
    table.add_column("应还日期")
    table.add_column("实际归还日期", style="yellow")
    table.add_column("用途")
    table.add_column("来源行")

    for item in items:
        table.add_row(
            item["equipment_no"],
            item["equipment_name"],
            str(item["quantity_lent"]),
            str(item["quantity_overdue"]),
            item["borrower"],
            item["due_date"],
            item["latest_return_date"],
            item.get("purpose", ""),
            str(item.get("source_line_no", "-")),
        )

    console.print(table)


def _print_hoist_overload_table(items):
    console.print("[bold yellow]⚠️ 吊点载荷超限[/bold yellow]")
    if not items:
        console.print("  [green]无超限记录 ✓[/green]")
        console.print()
        return

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("吊点编号", style="cyan")
    table.add_column("额定(kg)", justify="right")
    table.add_column("当前(kg)", justify="right", style="red")
    table.add_column("超限(kg)", justify="right")
    table.add_column("超限比例", justify="right")
    table.add_column("关联设备")
    table.add_column("来源行")

    for item in items:
        table.add_row(
            item["point_no"],
            str(item["max_load"]),
            str(item["current_load"]),
            str(item["overload_amount"]),
            f"{item['overload_percent']:.1f}%",
            item["equipment_no"],
            str(item.get("source_line_no", "-")),
        )

    console.print(table)


def _print_person_mismatch_table(items):
    console.print("[bold magenta]🔀 归还人与借用人不一致[/bold magenta]")
    if not items:
        console.print("  [green]无不一致记录 ✓[/green]")
        console.print()
        return

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("设备编号", style="cyan")
    table.add_column("借用人", style="blue")
    table.add_column("归还人", style="red")
    table.add_column("借出日期")
    table.add_column("归还日期")
    table.add_column("借出行/归还行")

    for item in items:
        table.add_row(
            item["equipment_no"],
            item["borrower"],
            item["returner"],
            item["lend_date"],
            item["return_date"],
            f"{item['lend_source_line']} / {item['return_source_line']}",
        )

    console.print(table)


# ============== review 命令 ==============

@cli.command()
@click.option("--pending", is_flag=True, help="只显示待复核")
@click.option("--verified", is_flag=True, help="只显示已复核")
@click.option("--person", help="按人员查询")
@click.option("--mark-verified", type=int, help="标记指定记录ID为已复核")
@click.pass_context
def review(ctx, pending, verified, person, mark_verified):
    """复核归还记录"""
    db_path = _get_db_path(ctx)

    if mark_verified is not None:
        from .review import mark_verified as mv
        if mv(mark_verified, db_path):
            console.print(f"[green]✓ 记录 {mark_verified} 已标记为已复核[/green]")
        else:
            console.print(f"[yellow]记录 {mark_verified} 不存在或已复核[/yellow]")
        return

    console.print()
    console.print(Panel("🔍 归还复核", style="bold green"))
    console.print()

    summary = get_review_summary(db_path)
    console.print(f"待复核: [bold yellow]{summary['unverified_records']}[/bold yellow] 条 "
                  f"({summary['unverified_quantity']} 件)")
    console.print(f"已复核: [bold green]{summary['verified_records']}[/bold green] 条 "
                  f"({summary['verified_quantity']} 件)")
    console.print()

    if person:
        _print_person_review(person, db_path)
        return

    if not verified:
        _print_review_table(get_unverified_returns(db_path), "待复核", "yellow")
    if not pending:
        _print_review_table(get_verified_returns(db_path), "已复核", "green")


def _print_review_table(items, title, color):
    console.print(f"[bold {color}]{title} ({len(items)} 条)[/bold {color}]")
    if not items:
        console.print("  无记录")
        console.print()
        return

    table = Table(show_header=True, header_style=f"bold {color}")
    table.add_column("ID", style="dim", justify="right")
    table.add_column("设备编号", style="cyan")
    table.add_column("设备名称")
    table.add_column("数量", justify="right")
    table.add_column("归还人")
    table.add_column("归还日期")
    table.add_column("状态")
    table.add_column("来源行")

    for item in items:
        table.add_row(
            str(item["id"]),
            item["equipment_no"],
            item.get("equip_name", ""),
            str(item["quantity"]),
            item["returner"],
            item["return_date"],
            item.get("condition", ""),
            str(item.get("source_line_no", "-")),
        )

    console.print(table)


def _print_person_review(person, db_path):
    result = get_returns_by_person(person, db_path)
    console.print(f"[bold]人员查询: {person}[/bold]")
    console.print()

    console.print(f"作为归还人 ({len(result['as_returner'])} 条):")
    for r in result["as_returner"]:
        console.print(f"  - {r['equipment_no']} x{r['quantity']} @ {r['return_date']}")

    console.print()
    console.print(f"作为复核人 ({len(result['as_verifier'])} 条):")
    for r in result["as_verifier"]:
        console.print(f"  - {r['equipment_no']} x{r['quantity']} @ {r['return_date']}")


# ============== status / list 命令 ==============

@cli.command()
@click.argument("equipment_no", required=False)
@click.option("--status", help="按状态筛选",
              type=click.Choice(["available", "lent", "returned", "verified", "decommissioned"]))
@click.pass_context
def status(ctx, equipment_no, status):
    """查看设备状态"""
    db_path = _get_db_path(ctx)

    if equipment_no:
        info = get_equipment_status(equipment_no, db_path)
        if not info:
            console.print(f"[red]未找到设备: {equipment_no}[/red]")
            sys.exit(1)
        _print_single_status(info)
        return

    equips = list_all_equipments(db_path, status)
    summary = get_equipment_summary(db_path)

    console.print()
    console.print(Panel("📋 设备状态总览", style="bold cyan"))
    console.print()

    status_labels = {
        "available": "🟢 可用",
        "lent": "🟡 借出中",
        "returned": "🔵 已归还待复核",
        "verified": "✅ 已复核",
        "decommissioned": "⚫ 已停用",
    }
    for s, label in status_labels.items():
        count = summary.get(s, 0)
        console.print(f"  {label}: {count}")
    console.print(f"  总计: {summary.get('total', 0)}")
    console.print()

    if equips:
        table = Table(show_header=True, header_style="bold cyan")
        table.add_column("设备编号", style="cyan")
        table.add_column("名称")
        table.add_column("状态")
        table.add_column("累计借出", justify="right")
        table.add_column("累计归还", justify="right")
        table.add_column("净借出", justify="right")

        for e in equips:
            table.add_row(
                e["equipment_no"],
                e["name"],
                status_labels.get(e["status"], e["status"]),
                str(e["total_lent"]),
                str(e["total_returned"]),
                str(e["net_lent"]),
            )

        console.print(table)


def _print_single_status(info):
    console.print()
    console.print(Panel(f"📦 {info['equipment_no']} - {info['name']}", style="bold cyan"))
    console.print()
    console.print(f"  状态: {info['status']}")
    console.print(f"  累计借出: {info['total_lent']}")
    console.print(f"  累计归还: {info['total_returned']}")
    console.print(f"  已复核: {info['total_verified']}")
    console.print(f"  在途未还: {info.get('qty_in_transit', 0)}")
    console.print(f"  待复核: {info.get('qty_pending_verify', 0)}")
    console.print(f"  净借出: {info['net_lent']}")
    if info.get("has_late_return"):
        console.print(f"  [yellow]⚠️ 存在逾期归还记录[/yellow]")
    if info.get("decommissioned") and info.get("decommission_info"):
        d = info["decommission_info"]
        reason_labels = {
            "normal": "正常停用",
            "damaged": "损坏报废",
            "lost": "丢失",
            "obsolete": "淘汰",
        }
        console.print()
        console.print(f"  [bold]⚫ 停用/报废信息:[/bold]")
        console.print(f"    停用日期: {d['date']}")
        console.print(f"    原因: {reason_labels.get(d['reason'], d['reason'])}")
        if d["reason_detail"]:
            console.print(f"    详情: {d['reason_detail']}")
        if d["operator"]:
            console.print(f"    操作人: {d['operator']}")
        if d["remark"]:
            console.print(f"    备注: {d['remark']}")
    console.print()

    if info["lend_records"]:
        console.print("[bold]借出记录:[/bold]")
        for r in info["lend_records"]:
            console.print(f"  - {r['lend_date']} x{r['quantity']} "
                          f"(借用人: {r['borrower']}, 借出人: {r['lender']}) "
                          f"[行{r['source_line_no']}]")
        console.print()

    if info["return_records"]:
        console.print("[bold]归还记录:[/bold]")
        for r in info["return_records"]:
            v = "✓已复核" if r["verified"] else "待复核"
            console.print(f"  - {r['return_date']} x{r['quantity']} "
                          f"(归还人: {r['returner']}, {v}) "
                          f"[行{r['source_line_no']}]")


# ============== decommission 命令组 ==============

@cli.group()
def decom():
    """停用/报废管理"""
    pass


@decom.command("list")
@click.pass_context
def decom_list(ctx):
    """列出所有停用/报废设备"""
    db_path = _get_db_path(ctx)
    items = list_decommissioned_equipments(db_path)

    console.print()
    console.print(Panel("⚫ 停用/报废设备清单", style="bold"))
    console.print()

    if not items:
        console.print("  [green]无停用/报废记录 ✓[/green]")
        console.print()
        return

    reason_labels = {
        "normal": "正常停用",
        "damaged": "损坏报废",
        "lost": "丢失",
        "obsolete": "淘汰",
    }

    table = Table(show_header=True, header_style="bold")
    table.add_column("设备编号", style="cyan")
    table.add_column("设备名称")
    table.add_column("停用日期")
    table.add_column("原因")
    table.add_column("原因详情")
    table.add_column("操作人")
    table.add_column("备注")

    for item in items:
        table.add_row(
            item["equipment_no"],
            item.get("equip_name", ""),
            item["decommission_date"],
            reason_labels.get(item["reason"], item["reason"]),
            item.get("reason_detail", ""),
            item.get("operator", ""),
            item.get("remark", ""),
        )

    console.print(table)
    console.print(f"共 {len(items)} 台停用/报废设备")
    console.print()


@decom.command("mark")
@click.argument("equipment_no")
@click.option("--date", "decommission_date", help="停用日期 (YYYY-MM-DD)，默认今天", default=None)
@click.option("--reason", type=click.Choice(["normal", "damaged", "lost", "obsolete"]),
              default="normal", help="停用原因")
@click.option("--reason-detail", help="原因详细描述", default="")
@click.option("--operator", help="操作人", default="")
@click.option("--remark", help="备注", default="")
@click.pass_context
def decom_mark(ctx, equipment_no, decommission_date, reason, reason_detail, operator, remark):
    """停用/报废单台设备"""
    db_path = _get_db_path(ctx)
    if not decommission_date:
        from datetime import date as _date
        decommission_date = _date.today().strftime("%Y-%m-%d")

    ok, msg = decommission_equipment(
        equipment_no, decommission_date, reason, reason_detail, operator, remark, db_path
    )
    if ok:
        console.print(f"[green]✓ {msg}[/green]")
    else:
        console.print(f"[red]✗ {msg}[/red]")
        sys.exit(1)


@decom.command("restore")
@click.argument("equipment_no")
@click.option("--operator", help="操作人", default="")
@click.option("--remark", help="备注", default="")
@click.pass_context
def decom_restore(ctx, equipment_no, operator, remark):
    """恢复停用设备为可用"""
    db_path = _get_db_path(ctx)
    ok, msg = recommission_equipment(equipment_no, operator, remark, db_path)
    if ok:
        console.print(f"[green]✓ {msg}[/green]")
    else:
        console.print(f"[yellow]⚠️ {msg}[/yellow]")


# ============== export 命令 ==============

@cli.command()
@click.argument("output", type=click.Path())
@click.option("--type", "export_type", type=click.Choice(["report", "equipment", "all"]),
              default="report", help="导出类型")
@click.option("--date", "ref_date", help="参考日期 (YYYY-MM-DD)", default=None)
@click.option("--title", help="报告标题", default="舞台设备借还审计报告")
@click.pass_context
def export(ctx, output, export_type, ref_date, title):
    """导出 Markdown 报告"""
    db_path = _get_db_path(ctx)

    ref = None
    if ref_date:
        from .utils import parse_date
        ref = parse_date(ref_date)

    try:
        if export_type in ("report", "all"):
            report_path = output if export_type == "report" else _add_suffix(output, "report")
            export_markdown_report(report_path, db_path, ref, title)
            console.print(f"[green]✓ 审计报告已导出: {report_path}[/green]")

        if export_type in ("equipment", "all"):
            equip_path = output if export_type == "equipment" else _add_suffix(output, "equipment")
            export_equipment_list_markdown(equip_path, db_path)
            console.print(f"[green]✓ 设备清单已导出: {equip_path}[/green]")

    except Exception as e:
        console.print(f"[red]✗ 导出失败: {e}[/red]")
        sys.exit(1)


def _add_suffix(path, suffix):
    base, ext = os.path.splitext(path)
    return f"{base}_{suffix}{ext}"


# ============== db info 命令 ==============

@cli.command("db-info")
@click.pass_context
def db_info(ctx):
    """显示数据库信息"""
    db_path = get_db_path(_get_db_path(ctx))
    console.print(f"数据库路径: [cyan]{db_path}[/cyan]")

    from .database import get_conn
    with get_conn(_get_db_path(ctx)) as conn:
        for table in ["lending_records", "return_records", "hoist_points",
                       "equipments", "decommission_records", "import_sources"]:
            count = conn.execute(f"SELECT COUNT(*) as cnt FROM {table}").fetchone()["cnt"]
            console.print(f"  {table}: {count} 条")


if __name__ == "__main__":
    cli()
