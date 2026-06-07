"""轮灌调度核心算法"""

from __future__ import annotations

from typing import List, Tuple
from datetime import datetime, timedelta

from .models import (
    Plot, IrrigationRule, RotationGroup, PlotResult,
    PlotStatus, ScheduleResult, BatchInfo,
)


def _plot_matches_rule(plot: Plot, rule: IrrigationRule) -> bool:
    """判断地块是否匹配规则筛选条件"""
    if rule.crop_filter is not None:
        if plot.crop_type not in rule.crop_filter:
            return False
    if rule.district_filter is not None:
        if plot.district not in rule.district_filter:
            return False
    return True


def _find_applicable_rules(plot: Plot, rules: List[IrrigationRule]) -> List[IrrigationRule]:
    """找出地块适用的所有规则"""
    return [r for r in rules if _plot_matches_rule(plot, r)]


def _can_add_to_group(plot: Plot, group: RotationGroup, rule: IrrigationRule) -> bool:
    """判断地块能否加入当前轮灌组（不超限）"""
    if group.plot_count + 1 > rule.max_plots:
        return False
    if group.total_area + plot.area > rule.max_area:
        return False
    if group.total_water + plot.total_water > rule.max_water:
        return False
    return True


def _parse_date(date_str: str) -> datetime | None:
    """解析日期字符串"""
    if not date_str:
        return None
    for fmt in ["%Y-%m-%d", "%Y/%m/%d"]:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def generate_schedule(
    plots: List[Plot],
    rules: List[IrrigationRule],
    batch_name: str = "",
) -> ScheduleResult:
    """
    生成轮灌计划

    算法思路：
    1. 按优先级和片区排序地块（高优先级、同片区优先分配到一组）
    2. 为每个地块找到适用规则，优先匹配限制更严格的规则
    3. 使用贪心算法将地块分配到轮灌组，依次填满
    4. 无法匹配任何规则或超限时标记为失败/复核
    """
    batch_id = BatchInfo.generate_id()
    input_hash = BatchInfo.compute_hash(plots, rules)
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    batch = BatchInfo(
        batch_id=batch_id,
        batch_name=batch_name or f"轮灌批次-{batch_id}",
        created_at=created_at,
        input_hash=input_hash,
        source_files=sorted(set(p.source_file for p in plots)),
    )

    plot_results: List[PlotResult] = []
    groups: List[RotationGroup] = []
    warnings: List[str] = []

    sorted_plots = sorted(
        plots,
        key=lambda p: (p.priority, p.district, p.crop_type, p.plot_id)
    )

    rule_groups: dict[str, List[RotationGroup]] = {}
    rule_sequence: dict[str, int] = {}

    for rule in rules:
        rule_groups[rule.group_name] = []
        rule_sequence[rule.group_name] = 0

    unassigned: List[Tuple[Plot, str]] = []

    for plot in sorted_plots:
        applicable_rules = _find_applicable_rules(plot, rules)

        if not applicable_rules:
            unassigned.append((plot, "无匹配的轮灌规则"))
            continue

        assigned = False
        for rule in applicable_rules:
            current_groups = rule_groups[rule.group_name]
            for group in current_groups:
                if _can_add_to_group(plot, group, rule):
                    group.plots.append(plot)
                    assigned = True
                    break
            if assigned:
                break

            if not assigned:
                current_group_count = rule_sequence[rule.group_name]
                if current_group_count >= rule.max_groups:
                    continue

                seq = current_group_count + 1
                rule_sequence[rule.group_name] = seq
                group_id = f"{rule.group_name}-G{seq:03d}"
                new_group = RotationGroup(
                    group_id=group_id,
                    group_name=rule.group_name,
                    sequence=seq,
                    plots=[plot],
                )
                rule_groups[rule.group_name].append(new_group)
                groups.append(new_group)
                assigned = True
                break

        if not assigned:
            unassigned.append((plot, "所有适用规则均已超限"))

    global_sequence = 0
    for rule in rules:
        rule_groups_list = rule_groups[rule.group_name]
        if not rule_groups_list:
            continue

        base_date = _parse_date(rule.start_date) or datetime.now()
        base_date = base_date.replace(hour=8, minute=0, second=0, microsecond=0)

        for idx, group in enumerate(rule_groups_list):
            global_sequence += 1
            group.sequence = global_sequence

            start_dt = base_date + timedelta(days=idx * rule.interval_days)
            end_dt = start_dt + timedelta(hours=rule.duration_hours)

            group.start_time = start_dt.strftime("%Y-%m-%d %H:%M")
            group.end_time = end_dt.strftime("%Y-%m-%d %H:%M")

            group.group_id = f"{rule.group_name}-G{global_sequence:03d}"

            for plot in group.plots:
                result = PlotResult(
                    plot_id=plot.plot_id,
                    plot_name=plot.plot_name,
                    status=PlotStatus.SUCCESS,
                    group_id=group.group_id,
                    group_name=group.group_name,
                    sequence=group.sequence,
                    start_time=group.start_time,
                    end_time=group.end_time,
                )
                plot_results.append(result)

    for plot, reason in unassigned:
        is_review = (
            reason == "无匹配的轮灌规则"
            and any(r.crop_filter or r.district_filter for r in rules)
        )
        status = PlotStatus.REVIEW if is_review else PlotStatus.FAILED
        result = PlotResult(
            plot_id=plot.plot_id,
            plot_name=plot.plot_name,
            status=status,
            error_reason=reason if not is_review else "",
            review_reason=reason if is_review else "",
        )
        plot_results.append(result)

    if unassigned:
        warnings.append(f"有 {len(unassigned)} 个地块未能成功分配")

    plot_results.sort(key=lambda r: (
        0 if r.status == PlotStatus.SUCCESS else 1,
        r.sequence if r.sequence else 99999,
        r.plot_id,
    ))

    return ScheduleResult(
        batch=batch,
        status=TaskStatus.GENERATED if plot_results else TaskStatus.FAILED,
        groups=groups,
        plot_results=plot_results,
        warnings=warnings,
    )


from .models import TaskStatus  # noqa: E402
