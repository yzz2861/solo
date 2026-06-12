import os
import sys

import click

from . import __version__
from .allocation_engine import AllocationEngine
from .anomaly_detector import detect_anomalies, apply_anomalies_to_bills, mark_disputed_shops
from .bill_number import assign_bill_numbers
from .exporter import (
    export_all_explanations,
    export_bill_explain,
    export_internal_report,
    export_shop_bills,
)
from .importer import (
    import_allocation_rules,
    import_disputed_shops,
    import_readings,
    import_shop_areas,
    validate_import_data,
)
from .models import MeterType
from .sample_data import generate_sample_data


@click.group()
@click.version_option(__version__, prog_name="energy-alloc")
def cli():
    """店铺能耗分摊账 - 商场水电费分摊计算工具"""
    pass


@cli.command()
@click.option("--output-dir", "-o", default="./sample_data", help="示例数据输出目录")
@click.option("--billing-month", "-m", default="2024-06", help="账期月份，格式 YYYY-MM")
def init_sample(output_dir, billing_month):
    """生成示例数据"""
    click.echo(f"生成示例数据到 {output_dir} ...")
    files = generate_sample_data(output_dir, billing_month)
    click.echo("已生成以下文件:")
    for name, path in files.items():
        click.echo(f"  {name}: {path}")
    click.echo("\n示例数据包含:")
    click.echo("  - 9家店铺（含撤场店、零面积店）")
    click.echo("  - 电表和水表读数（含读数倒挂、缺上月数等异常场景）")
    click.echo("  - 公摊规则（电1.2元/度，水4.5元/吨，公摊15%）")
    click.echo("  - 争议店铺清单")
    click.echo(f"\n下一步可运行: energy-alloc calculate -r {output_dir}/读数表.xlsx "
               f"-s {output_dir}/店铺面积表.xlsx -l {output_dir}/公摊规则.xlsx -m {billing_month}")


