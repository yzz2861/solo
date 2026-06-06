from typing import List, Dict
from ..models.enums import MaterialType, LuxuryCategory, RiskLevel
from ..models.item import AuthItem
from .base import BaseRule, RuleResult


class MaterialIntegrityRule(BaseRule):
    name = "材料完整性规则"
    code = "RULE_MATERIAL_001"
    description = "校验奢品鉴定所需材料是否齐全"

    CATEGORY_REQUIRED_MATERIALS: Dict[LuxuryCategory, List[MaterialType]] = {
        LuxuryCategory.WATCH: [
            MaterialType.PURCHASE_INVOICE,
            MaterialType.WARRANTY_CARD,
            MaterialType.ORIGINAL_BOX,
        ],
        LuxuryCategory.BAG: [
            MaterialType.PURCHASE_INVOICE,
            MaterialType.CERTIFICATE,
            MaterialType.ORIGINAL_BOX,
        ],
        LuxuryCategory.JEWELRY: [
            MaterialType.PURCHASE_INVOICE,
            MaterialType.CERTIFICATE,
            MaterialType.BRAND_CARD,
        ],
        LuxuryCategory.CLOTHING: [
            MaterialType.PURCHASE_INVOICE,
            MaterialType.RECEIPT,
        ],
        LuxuryCategory.SHOES: [
            MaterialType.PURCHASE_INVOICE,
            MaterialType.ORIGINAL_BOX,
        ],
        LuxuryCategory.ACCESSORY: [
            MaterialType.PURCHASE_INVOICE,
        ],
    }

    def evaluate(self, item: AuthItem) -> RuleResult:
        category = item.luxury.category
        required = self.CATEGORY_REQUIRED_MATERIALS.get(category, [MaterialType.PURCHASE_INVOICE])
        missing = item.luxury.get_missing_materials(required)

        if not missing:
            return RuleResult(
                rule_name=self.name,
                rule_code=self.code,
                passed=True,
                risk_score=0.0,
                risk_level=RiskLevel.LOW,
                reasons=[f"材料齐全，共 {len(required)} 项必要材料均已核验通过"],
            )

        missing_names = [m.value for m in missing]
        risk_score = len(missing) * 20.0
        risk_level = RiskLevel.HIGH if len(missing) >= 2 else RiskLevel.MEDIUM

        return RuleResult(
            rule_name=self.name,
            rule_code=self.code,
            passed=False,
            risk_score=min(risk_score, 80.0),
            risk_level=risk_level,
            reasons=[f"缺少 {len(missing)} 项必要材料：{', '.join(missing_names)}"],
            missing_materials=missing_names,
        )


class MaterialVerifiedRule(BaseRule):
    name = "材料核验规则"
    code = "RULE_MATERIAL_002"
    description = "校验材料是否经过官方核验"

    def evaluate(self, item: AuthItem) -> RuleResult:
        materials = item.luxury.materials
        if not materials:
            return RuleResult(
                rule_name=self.name,
                rule_code=self.code,
                passed=False,
                risk_score=20.0,
                risk_level=RiskLevel.MEDIUM,
                reasons=["未提供任何鉴定材料"],
            )

        verified_count = sum(1 for m in materials if m.verified)
        total_count = len(materials)
        verified_ratio = verified_count / total_count if total_count > 0 else 0

        if verified_ratio >= 0.8:
            score = 5.0
            risk_level = RiskLevel.LOW
            passed = True
        elif verified_ratio >= 0.5:
            score = 25.0
            risk_level = RiskLevel.MEDIUM
            passed = False
        else:
            score = 50.0
            risk_level = RiskLevel.HIGH
            passed = False

        reasons = [
            f"材料核验通过率 {verified_ratio:.0%}（{verified_count}/{total_count}）"
        ]

        return RuleResult(
            rule_name=self.name,
            rule_code=self.code,
            passed=passed,
            risk_score=score,
            risk_level=risk_level,
            reasons=reasons,
        )


class AppraisalReportRule(BaseRule):
    name = "鉴定报告规则"
    code = "RULE_MATERIAL_003"
    description = "高价值商品是否附带第三方鉴定报告"

    HIGH_VALUE_THRESHOLD = 100000.0

    def evaluate(self, item: AuthItem) -> RuleResult:
        value = item.luxury.estimated_value or 0.0

        if value < self.HIGH_VALUE_THRESHOLD:
            return RuleResult(
                rule_name=self.name,
                rule_code=self.code,
                passed=True,
                risk_score=0.0,
                risk_level=RiskLevel.LOW,
                reasons=[f"预估价值 {value:,.2f} 元，无需第三方鉴定报告"],
            )

        has_report = item.luxury.has_material(MaterialType.APPRAISAL_REPORT)

        if has_report:
            return RuleResult(
                rule_name=self.name,
                rule_code=self.code,
                passed=True,
                risk_score=5.0,
                risk_level=RiskLevel.LOW,
                reasons=["高价值商品已提供第三方鉴定报告"],
            )

        return RuleResult(
            rule_name=self.name,
            rule_code=self.code,
            passed=False,
            risk_score=35.0,
            risk_level=RiskLevel.MEDIUM,
            reasons=[f"高价值商品（{value:,.2f} 元）缺少第三方鉴定报告"],
        )
