"""
ASS/SSA 格式解析器
ASS/SSA format parser
"""

import os
import re
from typing import Optional, List, Dict, Tuple
from .base import BaseParser
from ..models import SubtitleFile, SubtitleEntry, SubtitleFormat
from ..timecode import ass_to_ms, ms_to_ass


class ASSParser(BaseParser):
    format = SubtitleFormat.ASS

    @classmethod
    def can_parse(cls, filepath: str) -> bool:
        ext = os.path.splitext(filepath)[1].lower().lstrip(".")
        if ext in ("ass", "ssa"):
            return True
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                head = f.read(512)
            return "[Script Info]" in head or "Dialogue:" in head
        except Exception:
            return False

    def _parse_format_line(self, fmt_line: str) -> List[str]:
        """解析 Format: 行的字段名"""
        match = re.search(r"Format:\s*(.*)", fmt_line, re.IGNORECASE)
        if match:
            return [f.strip() for f in match.group(1).split(",")]
        return []

    def _parse_dialogue_line(self, line: str, fields: List[str]) -> Optional[Dict]:
        """解析 Dialogue: 行"""
        match = re.match(r"Dialogue:\s*(.*)", line, re.IGNORECASE)
        if not match or not fields:
            return None

        parts_raw = match.group(1).split(",")
        if len(parts_raw) < len(fields):
            parts_raw.extend([""] * (len(fields) - len(parts_raw)))
        elif len(parts_raw) > len(fields):
            extra = ",".join(parts_raw[len(fields) - 1:])
            parts_raw = parts_raw[: len(fields) - 1] + [extra]

        result = {}
        for field, value in zip(fields, parts_raw):
            result[field] = value.strip()
        return result

    def _strip_ass_tags(self, text: str) -> str:
        """移除 ASS 样式标签但保留内容"""
        result = re.sub(r"\{[^}]*\}", "", text)
        result = result.replace(r"\h", " ").replace(r"\n", "\n").replace(r"\N", "\n")
        return result.strip()

    def read(self, filepath: str, language: str = "", encoding: Optional[str] = None) -> SubtitleFile:
        content, used_enc = self._read_content(filepath, encoding)
        content = content.replace("\ufeff", "")
        lines = content.split("\n")

        entries: List[SubtitleEntry] = []
        header_lines: List[str] = []
        footer_lines: List[str] = []

        in_events = False
        events_header_end = False
        event_fields: List[str] = []
        idx_counter = 0

        for line in lines:
            line_stripped = line.rstrip()

            if "[Events]" in line_stripped:
                in_events = True
                events_header_end = False
                header_lines.append(line_stripped)
                continue

            if in_events and not events_header_end:
                if re.match(r"Format:", line_stripped, re.IGNORECASE):
                    event_fields = self._parse_format_line(line_stripped)
                    header_lines.append(line_stripped)
                    continue
                if line_stripped.strip() == "":
                    header_lines.append(line_stripped)
                    continue
                if re.match(r"Dialogue:", line_stripped, re.IGNORECASE):
                    events_header_end = True
                else:
                    header_lines.append(line_stripped)
                    continue

            if in_events and events_header_end:
                if re.match(r"Dialogue:", line_stripped, re.IGNORECASE):
                    parsed = self._parse_dialogue_line(line_stripped, event_fields)
                    if parsed:
                        start_field = None
                        end_field = None
                        text_field = None
                        layer_field = None

                        for f in event_fields:
                            fl = f.lower()
                            if fl == "start":
                                start_field = f
                            elif fl == "end":
                                end_field = f
                            elif fl == "text":
                                text_field = f
                            elif fl == "layer":
                                layer_field = f

                        try:
                            start_ms = ass_to_ms(parsed.get(start_field or "Start", "0:00:00.00"))
                            end_ms = ass_to_ms(parsed.get(end_field or "End", "0:00:00.00"))
                        except ValueError:
                            continue

                        raw_text = parsed.get(text_field or "Text", "")
                        clean_text = self._strip_ass_tags(raw_text)

                        idx_counter += 1
                        entry = SubtitleEntry(
                            index=idx_counter,
                            start_ms=start_ms,
                            end_ms=end_ms,
                            text=clean_text,
                            original_index=idx_counter,
                            metadata={
                                "raw_line": line_stripped,
                                "raw_text": raw_text,
                                "parsed_fields": parsed,
                            },
                        )
                        entries.append(entry)
                else:
                    footer_lines.append(line_stripped)
            else:
                header_lines.append(line_stripped)

        for j, entry in enumerate(entries):
            entry.index = j + 1

        sub_file = SubtitleFile(
            filepath=filepath,
            format=self.format,
            language=language,
            entries=entries,
            encoding=used_enc,
            header="\n".join(header_lines).rstrip(),
            footer="\n".join(footer_lines).rstrip(),
            original_count=len(entries),
        )
        sub_file.metadata = {"event_fields": event_fields}
        return sub_file

    def write(self, sub_file: SubtitleFile, output_path: Optional[str] = None) -> str:
        if output_path is None:
            output_path = sub_file.filepath

        output_parts = []

        if sub_file.header:
            output_parts.append(sub_file.header.rstrip())
            if not sub_file.header.rstrip().endswith("\n"):
                output_parts.append("")

        event_fields = getattr(sub_file, "metadata", {}).get("event_fields", [])
        if not event_fields:
            event_fields = ["Layer", "Start", "End", "Style", "Name", "MarginL", "MarginR", "MarginV", "Effect", "Text"]

        for entry in sub_file.entries:
            parsed_fields = entry.metadata.get("parsed_fields", {})
            field_values = []

            for field in event_fields:
                fl = field.lower()
                if fl == "start":
                    field_values.append(ms_to_ass(entry.start_ms))
                elif fl == "end":
                    field_values.append(ms_to_ass(entry.end_ms))
                elif fl == "text":
                    field_values.append(entry.text)
                else:
                    field_values.append(parsed_fields.get(field, "0" if fl == "layer" else ""))

            dialogue_line = "Dialogue: " + ",".join(field_values)
            output_parts.append(dialogue_line)

        if sub_file.footer:
            output_parts.append("")
            output_parts.append(sub_file.footer.rstrip())

        content = "\n".join(output_parts).rstrip() + "\n"

        os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
        with open(output_path, "w", encoding=sub_file.encoding, newline="\n") as f:
            f.write(content)

        return output_path
