"""
SRT 格式解析器
SRT format parser
"""

import os
import re
from typing import Optional, List
from .base import BaseParser
from ..models import SubtitleFile, SubtitleEntry, SubtitleFormat
from ..timecode import srt_to_ms, ms_to_srt, parse_timecode_range


class SRTParser(BaseParser):
    format = SubtitleFormat.SRT

    TIMECODE_PATTERN = re.compile(
        r"(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})"
    )

    @classmethod
    def can_parse(cls, filepath: str) -> bool:
        ext = os.path.splitext(filepath)[1].lower().lstrip(".")
        if ext == "srt":
            return True
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                head = f.read(1024)
            return bool(cls.TIMECODE_PATTERN.search(head)) and not head.strip().startswith("WEBVTT")
        except Exception:
            return False

    def read(self, filepath: str, language: str = "", encoding: Optional[str] = None) -> SubtitleFile:
        content, used_enc = self._read_content(filepath, encoding)
        content = content.replace("\ufeff", "")
        blocks = re.split(r"\n\s*\n", content.strip())

        entries: List[SubtitleEntry] = []
        header_text = ""

        if blocks and not self.TIMECODE_PATTERN.search(blocks[0]):
            header_text = blocks[0]
            blocks = blocks[1:]

        for block in blocks:
            lines = block.strip().split("\n")
            if not lines:
                continue

            idx = None
            timecode_line_idx = -1

            for i, line in enumerate(lines):
                if self.TIMECODE_PATTERN.search(line):
                    timecode_line_idx = i
                    if i > 0:
                        try:
                            idx = int(lines[0].strip())
                        except ValueError:
                            idx = len(entries) + 1
                    break

            if timecode_line_idx < 0:
                continue

            if idx is None:
                idx = len(entries) + 1

            try:
                start_ms, end_ms = parse_timecode_range(lines[timecode_line_idx], "srt")
            except ValueError:
                continue

            text_lines = lines[timecode_line_idx + 1:]
            text = self._sanitize_text("\n".join(text_lines))

            entry = SubtitleEntry(
                index=idx,
                start_ms=start_ms,
                end_ms=end_ms,
                text=text,
                original_index=idx,
            )
            entries.append(entry)

        for i, entry in enumerate(entries):
            if entry.index != i + 1:
                entry.index = i + 1

        return SubtitleFile(
            filepath=filepath,
            format=self.format,
            language=language,
            entries=entries,
            encoding=used_enc,
            header=header_text,
            original_count=len(entries),
        )

    def write(self, sub_file: SubtitleFile, output_path: Optional[str] = None) -> str:
        if output_path is None:
            output_path = sub_file.filepath

        output_parts = []

        if sub_file.header:
            output_parts.append(sub_file.header.rstrip())
            output_parts.append("")

        for entry in sub_file.entries:
            output_parts.append(str(entry.index))
            timecode_line = f"{ms_to_srt(entry.start_ms)} --> {ms_to_srt(entry.end_ms)}"
            output_parts.append(timecode_line)
            output_parts.append(entry.text)
            output_parts.append("")

        content = "\n".join(output_parts).rstrip() + "\n"

        os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
        with open(output_path, "w", encoding=sub_file.encoding, newline="\n") as f:
            f.write(content)

        return output_path
