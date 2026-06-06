from __future__ import annotations
from datetime import datetime
from typing import List, Dict, Any, Callable, Optional
from app.models.inventory import (
    InventoryCheckRequest,
    RuleHitDetail,
    DecisionType,
    HitSource,
    ObjectStatus,
    MaterialStatus,
)


class RuleDefinition:
    def __init__(
        self,
        rule_id: str,
        rule_name: str,
        version: str,
        evaluate_fn: Callable[[InventoryCheckRequest], Optional[RuleHitDetail]],
    ):
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.version = version
        self.evaluate_fn = evaluate_fn

    def evaluate(self, request: InventoryCheckRequest) -> Optional[RuleHitDetail]:
        return self.evaluate_fn(request)


def _build_hit(
    rule_id: str,
    rule_name: str,
    version: str,
    decision: DecisionType,
    reason_code: str,
    reason_message: str,
    evidence: Dict[str, Any],
) -> RuleHitDetail:
    return RuleHitDetail(
        rule_id=rule_id,
        rule_name=rule_name,
        rule_version=version,
        hit_source=HitSource.RULE,
        decision=decision,
        reason_code=reason_code,
        reason_message=reason_message,
        evidence=evidence,
    )


class RuleEngine:
    def __init__(self):
        self._rule_sets: Dict[str, List[RuleDefinition]] = {}
        self._init_rule_sets()

    def _init_rule_sets(self):
        self._rule_sets["v1.0"] = self._build_v1_rules()
        self._rule_sets["v1.1"] = self._build_v11_rules()
        self._rule_sets["v2.0"] = self._build_v2_rules()

    def _build_v1_rules(self) -> List[RuleDefinition]:
        version = "v1.0"
        rules = []

        def material_missing_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            if req.material_status == MaterialStatus.MISSING:
                return _build_hit(
                    "RULE-MAT-001",
                    "盘点材料缺失校验",
                    version,
                    DecisionType.BLOCK,
                    "MATERIAL_MISSING",
                    "盘点材料不完整，缺少必要的盘点凭证",
                    {"material_status": req.material_status.value},
                )
            return None

        rules.append(RuleDefinition("RULE-MAT-001", "盘点材料缺失校验", version, material_missing_rule))

        def material_invalid_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            if req.material_status == MaterialStatus.INVALID:
                return _build_hit(
                    "RULE-MAT-002",
                    "盘点材料有效性校验",
                    version,
                    DecisionType.PENDING_REVIEW,
                    "MATERIAL_INVALID",
                    "盘点材料存在异常，需人工复核确认",
                    {"material_status": req.material_status.value},
                )
            return None

        rules.append(RuleDefinition("RULE-MAT-002", "盘点材料有效性校验", version, material_invalid_rule))

        def object_lost_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            if req.object_status == ObjectStatus.LOST:
                return _build_hit(
                    "RULE-OBJ-001",
                    "物品丢失校验",
                    version,
                    DecisionType.BLOCK,
                    "OBJECT_LOST",
                    "盘点对象状态为丢失，需资产报损流程",
                    {"object_status": req.object_status.value},
                )
            return None

        rules.append(RuleDefinition("RULE-OBJ-001", "物品丢失校验", version, object_lost_rule))

        def object_damaged_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            if req.object_status == ObjectStatus.DAMAGED:
                return _build_hit(
                    "RULE-OBJ-002",
                    "物品损坏校验",
                    version,
                    DecisionType.PENDING_REVIEW,
                    "OBJECT_DAMAGED",
                    "盘点对象存在损坏，需评估损失后复核",
                    {"object_status": req.object_status.value},
                )
            return None

        rules.append(RuleDefinition("RULE-OBJ-002", "物品损坏校验", version, object_damaged_rule))

        def amount_threshold_block_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            abs_amount = abs(req.profit_loss_amount)
            threshold = 10000.0
            if abs_amount >= threshold:
                direction = "盘盈" if req.profit_loss_amount > 0 else "盘亏"
                return _build_hit(
                    "RULE-AMT-001",
                    "盈亏金额阈值-拦截级",
                    version,
                    DecisionType.BLOCK,
                    "AMOUNT_EXCEED_BLOCK",
                    f"{direction}金额{abs_amount:.2f}元超过拦截阈值{threshold:.2f}元",
                    {
                        "profit_loss_amount": req.profit_loss_amount,
                        "threshold": threshold,
                        "direction": direction,
                    },
                )
            return None

        rules.append(RuleDefinition("RULE-AMT-001", "盈亏金额阈值-拦截级", version, amount_threshold_block_rule))

        def amount_threshold_review_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            abs_amount = abs(req.profit_loss_amount)
            threshold_low = 1000.0
            threshold_high = 10000.0
            if threshold_low <= abs_amount < threshold_high:
                direction = "盘盈" if req.profit_loss_amount > 0 else "盘亏"
                return _build_hit(
                    "RULE-AMT-002",
                    "盈亏金额阈值-复核级",
                    version,
                    DecisionType.PENDING_REVIEW,
                    "AMOUNT_EXCEED_REVIEW",
                    f"{direction}金额{abs_amount:.2f}元超过预警阈值{threshold_low:.2f}元，需人工复核",
                    {
                        "profit_loss_amount": req.profit_loss_amount,
                        "threshold_low": threshold_low,
                        "threshold_high": threshold_high,
                        "direction": direction,
                    },
                )
            return None

        rules.append(RuleDefinition("RULE-AMT-002", "盈亏金额阈值-复核级", version, amount_threshold_review_rule))

        def rate_threshold_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            abs_rate = abs(req.profit_loss_rate)
            threshold = 0.05
            if abs_rate >= threshold:
                direction = "盘盈" if req.profit_loss_rate > 0 else "盘亏"
                return _build_hit(
                    "RULE-RATE-001",
                    "盈亏比例阈值校验",
                    version,
                    DecisionType.PENDING_REVIEW,
                    "RATE_EXCEED_THRESHOLD",
                    f"{direction}比例{abs_rate*100:.2f}%超过阈值{threshold*100:.0f}%",
                    {
                        "profit_loss_rate": req.profit_loss_rate,
                        "threshold": threshold,
                        "direction": direction,
                    },
                )
            return None

        rules.append(RuleDefinition("RULE-RATE-001", "盈亏比例阈值校验", version, rate_threshold_rule))

        def time_window_valid_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            if req.time_window.start_time >= req.time_window.end_time:
                return _build_hit(
                    "RULE-TIME-001",
                    "时间窗口有效性校验",
                    version,
                    DecisionType.BLOCK,
                    "TIME_WINDOW_INVALID",
                    "盘点时间窗口无效，开始时间必须早于结束时间",
                    {
                        "start_time": req.time_window.start_time.isoformat(),
                        "end_time": req.time_window.end_time.isoformat(),
                    },
                )
            return None

        rules.append(RuleDefinition("RULE-TIME-001", "时间窗口有效性校验", version, time_window_valid_rule))

        return rules

    def _build_v11_rules(self) -> List[RuleDefinition]:
        rules = self._build_v1_rules()
        version = "v1.1"

        for i, rule in enumerate(rules):
            rules[i] = RuleDefinition(
                rule.rule_id,
                rule.rule_name,
                version,
                rule.evaluate_fn,
            )

        def abnormal_status_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            if req.object_status == ObjectStatus.ABNORMAL:
                return _build_hit(
                    "RULE-OBJ-003",
                    "物品状态异常校验",
                    version,
                    DecisionType.PENDING_REVIEW,
                    "OBJECT_ABNORMAL",
                    "盘点对象状态异常，需核实具体情况",
                    {"object_status": req.object_status.value},
                )
            return None

        rules.append(RuleDefinition("RULE-OBJ-003", "物品状态异常校验", version, abnormal_status_rule))

        def time_window_exceed_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            duration = req.time_window.end_time - req.time_window.start_time
            max_days = 30
            if duration.days > max_days:
                return _build_hit(
                    "RULE-TIME-002",
                    "时间窗口跨度校验",
                    version,
                    DecisionType.PENDING_REVIEW,
                    "TIME_WINDOW_TOO_LONG",
                    f"盘点时间窗口跨度{duration.days}天超过最大{max_days}天，需复核",
                    {
                        "duration_days": duration.days,
                        "max_days": max_days,
                    },
                )
            return None

        rules.append(RuleDefinition("RULE-TIME-002", "时间窗口跨度校验", version, time_window_exceed_rule))

        return rules

    def _build_v2_rules(self) -> List[RuleDefinition]:
        rules = self._build_v11_rules()
        version = "v2.0"

        for i, rule in enumerate(rules):
            rules[i] = RuleDefinition(
                rule.rule_id,
                rule.rule_name,
                version,
                rule.evaluate_fn,
            )

        def combined_high_risk_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            amount_risk = abs(req.profit_loss_amount) >= 5000
            rate_risk = abs(req.profit_loss_rate) >= 0.03
            status_risk = req.object_status in (ObjectStatus.ABNORMAL, ObjectStatus.DAMAGED)
            if amount_risk and rate_risk and status_risk:
                return _build_hit(
                    "RULE-COMB-001",
                    "高风险组合校验",
                    version,
                    DecisionType.BLOCK,
                    "COMBINED_HIGH_RISK",
                    "金额、比例、状态三重异常，判定为高风险盘点，直接拦截",
                    {
                        "profit_loss_amount": req.profit_loss_amount,
                        "profit_loss_rate": req.profit_loss_rate,
                        "object_status": req.object_status.value,
                        "risk_factors": ["amount", "rate", "status"],
                    },
                )
            return None

        rules.append(RuleDefinition("RULE-COMB-001", "高风险组合校验", version, combined_high_risk_rule))

        def rapid_submission_rule(req: InventoryCheckRequest) -> Optional[RuleHitDetail]:
            return None

        rules.append(RuleDefinition("RULE-SUB-001", "快速提交频率校验", version, rapid_submission_rule))

        return rules

    def get_available_versions(self) -> List[str]:
        return sorted(self._rule_sets.keys())

    def evaluate(self, request: InventoryCheckRequest) -> List[RuleHitDetail]:
        version = request.rule_version
        if version not in self._rule_sets:
            return [
                _build_hit(
                    "RULE-SYS-001",
                    "规则版本校验",
                    "system",
                    DecisionType.BLOCK,
                    "RULE_VERSION_NOT_FOUND",
                    f"规则版本 {version} 不存在，可用版本: {', '.join(self.get_available_versions())}",
                    {"requested_version": version, "available_versions": self.get_available_versions()},
                )
            ]

        rules = self._rule_sets[version]
        hits: List[RuleHitDetail] = []
        for rule in rules:
            hit = rule.evaluate(request)
            if hit:
                hits.append(hit)

        return hits


rule_engine = RuleEngine()
