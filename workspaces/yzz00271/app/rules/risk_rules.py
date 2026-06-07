from app.domain import CriticalValueReceipt, RiskLevel, ReceiptStatus
from app.rules.engine import BaseRule, RuleResult


HIGH_RISK_KEYWORDS = [
    "脑出血", "脑疝", "蛛网膜下腔出血", "急性脑梗塞",
    "主动脉夹层", "肺栓塞", "张力性气胸",
    "急性心肌梗死", "心包积液", "心脏压塞",
    "肝破裂", "脾破裂", "宫外孕破裂",
    "脊柱骨折伴脊髓损伤", "骨盆骨折伴大出血",
]

MEDIUM_RISK_KEYWORDS = [
    "脑梗塞", "脑出血（少量）", "肺炎",
    "胸腔积液", "腹腔积液", "骨折",
    "肺结节（可疑）", "肝占位", "肾占位",
]

HIGH_RISK_BODY_PARTS = ["头部", "头颅", "颅脑", "心脏", "胸部", "胸"]
HIGH_RISK_EXAM_TYPES = ["CT", "MRI", "DSA", "介入"]
HIGH_RISK_DEPARTMENTS = ["急诊科", "ICU", "神经外科", "心内科", "胸外科"]


class RiskAssessmentRule(BaseRule):
    name = "risk_assessment"

    def apply(self, receipt: CriticalValueReceipt, context: dict = None) -> RuleResult:
        result = RuleResult()
        item = receipt.item

        base_risk = item.risk_level
        result.add_risk_tag(f"基础风险:{base_risk}")

        desc = item.critical_value_desc
        for kw in HIGH_RISK_KEYWORDS:
            if kw in desc:
                result.add_risk_tag(f"高风险关键词:{kw}")
                if base_risk != RiskLevel.HIGH:
                    result.need_review = True

        for kw in MEDIUM_RISK_KEYWORDS:
            if kw in desc:
                result.add_risk_tag(f"中风险关键词:{kw}")

        if item.exam_body_part in HIGH_RISK_BODY_PARTS:
            result.add_risk_tag(f"高风险部位:{item.exam_body_part}")

        if item.exam_type in HIGH_RISK_EXAM_TYPES:
            result.add_risk_tag(f"高风险检查类型:{item.exam_type}")

        if item.department in HIGH_RISK_DEPARTMENTS:
            result.add_risk_tag(f"高风险科室:{item.department}")

        if base_risk == RiskLevel.HIGH:
            result.add_risk_tag("高风险等级")
            result.need_review = True

        return result
