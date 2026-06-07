"""文件读取与字段映射模块。"""
import os
import json
from typing import List, Tuple
from datetime import datetime

import pandas as pd

from .config import FieldMapping, ProcessContext
from .models import FormulaRow, BadRow


def read_field_mapping(mapping_file: str) -> FieldMapping:
    """从JSON文件读取字段映射配置。"""
    if not mapping_file or not os.path.exists(mapping_file):
        return FieldMapping()
    with open(mapping_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    fm = FieldMapping()
    for key in data:
        if hasattr(fm, key):
            setattr(fm, key, data[key])
    return fm


def read_banned_list(banned_file: str) -> List[dict]:
    """读取禁用料清单。"""
    if not banned_file or not os.path.exists(banned_file):
        return []
    ext = os.path.splitext(banned_file)[1].lower()
    if ext == ".json":
        with open(banned_file, "r", encoding="utf-8") as f:
            return json.load(f)
    elif ext in (".csv", ".xlsx", ".xls"):
        df = _read_dataframe(banned_file)
        return df.to_dict("records")
    else:
        raise ValueError(f"不支持的禁用料清单格式: {ext}")


def read_source_files(
    file_paths: List[str],
    field_mapping: FieldMapping,
    ctx: ProcessContext,
) -> Tuple[List[FormulaRow], List[BadRow]]:
    """读取多个原始文件并应用字段映射。

    返回 (有效行列表, 坏行列表)
    """
    all_rows: List[FormulaRow] = []
    all_bad_rows: List[BadRow] = []

    for file_path in file_paths:
        if not os.path.exists(file_path):
            ctx.errors.append(f"文件不存在: {file_path}")
            continue

        try:
            df = _read_dataframe(file_path)
        except Exception as e:
            ctx.errors.append(f"读取文件失败 {file_path}: {str(e)}")
            continue

        rows, bad = _parse_dataframe(df, file_path, field_mapping, ctx)
        all_rows.extend(rows)
        all_bad_rows.extend(bad)

    return all_rows, all_bad_rows


def _read_dataframe(file_path: str) -> pd.DataFrame:
    """根据扩展名读取数据文件为DataFrame。"""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        return pd.read_csv(file_path, dtype=str, keep_default_na=False)
    elif ext in (".xlsx", ".xls"):
        return pd.read_excel(file_path, dtype=str, keep_default_na=False)
    elif ext == ".json":
        return pd.read_json(file_path, dtype=False)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def _parse_dataframe(
    df: pd.DataFrame,
    source_file: str,
    fm: FieldMapping,
    ctx: ProcessContext,
) -> Tuple[List[FormulaRow], List[BadRow]]:
    """解析DataFrame为FormulaRow列表，同时识别坏行。"""
    rows: List[FormulaRow] = []
    bad_rows: List[BadRow] = []

    required_cols = [fm.ingredient_name]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        ctx.errors.append(f"文件 {source_file} 缺少必要列: {', '.join(missing)}")
        return rows, bad_rows

    for idx, row_data in df.iterrows():
        row_num = idx + 2
        raw = row_data.to_dict()

        try:
            formula_row = FormulaRow(
                row_index=row_num,
                source_file=os.path.basename(source_file),
                formula_id=str(raw.get(fm.formula_id, "")),
                formula_name=str(raw.get(fm.formula_name, "")),
                ingredient_name=str(raw.get(fm.ingredient_name, "")).strip(),
                ingredient_code=str(raw.get(fm.ingredient_code, "")),
                dosage=_parse_dosage(raw.get(fm.dosage, "0")),
                dosage_unit=str(raw.get(fm.dosage_unit, "")),
                effective_date=str(raw.get(fm.date_field, "")),
                remark=str(raw.get(fm.remark, "")),
                raw_data=raw,
            )

            if not formula_row.ingredient_name:
                raise ValueError("原料名称为空")

            rows.append(formula_row)

        except Exception as e:
            bad_rows.append(BadRow(
                row_index=row_num,
                source_file=os.path.basename(source_file),
                raw_data=raw,
                error_type="解析错误",
                error_message=str(e),
            ))

    return rows, bad_rows


def _parse_dosage(val) -> float:
    """解析添加量为浮点数。"""
    if val is None or val == "":
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("%", "").replace(",", "")
    try:
        return float(s)
    except ValueError:
        return 0.0


def filter_by_date(
    rows: List[FormulaRow],
    start_date: str = None,
    end_date: str = None,
) -> List[FormulaRow]:
    """按日期范围过滤配方行。"""
    if not start_date and not end_date:
        return rows

    result = []
    for r in rows:
        if not r.effective_date:
            continue
        try:
            d = _parse_date(r.effective_date)
        except Exception:
            continue
        if start_date:
            sd = _parse_date(start_date)
            if d < sd:
                continue
        if end_date:
            ed = _parse_date(end_date)
            if d > ed:
                continue
        result.append(r)
    return result


def _parse_date(date_str: str) -> datetime:
    """解析日期字符串，支持多种格式。"""
    formats = ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d", "%Y-%m-%d %H:%M:%S"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    raise ValueError(f"无法解析日期: {date_str}")
