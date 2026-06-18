from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set


class LicenseCategory(str, Enum):
    APPROVED = "approved"
    RESTRICTED = "restricted"
    UNCERTAIN = "uncertain"
    MISSING = "missing"
    DUAL_APPROVED = "dual_approved"
    DUAL_MIXED = "dual_mixed"
    DUAL_RESTRICTED = "dual_restricted"

    @property
    def is_risk(self) -> bool:
        return self in {
            LicenseCategory.RESTRICTED,
            LicenseCategory.UNCERTAIN,
            LicenseCategory.MISSING,
            LicenseCategory.DUAL_MIXED,
            LicenseCategory.DUAL_RESTRICTED,
        }

    @property
    def label_zh(self) -> str:
        return {
            LicenseCategory.APPROVED: "白名单",
            LicenseCategory.RESTRICTED: "限制许可证",
            LicenseCategory.UNCERTAIN: "存疑/未知",
            LicenseCategory.MISSING: "缺失许可证",
            LicenseCategory.DUAL_APPROVED: "双许可-全部合规",
            LicenseCategory.DUAL_MIXED: "双许可-部分合规",
            LicenseCategory.DUAL_RESTRICTED: "双许可-全部限制",
        }[self]


class PackageManager(str, Enum):
    NPM = "npm"
    YARN = "yarn"
    PNPM = "pnpm"
    PIP = "pip"
    POETRY = "poetry"
    PIPFILE = "pipfile"


class DependencyType(str, Enum):
    PRODUCTION = "production"
    DEVELOPMENT = "development"
    PEER = "peer"
    OPTIONAL = "optional"
    BUNDLED = "bundled"

    @property
    def label_zh(self) -> str:
        return {
            DependencyType.PRODUCTION: "生产依赖",
            DependencyType.DEVELOPMENT: "开发依赖",
            DependencyType.PEER: "同级依赖",
            DependencyType.OPTIONAL: "可选依赖",
            DependencyType.BUNDLED: "打包依赖",
        }[self]


@dataclass
class LicenseInfo:
    raw: str
    identifiers: List[str] = field(default_factory=list)
    category: LicenseCategory = LicenseCategory.UNCERTAIN
    is_dual: bool = False
    note: str = ""

    def to_dict(self) -> Dict:
        return {
            "raw": self.raw,
            "identifiers": self.identifiers,
            "category": self.category.value,
            "is_dual": self.is_dual,
            "note": self.note,
        }


@dataclass
class Package:
    name: str
    version: str
    manager: PackageManager
    license: LicenseInfo
    dep_type: DependencyType = DependencyType.PRODUCTION
    source: str = ""
    homepage: str = ""
    repository: str = ""
    author: str = ""
    description: str = ""
    parents: List[str] = field(default_factory=list)
    in_artifact: Optional[bool] = None
    from_exception: bool = False
    issues: List[str] = field(default_factory=list)

    @property
    def key(self) -> str:
        return f"{self.manager.value}:{self.name}@{self.version}"

    @property
    def is_risk(self) -> bool:
        return self.license.category.is_risk

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "version": self.version,
            "manager": self.manager.value,
            "license": self.license.to_dict(),
            "dep_type": self.dep_type.value,
            "source": self.source,
            "homepage": self.homepage,
            "repository": self.repository,
            "author": self.author,
            "description": self.description,
            "parents": self.parents,
            "in_artifact": self.in_artifact,
            "from_exception": self.from_exception,
            "issues": self.issues,
        }


@dataclass
class ScanResult:
    packages: List[Package] = field(default_factory=list)
    scanned_files: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "packages": [p.to_dict() for p in self.packages],
            "scanned_files": self.scanned_files,
            "errors": self.errors,
        }


@dataclass
class MultiVersionInfo:
    name: str
    versions: List[str]
    manager: PackageManager
    licenses: Set[str] = field(default_factory=set)


@dataclass
class AuditReport:
    scan: ScanResult
    approved: List[Package] = field(default_factory=list)
    risks: List[Package] = field(default_factory=list)
    missing_license: List[Package] = field(default_factory=list)
    restricted: List[Package] = field(default_factory=list)
    uncertain: List[Package] = field(default_factory=list)
    dual_licenses: List[Package] = field(default_factory=list)
    multi_version: List[MultiVersionInfo] = field(default_factory=list)
    dev_in_prod: List[Package] = field(default_factory=list)
    need_confirmation: List[Package] = field(default_factory=list)
    new_risks_vs_baseline: List[Package] = field(default_factory=list)
    resolved_vs_baseline: List[str] = field(default_factory=list)
    timestamp: str = ""
    baseline_timestamp: Optional[str] = None
