from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from license_audit.config import WhiteListConfig
from license_audit.models import ScanResult

from license_audit.parsers.npm import parse_package_json, parse_package_lock
from license_audit.parsers.yarn import parse_yarn_lock
from license_audit.parsers.pnpm import parse_pnpm_lock
from license_audit.parsers.python import (
    parse_pipfile_lock,
    parse_poetry_lock,
    parse_pyproject_toml,
    parse_requirements_txt,
)


PARSER_REGISTRY = {
    "package.json": parse_package_json,
    "package-lock.json": parse_package_lock,
    "yarn.lock": parse_yarn_lock,
    "pnpm-lock.yaml": parse_pnpm_lock,
    "requirements.txt": parse_requirements_txt,
    "poetry.lock": parse_poetry_lock,
    "Pipfile.lock": parse_pipfile_lock,
    "pyproject.toml": parse_pyproject_toml,
}


def detect_and_parse(
    project_root: Path,
    whitelist: WhiteListConfig,
    lockfile_names: Optional[List[str]] = None,
    include_dev: bool = True,
) -> ScanResult:
    merged = ScanResult()
    names = lockfile_names or list(PARSER_REGISTRY.keys())

    seen_keys = set()
    for name in names:
        parser = PARSER_REGISTRY.get(name)
        if not parser:
            continue
        candidates = list(project_root.rglob(name))
        for path in candidates:
            if any(part in {".git", "node_modules", "__pycache__", ".venv", "venv", "env"} for part in path.parts):
                continue
            try:
                sub = parser(path, whitelist, include_dev=include_dev)
            except Exception as e:
                merged.errors.append(f"解析 {path} 失败: {e}")
                continue
            merged.scanned_files.extend(sub.scanned_files)
            merged.errors.extend(sub.errors)
            for pkg in sub.packages:
                if pkg.key in seen_keys:
                    continue
                seen_keys.add(pkg.key)
                merged.packages.append(pkg)

    return merged
