from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import yaml


@dataclass
class IgnoreConfig:
    exact_paths: Set[str] = field(default_factory=set)
    glob_patterns: Set[str] = field(default_factory=set)
    services: Set[str] = field(default_factory=set)

    def is_ignored_service(self, service: str) -> bool:
        return service in self.services

    def ignore_path(self, path: str) -> None:
        self.exact_paths.add(path)

    def ignore_pattern(self, pattern: str) -> None:
        self.glob_patterns.add(pattern)

    def ignore_service(self, service: str) -> None:
        self.services.add(service)


def load_ignore_config(path: str) -> IgnoreConfig:
    config = IgnoreConfig()
    p = Path(path)

    if not p.exists():
        return config

    with open(p, "r", encoding="utf-8") as f:
        try:
            data = yaml.safe_load(f) or {}
        except yaml.YAMLError:
            return config

    if not isinstance(data, dict):
        return config

    if isinstance(data.get("paths"), list):
        for item in data["paths"]:
            if isinstance(item, str):
                config.exact_paths.add(item.strip())

    if isinstance(data.get("patterns"), list):
        for item in data["patterns"]:
            if isinstance(item, str):
                config.glob_patterns.add(item.strip())

    if isinstance(data.get("services"), list):
        for item in data["services"]:
            if isinstance(item, str):
                config.services.add(item.strip())

    if isinstance(data.get("ignore"), list):
        for item in data["ignore"]:
            if not isinstance(item, str):
                continue
            s = item.strip()
            if any(ch in s for ch in "*?[]"):
                config.glob_patterns.add(s)
            else:
                config.exact_paths.add(s)

    return config


def mask_sensitive_value(value: Any, path: str) -> Any:
    if value is None:
        return None

    if isinstance(value, (bool, int, float)):
        return value

    if isinstance(value, str):
        if not value:
            return value
        return _mask_string(value)

    if isinstance(value, list):
        return [mask_sensitive_value(item, path) for item in value]

    if isinstance(value, dict):
        return {
            k: mask_sensitive_value(v, f"{path}.{k}")
            for k, v in value.items()
        }

    return value


def _mask_string(s: str) -> str:
    length = len(s)

    if length <= 2:
        return "*" * length

    if length <= 6:
        return s[0] + "*" * (length - 2) + s[-1]

    keep_start = 2
    keep_end = 2
    masked_len = length - keep_start - keep_end

    if masked_len >= 8:
        mask = "********"
    else:
        mask = "*" * masked_len

    return s[:keep_start] + mask + s[-keep_end:]


def mask_diff_env_values(env_values: Dict[str, Any], path: str) -> Dict[str, Any]:
    return {
        env: mask_sensitive_value(val, path)
        for env, val in env_values.items()
    }
