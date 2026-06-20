import os
from collections import defaultdict
from datetime import date
from typing import Dict, List

import pandas as pd

from .models import MergeResult, MergedPurchaseItem, AnomalyType, UrgencyLevel


def _fmt_qty(v: float) -> str:
    if v == int(v):
        return str(int(v))
    return f"{v:g}"


def _fmt_date(d) -> str:
    if d is None:
        return ""
    if isinstance(d, date):
        return d.isoformat()
    return str(d)


def _fmt_money(v) -> str:
    if v is None:
        return ""
    return f"{v:.2f}"


def export_supplier_purchase_orders(result: MergeResult, output_dir: str) -> List[str]:
    """按供应商分别导出采购单（Excel），返回生成的文件列表"""
    os.makedirs(output_dir, exist_ok=True)
    generated_files: List[str] = []

    supplier_groups: Dict[str, List[MergedPurchaseItem]] = defaultdict(list)
    for item in result.merged_items:
        supplier = item.supplier or "未指定供应商"
        supplier_groups[supplier].append(item)

    for supplier, items in supplier_groups.items():
        safe_name = supplier.replace("/", "_").replace("\\", "_").strip() or "未指定供应商"
        file_path = os.path.join(output_dir, f"采购单_{safe_name}_{date.today().isoformat()}.xlsx")

        rows = []
        for idx, item in enumerate(items, 1):
            style_qty_parts = [
                f"{sn}:{_fmt_qty(q)}" for sn, q in sorted(item.source_quantities.items())
            ]
            rows.append({
                "序号": idx,
                "物料类别": item.material_category.value,
                "物料名称": item.material_name,
                "颜色": item.color,
                "规格": item.spec_normalized,
                "原始规格(参考)": " / ".join(item.original_specs),
                "采购数量": item.total_quantity,
                "单位": item.unit,
                "MOQ": item.moq,
                "MOQ是否满足": "是" if item.is_moq_satisfied else f"否(缺{_fmt_qty(item.moq_shortfall)})",
                "单价(元)": item.unit_price,
                "金额(元)": item.unit_price * item.total_quantity if item.unit_price else None,
                "交期": _fmt_date(item.delivery_date),
                "紧急程度": item.urgency.value,
                "对应款式": ", ".join(item.source_styles),
                "款式明细": "; ".join(style_qty_parts),
                "备注说明": " | ".join(item.remarks),
            })

        df = pd.DataFrame(rows)

        with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="采购明细", index=False)

            summary_rows = [
                {"项目": "供应商", "内容": supplier},
                {"项目": "导出日期", "内容": date.today().isoformat()},
                {"项目": "物料品种数", "内容": len(items)},
                {"项目": "采购总数量", "内容": _fmt_qty(sum(i.total_quantity for i in items))},
                {"项目": "预估总金额(元)", "内容": _fmt_money(
                    sum(i.unit_price * i.total_quantity for i in items if i.unit_price)
                )},
            ]
            summary_df = pd.DataFrame(summary_rows)
            summary_df.to_excel(writer, sheet_name="汇总", index=False)

        generated_files.append(file_path)

    return generated_files


def export_anomaly_report(result: MergeResult, output_path: str) -> str:
    """导出具常报告给跟单确认"""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    rows = []
    for idx, a in enumerate(result.anomalies, 1):
        rows.append({
            "序号": idx,
            "异常类型": a.anomaly_type.value,
            "严重程度": a.severity,
            "涉及款式": ", ".join(a.related_style_nos),
            "物料": a.related_material,
            "规格": a.related_spec,
            "颜色": a.related_color,
            "问题描述": a.description,
            "处理建议": a.suggestion or "",
            "详细信息": str(a.details) if a.details else "",
        })

    df = pd.DataFrame(rows)
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="异常明细", index=False)

        counts = result.summary.get("anomaly_counts", {})
        summary_rows = [{"异常类型": k, "数量": v} for k, v in counts.items()]
        summary_df = pd.DataFrame(summary_rows)
        summary_df.to_excel(writer, sheet_name="异常汇总", index=False)

    return output_path


