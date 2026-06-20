import click
import os
import sys
from datetime import date, datetime
from typing import Optional

from . import __version__
from .data_loader import load_all_data
from .date_utils import parse_date, get_this_friday
from .matcher import match_orders
from .exporter_urgent import export_urgent_list
from .exporter_report import export_variance_report
from .console_view import (
    console,
    print_summary,
    print_orders_table,
    print_delayed_detail,
    print_risk_grouped,
)
from .models import OrderStatus


def _parse_today(ctx, param, value) -> Optional[date]:
    if not value:
        return None
    try:
        return parse_date(value) or datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise click.BadParameter(f"日期格式不正确: {value}，请使用 YYYY-MM-DD 格式")


def _validate_files(orders_file, promises_file, arrivals_file):
    for f in [orders_file, promises_file, arrivals_file]:
        if f and not os.path.exists(f):
            raise click.FileError(f, "文件不存在")


@click.group(
    help="供应商交期对齐器 - 管理采购单、承诺交期、到货记录的匹配与分析",
    context_settings={"help_option_names": ["-h", "--help"]},
)
@click.version_option(__version__, prog_name="delivery-aligner")
def cli():
    """供应商交期对齐器 CLI"""
    pass


@cli.command("analyze", help="综合分析：读取三份数据，显示汇总与各状态订单")
@click.option("-o", "--orders", "orders_file", required=True, type=click.Path(), help="采购单文件 (CSV/Excel)")
@click.option("-p", "--promises", "promises_file", required=True, type=click.Path(), help="供应商承诺表文件")
@click.option("-a", "--arrivals", "arrivals_file", required=True, type=click.Path(), help="仓库到货记录表文件")
@click.option("-t", "--today", "today", callback=_parse_today, help="指定分析日期 YYYY-MM-DD（默认今天）")
@click.option("-l", "--limit", "limit", type=int, default=20, help="订单列表显示条数（默认20）")
@click.option("--detail", is_flag=True, help="显示延期订单详细信息")
@click.option("-u", "--urgent-export", "urgent_output", type=click.Path(), help="导出催货清单（Excel）")
@click.option("-r", "--report-export", "report_output", type=click.Path(), help="导出差异报告给生产计划（Excel）")
def analyze(
    orders_file: str,
    promises_file: str,
    arrivals_file: str,
    today: Optional[date],
    limit: int,
    detail: bool,
    urgent_output: Optional[str],
    report_output: Optional[str],
):
    _validate_files(orders_file, promises_file, arrivals_file)
    today = today or date.today()

    console.rule(f"[bold blue]供应商交期对齐器 - 综合分析[/bold blue]")
    console.print(f"分析日期: {today.strftime('%Y-%m-%d')} | "
                  f"本周五: {get_this_friday(today).strftime('%Y-%m-%d')}")

    with console.status("[bold green]正在读取和匹配数据..."):
        data = load_all_data(orders_file, promises_file, arrivals_file, today)
        matched = match_orders(data["orders"], data["promises"], data["arrivals"], today)

    console.print(
        f"[green]✓[/green] 加载采购单 {len(data['orders'])} 单，"
        f"承诺记录 {len(data['promises'])} 条，"
        f"到货记录 {len(data['arrivals'])} 条"
    )

    print_summary(matched, today)

    print_risk_grouped(matched, today)

    if detail:
        print_delayed_detail(matched, today)

    print_orders_table(matched, f"全部订单（显示前 {limit} 条，按风险排序）", limit, today)

    if urgent_output:
        with console.status(f"[bold green]正在导出催货清单到 {urgent_output}..."):
            path = export_urgent_list(matched, urgent_output, today)
        console.print(f"[green]✓[/green] 催货清单已导出: {path}")

    if report_output:
        with console.status(f"[bold green]正在导出差异报告到 {report_output}..."):
            path = export_variance_report(matched, report_output, today)
        console.print(f"[green]✓[/green] 差异报告已导出: {path}")


@cli.command("urgent", help="生成催货清单：只看延期和待跟进订单，导出给采购")
@click.option("-o", "--orders", "orders_file", required=True, type=click.Path(), help="采购单文件")
@click.option("-p", "--promises", "promises_file", required=True, type=click.Path(), help="供应商承诺表文件")
@click.option("-a", "--arrivals", "arrivals_file", required=True, type=click.Path(), help="仓库到货记录表文件")
@click.option("-t", "--today", "today", callback=_parse_today, help="指定分析日期")
@click.option("-e", "--export", "output", required=True, type=click.Path(), help="催货清单导出路径（Excel/CSV）")
@click.option("--supplier", "supplier_filter", help="按供应商筛选（简称或全称）")
@click.option("--status", "status_filter", multiple=True,
              type=click.Choice(["延期", "部分到货", "无承诺", "承诺未到"]),
              help="按状态筛选（可重复指定）")
