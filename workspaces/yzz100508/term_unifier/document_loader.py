import re
from pathlib import Path
from typing import Optional, Union
from .models import Document, DocumentSegment, FileType


def detect_file_type(path: Union[str, Path]) -> FileType:
    p = Path(path)
    suffix = p.suffix.lower()
    if suffix == ".srt":
        return FileType.SRT
    if suffix == ".vtt":
        return FileType.VTT
    if suffix in {".md", ".markdown"}:
        return FileType.MARKDOWN
    return FileType.UNKNOWN


def load_document(path: Union[str, Path]) -> Document:
    p = Path(path)
    file_type = detect_file_type(p)
    with open(p, "r", encoding="utf-8-sig") as f:
        raw = f.read()
    if file_type == FileType.SRT:
        segments = _parse_srt(raw)
    elif file_type == FileType.VTT:
        segments = _parse_vtt(raw)
    elif file_type == FileType.MARKDOWN:
        segments = _parse_markdown(raw)
    else:
        segments = _parse_plain(raw)
    return Document(path=p, file_type=file_type, segments=segments, raw_content=raw)


def _parse_srt(content: str) -> list:
    segments = []
    raw_lines = content.splitlines()
    line_map = {}
    i = 0
    line_start = 0
    while i < len(raw_lines):
        line = raw_lines[i].strip()
        if not line:
            i += 1
            continue
        if line.isdigit():
            idx = int(line)
            timestamp = None
            text_lines = []
            text_start_line = i + 2
            if i + 1 < len(raw_lines):
                ts_line = raw_lines[i + 1].strip()
                if "-->" in ts_line:
                    timestamp = ts_line
                i += 2
                while i < len(raw_lines) and raw_lines[i].strip():
                    text_lines.append(raw_lines[i])
                    i += 1
                segments.append(DocumentSegment(
                    index=idx,
                    timestamp=timestamp,
                    content="\n".join(text_lines),
                    line_start=text_start_line + 1,
                    line_end=i,
                ))
                continue
        i += 1
    return segments


def _parse_vtt(content: str) -> list:
    segments = []
    raw_lines = content.splitlines()
    i = 0
    idx = 0
    while i < len(raw_lines):
        line = raw_lines[i].rstrip("\n")
        stripped = line.strip()
        if not stripped or stripped.startswith("WEBVTT"):
            i += 1
            continue
        if stripped.startswith("NOTE") or stripped.startswith("STYLE") or stripped.startswith("REGION"):
            while i < len(raw_lines) and raw_lines[i].strip():
                i += 1
            continue
        timestamp = None
        text_lines = []
        text_start_line = i + 1
        if "-->" in stripped:
            timestamp = stripped
            i += 1
            while i < len(raw_lines) and raw_lines[i].strip():
                text_lines.append(raw_lines[i])
                i += 1
            idx += 1
            segments.append(DocumentSegment(
                index=idx,
                timestamp=timestamp,
                content="\n".join(text_lines),
                line_start=text_start_line + 1,
                line_end=i,
            ))
            continue
        i += 1
    return segments


CHAPTER_RE = re.compile(r'^(#{1,6}\s+|^\s*[-*+]\s*|^\s*\d+\.\s*)', re.MULTILINE)


def _parse_markdown(content: str) -> list:
    segments = []
    lines = content.splitlines()
    current_chapter = None
    idx = 0
    buf = []
    buf_start = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("#"):
            if buf:
                idx += 1
                segments.append(DocumentSegment(
                    index=idx,
                    content="\n".join(buf),
                    chapter=current_chapter,
                    line_start=buf_start + 1,
                    line_end=i,
                ))
                buf = []
            current_chapter = stripped.lstrip("#").strip()
            buf_start = i
            buf = [line]
            i += 1
            continue
        if not stripped:
            if buf:
                idx += 1
                segments.append(DocumentSegment(
                    index=idx,
                    content="\n".join(buf),
                    chapter=current_chapter,
                    line_start=buf_start + 1,
                    line_end=i,
                ))
                buf = []
            buf_start = i + 1
            i += 1
            continue
        if not buf:
            buf_start = i
        buf.append(line)
        i += 1
    if buf:
        idx += 1
        segments.append(DocumentSegment(
            index=idx,
            content="\n".join(buf),
            chapter=current_chapter,
            line_start=buf_start + 1,
            line_end=len(lines),
        ))
    return segments


def _parse_plain(content: str) -> list:
    lines = content.splitlines()
    segments = []
    for i, line in enumerate(lines, 1):
        segments.append(DocumentSegment(
            index=i,
            content=line,
            line_start=i,
            line_end=i,
        ))
    return segments
