import click
import os
import sys
from datetime import datetime, timedelta

from .importer import import_data
from .merger import merge_and_validate
from .report import generate_manager_weekly_report
from .todo_export import generate_team_todo_list, print_team_summary
from .models import Warning


def _parse_date(ctx, param, value):
    if not value:
        return None
    for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d"]:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise click.BadParameter(f"日期格式错误: {value}，请使用 YYYY-MM-DD 格式")


@click.group()
@click.version_option(version="1.0.0", prog_name="qc-ledger")
def cli():
    """质检不合格台账 CLI - 管理不合格记录、复检和报表统计"""
    pass


@cli.command()
@click.option("--defects", "-d", required=True, type=click.Path(exists=True),
              help="不合格记录文件（CSV或Excel）")
@click.option("--reinspections", "-r", required=True, type=click.Path(exists=True),
              help="复检记录表文件（CSV或Excel）")
@click.option("--output", "-o", default=None, type=click.Path(),
              help="周报输出文件路径（.txt或.xlsx），默认输出到控制台")
@click.option("--start-date", callback=_parse_date, default=None,
              help="统计开始日期 YYYY-MM-DD")
@click.option("--end-date", callback=_parse_date, default=None,
              help="统计结束日期 YYYY-MM-DD")
@click.option("--this-week", is_flag=True, help="统计本周数据（周一至今天）")
@click.option("--last-week", is_flag=True, help="统计上周数据（周一至周日）")
def report(defects, reinspections, output, start_date, end_date, this_week, last_week):
    """生成质量经理周报"""
    if this_week:
        today = datetime.now()
        start_date = today - timedelta(days=today.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = today.replace(hour=23, minute=59, second=59, microsecond=0)
    elif last_week:
        today = datetime.now()
        last_monday = today - timedelta(days=today.weekday() + 7)
        last_sunday = last_monday + timedelta(days=6)
        start_date = last_monday.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = last_sunday.replace(hour=23, minute=59, second=59, microsecond=0)

    try:
        defect_records, reinspect_records = import_data(defects, reinspections)
    except Exception as e:
        click.echo(f"❌ 导入数据失败: {e}", err=True)
        sys.exit(1)

    click.echo(f"✅ 导入不合格记录: {len(defect_records)} 条")
    click.echo(f"✅ 导入复检记录: {len(reinspect_records)} 条")

    merged, warnings = merge_and_validate(defect_records, reinspect_records)

    high_w = sum(1 for w in warnings if w.level == "HIGH")
    med_w = sum(1 for w in warnings if w.level == "MEDIUM")
    low_w = sum(1 for w in warnings if w.level == "LOW")
    click.echo(f"⚠️  数据校验警示 - HIGH: {high_w}, MEDIUM: {med_w}, LOW: {low_w}")

    report_text = generate_manager_weekly_report(
        merged, warnings, output, start_date, end_date
    )

    if output:
        click.echo(f"✅ 周报已保存到: {os.path.abspath(output)}")
    else:
        click.echo("\n" + report_text)


@cli.command()
@click.option("--defects", "-d", required=True, type=click.Path(exists=True),
              help="不合格记录文件（CSV或Excel）")
@click.option("--reinspections", "-r", required=True, type=click.Path(exists=True),
              help="复检记录表文件（CSV或Excel）")
@click.option("--output", "-o", default=None, type=click.Path(),
              help="待处理清单输出路径（.xlsx或.txt前缀），默认输出到控制台")
def todo(defects, reinspections, output):
    """生成各生产班组待处理清单"""
    try:
        defect_records, reinspect_records = import_data(defects, reinspections)
    except Exception as e:
        click.echo(f"❌ 导入数据失败: {e}", err=True)
        sys.exit(1)

    click.echo(f"✅ 导入不合格记录: {len(defect_records)} 条")
    click.echo(f"✅ 导入复检记录: {len(reinspect_records)} 条")

    merged, warnings = merge_and_validate(defect_records, reinspect_records)

    team_outputs = generate_team_todo_list(merged, output)

    if output:
        click.echo(f"✅ 待处理清单已保存到: {os.path.abspath(output)}")
    else:
        print_team_summary(team_outputs)
        click.echo()
        for team, content in team_outputs.items():
            click.echo(content)
            click.echo()


@cli.command()
@click.option("--defects", "-d", required=True, type=click.Path(exists=True),
              help="不合格记录文件（CSV或Excel）")
@click.option("--reinspections", "-r", required=True, type=click.Path(exists=True),
              help="复检记录表文件（CSV或Excel）")
@click.option("--level", "-l", type=click.Choice(["ALL", "HIGH", "MEDIUM", "LOW"]),
              default="ALL", help="显示指定级别的警示")
def check(defects, reinspections, level):
    """检查数据质量问题并显示警示"""
    try:
        defect_records, reinspect_records = import_data(defects, reinspections)
    except Exception as e:
        click.echo(f"❌ 导入数据失败: {e}", err=True)
        sys.exit(1)

    click.echo(f"✅ 导入不合格记录: {len(defect_records)} 条")
    click.echo(f"✅ 导入复检记录: {len(reinspect_records)} 条")

    _, warnings = merge_and_validate(defect_records, reinspect_records)

    if level != "ALL":
        warnings = [w for w in warnings if w.level == level]

    if not warnings:
        click.echo("✅ 数据校验通过，未发现问题！")
        return

    high_w = [w for w in warnings if w.level == "HIGH"]
    med_w = [w for w in warnings if w.level == "MEDIUM"]
    low_w = [w for w in warnings if w.level == "LOW"]

    click.echo()
    click.echo("=" * 70)
    click.echo(f"                    数据质量检查报告")
    click.echo("=" * 70)
    click.echo(f"  总计: {len(warnings)} 条警示 (HIGH: {len(high_w)}, MEDIUM: {len(med_w)}, LOW: {len(low_w)})")
    click.echo()

    for w in warnings:
        icon = "🔴" if w.level == "HIGH" else ("🟡" if w.level == "MEDIUM" else "🔵")
        click.echo(f"  {icon} [{w.level:5s}] [{w.category:8s}] {w.message}")

    click.echo()
    click.echo("=" * 70)


@cli.command()
def sample():
    """生成示例数据文件到当前目录"""
    import pandas as pd

    defects_data = {
        "批次号": ["B20260615-001", "B20260615-002", "B20260615-003", "B20260616-001",
                  "B20260616-002", "B20260616-003", "B20260617-001", "B20260617-002",
                  "B20260618-001", "B20260618-002"],
        "工序": ["焊接", "装配", "冲压", "焊接", "车削", "装配", "冲压", "焊接", "磨削", "装配"],
        "不合格项": ["焊缝气孔", "尺寸超差", "毛刺未清", "虚焊", "表面粗糙度不达标",
                    "漏装螺钉", "裂纹", "焊缝气孔", "烧伤", "配合间隙大"],
        "发现日期": ["2026-06-15", "2026-06-15", "2026-06-15", "2026-06-16",
                     "2026-06-16", "2026-06-16", "2026-06-17", "2026-06-17",
                     "2026-06-18", "2026-06-18"],
        "责任班组": ["焊接组", "一组", "冲压组", "焊接组", "车削组", "二组",
                    "冲压组", "焊", "磨削组", "装配"],
        "数量": [5, 2, 10, 3, 1, 4, 8, 6, 2, 3],
        "检验员": ["张质检", "李质检", "王质检", "张质检", "赵质检",
                   "李质检", "王质检", "张质检", "赵质检", "李质检"],
        "状态": ["待复检", "待复检", "待复检", "待复检", "待复检",
                 "待复检", "待复检", "待复检", "待复检", "待复检"],
        "备注": ["", "需返工", "", "同一批次第二次", "", "", "", "", "生产直接取走", "让步接收待审批"],
    }

    reinspections_data = {
        "批次号": ["B20260615-001", "B20260615-002", "B20260616-001", "B20260616-003",
                  "B20260617-001", "B20260618-001", "B20260618-002", "B20260615-001"],
        "复检日期": ["2026-06-16", "2026-06-16", "2026-06-17", "2026-06-17",
                     "2026-06-18", "2026-06-19", "2026-06-19", "2026-06-17"],
        "复检结果": ["返工通过", "返工通过", "返工通过", "让步接收",
                    "再次返工", "未复检被取走", "让步接收", "再次返工"],
        "复检人": ["张质检", "李质检", "张质检", "李质检",
                   "王质检", "", "李质检", "张质检"],
        "让步审批": ["", "", "", "已审批", "", "", "未审批", ""],
        "返工次数": [1, 1, 1, 1, 2, 0, 1, 2],
        "备注": ["", "", "", "经理特批", "第二次返工", "生产车间直接取走", "等待审批中", "仍有小气孔"],
    }

    pd.DataFrame(defects_data).to_excel("示例_不合格记录.xlsx", index=False)
    pd.DataFrame(reinspections_data).to_excel("示例_复检记录.xlsx", index=False)

    click.echo("✅ 已生成示例文件:")
    click.echo(f"   - {os.path.abspath('示例_不合格记录.xlsx')}")
    click.echo(f"   - {os.path.abspath('示例_复检记录.xlsx')}")
    click.echo()
    click.echo("使用示例:")
    click.echo("  qc-ledger report -d 示例_不合格记录.xlsx -r 示例_复检记录.xlsx --this-week")
    click.echo("  qc-ledger todo -d 示例_不合格记录.xlsx -r 示例_复检记录.xlsx -o 待处理清单.xlsx")
    click.echo("  qc-ledger check -d 示例_不合格记录.xlsx -r 示例_复检记录.xlsx")


def main():
    cli()


if __name__ == "__main__":
    main()
