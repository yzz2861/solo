from __future__ import annotations

import json
import sys
from pathlib import Path

import click

from fuel_recon.exporter import export_audit_report, export_pending_list, export_reimburse_summary
from fuel_recon.importer import DataStore
from fuel_recon.models import AnomalyType
from fuel_recon.reconciler import Reconciler


@click.group()
@click.option(
    "--store-dir",
    default=".fuel_recon_store",
    envvar="FUEL_RECON_STORE",
    help="数据存储目录",
)
@click.pass_context
def main(ctx, store_dir):
    """车队油卡流水核对 CLI

    导入油卡流水、司机排班和里程表，自动核对并标出异常。
    """
    ctx.ensure_object(dict)
    ctx.obj["store_dir"] = store_dir


@main.command("import")
@click.argument("file_path", type=click.Path(exists=True))
@click.option(
    "--type",
    "data_type",
    type=click.Choice(["fuel", "shift", "mileage"]),
    required=True,
    help="数据类型: fuel=油卡流水, shift=司机排班, mileage=里程表",
)
@click.pass_context
def import_data(ctx, file_path, data_type):
    """导入数据文件（CSV 或 Excel）

    支持重复导入同一流水，系统自动去重不会累加。
    """
    store = DataStore(ctx.obj["store_dir"])
    if data_type == "fuel":
        new_count, dup_count = store.import_transactions(file_path)
        click.echo(f"油卡流水导入完成: 新增 {new_count} 条, 重复跳过 {dup_count} 条")
    elif data_type == "shift":
        count = store.import_shifts(file_path)
        click.echo(f"司机排班导入完成: {count} 条")
    elif data_type == "mileage":
        count = store.import_mileages(file_path)
        click.echo(f"里程表导入完成: {count} 条")


@main.command("reconcile")
@click.option(
    "--fuel-efficiency",
    default=30.0,
    help="百公里油耗(L/100km), 默认30",
)
@click.option(
    "--volume-excess-multiplier",
    default=2.0,
    help="油量超常倍数阈值, 默认2.0",
)
@click.option(
    "--duplicate-window",
    default=60,
    help="疑似重复时间窗口(分钟), 默认60",
)
@click.pass_context
def reconcile(ctx, fuel_efficiency, volume_excess_multiplier, duplicate_window):
    """执行核对，检测异常

    检测异地加油、油量超常、里程不支持、疑似重复、
    车牌错一位、临时换车、夜间跨天加油等异常。
    """
    store = DataStore(ctx.obj["store_dir"])
    if not store.transactions:
        click.echo("尚未导入油卡流水，请先执行 import --type fuel")
        sys.exit(1)

    config = {
        "fuel_efficiency": fuel_efficiency,
        "volume_excess_multiplier": volume_excess_multiplier,
        "duplicate_window_minutes": duplicate_window,
    }
    reconciler = Reconciler(store, config)
    result = reconciler.reconcile()

    click.echo(f"\n===== 核对结果 =====")
    click.echo(f"总流水笔数: {result.total_transactions}")
    click.echo(f"异常笔数: {result.anomaly_count}")

    by_type = result.anomalies_by_type()
    if by_type:
        click.echo("\n异常分类:")
        for atype, anomalies in by_type.items():
            click.echo(f"  {atype.value}: {len(anomalies)} 笔")

    classified = reconciler.classify_reimburse(result)
    click.echo(f"\n报销分类:")
    for status, items in classified.items():
        click.echo(f"  {status.value}: {len(items)} 笔")

    result_data = {
        "total_transactions": result.total_transactions,
        "anomaly_count": result.anomaly_count,
        "anomalies_by_type": {
            k.value: len(v) for k, v in by_type.items()
        },
        "reimburse_summary": {
            k.value: len(v) for k, v in classified.items()
        },
    }
    result_path = Path(ctx.obj["store_dir"]) / "last_reconcile.json"
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
    click.echo(f"\n核对结果已保存至 {result_path}")


