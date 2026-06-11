import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import click
from tabulate import tabulate

from .database import init_db
from .config import (
    DEFAULT_DB_PATH,
    TEMPERATURE_NORMAL_RANGE,
    EXPIRY_WARNING_DAYS,
    TEMP_WINDOW_HOURS,
)
from .crud import (
    create_vaccine,
    get_all_vaccines,
    get_vaccine_by_id,
    create_batch,
    get_all_batches,
    get_batch_by_number,
    update_batch_status,
    update_batch_quantity,
    get_temperature_logs,
    get_all_abnormal_events,
    create_abnormal_event,
    update_abnormal_event,
    get_alerts,
    resolve_alert,
    resolve_all_alerts,
    get_batches_expiring_soon,
    get_abnormal_temperatures,
)
from .temperature_import import import_temperature_log
from .vaccination import record_vaccination
from .alerts import run_all_checks, format_alerts
from .traceability import get_trace_report
from .reports import get_monthly_report, format_monthly_report
from .query import (
    search_by_pet_name,
    search_by_batch_number,
    format_pet_search_results,
    format_batch_search_result,
)


class AppContext:
    def __init__(self, db_path: str):
        self.db_path = Path(db_path)


pass_app = click.make_pass_decorator(AppContext)


@click.group(help="🐾 兽医院疫苗冰箱记录管理系统")
@click.version_option(version="1.0.0", prog_name="vaccine-cli")
@click.option(
    "--db", "db_path",
    type=click.Path(),
    default=str(DEFAULT_DB_PATH),
    help="数据库文件路径",
    show_default=True,
)
@click.pass_context
def cli(ctx, db_path):
    ctx.obj = AppContext(db_path)


@cli.command(help="初始化数据库")
@click.confirmation_option(prompt="确认初始化数据库？这将删除所有现有数据！")
@pass_app
def init(app):
    path = app.db_path
    if path.exists():
        path.unlink()
    init_db(path)
    click.echo(f"✅ 数据库已初始化: {path}")


# -------------------- Vaccines --------------------

@cli.group(help="疫苗管理")
def vaccine():
    pass


@vaccine.command("add", help="添加疫苗种类")
@click.option("--name", required=True, help="疫苗名称")
@click.option("--species", required=True, help="适用动物种类（猫/狗/通用）")
@click.option("--min-temp", type=float, default=TEMPERATURE_NORMAL_RANGE[0], help="最低保存温度")
@click.option("--max-temp", type=float, default=TEMPERATURE_NORMAL_RANGE[1], help="最高保存温度")
@click.option("--shelf-life", type=int, default=12, help="保质期（月）")
@pass_app
def add_vaccine(app, name, species, min_temp, max_temp, shelf_life):
    vid = create_vaccine(name, species, min_temp, max_temp, shelf_life, app.db_path)
    click.echo(f"✅ 疫苗已添加: [{vid}] {name} ({species})")


@vaccine.command("list", help="列出所有疫苗")
@pass_app
def list_vaccines(app):
    vaccines = get_all_vaccines(app.db_path)
    if not vaccines:
        click.echo("暂无疫苗数据")
        return
    headers = ["ID", "名称", "适用动物", "温度范围", "保质期", "创建时间"]
    rows = [
        [v["id"], v["name"], v["species"], f"{v['min_temp']}-{v['max_temp']}°C",
         f"{v['shelf_life_months']}个月", v["created_at"]]
        for v in vaccines
    ]
    click.echo(tabulate(rows, headers=headers, tablefmt="simple"))


# -------------------- Batches --------------------

@cli.group(help="疫苗批号管理")
def batch():
    pass


