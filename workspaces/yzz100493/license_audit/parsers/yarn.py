from __future__ import annotations

import re
from pathlib import Path
from typing import List, Tuple

from license_audit.config import WhiteListConfig
from license_audit.licensing import parse_license, should_ignore_package
from license_audit.models import (
    DependencyType,
    LicenseInfo,
    Package,
    PackageManager,
    ScanResult,
)


YARN_BLOCK_RE = re.compile(
    r'^"?(@?[^"@\n]+)@(?:npm:)?([^"\n,]+)[",]?\s*:\s*$',
    re.MULTILINE,
)
YARN_FIELD_RE = re.compile(r'^\s+"?([A-Za-z][A-Za-z0-9\-_]*)"?\s+"?(.*?)"?\s*$')


def parse_yarn_lock(
    path: Path,
    whitelist: WhiteListConfig,
    include_dev: bool = True,
) -> ScanResult:
    result = ScanResult(scanned_files=[str(path)])
    try:
        content = path.read_text(encoding="utf-8")
    except OSError as e:
        result.errors.append(f"读取 yarn.lock 失败: {e}")
        return result

    lines = content.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = YARN_BLOCK_RE.match(line)
        if not m:
            i += 1
            continue

        names_versions: List[Tuple[str, str]] = []
        while i < len(lines):
            line = lines[i]
            header_match = YARN_BLOCK_RE.match(line)
            if not header_match:
                break
            names_versions.append((header_match.group(1), header_match.group(2).strip()))
            i += 1

        fields = {}
        while i < len(lines):
            line = lines[i]
            if line.strip() == "":
                break
            fm = YARN_FIELD_RE.match(line)
            if fm:
                fields[fm.group(1)] = fm.group(2).strip()
            i += 1

        if not names_versions or "version" not in fields:
            continue

        resolved_version = fields["version"]
        resolved = fields.get("resolved", "")
        license_raw = fields.get("license", "")

        for pkg_name, _range in names_versions:
            if should_ignore_package(pkg_name, whitelist):
                continue
            license_info: LicenseInfo = parse_license(license_raw, whitelist, package_name=pkg_name)
            dep_type = DependencyType.PRODUCTION
            pkg = Package(
                name=pkg_name,
                version=resolved_version,
                manager=PackageManager.YARN,
                license=license_info,
                dep_type=dep_type,
                source=resolved,
                parents=[str(path)],
                from_exception=pkg_name in whitelist.package_exceptions,
            )
            result.packages.append(pkg)

    return result