@main.command("export")
@click.option(
    "--format",
    "export_format",
    type=click.Choice(["pending", "reimburse", "audit"]),
    required=True,
    help="导出格式: pending=待解释清单, reimburse=可报销汇总, audit=审计报告",
)
@click.option(
    "--output",
    default=None,
    help="输出文件路径(默认自动生成)",
)
@click.pass_context
def export(ctx, export_format, output):
    """导出核对结果

    pending: 待解释清单（含不可报销项）
    reimburse: 可报销汇总（含税额拆分）
    audit: 审计报告（票据+里程+排班一体化）
    """
    store = DataStore(ctx.obj["store_dir"])
    if not store.transactions:
        click.echo("尚未导入油卡流水，请先执行 import --type fuel")
        sys.exit(1)

    config = {}
    config_path = Path(ctx.obj["store_dir"]) / "config.json"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

    reconciler = Reconciler(store, config)
    result = reconciler.reconcile()

    if output is None:
        from datetime import datetime
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)
        if export_format == "pending":
            output = str(output_dir / f"待解释清单_{ts}.csv")
        elif export_format == "reimburse":
            output = str(output_dir / f"可报销汇总_{ts}.csv")
        else:
            output = str(output_dir / f"审计报告_{ts}.csv")

    if export_format == "pending":
        export_pending_list(result, reconciler, output)
        click.echo(f"待解释清单已导出至: {output}")
    elif export_format == "reimburse":
        export_reimburse_summary(result, reconciler, output)
        click.echo(f"可报销汇总已导出至: {output}")
    elif export_format == "audit":
        export_audit_report(result, reconciler, output)
        click.echo(f"审计报告已导出至: {output}")


@main.command("status")
@click.pass_context
def status_cmd(ctx):
    """查看当前数据状态"""
    store = DataStore(ctx.obj["store_dir"])
    click.echo(f"油卡流水: {len(store.transactions)} 条")
    click.echo(f"司机排班: {len(store.shifts)} 条")
    click.echo(f"里程记录: {len(store.mileages)} 条")

    if store.transactions:
        plates = set(t.plate_number for t in store.transactions)
        drivers = set(t.driver_name for t in store.transactions)
        total_amount = sum(t.amount_with_tax for t in store.transactions)
        click.echo(f"涉及车牌: {', '.join(sorted(plates))}")
        click.echo(f"涉及司机: {', '.join(sorted(drivers))}")
        click.echo(f"含税总金额: {total_amount:.2f}")


@main.command("config")
@click.option("--fuel-efficiency", type=float, help="百公里油耗(L/100km)")
@click.option("--volume-excess-multiplier", type=float, help="油量超常倍数阈值")
@click.option("--duplicate-window", type=int, help="疑似重复时间窗口(分钟)")
@click.pass_context
def config_cmd(ctx, fuel_efficiency, volume_excess_multiplier, duplicate_window):
    """查看或修改核对参数"""
    config_path = Path(ctx.obj["store_dir"]) / "config.json"
    config = {}
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

    changed = False
    if fuel_efficiency is not None:
        config["fuel_efficiency"] = fuel_efficiency
        changed = True
    if volume_excess_multiplier is not None:
        config["volume_excess_multiplier"] = volume_excess_multiplier
        changed = True
    if duplicate_window is not None:
        config["duplicate_window_minutes"] = duplicate_window
        changed = True

    if changed:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        click.echo("配置已更新")

    click.echo("当前配置:")
    click.echo(f"  百公里油耗: {config.get('fuel_efficiency', 30.0)} L/100km")
    click.echo(f"  油量超常倍数: {config.get('volume_excess_multiplier', 2.0)}")
    click.echo(f"  疑似重复窗口: {config.get('duplicate_window_minutes', 60)} 分钟")


if __name__ == "__main__":
    main()