@batch.command("add", help="登记新疫苗批号")
@click.option("--vaccine-id", type=int, required=True, help="疫苗ID")
@click.option("--batch-number", required=True, help="批号")
@click.option("--manufacture-date", required=True, help="生产日期 (YYYY-MM-DD)")
@click.option("--expiry-date", required=True, help="有效期 (YYYY-MM-DD)")
@click.option("--quantity", type=int, required=True, help="入库数量")
@click.option("--notes", help="备注")
@pass_app
def add_batch(app, vaccine_id, batch_number, manufacture_date, expiry_date, quantity, notes):
    vaccine = get_vaccine_by_id(vaccine_id, app.db_path)
    if not vaccine:
        click.echo(f"❌ 疫苗ID不存在: {vaccine_id}", err=True)
        sys.exit(1)

    existing = get_batch_by_number(batch_number, app.db_path)
    if existing:
        click.echo(f"❌ 批号已存在: {batch_number}", err=True)
        sys.exit(1)

    bid = create_batch(vaccine_id, batch_number, manufacture_date, expiry_date, quantity, notes, app.db_path)
    click.echo(f"✅ 批号已登记: [{bid}] {batch_number} ({vaccine['name']}) 入库 {quantity} 支")


@batch.command("list", help="列出所有批号")
@click.option("--status", help="按状态筛选 (normal/suspicious/quarantined/discarded/expired)")
@click.option("--expiring-soon", is_flag=True, help="只显示即将过期")
@pass_app
def list_batches(app, status, expiring_soon):
    if expiring_soon:
        batches = get_batches_expiring_soon(db_path=app.db_path)
    else:
        batches = get_all_batches(app.db_path)
        if status:
            batches = [b for b in batches if b["status"] == status]

    if not batches:
        click.echo("暂无批号数据")
        return

    headers = ["ID", "批号", "疫苗", "适用", "生产日", "有效期", "库存", "状态"]
    rows = [
        [b["id"], b["batch_number"], b["vaccine_name"], b["vaccine_species"],
         b["manufacture_date"], b["expiry_date"], b["current_quantity"], b["status"]]
        for b in batches
    ]
    click.echo(tabulate(rows, headers=headers, tablefmt="simple"))


@batch.command("status", help="更新批号状态")
@click.option("--batch-number", required=True, help="批号")
@click.option("--status", "new_status", required=True,
              type=click.Choice(["normal", "suspicious", "quarantined", "discarded", "expired"]),
              help="新状态")
@click.option("--notes", help="备注")
@pass_app
def update_status(app, batch_number, new_status, notes):
    batch = get_batch_by_number(batch_number, app.db_path)
    if not batch:
        click.echo(f"❌ 批号不存在: {batch_number}", err=True)
        sys.exit(1)

    update_batch_status(batch["id"], new_status, notes, app.db_path)
    click.echo(f"✅ 批号 [{batch_number}] 状态已更新为: {new_status}")


# -------------------- Temperature --------------------

@cli.group(help="温度记录管理")
def temperature():
    pass


@temperature.command("import", help="导入温度日志")
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--show-errors", is_flag=True, help="显示详细错误")
@pass_app
def import_temp(app, file_path, show_errors):
    try:
        result = import_temperature_log(file_path, app.db_path)
    except Exception as e:
        click.echo(f"❌ 导入失败: {e}", err=True)
        sys.exit(1)

    click.echo(f"✅ 导入完成")
    click.echo(f"  成功导入: {result['imported']} 条")
    click.echo(f"  跳过: {result['skipped']} 条")
    if result["missing_count"] > 0:
        click.echo(f"  其中缺失记录: {result['missing_count']} 条")
    if result["abnormal_count"] > 0:
        click.echo(f"  其中超温记录: {result['abnormal_count']} 条")

    if show_errors and result["errors"]:
        click.echo("\n错误详情:")
        for err in result["errors"][:20]:
            click.echo(f"  - {err}")
        if len(result["errors"]) > 20:
            click.echo(f"  ... 还有 {len(result['errors']) - 20} 条错误")


