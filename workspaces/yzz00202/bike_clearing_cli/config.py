import os
import yaml
from typing import Optional
from .models import RuleConfig


DEFAULT_RULE_CONFIG = RuleConfig()


def load_rule_config(config_path: Optional[str] = None) -> RuleConfig:
    if not config_path:
        return DEFAULT_RULE_CONFIG

    if not os.path.exists(config_path):
        raise FileNotFoundError(f"规则配置文件不存在: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        raw_config = yaml.safe_load(f) or {}

    config = RuleConfig()

    if "station_capacity" in raw_config:
        cap = raw_config["station_capacity"]
        if "low" in cap:
            config.station_capacity_low = int(cap["low"])
        if "medium" in cap:
            config.station_capacity_medium = int(cap["medium"])

    if "occupancy_rate" in raw_config:
        rate = raw_config["occupancy_rate"]
        if "medium" in rate:
            config.occupancy_rate_medium = float(rate["medium"])
        if "high" in rate:
            config.occupancy_rate_high = float(rate["high"])

    if "required_fields" in raw_config:
        config.required_fields = list(raw_config["required_fields"])

    if "numeric_fields" in raw_config:
        config.numeric_fields = list(raw_config["numeric_fields"])

    if "diff_fields" in raw_config:
        config.diff_fields = list(raw_config["diff_fields"])

    _validate_config(config)
    return config


def _validate_config(config: RuleConfig) -> None:
    errors = []

    if config.station_capacity_low <= 0:
        errors.append("station_capacity_low 必须大于 0")

    if config.station_capacity_medium <= config.station_capacity_low:
        errors.append("station_capacity_medium 必须大于 station_capacity_low")

    if not 0 < config.occupancy_rate_medium < 1:
        errors.append("occupancy_rate_medium 必须在 (0, 1) 之间")

    if not 0 < config.occupancy_rate_high < 1:
        errors.append("occupancy_rate_high 必须在 (0, 1) 之间")

    if config.occupancy_rate_high <= config.occupancy_rate_medium:
        errors.append("occupancy_rate_high 必须大于 occupancy_rate_medium")

    if not config.required_fields:
        errors.append("required_fields 不能为空")

    if errors:
        raise ValueError("规则配置校验失败:\n" + "\n".join(f"- {e}" for e in errors))
