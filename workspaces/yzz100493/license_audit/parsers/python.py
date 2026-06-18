from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from license_audit.config import WhiteListConfig
from license_audit.licensing import parse_license, should_ignore_package
from license_audit.models import (
    DependencyType,
    LicenseInfo,
    Package,
    PackageManager,
    ScanResult,
)


REQ_LINE_RE = re.compile(
    r"^\s*([A-Za-z0-9_.\-]+)\s*(?:\[.*?\])?\s*((?:==|>=|<=|!=|~=|>|<)\s*[^\s;#]+)?\s*.*$"
)


def _python_license_from_metadata(pkg_name: str, version: str) -> str:
    try:
        from importlib.metadata import metadata as _md, PackageNotFoundError

        try:
            md = _md(f"{pkg_name}=={version}" if version else pkg_name)
            classifiers = md.get_all("Classifier", []) or []
            for c in classifiers:
                if c.startswith("License ::"):
                    return c.split("::")[-1].strip()
            lic = md.get("License", "")
            if lic and lic.lower() not in {"unknown", ""}:
                return lic
        except PackageNotFoundError:
            pass
    except Exception:
        pass
    return ""


def parse_requirements_txt(
    path: Path,
    whitelist: WhiteListConfig,
    include_dev: bool = True,
) -> ScanResult:
    result = ScanResult(scanned_files=[str(path)])
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as e:
        result.errors.append(f"读取 requirements.txt 失败: {e}")
        return result

    is_dev_file = any(k in path.name.lower() for k in ["dev", "test", "devel"])

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("-r ") or line.startswith("-c ") or line.startswith("--"):
            continue
        m = REQ_LINE_RE.match(line)
        if not m:
            continue
        name = m.group(1)
        version_raw = m.group(2) or ""
        version = version_raw.lstrip("=<>~!").strip()
        if should_ignore_package(name, whitelist):
            continue
        dep_type = DependencyType.DEVELOPMENT if is_dev_file else DependencyType.PRODUCTION
        if not include_dev and dep_type == DependencyType.DEVELOPMENT:
            continue
        lic_raw = _python_license_from_metadata(name, version)
        license_info: LicenseInfo = parse_license(lic_raw, whitelist, package_name=name)
        pkg = Package(
            name=name,
            version=version,
            manager=PackageManager.PIP,
            license=license_info,
            dep_type=dep_type,
            source=line,
            parents=[str(path)],
            from_exception=name in whitelist.package_exceptions,
        )
        result.packages.append(pkg)

    return result


def parse_poetry_lock(
    path: Path,
    whitelist: WhiteListConfig,
    include_dev: bool = True,
) -> ScanResult:
    result = ScanResult(scanned_files=[str(path)])
    try:
        content = path.read_text(encoding="utf-8")
    except OSError as e:
        result.errors.append(f"读取 poetry.lock 失败: {e}")
        return result

    try:
        import toml

        if hasattr(toml, "loads"):
            data = toml.loads(content)
        else:
            data = {}
    except Exception:
        try:
            import tomli

            data = tomli.loads(content)
        except Exception:
            data = {}

    packages: List[Dict[str, Any]] = data.get("package", [])
    if not isinstance(packages, list):
        packages = []

    for info in packages:
        name = info.get("name", "")
        if not name or should_ignore_package(name, whitelist):
            continue
        version = info.get("version", "")
        is_dev = info.get("category", "") == "dev"
        if is_dev and not include_dev:
            continue
        dep_type = DependencyType.DEVELOPMENT if is_dev else DependencyType.PRODUCTION

        lic_raw = ""
        lic_val = info.get("license")
        if isinstance(lic_val, list):
            lic_raw = " OR ".join(lic_val)
        elif isinstance(lic_val, str):
            lic_raw = lic_val

        license_info: LicenseInfo = parse_license(lic_raw, whitelist, package_name=name)
        source_val = info.get("source", {}) or {}
        source_url = source_val.get("url", "") if isinstance(source_val, dict) else ""
        pkg = Package(
            name=name,
            version=version,
            manager=PackageManager.POETRY,
            license=license_info,
            dep_type=dep_type,
            source=source_url,
            homepage=info.get("homepage", "") or (info.get("urls", {}) or {}).get("Homepage", ""),
            repository=info.get("repository", "") or (info.get("urls", {}) or {}).get("Repository", ""),
            author=", ".join(info.get("authors", []) or []),
            description=info.get("description", ""),
            parents=[str(path)],
            from_exception=name in whitelist.package_exceptions,
        )
        result.packages.append(pkg)

    return result


