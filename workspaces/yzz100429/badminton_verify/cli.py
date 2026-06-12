import json
import os
import sys

import click
import pandas as pd

from . import __version__
from .database import init_db, _get_engine
import os as _os
from .service import (
    import_registrations, run_verification, load_group_rules,
    ensure_initialized, ANOMALY_TYPES
)
from .exporter import (
    export_confirmed_list, export_contact_list,
    export_grouped_checklist, export_anomaly_report, get_dashboard_stats
)


def _print_result(result: dict):
    click.echo(json.dumps(result, ensure_ascii=False, indent=2))


def _load_rules_from_file(file_path: str):
    if file_path.endswith(".json"):
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    else:
        if file_path.endswith(".xlsx"):
            df = pd.read_excel(file_path)
        elif file_path.endswith(".csv"):
            try:
                df = pd.read_csv(file_path, encoding="utf-8-sig")
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding="gbk")
        else:
            raise click.BadParameter(f"不支持的组别规则文件格式: {file_path}")
        df = df.where(pd.notnull(df), None)
        return df.to_dict(orient="records")


@click.group(help="🏸 赛事名单去重验资 CLI - 业余羽毛球赛报名管理工具")
@click.version_option(__version__, prog_name="badminton-verify")
@click.option("--db-path", envvar="BADMINTON_DB_PATH", default=None,
              help="数据库文件路径 (默认: ./badminton_tournament.db)")
def cli(db_path: str):
    if db_path:
        import badminton_verify.database as _db_mod
        _os.environ["BADMINTON_DB_PATH"] = db_path
        if _db_mod._engine:
            try:
                _db_mod._engine.dispose()
            except Exception:
                pass
        _db_mod._engine = None
        _db_mod._SessionLocal = None
        _db_mod._initialized = False
    ensure_initialized()


@cli.command(help="📥 导入报名表或缴费记录 (支持 Excel/CSV/JSON)")
@click.argument("file_path", type=click.Path(exists=True, readable=True))
@click.option("--source-type", "-s",
              type=click.Choice(["form", "wechat", "club", "payment"]),
              default=None,
              help="数据来源类型: form=表单, wechat=微信群, club=俱乐部代报, payment=缴费记录")
@click.option("--tournament-year", "-y", type=int, default=None,
              help="赛事年份（用于年龄计算，默认当前年）")
@click.option("--force", "-f", is_flag=True, help="忽略重复导入检测")
def import_file(file_path: str, source_type: str, tournament_year: int, force: bool):
    click.echo(f"📂 正在导入: {click.format_filename(file_path)}")

    if force:
        from .utils import compute_file_hash
        from .database import get_db
        from .models import ImportRecord
        db = next(get_db())
        try:
            fh = compute_file_hash(file_path)
            db.query(ImportRecord).filter(ImportRecord.file_hash == fh).delete()
            db.commit()
            click.echo("  🔄 已清除该文件的历史导入记录")
        finally:
            db.close()

    result = import_registrations(file_path, source_type, tournament_year)
    status = result.get("status", "")

    if status == "skipped":
        click.echo(f"  ⏭️  {result.get('message')}")
        click.echo(f"  💡 如需强制重新导入，请使用 --force 参数")
    elif status == "success":
        src = result.get("source_type", "")
        rtype = result.get("record_type", "")
        click.echo(f"  ✅ 导入成功 (来源: {src}, 类型: {rtype})")
        click.echo(f"  📊 解析 {result.get('parsed_count', 0)}/{result.get('row_count', 0)} 行")
        if rtype == "registration":
            click.echo(f"     👤 新建选手: {result.get('players_created', 0)}")
            click.echo(f"     🔗 合并匹配: {result.get('players_merged', 0)}")
            click.echo(f"     📝 报名记录: {result.get('registrations_created', 0)}")
        else:
            click.echo(f"     💰 缴费记录: {result.get('payments_created', 0)}")
            click.echo(f"     🎯 匹配选手: {result.get('payments_matched', 0)}")
        click.echo(f"     ⚠️  异常记录: {result.get('anomalies_created', 0)}")
        if result.get("errors"):
            click.echo(f"     ❌ 处理错误: {len(result['errors'])}")
            for err in result["errors"][:5]:
                click.echo(f"        - {err}")
    else:
        click.echo(f"  ❌ 导入失败: {result}")
        sys.exit(1)


@cli.command(help="🧪 运行全量异常校验（重新生成异常报告）")
@click.option("--tournament-year", "-y", type=int, default=None,
              help="赛事年份（用于年龄计算）")
