"""材料完整性检查规则

检查送达回证中必填材料是否齐全，缺材料时不允许直接通过。
"""
from typing import List, Set, Dict, Optional
from dataclasses import dataclass, field

from ..objects.models import DetailItem
from ..objects.enums import SourceChannel


@dataclass
class MaterialCheckResult:
    """材料检查结果"""
    is_complete: bool = True
    missing_items: List[str] = field(default_factory=list)
    required_items: List[str] = field(default_factory=list)
    check_details: Dict[str, str] = field(default_factory=dict)


REQUIRED_ITEMS_BY_CHANNEL: Dict[SourceChannel, Set[str]] = {
    SourceChannel.COURT: {
        "court_name",
        "case_no",
        "delivery_date",
        "recipient_name",
        "receipt_signature",
    },
    SourceChannel.ARBITRATION_COMMISSION: {
        "arbitration_commission",
        "case_no",
        "delivery_date",
        "recipient_name",
        "receipt_signature",
        "arbitration_fee",
    },
    SourceChannel.POST_SERVICE: {
        "tracking_no",
        "delivery_date",
        "recipient_name",
        "post_office",
        "receipt_signature",
    },
    SourceChannel.ELECTRONIC_DELIVERY: {
        "electronic_platform",
        "delivery_time",
        "recipient_account",
        "read_status",
    },
    SourceChannel.ON_SITE: {
        "delivery_address",
        "delivery_date",
        "recipient_name",
        "delivery_staff",
        "receipt_signature",
    },
}

GENERAL_REQUIRED_ITEMS: Set[str] = {
    "document_title",
    "delivery_method",
}


class MaterialRuleEngine:
    """材料检查规则引擎"""

    def __init__(self):
        self._custom_rules: Dict[str, Set[str]] = {}

    def add_custom_rule(self, rule_name: str, required_items: Set[str]):
        """添加自定义材料规则"""
        self._custom_rules[rule_name] = required_items

    def check_materials(
        self,
        items: List[DetailItem],
        source_channel: SourceChannel,
    ) -> MaterialCheckResult:
        """检查材料完整性

        Args:
            items: 明细项列表
            source_channel: 来源渠道

        Returns:
            MaterialCheckResult: 材料检查结果
        """
        result = MaterialCheckResult()

        present_item_ids = {item.item_id for item in items if item.item_value}

        channel_required = REQUIRED_ITEMS_BY_CHANNEL.get(source_channel, set())
        all_required = GENERAL_REQUIRED_ITEMS | channel_required

        for _, custom_required in self._custom_rules.items():
            all_required |= custom_required

        result.required_items = sorted(all_required)

        missing = all_required - present_item_ids
        if missing:
            result.is_complete = False
            result.missing_items = sorted(missing)

        for item_id in all_required:
            if item_id in present_item_ids:
                result.check_details[item_id] = "齐备"
            else:
                result.check_details[item_id] = "缺失"

        return result

    def is_item_required(
        self,
        item_id: str,
        source_channel: Optional[SourceChannel] = None,
    ) -> bool:
        """判断某个明细项是否为必填项"""
        if item_id in GENERAL_REQUIRED_ITEMS:
            return True

        if source_channel:
            channel_required = REQUIRED_ITEMS_BY_CHANNEL.get(source_channel, set())
            if item_id in channel_required:
                return True

        for _, custom_required in self._custom_rules.items():
            if item_id in custom_required:
                return True

        return False
