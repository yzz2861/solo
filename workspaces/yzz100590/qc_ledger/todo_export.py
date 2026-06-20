from collections import defaultdict
from datetime import datetime
from typing import List
import os
import pandas as pd
from tabulate import tabulate
from .models import MergedRecord, STATUS_PENDING, STATUS_REWORKING


def generate_team_todo_list(
    merged: List[MergedRecord],
    output_path: str = None,
) -> dict:
    pending_records = [r for r in merged if r.status in (STATUS_PENDING, STATUS_REWORKING)]
    pending_records.sort(key=lambda r: (r.responsible_team, r.defect_date or datetime.min))

    team_groups: dict = defaultdict(list)
    for r in pending_records:
        team_groups[r.responsible_team].append(r)

    output = {}

    for team, records in sorted(team_groups.items()):
        records.sort(key=lambda r: r.defect_date or datetime.min)

        lines = []
        lines.append("=" * 70)
        lines.append(f"              {team} - 待处理不合格清单")
        lines.append("=" * 70)
        lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"  待处理数量: {len(records)} 条，共 {sum(r.quantity for r in records)} 件")
        lines.append("")
        lines.append("-" * 70)

        table = []
        for idx, r in enumerate(records, 1):
            urgency = "紧急" if (
                r.defect_date and (datetime.now() - r.defect_date).days > 3
            ) else "正常"
            table.append([
                idx,
                r.batch_no,
                r.process,
                r.defect_item,
                r.defect_date.strftime("%Y-%m-%d") if r.defect_date else "-",
                r.quantity,
                r.status,
                urgency,
                r.inspector or "-",
            ])

        if table:
            lines.append(tabulate(
                table,
                headers=["序号", "批次号", "工序", "不合格项", "发现日期", "数量", "状态", "紧急度", "检验员"],
                tablefmt="simple",
            ))
        else:
            lines.append("  （无待处理项）")

        lines.append("")
        lines.append("-" * 70)
        lines.append("  处理要求:")
        lines.append("    1. 请在3个工作日内完成返工并提交复检")
        lines.append("    2. 让步接收需提前申请审批")
        lines.append("    3. 处理完成后请通知质检员复检")
        lines.append("")
        lines.append("=" * 70)

        output[team] = "\n".join(lines)

    if output_path:
        ext = os.path.splitext(output_path)[1].lower()
        if ext in [".xlsx", ".xls"]:
            _export_team_excel(team_groups, output_path)
        else:
            base, _ = os.path.splitext(output_path)
            for team, content in output.items():
                safe_team = team.replace("/", "_").replace("\\", "_")
                team_path = f"{base}_{safe_team}.txt"
                with open(team_path, "w", encoding="utf-8") as f:
                    f.write(content)

    return output


def _export_team_excel(team_groups: dict, output_path: str):
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        all_data = []
        for team, records in sorted(team_groups.items()):
            for r in records:
                urgency = "紧急" if (
                    r.defect_date and (datetime.now() - r.defect_date).days > 3
                ) else "正常"
                all_data.append({
                    "责任班组": team,
                    "批次号": r.batch_no,
                    "工序": r.process,
                    "不合格项": r.defect_item,
                    "发现日期": r.defect_date.strftime("%Y-%m-%d") if r.defect_date else "",
                    "数量": r.quantity,
                    "状态": r.status,
                    "紧急度": urgency,
                    "检验员": r.inspector,
                    "备注": r.defect_remark,
                })

        if all_data:
            pd.DataFrame(all_data).to_excel(writer, sheet_name="汇总", index=False)

        for team, records in sorted(team_groups.items()):
            safe_team = team[:30].replace("/", "_").replace("\\", "_").replace("?", "_").replace("*", "_").replace("[", "_").replace("]", "_").replace(":", "_")
            team_data = []
            for idx, r in enumerate(records, 1):
                urgency = "紧急" if (
                    r.defect_date and (datetime.now() - r.defect_date).days > 3
                ) else "正常"
                team_data.append({
                    "序号": idx,
                    "批次号": r.batch_no,
                    "工序": r.process,
                    "不合格项": r.defect_item,
                    "发现日期": r.defect_date.strftime("%Y-%m-%d") if r.defect_date else "",
                    "数量": r.quantity,
                    "状态": r.status,
                    "紧急度": urgency,
                    "检验员": r.inspector,
                    "备注": r.defect_remark,
                })
            pd.DataFrame(team_data).to_excel(writer, sheet_name=safe_team, index=False)


def print_team_summary(team_outputs: dict):
    if not team_outputs:
        print("所有班组均无待处理项 ✅")
        return

    print("\n" + "=" * 60)
    print("              各班组待处理汇总")
    print("=" * 60)

    summary = []
    for team, content in team_outputs.items():
        lines = content.split("\n")
        qty_line = [l for l in lines if "待处理数量" in l]
        summary.append([team, qty_line[0].split("待处理数量: ")[1] if qty_line else "-"])

    print(tabulate(summary, headers=["班组", "待处理情况"], tablefmt="simple"))
    print()
