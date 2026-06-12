import os
import json
from typing import List, Dict, Any, Optional
import pandas as pd

from .utils import (
    normalize_name, normalize_phone, safe_str, parse_amount,
    extract_id_last4, extract_birth_year, split_name_phone
)

SOURCE_TYPES = ["form", "wechat", "club", "payment"]

COLUMN_ALIASES = {
    "name": ["姓名", "名字", "选手姓名", "Name", "name", "报名人", "参赛者"],
    "phone": ["手机", "手机号", "电话", "联系方式", "联系电话", "Phone", "phone", "手机号码"],
    "id_card": ["身份证", "身份证号", "身份证号码", "证件号", "ID Card", "id_card"],
    "birth_date": ["出生日期", "生日", "出生年月", "Birth Date"],
    "gender": ["性别", "Gender", "gender"],
    "club": ["俱乐部", "所属俱乐部", "俱乐部名称", "代表俱乐部", "Club"],
    "wechat_id": ["微信", "微信号", "微信昵称", "WeChat", "wechat"],
    "event": ["项目", "参赛项目", "报名项目", "比赛项目", "Event", "event"],
    "age_group": ["年龄组", "组别", "年龄段", "Age Group", "age_group"],
    "partner_name": ["搭档", "搭档姓名", "队友", "队友姓名", "混双搭档", "Partner"],
    "partner_phone": ["搭档手机", "搭档电话", "队友手机", "队友电话", "Partner Phone"],
    "club_representative": ["代报人", "俱乐部代报人", "领队", "联系人"],
    "amount": ["金额", "缴费金额", "支付金额", "报名费", "Amount", "amount", "付款金额"],
    "payer_name": ["付款人", "付款人姓名", "缴费人", "支付人", "Payer"],
    "paid_at": ["付款时间", "支付时间", "缴费时间", "Paid At", "pay_time"],
    "payment_method": ["支付方式", "付款方式", "Payment Method"],
    "screenshot_ref": ["截图", "凭证", "截图编号", "Screenshot"],
    "remark": ["备注", "说明", "Remark", "note"],
}


def _detect_column(row: pd.Series, aliases: List[str]) -> Optional[str]:
    row_lower = {str(k).strip(): k for k in row.index}
    for alias in aliases:
        for key_lower, original_key in row_lower.items():
            if alias.lower() in key_lower or key_lower in alias.lower():
                return original_key
    return None


def _build_column_map(df_columns) -> Dict[str, str]:
    col_map = {}
    col_list = list(df_columns)
    col_lower_map = {str(c).strip(): c for c in col_list}

    for field, aliases in COLUMN_ALIASES.items():
        found = None
        for alias in aliases:
            for key_lower, original_key in col_lower_map.items():
                if alias == key_lower or alias.lower() == key_lower:
                    found = original_key
                    break
                if alias.lower() in key_lower and len(key_lower) <= len(alias) + 3:
                    found = original_key
                    break
            if found:
                break
        if found:
            col_map[field] = found
    return col_map


def read_data_file(file_path: str) -> pd.DataFrame:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    if ext in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path, dtype=str)
    elif ext == ".csv":
        try:
            df = pd.read_csv(file_path, dtype=str, encoding="utf-8-sig")
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, dtype=str, encoding="gbk")
    elif ext == ".json":
        df = pd.read_json(file_path, dtype=False)
    else:
        raise ValueError(f"不支持的文件格式: {ext}，请使用 .xlsx/.xls/.csv/.json")

    df = df.where(pd.notnull(df), None)
    return df


def detect_source_type(file_path: str, df: pd.DataFrame, explicit: Optional[str] = None) -> str:
    if explicit and explicit in SOURCE_TYPES:
        return explicit

    col_map = _build_column_map(df.columns)
    name_lower = os.path.basename(file_path).lower()

    if "amount" in col_map or "payer_name" in col_map or "缴费" in name_lower or "payment" in name_lower:
        return "payment"
    if "club_representative" in col_map or "俱乐部" in name_lower or "代报" in name_lower:
        return "club"
    if "wechat" in name_lower or "微信" in name_lower or "群" in name_lower:
        return "wechat"
    return "form"