def export_style_gap_report(result: MergeResult, output_path: str) -> str:
    """导出款式辅料缺口报告（供生产排期判断）"""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    rows = []
    for idx, gap in enumerate(sorted(result.style_gaps, key=lambda g: (
        {UrgencyLevel.RUSH: 0, UrgencyLevel.URGENT: 1, UrgencyLevel.NORMAL: 2}[g.urgency],
        g.style_no,
    )), 1):
        rows.append({
            "序号": idx,
            "紧急程度": gap.urgency.value,
            "款号": gap.style_no,
            "款名": gap.style_name or "",
            "物料名称": gap.material_name,
            "颜色": gap.color,
            "规格": gap.spec_normalized,
            "需求数量": gap.required_qty,
            "可供应数量": gap.available_qty,
            "缺口数量": gap.gap_qty,
            "单位": gap.unit,
            "缺口原因": gap.reason,
            "预计到货日期": _fmt_date(gap.delivery_date),
            "能否按期开款": "否" if gap.gap_qty > 0 or ("MOQ" in gap.reason) else "待确认",
        })

    df = pd.DataFrame(rows)
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="款式缺口明细", index=False)

        if not df.empty:
            blocked_styles = df[
                (df["缺口数量"] > 0) | (df["缺口原因"].str.contains("MOQ|交期延后", na=False))
            ]["款号"].unique().tolist()
            style_summary_rows = []
            for style_no in sorted(df["款号"].unique()):
                style_rows = df[df["款号"] == style_no]
                total_gap = style_rows["缺口数量"].sum()
                can_proceed = total_gap == 0 and not style_rows["缺口原因"].str.contains("MOQ|交期延后", na=False).any()
                style_summary_rows.append({
                    "款号": style_no,
                    "款名": style_rows.iloc[0]["款名"],
                    "涉及辅料数": len(style_rows),
                    "总缺口数量": total_gap,
                    "能否按期开款": "是" if can_proceed else ("否" if style_no in blocked_styles else "待确认"),
                    "主要问题": " | ".join(style_rows["缺口原因"].unique().tolist()),
                })
            pd.DataFrame(style_summary_rows).to_excel(writer, sheet_name="款式排期判断", index=False)

    return output_path


def export_all(result: MergeResult, output_dir: str) -> Dict[str, List[str]]:
    """导出全部报告，返回各类型文件路径"""
    os.makedirs(output_dir, exist_ok=True)
    today = date.today().isoformat()

    supplier_files = export_supplier_purchase_orders(result, os.path.join(output_dir, "供应商采购单"))
    anomaly_file = export_anomaly_report(result, os.path.join(output_dir, f"异常报告_{today}.xlsx"))
    gap_file = export_style_gap_report(result, os.path.join(output_dir, f"款式辅料缺口报告_{today}.xlsx"))

    return {
        "supplier_purchase_orders": supplier_files,
        "anomaly_report": [anomaly_file],
        "style_gap_report": [gap_file],
    }


def print_summary(result: MergeResult) -> None:
    """在终端打印归并结果摘要"""
    import click

    s = result.summary
    click.echo("")
    click.echo("=" * 60)
    click.echo("📊 归并结果摘要")
    click.echo("=" * 60)
    click.echo(f"  原始需求记录:   {s.get('total_raw_records', 0)} 条")
    click.echo(f"  涉及款式数量:   {s.get('total_styles', 0)} 款")
    click.echo(f"  合并后采购条目: {s.get('total_merged_items', 0)} 条")
    click.echo(f"  异常记录总数:   {s.get('total_anomalies', 0)} 条")
    if s.get("below_moq_count"):
        click.echo(f"  ⚠️  低于MOQ条目: {s['below_moq_count']} 条")
    if s.get("delivery_issue_count"):
        click.echo(f"  ⚠️  交期问题条目: {s['delivery_issue_count']} 条")
    click.echo(f"  款式辅料缺口:   {s.get('total_style_gaps', 0)} 条")

    counts = s.get("anomaly_counts", {})
    if counts:
        click.echo("")
        click.echo("  异常类型分布:")
        for k, v in sorted(counts.items()):
            click.echo(f"    - {k}: {v}")
    click.echo("=" * 60)