def verify(tournament_year: int):
    click.echo("🔍 正在重新运行全量校验...")
    result = run_verification(tournament_year)

    click.echo(f"✅ 校验完成")
    click.echo(f"   👥 选手总数: {result.get('total_players', 0)}")
    click.echo(f"   📝 报名总数: {result.get('total_registrations', 0)}")
    click.echo(f"   ⚠️  异常总数: {result.get('total_anomalies', 0)}")

    if result.get("by_type"):
        click.echo("\n📋 按类型统计:")
        for atype, cnt in sorted(result["by_type"].items(), key=lambda x: -x[1]):
            label = ANOMALY_TYPES.get(atype, atype)
            click.echo(f"   {cnt:>4}  {label} ({atype})")


@cli.command(help="📋 加载组别规则表（项目+年龄段+费用）")
@click.argument("rules_file", type=click.Path(exists=True, readable=True))
def load_rules(rules_file: str):
    click.echo(f"📖 加载组别规则: {click.format_filename(rules_file)}")
    try:
        rules_data = _load_rules_from_file(rules_file)
    except Exception as e:
        click.echo(f"❌ 读取规则文件失败: {e}")
        sys.exit(1)

    result = load_group_rules(rules_data)
    click.echo(f"✅ 规则加载完成")
    click.echo(f"   🆕 新增规则: {result.get('added', 0)}")
    click.echo(f"   🔄 更新规则: {result.get('updated', 0)}")


@cli.command(name="export", help="📤 导出各类名单")
@click.argument("export_type",
                type=click.Choice(["confirmed", "contact", "checklist", "anomaly", "all"]))
@click.option("--output", "-o", type=click.Path(), required=True,
              help="输出文件路径 (.xlsx 或 .csv)")
@click.option("--tournament-year", "-y", type=int, default=None,
              help="赛事年份（用于年龄计算）")
def export_cmd(export_type: str, output: str, tournament_year: int):
    out_dir = os.path.dirname(os.path.abspath(output))
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    if export_type == "all":
        base, ext = os.path.splitext(output)
        results = {}
        results["confirmed"] = export_confirmed_list(f"{base}_确认名单{ext}", tournament_year)
        results["contact"] = export_contact_list(f"{base}_待联系{ext}")
        results["checklist"] = export_grouped_checklist(f"{base}_分组检录{ext}", tournament_year)
        results["anomaly"] = export_anomaly_report(f"{base}_异常报告{ext}")

        click.echo("📦 全部导出完成:")
        for k, r in results.items():
            click.echo(f"   📄 {k}: {r.get('output_path', '')}")
    elif export_type == "confirmed":
        r = export_confirmed_list(output, tournament_year)
        click.echo(f"✅ 确认名单导出: {r['output_path']}")
        click.echo(f"   ✓ 确认 {r['confirmed_count']}, ⏳ 待确认 {r['pending_count']}")
    elif export_type == "contact":
        r = export_contact_list(output)
        click.echo(f"✅ 待联系清单导出: {r['output_path']}")
        click.echo(f"   共 {r['total_contacts']} 人需联系")
        for sev, cnt in r.get("by_severity", {}).items():
            label = {"error": "🔴紧急", "warning": "🟡关注", "info": "🔵提示"}.get(sev, sev)
            click.echo(f"   {label}: {cnt}")
    elif export_type == "checklist":
        if not output.endswith(".xlsx"):
            output = os.path.splitext(output)[0] + ".xlsx"
            click.echo(f"ℹ️  分组检录仅支持 Excel 格式，已修改为: {output}")
        r = export_grouped_checklist(output, tournament_year)
        click.echo(f"✅ 分组检录表导出: {r['output_path']}")
        click.echo(f"   {r['total_groups']} 个组别, 共 {r['total_players']} 条记录")
        for g in r.get("groups", []):
            click.echo(f"   - {g['event']} / {g['age_group']}: {g['count']}人")
    elif export_type == "anomaly":
        r = export_anomaly_report(output)
        click.echo(f"✅ 异常报告导出: {r['output_path']}")
        click.echo(f"   共 {r['total_anomalies']} 条异常")


