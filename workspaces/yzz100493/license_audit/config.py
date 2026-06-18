from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


DEFAULT_WHITELIST_LICENSES = [
    "MIT",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "Apache-2.0",
    "Python-2.0",
    "PSF",
    "ISC",
    "Unlicense",
    "CC0-1.0",
    "Zlib",
    "X11",
]

DEFAULT_RESTRICTED_LICENSES = [
    "GPL-2.0",
    "GPL-3.0",
    "AGPL-3.0",
    "LGPL-3.0",
    "SSPL-1.0",
    "EUPL-1.2",
    "MPL-2.0",
]

DEFAULT_UNCERTAIN_LICENSES = [
    "UNKNOWN",
    "Proprietary",
    "Commercial",
]


@dataclass
class WhiteListConfig:
    licenses: List[str] = field(default_factory=lambda: list(DEFAULT_WHITELIST_LICENSES))
    restricted: List[str] = field(default_factory=lambda: list(DEFAULT_RESTRICTED_LICENSES))
    uncertain: List[str] = field(default_factory=lambda: list(DEFAULT_UNCERTAIN_LICENSES))
    package_exceptions: Dict[str, str] = field(default_factory=dict)
    ignore_packages: List[str] = field(default_factory=list)
    ignore_scopes: List[str] = field(default_factory=list)


@dataclass
class ScanConfig:
    project_root: Path
    include_dev_dependencies: bool = False
    check_build_artifacts: bool = True
    artifact_paths: List[str] = field(default_factory=lambda: ["dist", "build", "out", ".next", ".nuxt"])
    lockfile_paths: List[str] = field(default_factory=lambda: [
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "requirements.txt",
        "Pipfile.lock",
        "poetry.lock",
        "pyproject.toml",
    ])
    history_dir: str = ".license-history"
    output_dir: str = "license-report"


@dataclass
class AppConfig:
    whitelist: WhiteListConfig
    scan: ScanConfig

    @classmethod
    def from_dict(cls, data: Dict[str, Any], project_root: Optional[Path] = None) -> "AppConfig":
        root = Path(project_root or os.getcwd()).resolve()

        wl = data.get("whitelist", {})
        whitelist = WhiteListConfig(
            licenses=wl.get("licenses", list(DEFAULT_WHITELIST_LICENSES)),
            restricted=wl.get("restricted", list(DEFAULT_RESTRICTED_LICENSES)),
            uncertain=wl.get("uncertain", list(DEFAULT_UNCERTAIN_LICENSES)),
            package_exceptions=wl.get("package_exceptions", {}),
            ignore_packages=wl.get("ignore_packages", []),
            ignore_scopes=wl.get("ignore_scopes", []),
        )

        sc = data.get("scan", {})
        scan = ScanConfig(
            project_root=root,
            include_dev_dependencies=sc.get("include_dev_dependencies", False),
            check_build_artifacts=sc.get("check_build_artifacts", True),
            artifact_paths=sc.get("artifact_paths", ["dist", "build", "out", ".next", ".nuxt"]),
            lockfile_paths=sc.get("lockfile_paths", [
                "package-lock.json",
                "yarn.lock",
                "pnpm-lock.yaml",
                "requirements.txt",
                "Pipfile.lock",
                "poetry.lock",
                "pyproject.toml",
            ]),
            history_dir=sc.get("history_dir", ".license-history"),
            output_dir=sc.get("output_dir", "license-report"),
        )

        return cls(whitelist=whitelist, scan=scan)