@temperature.command("list", help="查看温度记录")
@click.option("--hours", type=int, default=24, help="查看最近多少小时")
@click.option("--abnormal-only", is_flag=True, help="只显示异常记录")
@pass_app
def list_temperature(app, hours, abnormal_only):
    end_time = datetime.now()
    start_time = end_time - timedelta(hours=hours)

    if abnormal_only:
        logs = get_abnormal_temperatures(
            start_time=start_time.strftime("%Y-%m-%d %H:%M:%S"),
            end_time=end_time.strftime("%Y-%m-%d %H:%M:%S"),
            db_path=app.db_path
        )
    else:
        logs = get_temperature_logs(
            start_time=start_time.strftime("%Y-%m-%d %H:%M:%S"),
            end_time=end_time.strftime("%Y-%m-%d %H:%M:%S"),
            db_path=app.db_path
        )

    if not logs:
        click.echo("暂无温度记录")
        return

    headers = ["时间", "温度(°C)", "状态"]
    rows = []
    min_temp, max_temp = TEMPERATURE_NORMAL_RANGE
    for log in logs:
        if log["is_missing"]:
            status = "⚠️ 缺失"
        elif log["is_power_outage"]:
            status = "⚡ 停电"
        elif log["temperature"] is not None:
            if log["temperature"] < min_temp or log["temperature"] > max_temp:
                status = "🔴 超温"
            else:
                status = "✅ 正常"
        else:
            status = "❓ 未知"
        temp_display = f"{log['temperature']:.1f}" if log["temperature"] is not None else "-"
        rows.append([log["record_time"], temp_display, status])

    click.echo(tabulate(rows, headers=headers, tablefmt="simple"))


# -------------------- Vaccination --------------------

@cli.group(help="接种记录管理")
def vaccinate():
    pass


@vaccinate.command("add", help="记录新接种")
@click.option("--pet-name", required=True, help="宠物名称")
@click.option("--pet-species", required=True, help="宠物种类（猫/狗等）")
@click.option("--owner-name", required=True, help="主人姓名")
@click.option("--owner-phone", required=True, help="主人电话")
@click.option("--batch-number", required=True, help="疫苗批号")
@click.option("--date", "vaccination_date", required=True, help="接种日期 (YYYY-MM-DD)")
@click.option("--dose", type=int, required=True, help="剂次（第几次接种）")
@click.option("--admin", required=True, help="接种人")
@click.option("--breed", help="宠物品种")
@click.option("--age", type=int, help="宠物年龄")
@click.option("--notes", help="备注")
@click.option("--force", is_flag=True, help="强制记录（忽略重复、库存不足等警告）")
@pass_app
def add_vaccination(app, pet_name, pet_species, owner_name, owner_phone, batch_number,
                    vaccination_date, dose, admin, breed, age, notes, force):
    try:
        result = record_vaccination(
            pet_name=pet_name,
            pet_species=pet_species,
            owner_name=owner_name,
            owner_phone=owner_phone,
            batch_number=batch_number,
            vaccination_date=vaccination_date,
            dose_number=dose,
            administrator=admin,
            pet_breed=breed,
            pet_age=age,
            notes=notes,
            db_path=app.db_path,
            force=force,
        )
        click.echo(f"✅ 接种记录已保存 (ID: {result['record_id']})")
        click.echo(f"  宠物: {pet_name} ({pet_species})")
        click.echo(f"  疫苗: {result['vaccine_name']} [{batch_number}]")
        click.echo(f"  剂次: 第 {dose} 次")
        click.echo(f"  批号剩余库存: {result['new_quantity']} 支")
    except ValueError as e:
        click.echo(f"❌ {e}", err=True)
        sys.exit(1)


# -------------------- Abnormal Events --------------------

@cli.group(help="异常事件管理")
def event():
    pass


@event.command("add", help="标记异常事件（停电/超温等）")
@click.option("--type", "event_type", required=True,
              type=click.Choice(["power_outage", "temperature_excursion", "other"]),
              help="事件类型")
