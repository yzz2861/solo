from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional


class BounceCategory(str, Enum):
    HARD = "硬退"
    SOFT = "软退"
    BLACKLIST = "黑名单"
    MANUAL = "需要人工联系"


CATEGORY_PRIORITY = {
    BounceCategory.HARD: 4,
    BounceCategory.BLACKLIST: 3,
    BounceCategory.MANUAL: 2,
    BounceCategory.SOFT: 1,
}


@dataclass
class RawBounce:
    source_file: str
    subject: str
    body: str
    headers: dict = field(default_factory=dict)
    raw_text: str = ""


@dataclass
class BounceRecord:
    recipient: str
    category: BounceCategory
    reason_code: str = ""
    reason_text: str = ""
    bounce_time: Optional[datetime] = None
    original_campaign: str = ""
    original_subject: str = ""
    original_sender: str = ""
    source_file: str = ""
    is_forward_failure: bool = False
    merged_notes: List[str] = field(default_factory=list)
    bounce_count: int = 1
    first_bounce_time: Optional[datetime] = None
    last_bounce_time: Optional[datetime] = None
    needs_contact_manager: bool = False
    needs_cleanup: bool = False

    def merge(self, other: "BounceRecord") -> None:
        if not self.first_bounce_time or (
            other.bounce_time and other.bounce_time < self.first_bounce_time
        ):
            self.first_bounce_time = other.bounce_time
        if not self.last_bounce_time or (
            other.bounce_time and other.bounce_time > self.last_bounce_time
        ):
            self.last_bounce_time = other.bounce_time
        self.bounce_count += 1
        if other.reason_code and other.reason_code not in self.reason_code:
            self.reason_code = (
                f"{self.reason_code};{other.reason_code}"
                if self.reason_code
                else other.reason_code
            )
        note = self._format_note(other)
        if note and note not in self.merged_notes:
            self.merged_notes.append(note)
        if other.is_forward_failure:
            self.is_forward_failure = True
        category_changed = False
        if CATEGORY_PRIORITY.get(other.category, 0) > CATEGORY_PRIORITY.get(
            self.category, 0
        ):
            self.category = other.category
            category_changed = True
        self.needs_cleanup = self._compute_needs_cleanup()
        self.needs_contact_manager = self._compute_needs_contact()

    def _format_note(self, other: "BounceRecord") -> str:
        parts = []
        if other.bounce_time:
            parts.append(other.bounce_time.strftime("%Y-%m-%d %H:%M"))
        if other.reason_text:
            parts.append(other.reason_text.strip()[:80])
        if other.original_campaign:
            parts.append(f"活动:{other.original_campaign}")
        if other.is_forward_failure:
            parts.append("转发失败")
        return " | ".join(parts) if parts else ""

    def _compute_needs_cleanup(self) -> bool:
        return self.category in (BounceCategory.HARD, BounceCategory.BLACKLIST)

    def _compute_needs_contact(self) -> bool:
        if self.category == BounceCategory.MANUAL:
            return True
        if self.bounce_count >= 3 and self.category != BounceCategory.HARD:
            return True
        return False

    def __post_init__(self) -> None:
        if not self.first_bounce_time:
            self.first_bounce_time = self.bounce_time
        if not self.last_bounce_time:
            self.last_bounce_time = self.bounce_time
        self.needs_cleanup = self._compute_needs_cleanup()
        self.needs_contact_manager = self._compute_needs_contact()
