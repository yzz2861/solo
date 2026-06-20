from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from . import __version__
from .algorithm import AllocationAlgorithm
from .exporter import ResultExporter
from .filler import AllocationFiller
from .models import (
    AllocationItem,
    BatchInfo,
    ProcessResult,
    SafetyStock,
    ShortageRecord,
    SkuAlias,
    StockRecord,
    TransportRoute,
)
from .preprocess import DataPreprocessor
from .reviewer import AllocationReviewer

console = Console()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def _generate_batch_id() -> str:
    now = datetime.now()
    return f"ALLOC-{now.strftime('%Y%m%d-%H%M%S')}"


def _check_duplicate_batch(
    output_dir: str,
    shortage_file: str,
    stock_file: str,
) -> Optional[str]:
    if not os.path.exists(output_dir):
        return None

    existing_batches = []
    for entry in os.listdir(output_dir):
        batch_dir = os.path.join(output_dir, entry)
        if not os.path.isdir(batch_dir):
            continue

        batch_info_path = os.path.join(batch_dir, "batch_info.json")
        if not os.path.exists(batch_info_path):
            continue

        try:
            with open(batch_info_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if (data.get("shortage_file") == os.path.abspath(shortage_file) and
                    data.get("stock_file") == os.path.abspath(stock_file)):
                existing_batches.append(entry)
        except Exception:
            continue

    if existing_batches:
        return existing_batches[0]
    return None


@click.group()
@click.version_option(version=__version__, prog_name="allocate")
def cli():
    """库存调拨单生成器 - 连锁小店智能补货调拨工具"""
    pass


@cli.command()
@click.option("--shortage", required=True, type=click.Path(exists=True), help="缺货表CSV文件路径")
@click.option("--stock", required=True, type=click.Path(exists=True), help="库存表CSV文件路径")
@click.option("--transport", required=True, type=click.Path(exists=True), help="运输天数CSV文件路径")
@click.option("--safety", required=True, type=click.Path(exists=True), help="安全库存CSV文件路径")
@click.option("--sku-alias", type=click.Path(exists=True), help="SKU别名映射CSV文件路径（可选）")
@click.option("--output", "-o", required=True, type=click.Path(), help="输出目录")
@click.option("--max-transport-days", default=7, type=int, help="最大运输天数限制，默认7天")
@click.option("--min-transfer-qty", default=1, type=int, help="最小调拨数量，默认1件")
@click.option("--force", is_flag=True, help="强制重新生成，即使检测到重复批次")
def generate(
    shortage: str,
    stock: str,
    transport: str,
    safety: str,
    sku_alias: Optional[str],
    output: str,
    max_transport_days: int,
    min_transfer_qty: int,
    force: bool,
):
    """生成调拨建议单"""

    console.print(Panel.fit(
        "[bold blue]库存调拨单生成器[/bold blue]\n"
        "正在生成调拨建议...",
        border_style="blue",
    ))

    existing_batch = _check_duplicate_batch(output, shortage, stock)
    if existing_batch and not force:
        console.print(Panel.fit(
            f"[yellow]检测到相同输入数据的批次已存在: {existing_batch}[/yellow]\n"
            "使用 --force 参数可强制重新生成",
            border_style="yellow",
        ))
        sys.exit(1)

    try:
        sku_alias_list: List[SkuAlias] = []
        if sku_alias:
            sku_alias_list = DataPreprocessor.load_sku_alias(sku_alias)
            console.print(f"✅ 已加载 {len(sku_alias_list)} 条SKU别名映射")

        preprocessor = DataPreprocessor(sku_alias_list)

        shortages, shortage_result = preprocessor.load_shortage(shortage)
        stocks, stock_result = preprocessor.load_stock(stock)
        routes = preprocessor.load_transport(transport)
        safety_stocks = preprocessor.load_safety_stock(safety)

        original_total_shortage = sum(s.shortage_qty for s in shortages)

        console.print(f"✅ 已加载 {len(shortages)} 条缺货记录")
        console.print(f"✅ 已加载 {len(stocks)} 条库存记录")
        console.print(f"✅ 已加载 {len(routes)} 条运输路线")
        console.print(f"✅ 已加载 {len(safety_stocks)} 条安全库存配置")

        process_result = ProcessResult()
        process_result.warnings.extend(shortage_result.warnings)
        process_result.warnings.extend(stock_result.warnings)
        process_result.duplicate_records.extend(shortage_result.duplicate_records)
        process_result.duplicate_records.extend(stock_result.duplicate_records)
        process_result.unmatched_skus.extend(shortage_result.unmatched_skus)
        process_result.unmatched_skus.extend(stock_result.unmatched_skus)

        safety_map: Dict[str, int] = {}
        for s in safety_stocks:
            canonical = preprocessor.normalize_sku(s.sku)
            safety_map[canonical] = s.safety_qty

        self_allocations, self_unmet, remaining_shortages = (
            preprocessor.process_self_allocation(
                shortages, stocks, safety_map, process_result
            )
        )

        if self_allocations:
            console.print(
                f"ℹ️  检测到 {len(self_allocations)} 处门店内部调拨，已优先处理"
            )

        algorithm = AllocationAlgorithm(
            max_transport_days=max_transport_days,
            min_transfer_qty=min_transfer_qty,
        )

        allocations, unmet_records = algorithm.match(
            remaining_shortages, stocks, routes, safety_map, process_result
        )

        all_allocations = self_allocations + allocations
        all_unmet = self_unmet + unmet_records

        total_shortage_qty = original_total_shortage
        total_allocated_qty = sum(a.suggested_qty for a in all_allocations)
        total_unmet_qty = max(0, original_total_shortage - total_allocated_qty)
        fill_rate = (
            total_allocated_qty / total_shortage_qty
        ) if total_shortage_qty > 0 else 0.0

        batch_id = _generate_batch_id()
        batch_output_dir = os.path.join(output, batch_id)

        batch_info = BatchInfo(
            batch_id=batch_id,
            created_at=datetime.now(),
            shortage_file=os.path.abspath(shortage),
            stock_file=os.path.abspath(stock),
            transport_file=os.path.abspath(transport),
            safety_file=os.path.abspath(safety),
            sku_alias_file=os.path.abspath(sku_alias) if sku_alias else "",
            total_shortage_qty=total_shortage_qty,
            total_allocated_qty=total_allocated_qty,
            total_unmet_qty=total_unmet_qty,
            fill_rate=fill_rate,
            status="generated",
        )

        exporter = ResultExporter(batch_output_dir)
        result_files = exporter.export_all(
            all_allocations, all_unmet, process_result, batch_info
        )

        console.print("\n")
        console.print(Panel.fit(
            f"[bold green]调拨建议生成完成！[/bold green]\n\n"
            f"批次ID: [cyan]{batch_id}[/cyan]\n"
            f"输出目录: [cyan]{batch_output_dir}[/cyan]\n\n"
            f"📊 汇总统计:\n"
            f"  总缺货数量: {total_shortage_qty:>10,}\n"
            f"  建议调拨数量: {total_allocated_qty:>10,}\n"
            f"  未满足数量: {total_unmet_qty:>10,}\n"
            f"  满足率: {fill_rate:>14.2%}\n\n"
            f"📄 输出文件:\n"
            + "\n".join(f"  - {os.path.basename(f)}" for f in result_files.values() if f),
            border_style="green",
        ))

        if process_result.warnings:
            console.print(Panel.fit(
                f"[yellow]⚠️  警告信息 ({len(process_result.warnings)} 条):[/yellow]\n"
                + "\n".join(f"  - {w}" for w in process_result.warnings[:10]),
                border_style="yellow",
            ))

        if process_result.unmatched_skus:
            console.print(Panel.fit(
                f"[red]❌ 无法匹配的SKU ({len(process_result.unmatched_skus)} 个):[/red]\n"
                + "\n".join(f"  - {s}" for s in process_result.unmatched_skus[:10]),
                border_style="red",
            ))

    except Exception as e:
        logger.exception("生成调拨建议失败")
        console.print(Panel.fit(
            f"[bold red]生成失败: {str(e)}[/bold red]",
            border_style="red",
        ))
        sys.exit(1)


@cli.command()
@click.argument("batch_dir", type=click.Path(exists=True))
def show(batch_dir: str):
    """查看调拨单详情"""

    try:
        batch_info = ResultExporter.load_batch_info(batch_dir)
        allocations = ResultExporter.load_allocations(batch_dir)

        console.print(Panel.fit(
            f"[bold blue]批次详情[/bold blue]\n"
            f"批次ID: {batch_info.batch_id}\n"
            f"生成时间: {batch_info.created_at}\n"
            f"状态: {batch_info.status}\n"
            f"总缺货: {batch_info.total_shortage_qty:,}\n"
            f"已调拨: {batch_info.total_allocated_qty:,}\n"
            f"满足率: {batch_info.fill_rate:.2%}",
            border_style="blue",
        ))

        if not allocations:
            console.print("[yellow]该批次无调拨记录[/yellow]")
            return

        table = Table(title="调拨单列表", show_lines=True)
        table.add_column("调拨单号", style="cyan", no_wrap=True)
        table.add_column("调出", style="magenta")
        table.add_column("调入", style="green")
        table.add_column("SKU", style="yellow")
        table.add_column("建议数量", justify="right")
        table.add_column("实际数量", justify="right")
        table.add_column("运输天数", justify="right")
        table.add_column("优先级", justify="right")
        table.add_column("状态", style="bold")

        for alloc in allocations[:50]:
            status_style = "green" if alloc.status == "filled" else (
                "red" if alloc.status == "rejected" else "yellow"
            )
            table.add_row(
                alloc.allocation_id,
                alloc.from_store_name,
                alloc.to_store_name,
                alloc.sku_name,
                f"{alloc.suggested_qty:,}",
                f"{alloc.actual_qty:,}",
                str(alloc.transport_days),
                str(alloc.priority),
                f"[{status_style}]{alloc.status}[/{status_style}]",
            )

        console.print(table)

        if len(allocations) > 50:
            console.print(f"... 还有 {len(allocations) - 50} 条记录，详情请查看CSV文件")

    except Exception as e:
        logger.exception("查看调拨单失败")
        console.print(Panel.fit(
            f"[bold red]查看失败: {str(e)}[/bold red]",
            border_style="red",
        ))
        sys.exit(1)


@cli.command()
@click.argument("batch_dir", type=click.Path(exists=True))
@click.option("--actual", required=True, type=click.Path(exists=True), help="实际调拨CSV文件路径")
def fill(batch_dir: str, actual: str):
    """回填实际调拨量"""

    console.print(Panel.fit(
        "[bold blue]调拨回填[/bold blue]\n"
        "正在处理实际调拨数据...",
        border_style="blue",
    ))

    try:
        filler = AllocationFiller(batch_dir)
        results = filler.process_fill(actual)

        batch_info = ResultExporter.load_batch_info(batch_dir)
        allocations = ResultExporter.load_allocations(batch_dir)

        total_suggested = sum(a.suggested_qty for a in allocations)
        total_actual = sum(a.actual_qty for a in allocations)
        execution_rate = (
            total_actual / total_suggested) if total_suggested > 0 else 0.0
        unexecuted = sum(1 for a in allocations if a.actual_qty == 0)

        console.print("\n")
        console.print(Panel.fit(
            f"[bold green]回填完成！[/bold green]\n\n"
            f"📊 执行统计:\n"
            f"  建议调拨数量: {total_suggested:>10,}\n"
            f"  实际调拨数量: {total_actual:>10,}\n"
            f"  执行率: {execution_rate:>14.2%}\n"
            f"  未执行单数: {unexecuted:>10}\n"
            f"  最终满足率: {batch_info.fill_rate:>14.2%}\n\n"
            f"📄 更新文件:\n"
            + "\n".join(f"  - {os.path.basename(f)}" for f in results.values() if f),
            border_style="green",
        ))

    except Exception as e:
        logger.exception("回填失败")
        console.print(Panel.fit(
            f"[bold red]回填失败: {str(e)}[/bold red]",
            border_style="red",
        ))
        sys.exit(1)


@cli.command()
@click.argument("batch_dir", type=click.Path(exists=True))
def review(batch_dir: str):
    """运营复盘分析"""

    console.print(Panel.fit(
        "[bold blue]调拨复盘分析[/bold blue]\n"
        "正在生成复盘报告...",
        border_style="blue",
    ))

    try:
        reviewer = AllocationReviewer(batch_dir)
        review = reviewer.generate_review_report()

        s = review["summary"]

        console.print("\n")
        console.print(Panel.fit(
            f"[bold green]复盘完成！[/bold green]\n\n"
            f"📊 总体情况:\n"
            f"  总缺货数量: {s['total_shortage']:>10,}\n"
            f"  建议调拨数量: {s['total_suggested']:>10,}\n"
            f"  实际调拨数量: {s['total_actual']:>10,}\n"
            f"  执行率: {s['execution_rate']:>14.2%}\n"
            f"  整体满足率: {s['fill_rate']:>14.2%}\n"
            f"  最终未满足: {s['total_unmet']:>10,}\n",
            border_style="green",
        ))

        ue = review["unexecuted_analysis"]
        if ue["total_count"] > 0:
            console.print(Panel.fit(
                f"[bold yellow]未执行调拨分析 ({ue['total_count']} 笔, {ue['total_qty']:,} 件)[/bold yellow]\n\n"
                + "\n".join(
                    f"  {reason}: {count} 笔"
                    for reason, count in ue["reasons"].items()
                ),
                border_style="yellow",
            ))

        um = review["unmet_analysis"]
        if um["total_qty"] > 0:
            console.print(Panel.fit(
                f"[bold red]未满足缺货分析 ({um['total_qty']:,} 件)[/bold red]\n\n"
                + "\n".join(
                    f"  {reason}: {qty:,} 件"
                    for reason, qty in um["reasons"].items()
                ),
                border_style="red",
            ))

        console.print(Panel.fit(
            "[bold cyan]改进建议[/bold cyan]\n\n"
            + "\n".join(
                f"{i}. {s}"
                for i, s in enumerate(review["improvement_suggestions"], 1)
            ),
            border_style="cyan",
        ))

        console.print(
            f"\n📄 详细报告已生成: "
            f"[cyan]{os.path.join(batch_dir, 'review_report.txt')}[/cyan]"
        )

    except Exception as e:
        logger.exception("复盘失败")
        console.print(Panel.fit(
            f"[bold red]复盘失败: {str(e)}[/bold red]",
            border_style="red",
        ))
        sys.exit(1)


if __name__ == "__main__":
    cli()
