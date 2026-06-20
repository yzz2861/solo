import os
import re
from datetime import date, datetime
from typing import List, Optional, Dict, Any, Tuple

import pandas as pd
from dateutil import parser as date_parser

from .models import (
    PurchaseRequirement, MaterialCategory, UrgencyLevel
)


COLUMN_ALIASES = {
    "style_no": ["款号", "款式编号", "款号编号", "style_no", "style", "款式号"],
    "style_name": ["款名", "款式名称", "style_name", "品名"],
    "material_category": ["物料类别", "辅料类别", "类别", "类型", "category", "物料类型"],
    "material_name": ["物料名称", "辅料名称", "名称", "品名", "material", "material_name", "物料"],
    "color": ["颜色", "色号", "color", "colour", "颜色名称"],
    "color_code": ["色号编码", "色码", "color_code", "颜色编码"],
    "spec": ["规格", "规格型号", "型号", "尺寸", "spec", "specification", "size"],
    "supplier": ["供应商", "供货商", "supplier", "vendor", "供应厂家"],
    "quantity": ["数量", "采购数量", "需求数量", "qty", "quantity", "申购数量"],
    "unit": ["单位", "计量单位", "unit"],
    "unit_price": ["单价", "价格", "unit_price", "price"],
    "moq": ["最小起订量", "起订量", "MOQ", "moq", "最低起订量"],
    "delivery_date": ["交期", "交货日期", "到货日期", "delivery_date", "delivery", "要求到货日期"],
    "urgency": ["紧急程度", "优先级", "urgency", "priority", "是否紧急"],
    "submitted_by": ["提交人", "申请人", "申购人", "提交部门", "submitted_by", "提报人"],
    "submitted_at": ["提交时间", "申请时间", "submitted_at", "submit_time"],
    "remark": ["备注", "说明", "remark", "note", "comments"],
    "swap_reason": ["换料原因", "替换原因", "变更原因", "swap_reason", "change_reason"],
    "is_replenishment": ["是否补单", "补单", "补货", "replenishment", "is_replenish"],
}

CATEGORY_KEYWORDS = {
    MaterialCategory.BUTTON: ["扣", "button", "纽扣", "工字扣", "五爪扣", "四合扣"],
    MaterialCategory.ZIPPER: ["拉链", "zipper", "拉索", "拉链头"],
    MaterialCategory.HANG_TAG: ["吊牌", "hang_tag", "hangtag", "挂牌", "纸卡"],
    MaterialCategory.LABEL: ["商标", "主唛", "洗水唛", "尺码唛", "label", "织唛", "印唛"],
    MaterialCategory.THREAD: ["线", "缝纫线", "thread", "线类"],
    MaterialCategory.RIBBON: ["织带", "缎带", "ribbon", "tape", "松紧带"],
    MaterialCategory.BUCKLE: ["扣具", "插扣", "日字扣", "buckle", "调节扣"],
}

URGENCY_MAP = {
    "紧急": UrgencyLevel.URGENT,
    "特急": UrgencyLevel.RUSH,
    "加急": UrgencyLevel.URGENT,
    "正常": UrgencyLevel.NORMAL,
    "普通": UrgencyLevel.NORMAL,
    "高": UrgencyLevel.URGENT,
    "中": UrgencyLevel.NORMAL,
    "低": UrgencyLevel.NORMAL,
    "urgent": UrgencyLevel.URGENT,
    "rush": UrgencyLevel.RUSH,
    "normal": UrgencyLevel.NORMAL,
    "high": UrgencyLevel.URGENT,
    "medium": UrgencyLevel.NORMAL,
    "low": UrgencyLevel.NORMAL,
    "是": UrgencyLevel.URGENT,
    "否": UrgencyLevel.NORMAL,
    "true": UrgencyLevel.URGENT,
    "false": UrgencyLevel.NORMAL,
}


def _normalize_col_name(col: str) -> str:
    return re.sub(r"[\s_\-/()（）]+", "", str(col).strip().lower())


def _build_col_mapping(df_columns: List[str]) -> Dict[str, str]:
    """将DataFrame的列映射到标准字段名"""
    mapping = {}
    normalized_df_cols = {_normalize_col_name(c): c for c in df_columns}
    for std_field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            norm_alias = _normalize_col_name(alias)
            if norm_alias in normalized_df_cols:
                mapping[std_field] = normalized_df_cols[norm_alias]
                break
    return mapping


