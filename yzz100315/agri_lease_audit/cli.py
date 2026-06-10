import click
import sys
from .storage import init_db, get_db, FUEL_CONSUMPTION_THRESHOLD
from .importer import import_lease_out_csv, import_fuel_json, import_return_check_csv
from .auditor import (
    audit_all,
    audit_equipment,
    get_import_history,
    get_all_equipment_ids,
    compute_fuel_stats,
    check_fuel_abnormal,
    check_hours_inverted,
    check_inspector_inconsistency,
)
from .reviewer import add_review, get_reviews, get_review_summary, get_pending_reviews
from .exporter import export_report_csv, export_detailed_json, export_anomaly_detail_csv


def _print_table(headers, rows):
    if not rows:
        click.echo("无数据")
        return

    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            col_widths[i] = max(col_widths[i], len(str(cell)))

    def format_row(cells):
        return " | ".join(str(cell).ljust(col_widths[i]) for i, cell in enumerate(cells))

    click.echo(format_row(headers))
    click.echo("-+-".join("-" * w for w in col_widths))
    for row in rows:
        click.echo(format_row(row))


@click.group()
def cli():
    init_db()


@cli.group()
def import_cmd():
    pass


@import_cmd.command("lease")
@click.argument('filepath', type=click.Path(exists=True))
def import_lease(filepath):
    result = import_lease_out_csv(filepath)
    if result.get("skipped"):
        click.echo(f"⏭  跳过: {result['reason']} (批次ID: {result['batch_id']})")
    else:
        click.echo(f"✅ 导入成功: {result['source_file']}")
        click.echo(f"   总记录: {result['total']}, 新增: {result['inserted']}, 重复跳过: {result['duplicate_skipped']}")
        click.echo(f"   批次ID: {result['batch_id']}")


@import_cmd.command("fuel")
@click.argument('filepath', type=click.Path(exists=True))
def import_fuel(filepath):
    result = import_fuel_json(filepath)
    if result.get("skipped"):
        click.echo(f"⏭  跳过: {result['reason']} (批次ID: {result['batch_id']})")
    else:
        click.echo(f"✅ 导入成功: {result['source_file']}")
        click.echo(f"   总记录: {result['total']}, 新增: {result['inserted']}, 重复跳过: {result['duplicate_skipped']}")
        click.echo(f"   批次ID: {result['batch_id']}")


@import_cmd.command("return")
@click.argument('filepath', type=click.Path(exists=True))
def import_return(filepath):
    result = import_return_check_csv(filepath)
    if result.get("skipped"):
        click.echo(f"⏭  跳过: {result['reason']} (批次ID: {result['batch_id']})")
    else:
        click.echo(f"✅ 导入成功: {result['source_file']}")
        click.echo(f"   总记录: {result['total']}, 新增: {result['inserted']}, 重复跳过: {result['duplicate_skipped']}")
        click.echo(f"   批次ID: {result['batch_id']}")


@import_cmd.command("history")
def import_history():
    history = get_import_history()
    if not history:
        click.echo("暂无导入记录")
        return

    headers = ['批次ID', '类型', '源文件', '导入时间', '记录数', '批次哈希(前16位)']
    rows = []
    type_map = {
        'lease_out': '租出',
        'fuel': '加油',
        'return_check': '归还',
    }
    for h in history:
        rows.append([
            h['id'],
            type_map.get(h['batch_type'], h['batch_type']),
            h['source_file'],
            h['import_time'][:19] if h['import_time'] else '',
            h['record_count'],
            h['batch_hash'][:16] + '...' if len(h['batch_hash']) > 16 else h['batch_hash'],
        ])
    _print_table(headers, rows)


@cli.command()
@click.option('--equipment', '-e', help='指定设备编号，不指定则审计全部')
@click.option('--anomaly-type', '-t', type=click.Choice(['fuel', 'hours', 'inspector']),
              help='按异常类型筛选: fuel(油耗), hours(小时倒挂), inspector(验收人不一致)')
@click.option('--threshold', default=None, type=float,
              help=f'油耗阈值(升/小时)，默认 {FUEL_CONSUMPTION_THRESHOLD}')
