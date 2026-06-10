"""水务抢修审计 CLI 入口"""
import click
import os

from .importer import import_all, SOURCE_REPAIR, SOURCE_OUTAGE, SOURCE_SMS
from .analysis import (
    get_audit_stats,
    get_missing_receipt_communities,
    get_missing_phone_sms,
    get_late_notifications,
)
from .exporter import (
    export_report_csv,
    export_report_json,
    get_import_history,
    export_missing_receipt_csv,
)
from .database import init_db, get_db_path


DEFAULT_DB = "water_repair.db"


@click.group()
@click.option("--db", "db_path", default=None,
              help=f"数据库文件路径，默认当前目录 {DEFAULT_DB}")
@click.pass_context
def cli(ctx, db_path):
    """水务抢修单审计工具：串联派单、停水通知、短信回执与复核"""
    ctx.ensure_object(dict)
    ctx.obj["db_path"] = db_path or os.path.join(os.getcwd(), DEFAULT_DB)
    init_db(ctx.obj["db_path"])


@cli.command(name="import")
@click.option("--repair", "repair_csv", type=click.Path(exists=True),
              help="抢修单 CSV 文件路径")
@click.option("--outage", "outage_json", type=click.Path(exists=True),
              help="停水范围 JSON 文件路径")
@click.option("--sms", "sms_csv", type=click.Path(exists=True),
              help="短信回执 CSV 文件路径")
@click.pass_context
def import_cmd(ctx, repair_csv, outage_json, sms_csv):
    """导入抢修单、停水范围、短信回执数据（去重）"""
    if not any([repair_csv, outage_json, sms_csv]):
        click.echo("请至少指定一种数据源：--repair / --outage / --sms")
        return

    results = import_all(repair_csv, outage_json, sms_csv, ctx.obj["db_path"])

    click.echo("=" * 50)
    click.echo("导入结果：")
    click.echo("-" * 50)

    label_map = {
        SOURCE_REPAIR: "抢修单",
        SOURCE_OUTAGE: "停水范围",
        SOURCE_SMS: "短信回执",
    }

    for key, info in results.items():
        label = label_map.get(key, key)
        if info["is_new"]:
            click.echo(f"  ✓ {label}: 新增 {info['count']} 条 "
                       f"(文件: {info['file']})")
        else:
            click.echo(f"  ⊘ {label}: 已导入过，跳过 "
                       f"(文件: {info['file']})")

    click.echo("=" * 50)
    click.echo(f"数据库: {get_db_path(ctx.obj['db_path'])}")


@cli.command()
@click.option("--verbose", "-v", is_flag=True, help="显示详细问题清单")
@click.option("--order-no", "order_no", default=None, help="指定抢修单号查询")
@click.pass_context
def audit(ctx, verbose, order_no):
    """整体审计统计：派单、通知、回执、复核状态总览"""
    stats = get_audit_stats(ctx.obj["db_path"])

    if order_no:
        order = next((o for o in stats["orders"] if o["order_no"] == order_no), None)
        if not order:
            click.echo(f"未找到抢修单号: {order_no}")
            return
        _print_order_detail(order)
        return

    click.echo("=" * 60)
    click.echo("            水务抢修审计总览")
    click.echo("=" * 60)
    click.echo(f"  总工单数:          {stats['total_orders']}")
    click.echo(f"  停水小区总数:      {stats['total_communities']}")
    click.echo(f"  全部正常工单:      {stats['fully_ok_orders']}")
    click.echo(f"  存在问题工单:      {stats['orders_with_issues']}")
    click.echo("-" * 60)
    click.echo(f"  无回执小区数:      {stats['total_missing_receipt']}")
    click.echo(f"  手机号缺失回执:    {stats['total_missing_phone']}")
    click.echo(f"  通知晚于停水:      {stats['total_late_notification']}")
    click.echo("=" * 60)

    if verbose and stats["orders_with_issues_list"]:
        click.echo()
        click.echo("问题工单明细：")
        click.echo("-" * 60)
        for order in stats["orders_with_issues_list"]:
            _print_order_summary(order)
            click.echo()


def _print_order_summary(order):
    click.echo(f"【{order['order_no']}】 {order['fault_address']}")
    click.echo(f"  状态: {order['order_status']}  |  "
               f"小区: {order['communities_count']}  |  "
               f"班组: {order['repair_team']}")

    issues = []
    if order["missing_receipt_count"] > 0:
        issues.append(f"无回执 {order['missing_receipt_count']} 个")
    if order["missing_phone_count"] > 0:
        issues.append(f"缺手机号 {order['missing_phone_count']} 个")
    if order["late_notification_count"] > 0:
        issues.append(f"通知晚 {order['late_notification_count']} 个")

    if issues:
        click.echo(f"  问题: {' | '.join(issues)}")
        for comm in order["missing_receipt"]:
            click.echo(f"    - 无回执: {comm['community_name']} "
                       f"(停水行号: {comm['outage_source_row']})")


