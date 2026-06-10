"""
WebVTT 格式解析器
WebVTT format parser
"""

import os
import re
from typing import Optional, List
from .base import BaseParser
from ..models import SubtitleFile, SubtitleEntry, SubtitleFormat
from ..timecode import srt_to_ms, ms_to_vtt, parse_timecode_range


class VTTParser(BaseParser):
    format = SubtitleFormat.VTT

    TIMECODE_PATTERN = re.compile(
        r"(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{2}:\d{2}[.,]\d{1,3})"
    )

    @staticmethod
    def _normalize_timecode(tc: str) -> str:
        if tc.count(":") == 1:
            return "00:" + tc
        return tc

    @classmethod
    def can_parse(cls, filepath: str) -> bool:
        ext = os.path.splitext(filepath)[1].lower().lstrip(".")
        if ext in ("vtt", "webvtt"):
            return True
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                head = f.read(256)
            return head.strip().startswith("WEBVTT")
        except Exception:
            return False

    def read(self, filepath: str, language: str = "", encoding: Optional[str] = None) -> SubtitleFile:
        content, used_enc = self._read_content(filepath, encoding)
        content = content.replace("\ufeff", "")
        lines = content.split("\n")

        entries: List[SubtitleEntry] = []
        header_lines: List[str] = []
        in_header = True

        idx_counter = 0
        i = 0
        while i < len(lines):
            line = lines[i]

            if in_header:
                if self.TIMECODE_PATTERN.search(line):
                    in_header = False
                    continue
                header_lines.append(line)
                i += 1
                continue

            if not line.strip():
                i += 1
                continue

            entry_idx = None
            timecode_line = ""
            text_lines: List[str] = []

            if not self.TIMECODE_PATTERN.search(line):
                try:
                    entry_idx = int(line.strip())
                    i += 1
                    if i < len(lines):
                        line = lines[i]
                except ValueError:
                    pass

            if i < len(lines) and self.TIMECODE_PATTERN.search(lines[i]):
                timecode_line = lines[i]
                i += 1

                while i < len(lines) and lines[i].strip():
                    text_lines.append(lines[i])
                    i += 1
            else:
                i += 1
                continue

            if not timecode_line:
                continue

            try:
                match = self.TIMECODE_PATTERN.search(timecode_line)
                if match:
                    start_tc = self._normalize_timecode(match.group(1))
                    end_tc = self._normalize_timecode(match.group(2))
                    start_ms = srt_to_ms(start_tc)
                    end_ms = srt_to_ms(end_tc)
                else:
                    continue
            except ValueError:
                continue

            idx_counter += 1
            if entry_idx is None:
                entry_idx = idx_counter

            text = self._sanitize_text("\n".join(text_lines))

            entry = SubtitleEntry(
                index=entry_idx,
                start_ms=start_ms,
                end_ms=end_ms,
                text=text,
                original_index=entry_idx,
            )
            entries.append(entry)

        for j, entry in enumerate(entries):
            entry.index = j + 1

        return SubtitleFile(
            filepath=filepath,
            format=self.format,
            language=language,
            entries=entries,
            encoding=used_enc,
            header="\n".join(header_lines).rstrip(),
            original_count=len(entries),
        )

    def write(self, sub_file: SubtitleFile, output_path: Optional[str] = None) -> str:
        if output_path is None:
            output_path = sub_file.filepath

        output_parts = []

        header = sub_file.header if sub_file.header else "WEBVTT"
        output_parts.append(header.rstrip())
        output_parts.append("")

        for entry in sub_file.entries:
            timecode_line = f"{ms_to_vtt(entry.start_ms)} --> {ms_to_vtt(entry.end_ms)}"
            output_parts.append(timecode_line)
            output_parts.append(entry.text)
            output_parts.append("")

        content = "\n".join(output_parts).rstrip() + "\n"

        os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
        with open(output_path, "w", encoding=sub_file.encoding, newline="\n") as f:
            f.write(content)

        return output_path
