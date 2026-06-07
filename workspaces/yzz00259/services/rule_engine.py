from typing import Dict, List, Tuple, Optional
from models.rules import RuleVersion, rule_version_store


def evaluate_condition(condition: Dict, metrics: Dict) -> bool:
    metric = condition.get("metric")
    operator = condition.get("operator")
    threshold = condition.get("threshold")

    if metric not in metrics:
        return False

    value = metrics[metric]

    if operator == ">":
        return value > threshold
    elif operator == ">=":
        return value >= threshold
    elif operator == "<":
        return value < threshold
    elif operator == "<=":
        return value <= threshold
    elif operator == "==":
        return value == threshold
    elif operator == "!=":
        return value != threshold
    else:
        return False


class RuleEngine:
    def __init__(self, rule_version: RuleVersion):
        self.rule_version = rule_version
        self._sorted_rules = sorted(
            rule_version.rules,
            key=lambda r: r.get("priority", 999)
        )

    def evaluate(self, object_status: Dict) -> Tuple[str, List[Dict], str]:
        """
        评估对象状态，返回结果：
        - 结论：pass/intercept/review
        - 触发的规则列表
        - 可读原因描述
        """
        metrics = object_status.get("metrics", {})
        triggered_rules = []

        for rule in self._sorted_rules:
            if evaluate_condition(rule["condition"], metrics):
                triggered_rules.append(rule)

        if not triggered_rules:
            return "pass", [], "未触发任何异常规则，数据正常"

        highest_action = self._resolve_final_action(triggered_rules)
        reason = self._build_reason(triggered_rules, highest_action)

        return highest_action, triggered_rules, reason

    def _resolve_final_action(self, triggered_rules: List[Dict]) -> str:
        action_priority = {
            "intercept": 1,
            "review": 2,
            "pass": 3
        }
        highest = "pass"
        for rule in triggered_rules:
            action = rule.get("action", "pass")
            if action_priority.get(action, 99) < action_priority.get(highest, 99):
                highest = action
        return highest

    def _build_reason(self, triggered_rules: List[Dict], final_action: str) -> str:
        rule_names = [f"{r['id']}-{r['name']}" for r in triggered_rules]
        action_map = {
            "intercept": "拦截",
            "review": "待复核",
            "pass": "通过"
        }
        action_cn = action_map.get(final_action, final_action)
        return f"触发{len(triggered_rules)}条规则[{', '.join(rule_names)}]，结论：{action_cn}"


def get_rule_engine(version: Optional[str] = None) -> Tuple[Optional[RuleEngine], Optional[str]]:
    """
    获取指定版本的规则引擎
    返回：(规则引擎实例, 错误信息)
    """
    if version is None:
        rv = rule_version_store.get_default()
        if rv is None:
            return None, "未配置默认规则版本"
        return RuleEngine(rv), None

    if not rule_version_store.version_exists(version):
        return None, f"规则版本 {version} 不存在"

    rv = rule_version_store.get_version(version)
    return RuleEngine(rv), None