def urgent_list(
    orders_file: str,
    promises_file: str,
    arrivals_file: str,
    today: Optional[date],
    output: str,
    supplier_filter: Optional[str],
    status_filter: tuple,
):
    _validate_files(orders_file, promises_file, arrivals_file)
    today = today or date.today()

    console.rule(f"[bold red]催货清单生成[/bold red]")

    with console.status("[bold green]正在处理数据..."):
        data = load_all_data(orders_file, promises_file, arrivals_file, today)
        matched = match_orders(data["orders"], data["promises"], data["arrivals"], today)

    status_map = {
        "延期": OrderStatus.DELAYED,
        "部分到货": OrderStatus.PARTIALLY_DELIVERED,
        "无承诺": OrderStatus.NO_PROMISE,
        "承诺未到": OrderStatus.PROMISED_PENDING,
    }
    filtered = matched

    if status_filter:
        target_statuses = [status_map[s] for s in status_filter]
        filtered = [m for m in filtered if m.status in target_statuses]

    if supplier_filter:
        s_lower = supplier_filter.lower()
        filtered = [
            m for m in filtered
            if s_lower in (m.purchase_order.supplier_short or "").lower()
            or s_lower in (m.purchase_order.supplier_full or "").lower()
        ]

    filtered = [m for m in filtered if m.status != OrderStatus.FULLY_DELIVERED]

    console.print(f"筛选结果: {len(filtered)} 个订单需要跟进")
    print_orders_table(filtered, "催办订单列表", None, today)

    print_delayed_detail(filtered, today)

    with console.status(f"[bold green]正在导出到 {output}..."):
        path = export_urgent_list(filtered, output, today)

    console.print(f"[green]✓[/green] 催货清单已导出: {path}")
    console.print(f"[dim]提示: 该清单按优先级(P0-P3)和供应商分组，"
                  f"包含催办建议和联系要点，可直接发给采购跟单[/dim]")


@cli.command("risk", help="每日风险早报：给生产计划员看的延期风险视图")
@click.option("-o", "--orders", "orders_file", required=True, type=click.Path(), help="采购单文件")
@click.option("-p", "--promises", "promises_file", required=True, type=click.Path(), help="供应商承诺表文件")
@click.option("-a", "--arrivals", "arrivals_file", required=True, type=click.Path(), help="仓库到货记录表文件")
@click.option("-t", "--today", "today", callback=_parse_today, help="指定分析日期")
@click.option("-e", "--export", "output", type=click.Path(), help="导出差异报告（Excel）")
@click.option("--window", type=int, default=14, help="未来多少天内的订单算风险窗口（默认14天）")
def risk_report(
    orders_file: str,
    promises_file: str,
    arrivals_file: str,
    today: Optional[date],
    output: Optional[str],
    window: int,
):
    _validate_files(orders_file, promises_file, arrivals_file)
    today = today or date.today()

    console.rule(f"[bold magenta]每日交期风险早报[/bold magenta]")
    console.print(
        f"[bold]报告日期:[/bold] {today.strftime('%Y-%m-%d %A')} | "
        f"风险窗口: 未来 {window} 天 | "
        f"本周五: {get_this_friday(today).strftime('%Y-%m-%d')}"
    )

    with console.status("[bold green]正在分析风险..."):
        data = load_all_data(orders_file, promises_file, arrivals_file, today)
        matched = match_orders(data["orders"], data["promises"], data["arrivals"], today)

    print_summary(matched, today)

    console.print()
    console.print("[bold]:bangbang: 延期订单详情[/bold]")
    print_delayed_detail(matched, today)

    console.print()
    console.print("[bold]:bar_chart: 承诺差异分析[/bold]")
    print_risk_grouped(matched, today)

    if output:
        with console.status(f"[bold green]正在导出差异报告到 {output}..."):
            path = export_variance_report(matched, output, today)
        console.print(f"[green]✓[/green] 差异报告已导出: {path}")
        console.print(
            f"[dim]报告包含: 总览、风险评估、承诺差异、供应商评级四个工作表[/dim]"
        )

    console.print()
    console.print(
        "[bold cyan]生产计划员提示:[/bold cyan]\n"
        "  1. 红色高风险订单优先与采购沟通确认\n"
        "  2. 无承诺订单要求采购今天内拿到供应商回复\n"
        "  3. 分批到货订单根据批次调整排产节奏\n"
        "  4. 导出的Excel报告含详细评估和建议措施"
    )


