"""分类引擎：按规则分类 + 按收件人合并。"""
from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterable, List, Tuple

from .config import ALL_RULES, Rule
from .extractor import extract_all
from .models import BounceCategory, BounceRecord, RawBounce


def classify_text(reason_text: str, reason_code: str = "") -> Tuple[BounceCategory, str]:
    """对退信原因文本进行规则匹配，返回分类 + 规则标签说明。"""
    text = f"{reason_code}\n{reason_text}" if reason_code else reason_text
    if not text:
        return BounceCategory.MANUAL, "未识别到退信原因"
    for rule in ALL_RULES:
        if rule.pattern.search(text):
            return rule.category, rule.label
    return BounceCategory.MANUAL, "未匹配到已知分类规则"


def build_records(raw_sources: Iterable[RawBounce]) -> List[BounceRecord]:
    """把一堆 RawBounce 转换为初步的 BounceRecord（按收件人展开，尚未合并）。"""
    pending: List[BounceRecord] = []
    for raw in raw_sources:
        info = extract_all(raw)
        recipients: List[str] = info.get("recipients") or []
        if not recipients:
            recipients = ["<unknown>"]

        category, rule_label = classify_text(
            info.get("reason_text", ""), info.get("reason_code", "")
        )

        reason_text = info.get("reason_text", "") or rule_label

        for recipient in recipients:
            rec_category = category
            rec_reason = reason_text
            if info.get("is_forward_failure"):
                rec_category = BounceCategory.MANUAL
                rec_reason = (
                    f"[转发失败] {rec_reason}"
                    if not rec_reason.startswith("[转发失败]")
                    else rec_reason
                )
            rec = BounceRecord(
                recipient=recipient.lower(),
                category=rec_category,
                reason_code=info.get("reason_code", "") or "",
                reason_text=rec_reason or rule_label,
                bounce_time=info.get("bounce_time"),
                original_campaign=info.get("campaign", "") or "",
                original_subject=info.get("original_subject", "") or "",
                original_sender=info.get("original_sender", "") or "",
                source_file=raw.source_file,
                is_forward_failure=bool(info.get("is_forward_failure")),
            )
            pending.append(rec)
    return pending


def merge_by_recipient(records: Iterable[BounceRecord]) -> Dict[str, BounceRecord]:
    """按收件人邮箱合并同一地址的多次退回，保留优先级最高的分类。"""
    merged: Dict[str, BounceRecord] = {}
    for rec in records:
        key = rec.recipient.lower()
        if key in merged:
            merged[key].merge(rec)
        else:
            merged[key] = rec
    return merged


def pipeline(raw_sources: Iterable[RawBounce]) -> List[BounceRecord]:
    """完整流程：构建记录 → 按收件人合并 → 按分类/退回次数排序。"""
    records = build_records(raw_sources)
    merged = list(merge_by_recipient(records).values())
    category_order = {
        BounceCategory.BLACKLIST: 0,
        BounceCategory.HARD: 1,
        BounceCategory.MANUAL: 2,
        BounceCategory.SOFT: 3,
    }
    merged.sort(
        key=lambda r: (
            category_order.get(r.category, 99),
            -r.bounce_count,
            r.recipient,
        )
    )
    return merged


def summary(records: List[BounceRecord]) -> Dict[str, int]:
    """返回分类统计汇总。"""
    result = defaultdict(int)
    for r in records:
        result[r.category.value] += 1
    result["总计"] = len(records)
    result["需清理(硬退+黑名单)"] = sum(
        1 for r in records if r.needs_cleanup
    )
    result["需客户经理联系"] = sum(
        1 for r in records if r.needs_contact_manager
    )
    result["出现≥3次退回"] = sum(1 for r in records if r.bounce_count >= 3)
    return dict(result)
