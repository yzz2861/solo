import click
import os
import json
import sys

from .models.ledger import BusinessLedger
from .models.params import ParamsConfig
from .models.batch import SourceIdentifier
from .engine.validator import ValidationEngine
from .engine.generator import GenerationEngine
from .export.exporter import Exporter
from .summary.console_summary import ConsoleSummarizer
from .replay.replay import DataReplayer


def _load_ledger(ledger_file: str) -> BusinessLedger:
    ext = os.path.splitext(ledger_file)[1].lower()
    if ext == '.csv':
        return BusinessLedger.from_csv(ledger_file)
    elif ext in ('.xlsx', '.xls'):
        return BusinessLedger.from_excel(ledger_file)
    else:
        raise click.BadParameter(f"不支持的台账文件格式: {ext}")


def _load_params(params_file: str) -> ParamsConfig:
    return ParamsConfig.load(params_file)


def _parse_filters(filters_str: str) -> dict:
    if not filters_str:
        return {}
    try:
        return json.loads(filters_str)
    except json.JSONDecodeError:
        filters = {}
        pairs = filters_str.split(',')
        for pair in pairs:
            if '=' in pair:
                k, v = pair.split('=', 1)
                filters[k.strip()] = v.strip()
        return filters


@click.group()
@click.version_option(version='1.0.0', prog_name='notary-checklist')
@click.option('--output-dir', default='./output', show_default=True,
              help='输出目录路径')
@click.pass_context
def cli(ctx, output_dir):
    """公证材料清单CLI工具 - 支持校验、生成、导出和查看摘要等命令

    输入: 业务台账、参数文件、上次结果、筛选条件\n
    结果: 明细文件、复核列表、控制台摘要、可发送报告
    """
    ctx.ensure_object(dict)
    ctx.obj['output_dir'] = output_dir


@cli.command()
@click.argument('ledger_file', type=click.Path(exists=True))
@click.argument('params_file', type=click.Path(exists=True))
@click.option('--filters', '-f', default='', help='筛选条件，JSON格式或key=value,key2=value2格式')
@click.option('--output-dir', default=None, help='输出目录路径')
@click.option('--verbose', '-v', is_flag=True, help='显示详细异常解释')
@click.pass_context
def validate(ctx, ledger_file, params_file, filters, output_dir, verbose):
    """校验业务台账数据完整性和规则匹配情况

    LEDGER_FILE: 业务台账文件路径 (CSV/Excel)
    PARAMS_FILE: 参数配置文件路径 (JSON/YAML)
    """
    out_dir = output_dir or ctx.obj['output_dir']

    click.echo("正在加载数据...")
    ledger = _load_ledger(ledger_file)
    params = _load_params(params_file)
    filter_dict = _parse_filters(filters)

    if filter_dict:
        ledger = ledger.filter_by(filter_dict)

    click.echo(f"已加载 {len(ledger)} 条记录")

    engine = ValidationEngine(params)
    review_items, stats = engine.validate(ledger)

    click.echo()
    click.echo("=" * 50)
    click.echo("校 验 结 果")
    click.echo("=" * 50)
    click.echo(f"  总记录数:   {stats['total_records']}")
    click.echo(f"  有效记录:   {stats['valid_records']}")
    click.echo(f"  无效记录:   {stats['invalid_records']}")
    click.echo(f"  问题总数:   {len(review_items)} 个")
    click.echo()

    if stats['issues_by_type']:
        click.echo("问题类型分布:")
        for itype, count in sorted(stats['issues_by_type'].items(), key=lambda x: -x[1]):
            click.echo(f"  {itype}: {count} 个")
        click.echo()

    errors = [r for r in review_items if r.severity == 'error']
    warnings = [r for r in review_items if r.severity == 'warning']

    if errors:
        click.echo(f"\033[31m错误 ({len(errors)} 个):\033[0m")
        for e in errors[:10]:
            click.echo(f"  - [{e.record_id}] {e.issue_detail}")
        if len(errors) > 10:
            click.echo(f"  ... 还有 {len(errors) - 10} 个错误")

    if warnings:
        click.echo(f"\033[33m警告 ({len(warnings)} 个):\033[0m")
        for w in warnings[:10]:
            click.echo(f"  - [{w.record_id}] {w.issue_detail}")
        if len(warnings) > 10:
            click.echo(f"  ... 还有 {len(warnings) - 10} 个警告")

    if verbose and review_items:
        click.echo()
        issue_types = list(stats['issues_by_type'].keys())
        ConsoleSummarizer.print_issue_explanations(issue_types)

    if errors:
        sys.exit(1)


