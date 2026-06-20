import re
import difflib
from typing import Tuple, Dict, List, Optional
from dataclasses import dataclass


COLOR_ALIASES: Dict[str, List[str]] = {
    "白色": ["白", "white", "纯白", "米白", "本白", "奶白"],
    "黑色": ["黑", "black", "纯黑", "炭黑"],
    "红色": ["红", "red", "大红", "正红", "酒红", "深红"],
    "蓝色": ["蓝", "blue", "宝蓝", "深蓝", "浅蓝", "天蓝"],
    "绿色": ["绿", "green", "军绿", "墨绿", "浅绿", "深绿"],
    "黄色": ["黄", "yellow", "米黄", "鹅黄", "金黄", "浅黄"],
    "粉色": ["粉", "pink", "浅粉", "桃粉", "粉红"],
    "灰色": ["灰", "gray", "grey", "深灰", "浅灰", "烟灰"],
    "紫色": ["紫", "purple", "深紫", "浅紫"],
    "棕色": ["棕", "brown", "咖啡", "咖啡色", "驼色", "卡其"],
    "橙色": ["橙", "orange", "橘色", "橘黄"],
    "米色": ["米", "beige", "米色", "杏色", "肉色"],
    "藏青": ["藏青", "藏蓝", "navy", "深蓝色"],
    "银色": ["银", "silver", "银色"],
    "金色": ["金", "gold", "金色"],
    "透明": ["透明", "transparent", "clear"],
}


BUTTON_SPEC_PATTERNS = [
    (re.compile(r"(\d+(?:\.\d+)?)\s*(?:mm|毫米|MM)", re.I), "mm"),
    (re.compile(r"(\d+(?:\.\d+)?)\s*(?:cm|厘米|CM)", re.I), "cm"),
    (re.compile(r"(\d+)\s*L", re.I), "line"),
]

ZIPPER_SPEC_PATTERNS = [
    (re.compile(r"(\d+(?:\.\d+)?)\s*(?:cm|厘米|CM)", re.I), "length_cm"),
    (re.compile(r"(\d+(?:\.\d+)?)\s*(?:mm|毫米|MM)", re.I), "width_mm"),
    (re.compile(r"#\s*(\d+)", re.I), "model"),
    (re.compile(r"(金属|树脂|尼龙|防水|隐形)", re.I), "type"),
    (re.compile(r"(单头|双头|闭尾|开尾)", re.I), "structure"),
]

HANGTAG_SPEC_PATTERNS = [
    (re.compile(
        r"(\d+(?:\.\d+)?)\s*(?:cm|CM|厘米|mm|MM|毫米)?\s*[xX*×]\s*"
        r"(\d+(?:\.\d+)?)\s*(?:cm|CM|厘米)", re.I
    ), "size_cm"),
    (re.compile(
        r"(\d+(?:\.\d+)?)\s*(?:mm|MM|毫米)\s*[xX*×]\s*"
        r"(\d+(?:\.\d+)?)\s*(?:mm|MM|毫米)?", re.I
    ), "size_mm"),
    (re.compile(
        r"(\d+(?:\.\d+)?)\s*[xX*×]\s*(\d+(?:\.\d+)?)\s*(?:mm|MM|毫米)", re.I
    ), "size_mm"),
    (re.compile(r"(铜版纸|白卡|牛卡|特种纸|PVC)", re.I), "material"),
    (re.compile(r"(单面印|双面印|单色|四色)", re.I), "print"),
]


def _fmt_num(v: float) -> str:
    """格式化为数字，去掉无意义的小数末尾0"""
    if v == int(v):
        return str(int(v))
    return f"{v:g}"


def _cm_to_mm(cm_val: float) -> float:
    return round(cm_val * 10, 2)


