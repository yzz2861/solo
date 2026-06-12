import os
from datetime import datetime
from typing import List, Tuple

import pandas as pd

from .models import (
    AllocationRule,
    MeterReading,
    MeterType,
    ShopArea,
)


def _read_file(file_path: str, sheet_name: str = None) -> pd.DataFrame:
    ext = os.path.splitext(file_path)[1].lower()
    if ext in [".xlsx", ".xls"]:
        if sheet_name:
            return pd.read_excel(file_path, sheet_name=sheet_name)
        return pd.read_excel(file_path)
    elif ext == ".csv":
        return pd.read_csv(file_path)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def _parse_date(date_str) -> datetime.date:
    if isinstance(date_str, datetime):
        return date_str.date()
    if pd.isna(date_str):
        return None
    if isinstance(date_str, pd.Timestamp):
        return date_str.date()
    return pd.to_datetime(date_str).date()


def _safe_float(val) -> float:
    if pd.isna(val):
        return 0.0
    return float(val)


def _safe_str(val) -> str:
    if pd.isna(val):
        return ""
    return str(val).strip()


def import_readings(file_path: str, sheet_name: str = None) -> List[MeterReading]:
    df = _read_file(file_path, sheet_name)

    required_cols = ["表号", "类型", "店铺编号", "店铺名称", "抄表日期", "当前读数"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"读数表缺少必要列: {missing}")

    readings = []
    for _, row in df.iterrows():
        meter_type_str = _safe_str(row.get("类型", "")).lower()
        meter_type = MeterType.ELECTRIC if "电" in meter_type_str or meter_type_str == "electric" else MeterType.WATER

        is_master = _safe_str(row.get("是否总表", "")).lower() in ["是", "true", "yes", "1"]
        if not is_master and "总表" in _safe_str(row.get("表号", "")):
            is_master = True

        prev_reading = row.get("上月读数")
        if pd.isna(prev_reading):
            prev_reading = None
        else:
            prev_reading = float(prev_reading)

        reading = MeterReading(
            meter_id=_safe_str(row["表号"]),
            meter_type=meter_type,
            shop_id=_safe_str(row["店铺编号"]) if not is_master else None,
            shop_name=_safe_str(row["店铺名称"]),
            reading_date=_parse_date(row["抄表日期"]),
            reading_value=_safe_float(row["当前读数"]),
            previous_reading=prev_reading,
            is_master=is_master,
        )
        readings.append(reading)

    return readings


def import_shop_areas(file_path: str, sheet_name: str = None) -> List[ShopArea]:
    df = _read_file(file_path, sheet_name)

    required_cols = ["店铺编号", "店铺名称", "面积"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"店铺面积表缺少必要列: {missing}")

    shops = []
    for _, row in df.iterrows():
        is_active = _safe_str(row.get("状态", "营业")).lower() not in ["撤场", "closed", "inactive", "0"]
        if _safe_str(row.get("是否营业", "是")).lower() in ["否", "false", "no", "0"]:
            is_active = False

        effective_date = row.get("生效日期")
        end_date = row.get("撤场日期")

        shop = ShopArea(
            shop_id=_safe_str(row["店铺编号"]),
            shop_name=_safe_str(row["店铺名称"]),
            area=_safe_float(row["面积"]),
            floor=_safe_str(row.get("楼层", "")),
            is_active=is_active,
            effective_date=_parse_date(effective_date) if effective_date is not None and not pd.isna(effective_date) else None,
            end_date=_parse_date(end_date) if end_date is not None and not pd.isna(end_date) else None,
        )
        shops.append(shop)

    return shops


def import_allocation_rules(file_path: str, sheet_name: str = None) -> List[AllocationRule]:
    df = _read_file(file_path, sheet_name)

    required_cols = ["规则编号", "规则名称", "类型", "分摊方式", "单价"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"公摊规则表缺少必要列: {missing}")

    rules = []
    for _, row in df.iterrows():
        meter_type_str = _safe_str(row["类型"]).lower()
        meter_type = MeterType.ELECTRIC if "电" in meter_type_str or meter_type_str == "electric" else MeterType.WATER

        rule = AllocationRule(
            rule_id=_safe_str(row["规则编号"]),
            rule_name=_safe_str(row["规则名称"]),
            meter_type=meter_type,
            allocation_method=_safe_str(row["分摊方式"]),
            unit_price=_safe_float(row["单价"]),
            fixed_fee=_safe_float(row.get("固定费用", 0)),
            public_area_ratio=_safe_float(row.get("公摊比例", 0.15)),
        )
        rules.append(rule)

    return rules


def import_disputed_shops(file_path: str, sheet_name: str = None) -> List[str]:
    df = _read_file(file_path, sheet_name)

    if "店铺编号" in df.columns:
        return [_safe_str(row["店铺编号"]) for _, row in df.iterrows()]
    elif "shop_id" in df.columns:
        return [_safe_str(row["shop_id"]) for _, row in df.iterrows()]
    else:
        return [_safe_str(row.iloc[0]) for _, row in df.iterrows()]


def validate_import_data(
    readings: List[MeterReading],
    shops: List[ShopArea],
    rules: List[AllocationRule],
) -> Tuple[List[str], List[str]]:
    errors = []
    warnings = []

    shop_ids = {s.shop_id for s in shops}
    reading_shop_ids = {r.shop_id for r in readings if not r.is_master and r.shop_id}

    for rule in rules:
        errors.extend(rule.validate())

    master_electric = [r for r in readings if r.is_master and r.meter_type == MeterType.ELECTRIC]
    master_water = [r for r in readings if r.is_master and r.meter_type == MeterType.WATER]

    if not master_electric:
        warnings.append("未找到电表总表，将仅按分表汇总计算")
    if not master_water:
        warnings.append("未找到水表总表，将仅按分表汇总计算")

    missing_shops = reading_shop_ids - shop_ids
    if missing_shops:
        warnings.append(f"读数表中有 {len(missing_shops)} 个店铺在面积表中找不到: {list(missing_shops)[:5]}...")

    no_reading_shops = shop_ids - reading_shop_ids
    if no_reading_shops:
        warnings.append(f"有 {len(no_reading_shops)} 个店铺没有读数记录: {list(no_reading_shops)[:5]}...")

    return errors, warnings
