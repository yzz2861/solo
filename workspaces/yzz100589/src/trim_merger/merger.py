from collections import defaultdict
from datetime import date
from typing import Dict, List, Tuple, Optional
from dataclasses import field

from .models import (
    PurchaseRequirement, MergedPurchaseItem, MergeResult,
    AnomalyRecord, AnomalyType, StyleGap, UrgencyLevel
)
from .normalizer import normalize_color, normalize_spec, specs_are_equivalent


def _make_merge_key(req: PurchaseRequirement) -> Tuple[str, str, str, str, Optional[str]]:
    """构造归并键: (类别, 物料名, 颜色(标准化), 规格(标准化), 供应商)"""
    return (
        req.material_category.value,
        req.material_name.strip(),
        req.color,
        req.spec_normalized,
        req.supplier.strip() if req.supplier else None,
    )


def _normalize_requirements(reqs: List[PurchaseRequirement]) -> Tuple[List[PurchaseRequirement], List[AnomalyRecord]]:
    """对所有需求执行颜色和规格标准化，记录异常"""
    anomalies: List[AnomalyRecord] = []
    normalized_reqs: List[PurchaseRequirement] = []

    for req in reqs:
        std_color, color_mapped = normalize_color(req.color)
        req.color = std_color

        std_spec = normalize_spec(req.material_category.value, req.spec_raw)
        req.spec_normalized = std_spec

        if req.spec_raw and std_spec != req.spec_raw:
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.SPEC_INCONSISTENT,
                description=f"规格写法已标准化: '{req.spec_raw}' → '{std_spec}'",
                related_style_nos=[req.style_no],
                related_material=req.material_name,
                related_spec=std_spec,
                related_color=req.color,
                severity="info",
                details={"original_spec": req.spec_raw, "normalized_spec": std_spec},
            ))

        if not req.supplier:
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.UNKNOWN_SUPPLIER,
                description=f"供应商未指定，可能影响合并精度",
                related_style_nos=[req.style_no],
                related_material=req.material_name,
                related_spec=req.spec_normalized,
                related_color=req.color,
                severity="warning",
                suggestion="请确认后补充供应商信息",
            ))

        if req.swap_reason:
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.MATERIAL_SWAP,
                description=f"临时换料: {req.swap_reason}",
                related_style_nos=[req.style_no],
                related_material=req.material_name,
                related_spec=req.spec_normalized,
                related_color=req.color,
                severity="warning",
                details={"swap_reason": req.swap_reason},
            ))

        if req.is_replenishment:
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.URGENT_REPLENISH,
                description=f"紧急补单: {req.remark or req.style_no}",
                related_style_nos=[req.style_no],
                related_material=req.material_name,
                related_spec=req.spec_normalized,
                related_color=req.color,
                severity="warning",
                details={"remark": req.remark},
            ))

        normalized_reqs.append(req)

    return normalized_reqs, anomalies


def _detect_duplicates_and_colors(reqs: List[PurchaseRequirement]) -> List[AnomalyRecord]:
    """检测同款不同色和重复提交"""
    anomalies: List[AnomalyRecord] = []

    style_material_groups: Dict[Tuple[str, str], List[PurchaseRequirement]] = defaultdict(list)
    for req in reqs:
        style_material_groups[(req.style_no, req.material_name, req.spec_normalized)].append(req)

    exact_dupe_key: Dict[Tuple, List[PurchaseRequirement]] = defaultdict(list)
    for req in reqs:
        key = (req.style_no, req.material_name, req.color, req.spec_normalized, req.supplier or "")
        exact_dupe_key[key].append(req)

    for key, group in exact_dupe_key.items():
        if len(group) > 1:
            files = [f"{r.source_file}#{r.row_index}" for r in group]
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.DUPLICATE_SUBMISSION,
                description=f"疑似重复提交，涉及 {len(group)} 条记录: {', '.join(files)}",
                related_style_nos=[r.style_no for r in group],
                related_material=key[1],
                related_spec=key[3],
                related_color=key[2],
                severity="warning",
                suggestion="请跟单确认是否重复，避免多采",
                details={"records_count": len(group), "sources": files},
            ))

    style_spec_groups: Dict[Tuple[str, str, str], List[PurchaseRequirement]] = defaultdict(list)
    for req in reqs:
        style_spec_groups[(req.style_no, req.material_name, req.spec_normalized)].append(req)

    for key, group in style_spec_groups.items():
        colors = {r.color for r in group if r.color and r.color != "未指定"}
        if len(colors) > 1:
            anomalies.append(AnomalyRecord(
                anomaly_type=AnomalyType.DIFFERENT_COLOR_SAME_STYLE,
                description=f"款式 {key[0]} 的 {key[1]} ({key[2]}) 有 {len(colors)} 种颜色: {', '.join(sorted(colors))}",
                related_style_nos=[key[0]],
                related_material=key[1],
                related_spec=key[2],
                related_color="多色",
                severity="info",
                details={"colors": list(colors)},
            ))

    return anomalies