@click.option("--start", required=True, help="事件开始时间 (YYYY-MM-DD HH:MM:SS)")
@click.option("--end", help="事件结束时间 (YYYY-MM-DD HH:MM:SS)")
@click.option("--batch-ids", help="受影响批号ID或批号，多个用逗号分隔")
@click.option("--description", required=True, help="事件描述")
@click.option("--action", help="已采取措施")
@click.option("--status", default="open",
              type=click.Choice(["open", "in_progress", "resolved"]),
              help="事件状态")
@pass_app
def add_event(app, event_type, start, end, batch_ids, description, action, status):
    eid = create_abnormal_event(
        event_type=event_type,
        event_start=start,
        event_end=end,
        batch_ids=batch_ids,
        description=description,
        action_taken=action,
        status=status,
        db_path=app.db_path
    )
    click.echo(f"✅ 异常事件已记录 (ID: {eid})")

    type_names = {
        "power_outage": "停电",
        "temperature_excursion": "超温",
        "other": "其他",
    }
    click.echo(f"  类型: {type_names.get(event_type, event_type)}")
    click.echo(f"  时间: {start} ~ {end or '未结束'}")
    if batch_ids:
        click.echo(f"  受影响批号: {batch_ids}")


@event.command("list", help="列出异常事件")
@click.option("--status", help="按状态筛选 (open/in_progress/resolved)")
@pass_app
def list_events(app, status):
    events = get_all_abnormal_events(status, app.db_path)
    if not events:
        click.echo("暂无异常事件")
        return

    type_names = {
        "power_outage": "⚡ 停电",
        "temperature_excursion": "🌡️ 超温",
        "other": "❓ 其他",
    }
    status_names = {
        "open": "🔴 待处理",
        "in_progress": "🟡 处理中",
        "resolved": "✅ 已解决",
    }

    headers = ["ID", "类型", "状态", "开始时间", "结束时间", "描述"]
    rows = [
        [e["id"], type_names.get(e["event_type"], e["event_type"]),
         status_names.get(e["status"], e["status"]),
         e["event_start"], e["event_end"] or "-",
         (e["description"][:40] + "...") if len(e["description"]) > 40 else e["description"]]
        for e in events
    ]
    click.echo(tabulate(rows, headers=headers, tablefmt="simple"))


@event.command("resolve", help="处置并关闭异常事件")
@click.option("--event-id", type=int, required=True, help="事件ID")
@click.option("--action", required=True, help="处置措施")
@click.option("--end", help="事件结束时间")
@pass_app
def resolve_event(app, event_id, action, end):
    update_abnormal_event(
        event_id=event_id,
        action_taken=action,
        status="resolved",
        event_end=end,
        db_path=app.db_path
    )
    click.echo(f"✅ 事件 #{event_id} 已标记为已解决")
    click.echo(f"  处置措施: {action}")


# -------------------- Alerts --------------------

@cli.group(help="异常提醒管理")
def alert():
    pass


@alert.command("check", help="执行所有检查并生成提醒")
@click.option("--expiry-days", type=int, default=EXPIRY_WARNING_DAYS, help="过期预警天数")
@click.option("--temp-hours", type=int, default=TEMP_WINDOW_HOURS, help="温度检查窗口（小时）")
@pass_app
def check_alerts(app, expiry_days, temp_hours):
    result = run_all_checks(
        db_path=app.db_path,
        expiry_days=expiry_days,
        temp_hours=temp_hours
    )

    click.echo("🔍 系统检查结果")
    click.echo(f"  新发现问题: {result['total_new']} 个")
    click.echo(f"  未解决提醒: {result['total_unresolved']} 个")

    if result["new_alerts"]:
        click.echo("\n📢 新发现:")
        click.echo(format_alerts(result["new_alerts"]))

    if result["unresolved_alerts"] and not result["new_alerts"]:
        click.echo("\n📢 未解决提醒:")
        click.echo(format_alerts(result["unresolved_alerts"]))


