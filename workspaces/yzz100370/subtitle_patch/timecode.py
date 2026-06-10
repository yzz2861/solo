"""
时间码处理工具
Timecode utilities: parsing, formatting, overlap detection
"""

import re
from typing import Tuple, Optional, List
from .models import SubtitleEntry


def srt_to_ms(timecode: str) -> int:
    """
    解析 SRT 时间码 (HH:MM:SS,mmm) 为毫秒
    Parse SRT timecode to milliseconds
    支持跨小时 / Supports hours crossing
    """
    timecode = timecode.strip()
    try:
        if "," in timecode:
            time_part, ms_part = timecode.split(",")
        elif "." in timecode:
            time_part, ms_part = timecode.split(".")
        else:
            time_part, ms_part = timecode, "0"

        parts = time_part.split(":")
        if len(parts) == 3:
            h, m, s = parts
        elif len(parts) == 2:
            h, m, s = "0", parts[0], parts[1]
        else:
            h, m, s = "0", "0", parts[0]

        return (
            int(h) * 3600000
            + int(m) * 60000
            + int(s) * 1000
            + int(ms_part.ljust(3, "0")[:3])
        )
    except (ValueError, IndexError):
        raise ValueError(f"无法解析时间码 / Invalid timecode: {timecode}")


def ass_to_ms(timecode: str) -> int:
    """
    解析 ASS 时间码 (H:MM:SS.cc) 为毫秒
    Parse ASS timecode to milliseconds
    """
    timecode = timecode.strip()
    try:
        time_part, cs_part = timecode.split(".")
        parts = time_part.split(":")
        if len(parts) == 3:
            h, m, s = parts
        elif len(parts) == 2:
            h, m, s = "0", parts[0], parts[1]
        else:
            h, m, s = "0", "0", parts[0]

        cs = int(cs_part.ljust(2, "0")[:2])
        return (
            int(h) * 3600000
            + int(m) * 60000
            + int(s) * 1000
            + cs * 10
        )
    except (ValueError, IndexError):
        raise ValueError(f"无法解析 ASS 时间码 / Invalid ASS timecode: {timecode}")


def ms_to_srt(ms: int) -> str:
    """
    毫秒转 SRT 时间码格式 (HH:MM:SS,mmm)
    Convert milliseconds to SRT timecode
    """
    if ms < 0:
        sign = "-"
        ms = abs(ms)
    else:
        sign = ""

    h = ms // 3600000
    ms %= 3600000
    m = ms // 60000
    ms %= 60000
    s = ms // 1000
    ms_part = ms % 1000

    return f"{sign}{h:02d}:{m:02d}:{s:02d},{ms_part:03d}"


def ms_to_vtt(ms: int) -> str:
    """
    毫秒转 WebVTT 时间码格式 (HH:MM:SS.mmm)
    Convert milliseconds to WebVTT timecode
    """
    if ms < 0:
        sign = "-"
        ms = abs(ms)
    else:
        sign = ""

    h = ms // 3600000
    ms %= 3600000
    m = ms // 60000
    ms %= 60000
    s = ms // 1000
    ms_part = ms % 1000

    return f"{sign}{h:02d}:{m:02d}:{s:02d}.{ms_part:03d}"


def ms_to_ass(ms: int) -> str:
    """
    毫秒转 ASS 时间码格式 (H:MM:SS.cc)
    Convert milliseconds to ASS timecode
    """
    if ms < 0:
        sign = "-"
        ms = abs(ms)
    else:
        sign = ""

    h = ms // 3600000
    ms %= 3600000
    m = ms // 60000
    ms %= 60000
    s = ms // 1000
    cs = (ms % 1000) // 10

    return f"{sign}{h}:{m:02d}:{s:02d}.{cs:02d}"


def parse_timecode_range(line: str, fmt: str = "srt") -> Tuple[int, int]:
    """
    解析单行时间码范围
    Parse a timecode range line (start --> end)
    """
    if fmt == "srt" or fmt == "vtt":
        pattern = r"(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})"
        match = re.search(pattern, line)
        if match:
            return srt_to_ms(match.group(1)), srt_to_ms(match.group(2))
    elif fmt == "ass":
        return ass_to_ms(line)
    raise ValueError(f"无法解析时间范围 / Invalid time range: {line}")


def find_overlaps(entries: List[SubtitleEntry], gap_ms: int = 0) -> List[Tuple[int, int]]:
    """
    检测重叠字幕对
    Find overlapping subtitle entry pairs
    Returns list of (entry_a_index, entry_b_index) tuples (1-based)
    """
    overlaps = []
    sorted_entries = sorted(enumerate(entries), key=lambda x: x[1].start_ms)

    for i in range(len(sorted_entries)):
        idx_i, entry_i = sorted_entries[i]
        for j in range(i + 1, len(sorted_entries)):
            idx_j, entry_j = sorted_entries[j]
            if entry_j.start_ms >= entry_i.end_ms + gap_ms:
                break
            if entry_i.overlaps_with(entry_j, gap_ms):
                a_idx = min(entry_i.index, entry_j.index)
                b_idx = max(entry_i.index, entry_j.index)
                overlaps.append((a_idx, b_idx))
    return overlaps


def find_out_of_bounds(entries: List[SubtitleEntry], total_duration_ms: Optional[int] = None) -> List[int]:
    """
    检测越界字幕（开始晚于结束，或负数时间）
    Find out-of-bounds subtitles (start > end, or negative time)
    Returns list of entry indices (1-based)
    """
    issues = []
    for entry in entries:
        if entry.start_ms < 0 or entry.end_ms < 0:
            issues.append(entry.index)
        elif entry.start_ms >= entry.end_ms:
            issues.append(entry.index)
        elif total_duration_ms and entry.end_ms > total_duration_ms:
            issues.append(entry.index)
    return issues


def calculate_offset(entries_a: List[SubtitleEntry], entries_b: List[SubtitleEntry], max_samples: int = 20) -> int:
    """
    计算两组字幕之间的平均偏移量（entries_b 相对 entries_a）
    Calculate average offset between two subtitle lists
    使用中位数以避免异常值影响
    """
    if not entries_a or not entries_b:
        return 0

    offsets = []
    n = min(len(entries_a), len(entries_b), max_samples)

    for i in range(n):
        offsets.append(entries_b[i].start_ms - entries_a[i].start_ms)
        offsets.append(entries_b[i].end_ms - entries_a[i].end_ms)

    if not offsets:
        return 0

    offsets.sort()
    mid = len(offsets) // 2
    if len(offsets) % 2 == 0:
        return (offsets[mid - 1] + offsets[mid]) // 2
    return offsets[mid]


def ms_to_readable(ms: int) -> str:
    """
    毫秒转人类可读格式（用于报告）
    Convert ms to human-readable string
    """
    if abs(ms) < 1000:
        return f"{ms}ms"
    elif abs(ms) < 60000:
        return f"{ms/1000:.1f}s"
    else:
        m = ms // 60000
        s = (ms % 60000) / 1000
        if abs(m) < 60:
            return f"{m}m{s:.1f}s"
        else:
            h = m // 60
            m = m % 60
            return f"{h}h{m}m{s:.1f}s"