@click.option('--verbose', '-v', is_flag=True, help='显示详细信息')
def audit(equipment, anomaly_type, threshold, verbose):
    if equipment:
        result = audit_equipment(equipment, threshold)
        _print_audit_result(result, verbose)
    else:
        results = audit_all(threshold, anomaly_type)
        click.echo(f"共审计 {len(results)} 台设备")
        click.echo("")
        headers = ['设备编号', '状态', '异常数', '总油量', '小时数', '油耗率', '最终结论']
        rows = []
        for r in results:
            rows.append([
                r['equipment_id'],
                r['status'],
                r['anomaly_count'],
                f"{r['fuel_stats']['total_fuel']:.1f}L",
                f"{r['fuel_stats']['total_hours']:.1f}h",
                f"{r['fuel_stats']['fuel_rate']:.2f}L/h",
                r['final_conclusion'][:30] + '...' if len(r['final_conclusion']) > 30 else r['final_conclusion'],
            ])
        _print_table(headers, rows)

        if verbose:
            for r in results:
                click.echo("")
                _print_audit_result(r, verbose)


def _print_audit_result(result, verbose=False):
    click.echo(f"【{result['equipment_id']}】 - {result['status']}")
    click.echo(f"  最终结论: {result['final_conclusion']}")
    click.echo(f"  油耗统计: 总油量 {result['fuel_stats']['total_fuel']:.2f}L, "
               f"工作 {result['fuel_stats']['total_hours']:.2f}h, "
               f"油耗率 {result['fuel_stats']['fuel_rate']:.2f}L/h")

    if result['anomalies']:
        click.echo(f"  异常详情 ({result['anomaly_count']}项):")
        for i, a in enumerate(result['anomalies'], 1):
            click.echo(f"    {i}. [{a['type']}] {a['description']}")

    if result['latest_review']:
        r = result['latest_review']
        click.echo(f"  最新复核: {r['review_status']} - {r['reviewer']}")
        if r['review_comment']:
            click.echo(f"    意见: {r['review_comment']}")

    if verbose:
        leases = get_equipment_lease_out_local(result['equipment_id'])
        fuels = get_equipment_fuel_local(result['equipment_id'])
        returns = get_equipment_return_local(result['equipment_id'])
        click.echo(f"  原始记录: 租出{len(leases)}条, 加油{len(fuels)}条, 归还{len(returns)}条")
        if leases:
            click.echo(f"    租出来源: {_format_sources(leases)}")
        if fuels:
            click.echo(f"    加油来源: {_format_sources(fuels)}")
        if returns:
            click.echo(f"    归还来源: {_format_sources(returns)}")


def _format_sources(records):
    sources = []
    for r in records:
        f = r.get('batch_file', '')
        l = r.get('source_line', '')
        if f and l:
            sources.append(f"{f}:L{l}")
    return ", ".join(sources)


def get_equipment_lease_out_local(eid):
    from .auditor import get_equipment_lease_out
    return get_equipment_lease_out(eid)


def get_equipment_fuel_local(eid):
    from .auditor import get_equipment_fuel
    return get_equipment_fuel(eid)


def get_equipment_return_local(eid):
    from .auditor import get_equipment_return
    return get_equipment_return(eid)


@cli.group()
def review():
    pass


@review.command("add")
@click.argument('equipment_id')
@click.option('--reviewer', '-r', required=True, help='复核人')
@click.option('--status', '-s', required=True,
              type=click.Choice(['待复核', '通过', '驳回']),
              help='复核状态')
@click.option('--comment', '-c', default='', help='复核意见')
@click.option('--anomalies', '-a', default='', help='解决的异常项')
def review_add(equipment_id, reviewer, status, comment, anomalies):
    review_id = add_review(equipment_id, reviewer, status, comment, anomalies)
    click.echo(f"✅ 复核记录已添加 (ID: {review_id})")
    click.echo(f"   设备: {equipment_id}")
    click.echo(f"   复核人: {reviewer}")
    click.echo(f"   状态: {status}")
    if comment:
        click.echo(f"   意见: {comment}")


@review.command("list")
@click.option('--equipment', '-e', help='按设备编号筛选')
@click.option('--status', '-s', help='按状态筛选')
@click.option('--limit', '-n', default=20, help='显示条数，默认20')
def review_list(equipment, status, limit):
    reviews = get_reviews(equipment, status, limit)
    if not reviews:
        click.echo("暂无复核记录")
        return

    headers = ['ID', '设备编号', '复核人', '状态', '复核时间', '意见']
    rows = []
    for r in reviews:
        comment = r['review_comment'] or ''
        if len(comment) > 30:
            comment = comment[:27] + '...'
        rows.append([
            r['id'],
            r['equipment_id'],
            r['reviewer'],
            r['review_status'],
            r['review_time'][:19] if r['review_time'] else '',
            comment,
        ])
    _print_table(headers, rows)


