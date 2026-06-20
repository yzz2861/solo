from datetime import date
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from .models import (
    MergeResult, MergedPurchaseItem, AnomalyRecord, AnomalyType,
    PurchaseRequirement, UrgencyLevel
)


DEFAULT_MOQ: Dict[str, float] = {
    "纽扣": 500.0,
    "拉链": 200.0,
    "吊牌": 1000.0,
    "商标": 3000.0,
    "线": 10.0,
    "织带": 500.0,
    "扣具": 300.0,
    "其他": 100.0,
}


def _get_default_moq(category_value: str) -> float:
    return DEFAULT_MOQ.get(category_value, DEFAULT_MOQ["其他"])


def validate_moq(result: MergeResult) -> None:
    """校验所有归并条目的最小起订量，更新条目状态并补充异常记录"""
    for item in result.merged_items:
        effective_moq = item.moq if item.moq is not None else _get_default_moq(item.material_category.value)
        item.moq = effective_moq

        if item.total_quantity < effective_moq:
            item.is_moq_satisfied = False
            item.moq_shortfall = effective_moq - item.total_quantity

            anomaly = AnomalyRecord(
                anomaly_type=AnomalyType.BELOW_MOQ,
                description=(
                    f"{item.material_name} ({item.color} {item.spec_normalized}) "
                    f"合并数量 {item.total_quantity}{item.unit} 低于MOQ {effective_moq}{item.unit}，"
                    f"还差 {item.moq_shortfall}{item.unit}"
                ),
                related_style_nos=item.source_styles,
                related_material=item.material_name,
                related_spec=item.spec_normalized,
                related_color=item.color,
                severity="error",
                suggestion=(
                    f"建议追加数量至{effective_moq}{item.unit}，或与供应商{_get_supplier_name(item)}确认是否可小批量下单"
                ),
                details={
                    "merged_qty": item.total_quantity,
                    "moq": effective_moq,
                    "shortfall": item.moq_shortfall,
                    "unit": item.unit,
                    "source_styles": item.source_styles,
                },
            )
            result.anomalies.append(anomaly)
            item.anomalies.append(anomaly)
        else:
            item.is_moq_satisfied = True
            item.moq_shortfall = 0.0


def _get_supplier_name(item: MergedPurchaseItem) -> str:
    return item.supplier or "（未指定）"


def validate_delivery(result: MergeResult, today: Optional[date] = None) -> None:
    """校验交期冲突"""
    from datetime import date as _date
    if today is None:
        today = _date.today()

    supplier_items: Dict[str, List[MergedPurchaseItem]] = defaultdict(list)
    for item in result.merged_items:
        key = (item.supplier or "未指定", item.delivery_date.isoformat() if item.delivery_date else "无交期")
        supplier_items[key].append(item)

    for (supplier, delivery_str), items in supplier_items.items():
        if delivery_str == "无交期":
            for item in items:
                anomaly = AnomalyRecord(
                    anomaly_type=AnomalyType.MISSING_FIELD,
                    description=f"{item.material_name} ({item.color} {item.spec_normalized}) 未填写交期",
                    related_style_nos=item.source_styles,
                    related_material=item.material_name,
                    related_spec=item.spec_normalized,
                    related_color=item.color,
                    severity="warning",
                    suggestion="请补充交货日期以便排产",
                )
                result.anomalies.append(anomaly)
                item.anomalies.append(anomaly)
            continue

        delivery_date = date.fromisoformat(delivery_str)
        if delivery_date < today:
            for item in items:
                anomaly = AnomalyRecord(
                    anomaly_type=AnomalyType.DELIVERY_CONFLICT,
                    description=f"{item.material_name} ({item.color} {item.spec_normalized}) 交期{delivery_date}已过",
                    related_style_nos=item.source_styles,
                    related_material=item.material_name,
                    related_spec=item.spec_normalized,
                    related_color=item.color,
                    severity="error",
                    suggestion="交期已过，请重新确认或联系供应商催货",
                    details={"delivery_date": delivery_str, "today": today.isoformat()},
                )
                result.anomalies.append(anomaly)
                item.anomalies.append(anomaly)

    req_by_style_material: Dict[Tuple[str, str, str], List[PurchaseRequirement]] = defaultdict(list)
    for req in result.raw_requirements:
        key = (req.style_no, req.material_name, req.spec_normalized)
        req_by_style_material[key].append(req)

    for key, reqs in req_by_style_material.items():
        dates = {r.delivery_date for r in reqs if r.delivery_date}
        if len(dates) > 1:
            colors = {r.color for r in reqs}
            anomaly = AnomalyRecord(
                anomaly_type=AnomalyType.DELIVERY_CONFLICT,
                description=(
                    f"款式{key[0]} 的 {key[1]} ({key[2]}) 存在不同交期: "
                    f"{', '.join(sorted(d.isoformat() for d in dates))}；"
                    f"颜色: {', '.join(sorted(colors))}"
                ),
                related_style_nos=[key[0]],
                related_material=key[1],
                related_spec=key[2],
                related_color="多色" if len(colors) > 1 else list(colors)[0],
                severity="warning",
                suggestion="请跟单确认以哪个交期为准",
                details={"delivery_dates": [d.isoformat() for d in dates], "colors": list(colors)},
            )
            result.anomalies.append(anomaly)


def recompute_style_gaps_after_validation(result: MergeResult) -> None:
    """在MOQ和交期校验完成后，重新计算款式辅料缺口"""
    from .merger import _compute_style_gaps
    result.style_gaps = _compute_style_gaps(result.merged_items, result.raw_requirements)


def validate_all(result: MergeResult, today: Optional[date] = None) -> None:
    """执行所有校验"""
    validate_moq(result)
    validate_delivery(result, today=today)
    recompute_style_gaps_after_validation(result)

    result.summary["below_moq_count"] = sum(1 for i in result.merged_items if not i.is_moq_satisfied)
    result.summary["delivery_issue_count"] = sum(
        1 for a in result.anomalies if a.anomaly_type in (AnomalyType.DELIVERY_CONFLICT, AnomalyType.MISSING_FIELD)
    )
    result.summary["anomaly_counts"] = defaultdict(int)
    for a in result.anomalies:
        result.summary["anomaly_counts"][a.anomaly_type.value] += 1
    result.summary["anomaly_counts"] = dict(result.summary["anomaly_counts"])
