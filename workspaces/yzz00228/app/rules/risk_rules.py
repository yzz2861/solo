from typing import List, Dict
from ..models.enums import ChannelType, RiskLevel, LuxuryCategory
from ..models.item import AuthItem
from .base import BaseRule, RuleResult


class ChannelRiskRule(BaseRule):
    name = "渠道风险规则"
    code = "RULE_CHANNEL_001"
    description = "根据来源渠道评估风险等级"

    CHANNEL_RISK_SCORES: Dict[ChannelType, float] = {
        ChannelType.OFFICIAL_STORE: 10.0,
        ChannelType.AUTHORIZED_DEALER: 20.0,
        ChannelType.SECOND_HAND_MARKET: 50.0,
        ChannelType.PRIVATE_SELLER: 75.0,
        ChannelType.AUCTION: 55.0,
        ChannelType.UNKNOWN: 90.0,
    }

    def evaluate(self, item: AuthItem) -> RuleResult:
        channel = item.source_channel.channel_type
        score = self.CHANNEL_RISK_SCORES.get(channel, 50.0)
        risk_level = self._score_to_level(score)

        reasons = [f"来源渠道【{channel.value}】风险评分为 {score} 分"]
        if item.source_channel.seller_id:
            reasons.append(f"卖家ID: {item.source_channel.seller_id}")

        return RuleResult(
            rule_name=self.name,
            rule_code=self.code,
            passed=True,
            risk_score=score,
            risk_level=risk_level,
            reasons=reasons,
        )

    def _score_to_level(self, score: float) -> RiskLevel:
        if score < 25:
            return RiskLevel.LOW
        elif score < 50:
            return RiskLevel.MEDIUM
        elif score < 75:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL


class ValueRiskRule(BaseRule):
    name = "价值风险规则"
    code = "RULE_VALUE_001"
    description = "根据预估价值评估风险等级"

    HIGH_VALUE_THRESHOLD = 50000.0
    VERY_HIGH_VALUE_THRESHOLD = 200000.0

    def evaluate(self, item: AuthItem) -> RuleResult:
        value = item.luxury.estimated_value or 0.0

        if value >= self.VERY_HIGH_VALUE_THRESHOLD:
            score = 70.0
            risk_level = RiskLevel.HIGH
            reasons = [f"预估价值 {value:,.2f} 元，超过高价值阈值 {self.VERY_HIGH_VALUE_THRESHOLD:,.0f} 元"]
        elif value >= self.HIGH_VALUE_THRESHOLD:
            score = 45.0
            risk_level = RiskLevel.MEDIUM
            reasons = [f"预估价值 {value:,.2f} 元，超过中价值阈值 {self.HIGH_VALUE_THRESHOLD:,.0f} 元"]
        else:
            score = 15.0
            risk_level = RiskLevel.LOW
            reasons = [f"预估价值 {value:,.2f} 元，处于低风险区间"]

        return RuleResult(
            rule_name=self.name,
            rule_code=self.code,
            passed=True,
            risk_score=score,
            risk_level=risk_level,
            reasons=reasons,
        )


class CategoryRiskRule(BaseRule):
    name = "品类风险规则"
    code = "RULE_CATEGORY_001"
    description = "根据奢品品类评估风险等级"

    CATEGORY_RISK_SCORES: Dict[LuxuryCategory, float] = {
        LuxuryCategory.WATCH: 40.0,
        LuxuryCategory.BAG: 35.0,
        LuxuryCategory.JEWELRY: 45.0,
        LuxuryCategory.CLOTHING: 25.0,
        LuxuryCategory.SHOES: 20.0,
        LuxuryCategory.ACCESSORY: 15.0,
    }

    def evaluate(self, item: AuthItem) -> RuleResult:
        category = item.luxury.category
        score = self.CATEGORY_RISK_SCORES.get(category, 30.0)

        if score >= 40:
            risk_level = RiskLevel.MEDIUM
        else:
            risk_level = RiskLevel.LOW

        reasons = [f"奢品品类【{category.value}】基础风险评分为 {score} 分"]

        return RuleResult(
            rule_name=self.name,
            rule_code=self.code,
            passed=True,
            risk_score=score,
            risk_level=risk_level,
            reasons=reasons,
        )


class SerialNumberRule(BaseRule):
    name = "序列号核验规则"
    code = "RULE_SERIAL_001"
    description = "序列号存在性和格式校验"

    def evaluate(self, item: AuthItem) -> RuleResult:
        serial = item.luxury.serial_number

        if not serial:
            return RuleResult(
                rule_name=self.name,
                rule_code=self.code,
                passed=False,
                risk_score=30.0,
                risk_level=RiskLevel.MEDIUM,
                reasons=["缺少序列号信息，增加身份核验难度"],
            )

        if len(serial) < 4:
            return RuleResult(
                rule_name=self.name,
                rule_code=self.code,
                passed=False,
                risk_score=25.0,
                risk_level=RiskLevel.MEDIUM,
                reasons=[f"序列号格式异常：长度不足（当前 {len(serial)} 位）"],
            )

        return RuleResult(
            rule_name=self.name,
            rule_code=self.code,
            passed=True,
            risk_score=5.0,
            risk_level=RiskLevel.LOW,
            reasons=[f"序列号 {serial} 格式校验通过"],
        )
