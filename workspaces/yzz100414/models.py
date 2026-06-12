from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class IssueSeverity(str, Enum):
    BLOCKER = "blocker"
    WARNING = "warning"
    INFO = "info"


class IssueType(str, Enum):
    BETA_VERSION = "beta_version"
    DUPLICATE_PACKAGE = "duplicate_package"
    MISSING_CHANGELOG = "missing_changelog"
    CHECKSUM_EXPIRED = "checksum_expired"
    VERSION_MISMATCH = "version_mismatch"
    PLATFORM_MISMATCH = "platform_mismatch"
    MISSING_CHECKSUM = "missing_checksum"
    INVALID_CHECKSUM = "invalid_checksum"
    MISSING_RELEASE_NOTE = "missing_release_note"
    INCOMPLETE_RELEASE_NOTE = "incomplete_release_note"
    UNKNOWN_PLATFORM = "unknown_platform"


@dataclass
class Issue:
    type: IssueType
    severity: IssueSeverity
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    actionable: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value,
            "severity": self.severity.value,
            "message": self.message,
            "details": self.details,
            "actionable": self.actionable,
        }


@dataclass
class ParsedVersion:
    major: int
    minor: int
    patch: int
    prerelease: Optional[str] = None
    prerelease_num: Optional[int] = None
    build_num: Optional[int] = None
    raw: str = ""

    def __str__(self) -> str:
        parts = [f"{self.major}.{self.minor}.{self.patch}"]
        if self.prerelease:
            parts.append(f"-{self.prerelease}")
            if self.prerelease_num is not None:
                parts.append(f".{self.prerelease_num}")
        if self.build_num is not None:
            parts.append(f"+build{self.build_num}")
        return "".join(parts)

    def to_tuple(self) -> tuple:
        has_prerelease = 0 if self.prerelease else 1
        return (self.major, self.minor, self.patch,
                has_prerelease,
                self.prerelease or "", self.prerelease_num or 0,
                self.build_num or 0)

    def __lt__(self, other: "ParsedVersion") -> bool:
        return self.to_tuple() < other.to_tuple()

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, ParsedVersion):
            return False
        return self.to_tuple() == other.to_tuple()

    def __hash__(self) -> int:
        return hash(self.to_tuple())


@dataclass
class PackageFile:
    file_path: str
    file_name: str
    file_size: int
    modified_time: datetime
    platform: Optional[str]
    version: Optional[ParsedVersion]
    version_str: str
    checksum: Optional[str] = None
    checksum_file: Optional[str] = None
    issues: List[Issue] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "file_name": self.file_name,
            "file_size": self.file_size,
            "modified_time": self.modified_time.isoformat(),
            "platform": self.platform,
            "version": str(self.version) if self.version else None,
            "version_str": self.version_str,
            "checksum": self.checksum,
            "checksum_file": self.checksum_file,
            "issues": [issue.to_dict() for issue in self.issues],
        }


@dataclass
class ChecksumFile:
    file_path: str
    file_name: str
    modified_time: datetime
    algorithm: str
    checksums: Dict[str, str] = field(default_factory=dict)
    issues: List[Issue] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "file_name": self.file_name,
            "modified_time": self.modified_time.isoformat(),
            "algorithm": self.algorithm,
            "checksums": self.checksums,
            "issues": [issue.to_dict() for issue in self.issues],
        }


@dataclass
class ReleaseNote:
    file_path: str
    file_name: str
    modified_time: datetime
    versions: List[ParsedVersion] = field(default_factory=list)
    fix_items: List[str] = field(default_factory=list)
    has_fix_section: bool = False
    issues: List[Issue] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "file_name": self.file_name,
            "modified_time": self.modified_time.isoformat(),
            "versions": [str(v) for v in self.versions],
            "fix_items": self.fix_items,
            "has_fix_section": self.has_fix_section,
            "issues": [issue.to_dict() for issue in self.issues],
        }


@dataclass
class ScanResult:
    scan_time: datetime
    packages: List[PackageFile] = field(default_factory=list)
    checksums: List[ChecksumFile] = field(default_factory=list)
    release_notes: List[ReleaseNote] = field(default_factory=list)
    all_issues: List[Issue] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scan_time": self.scan_time.isoformat(),
            "packages": [p.to_dict() for p in self.packages],
            "checksums": [c.to_dict() for c in self.checksums],
            "release_notes": [r.to_dict() for r in self.release_notes],
            "all_issues": [i.to_dict() for i in self.all_issues],
        }


@dataclass
class PublishablePackage:
    package: PackageFile
    status: str
    reasons: List[str] = field(default_factory=list)
    can_publish: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "package": self.package.to_dict(),
            "status": self.status,
            "reasons": self.reasons,
            "can_publish": self.can_publish,
        }


@dataclass
class RejectionNotice:
    package_name: str
    version: str
    platform: str
    reasons: List[str]
    suggestions: List[str]
    assignee: str = "打包同事"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "package_name": self.package_name,
            "version": self.version,
            "platform": self.platform,
            "reasons": self.reasons,
            "suggestions": self.suggestions,
            "assignee": self.assignee,
        }
