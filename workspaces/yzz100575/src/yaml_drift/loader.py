from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml


NULL_TOKENS = {"null", "none", "~", "", "nil"}
TRUE_TOKENS = {"true", "yes", "on", "y", "t", "1"}
FALSE_TOKENS = {"false", "no", "off", "n", "f", "0"}


@dataclass
class LoadedConfig:
    env_name: str
    file_path: str
    services: Dict[str, Dict[str, Any]]


def _normalize_value(value: Any, sort_arrays: bool = True) -> Any:
    if value is None:
        return None

    if isinstance(value, str):
        stripped = value.strip()
        lower = stripped.lower()

        if lower in NULL_TOKENS:
            return None

        if lower in TRUE_TOKENS:
            return True

        if lower in FALSE_TOKENS:
            return False

        try:
            if "." in stripped or "e" in lower:
                f = float(stripped)
                if f.is_integer():
                    return int(f)
                return f
            return int(stripped)
        except (ValueError, TypeError):
            pass

        return stripped

    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return value

    if isinstance(value, list):
        normalized = [_normalize_value(item, sort_arrays) for item in value]
        if sort_arrays:
            try:
                normalized = sorted(normalized, key=_sort_key)
            except TypeError:
                pass
        return normalized

    if isinstance(value, dict):
        return {k: _normalize_value(v, sort_arrays) for k, v in value.items()}

    return value


def _sort_key(value: Any) -> Tuple[int, Any]:
    type_order = {
        type(None): 0,
        bool: 1,
        int: 2,
        float: 3,
        str: 4,
        list: 5,
        dict: 6,
    }
    order = type_order.get(type(value), 7)
    try:
        return (order, str(value))
    except Exception:
        return (order, repr(value))


def _extract_services(root: Any) -> Dict[str, Dict[str, Any]]:
    services: Dict[str, Dict[str, Any]] = {}

    if not isinstance(root, dict):
        return services

    has_service_keys = any(
        isinstance(v, dict)
        for v in root.values()
        if not isinstance(v, (str, int, float, bool, list))
    )

    if "services" in root and isinstance(root["services"], dict):
        for svc_name, svc_cfg in root["services"].items():
            if isinstance(svc_cfg, dict):
                services[str(svc_name)] = svc_cfg
    elif has_service_keys:
        for svc_name, svc_cfg in root.items():
            if isinstance(svc_cfg, dict):
                services[str(svc_name)] = svc_cfg
    else:
        services["default"] = root

    return services


def load_yaml_file(
    file_path: str | os.PathLike,
    sort_arrays: bool = True,
    env_name: Optional[str] = None,
) -> LoadedConfig:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"YAML 文件不存在: {path}")

    with open(path, "r", encoding="utf-8") as f:
        try:
            raw_data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            raise ValueError(f"YAML 解析失败 {path}: {e}")

    if raw_data is None:
        raw_data = {}

    normalized_root = _normalize_value(raw_data, sort_arrays)
    if not isinstance(normalized_root, dict):
        normalized_root = {"value": normalized_root}

    services = _extract_services(normalized_root)

    derived_env = env_name or path.stem

    return LoadedConfig(
        env_name=derived_env,
        file_path=str(path.resolve()),
        services=services,
    )


def scan_directory(
    dir_path: str | os.PathLike,
    sort_arrays: bool = True,
    pattern: str = "*.y*ml",
) -> List[LoadedConfig]:
    directory = Path(dir_path)
    if not directory.is_dir():
        raise NotADirectoryError(f"目录不存在或不可访问: {directory}")

    yaml_files = sorted(directory.glob(pattern))
    if not yaml_files:
        yaml_files = sorted(directory.glob("*.yaml"))
    if not yaml_files:
        yaml_files = sorted(directory.glob("*.yml"))

    configs: List[LoadedConfig] = []
    for yaml_file in yaml_files:
        if not yaml_file.is_file():
            continue
        try:
            cfg = load_yaml_file(yaml_file, sort_arrays=sort_arrays)
            configs.append(cfg)
        except Exception as e:
            print(f"[WARN] 跳过 {yaml_file.name}: {e}")

    return configs