@cli.command()
@click.argument('ledger_file', type=click.Path(exists=True))
@click.argument('params_file', type=click.Path(exists=True))
@click.option('--filters', '-f', default='', help='筛选条件，JSON格式或key=value,key2=value2格式')
@click.option('--previous', '-p', type=click.Path(exists=True),
              help='上次处理结果文件，用于幂等性校验')
@click.option('--output-dir', default=None, help='输出目录路径')
@click.option('--operator', '-o', default='', help='操作人标识')
@click.option('--source-system', default='', help='来源系统标识')
@click.option('--no-export', is_flag=True, help='不导出文件，只在控制台显示')
@click.pass_context
def generate(ctx, ledger_file, params_file, filters, previous,
             output_dir, operator, source_system, no_export):
    """生成公证材料清单

    LEDGER_FILE: 业务台账文件路径 (CSV/Excel)
    PARAMS_FILE: 参数配置文件路径 (JSON/YAML)

    同一数据重复执行不会产生新增差异（幂等性保证）
    """
    out_dir = output_dir or ctx.obj['output_dir']

    click.echo("正在加载数据...")
    ledger = _load_ledger(ledger_file)
    params = _load_params(params_file)
    filter_dict = _parse_filters(filters)

    source = SourceIdentifier.from_file(ledger_file, source_system)

    previous_result = None
    if previous:
        click.echo("正在加载上次处理结果...")
        previous_result = GenerationEngine.load_result(previous)

    click.echo(f"已加载 {len(ledger)} 条记录")
    click.echo("正在生成材料清单...")

    engine = GenerationEngine(params, output_dir=out_dir)
    result = engine.generate(
        ledger=ledger,
        source=source,
        filters=filter_dict,
        operator=operator,
        previous_result=previous_result,
    )

    if not no_export:
        click.echo("正在导出文件...")
        exporter = Exporter(output_dir=out_dir)
        outputs = exporter.export_all(result)
        click.echo()
        click.echo("导出文件:")
        for name, path in outputs.items():
            click.echo(f"  {name}: {path}")

    ConsoleSummarizer.print_summary(result, verbose=False)

    if result.is_idempotent_replay:
        click.echo("\033[32m✓ 幂等校验通过：相同输入产生完全一致的结果，无新增差异\033[0m")
    else:
        click.echo("\033[33mℹ 本次为新的输入组合，已生成新批次结果\033[0m")


@cli.command()
@click.argument('result_file', type=click.Path(exists=True))
@click.option('--output-dir', default=None, help='输出目录路径')
@click.option('--format', 'fmt', default='all',
              type=click.Choice(['all', 'detail', 'review', 'report', 'json']),
              help='导出格式，默认全部导出')
@click.option('--prefix', default='', help='输出文件前缀')
@click.pass_context
def export(ctx, result_file, output_dir, fmt, prefix):
    """导出处理结果为各种格式

    RESULT_FILE: 处理结果JSON文件路径
    """
    out_dir = output_dir or ctx.obj['output_dir']

    click.echo("正在加载处理结果...")
    result = GenerationEngine.load_result(result_file)

    exporter = Exporter(output_dir=out_dir)
    outputs = {}

    if fmt == 'all':
        outputs = exporter.export_all(result, prefix=prefix)
    elif fmt == 'detail':
        outputs['detail'] = exporter.export_detail(result, prefix=prefix)
    elif fmt == 'review':
        outputs['review'] = exporter.export_review(result, prefix=prefix)
    elif fmt == 'report':
        outputs['report'] = exporter.export_report(result, prefix=prefix)
    elif fmt == 'json':
        outputs['json'] = exporter.export_json(result, prefix=prefix)

    click.echo()
    click.echo("导出完成:")
    for name, path in outputs.items():
        click.echo(f"  {name}: {path}")


