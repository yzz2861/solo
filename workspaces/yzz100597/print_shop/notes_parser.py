import re
from typing import Optional, Dict, Any, List, Tuple

from .models import (
    ColorMode,
    PrintSide,
    BindingType,
)


BINDING_KEYWORDS = {
    "骑马钉": BindingType.STAPLE,
    "骑马订": BindingType.STAPLE,
    "钉装": BindingType.STAPLE,
    "订书机": BindingType.STAPLE,
    "胶装": BindingType.PERFECT,
    "无线胶装": BindingType.PERFECT,
    "圈装": BindingType.RING,
    "铁圈": BindingType.RING,
    "螺旋": BindingType.RING,
    "无装订": BindingType.NONE,
    "不装订": BindingType.NONE,
}

COLOR_KEYWORDS = {
    "彩打": ColorMode.COLOR,
    "彩色": ColorMode.COLOR,
    "全彩": ColorMode.COLOR,
    "黑白": ColorMode.BLACK,
    "黑白打印": ColorMode.BLACK,
    "单色": ColorMode.BLACK,
}

SIDE_KEYWORDS = {
    "双面": PrintSide.DOUBLE,
    "双面打印": PrintSide.DOUBLE,
    "正反面": PrintSide.DOUBLE,
    "单面": PrintSide.SINGLE,
    "单面打印": PrintSide.SINGLE,
}

PAPER_SIZES = ["A4", "A3", "A5", "B5", "B4", "16开", "8开"]


def parse_copies(text: str) -> int:
    patterns = [
        r'(\d+)\s*(份|本|册|套)',
        r'(打|印|做)\s*(\d+)\s*(份|本|册|套)?',
        r'(份数|数量)\s*[:：]?\s*(\d+)',
    ]
    for pat in patterns:
        match = re.search(pat, text)
        if match:
            groups = match.groups()
            for g in groups:
                if g and g.isdigit():
                    return int(g)
    return 1


def parse_binding(text: str) -> BindingType:
    for keyword, btype in BINDING_KEYWORDS.items():
        if keyword in text:
            return btype
    return BindingType.NONE


def parse_color_mode(text: str) -> Optional[ColorMode]:
    for keyword, cmode in COLOR_KEYWORDS.items():
        if keyword in text:
            return cmode
    return None


def parse_print_side(text: str) -> Optional[PrintSide]:
    for keyword, stype in SIDE_KEYWORDS.items():
        if keyword in text:
            return stype
    return None


def parse_paper_size(text: str) -> Optional[str]:
    for size in PAPER_SIZES:
        if size in text or size.lower() in text.lower():
            return size.upper()
    return None


def parse_file_count(text: str) -> Optional[int]:
    patterns = [
        r'(\d+)\s*个文件',
        r'(\d+)\s*份文件',
        r'共(\d+)个',
        r'一共(\d+)',
    ]
    for pat in patterns:
        match = re.search(pat, text)
        if match:
            return int(match.group(1))
    return None


def parse_customer_name(text: str) -> str:
    patterns = [
        r'客户[：:]\s*(\S+)',
        r'姓名[：:]\s*(\S+)',
        r'我是\s*(\S+)',
        r'我叫\s*(\S+)',
    ]
    for pat in patterns:
        match = re.search(pat, text)
        if match:
            return match.group(1)
    return "未知客户"


def parse_per_file_specs(text: str, file_count: int) -> List[Dict[str, Any]]:
    specs = []

    lines = text.split('\n')
    file_lines = [line for line in lines if re.search(r'(\d+[\.\、]|\d+[）)])\s*\S', line) or '.pdf' in line.lower() or '.ppt' in line.lower()]

    if file_lines:
        for line in file_lines[:file_count]:
            spec = {}
            if parse_color_mode(line):
                spec["color_mode"] = parse_color_mode(line)
            if parse_print_side(line):
                spec["print_side"] = parse_print_side(line)
            if parse_binding(line) != BindingType.NONE:
                spec["binding"] = parse_binding(line)
            copies = parse_copies(line)
            if copies > 1:
                spec["copies"] = copies
            specs.append(spec)

    return specs


def parse_notes(notes_text: str, file_count: int = 0) -> Dict[str, Any]:
    result = {
        "customer_name": parse_customer_name(notes_text),
        "copies": parse_copies(notes_text),
        "color_mode": parse_color_mode(notes_text),
        "print_side": parse_print_side(notes_text),
        "binding": parse_binding(notes_text),
        "paper_size": parse_paper_size(notes_text),
        "expected_file_count": parse_file_count(notes_text),
        "per_file_specs": [],
        "raw_notes": notes_text,
    }

    per_file = parse_per_file_specs(notes_text, file_count)
    if per_file:
        result["per_file_specs"] = per_file

    return result
