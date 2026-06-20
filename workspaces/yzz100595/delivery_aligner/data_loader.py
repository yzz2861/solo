import os
import re
from typing import List, Optional, Dict, Any
import pandas as pd
from datetime import date

from .models import (
    PurchaseOrder,
    DeliveryPromise,
    ArrivalRecord,
    SUPPLIER_SHORT_NAMES,
    DEFAULT_SUPPLIER_COLUMNS,
)
from .date_utils import parse_date, parse_relative_date


def _detect_file_type(filepath: str) -> str:
    ext = os.path.splitext(filepath)[1].lower()
    if ext in (".xlsx", ".xls"):
        return "excel"
    elif ext == ".csv":
        return "csv"
    else:
        raise ValueError(f"不支持的文件格式: {ext}，请使用 CSV 或 Excel 文件")


def _read_file(filepath: str, sheet_name: Optional[str] = None) -> pd.DataFrame:
    file_type = _detect_file_type(filepath)
    if file_type == "excel":
        return pd.read_excel(filepath, sheet_name=sheet_name or 0, dtype=str)
    else:
        return pd.read_csv(filepath, dtype=str, encoding="utf-8-sig")


def _find_column(columns: List[str], candidates: List[str]) -> Optional[str]:
    cols_lower = {str(c).strip().lower(): c for c in columns}
    for cand in candidates:
        if cand.lower() in cols_lower:
            return cols_lower[cand.lower()]
    for cand in candidates:
        for col in columns:
            if cand.lower() in str(col).strip().lower():
                return col
    return None


def _map_columns(df: pd.DataFrame, column_config: Dict[str, List[str]]) -> Dict[str, Optional[str]]:
    result = {}
    for field_name, candidates in column_config.items():
        result[field_name] = _find_column(list(df.columns), candidates)
    return result


def _get_val(row: pd.Series, col: Optional[str], default: Any = None) -> Any:
    if col is None or col not in row.index:
        return default
    val = row[col]
    if pd.isna(val) or val == "" or val is None:
        return default
    return str(val).strip()


def _get_float(row: pd.Series, col: Optional[str], default: float = 0.0) -> float:
    if col is None or col not in row.index:
        return default
    val = row[col]
    if pd.isna(val) or val == "" or val is None:
        return default
    try:
        val_str = str(val).strip().replace(",", "").replace("，", "")
        return float(val_str)
    except (ValueError, TypeError):
        return default


def _get_short_name(full_name: str) -> str:
    if not full_name:
        return ""
    if full_name in SUPPLIER_SHORT_NAMES:
        return SUPPLIER_SHORT_NAMES[full_name]
    for full, short in SUPPLIER_SHORT_NAMES.items():
        if full_name in full or full in full_name:
            return short
    if len(full_name) > 8:
        return full_name[:4] + "..."
    return full_name


def _parse_date_field(raw_val: Optional[str], today: Optional[date] = None) -> Optional[date]:
    if not raw_val:
        return None
    parsed = parse_relative_date(raw_val, today)
    if parsed:
        return parsed
    return parse_date(raw_val)


def load_purchase_orders(filepath: str, today: Optional[date] = None) -> List[PurchaseOrder]:
    df = _read_file(filepath)
    col_map = _map_columns(df, DEFAULT_SUPPLIER_COLUMNS["采购单"])

    if col_map["order_no"] is None:
        raise ValueError(f"采购单文件中找不到订单号列，当前列名: {list(df.columns)}")

    orders: List[PurchaseOrder] = []
    for _, row in df.iterrows():
        order_no = _get_val(row, col_map["order_no"])
        if not order_no:
            continue

        supplier_full = _get_val(row, col_map["supplier_full"], "")
        is_split = False
        parent_order = None
        order_line = _get_val(row, col_map["order_line"])

        if "-" in order_no and not order_line:
            parts = order_no.rsplit("-", 1)
            if parts[1].isdigit() and len(parts[1]) <= 3:
                is_split = True
                parent_order = parts[0]
                order_line = parts[1]
                order_no = parts[0]

        remark = _get_val(row, col_map["remark"], "")
        if remark:
            if "拆分" in remark or "分批" in remark:
                is_split = True

        po = PurchaseOrder(
            order_no=order_no,
            order_line=order_line,
            material_code=_get_val(row, col_map["material_code"], ""),
            material_name=_get_val(row, col_map["material_name"], ""),
            supplier_full=supplier_full,
            supplier_short=_get_short_name(supplier_full),
            quantity=_get_float(row, col_map["quantity"]),
            unit=_get_val(row, col_map["unit"], ""),
            plan_date=_parse_date_field(_get_val(row, col_map["plan_date"]), today),
            remark=remark,
            is_split=is_split,
            parent_order=parent_order,
        )
        orders.append(po)

    return orders


