"""
字幕格式解析器包
Subtitle format parsers package
"""

from .base import BaseParser, detect_format
from .srt_parser import SRTParser
from .vtt_parser import VTTParser
from .ass_parser import ASSParser

__all__ = [
    "BaseParser",
    "detect_format",
    "SRTParser",
    "VTTParser",
    "ASSParser",
    "get_parser",
]

PARSERS = {
    "srt": SRTParser,
    "vtt": VTTParser,
    "ass": ASSParser,
}


def get_parser(fmt: str):
    """根据格式名获取解析器"""
    fmt_lower = fmt.lower().lstrip(".")
    if fmt_lower in ("ssa", "ass"):
        return ASSParser
    return PARSERS.get(fmt_lower, SRTParser)
