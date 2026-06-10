from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from .config import (
    DEFAULT_CONFIG,
    extract_photo_id,
    extract_version,
    match_filename,
    get_config,
)
from .models import PhotoItem, ScanResult


class Scanner:
    def __init__(self, config: Optional[dict] = None):
        self.cfg = config or DEFAULT_CONFIG

    def scan(self, client_dir: Path) -> ScanResult:
        client_dir = client_dir.resolve()
        if not client_dir.is_dir():
            raise FileNotFoundError(f"客户目录不存在: {client_dir}")

        result = ScanResult(client_dir=client_dir)

        metadata_dir = client_dir / self.cfg["metadata_dir"]
        retouch_dir = client_dir / self.cfg["dirs"]["retouched"]
        original_dir = client_dir / self.cfg["dirs"]["original"]

        if retouch_dir.is_dir():
            self._scan_retouched(retouch_dir, result)

        if original_dir.is_dir():
            self._scan_originals(original_dir, result)

        self._scan_docs(client_dir, metadata_dir, result)

        return result

    def _scan_retouched(self, retouch_dir: Path, result: ScanResult) -> None:
        exts = {e.lower() for e in self.cfg["photo_extensions"]["retouched"]}
        for root, _dirs, files in os.walk(retouch_dir):
            root_path = Path(root)
            for fname in files:
                fpath = root_path / fname
                if fpath.suffix.lower() in exts:
                    stem = fpath.stem
                    photo_id = extract_photo_id(stem)
                    version = extract_version(stem)
                    item = PhotoItem.from_path(fpath, "retouched", photo_id, version)
                    result.retouched.append(item)

    def _scan_originals(self, original_dir: Path, result: ScanResult) -> None:
        exts = {e.lower() for e in self.cfg["photo_extensions"]["original"]}
        for root, _dirs, files in os.walk(original_dir):
            root_path = Path(root)
            for fname in files:
                fpath = root_path / fname
                if fpath.suffix.lower() in exts:
                    stem = fpath.stem
                    photo_id = extract_photo_id(stem)
                    item = PhotoItem.from_path(fpath, "original", photo_id)
                    result.originals.append(item)

    def _scan_docs(self, client_dir: Path, metadata_dir: Path, result: ScanResult) -> None:
        doc_exts = {e.lower() for e in self.cfg["doc_extensions"]}
        auth_pat = self.cfg["files"]["auth_letter"]
        sel_pat = self.cfg["files"]["selection_sheet"]
        note_pat = self.cfg["files"]["delivery_note"]

        for item in client_dir.iterdir():
            if item.is_dir():
                if item == metadata_dir:
                    continue
                for child in item.rglob("*"):
                    if child.is_file() and child.suffix.lower() in doc_exts:
                        self._categorize_doc(child, auth_pat, sel_pat, note_pat, result)
                continue
            if item.suffix.lower() in doc_exts:
                self._categorize_doc(item, auth_pat, sel_pat, note_pat, result)

    def _categorize_doc(
        self,
        fpath: Path,
        auth_pat: str,
        sel_pat: str,
        note_pat: str,
        result: ScanResult,
    ) -> None:
        name = fpath.name
        if match_filename(name, auth_pat):
            result.auth_letters.append(fpath)
        if match_filename(name, sel_pat):
            result.selection_sheets.append(fpath)
        if match_filename(name, note_pat):
            result.delivery_notes.append(fpath)
