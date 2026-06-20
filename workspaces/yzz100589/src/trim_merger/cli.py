import os
import sys
from datetime import date
from typing import List, Optional

import click

from . import __version__
from .reader import read_files
from .merger import merge_requirements
from .validator import validate_all
from .exporter import (
    export_all,
    export_supplier_purchase_orders,
    export_anomaly_report,
    export_style_gap_report,
    print_summary,
)


def _expand_input_paths(inputs: List[str]) -> List[str]:
    """展开目录和通配符到实际文件列表"""
    import glob
    files = []
    for inp in inputs:
        if os.path.isdir(inp):
            for root, _, fnames in os.walk(inp):
                for fn in fnames:
                    if fn.lower().endswith((".csv", ".xlsx", ".xls")) and not fn.startswith("~$"):
                        files.append(os.path.join(root, fn))
        elif any(c in inp for c in "*?["):
            files.extend(glob.glob(inp))
        else:
            files.append(inp)
    return sorted(set(files))


@click.group(
    help="服装辅料采购单合并器 - 多款式辅料需求归并、MOQ校验、异常报告、款式缺口分析",
    context_settings={"help_option_names": ["-h", "--help"]},
)
@click.version_option(__version__, "-V", "--version")
def main() -> None:
    pass


@main.command("merge", help="读取多份采购需求表，合并并导出全部报告")
@click.argument("inputs", nargs=-1, required=True, type=click.Path())
@click.option("-o", "--output-dir", "output_dir", default="./output",
              type=click.Path(), show_default=True, help="输出目录")
@click.option("--skip-validation", is_flag=True, help="跳过MOQ和交期校验")
@click.option("--today", type=click.DateTime(formats=["%Y-%m-%d"]),
              default=None, help="指定校验用的今天日期 (YYYY-MM-DD)，默认系统日期")
@click.option("-q", "--quiet", is_flag=True, help="静默模式，不打印摘要")
def merge_cmd(inputs: List[str], output_dir: str, skip_validation: bool,
              today: Optional[click.DateTime], quiet: bool) -> None:
    file_paths = _expand_input_paths(list(inputs))
    if not file_paths:
        click.echo("❌ 未找到任何输入文件 (支持 .csv/.xlsx/.xls)", err=True)
        sys.exit(1)

    if not quiet:
        click.echo(f"📂 读取 {len(file_paths)} 个文件:")
        for fp in file_paths:
            click.echo(f"   - {fp}")

    requirements, errors = read_files(file_paths)
    if errors:
        click.echo("⚠️  以下文件读取失败:", err=True)
        for e in errors:
            click.echo(f"   - {e}", err=True)

    if not requirements:
        click.echo("❌ 未读取到任何有效采购需求记录", err=True)
        sys.exit(1)

    if not quiet:
        click.echo(f"✅ 共读取 {len(requirements)} 条有效需求记录")

    result = merge_requirements(requirements)

    if not skip_validation:
        today_date = today.date() if today else None
        validate_all(result, today=today_date)

    generated = export_all(result, output_dir)

    if not quiet:
        print_summary(result)
        click.echo("")
        click.echo("📁 已导出文件:")
        for category, files in generated.items():
            label = {
                "supplier_purchase_orders": "  供应商采购单",
                "anomaly_report": "  异常报告",
                "style_gap_report": "  款式辅料缺口报告",
            }.get(category, category)
            for fp in files:
                click.echo(f"{label}: {fp}")

    click.echo("")
    click.echo("🎉 完成！")


@main.command("purchase", help="仅导出供应商采购单")
@click.argument("inputs", nargs=-1, required=True, type=click.Path())
@click.option("-o", "--output-dir", "output_dir", default="./output/供应商采购单",
              type=click.Path(), show_default=True, help="输出目录")
@click.option("--skip-validation", is_flag=True, help="跳过MOQ和交期校验")
def purchase_cmd(inputs: List[str], output_dir: str, skip_validation: bool) -> None:
    file_paths = _expand_input_paths(list(inputs))
    requirements, _ = read_files(file_paths)
    if not requirements:
        click.echo("❌ 未读取到有效记录", err=True)
        sys.exit(1)
    result = merge_requirements(requirements)
    if not skip_validation:
        validate_all(result)
    files = export_supplier_purchase_orders(result, output_dir)
    click.echo(f"✅ 已导出 {len(files)} 份采购单到: {output_dir}")
    for fp in files:
        click.echo(f"   - {fp}")


@main.command("anomaly", help="仅导出异常报告（给跟单确认）")
@click.argument("inputs", nargs=-1, required=True, type=click.Path())
@click.option("-o", "--output", "output", default=None,
              type=click.Path(), help="输出文件路径 (默认 ./output/异常报告_日期.xlsx)")
@click.option("--skip-validation", is_flag=True, help="跳过MOQ和交期校验")
def anomaly_cmd(inputs: List[str], output: Optional[str], skip_validation: bool) -> None:
    file_paths = _expand_input_paths(list(inputs))
    requirements, _ = read_files(file_paths)
    if not requirements:
        click.echo("❌ 未读取到有效记录", err=True)
        sys.exit(1)
    result = merge_requirements(requirements)
    if not skip_validation:
        validate_all(result)
    out_path = output or f"./output/异常报告_{date.today().isoformat()}.xlsx"
    export_anomaly_report(result, out_path)
    click.echo(f"✅ 异常报告已导出: {out_path}")
    click.echo(f"   共 {len(result.anomalies)} 条异常记录待跟单确认")


@main.command("gaps", help="仅导出款式辅料缺口报告（供生产排期判断）")
@click.argument("inputs", nargs=-1, required=True, type=click.Path())
@click.option("-o", "--output", "output", default=None,
              type=click.Path(), help="输出文件路径 (默认 ./output/款式辅料缺口报告_日期.xlsx)")
@click.option("--skip-validation", is_flag=True, help="跳过MOQ和交期校验")
def gaps_cmd(inputs: List[str], output: Optional[str], skip_validation: bool) -> None:
    file_paths = _expand_input_paths(list(inputs))
    requirements, _ = read_files(file_paths)
    if not requirements:
        click.echo("❌ 未读取到有效记录", err=True)
        sys.exit(1)
    result = merge_requirements(requirements)
    if not skip_validation:
        validate_all(result)
    out_path = output or f"./output/款式辅料缺口报告_{date.today().isoformat()}.xlsx"
    export_style_gap_report(result, out_path)
    click.echo(f"✅ 款式缺口报告已导出: {out_path}")
    click.echo(f"   共 {len(result.style_gaps)} 条缺口记录，影响 {len({g.style_no for g in result.style_gaps})} 款")


@main.command("inspect", help="预览输入文件内容和字段映射（调试用）")
@click.argument("inputs", nargs=-1, required=True, type=click.Path())
def inspect_cmd(inputs: List[str]) -> None:
    file_paths = _expand_input_paths(list(inputs))
    requirements, errors = read_files(file_paths)
    if errors:
        click.echo("⚠️  读取错误:")
        for e in errors:
            click.echo(f"   - {e}")
    click.echo(f"读取记录数: {len(requirements)}")
    if requirements:
        click.echo("前3条记录预览:")
        for r in requirements[:3]:
            click.echo(f"  [{r.source_file}#{r.row_index}] "
                       f"款号={r.style_no} 物料={r.material_name} "
                       f"颜色={r.color} 规格={r.spec_raw} 数量={r.quantity}{r.unit}")


if __name__ == "__main__":
    main()