@cli.command(help="📊 查看当前数据统计看板")
def dashboard():
    stats = get_dashboard_stats()

    click.echo("\n" + "=" * 58)
    click.echo("🏸  羽毛球赛事报名数据看板")
    click.echo("=" * 58)

    click.echo(f"\n📈 核心数据")
    click.echo(f"   👥 选手总数:     {stats['total_players']:>6}")
    click.echo(f"   📝 报名记录:     {stats['total_registrations']:>6}")
    click.echo(f"   💰 缴费记录:     {stats['total_payments']:>6}")
    click.echo(f"   💵 已缴总额:     ¥{stats['total_amount']:>9,.2f}")
    click.echo(f"   📋 生效组别:     {stats['groups_count']:>6}")

    click.echo(f"\n⚠️  待处理异常: {stats['unresolved_anomalies']}")
    sev_labels = {"error": "🔴错误", "warning": "🟡警告", "info": "🔵提示"}
    for sev, cnt in sorted(stats.get("by_severity", {}).items()):
        click.echo(f"   {sev_labels.get(sev, sev)}: {cnt}")

    if stats.get("by_type"):
        click.echo("\n🔝 异常类型 TOP5:")
        top = sorted(stats["by_type"].items(), key=lambda x: -x[1])[:5]
        for t, c in top:
            label = ANOMALY_TYPES.get(t, t)
            click.echo(f"   {c:>3}  {label}")

    if stats.get("events"):
        click.echo(f"\n🎯 设项: {', '.join(stats['events'])}")

    if stats.get("import_history"):
        click.echo("\n📥 最近导入:")
        for imp in stats["import_history"]:
            st_label = {"success": "✅", "completed": "✅",
                        "partial": "⚠️", "processing": "⏳",
                        "skipped": "⏭️"}.get(imp.get("status", ""), "❓")
            src_label = {"form": "📝表单", "wechat": "💬微信群",
                         "club": "🏢俱乐部", "payment": "💰缴费"}.get(imp["source"], imp["source"])
            click.echo(
                f"   #{imp['id']:<3} {st_label} {src_label:<7} "
                f"{imp['file'][:22]:<22} {imp['rows']:>4}行 {imp['time']}"
            )

    _db_path = _os.environ.get("BADMINTON_DB_PATH", "badminton_tournament.db")
    click.echo(f"\n💾 数据库: {_db_path}")
    click.echo("=" * 58 + "\n")


@cli.command(help="🧹 重置数据库（危险！会清除所有数据）")
@click.option("--yes", is_flag=True, help="确认重置")
def reset(yes: bool):
    if not yes:
        click.echo("⚠️  此操作将删除所有选手、报名、缴费、异常记录！")
        click.echo("   请再次确认后执行: badminton-verify reset --yes")
        sys.exit(0)

    import badminton_verify.database as _db_mod
    _db_mod._engine = None
    _db_mod._SessionLocal = None
    _db_mod._initialized = False

    _db_path = _os.environ.get("BADMINTON_DB_PATH", "badminton_tournament.db")
    if _os.path.exists(_db_path):
        _os.remove(_db_path)
        click.echo(f"🗑️  已删除数据库: {_db_path}")

    init_db()
    click.echo("✅ 已创建新数据库")


