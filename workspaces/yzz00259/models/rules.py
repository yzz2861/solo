import uuid
from datetime import datetime
from typing import Dict, List, Optional


class RuleVersion:
    def __init__(self, version: str, rules: List[Dict], effective_from: datetime,
                 effective_to: Optional[datetime] = None, description: str = ""):
        self.version = version
        self.rules = rules
        self.effective_from = effective_from
        self.effective_to = effective_to
        self.description = description
        self.created_at = datetime.now()

    def is_effective(self, check_time: datetime) -> bool:
        if check_time < self.effective_from:
            return False
        if self.effective_to and check_time > self.effective_to:
            return False
        return True

    def to_dict(self) -> Dict:
        return {
            "version": self.version,
            "description": self.description,
            "effective_from": self.effective_from.isoformat(),
            "effective_to": self.effective_to.isoformat() if self.effective_to else None,
            "rules_count": len(self.rules)
        }


class RuleVersionStore:
    def __init__(self):
        self._versions: Dict[str, RuleVersion] = {}
        self._default_version: Optional[str] = None

    def add_version(self, rule_version: RuleVersion) -> None:
        self._versions[rule_version.version] = rule_version
        if self._default_version is None:
            self._default_version = rule_version.version

    def get_version(self, version: str) -> Optional[RuleVersion]:
        return self._versions.get(version)

    def set_default(self, version: str) -> bool:
        if version in self._versions:
            self._default_version = version
            return True
        return False

    def get_default(self) -> Optional[RuleVersion]:
        if self._default_version:
            return self._versions.get(self._default_version)
        return None

    def list_versions(self) -> List[Dict]:
        return [v.to_dict() for v in self._versions.values()]

    def version_exists(self, version: str) -> bool:
        return version in self._versions


rule_version_store = RuleVersionStore()


def _init_default_rules():
    from datetime import datetime, timedelta

    rules_v1 = [
        {
            "id": "R001",
            "name": "用量突增",
            "description": "本期用水量较上期增长超过50%",
            "condition": {
                "metric": "usage_increase_rate",
                "operator": ">",
                "threshold": 0.5
            },
            "action": "intercept",
            "priority": 1
        },
        {
            "id": "R002",
            "name": "用量突降",
            "description": "本期用水量较上期下降超过80%",
            "condition": {
                "metric": "usage_decrease_rate",
                "operator": ">",
                "threshold": 0.8
            },
            "action": "intercept",
            "priority": 2
        },
        {
            "id": "R003",
            "name": "夜间流量异常",
            "description": "凌晨2-6点平均流量超过日间平均流量的30%",
            "condition": {
                "metric": "night_day_ratio",
                "operator": ">",
                "threshold": 0.3
            },
            "action": "review",
            "priority": 3
        },
        {
            "id": "R004",
            "name": "连续零用量",
            "description": "连续7天以上零用水量",
            "condition": {
                "metric": "zero_usage_days",
                "operator": ">=",
                "threshold": 7
            },
            "action": "review",
            "priority": 4
        },
        {
            "id": "R005",
            "name": "压力异常波动",
            "description": "水压波动系数超过0.4",
            "condition": {
                "metric": "pressure_cv",
                "operator": ">",
                "threshold": 0.4
            },
            "action": "pass",
            "priority": 5
        }
    ]

    rv = RuleVersion(
        version="v1.0",
        rules=rules_v1,
        effective_from=datetime(2024, 1, 1),
        description="初始版本，包含5条基础异常判断规则"
    )
    rule_version_store.add_version(rv)

    rules_v2 = [
        {
            "id": "R001",
            "name": "用量突增",
            "description": "本期用水量较上期增长超过40%",
            "condition": {
                "metric": "usage_increase_rate",
                "operator": ">",
                "threshold": 0.4
            },
            "action": "intercept",
            "priority": 1
        },
        {
            "id": "R002",
            "name": "用量突降",
            "description": "本期用水量较上期下降超过70%",
            "condition": {
                "metric": "usage_decrease_rate",
                "operator": ">",
                "threshold": 0.7
            },
            "action": "intercept",
            "priority": 2
        },
        {
            "id": "R003",
            "name": "夜间流量异常",
            "description": "凌晨2-6点平均流量超过日间平均流量的25%",
            "condition": {
                "metric": "night_day_ratio",
                "operator": ">",
                "threshold": 0.25
            },
            "action": "intercept",
            "priority": 3
        },
        {
            "id": "R004",
            "name": "连续零用量",
            "description": "连续5天以上零用水量",
            "condition": {
                "metric": "zero_usage_days",
                "operator": ">=",
                "threshold": 5
            },
            "action": "review",
            "priority": 4
        },
        {
            "id": "R005",
            "name": "压力异常波动",
            "description": "水压波动系数超过0.3",
            "condition": {
                "metric": "pressure_cv",
                "operator": ">",
                "threshold": 0.3
            },
            "action": "review",
            "priority": 5
        },
        {
            "id": "R006",
            "name": "漏水疑似",
            "description": "最小小时流量大于楼栋基准值的150%",
            "condition": {
                "metric": "min_hourly_flow_ratio",
                "operator": ">",
                "threshold": 1.5
            },
            "action": "intercept",
            "priority": 6
        }
    ]

    rv2 = RuleVersion(
        version="v2.0",
        rules=rules_v2,
        effective_from=datetime(2025, 6, 1),
        description="优化版本，调整阈值并新增漏水检测规则"
    )
    rule_version_store.add_version(rv2)
    rule_version_store.set_default("v2.0")


_init_default_rules()
