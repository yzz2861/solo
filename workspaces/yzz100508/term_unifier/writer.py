import difflib
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .models import Match, Document, ReplacementRecord, AuditLog, FileType


def _ts() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _apply_matches_to_segment(content: str, matches: List[Match], approved: Dict[int, Match]) -> tuple:
    sorted_matches = sorted(
        [m for m in matches if id(m) in approved],
        key=lambda m: m.start, reverse=True
    )
    new_text = content
    applied = []
    for m in sorted_matches:
        if not approved[id(m)].approved:
            continue
        new_text = new_text[:m.start] + m.suggested + new_text[m.end:]
        applied.append(m)
    return new_text, applied


def write_revised(
    doc: Document,
    all_matches: List[Match],
    approved: Dict[int, Match],
    out_dir: Optional[Path] = None,
    reviewer: str = "",
    reason_default: str = "术语统一",
) -> tuple:
    """写修订版文件 + 原文件备份 + 返回 (revised_path, backup_path, audit_log)"""
    out_dir = Path(out_dir) if out_dir else doc.path.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    stem = doc.path.stem
    suffix = doc.path.suffix
    revised_path = out_dir / f"{stem}.revised.{stamp}{suffix}"
    backup_path = out_dir / f"{stem}.original.{stamp}{suffix}"

    shutil.copy2(doc.path, backup_path)

    by_segment: Dict[int, List[Match]] = {}
    for m in all_matches:
        by_segment.setdefault(m.segment_index, []).append(m)

    audit = AuditLog()

    if doc.file_type in (FileType.SRT, FileType.VTT):
        raw_lines = doc.raw_content.splitlines(keepends=True)
        revised_segments_text = []
        for seg_idx, segment in enumerate(doc.segments):
            seg_matches = by_segment.get(seg_idx, [])
            new_content, applied = _apply_matches_to_segment(segment.content, seg_matches, approved)
            for m in applied:
                record = ReplacementRecord(
                    timestamp=_ts(),
                    document_path=str(doc.path),
                    segment_index=segment.index,
                    original_text=m.original,
                    revised_text=m.suggested,
                    term_source=m.term_source,
                    original_variant=m.original,
                    replacement=m.suggested,
                    status=m.status,
                    reason=m.reason or reason_default,
                    reviewer=reviewer,
                    chapter=segment.chapter,
                    line_number=segment.line_start,
                    context=f"{m.context_before}[{m.original}→{m.suggested}]{m.context_after}",
                )
                audit.entries.append(record)
            if doc.file_type == FileType.SRT:
                block = []
                block.append(f"{segment.index}\n")
                if segment.timestamp:
                    block.append(f"{segment.timestamp}\n")
                if new_content:
                    for line in new_content.split("\n"):
                        block.append(f"{line}\n")
                block.append("\n")
                revised_segments_text.append("".join(block))
            else:
                block = []
                if segment.timestamp:
                    block.append(f"{segment.timestamp}\n")
                if new_content:
                    for line in new_content.split("\n"):
                        block.append(f"{line}\n")
                block.append("\n")
                revised_segments_text.append("".join(block))

        if doc.file_type == FileType.VTT:
            header = "WEBVTT\n\n"
            with open(revised_path, "w", encoding="utf-8") as f:
                f.write(header)
                for b in revised_segments_text:
                    f.write(b)
        else:
            with open(revised_path, "w", encoding="utf-8") as f:
                for b in revised_segments_text:
                    f.write(b)

    else:
        raw_lines = doc.raw_content.splitlines(keepends=True)
        for seg_idx, segment in enumerate(doc.segments):
            seg_matches = by_segment.get(seg_idx, [])
            new_content, applied = _apply_matches_to_segment(segment.content, seg_matches, approved)
            for m in applied:
                record = ReplacementRecord(
                    timestamp=_ts(),
                    document_path=str(doc.path),
                    segment_index=segment.index,
                    original_text=m.original,
                    revised_text=m.suggested,
                    term_source=m.term_source,
                    original_variant=m.original,
                    replacement=m.suggested,
                    status=m.status,
                    reason=m.reason or reason_default,
                    reviewer=reviewer,
                    chapter=segment.chapter,
                    line_number=segment.line_start,
                    context=f"{m.context_before}[{m.original}→{m.suggested}]{m.context_after}",
                )
                audit.entries.append(record)
            start = max(0, segment.line_start - 1)
            end = segment.line_end if segment.line_end <= len(raw_lines) else len(raw_lines)
            new_lines = (new_content or "").splitlines(keepends=True)
            if new_lines and raw_lines and not raw_lines[start].endswith("\n"):
                pass
            if segment.line_end == segment.line_start and new_content == segment.content:
                if new_content and not new_content.endswith("\n") and start < len(raw_lines) and raw_lines[start].endswith("\n"):
                    new_content = new_content + "\n"
                    new_lines = [new_content]
            raw_lines[start:end] = new_lines
        with open(revised_path, "w", encoding="utf-8") as f:
            f.writelines(raw_lines)

    return revised_path, backup_path, audit