@cli.command(help="🔧 生成测试数据（用于调试）")
@click.argument("output_dir", type=click.Path())
def generate_test_data(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)

    form_data = pd.DataFrame([
        {"姓名": "张 三", "手机号": "13800138001", "身份证号": "110101199003071234",
         "性别": "男", "俱乐部": "飞羽俱乐部", "参赛项目": "男单,男双", "组别": "成年组"},
        {"姓名": "李四", "手机号": "13800138002", "身份证号": "110101198805122345",
         "性别": "男", "俱乐部": "飞羽俱乐部", "参赛项目": "男双,混双", "组别": "成年组",
         "搭档姓名": "王小丽", "搭档手机": "13800138003"},
        {"姓名": "王小丽", "手机号": "13800138003", "身份证号": "110101199207213456",
         "性别": "女", "俱乐部": "旋风羽球", "参赛项目": "女单,混双", "组别": "成年组",
         "搭档姓名": "李四"},
        {"姓名": "赵六", "手机号": "", "身份证号": "",
         "性别": "男", "俱乐部": "", "参赛项目": "男单", "组别": "成年组"},
        {"姓名": "钱七", "手机号": "13800138", "身份证号": "",
         "性别": "女", "俱乐部": "", "参赛项目": "女单", "组别": "青年组"},
        {"姓名": "孙八", "手机号": "13800138008", "身份证号": "110101197512015678",
         "性别": "男", "俱乐部": "老年羽协", "参赛项目": "男单,男双", "组别": ""},
    ])
    form_path = os.path.join(output_dir, "01_表单报名.xlsx")
    form_data.to_excel(form_path, index=False)
    click.echo(f"✅ {form_path}")

    wechat_data = pd.DataFrame([
        {"群聊消息": "张三 13800138001 报名男单"},
        {"群聊消息": "周九 13800138009 男 飞羽 报名男双 搭档: 李四"},
        {"群聊消息": "吴十 13800138010 女 旋风羽球 女单"},
    ])
    wechat_path = os.path.join(output_dir, "02_微信群报名.xlsx")
    wechat_data.to_excel(wechat_path, index=False)
    click.echo(f"✅ {wechat_path}")

    club_data = pd.DataFrame([
        {"代报俱乐部": "飞羽俱乐部", "代报人": "刘经理",
         "姓名": "郑十一", "手机": "13800138011", "性别": "男",
         "参赛项目": "男单,男双", "组别": "成年组",
         "搭档": "张三 13800138001"},
        {"代报俱乐部": "飞羽俱乐部", "代报人": "刘经理",
         "姓名": "张三", "手机": "13800138001", "性别": "男",
         "参赛项目": "男双", "组别": "成年组",
         "搭档": "郑十一 13800138011"},
    ])
    club_path = os.path.join(output_dir, "03_俱乐部代报.xlsx")
    club_data.to_excel(club_path, index=False)
    click.echo(f"✅ {club_path}")

    payment_data = pd.DataFrame([
        {"付款人": "张三", "手机号": "13800138001", "金额": "¥150.00",
         "支付方式": "微信", "截图": "wx_001.png", "付款时间": "2025-06-01 10:23"},
        {"付款人": "李四", "手机号": "13800138002", "金额": "150",
         "支付方式": "支付宝", "截图": "ali_002.png", "付款时间": "2025-06-01 11:45"},
        {"付款人": "王小丽", "手机号": "13800138003", "金额": "50",
         "支付方式": "微信", "截图": "wx_003.png", "付款时间": "2025-06-02 09:10"},
        {"付款人": "周九", "手机号": "13800138009", "金额": "¥100.00",
         "支付方式": "微信", "截图": "wx_009.png", "付款时间": "2025-06-02 14:20"},
        {"付款人": "刘经理（代）", "手机号": "13900139000", "金额": "200元",
         "支付方式": "银行转账", "备注": "飞羽俱乐部 郑十一+搭档",
         "付款时间": "2025-06-03 16:00"},
    ])
    payment_path = os.path.join(output_dir, "04_缴费记录.xlsx")
    payment_data.to_excel(payment_path, index=False)
    click.echo(f"✅ {payment_path}")

    rules_data = pd.DataFrame([
        {"项目": "男单", "组别": "青年组", "最小年龄": 16, "最大年龄": 25, "报名费": 80, "性别限制": "男"},
        {"项目": "男单", "组别": "成年组", "最小年龄": 26, "最大年龄": 45, "报名费": 100, "性别限制": "男"},
        {"项目": "男单", "组别": "常青组", "最小年龄": 46, "最大年龄": 99, "报名费": 100, "性别限制": "男"},
        {"项目": "女单", "组别": "青年组", "最小年龄": 16, "最大年龄": 25, "报名费": 80, "性别限制": "女"},
        {"项目": "女单", "组别": "成年组", "最小年龄": 26, "最大年龄": 45, "报名费": 100, "性别限制": "女"},
        {"项目": "男双", "组别": "成年组", "最小年龄": 18, "最大年龄": 99, "报名费": 150, "性别限制": "男双"},
        {"项目": "女双", "组别": "成年组", "最小年龄": 18, "最大年龄": 99, "报名费": 150, "性别限制": "女双"},
        {"项目": "混双", "组别": "成年组", "最小年龄": 18, "最大年龄": 99, "报名费": 150, "性别限制": "混合"},
    ])
    rules_path = os.path.join(output_dir, "05_组别规则.xlsx")
    rules_data.to_excel(rules_path, index=False)
    click.echo(f"✅ {rules_path}")

    click.echo(f"\n🎉 测试数据已生成到: {output_dir}")
    click.echo(f"\n💡 快速开始:")
    click.echo(f"   badminton-verify load-rules {rules_path}")
    click.echo(f"   badminton-verify import {form_path}")
    click.echo(f"   badminton-verify import {wechat_path}")
    click.echo(f"   badminton-verify import {club_path}")
    click.echo(f"   badminton-verify import {payment_path}")
    click.echo(f"   badminton-verify verify")
    click.echo(f"   badminton-verify export all -o 输出/导出结果.xlsx")
    click.echo(f"   badminton-verify dashboard")


def main():
    cli()


if __name__ == "__main__":
    main()