def load_promises(filepath: str, today: Optional[date] = None) -> List[DeliveryPromise]:
    df = _read_file(filepath)
    col_map = _map_columns(df, DEFAULT_SUPPLIER_COLUMNS["承诺表"])

    if col_map["order_no"] is None:
        raise ValueError(f"承诺表文件中找不到订单号列，当前列名: {list(df.columns)}")

    promises: List[DeliveryPromise] = []
    for _, row in df.iterrows():
        order_no = _get_val(row, col_map["order_no"])
        if not order_no:
            continue

        order_line = _get_val(row, col_map["order_line"])
        if "-" in order_no and not order_line:
            parts = order_no.rsplit("-", 1)
            if parts[1].isdigit() and len(parts[1]) <= 3:
                order_no = parts[0]
                order_line = parts[1]

        supplier_full = _get_val(row, col_map["supplier_full"], "")
        batch_no = _get_val(row, col_map["batch_no"])
        promise_qty = _get_float(row, col_map["promise_quantity"])
        remark = _get_val(row, col_map["remark"], "")

        is_partial = False
        if batch_no or (promise_qty and promise_qty > 0):
            is_partial = True
        if remark and ("分批" in remark or "分交" in remark):
            is_partial = True

        dp = DeliveryPromise(
            order_no=order_no,
            order_line=order_line,
            material_code=_get_val(row, col_map["material_code"], ""),
            supplier_full=supplier_full,
            supplier_short=_get_short_name(supplier_full),
            promise_date=_parse_date_field(_get_val(row, col_map["promise_date"]), today),
            promise_quantity=promise_qty if promise_qty > 0 else None,
            batch_no=batch_no,
            is_partial=is_partial,
            source=_get_val(row, col_map["source"], ""),
            remark=remark,
        )
        promises.append(dp)

    return promises


def load_arrivals(filepath: str, today: Optional[date] = None) -> List[ArrivalRecord]:
    df = _read_file(filepath)
    col_map = _map_columns(df, DEFAULT_SUPPLIER_COLUMNS["到货表"])

    if col_map["order_no"] is None:
        raise ValueError(f"到货表文件中找不到订单号列，当前列名: {list(df.columns)}")

    arrivals: List[ArrivalRecord] = []
    for _, row in df.iterrows():
        order_no = _get_val(row, col_map["order_no"])
        if not order_no:
            continue

        order_line = _get_val(row, col_map["order_line"])
        if "-" in order_no and not order_line:
            parts = order_no.rsplit("-", 1)
            if parts[1].isdigit() and len(parts[1]) <= 3:
                order_no = parts[0]
                order_line = parts[1]

        supplier_full = _get_val(row, col_map["supplier_full"], "")

        ar = ArrivalRecord(
            order_no=order_no,
            order_line=order_line,
            material_code=_get_val(row, col_map["material_code"], ""),
            supplier_full=supplier_full,
            arrival_date=_parse_date_field(_get_val(row, col_map["arrival_date"]), today),
            arrival_quantity=_get_float(row, col_map["arrival_quantity"]),
            unit=_get_val(row, col_map["unit"], ""),
            batch_no=_get_val(row, col_map["batch_no"]),
            warehouse=_get_val(row, col_map["warehouse"], ""),
            remark=_get_val(row, col_map["remark"], ""),
        )
        arrivals.append(ar)

    return arrivals


def load_all_data(
    orders_file: str,
    promises_file: str,
    arrivals_file: str,
    today: Optional[date] = None,
) -> Dict[str, List]:
    return {
        "orders": load_purchase_orders(orders_file, today),
        "promises": load_promises(promises_file, today),
        "arrivals": load_arrivals(arrivals_file, today),
    }