def _merge_items(reqs: List[PurchaseRequirement], anomalies: List[AnomalyRecord]) -> List[MergedPurchaseItem]:
    """按归并键合并数量，收集来源款式和备注"""
    groups: Dict[Tuple, List[PurchaseRequirement]] = defaultdict(list)
    for req in reqs:
        key = _make_merge_key(req)
        groups[key].append(req)

    merged_items: List[MergedPurchaseItem] = []

    for key, group in groups.items():
        category_val, material_name, color, spec_norm, supplier = key
        total_qty = sum(r.quantity for r in group)
        source_styles = list({r.style_no for r in group})
        source_qty: Dict[str, float] = defaultdict(float)
        for r in group:
            source_qty[r.style_no] += r.quantity

        remarks: List[str] = []
        for r in group:
            parts = []
            if r.style_no:
                parts.append(f"[{r.style_no}]")
            if r.remark:
                parts.append(r.remark)
            if r.swap_reason:
                parts.append(f"换料:{r.swap_reason}")
            if r.is_replenishment:
                parts.append("补单")
            if parts:
                remarks.append(" ".join(parts))

        original_specs = list({r.spec_raw for r in group if r.spec_raw})
        moq_values = [r.moq for r in group if r.moq is not None]
        moq = max(moq_values) if moq_values else None
        unit_prices = [r.unit_price for r in group if r.unit_price is not None]
        unit_price = unit_prices[0] if unit_prices else None
        delivery_dates = [r.delivery_date for r in group if r.delivery_date]
        delivery_date = min(delivery_dates) if delivery_dates else None
        urgency = max((r.urgency for r in group), key=lambda u: {UrgencyLevel.NORMAL: 0, UrgencyLevel.URGENT: 1, UrgencyLevel.RUSH: 2}[u])
        unit = group[0].unit if group else "个"

        related_anomalies = [
            a for a in anomalies
            if a.related_material == material_name
            and a.related_spec in (spec_norm, "")
            and (a.related_color == color or a.related_color == "多色")
        ]

        item = MergedPurchaseItem(
            material_category=group[0].material_category,
            material_name=material_name,
            color=color,
            color_code=group[0].color_code if group else None,
            spec_normalized=spec_norm,
            supplier=supplier,
            total_quantity=total_qty,
            unit=unit,
            unit_price=unit_price,
            moq=moq,
            delivery_date=delivery_date,
            urgency=urgency,
            source_styles=source_styles,
            source_quantities=dict(source_qty),
            remarks=remarks,
            anomalies=related_anomalies,
            original_specs=original_specs,
        )
        merged_items.append(item)

    return merged_items


def _compute_style_gaps(merged_items: List[MergedPurchaseItem], raw_reqs: List[PurchaseRequirement]) -> List[StyleGap]:
    """计算每个款式的辅料缺口"""
    gaps: List[StyleGap] = []

    style_req_map: Dict[str, List[PurchaseRequirement]] = defaultdict(list)
    for r in raw_reqs:
        style_req_map[r.style_no].append(r)

    for style_no, style_reqs in style_req_map.items():
        style_name = style_reqs[0].style_name if style_reqs else None
        for req in style_reqs:
            key = (req.material_name, req.color, req.spec_normalized, req.supplier or None)
            matched_item = None
            for item in merged_items:
                item_key = (item.material_name, item.color, item.spec_normalized, item.supplier)
                if item_key == key:
                    matched_item = item
                    break

            reason_parts = []
            if matched_item and not matched_item.is_moq_satisfied:
                reason_parts.append(f"低于MOQ(差{matched_item.moq_shortfall}{matched_item.unit})")
            if req.urgency in (UrgencyLevel.URGENT, UrgencyLevel.RUSH):
                reason_parts.append(f"{req.urgency.value}")
            if req.is_replenishment:
                reason_parts.append("补单")
            if req.swap_reason:
                reason_parts.append(f"换料:{req.swap_reason}")
            if matched_item and matched_item.delivery_date and req.delivery_date:
                if matched_item.delivery_date > req.delivery_date:
                    reason_parts.append(f"交期延后至{matched_item.delivery_date}")

            gap_qty = 0.0
            if matched_item and matched_item.moq and matched_item.total_quantity < matched_item.moq:
                gap_qty = matched_item.moq - matched_item.total_quantity

            if gap_qty > 0 or reason_parts:
                gaps.append(StyleGap(
                    style_no=style_no,
                    style_name=style_name,
                    material_name=req.material_name,
                    color=req.color,
                    spec_normalized=req.spec_normalized,
                    required_qty=req.quantity,
                    available_qty=matched_item.total_quantity if matched_item else req.quantity,
                    gap_qty=gap_qty,
                    unit=req.unit,
                    reason="; ".join(reason_parts) if reason_parts else "无",
                    delivery_date=matched_item.delivery_date if matched_item else req.delivery_date,
                    urgency=req.urgency,
                ))

    return gaps


def merge_requirements(reqs: List[PurchaseRequirement]) -> MergeResult:
    """主入口：执行所有归并和校验逻辑"""
    normalized_reqs, anomalies = _normalize_requirements(reqs)
    anomalies.extend(_detect_duplicates_and_colors(normalized_reqs))
    merged_items = _merge_items(normalized_reqs, anomalies)
    style_gaps = _compute_style_gaps(merged_items, normalized_reqs)

    summary = {
        "total_raw_records": len(reqs),
        "total_merged_items": len(merged_items),
        "total_styles": len({r.style_no for r in reqs}),
        "total_anomalies": len(anomalies),
        "total_style_gaps": len(style_gaps),
        "anomaly_counts": defaultdict(int),
    }
    for a in anomalies:
        summary["anomaly_counts"][a.anomaly_type.value] += 1

    result = MergeResult(
        merged_items=merged_items,
        anomalies=anomalies,
        style_gaps=style_gaps,
        raw_requirements=normalized_reqs,
        summary=dict(summary),
    )
    return result