def parse_registrations(df: pd.DataFrame, source_type: str) -> List[Dict[str, Any]]:
    col_map = _build_column_map(df.columns)
    results = []

    for idx, row in df.iterrows():
        record = {}

        def _get(field):
            col = col_map.get(field)
            return safe_str(row[col]) if col else ""

        raw_name = _get("name")
        raw_phone = _get("phone")

        if source_type == "wechat" and (not raw_name or not raw_phone):
            for col in df.columns:
                cell = safe_str(row[col])
                if cell and ("1" in cell and sum(c.isdigit() for c in cell) >= 11):
                    n, p = split_name_phone(cell)
                    if n and p:
                        raw_name = raw_name or n
                        raw_phone = raw_phone or p
                        break

        if not raw_name:
            continue

        record["raw_name"] = raw_name
        record["name"] = normalize_name(raw_name)
        record["raw_phone"] = raw_phone
        record["phone"] = normalize_phone(raw_phone)
        record["id_card"] = _get("id_card")
        record["id_card_last4"] = extract_id_last4(record["id_card"])
        record["birth_year"] = extract_birth_year(record["id_card"], _get("birth_date"))
        record["gender"] = _get("gender")
        record["club"] = _get("club")
        record["wechat_id"] = _get("wechat_id")

        raw_event = _get("event")
        events = []
        if raw_event:
            parts = raw_event.replace("，", ",").replace("、", ",").replace("/", ",").replace(";", ",")
            events = [e.strip() for e in parts.split(",") if e.strip()]
        record["events"] = events if events else ["未指定"]

        record["age_group"] = _get("age_group")
        record["partner_name"] = normalize_name(_get("partner_name"))
        record["partner_phone"] = normalize_phone(_get("partner_phone"))
        record["partner_raw_name"] = _get("partner_name")
        record["club_representative"] = _get("club_representative")

        record["source_type"] = source_type
        record["row_index"] = idx
        record["raw_data"] = json.dumps({str(k): safe_str(v) for k, v in row.to_dict().items()}, ensure_ascii=False)

        results.append(record)

    return results


def parse_payments(df: pd.DataFrame) -> List[Dict[str, Any]]:
    col_map = _build_column_map(df.columns)
    results = []

    for idx, row in df.iterrows():
        record = {}

        def _get(field):
            col = col_map.get(field)
            return safe_str(row[col]) if col else ""

        raw_payer = _get("payer_name") or _get("name")
        raw_phone = _get("phone")
        amount = parse_amount(_get("amount"))

        if not raw_payer and amount is None:
            continue

        record["raw_payer_name"] = raw_payer
        record["payer_name"] = normalize_name(raw_payer)
        record["raw_phone"] = raw_phone
        record["phone"] = normalize_phone(raw_phone)
        record["amount"] = amount
        record["paid_at"] = _get("paid_at")
        record["payment_method"] = _get("payment_method")
        record["screenshot_ref"] = _get("screenshot_ref")
        record["remark"] = _get("remark")
        record["row_index"] = idx
        record["raw_data"] = json.dumps({str(k): safe_str(v) for k, v in row.to_dict().items()}, ensure_ascii=False)

        results.append(record)

    return results


def read_and_parse(file_path: str, source_type: Optional[str] = None) -> Dict[str, Any]:
    df = read_data_file(file_path)
    detected = detect_source_type(file_path, df, source_type)

    if detected == "payment":
        records = parse_payments(df)
        record_type = "payment"
    else:
        records = parse_registrations(df, detected)
        record_type = "registration"

    return {
        "file_path": file_path,
        "source_type": detected,
        "record_type": record_type,
        "row_count": len(df),
        "parsed_count": len(records),
        "records": records,
    }
