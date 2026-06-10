"""
数据模型定义
Data Models for subtitle entries and files
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum


class SubtitleFormat(Enum):
    SRT = "srt"
    VTT = "vtt"
    ASS = "ass"
    UNKNOWN = "unknown"


@dataclass
class SubtitleEntry:
    """单条字幕条目 / Single subtitle entry"""
    index: int
    start_ms: int
    end_ms: int
    text: str
    original_index: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    issues: List[str] = field(default_factory=list)

    @property
    def duration_ms(self) -> int:
        return max(0, self.end_ms - self.start_ms)

    def overlaps_with(self, other: "SubtitleEntry", gap_ms: int = 0) -> bool:
        return self.start_ms < (other.end_ms + gap_ms) and other.start_ms < (self.end_ms + gap_ms)

    def contains_time(self, ms: int) -> bool:
        return self.start_ms <= ms <= self.end_ms

    def __repr__(self) -> str:
        from .timecode import ms_to_srt
        return f"SubtitleEntry({self.index}, {ms_to_srt(self.start_ms)} --> {ms_to_srt(self.end_ms)}, {self.text[:30]}...)"


@dataclass
class SubtitleFile:
    """字幕文件 / Complete subtitle file"""
    filepath: str
    format: SubtitleFormat
    language: str
    entries: List[SubtitleEntry]
    encoding: str = "utf-8"
    header: str = ""
    footer: str = ""
    original_count: int = 0

    @property
    def entry_count(self) -> int:
        return len(self.entries)

    @property
    def total_duration_ms(self) -> int:
        if not self.entries:
            return 0
        return self.entries[-1].end_ms - self.entries[0].start_ms

    def sort_entries(self) -> None:
        self.entries.sort(key=lambda e: e.start_ms)
        for i, entry in enumerate(self.entries):
            entry.index = i + 1


@dataclass
class PatchOperation:
    """修补操作记录 / Patching operation log"""
    op_type: str
    description: str
    entry_index: Optional[int] = None
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = ""
