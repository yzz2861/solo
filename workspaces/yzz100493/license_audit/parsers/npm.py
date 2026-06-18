from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from license_audit.config import WhiteListConfig
from license_audit.licensing import parse_license, should_ignore_package
from license_audit.models import (
    DependencyType,
    LicenseInfo,
    Package,
    PackageManager,
    ScanResult,
)


def _npm_dep_type(raw: str) -> DependencyType:
    mapping = {
        "dev": DependencyType.DEVELOPMENT,
        "development": DependencyType.DEVELOPMENT,
        "prod": DependencyType.PRODUCTION,
        "production": DependencyType.PRODUCTION,
        "peer": DependencyType.PEER,
        "optional": DependencyType.OPTIONAL,
        "bundled": DependencyType.BUNDLED,
    }
    return mapping.get(raw.lower(), DependencyType.PRODUCTION)


def parse_package_lock(
    path: Path,
    whitelist: WhiteListConfig,
    include_dev: bool = True,
) -> ScanResult:
    result = ScanResult(scanned_files=[str(path)])
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        result.errors.append(f"读取 package-lock.json 失败: {e}")
        return result

    packages_node = data.get("packages", {})
    if packages_node:
        for pkg_path, info in packages_node.items():
            if not pkg_path:
                continue
            name = info.get("name") or pkg_path.rsplit("node_modules/", 1)[-1]
            if should_ignore_package(name, whitelist):
                continue
            version = info.get("version", "")
            is_dev = info.get("dev", False)
            if is_dev and not include_dev:
                continue
            dep_type = DependencyType.DEVELOPMENT if is_dev else DependencyType.PRODUCTION
            lic_raw = info.get("license", "")
            license_info: LicenseInfo = parse_license(lic_raw, whitelist, package_name=name)
            pkg = Package(
                name=name,
                version=version,
                manager=PackageManager.NPM,
                license=license_info,
                dep_type=dep_type,
                source=info.get("resolved", ""),
                homepage=info.get("homepage", ""),
                repository=info.get("repository", {}).get("url", "") if isinstance(info.get("repository"), dict) else str(info.get("repository", "")),
                author=info.get("author", "") if isinstance(info.get("author"), str) else (info.get("author", {}) or {}).get("name", ""),
                description=info.get("description", ""),
                parents=[str(path)],
                from_exception=name in whitelist.package_exceptions,
            )
            result.packages.append(pkg)
    else:
        deps = data.get("dependencies", {})
        for name, info in deps.items():
            if should_ignore_package(name, whitelist):
                continue
            version = info.get("version", "")
            is_dev = info.get("dev", False)
            if is_dev and not include_dev:
                continue
            dep_type = DependencyType.DEVELOPMENT if is_dev else DependencyType.PRODUCTION
            lic_raw = info.get("license", "")
            license_info = parse_license(lic_raw, whitelist, package_name=name)
            pkg = Package(
                name=name,
                version=version,
                manager=PackageManager.NPM,
                license=license_info,
                dep_type=dep_type,
                source=info.get("resolved", ""),
                parents=[str(path)],
                from_exception=name in whitelist.package_exceptions,
            )
            result.packages.append(pkg)
    return result


def parse_package_json(
    path: Path,
    whitelist: WhiteListConfig,
    include_dev: bool = True,
) -> ScanResult:
    result = ScanResult(scanned_files=[str(path)])
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        result.errors.append(f"读取 package.json 失败: {e}")
        return result

    sections: List[Tuple[str, DependencyType]] = [
        ("dependencies", DependencyType.PRODUCTION),
        ("peerDependencies", DependencyType.PEER),
        ("optionalDependencies", DependencyType.OPTIONAL),
        ("bundledDependencies", DependencyType.BUNDLED),
    ]
    if include_dev:
        sections.append(("devDependencies", DependencyType.DEVELOPMENT))

    for section, dep_type in sections:
        deps = data.get(section, {}) or {}
        if isinstance(deps, list):
            deps = {name: "*" for name in deps}
        for name, version in deps.items():
            if should_ignore_package(name, whitelist):
                continue
            license_info = parse_license("", whitelist, package_name=name)
            license_info.note = "版本范围占位，无许可证信息，请结合锁文件检查"
            pkg = Package(
                name=name,
                version=str(version) if version else "",
                manager=PackageManager.NPM,
                license=license_info,
                dep_type=dep_type,
                parents=[f"{str(path)}#{section}"],
                from_exception=name in whitelist.package_exceptions,
            )
            result.packages.append(pkg)
    return result