def parse_pipfile_lock(
    path: Path,
    whitelist: WhiteListConfig,
    include_dev: bool = True,
) -> ScanResult:
    result = ScanResult(scanned_files=[str(path)])
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        result.errors.append(f"读取 Pipfile.lock 失败: {e}")
        return result

    sections: List[Tuple[str, DependencyType]] = [
        ("default", DependencyType.PRODUCTION),
    ]
    if include_dev:
        sections.append(("develop", DependencyType.DEVELOPMENT))

    for section, dep_type in sections:
        deps = data.get(section, {})
        if not isinstance(deps, dict):
            continue
        for name, info in deps.items():
            if not isinstance(info, dict) or should_ignore_package(name, whitelist):
                continue
            version = str(info.get("version", "")).lstrip("=")
            lic_raw = info.get("license", "")
            license_info: LicenseInfo = parse_license(lic_raw, whitelist, package_name=name)
            pkg = Package(
                name=name,
                version=version,
                manager=PackageManager.PIPFILE,
                license=license_info,
                dep_type=dep_type,
                source=info.get("index", "") or (info.get("hashes", []) or [""])[0],
                parents=[f"{str(path)}#{section}"],
                from_exception=name in whitelist.package_exceptions,
            )
            result.packages.append(pkg)

    return result


def parse_pyproject_toml(
    path: Path,
    whitelist: WhiteListConfig,
    include_dev: bool = True,
) -> ScanResult:
    result = ScanResult(scanned_files=[str(path)])
    try:
        content = path.read_text(encoding="utf-8")
    except OSError as e:
        result.errors.append(f"读取 pyproject.toml 失败: {e}")
        return result

    try:
        import tomli

        data = tomli.loads(content)
    except Exception:
        try:
            import toml

            if hasattr(toml, "loads"):
                data = toml.loads(content)
            else:
                data = {}
        except Exception:
            data = {}

    project = data.get("project", {})
    sections: List[Tuple[Any, DependencyType]] = [
        (project.get("dependencies", []), DependencyType.PRODUCTION),
    ]
    if include_dev:
        optional = project.get("optional-dependencies", {}) or {}
        for group_name, deps in optional.items():
            if any(k in group_name.lower() for k in ["dev", "test", "lint", "doc", "devel"]):
                sections.append((deps, DependencyType.DEVELOPMENT))

    poetry = data.get("tool", {}).get("poetry", {})
    if poetry:
        sections.append((poetry.get("dependencies", {}), DependencyType.PRODUCTION))
        if include_dev:
            dev = poetry.get("dev-dependencies", {}) or poetry.get("group", {}).get("dev", {}).get("dependencies", {})
            sections.append((dev, DependencyType.DEVELOPMENT))

    for deps, dep_type in sections:
        if not deps:
            continue
        if isinstance(deps, dict):
            for name, spec in deps.items():
                if should_ignore_package(name, whitelist):
                    continue
                version = ""
                if isinstance(spec, str):
                    version = spec
                elif isinstance(spec, dict):
                    version = str(spec.get("version", ""))
                license_info: LicenseInfo = parse_license("", whitelist, package_name=name)
                license_info.note = "版本范围占位，无许可证信息，请结合锁文件检查"
                pkg = Package(
                    name=name,
                    version=version,
                    manager=PackageManager.POETRY,
                    license=license_info,
                    dep_type=dep_type,
                    parents=[str(path)],
                    from_exception=name in whitelist.package_exceptions,
                )
                result.packages.append(pkg)
        elif isinstance(deps, list):
            for item in deps:
                m = REQ_LINE_RE.match(str(item))
                if not m:
                    continue
                name = m.group(1)
                if should_ignore_package(name, whitelist):
                    continue
                version = (m.group(2) or "").lstrip("=<>~!").strip()
                license_info = parse_license("", whitelist, package_name=name)
                license_info.note = "版本范围占位，无许可证信息，请结合锁文件检查"
                pkg = Package(
                    name=name,
                    version=version,
                    manager=PackageManager.PIP,
                    license=license_info,
                    dep_type=dep_type,
                    parents=[str(path)],
                    from_exception=name in whitelist.package_exceptions,
                )
                result.packages.append(pkg)

    return result