def _detect_category(material_name: str, raw_category: Optional[str] = None) -> MaterialCategory:
    """根据物料名称或类别字段推断物料类别"""
    combined = f"{raw_category or ''} {material_name or ''}".lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in combined:
                return category
    return MaterialCategory.OTHER


def _parse_urgency(val: Any) -> UrgencyLevel:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return UrgencyLevel.NORMAL
    s = str(val).strip().lower()
    return URGENCY_MAP.get(s, UrgencyLevel.NORMAL)


def _parse_date(val: Any) -> Optional[date]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, (datetime, date)):
        return val.date() if isinstance(val, datetime) else val
    try:
        return date_parser.parse(str(val)).date()
    except (ValueError, TypeError):
        return None


def _parse_float(val: Any) -> Optional[float]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        s = str(val).strip().replace(",", "")
        return float(s) if s else None
    except (ValueError, TypeError):
        return None


def _parse_bool(val: Any) -> bool:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return False
    s = str(val).strip().lower()
    return s in {"是", "true", "yes", "y", "1", "补", "补货", "补单"}


def _parse_str(val: Any) -> Optional[str]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    return s if s else None


def _read_sheet(df: pd.DataFrame, file_name: str, sheet_name: Optional[str]) -> List[PurchaseRequirement]:
    """读取单个sheet为需求列表"""
    col_map = _build_col_mapping(list(df.columns))
    requirements: List[PurchaseRequirement] = []

    for idx, row in df.iterrows():
        style_no = _parse_str(row.get(col_map.get("style_no", "")))
        material_name = _parse_str(row.get(col_map.get("material_name", "")))

        if not style_no or not material_name:
            continue

        raw_category = _parse_str(row.get(col_map.get("material_category", "")))
        spec_raw = _parse_str(row.get(col_map.get("spec", ""))) or ""
        quantity = _parse_float(row.get(col_map.get("quantity", ""))) or 0

        req = PurchaseRequirement(
            source_file=file_name,
            source_sheet=sheet_name,
            style_no=style_no,
            style_name=_parse_str(row.get(col_map.get("style_name", ""))),
            material_category=_detect_category(material_name, raw_category),
            material_name=material_name,
            color=_parse_str(row.get(col_map.get("color", ""))) or "未指定",
            color_code=_parse_str(row.get(col_map.get("color_code", ""))),
            spec_raw=spec_raw,
            spec_normalized=spec_raw,
            supplier=_parse_str(row.get(col_map.get("supplier", ""))),
            quantity=quantity,
            unit=_parse_str(row.get(col_map.get("unit", ""))) or "个",
            unit_price=_parse_float(row.get(col_map.get("unit_price", ""))),
            moq=_parse_float(row.get(col_map.get("moq", ""))),
            delivery_date=_parse_date(row.get(col_map.get("delivery_date", ""))),
            urgency=_parse_urgency(row.get(col_map.get("urgency", ""))),
            submitted_by=_parse_str(row.get(col_map.get("submitted_by", ""))),
            submitted_at=_parse_date(row.get(col_map.get("submitted_at", ""))),
            remark=_parse_str(row.get(col_map.get("remark", ""))),
            swap_reason=_parse_str(row.get(col_map.get("swap_reason", ""))),
            is_replenishment=_parse_bool(row.get(col_map.get("is_replenishment", ""))),
            row_index=int(idx) + 2,
            raw_data={str(k): v for k, v in row.to_dict().items()},
        )
        requirements.append(req)

    return requirements


def read_file(file_path: str) -> List[PurchaseRequirement]:
    """读取单个文件（CSV或Excel）"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    file_name = os.path.basename(file_path)

    if ext == ".csv":
        try:
            df = pd.read_csv(file_path)
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, encoding="gbk")
        return _read_sheet(df, file_name, None)

    elif ext in (".xlsx", ".xls"):
        xls = pd.ExcelFile(file_path)
        all_reqs: List[PurchaseRequirement] = []
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet_name)
            if not df.empty:
                all_reqs.extend(_read_sheet(df, file_name, sheet_name))
        return all_reqs
    else:
        raise ValueError(f"不支持的文件格式: {ext}，仅支持 .csv / .xlsx / .xls")


def read_files(file_paths: List[str]) -> Tuple[List[PurchaseRequirement], List[str]]:
    """批量读取文件，返回需求列表和错误列表"""
    all_reqs: List[PurchaseRequirement] = []
    errors: List[str] = []
    for fp in file_paths:
        try:
            reqs = read_file(fp)
            all_reqs.extend(reqs)
        except Exception as e:
            errors.append(f"{fp}: {e}")
    return all_reqs, errors