@cli.command()
@click.option("--readings", "-r", required=True, help="读数表文件路径 (Excel/CSV)")
@click.option("--shops", "-s", required=True, help="店铺面积表文件路径 (Excel/CSV)")
@click.option("--rules", "-l", required=True, help="公摊规则文件路径 (Excel/CSV)")
@click.option("--billing-month", "-m", required=True, help="账期月份，格式 YYYY-MM")
@click.option("--output-dir", "-o", default="./output", help="输出目录")
@click.option("--disputed", "-d", default=None, help="争议店铺清单文件")
@click.option("--sequential/--hash", default=True, help="账单编号方式：顺序号/哈希号")
@click.option("--explain-all", is_flag=True, help="同时生成所有店铺的费用解释单")
def calculate(readings, shops, rules, billing_month, output_dir, disputed, sequential, explain_all):
    """计算水电费分摊并生成账单"""
    click.echo(f"{'='*60}")
    click.echo(f"店铺能耗分摊账 - 费用计算")
    click.echo(f"{'='*60}")
    click.echo(f"账期: {billing_month}")
    click.echo(f"读数表: {readings}")
    click.echo(f"面积表: {shops}")
    click.echo(f"规则表: {rules}")
    click.echo(f"")

    try:
        reading_list = import_readings(readings)
        shop_list = import_shop_areas(shops)
        rule_list = import_allocation_rules(rules)
    except Exception as e:
        click.echo(f"❌ 导入数据失败: {e}", err=True)
        sys.exit(1)

    click.echo(f"✓ 导入读数记录: {len(reading_list)} 条")
    click.echo(f"✓ 导入店铺信息: {len(shop_list)} 家")
    click.echo(f"✓ 导入分摊规则: {len(rule_list)} 条")

    errors, warnings = validate_import_data(reading_list, shop_list, rule_list)
    if errors:
        click.echo(f"\n❌ 数据验证错误:")
        for err in errors:
            click.echo(f"  - {err}")
        sys.exit(1)

    if warnings:
        click.echo(f"\n⚠️  数据警告:")
        for warn in warnings:
            click.echo(f"  - {warn}")

    click.echo(f"\n🔍 异常检测中...")
    anomalies_by_shop, anomaly_details = detect_anomalies(reading_list, shop_list, billing_month)

    anomaly_count = len([s for s, a in anomalies_by_shop.items() if a])
    click.echo(f"✓ 发现异常店铺: {anomaly_count} 家")
    click.echo(f"✓ 异常项数: {len(anomaly_details)} 项")

    if anomaly_details:
        click.echo(f"\n异常清单:")
        for a in anomaly_details[:10]:
            click.echo(f"  [{a.get('shop_id', '?')}] {a.get('description', '')}")
        if len(anomaly_details) > 10:
            click.echo(f"  ... 还有 {len(anomaly_details) - 10} 条异常")

    click.echo(f"\n⚙️  费用分摊计算中...")
    engine = AllocationEngine(reading_list, shop_list, rule_list, billing_month)
    result = engine.allocate()
    result.anomalies = anomaly_details

    apply_anomalies_to_bills(result.bills, anomalies_by_shop)

    if disputed and os.path.exists(disputed):
        disputed_ids = import_disputed_shops(disputed)
        mark_disputed_shops(result.bills, disputed_ids)
        disputed_count = len([b for b in result.bills if b.status.value == "disputed"])
        click.echo(f"✓ 标注争议店铺: {len(disputed_ids)} 家（{disputed_count} 笔账单）")

    assign_bill_numbers(result.bills, billing_month, use_sequential=sequential)

    electric_bills = [b for b in result.bills if b.meter_type == MeterType.ELECTRIC]
    water_bills = [b for b in result.bills if b.meter_type == MeterType.WATER]

    click.echo(f"\n📊 计算结果汇总:")
    click.echo(f"  电费账单: {len(electric_bills)} 笔，合计 {result.total_billed_amount.get(MeterType.ELECTRIC, 0):.2f} 元")
    click.echo(f"  水费账单: {len(water_bills)} 笔，合计 {result.total_billed_amount.get(MeterType.WATER, 0):.2f} 元")
    click.echo(f"  异常账单: {len([b for b in result.bills if b.anomalies])} 笔")
    click.echo(f"  争议账单: {len([b for b in result.bills if b.status.value == 'disputed'])} 笔")

    click.echo(f"\n📁 导出账单到 {output_dir} ...")
    os.makedirs(output_dir, exist_ok=True)

    shop_files = export_shop_bills(result, output_dir, format="excel")
    for f in shop_files:
        click.echo(f"  ✓ 商户账单: {f}")

    report_path = export_internal_report(result, output_dir)
    click.echo(f"  ✓ 内部报告: {report_path}")

    if explain_all:
        explain_dir = os.path.join(output_dir, "解释单")
        explain_files = export_all_explanations(result, explain_dir)
        click.echo(f"  ✓ 费用解释单: {len(explain_files)} 份，位于 {explain_dir}/")

    click.echo(f"\n{'='*60}")
    click.echo(f"✅ 计算完成！所有文件已导出到 {output_dir}")
    click.echo(f"{'='*60}")


