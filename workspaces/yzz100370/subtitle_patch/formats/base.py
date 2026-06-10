"""
基础解析器
Base parser class with common utilities
"""

import os
import re
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from ..models import SubtitleFile, SubtitleFormat


class BaseParser(ABC):
    """字幕文件解析器基类"""

    format: SubtitleFormat = SubtitleFormat.UNKNOWN

    @classmethod
    @abstractmethod
    def can_parse(cls, filepath: str) -> bool:
        """判断是否能解析该文件"""
        raise NotImplementedError

    @abstractmethod
    def read(self, filepath: str, language: str = "", encoding: Optional[str] = None) -> SubtitleFile:
        """读取字幕文件"""
        raise NotImplementedError

    @abstractmethod
    def write(self, sub_file: SubtitleFile, output_path: Optional[str] = None) -> str:
        """写入字幕文件，返回输出路径"""
        raise NotImplementedError

    def _detect_encoding(self, filepath: str) -> str:
        """检测文件编码，优先 UTF-8，其次 GBK/GB18030"""
        for enc in ("utf-8-sig", "utf-8", "gb18030", "gbk", "big5"):
            try:
                with open(filepath, "r", encoding=enc) as f:
                    f.read()
                return enc
            except UnicodeDecodeError:
                continue
        return "utf-8"

    def _read_content(self, filepath: str, encoding: Optional[str] = None) -> Tuple[str, str]:
        """读取文件内容，返回 (内容, 编码)"""
        if encoding is None:
            encoding = self._detect_encoding(filepath)
        with open(filepath, "r", encoding=encoding) as f:
            content = f.read()
        return content, encoding

    def _sanitize_text(self, text: str) -> str:
        """清理文本中的特殊符号，保留箭头等内容"""
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = text.strip()
        return text


def detect_format(filepath: str) -> SubtitleFormat:
    """根据文件扩展名和内容检测字幕格式"""
    ext = os.path.splitext(filepath)[1].lower().lstrip(".")

    if ext == "srt":
        return SubtitleFormat.SRT
    elif ext in ("vtt", "webvtt"):
        return SubtitleFormat.VTT
    elif ext in ("ass", "ssa"):
        return SubtitleFormat.ASS

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            head = f.read(512)
    except Exception:
        return SubtitleFormat.UNKNOWN

    if head.strip().startswith("WEBVTT"):
        return SubtitleFormat.VTT
    elif "[Script Info]" in head or "Dialogue:" in head:
        return SubtitleFormat.ASS
    elif re.search(r"\d{2}:\d{2}:\d{2},\d{3}", head):
        return SubtitleFormat.SRT

    return SubtitleFormat.UNKNOWN
