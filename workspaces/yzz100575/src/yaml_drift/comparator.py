from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

from .loader import LoadedConfig


class DiffType(str, Enum):
    ADDED = "added"
    REMOVED = "removed"
    MODIFIED = "modified"
    TYPE_MISMATCH = "type_mismatch"


class RiskLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


HIGH_RISK_KEYWORDS = {
    "password", "passwd", "pwd", "secret", "token", "apikey", "api_key",
    "access_key", "private_key", "cert", "credential",
    "port", "listen", "bind", "host", "address", "endpoint", "url",
    "enabled", "disabled", "switch", "flag", "active",
    "limit", "throttle", "rate", "qps", "rps", "quota", "burst", "capacity",
    "replicas", "replica", "min_replicas", "max_replicas",
    "cpu", "memory", "ram", "disk", "storage",
    "timeout", "retry", "retries", "deadline",
    "debug", "verbose", "trace", "log_level",
    "feature", "toggle", "rollout", "canary",
}

MEDIUM_RISK_KEYWORDS = {
    "name", "version", "tag", "image",
    "path", "dir", "directory", "folder",
    "user", "username", "owner", "group",
    "size", "count", "max", "min", "interval",
    "prefix", "suffix", "namespace", "cluster",
}


@dataclass
class DiffEntry:
    path: str
    diff_type: DiffType
    service: str
    env_values: Dict[str, Any] = field(default_factory=dict)
    risk_level: RiskLevel = RiskLevel.INFO
    is_sensitive: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "path": self.path,
            "diff_type": self.diff_type.value,
            "service": self.service,
            "env_values": self.env_values,
            "risk_level": self.risk_level.value,
            "is_sensitive": self.is_sensitive,
        }


@dataclass
class ComparisonResult:
    envs: List[str]
    services: List[str]
    diffs: List[DiffEntry] = field(default_factory=list)
    ignored_paths: List[str] = field(default_factory=list)

    @property
    def high_risk_count(self) -> int:
        return sum(1 for d in self.diffs if d.risk_level == RiskLevel.HIGH)

    @property
    def medium_risk_count(self) -> int:
        return sum(1 for d in self.diffs if d.risk_level == RiskLevel.MEDIUM)

    @property
    def total_count(self) -> int:
        return len(self.diffs)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "envs": self.envs,
            "services": self.services,
            "diffs": [d.to_dict() for d in self.diffs],
            "ignored_paths": self.ignored_paths,
            "summary": {
                "total": self.total_count,
                "high_risk": self.high_risk_count,
                "medium_risk": self.medium_risk_count,
                "low_risk": sum(1 for d in self.diffs if d.risk_level == RiskLevel.LOW),
                "info": sum(1 for d in self.diffs if d.risk_level == RiskLevel.INFO),
            },
        }


def _join_path(parent: str, key: str) -> str:
    if not parent:
        return str(key)
    return f"{parent}.{key}"


def _is_sensitive(path: str) -> bool:
    path_lower = path.lower()
    sensitive_keywords = HIGH_RISK_KEYWORDS & {
        "password", "passwd", "pwd", "secret", "token",
        "apikey", "api_key", "access_key", "private_key",
        "cert", "credential",
    }
    return any(kw in path_lower for kw in sensitive_keywords)


def _assess_risk(path: str, diff_type: DiffType) -> RiskLevel:
    path_lower = path.lower()

    for kw in HIGH_RISK_KEYWORDS:
        if kw in path_lower:
            if diff_type in (DiffType.MODIFIED, DiffType.TYPE_MISMATCH):
                return RiskLevel.HIGH
            if diff_type in (DiffType.ADDED, DiffType.REMOVED):
                return RiskLevel.MEDIUM

    for kw in MEDIUM_RISK_KEYWORDS:
        if kw in path_lower:
            if diff_type in (DiffType.MODIFIED, DiffType.TYPE_MISMATCH):
                return RiskLevel.MEDIUM
            return RiskLevel.LOW

    return RiskLevel.LOW


def _type_name(value: Any) -> str:
    return type(value).__name__


def compare_configs(
    configs: List[LoadedConfig],
    ignore_paths: Optional[Set[str]] = None,
    ignore_patterns: Optional[Set[str]] = None,
) -> ComparisonResult:
    ignore_paths = ignore_paths or set()
    ignore_patterns = ignore_patterns or set()

    envs = [cfg.env_name for cfg in configs]
    all_services: Set[str] = set()
    for cfg in configs:
        all_services.update(cfg.services.keys())
    services = sorted(all_services)

    result = ComparisonResult(envs=envs, services=services)

    for service in services:
        svc_configs: Dict[str, Dict[str, Any]] = {}
        for cfg in configs:
            svc_configs[cfg.env_name] = cfg.services.get(service, {})

        all_paths = _collect_all_paths(svc_configs, service)

        for full_path in all_paths:
            prefixed_path = f"{service}.{full_path}"
            if _should_ignore(prefixed_path, ignore_paths, ignore_patterns):
                result.ignored_paths.append(prefixed_path)
                continue

            diff = _compare_path_across_envs(
                full_path, service, svc_configs, envs
            )
            if diff is not None:
                diff.path = prefixed_path
                result.diffs.append(diff)

    result.diffs = _filter_container_nodes(result.diffs)

    result.diffs.sort(key=lambda d: (
        -_risk_priority(d.risk_level),
        d.service,
        d.path,
    ))

    return result