@cli.command()
@click.argument('result_file', type=click.Path(exists=True), required=False)
@click.option('--output-dir', default=None, help='输出目录路径')
@click.option('--list', '-l', 'list_all', is_flag=True, help='列出所有历史结果')
@click.option('--verbose', '-v', is_flag=True, help='显示详细异常解释')
@click.option('--review', '-r', is_flag=True, help='显示复核列表')
@click.option('--record', '-R', default='', help='查看指定记录的材料明细')
@click.option('--severity', default='',
              type=click.Choice(['', 'error', 'warning']),
              help='按严重程度筛选复核列表')
@click.option('--limit', default=20, help='显示条数限制')
@click.pass_context
def summary(ctx, result_file, output_dir, list_all, verbose,
            review, record, severity, limit):
    """查看处理摘要和详细信息

    RESULT_FILE: 处理结果JSON文件路径（可选）
    """
    out_dir = output_dir or ctx.obj['output_dir']

    if list_all:
        replayer = DataReplayer(output_dir=out_dir)
        results = replayer.list_results()
        click.echo()
        click.echo("=" * 60)
        click.echo(f"历 史 处 理 结 果 (共 {len(results)} 个)")
        click.echo("=" * 60)
        click.echo()
        for i, r in enumerate(results, 1):
            status_color = '\033[32m' if r['task_status'] == 'completed' else '\033[33m'
            click.echo(f"  {i}. {r['batch_id']}")
            click.echo(f"     时间: {r['batch_time']}  状态: {status_color}{r['task_status']}\033[0m")
            click.echo(f"     记录: {r['total_records']}  材料: {r['total_materials']}  问题: {r['review_issues']}")
            click.echo(f"     来源: {r['source_file']}")
        click.echo()
        return

    if not result_file:
        click.echo("请指定结果文件路径，或使用 --list 查看所有历史结果")
        return

    click.echo("正在加载处理结果...")
    result = GenerationEngine.load_result(result_file)

    if review:
        sev = severity if severity else None
        ConsoleSummarizer.print_review_list(result, severity=sev, limit=limit)
        return

    if record:
        ConsoleSummarizer.print_materials_by_record(result, record)
        return

    ConsoleSummarizer.print_summary(result, verbose=verbose)