@cli.command()
@click.option("--readings", "-r", required=True, help="读数表文件路径")
@click.option("--shops", "-s", required=True, help="店铺面积表文件路径")
@click.option("--rules", "-l", required=True, help="公摊规则文件路径")
@click.option("--billing-month", "-m", required=True, help="账期月份，格式 YYYY-MM")
@click.option("--shop-id", required=True, help="店铺编号")
@click.option("--meter-type", type=click.Choice(["electric", "water"]), default="electric", help="费用类型")
@click.option("--output", "-o", default=None, help="输出文件路径")
def explain(readings, shops, rules, billing_month, shop_id, meter_type, output):
    """生成单个店铺的费用解释单"""
    try:
        reading_list = import_readings(readings)
        shop_list = import_shop_areas(shops)
        rule_list = import_allocation_rules(rules)
    except Exception as e:
        click.echo(f"❌ 导入数据失败: {e}", err=True)
        sys.exit(1)

    engine = AllocationEngine(reading_list, shop_list, rule_list, billing_month)
    result = engine.allocate()

    anomalies_by_shop, _ = detect_anomalies(reading_list, shop_list, billing_month)
    apply_anomalies_to_bills(result.bills, anomalies_by_shop)
    assign_bill_numbers(result.bills, billing_month)

    mt = MeterType.ELECTRIC if meter_type == "electric" else MeterType.WATER
    bill = result.get_bill(shop_id, mt)

    if not bill:
        click.echo(f"❌ 未找到店铺 {shop_id} 的{('电费' if mt == MeterType.ELECTRIC else '水费')}账单", err=True)
        sys.exit(1)

    if output:
        export_bill_explain(bill, output)
        click.echo(f"✓ 解释单已保存到: {output}")
    else:
        type_name = "电费" if bill.meter_type == MeterType.ELECTRIC else "水费"
        click.echo(f"\n{'='*50}")
        click.echo(f"店铺能耗账单解释单")
        click.echo(f"{'='*50}")
        click.echo(f"账单编号: {bill.bill_no}")
        click.echo(f"店铺: {bill.shop_name} ({bill.shop_id})")
        click.echo(f"费用类型: {type_name}")
        click.echo(f"总金额: {bill.total_amount:.2f} 元")
        click.echo(f"{'-'*50}")

        for i, item in enumerate(bill.items, 1):
            click.echo(f"\n【{i}】{item.item_name}")
            click.echo(f"    金额: {item.amount:.2f} 元")
            if item.quantity is not None:
                unit = "度" if bill.meter_type == MeterType.ELECTRIC else "吨"
                click.echo(f"    用量: {item.quantity:.4f} {unit}")
            if item.unit_price is not None:
                unit = "元/度" if bill.meter_type == MeterType.ELECTRIC else "元/吨"
                click.echo(f"    单价: {item.unit_price:.4f} {unit}")
            if item.formula:
                click.echo(f"    计算方式: {item.formula}")

        if bill.anomalies:
            click.echo(f"\n⚠️  异常提示:")
            for a in bill.anomalies:
                click.echo(f"  - {a.value}")

        click.echo(f"\n{'='*50}")


@cli.command()
@click.option("--readings", "-r", required=True, help="读数表文件路径")
@click.option("--shops", "-s", required=True, help="店铺面积表文件路径")
@click.option("--billing-month", "-m", required=True, help="账期月份")
@click.option("--output", "-o", default=None, help="输出文件路径")
def check_anomalies(readings, shops, billing_month, output):
    """检查数据异常"""
    try:
        reading_list = import_readings(readings)
        shop_list = import_shop_areas(shops)
    except Exception as e:
        click.echo(f"❌ 导入数据失败: {e}", err=True)
        sys.exit(1)

    click.echo(f"🔍 检查账期 {billing_month} 的数据异常...\n")

    anomalies_by_shop, anomaly_details = detect_anomalies(reading_list, shop_list, billing_month)

    if not anomaly_details:
        click.echo("✅ 未发现异常")
        return

    click.echo(f"⚠️  发现 {len(anomaly_details)} 项异常:\n")
    for i, a in enumerate(anomaly_details, 1):
        click.echo(f"{i}. [{a.get('shop_id', '?')}] {a.get('shop_name', '')}")
        click.echo(f"   类型: {a.get('anomaly_type', '')}")
        click.echo(f"   说明: {a.get('description', '')}")
        click.echo()

    if output:
        import pandas as pd
        os.makedirs(os.path.dirname(output) if os.path.dirname(output) else ".", exist_ok=True)
        pd.DataFrame(anomaly_details).to_excel(output, index=False)
        click.echo(f"✓ 异常清单已导出到: {output}")


if __name__ == "__main__":
    cli()