def _is_path_prefix(prefix: str, path: str) -> bool:
    if prefix == path:
        return False
    if not path.startswith(prefix):
        return False
    sep = path[len(prefix):len(prefix) + 1]
    return sep in (".", "[")


def _filter_container_nodes(diffs: List[DiffEntry]) -> List[DiffEntry]:
    if not diffs:
        return diffs

    by_service: Dict[str, Set[str]] = {}
    for d in diffs:
        by_service.setdefault(d.service, set()).add(d.path)

    def has_child(d: DiffEntry) -> bool:
        paths = by_service.get(d.service, set())
        return any(_is_path_prefix(d.path, p) for p in paths)

    def all_dicts_or_lists(d: DiffEntry) -> bool:
        return all(isinstance(v, (dict, list)) for v in d.env_values.values())

    filtered: List[DiffEntry] = []
    for d in diffs:
        if has_child(d) and all_dicts_or_lists(d) and d.diff_type in (DiffType.MODIFIED, DiffType.ADDED, DiffType.REMOVED):
            continue
        filtered.append(d)

    return filtered


def _risk_priority(level: RiskLevel) -> int:
    return {
        RiskLevel.HIGH: 4,
        RiskLevel.MEDIUM: 3,
        RiskLevel.LOW: 2,
        RiskLevel.INFO: 1,
    }.get(level, 0)


def _should_ignore(
    path: str,
    ignore_paths: Set[str],
    ignore_patterns: Set[str],
) -> bool:
    if path in ignore_paths:
        return True

    for ip in ignore_paths:
        if path.startswith(ip + ".") or path.startswith(ip + "["):
            return True

    import fnmatch
    for pattern in ignore_patterns:
        if fnmatch.fnmatch(path, pattern):
            return True

    return False


def _collect_all_paths(
    svc_configs: Dict[str, Dict[str, Any]],
    service: str,
) -> Set[str]:
    paths: Set[str] = set()

    for env_name, cfg in svc_configs.items():
        _walk_dict(cfg, "", paths)

    return paths


def _walk_dict(obj: Any, current_path: str, paths: Set[str]) -> None:
    if isinstance(obj, dict):
        for key, value in obj.items():
            new_path = _join_path(current_path, key)
            paths.add(new_path)
            if isinstance(value, (dict, list)):
                _walk_dict(value, new_path, paths)
    elif isinstance(obj, list):
        for idx, item in enumerate(obj):
            new_path = f"{current_path}[{idx}]"
            paths.add(new_path)
            if isinstance(item, (dict, list)):
                _walk_dict(item, new_path, paths)


def _get_value_at_path(obj: Any, path: str) -> Tuple[bool, Any]:
    if not path:
        return True, obj

    parts = _split_path(path)
    current = obj

    for part in parts:
        if isinstance(part, int):
            if not isinstance(current, list) or part >= len(current):
                return False, None
            current = current[part]
        else:
            if not isinstance(current, dict) or part not in current:
                return False, None
            current = current[part]

    return True, current


def _split_path(path: str) -> List[Any]:
    parts: List[Any] = []
    current = ""
    i = 0

    while i < len(path):
        ch = path[i]
        if ch == ".":
            if current:
                parts.append(current)
                current = ""
        elif ch == "[":
            if current:
                parts.append(current)
                current = ""
            j = path.index("]", i)
            idx_str = path[i + 1:j]
            try:
                parts.append(int(idx_str))
            except ValueError:
                parts.append(idx_str)
            i = j
        else:
            current += ch
        i += 1

    if current:
        parts.append(current)

    return parts


def _compare_path_across_envs(
    full_path: str,
    service: str,
    svc_configs: Dict[str, Dict[str, Any]],
    envs: List[str],
) -> Optional[DiffEntry]:
    env_values: Dict[str, Any] = {}
    existence: Dict[str, bool] = {}

    for env in envs:
        exists, value = _get_value_at_path(svc_configs.get(env, {}), full_path)
        existence[env] = exists
        if exists:
            env_values[env] = value

    existing_envs = [e for e in envs if existence[e]]
    missing_envs = [e for e in envs if not existence[e]]

    if not existing_envs:
        return None

    if missing_envs and existing_envs:
        diff_type = DiffType.ADDED if len(existing_envs) < len(envs) / 2 else DiffType.REMOVED
    else:
        diff_type = DiffType.MODIFIED

    values_list = list(env_values.values())
    all_same = True
    first_val = values_list[0] if values_list else None

    for val in values_list[1:]:
        if not _deep_equal(first_val, val):
            all_same = False
            break

    types = set(type(v).__name__ for v in values_list)
    if len(types) > 1:
        diff_type = DiffType.TYPE_MISMATCH

    if all_same and not missing_envs:
        return None

    entry = DiffEntry(
        path=full_path,
        diff_type=diff_type,
        service=service,
        env_values=env_values,
        risk_level=_assess_risk(full_path, diff_type),
        is_sensitive=_is_sensitive(full_path),
    )

    return entry


def _deep_equal(a: Any, b: Any) -> bool:
    if type(a) is not type(b):
        return False

    if isinstance(a, dict):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(_deep_equal(a[k], b[k]) for k in a)

    if isinstance(a, list):
        if len(a) != len(b):
            return False
        return all(_deep_equal(x, y) for x, y in zip(a, b))

    return a == b
