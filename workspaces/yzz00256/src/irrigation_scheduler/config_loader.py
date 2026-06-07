"""配置加载与解析"""

from __future__ import annotations

import csv
import os
from typing import List, Tuple
import yaml

from .models import Plot, IrrigationRule, Snapshot


REQUIRED_CSV_COLUMNS = [
    "plot_id", "plot_name", "area", "crop_type",
    "district", "water_requirement",
]


def load_plots_from_csv(csv_path: str) -> Tuple[List[Plot], List[str]]:
    """从CSV加载地块列表，返回 (地块列表, 错误列表)"""
    plots: List[Plot] = []
    errors: List[str] = []

    if not os.path.exists(csv_path):
        return plots, [f"地块清单文件不存在: {csv_path}"]

    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []

        missing = [c for c in REQUIRED_CSV_COLUMNS if c not in headers]
        if missing:
            return plots, [f"CSV缺少必要列: {', '.join(missing)}"]

        for line_num, row in enumerate(reader, start=2):
            try:
                plot = Plot(
                    plot_id=str(row["plot_id"]).strip(),
                    plot_name=str(row["plot_name"]).strip(),
                    area=float(row["area"]),
                    crop_type=str(row["crop_type"]).strip(),
                    district=str(row["district"]).strip(),
                    water_requirement=float(row["water_requirement"]),
                    priority=int(row.get("priority", 3) or 3),
                    source_file=os.path.basename(csv_path),
                    source_line=line_num,
                )
                plots.append(plot)
            except (ValueError, KeyError) as e:
                errors.append(
                    f"第{line_num}行解析失败: {str(e)} | 原始行: {row}"
                )

    return plots, errors


def load_rules_from_yaml(yaml_path: str) -> Tuple[List[IrrigationRule], List[str]]:
    """从YAML加载轮灌规则，返回 (规则列表, 错误列表)"""
    rules: List[IrrigationRule] = []
    errors: List[str] = []

    if not os.path.exists(yaml_path):
        return rules, [f"规则配置文件不存在: {yaml_path}"]

    try:
        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        return rules, [f"YAML解析失败: {str(e)}"]

    if not data or "rules" not in data:
        return rules, ["配置文件缺少 'rules' 节点"]

    for idx, rule_data in enumerate(data["rules"]):
        try:
            rule = IrrigationRule(
                group_name=rule_data["group_name"],
                max_plots=int(rule_data.get("max_plots", 10)),
                max_area=float(rule_data.get("max_area", 500.0)),
                max_water=float(rule_data.get("max_water", 20000.0)),
                duration_hours=float(rule_data.get("duration_hours", 8.0)),
                start_date=str(rule_data.get("start_date", "")),
                interval_days=int(rule_data.get("interval_days", 7)),
                max_groups=int(rule_data.get("max_groups", 100)),
                crop_filter=rule_data.get("crop_filter"),
                district_filter=rule_data.get("district_filter"),
            )
            rules.append(rule)
        except (KeyError, ValueError, TypeError) as e:
            errors.append(f"第{idx+1}条规则解析失败: {str(e)}")

    return rules, errors


def load_snapshot(snapshot_path: str) -> Tuple[Snapshot | None, List[str]]:
    """加载历史快照"""
    import json
    errors: List[str] = []

    if not os.path.exists(snapshot_path):
        return None, errors

    try:
        with open(snapshot_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return Snapshot.from_dict(data), errors
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        return None, [f"快照文件解析失败: {str(e)}"]


def validate_plots(plots: List[Plot]) -> List[str]:
    """校验地块数据质量"""
    errors: List[str] = []
    seen_ids = set()

    for p in plots:
        if not p.plot_id:
            errors.append(f"地块ID不能为空 (来源: {p.source_file}:{p.source_line})")
            continue
        if p.plot_id in seen_ids:
            errors.append(f"地块ID重复: {p.plot_id} (来源: {p.source_file}:{p.source_line})")
        seen_ids.add(p.plot_id)

        if not p.plot_name:
            errors.append(f"地块名称不能为空: {p.plot_id}")
        if p.area <= 0:
            errors.append(f"地块面积必须大于0: {p.plot_id} (面积={p.area})")
        if p.water_requirement <= 0:
            errors.append(f"每亩需水量必须大于0: {p.plot_id}")
        if not p.crop_type:
            errors.append(f"作物类型不能为空: {p.plot_id}")
        if not p.district:
            errors.append(f"片区不能为空: {p.plot_id}")
        if p.priority < 1 or p.priority > 5:
            errors.append(f"优先级必须在1-5之间: {p.plot_id} (当前={p.priority})")

    return errors


def validate_rules(rules: List[IrrigationRule]) -> List[str]:
    """校验规则数据质量"""
    errors: List[str] = []
    seen_names = set()

    if not rules:
        errors.append("规则列表不能为空")
        return errors

    for r in rules:
        if not r.group_name:
            errors.append("规则组名不能为空")
            continue
        if r.group_name in seen_names:
            errors.append(f"规则组名重复: {r.group_name}")
        seen_names.add(r.group_name)

        if r.max_plots <= 0:
            errors.append(f"每组最大地块数必须大于0: {r.group_name}")
        if r.max_area <= 0:
            errors.append(f"每组最大面积必须大于0: {r.group_name}")
        if r.max_water <= 0:
            errors.append(f"每组最大用水量必须大于0: {r.group_name}")
        if r.duration_hours <= 0:
            errors.append(f"灌溉时长必须大于0: {r.group_name}")
        if r.interval_days <= 0:
            errors.append(f"轮灌间隔必须大于0: {r.group_name}")
        if r.max_groups <= 0:
            errors.append(f"最大组数必须大于0: {r.group_name}")
        if r.crop_filter is not None and len(r.crop_filter) == 0:
            errors.append(f"作物筛选列表为空: {r.group_name}")
        if r.district_filter is not None and len(r.district_filter) == 0:
            errors.append(f"片区筛选列表为空: {r.group_name}")

    return errors
