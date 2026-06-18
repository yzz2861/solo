from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple

from license_audit.models import DependencyType, Package


JS_NAME_RE = re.compile(r"node_modules[/\\](@?[^/\\\s]+?)(?:[/\\]([^/\\\s]+?))?[/\\]")
JS_LICENSE_BANNER_RE = re.compile(
    r"/\*[\s\S]*?(?:@license|License|MIT|GPL|Apache|BSD|ISC)[\s\S]*?\*/",
    re.IGNORECASE,
)
PKG_JSON_NAME_RE = re.compile(r'"name"\s*:\s*"([^"]+)"')
PKG_JSON_VERSION_RE = re.compile(r'"version"\s*:\s*"([^"]+)"')
PKG_JSON_LICENSE_RE = re.compile(r'"license"\s*:\s*"([^"]+)"')


def _scan_node_modules_licenses(artifact_root: Path) -> Dict[str, Tuple[str, str]]:
    found: Dict[str, Tuple[str, str]] = {}
    for pkg_json in artifact_root.rglob("package.json"):
        try:
            text = pkg_json.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        nm = PKG_JSON_NAME_RE.search(text)
        vm = PKG_JSON_VERSION_RE.search(text)
        if not nm:
            continue
        name = nm.group(1)
        version = vm.group(1) if vm else ""
        lm = PKG_JSON_LICENSE_RE.search(text)
        lic = lm.group(1) if lm else ""
        found[f"{name}@{version}"] = (name, version)
    return found


def _scan_js_bundle_names(content: str) -> Set[str]:
    names: Set[str] = set()
    for m in JS_NAME_RE.finditer(content):
        scope = m.group(1)
        rest = m.group(2)
        if scope.startswith("@") and rest:
            names.add(f"{scope}/{rest}")
        else:
            names.add(scope)
    return names


def scan_artifacts(
    project_root: Path,
    artifact_paths: List[str],
    known_packages: List[Package],
) -> Dict[str, bool]:
    """
    扫描前端构建产物，检查哪些包被打进了产物。
    返回 {package_key: True/False 是否存在于产物中}
    """
    artifact_presence: Dict[str, bool] = {}
    known_npm = {
        f"{p.name}@{p.version}": p
        for p in known_packages
        if p.manager.value in {"npm", "yarn", "pnpm"}
    }

    nm_license_pkgs: Dict[str, Tuple[str, str]] = {}
    for sub in artifact_paths:
        p = project_root / sub
        if not p.exists():
            continue
        if (p / "node_modules").exists():
            nm_license_pkgs.update(_scan_node_modules_licenses(p / "node_modules"))

    bundle_pkg_names: Set[str] = set()
    for sub in artifact_paths:
        p = project_root / sub
        if not p.exists():
            continue
        for f in p.rglob("*"):
            if not f.is_file():
                continue
            if f.suffix not in {".js", ".mjs", ".cjs"}:
                continue
            try:
                with open(f, encoding="utf-8", errors="ignore") as fh:
                    chunk = fh.read(2 * 1024 * 1024)
            except OSError:
                continue
            bundle_pkg_names.update(_scan_js_bundle_names(chunk))

    for pkg in known_packages:
        key = f"{pkg.name}@{pkg.version}"
        present = False
        if pkg.manager.value in {"npm", "yarn", "pnpm"}:
            if key in nm_license_pkgs or pkg.name in bundle_pkg_names:
                present = True
        artifact_presence[pkg.key] = present

    return artifact_presence


def detect_dev_in_prod(
    packages: List[Package],
    artifact_presence: Dict[str, bool],
) -> List[Package]:
    """
    检测声明为开发依赖但最终出现在产物中的包。
    """
    results: List[Package] = []
    for pkg in packages:
        if pkg.dep_type == DependencyType.DEVELOPMENT and artifact_presence.get(pkg.key, False):
            pkg.in_artifact = True
            pkg.issues.append("该包声明为开发依赖，但检测到进入了构建产物")
            results.append(pkg)
    return results
