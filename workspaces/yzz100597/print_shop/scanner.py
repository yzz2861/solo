import os
import re
from pathlib import Path
from typing import List

from .models import FileInfo, FileType


PDF_EXTENSIONS = {".pdf"}
PPT_EXTENSIONS = {".ppt", ".pptx"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".gif", ".webp"}


def detect_file_type(filepath: str) -> FileType:
    ext = Path(filepath).suffix.lower()
    if ext in PDF_EXTENSIONS:
        return FileType.PDF
    elif ext in PPT_EXTENSIONS:
        return FileType.PPT
    elif ext in IMAGE_EXTENSIONS:
        return FileType.IMAGE
    else:
        return FileType.UNKNOWN


def get_pdf_page_count(filepath: str) -> int:
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(filepath)
        return len(reader.pages)
    except Exception:
        return 0


def get_ppt_page_count(filepath: str) -> int:
    try:
        from pptx import Presentation
        prs = Presentation(filepath)
        return len(prs.slides)
    except Exception:
        return 0


def get_image_info(filepath: str) -> dict:
    try:
        from PIL import Image
        with Image.open(filepath) as img:
            return {
                "width": img.width,
                "height": img.height,
                "pages": getattr(img, "n_frames", 1),
            }
    except Exception:
        return {"width": 0, "height": 0, "pages": 0}


def get_file_size_kb(filepath: str) -> float:
    try:
        return os.path.getsize(filepath) / 1024.0
    except Exception:
        return 0.0


def extract_version_tag(filename: str) -> str:
    pattern = r'[_\-\s](v\d+|版本\d+|final|最终版|新版|旧版|第\d+版|改|修订)'
    match = re.search(pattern, filename, re.IGNORECASE)
    if match:
        return match.group(0).strip("_- ")
    return ""


def scan_file(filepath: str) -> FileInfo:
    filename = os.path.basename(filepath)
    file_type = detect_file_type(filepath)
    size_kb = get_file_size_kb(filepath)
    version_tag = extract_version_tag(filename)

    page_count = 0
    is_valid = True
    error_msg = ""

    if file_type == FileType.PDF:
        page_count = get_pdf_page_count(filepath)
        if page_count == 0:
            is_valid = False
            error_msg = "PDF无法打开或页数为0"
    elif file_type == FileType.PPT:
        page_count = get_ppt_page_count(filepath)
        if page_count == 0:
            is_valid = False
            error_msg = "PPT无法打开或页数为0"
    elif file_type == FileType.IMAGE:
        info = get_image_info(filepath)
        page_count = info.get("pages", 1)
        if page_count == 0 or info.get("width", 0) == 0:
            is_valid = False
            error_msg = "图片文件无法打开"
    else:
        is_valid = False
        error_msg = "不支持的文件类型"

    return FileInfo(
        filename=filename,
        file_path=os.path.abspath(filepath),
        file_type=file_type,
        page_count=page_count,
        size_kb=round(size_kb, 1),
        is_valid=is_valid,
        error_msg=error_msg,
        version_tag=version_tag,
    )


def scan_directory(dir_path: str, recursive: bool = True) -> List[FileInfo]:
    dir_path = os.path.abspath(dir_path)
    if not os.path.isdir(dir_path):
        raise ValueError(f"目录不存在: {dir_path}")

    results = []
    if recursive:
        for root, _, files in os.walk(dir_path):
            for fname in files:
                fpath = os.path.join(root, fname)
                ft = detect_file_type(fpath)
                if ft != FileType.UNKNOWN:
                    results.append(scan_file(fpath))
    else:
        for fname in os.listdir(dir_path):
            fpath = os.path.join(dir_path, fname)
            if os.path.isfile(fpath):
                ft = detect_file_type(fpath)
                if ft != FileType.UNKNOWN:
                    results.append(scan_file(fpath))

    return results