@cli.command("template", help="生成示例数据文件，方便测试")
@click.option("-d", "--dir", "output_dir", default="sample_data", help="输出目录（默认 sample_data）")
@click.option("-f", "--format", "fmt", type=click.Choice(["csv", "xlsx", "both"]), default="csv",
              help="生成文件格式（默认csv）")
def generate_template(output_dir: str, fmt: str):
    os.makedirs(output_dir, exist_ok=True)

    try:
        import pandas as pd
        from datetime import timedelta

        today = date.today()
        friday = get_this_friday(today)

        orders_data = {
            "订单号": ["PO20260601", "PO20260602", "PO20260603", "PO20260603-2", "PO20260604",
                     "PO20260605", "PO20260606", "PO20260607", "PO20260608", "PO20260609"],
            "行号": ["", "", "", "", "", "", "", "", "", ""],
            "物料编码": ["MAT001", "MAT002", "MAT003", "MAT003", "MAT004",
                       "MAT005", "MAT006", "MAT007", "MAT008", "MAT009"],
            "物料名称": ["主控芯片", "精密外壳", "PCB电路板", "PCB电路板", "连接器端子",
                       "电解电容", "散热风扇", "塑胶按键", "金属垫片", "包装纸盒"],
            "供应商": ["深圳市华强电子有限公司", "苏州精密模具制造有限公司", "上海五金材料股份有限公司",
                      "上海五金材料股份有限公司", "东莞市塑胶制品厂", "广州市化工原料有限公司",
                      "佛山市陶瓷建材集团", "东莞市塑胶制品厂", "杭州电子元器件有限公司",
                      "成都包装材料有限公司"],
            "数量": ["10000", "5000", "20000", "30000", "8000", "50000", "3000", "20000", "15000", "10000"],
            "单位": ["PCS", "PCS", "PCS", "PCS", "PCS", "PCS", "PCS", "PCS", "PCS", "PCS"],
            "计划交期": [
                (today - timedelta(days=10)).strftime("%Y-%m-%d"),
                (today - timedelta(days=5)).strftime("%Y-%m-%d"),
                (today - timedelta(days=3)).strftime("%Y-%m-%d"),
                (today - timedelta(days=2)).strftime("%Y-%m-%d"),
                today.strftime("%Y-%m-%d"),
                (today + timedelta(days=2)).strftime("%Y-%m-%d"),
                friday.strftime("%Y-%m-%d"),
                (today + timedelta(days=10)).strftime("%Y-%m-%d"),
                (today + timedelta(days=15)).strftime("%Y-%m-%d"),
                (today + timedelta(days=20)).strftime("%Y-%m-%d"),
            ],
            "备注": ["", "", "拆分订单-第1批", "拆分订单-第2批", "", "本周五", "", "", "", ""],
        }

        promises_data = {
            "订单号": ["PO20260601", "PO20260602", "PO20260602", "PO20260603", "PO20260603-2",
                      "PO20260604", "PO20260606", "PO20260607", "PO20260608"],
            "行号": ["", "", "", "", "", "", "", "", ""],
            "物料编码": ["MAT001", "MAT002", "MAT002", "MAT003", "MAT003",
                       "MAT004", "MAT006", "MAT007", "MAT008"],
            "供应商": ["深圳市华强电子有限公司", "苏州精密模具制造有限公司", "苏州精密模具制造有限公司",
                      "上海五金材料股份有限公司", "上海五金材料股份有限公司", "东莞市塑胶制品厂",
                      "佛山市陶瓷建材集团", "东莞市塑胶制品厂", "杭州电子元器件有限公司"],
            "承诺交期": [
                (today - timedelta(days=8)).strftime("%Y-%m-%d"),
                (today - timedelta(days=3)).strftime("%Y-%m-%d"),
                "本周五",
                (today - timedelta(days=1)).strftime("%Y-%m-%d"),
                friday.strftime("%Y-%m-%d"),
                (today + timedelta(days=3)).strftime("%Y-%m-%d"),
                "下周五",
                (today + timedelta(days=12)).strftime("%Y-%m-%d"),
                (today + timedelta(days=18)).strftime("%Y-%m-%d"),
            ],
            "承诺数量": ["10000", "3000", "2000", "20000", "", "", "", "", ""],
            "批次号": ["", "BATCH1", "BATCH2", "", "", "", "", "", ""],
            "来源": ["2026-06-05邮件回复", "2026-06-08邮件", "2026-06-10邮件确认分批",
                    "2026-06-12微信", "2026-06-15电话", "2026-06-16邮件",
                    "2026-06-17邮件", "", ""],
            "备注": ["", "分两批交货", "分批交付第2批", "", "", "", "", "", ""],
        }

        arrivals_data = {
            "订单号": ["PO20260601", "PO20260602", "PO20260603", "PO20260606"],
            "行号": ["", "", "", ""],
            "物料编码": ["MAT001", "MAT002", "MAT003", "MAT006"],
            "供应商": ["深圳市华强电子有限公司", "苏州精密模具制造有限公司",
                      "上海五金材料股份有限公司", "佛山市陶瓷建材集团"],
            "到货日期": [
                (today - timedelta(days=7)).strftime("%Y-%m-%d"),
                (today - timedelta(days=2)).strftime("%Y-%m-%d"),
                today.strftime("%Y-%m-%d"),
                (today - timedelta(days=1)).strftime("%Y-%m-%d"),
            ],
            "到货数量": ["10000", "3000", "20000", "1500"],
            "单位": ["PCS", "PCS", "PCS", "PCS"],
            "批次号": ["", "BATCH1", "", "FIRST"],
            "仓库": ["原料仓A", "原料仓B", "原料仓A", "原料仓C"],
            "备注": ["", "第1批到货", "拆分第1批完成", "部分到货"],
        }

        def _save(df, name):
            if fmt in ("csv", "both"):
                csv_path = os.path.join(output_dir, f"{name}.csv")
                df.to_csv(csv_path, index=False, encoding="utf-8-sig")
                console.print(f"[green]✓[/green] 生成 {csv_path}")
            if fmt in ("xlsx", "both"):
                xlsx_path = os.path.join(output_dir, f"{name}.xlsx")
                df.to_excel(xlsx_path, index=False, engine="openpyxl")
                console.print(f"[green]✓[/green] 生成 {xlsx_path}")

        _save(pd.DataFrame(orders_data), "采购单示例")
        _save(pd.DataFrame(promises_data), "供应商承诺表示例")
        _save(pd.DataFrame(arrivals_data), "仓库到货表示例")

        console.print()
        console.print(f"[bold green]示例数据已生成到目录: {output_dir}[/bold green]")
        console.print()
        console.print("[bold]示例数据包含以下测试场景:[/bold]")
        console.print("  1. PO20260601 - [green]正常到货[/green]：承诺8天前，已全部到货")
        console.print("  2. PO20260602 - [yellow]部分到货+延期[/yellow]：分两批承诺，只到了第1批")
        console.print("  3. PO20260603 + PO20260603-2 - [cyan]订单拆分[/cyan]：同一主单拆分两行，第1批已到")
        console.print("  4. PO20260604 - [red]延期无到货[/red]：今天到期，还没到也没到货")
        console.print("  5. PO20260605 - [magenta]无供应商承诺[/magenta]：有计划交期但供应商没回复")
        console.print("  6. PO20260606 - [yellow]部分到货[/yellow]：本周五承诺，已到部分")
        console.print("  7. PO20260607/08 - [blue]正常未到期[/blue]：有承诺未到交期")
        console.print("  8. PO20260609 - [magenta]远期无承诺[/magenta]：20天后的订单，还没要承诺")
        console.print()
        console.print("[bold]测试命令:[/bold]")
        console.print(
            f"  delivery-aligner analyze "
            f"-o {os.path.join(output_dir, '采购单示例.csv')} "
            f"-p {os.path.join(output_dir, '供应商承诺表示例.csv')} "
            f"-a {os.path.join(output_dir, '仓库到货表示例.csv')} "
            f"--detail"
        )

    except ImportError as e:
        console.print(f"[red]错误: 缺少依赖 {e}，请先运行: pip install -r requirements.txt[/red]")
        sys.exit(1)


if __name__ == "__main__":
    cli()
