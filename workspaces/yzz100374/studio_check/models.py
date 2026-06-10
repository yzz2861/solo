from __future__ import annotations

import enum
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


class IssueLevel(enum.Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


class IssueCode(enum.Enum):
    MISSING_RETOUCHED = "E001"
    MISSING_ORIGINAL = "E002"
    MISSING_AUTH_LETTER = "E003"
    MISSING_SELECTION_SHEET = "E004"
    MISSING_DELIVERY_NOTE = "E005"
    AUTH_NO_SIGNATURE = "E006"
    DUPLICATE_RETOUCHED = "W001"
    MULTI_VERSION = "W002"
    EXTRA_RETOUCHED = "W003"
    ORPHAN_ORIGINAL = "I001"
    UNCONFIRMED_PHOTOS = "I002"
    RETOUCHED_MISMATCH = "E007"


@dataclass
class PhotoItem:
    path: Path
    stem: str
    suffix: str
    photo_id: str
    version: Optional[int] = None
    category: str = ""

    @classmethod
    def from_path(cls, p: Path, category: str, photo_id: str, version: Optional[int] = None) -> "PhotoItem":
        return cls(
            path=p,
            stem=p.stem,
            suffix=p.suffix,
            photo_id=photo_id,
            version=version,
            category=category,
        )


@dataclass
class CheckIssue:
    level: IssueLevel
    code: IssueCode
    message: str
    detail: str = ""
    photo_ids: list[str] = field(default_factory=list)
    paths: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "level": self.level.value,
            "code": self.code.value,
            "message": self.message,
            "detail": self.detail,
            "photo_ids": self.photo_ids,
            "paths": [str(p) for p in self.paths],
        }


@dataclass
class ScanResult:
    client_dir: Path
    retouched: list[PhotoItem] = field(default_factory=list)
    originals: list[PhotoItem] = field(default_factory=list)
    auth_letters: list[Path] = field(default_factory=list)
    selection_sheets: list[Path] = field(default_factory=list)
    delivery_notes: list[Path] = field(default_factory=list)
    issues: list[CheckIssue] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "client_dir": str(self.client_dir),
            "retouched_count": len(self._unique_retouched_ids()),
            "originals_count": len({p.photo_id for p in self.originals}),
            "retouched": [
                {"photo_id": p.photo_id, "version": p.version, "path": str(p.path)}
                for p in self.retouched
            ],
            "originals": [
                {"photo_id": p.photo_id, "path": str(p.path)}
                for p in self.originals
            ],
            "auth_letters": [str(p) for p in self.auth_letters],
            "selection_sheets": [str(p) for p in self.selection_sheets],
            "delivery_notes": [str(p) for p in self.delivery_notes],
            "issues": [i.to_dict() for i in self.issues],
        }

    def _unique_retouched_ids(self) -> set[str]:
        return {p.photo_id for p in self.retouched}


@dataclass
class ConfirmationEntry:
    photo_id: str
    confirmed_version: Optional[int]
    confirmed_path: str
    confirmed_at: str


@dataclass
class ConfirmationState:
    locked: bool = False
    locked_at: Optional[str] = None
    entries: dict[str, ConfirmationEntry] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "locked": self.locked,
            "locked_at": self.locked_at,
            "entries": {
                pid: {
                    "photo_id": e.photo_id,
                    "confirmed_version": e.confirmed_version,
                    "confirmed_path": e.confirmed_path,
                    "confirmed_at": e.confirmed_at,
                }
                for pid, e in self.entries.items()
            },
        }
