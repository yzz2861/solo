"""配置加载工具"""
import json
import os
from typing import List, Dict, Any
from ..models import ConflictRule, ConflictType


DEFAULT_RULES: List[Dict[str, Any]] = [
    {
        "rule_type": "same_institution",
        "description": "同一单位回避",
        "enabled": True,
        "params": {}
    },
    {
        "rule_type": "co_author",
        "description": "共同作者回避",
        "enabled": True,
        "params": {
            "lookback_years": 5
        }
    },
    {
        "rule_type": "supervisor",
        "description": "师生关系回避",
        "enabled": True,
        "params": {}
    },
    {
        "rule_type": "recent_collaboration",
        "description": "近期合作回避",
        "enabled": False,
        "params": {
            "lookback_years": 3
        }
    }
]


def load_rules(rules_file: str = "") -> List[ConflictRule]:
    if not rules_file or not os.path.exists(rules_file):
        return [_dict_to_rule(r) for r in DEFAULT_RULES if r.get("enabled", True)]

    with open(rules_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    rules = data if isinstance(data, list) else data.get("rules", [])
    return [_dict_to_rule(r) for r in rules if r.get("enabled", True)]


def _dict_to_rule(d: Dict[str, Any]) -> ConflictRule:
    return ConflictRule(
        rule_type=ConflictType(d["rule_type"]),
        description=d.get("description", ""),
        enabled=d.get("enabled", True),
        params=d.get("params", {}),
    )


def load_snapshot(snapshot_file: str) -> Dict[str, Any]:
    if not snapshot_file or not os.path.exists(snapshot_file):
        return {"assignments": [], "batch_info": {}}

    with open(snapshot_file, "r", encoding="utf-8") as f:
        return json.load(f)
