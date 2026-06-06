"""风险评估规则

根据送达回证的各项特征，评估风险等级并生成风险标签。
高风险时不允许直接通过，必须进入复核。
"""
from typing import List, Dict, Callable, Optional
from dataclasses import dataclass, field

from ..objects.models import DetailItem, RiskTag
from ..objects.enums import RiskLevel, SourceChannel


@dataclass
class RiskAssessmentResult:
    """风险评估结果"""
    overall_risk_level: RiskLevel = RiskLevel.LOW
    risk_tags: List[RiskTag] = field(default_factory=list)
    risk_score: int = 0


RISK_WEIGHTS: Dict[RiskLevel, int] = {
    RiskLevel.HIGH: 100,
    RiskLevel.MEDIUM: 50,
    RiskLevel.LOW: 10,
}


def _check_no_signature(items: List[DetailItem]) -> Optional[RiskTag]:
    """检查是否缺少签收 - 高风险"""
    for item in items:
        if item.item_id == "receipt_signature" and not item.item_value:
            return RiskTag(
                tag_id="RISK_001",
                tag_name="无签收记录",
                risk_level=RiskLevel.HIGH,
                description="送达回证缺少接收人签名/签章，送达效力存疑",
                rule_source="risk_assessment",
            )
    return None


def _check_invalid_case_no(items: List[DetailItem]) -> Optional[RiskTag]:
    """检查案号格式 - 中风险"""
    for item in items:
        if item.item_id == "case_no" and item.item_value:
            case_no = item.item_value
            if len(case_no) < 5 or not any(c.isdigit() for c in case_no):
                return RiskTag(
                    tag_id="RISK_002",
                    tag_name="案号格式异常",
                    risk_level=RiskLevel.MEDIUM,
                    description="案号格式不符合规范，可能影响法律文书效力",
                    rule_source="risk_assessment",
                )
    return None


def _check_expired_delivery(items: List[DetailItem]) -> Optional[RiskTag]:
    """检查送达是否超期 - 中风险"""
    for item in items:
        if item.item_id == "delivery_date" and item.item_value:
            try:
                from datetime import datetime
                from dateutil import parser
                delivery_dt = parser.parse(item.item_value)
                days_diff = (datetime.now() - delivery_dt).days
                if days_diff > 90:
                    return RiskTag(
                        tag_id="RISK_003",
                        tag_name="送达超期",
                        risk_level=RiskLevel.MEDIUM,
                        description=f"送达日期距今{days_diff}天，超过90天归档期限",
                        rule_source="risk_assessment",
                    )
            except (ValueError, ImportError):
                pass
    return None


def _check_electronic_unread(items: List[DetailItem], source_channel: SourceChannel) -> Optional[RiskTag]:
    """检查电子送达未读 - 高风险"""
    if source_channel != SourceChannel.ELECTRONIC_DELIVERY:
        return None

    for item in items:
        if item.item_id == "read_status" and item.item_value:
            if item.item_value in ["未读", "未查看", "UNREAD"]:
                return RiskTag(
                    tag_id="RISK_004",
                    tag_name="电子送达未读",
                    risk_level=RiskLevel.HIGH,
                    description="电子送达的文书尚未被接收人查看，送达效力未确认",
                    rule_source="risk_assessment",
                )
    return None


def _check_post_undelivered(items: List[DetailItem], source_channel: SourceChannel) -> Optional[RiskTag]:
    """检查邮寄未送达 - 高风险"""
    if source_channel != SourceChannel.POST_SERVICE:
        return None

    for item in items:
        if item.item_id == "delivery_status" and item.item_value:
            if item.item_value in ["退回", "未妥投", "RETURNED"]:
                return RiskTag(
                    tag_id="RISK_005",
                    tag_name="邮寄送达退回",
                    risk_level=RiskLevel.HIGH,
                    description="邮寄送达被退回，需采取其他送达方式",
                    rule_source="risk_assessment",
                )
    return None


def _check_missing_fee(items: List[DetailItem]) -> Optional[RiskTag]:
    """检查费用缺失 - 低风险"""
    for item in items:
        if item.item_id == "arbitration_fee" and not item.item_value:
            return RiskTag(
                tag_id="RISK_006",
                tag_name="仲裁费金额缺失",
                risk_level=RiskLevel.LOW,
                description="仲裁费用信息缺失，需补充完整",
                rule_source="risk_assessment",
            )
    return None


def _check_anonymous_recipient(items: List[DetailItem]) -> Optional[RiskTag]:
    """检查匿名接收人 - 中风险"""
    for item in items:
        if item.item_id == "recipient_name":
            if not item.item_value or item.item_value in ["匿名", "不详"]:
                return RiskTag(
                    tag_id="RISK_007",
                    tag_name="接收人身份不明",
                    risk_level=RiskLevel.MEDIUM,
                    description="接收人身份信息不完整，可能影响送达效力",
                    rule_source="risk_assessment",
                )
    return None


class RiskRuleEngine:
    """风险评估规则引擎"""

    def __init__(self):
        self._risk_functions: List[Callable] = [
            _check_no_signature,
            _check_invalid_case_no,
            _check_expired_delivery,
            _check_anonymous_recipient,
            _check_missing_fee,
        ]
        self._channel_risk_functions: List[Callable] = [
            _check_electronic_unread,
            _check_post_undelivered,
        ]
        self._custom_risks: Dict[str, Callable] = {}

    def add_custom_risk_rule(self, rule_id: str, rule_func: Callable):
        """添加自定义风险规则"""
        self._custom_risks[rule_id] = rule_func

    def assess_risk(
        self,
        items: List[DetailItem],
        source_channel: SourceChannel,
    ) -> RiskAssessmentResult:
        """评估风险

        Args:
            items: 明细项列表
            source_channel: 来源渠道

        Returns:
            RiskAssessmentResult: 风险评估结果
        """
        result = RiskAssessmentResult()

        for risk_func in self._risk_functions:
            tag = risk_func(items)
            if tag:
                result.risk_tags.append(tag)

        for risk_func in self._channel_risk_functions:
            tag = risk_func(items, source_channel)
            if tag:
                result.risk_tags.append(tag)

        for _, rule_func in self._custom_risks.items():
            tag = rule_func(items, source_channel)
            if tag:
                result.risk_tags.append(tag)

        if result.risk_tags:
            max_level = RiskLevel.LOW
            total_score = 0
            for tag in result.risk_tags:
                total_score += RISK_WEIGHTS[tag.risk_level]
                if RISK_WEIGHTS[tag.risk_level] > RISK_WEIGHTS[max_level]:
                    max_level = tag.risk_level
            result.overall_risk_level = max_level
            result.risk_score = total_score

        return result

    def is_high_risk(self, items: List[DetailItem], source_channel: SourceChannel) -> bool:
        """快速判断是否为高风险"""
        result = self.assess_risk(items, source_channel)
        return result.overall_risk_level == RiskLevel.HIGH