def normalize_color(color_raw: str) -> Tuple[str, bool]:
    if not color_raw:
        return "未指定", False
    s = color_raw.strip().lower()
    for std_name, aliases in COLOR_ALIASES.items():
        for alias in aliases:
            if alias.lower() == s:
                return std_name, True
    for std_name, aliases in COLOR_ALIASES.items():
        matches = difflib.get_close_matches(s, [a.lower() for a in aliases], n=1, cutoff=0.75)
        if matches:
            return std_name, True
    color_code_match = re.search(r"[##]?([0-9a-fA-F]{6})", s)
    if color_code_match:
        return f"色码#{color_code_match.group(1).upper()}", True
    return color_raw.strip(), False


def normalize_button_spec(spec: str) -> str:
    parts = []
    for pattern, unit in BUTTON_SPEC_PATTERNS:
        m = pattern.search(spec)
        if m:
            if unit == "cm":
                mm = _cm_to_mm(float(m.group(1)))
                parts.append(f"{_fmt_num(mm)}mm")
            elif unit == "mm":
                parts.append(f"{_fmt_num(float(m.group(1)))}mm")
            elif unit == "line":
                mm = round(float(m.group(1)) * 0.635, 2)
                parts.append(f"{_fmt_num(mm)}mm({m.group(1)}L)")
    if not parts:
        return re.sub(r"\s+", " ", spec.strip())
    return " ".join(sorted(set(parts)))


def normalize_zipper_spec(spec: str) -> str:
    length_cm = None
    width_mm = None
    model = None
    ztype = None
    structure = None
    for pattern, tag in ZIPPER_SPEC_PATTERNS:
        m = pattern.search(spec)
        if m:
            if tag == "length_cm":
                length_cm = float(m.group(1))
            elif tag == "width_mm":
                width_mm = float(m.group(1))
            elif tag == "model":
                model = m.group(1)
            elif tag == "type":
                ztype = m.group(1)
            elif tag == "structure":
                structure = m.group(1)
    if not any([length_cm, width_mm, model, ztype, structure]):
        return re.sub(r"\s+", " ", spec.strip())
    ordered = []
    if ztype:
        ordered.append(ztype)
    if model:
        ordered.append(f"#{model}")
    if length_cm:
        ordered.append(f"{_fmt_num(length_cm)}cm")
    if width_mm:
        ordered.append(f"{_fmt_num(width_mm)}mm")
    if structure:
        ordered.append(structure)
    return " ".join(ordered)


def normalize_hangtag_spec(spec: str) -> str:
    size_w = None
    size_h = None
    material = None
    ptype = None
    for pattern, tag in HANGTAG_SPEC_PATTERNS:
        m = pattern.search(spec)
        if m:
            if tag == "size_cm":
                size_w, size_h = float(m.group(1)), float(m.group(2))
            elif tag == "size_mm":
                size_w = round(float(m.group(1)) / 10, 2)
                size_h = round(float(m.group(2)) / 10, 2)
            elif tag == "material":
                material = m.group(1)
            elif tag == "print":
                ptype = m.group(1)
    if not any([size_w, size_h, material, ptype]):
        return re.sub(r"\s+", " ", spec.strip())
    ordered = []
    if material:
        ordered.append(material)
    if size_w is not None and size_h is not None:
        ordered.append(f"{_fmt_num(size_w)}x{_fmt_num(size_h)}cm")
    if ptype:
        ordered.append(ptype)
    return " ".join(ordered)


def normalize_spec(category: str, spec_raw: str) -> str:
    if not spec_raw:
        return ""
    s = spec_raw.strip()
    cat = (category or "").lower()
    if "纽扣" in category or "button" in cat:
        return normalize_button_spec(s)
    elif "拉链" in category or "zipper" in cat:
        return normalize_zipper_spec(s)
    elif "吊牌" in category or "hang" in cat:
        return normalize_hangtag_spec(s)
    return re.sub(r"\s+", " ", s).strip()


def specs_are_equivalent(category: str, spec_a: str, spec_b: str) -> Tuple[bool, str]:
    norm_a = normalize_spec(category, spec_a)
    norm_b = normalize_spec(category, spec_b)
    if norm_a == norm_b:
        return True, ""
    return False, f"'{spec_a}' vs '{spec_b}' (标准化: '{norm_a}' vs '{norm_b}')"