def _print_order_detail(order):
    click.echo("=" * 60)
    click.echo(f"抢修单: {order['order_no']}")
    click.echo("=" * 60)
    click.echo(f"  类型: {order['order_type']}")
    click.echo(f"  地址: {order['fault_address']}")
    click.echo(f"  报修时间: {order['report_time']}")
    click.echo(f"  派单时间: {order['dispatch_time']}")
    click.echo(f"  抢修班组: {order['repair_team']}")
    click.echo(f"  工单状态: {order['order_status']}")
    click.echo(f"  原始行号: {order['order_source_row']}")
    click.echo(f"  停水小区: {order['communities_count']} 个")
    click.echo()

    click.echo("小区明细：")
    click.echo("-" * 60)
    for i, comm in enumerate(order["communities"], 1):
        status_tag = "✓ 正常"
        issues = []
        if not comm["has_valid_receipt"]:
            status_tag = "✗ 无回执"
            issues.append("无有效回执")
        if comm["has_missing_phone"]:
            issues.append("手机号缺失")
        if comm["is_late_notification"]:
            issues.append("通知晚于停水")
        if issues:
            status_tag = "✗ " + "、".join(issues)

        click.echo(f"  {i}. {comm['community_name']}  "
                   f"[{status_tag}]")
        click.echo(f"     楼栋: {comm['building_no'] or '-'}  "
                   f"停水: {comm['outage_start_time']} ~ "
                   f"{comm['outage_end_time']}")
        click.echo(f"     回执数: {comm['sms_count']}  "
                   f"停水行号: {comm['outage_source_row']}")
        if comm["is_late_notification"] and comm["late_detail"]:
            click.echo(f"     通知时间: {comm['late_detail']['send_time']} "
                       f"(晚于停水 {comm['late_detail']['outage_start']})")
        if not comm["has_valid_receipt"]:
            click.echo(f"     漏通知说明: 该小区停水范围已登记，"
                       f"但短信回执中无有效记录，请补录或核实")


@cli.group()
@click.pass_context
def review(ctx):
    """异常查询：无回执 / 缺手机号 / 通知晚"""
    pass


@review.command("missing-receipt")
@click.option("--export", "export_file", default=None,
              type=click.Path(), help="导出为 CSV 文件")
@click.pass_context
def review_missing_receipt(ctx, export_file):
    """查询停水范围无短信回执的小区"""
    items = get_missing_receipt_communities(ctx.obj["db_path"])

    click.echo(f"停水范围无回执的小区: 共 {len(items)} 个")
    click.echo("=" * 60)

    if not items:
        click.echo("  (全部正常)")
        return

    for i, item in enumerate(items, 1):
        click.echo(f"  {i}. [{item['order_no']}] {item['community_name']}"
                   f"  (停水行号: {item['outage_source_row']})")
        click.echo(f"     停水开始: {item['outage_start_time']}")
        click.echo(f"     原因: {item['reason']}")

    if export_file:
        n = export_missing_receipt_csv(export_file, ctx.obj["db_path"])
        click.echo()
        click.echo(f"已导出 {n} 条记录到: {export_file}")


@review.command("missing-phone")
@click.pass_context
def review_missing_phone(ctx):
    """查询回执手机号缺失的记录"""
    items = get_missing_phone_sms(ctx.obj["db_path"])

    click.echo(f"手机号缺失的回执记录: 共 {len(items)} 条")
    click.echo("=" * 60)

    if not items:
        click.echo("  (全部正常)")
        return

    for i, item in enumerate(items, 1):
        click.echo(f"  {i}. [{item.get('order_no', 'N/A')}] "
                   f"{item.get('community_name', 'N/A')}"
                   f"  (回执行号: {item['source_row']})")
        click.echo(f"     发送时间: {item['send_time']}  "
                   f"状态: {item['status']}")
        if item["fail_reason"]:
            click.echo(f"     失败原因: {item['fail_reason']}")


@review.command("late-notification")
@click.pass_context
def review_late(ctx):
    """查询通知时间晚于停水时间的记录"""
    items = get_late_notifications(ctx.obj["db_path"])

    click.echo(f"通知晚于停水的记录: 共 {len(items)} 条")
    click.echo("=" * 60)

    if not items:
        click.echo("  (全部正常)")
        return

    for i, item in enumerate(items, 1):
        click.echo(f"  {i}. [{item['order_no']}] {item['community_name']}")
        click.echo(f"     手机号: {item['phone_number']}")
        click.echo(f"     停水开始: {item['outage_start_time']}")
        click.echo(f"     通知时间: {item['send_time']}  ← 晚于停水")
        click.echo(f"     (停水行号: {item['outage_source_row']}, "
                   f"回执行号: {item['sms_source_row']})")


@cli.command()
@click.option("--format", "fmt", type=click.Choice(["csv", "json"]),
              default="csv", help="导出格式，默认 csv")
@click.option("--output", "-o", "output_path", required=True,
              type=click.Path(), help="输出文件路径")
@click.pass_context
def export(ctx, fmt, output_path):
    """导出审计报告（保留原始行号和漏通知说明）"""
    if fmt == "csv":
        n = export_report_csv(output_path, ctx.obj["db_path"])
    else:
        n = export_report_json(output_path, ctx.obj["db_path"])

    click.echo(f"✓ 已导出 {n} 条记录到: {output_path}")
    click.echo(f"  格式: {fmt.upper()}")
    click.echo(f"  包含字段: 原始行号、漏通知说明 等")


@cli.command("history")
@click.pass_context
def import_history(ctx):
    """查看导入历史记录"""
    history = get_import_history(ctx.obj["db_path"])

    click.echo(f"导入历史记录: 共 {len(history)} 批")
    click.echo("=" * 60)

    if not history:
        click.echo("  (暂无导入记录)")
        return

    label_map = {
        SOURCE_REPAIR: "抢修单",
        SOURCE_OUTAGE: "停水范围",
        SOURCE_SMS: "短信回执",
    }

    for i, h in enumerate(history, 1):
        label = label_map.get(h["source_type"], h["source_type"])
        click.echo(f"  {i}. [{h['imported_at']}] {label} "
                   f"- {h['source_file']}")
        click.echo(f"     记录数: {h['record_count']}  "
                   f"哈希: {h['batch_hash'][:8]}...")


if __name__ == "__main__":
    cli()