@alert.command("list", help="列出所有提醒")
@click.option("--all", "include_resolved", is_flag=True, help="包含已解决的")
@pass_app
def list_alerts(app, include_resolved):
    alerts = get_alerts(include_resolved=include_resolved, db_path=app.db_path)
    if not alerts:
        click.echo("✅ 没有提醒")
        return

    severity_map = {"high": "🔴 高", "medium": "🟡 中", "warning": "🟠 警告", "low": "🟢 低"}
    type_names = {
        "batch_expiring": "批号即将过期",
        "negative_inventory": "负库存",
        "temperature_missing": "温度记录缺失",
        "temperature_abnormal": "温度异常",
        "batch_temperature_risk": "批号温度风险",
        "duplicate_vaccination": "重复接种",
        "abnormal_batch_used": "使用异常批号",
    }

    headers = ["ID", "类型", "严重性", "状态", "创建时间", "消息"]
    rows = [
        [a["id"],
         type_names.get(a["alert_type"], a["alert_type"]),
         severity_map.get(a["severity"], a["severity"]),
         "✅" if a["is_resolved"] else "🔴",
         a["created_at"],
         (a["message"][:50] + "...") if len(a["message"]) > 50 else a["message"]]
        for a in alerts
    ]
    click.echo(tabulate(rows, headers=headers, tablefmt="simple"))


@alert.command("resolve", help="标记提醒为已解决")
@click.option("--alert-id", type=int, help="指定提醒ID")
@click.option("--all", "resolve_all", is_flag=True, help="解决所有提醒")
@pass_app
def resolve_alerts(app, alert_id, resolve_all):
    if resolve_all:
        resolve_all_alerts(app.db_path)
        click.echo("✅ 所有提醒已标记为已解决")
    elif alert_id:
        resolve_alert(alert_id, app.db_path)
        click.echo(f"✅ 提醒 #{alert_id} 已标记为已解决")
    else:
        click.echo("❌ 请指定 --alert-id 或 --all", err=True)
        sys.exit(1)


# -------------------- Trace --------------------

@cli.group(help="追溯查询")
def trace():
    pass


@trace.command("batch", help="按批号追溯受影响的宠物")
@click.option("--batch-number", required=True, help="疫苗批号")
@pass_app
def trace_batch(app, batch_number):
    try:
        report = get_trace_report(batch_number=batch_number, db_path=app.db_path)
        click.echo(report)
    except ValueError as e:
        click.echo(f"❌ {e}", err=True)
        sys.exit(1)


@trace.command("event", help="按事件追溯受影响的批号和宠物")
@click.option("--event-id", type=int, required=True, help="异常事件ID")
@pass_app
def trace_event(app, event_id):
    try:
        report = get_trace_report(event_id=event_id, db_path=app.db_path)
        click.echo(report)
    except ValueError as e:
        click.echo(f"❌ {e}", err=True)
        sys.exit(1)


# -------------------- Search --------------------

@cli.group(help="快速查询")
def search():
    pass


@search.command("pet", help="按宠物名查询")
@click.argument("name")
@pass_app
def search_pet(app, name):
    results = search_by_pet_name(name, app.db_path)
    click.echo(format_pet_search_results(results))


@search.command("batch", help="按批号查询")
@click.argument("batch_number")
@pass_app
def search_batch(app, batch_number):
    result = search_by_batch_number(batch_number, app.db_path)
    click.echo(format_batch_search_result(result))


# -------------------- Report --------------------

@cli.command(help="生成院长月报")
@click.option("--year", type=int, help="年份 (默认: 当前年)")
@click.option("--month", type=int, help="月份 (默认: 当前月)")
@click.option("--output", type=click.Path(), help="输出到文件")
@pass_app
def report(app, year, month, output):
    data = get_monthly_report(year, month, app.db_path)
    report_text = format_monthly_report(data)

    if output:
        with open(output, "w", encoding="utf-8") as f:
            f.write(report_text)
        click.echo(f"✅ 报告已保存到: {output}")
    else:
        click.echo(report_text)


if __name__ == "__main__":
    cli()