def write_diff(doc: Document, revised_path: Path, out_dir: Optional[Path] = None) -> Path:
    out_dir = Path(out_dir) if out_dir else doc.path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    diff_path = out_dir / f"{doc.path.stem}.diff.{stamp}.html"

    original_lines = doc.raw_content.splitlines()
    with open(revised_path, "r", encoding="utf-8") as f:
        revised_lines = f.read().splitlines()

    html = difflib.HtmlDiff(wrapcolumn=80).make_file(
        original_lines, revised_lines,
        fromdesc=str(doc.path),
        todesc=str(revised_path),
        context=True, numlines=3,
    )
    with open(diff_path, "w", encoding="utf-8") as f:
        f.write(html)

    plain_diff_path = out_dir / f"{doc.path.stem}.diff.{stamp}.txt"
    with open(plain_diff_path, "w", encoding="utf-8") as f:
        diff = difflib.unified_diff(
            original_lines, revised_lines,
            fromfile=str(doc.path),
            tofile=str(revised_path),
            lineterm="", n=3,
        )
        f.write("\n".join(diff))
    return diff_path


def write_audit_log(audit: AuditLog, out_dir: Path, doc_path: Optional[Path] = None) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    base = doc_path.stem if doc_path else "audit"
    csv_path = out_dir / f"{base}.audit.{stamp}.csv"
    json_path = out_dir / f"{base}.audit.{stamp}.json"

    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        f.write(audit.to_csv())

    import json
    data = []
    for e in audit.entries:
        data.append({
            "timestamp": e.timestamp,
            "document_path": e.document_path,
            "segment_index": e.segment_index,
            "chapter": e.chapter,
            "line_number": e.line_number,
            "term_source": e.term_source,
            "original_variant": e.original_variant,
            "replacement": e.replacement,
            "status": e.status.value if hasattr(e.status, "value") else str(e.status),
            "reason": e.reason,
            "reviewer": e.reviewer,
            "context": e.context,
            "original_text": e.original_text,
            "revised_text": e.revised_text,
        })
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    master_csv = out_dir / f"{base}.audit.master.csv"
    if not master_csv.exists():
        with open(master_csv, "w", encoding="utf-8-sig", newline="") as f:
            f.write(audit.to_csv())
    else:
        existing = master_csv.read_text(encoding="utf-8-sig").splitlines()
        header = existing[0]
        body = existing[1:]
        new_lines = audit.to_csv().splitlines()
        new_body = new_lines[1:]
        with open(master_csv, "w", encoding="utf-8-sig") as f:
            f.write(header + "\n")
            for line in body + new_body:
                if line.strip():
                    f.write(line + "\n")
    return csv_path