@review.command("summary")
def review_summary():
    summary = get_review_summary()
    if not summary:
        click.echo("暂无复核数据")
        return

    click.echo("复核状态汇总:")
    for s in summary:
        click.echo(f"  {s['review_status']}: {s['count']} 台设备")


@review.command("pending")
def review_pending():
    pending = get_pending_reviews()
    if not pending:
        click.echo("没有待复核的设备")
        return

    click.echo(f"待复核设备: {len(pending)} 台")
    headers = ['设备编号', '复核人', '提交时间', '意见']
    rows = []
    for r in pending:
        comment = r['review_comment'] or ''
        if len(comment) > 40:
            comment = comment[:37] + '...'
        rows.append([
            r['equipment_id'],
            r['reviewer'],
            r['review_time'][:19] if r['review_time'] else '',
            comment,
        ])
    _print_table(headers, rows)


@cli.group()
def export():
    pass


@export.command("report")
@click.argument('output', type=click.Path())
@click.option('--format', '-f', 'fmt', default='csv',
              type=click.Choice(['csv', 'json']),
              help='导出格式，默认csv')
@click.option('--anomaly-type', '-t', type=click.Choice(['fuel', 'hours', 'inspector']),
              help='按异常类型筛选')
@click.option('--threshold', default=None, type=float,
              help=f'油耗阈值(升/小时)，默认 {FUEL_CONSUMPTION_THRESHOLD}')
def export_report(output, fmt, anomaly_type, threshold):
    if fmt == 'csv':
        result = export_report_csv(output, threshold, anomaly_type)
    else:
        result = export_detailed_json(output, threshold, anomaly_type)

    click.echo(f"✅ 导出成功: {result['file']}")
    click.echo(f"   记录数: {result['record_count']}")


@export.command("anomalies")
@click.argument('output', type=click.Path())
@click.option('--anomaly-type', '-t', type=click.Choice(['fuel', 'hours', 'inspector']),
              help='按异常类型筛选')
@click.option('--threshold', default=None, type=float,
              help=f'油耗阈值(升/小时)，默认 {FUEL_CONSUMPTION_THRESHOLD}')
def export_anomalies(output, anomaly_type, threshold):
    result = export_anomaly_detail_csv(output, anomaly_type, threshold)
    click.echo(f"✅ 导出成功: {result['file']}")
    click.echo(f"   异常记录数: {result['record_count']}")


@cli.command()
@click.argument('equipment_id')
@click.option('--threshold', default=None, type=float, help='油耗阈值')
def status(equipment_id, threshold):
    result = audit_equipment(equipment_id, threshold)
    _print_audit_result(result, verbose=True)

    from .auditor import get_equipment_lease_out, get_equipment_fuel, get_equipment_return
    leases = get_equipment_lease_out(equipment_id)
    fuels = get_equipment_fuel(equipment_id)
    returns = get_equipment_return(equipment_id)

    click.echo("")
    click.echo("租出记录:")
    if leases:
        for l in leases:
            click.echo(f"  {l['lease_date']} 起始 {l['start_hours']}h "
                       f"操作:{l['operator'] or '-'} "
                       f"[{l.get('batch_file', '?')}:L{l['source_line']}]")
    else:
        click.echo("  (无)")

    click.echo("")
    click.echo("加油记录:")
    if fuels:
        for f in fuels:
            click.echo(f"  {f['fuel_date']} 加油 {f['fuel_amount']}L "
                       f"站点:{f['fuel_station'] or '-'} "
                       f"[{f.get('batch_file', '?')}:L{f['source_line']}]")
    else:
        click.echo("  (无)")

    click.echo("")
    click.echo("归还记录:")
    if returns:
        for r in returns:
            click.echo(f"  {r['return_date']} 结束 {r['end_hours']}h "
                       f"验收:{r['inspector'] or '-'} "
                       f"结果:{r['inspection_result'] or '-'} "
                       f"[{r.get('batch_file', '?')}:L{r['source_line']}]")
    else:
        click.echo("  (无)")


def main():
    try:
        cli()
    except Exception as e:
        click.echo(f"❌ 错误: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
