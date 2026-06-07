"""风险等级评估引擎"""

from typing import List, Optional
from datetime import date, timedelta

from .config import RiskLevel, RecordStatus
from .models import InsuranceRecord
from .utils import parse_date, safe_str


class RiskAssessor:
    def __init__(
        self,
        high_risk_keywords: Optional[List[str]] = None,
        medium_risk_keywords: Optional[List[str]] = None,
    ):
        self.high_risk_keywords = high_risk_keywords or [
            "探险", "攀岩", "蹦极", "漂流", "野外", "露营", "登山",
            "滑雪", "潜水", "跳伞", "滑翔", "赛车", "马术", "冲浪",
        ]
        self.medium_risk_keywords = medium_risk_keywords or [
            "拓展", "军训", "运动会", "比赛", "竞赛", "远足", "骑行",
            "户外", "实践", "考察", "研学",
        ]

    def assess(self, record: InsuranceRecord) -> tuple[RiskLevel, List[str]]:
        reasons: List[str] = []
        score = 0

        if record.status == RecordStatus.ABNORMAL:
            reasons.append("记录存在异常数据")
            return RiskLevel.UNDETERMINED, reasons

        activity_name = safe_str(
            record.mapped_data.get("活动名称", "")
        ).lower()

        for kw in self.high_risk_keywords:
            if kw.lower() in activity_name:
                score += 3
                reasons.append(f"活动包含高风险关键词：{kw}")
                break

        if score == 0:
            for kw in self.medium_risk_keywords:
                if kw.lower() in activity_name:
                    score += 1
                    reasons.append(f"活动包含中风险关键词：{kw}")
                    break

        start_date = parse_date(record.mapped_data.get("活动开始日期"))
        end_date = parse_date(record.mapped_data.get("活动结束日期"))

        if start_date and end_date:
            duration = (end_date - start_date).days
            if duration >= 7:
                score += 2
                reasons.append(f"活动周期较长（{duration}天）")
            elif duration >= 3:
                score += 1
                reasons.append(f"活动周期中等（{duration}天）")

        insurance_amount_str = safe_str(record.mapped_data.get("保额", ""))
        if insurance_amount_str:
            try:
                amount = float(insurance_amount_str)
                if amount < 10000:
                    score += 2
                    reasons.append(f"保额较低（{amount}元）")
                elif amount < 50000:
                    score += 1
                    reasons.append(f"保额中等（{amount}元）")
            except ValueError:
                reasons.append("保额信息无法解析")

        insurance_company = safe_str(record.mapped_data.get("保险公司", ""))
        policy_number = safe_str(record.mapped_data.get("保单号", ""))

        if not insurance_company or not policy_number:
            score += 2
            reasons.append("保险信息不完整（缺少保险公司或保单号）")

        phone = safe_str(record.mapped_data.get("联系电话", ""))
        if not phone:
            score += 1
            reasons.append("缺少联系电话")

        id_card = safe_str(record.mapped_data.get("身份证号", ""))
        if not id_card:
            score += 1
            reasons.append("缺少身份证号")

        if score >= 4:
            risk_level = RiskLevel.HIGH
        elif score >= 2:
            risk_level = RiskLevel.MEDIUM
        elif score >= 1:
            risk_level = RiskLevel.LOW
        else:
            risk_level = RiskLevel.LOW
            reasons.append("各项指标均符合低风险标准")

        return risk_level, reasons

    def assess_batch(self, records: List[InsuranceRecord]) -> List[InsuranceRecord]:
        for record in records:
            risk_level, reasons = self.assess(record)
            record.risk_level = risk_level
            record.risk_reasons = reasons
        return records