@cli.command()
@click.argument('result_file', type=click.Path(exists=True))
@click.option('--output-dir', default=None, help='输出目录路径')
@click.option('--record-id', '-r', default='', help='回放指定记录')
@click.option('--trace', '-t', is_flag=True, help='追踪记录来源')
@click.option('--verify', '-V', is_flag=True, help='验证幂等性')
@click.option('--compare', '-c', default='', help='对比另一个批次ID')
@click.option('--list', '-l', 'list_all', is_flag=True, help='列出同输入的所有批次')
@click.pass_context
def replay(ctx, result_file, output_dir, record_id, trace,
           verify, compare, list_all):
    """数据回放 - 回溯数据来源、验证幂等性、对比批次

    RESULT_FILE: 处理结果JSON文件路径
    """
    out_dir = output_dir or ctx.obj['output_dir']

    click.echo("正在加载处理结果...")
    result = GenerationEngine.load_result(result_file)

    if list_all:
        replayer = DataReplayer(output_dir=out_dir)
        chain = replayer.get_processing_chain(result.batch.batch_id)
        click.echo()
        click.echo("=" * 60)
        click.echo(f"同输入处理批次链 (共 {len(chain)} 个)")
        click.echo("=" * 60)
        click.echo()
        for i, b in enumerate(chain, 1):
            marker = " ← 当前" if b['batch_id'] == result.batch.batch_id else ""
            click.echo(f"  {i}. {b['batch_id']} - {b['batch_time']}{marker}")
        click.echo()
        return

    if verify:
        replayer = DataReplayer(output_dir=out_dir)
        vresult = replayer.verify_idempotency(result.batch.batch_id)
        click.echo()
        click.echo("=" * 60)
        click.echo("幂 等 性 验 证")
        click.echo("=" * 60)
        click.echo()
        click.echo(f"  批次号:        {result.batch.batch_id}")
        click.echo(f"  幂等键:        {result.idempotency_key}")
        click.echo(f"  同输入批次数:  {vresult['same_input_batches']}")
        click.echo()
        if vresult['is_consistent']:
            click.echo("  \033[32m✓ 幂等性验证通过：相同输入产生一致结果\033[0m")
        else:
            click.echo("  \033[31m✗ 幂等性验证失败：相同输入产生了不同结果\033[0m")
            for d in vresult['differences']:
                click.echo(f"    - {d}")
        click.echo()
        return

    if compare:
        replayer = DataReplayer(output_dir=out_dir)
        other = replayer.load_result(compare)
        if not other:
            click.echo(f"\033[31m错误: 找不到批次 {compare}\033[0m")
            sys.exit(1)

        diff = replayer.compare_batches(result.batch.batch_id, compare)
        if not diff:
            click.echo(f"\033[31m错误: 对比失败\033[0m")
            sys.exit(1)

        exporter = Exporter(output_dir=out_dir)
        report_path = exporter.export_diff_report(other, result, diff, prefix='对比')

        click.echo()
        click.echo(f"对比报告已生成: {report_path}")
        click.echo()
        click.echo(f"  相同输入:     {'是' if diff['same_inputs'] else '否'}")
        click.echo(f"  记录数变化:   {diff['total_records_diff']:+d}")
        click.echo(f"  材料数变化:   {diff['total_materials_diff']:+d}")
        click.echo(f"  问题数变化:   {diff['review_items_diff']:+d}")
        click.echo()
        return

    if record_id:
        replayer = DataReplayer(output_dir=out_dir)
        info = replayer.replay_record(result, record_id)

        click.echo()
        click.echo("=" * 60)
        click.echo(f"记 录 回 放 - {record_id}")
        click.echo("=" * 60)
        click.echo()

        if info['record']:
            rec = info['record']
            click.echo(f"  客户姓名: {rec.get('customer_name', '')}")
            click.echo(f"  证件号码: {rec.get('id_card', '')}")
            click.echo(f"  业务类型: {rec.get('business_type', '')}")
            click.echo(f"  公证类型: {rec.get('notary_type', '')}")
            click.echo()

        if info['materials']:
            click.echo(f"  材料清单 ({len(info['materials'])} 项):")
            for i, m in enumerate(info['materials'], 1):
                click.echo(f"    {i}. {m['material_name']} ({m['rule_name']})")
            click.echo()

        if info['review_items']:
            click.echo(f"  相关问题 ({len(info['review_items'])} 个):")
            for r in info['review_items']:
                click.echo(f"    - [{r['severity']}] {r['issue_detail']}")
            click.echo()
        return

    if trace:
        replayer = DataReplayer(output_dir=out_dir)
        record_ids = list(result.record_map.keys())[:5]

        click.echo()
        click.echo("=" * 60)
        click.echo("数 据 来 源 追 溯")
        click.echo("=" * 60)
        click.echo()

        for rid in record_ids:
            t = replayer.trace_record_origin(result, rid)
            if t['found']:
                click.echo(f"  {t['record_id']} ({t['customer_name']}):")
                click.echo(f"    来源文件: {t['source_file']}")
                click.echo(f"    来源系统: {t['source_system'] or '未知'}")
                click.echo(f"    来源标识: {t['source_hash']}")
                click.echo(f"    处理批次: {t['batch_id']}")
                click.echo()
        return

    click.echo("请指定回放操作: --record-id, --trace, --verify, --compare, --list")


@cli.command()
@click.argument('issue_type', required=False)
@click.option('--all', '-a', 'show_all', is_flag=True, help='显示所有异常类型的解释')
def explain(issue_type, show_all):
    """查看异常类型的详细解释

    ISSUE_TYPE: 异常类型代码（可选）
    """
    if show_all or not issue_type:
        ConsoleSummarizer.print_issue_explanations()
    else:
        ConsoleSummarizer.print_issue_explanations([issue_type])


if __name__ == '__main__':
    cli()
