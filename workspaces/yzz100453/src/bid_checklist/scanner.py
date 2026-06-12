"""文件扫描器：递归扫描文件夹，提取文件元数据."""
from __future__ import annotations

import fnmatch
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Iterator, List, Optional

from .models import BidChecklistConfig


SUPPORTED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".gif",
    ".txt", ".rtf", ".zip", ".rar", ".7z",
}


@dataclass
class ScannedFile:
    """扫描到的本地文件对象."""

    path: Path
    name: str
    stem: str
    suffix: str
    size: int
    mtime: datetime
    is_pdf: bool = False
    page_count: Optional[int] = None
    pdf_text_cache: Optional[str] = None

    is_final: bool = False
    is_draft: bool = False
    matched_names: List[str] = field(default_factory=list)

    def __post_init__(self):
        self.name = self.path.name
        self.stem = self.path.stem
        self.suffix = self.path.suffix.lower()
        if not self.size:
            self.size = self.path.stat().st_size if self.path.exists() else 0
        if not self.mtime:
            self.mtime = datetime.fromtimestamp(self.path.stat().st_mtime)
        self.is_pdf = self.suffix == ".pdf"

    def load_pdf_metadata(self, pdf_text: bool = False):
        """加载PDF元数据（页数、文本）."""
        if not self.is_pdf:
            return
        try:
            from pypdf import PdfReader
            reader = PdfReader(str(self.path))
            self.page_count = len(reader.pages)
            if pdf_text and reader.pages:
                parts = []
                for page in reader.pages[: min(5, len(reader.pages))]:
                    try:
                        parts.append(page.extract_text() or "")
                    except Exception:
                        parts.append("")
                self.pdf_text_cache = "\n".join(parts)
        except Exception:
            self.page_count = None
            self.pdf_text_cache = None

    def mark_final_status(self, final_keywords: List[str], draft_keywords: List[str]):
        """根据关键字标记是否最终版/草稿."""
        lower_name = self.name.lower()
        stem_lower = self.stem.lower()
        self.is_final = any(
            kw.lower() in lower_name or kw.lower() in stem_lower
            for kw in final_keywords
        )
        self.is_draft = any(
            kw.lower() in lower_name or kw.lower() in stem_lower
            for kw in draft_keywords
        )

    def extract_possible_dates(self) -> List[str]:
        """从文件名中提取可能的日期字符串."""
        patterns = [
            r"(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})",
            r"(\d{4})(\d{2})(\d{2})",
            r"(\d{4})[-/年.](\d{1,2})",
        ]
        found = []
        for pat in patterns:
            found.extend(re.findall(pat, self.stem))
        return ["-".join(p) if isinstance(p, tuple) else p for p in found]

    def __repr__(self) -> str:
        return f"<ScannedFile {self.name} size={self.size} pages={self.page_count}>"


def _matches_any_pattern(name: str, patterns: List[str]) -> bool:
    return any(fnmatch.fnmatchcase(name, p) for p in patterns)


def _iter_files(directory: Path, exclude_patterns: List[str]) -> Iterator[Path]:
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for fname in files:
            if _matches_any_pattern(fname, exclude_patterns):
                continue
            yield Path(root) / fname


def scan_directories(
    scan_dirs: List[str | Path],
    config: BidChecklistConfig,
    load_pdf: bool = True,
) -> List[ScannedFile]:
    """扫描目录列表，返回所有匹配的文件."""
    scanned: List[ScannedFile] = []
    seen_paths: set = set()

    for dir_path in scan_dirs:
        d = Path(dir_path).expanduser().resolve()
        if not d.exists():
            continue
        if not d.is_dir():
            if d.suffix.lower() in SUPPORTED_EXTENSIONS:
                if str(d) not in seen_paths:
                    seen_paths.add(str(d))
                    scanned.append(ScannedFile(
                        path=d,
                        name=d.name,
                        stem=d.stem,
                        suffix=d.suffix.lower(),
                        size=d.stat().st_size if d.exists() else 0,
                        mtime=datetime.fromtimestamp(d.stat().st_mtime) if d.exists() else datetime.now(),
                    ))
            continue

        for fpath in _iter_files(d, config.exclude_patterns):
            if fpath.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue
            key = str(fpath.resolve())
            if key in seen_paths:
                continue
            seen_paths.add(key)
            try:
                stat = fpath.stat()
            except OSError:
                continue
            sf = ScannedFile(
                path=fpath,
                name=fpath.name,
                stem=fpath.stem,
                suffix=fpath.suffix.lower(),
                size=stat.st_size,
                mtime=datetime.fromtimestamp(stat.st_mtime),
            )
            scanned.append(sf)

    for sf in scanned:
        sf.mark_final_status(config.final_keywords, config.draft_keywords)
        if load_pdf and sf.is_pdf:
            sf.load_pdf_metadata(pdf_text=True)

    return scanned
