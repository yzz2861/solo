from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from license_audit.config import WhiteListConfig
from license_audit.licensing import parse_license, should_ignore_package
from license_audit.models import (
    DependencyType,
    LicenseInfo,
    Package,
    PackageManager,
    ScanResult,
)


def _parse_yaml(text: str) -> Dict[str, Any]:
    try:
        import yaml

        return yaml.safe_load(text) or {}
    except ImportError:
        return {}


def parse_pnpm_lock(
    path: Path,
    whitelist: WhiteListConfig,
    include_dev: bool = True,
) -> ScanResult:
    result = ScanResult(scanned_files=[str(path)])
    try:
        content = path.read_text(encoding="utf-8")
    except OSError as e:
        result.errors.append(f"读取 pnpm-lock.yaml 失败: {e}")
        return result

    data = _parse_yaml(content)
    if not data:
        result.errors.append("解析 pnpm-lock.yaml 为空，请确保已安装 PyYAML 或 YAML 格式合法")
        return result

    packages = data.get("packages") or data.get("importers", {})
    if isinstance(packages, dict):
        for pkg_key, info in packages.items():
            if not isinstance(info, dict):
                continue
            if pkg_key in (".", "..", ""):
                continue

            if pkg_key.startswith("/"):
                name_version = pkg_key[1:]
            else:
                name_version = pkg_key

            if "@" in name_version and not name_version.startswith("@"):
                idx = name_version.rfind("@")
                name = name_version[:idx]
                version = name_version[idx + 1 :]
            elif name_version.startswith("@"):
                parts = name_version[1:].split("@", 1)
                if len(parts) == 2:
                    name = "@" + parts[0]
                    version = parts[1]
                else:
                    name = name_version
                    version = ""
            else:
                name = name_version
                version = ""

            if not name or should_ignore_package(name, whitelist):
                continue

            is_dev = info.get("dev", False)
            if is_dev and not include_dev:
                continue

            dep_type = DependencyType.DEVELOPMENT if is_dev else DependencyType.PRODUCTION
            lic_raw = info.get("license", "") or info.get("licenses", "")
            license_info: LicenseInfo = parse_license(lic_raw, whitelist, package_name=name)
            pkg = Package(
                name=name,
                version=version,
                manager=PackageManager.PNPM,
                license=license_info,
                dep_type=dep_type,
                source=info.get("resolution", ""),
                parents=[str(path)],
                from_exception=name in whitelist.package_exceptions,
            )
            result.packages.append(pkg)

    return result
