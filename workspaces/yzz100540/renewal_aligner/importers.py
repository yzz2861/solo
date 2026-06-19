from __future__ import annotations

import csv
import json
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any, Callable, Optional

import pandas as pd
from dateutil import parser as date_parser

from .models import (
    Contract,
    ContractStatus,
    ForecastCategory,
    ForecastRecord,
    Ticket,
    TicketStatus,
    UsageRecord,
)


def _parse_date(value: Any) -> Optional[date]:
    if value is None or value == "":
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, pd.Timestamp):
        if pd.isna(value):
            return None
        return value.date()
    try:
        return date_parser.parse(str(value), fuzzy=True).date()
    except Exception:
        return None


def _parse_float(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    if isinstance(value, (int, float)):
        if pd.isna(value):
            return 0.0
        return float(value)
    try:
        s = str(value).replace(",", "").replace("￥", "").replace("$", "").replace("¥", "").strip()
        return float(s)
    except (ValueError, TypeError):
        return 0.0


def _parse_int(value: Any) -> int:
    if value is None or value == "":
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if not pd.isna(value) else 0
    try:
        return int(str(value).replace(",", "").strip())
    except (ValueError, TypeError):
        return 0


def _parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None or value == "":
        return False
    s = str(value).strip().lower()
    return s in ("1", "true", "yes", "y", "是", "有", "✓", "√", "t")


def _to_dict(obj: Any) -> dict[str, Any]:
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    return {}


@dataclass
class ColumnMapping:
    source_column: str
    target_field: str
    transformer: Optional[Callable[[Any], Any]] = None
    required: bool = False
    default: Any = None


@dataclass
class ImportResult:
    records: list[Any] = field(default_factory=list)
    total_rows: int = 0
    success_count: int = 0
    skipped_rows: list[int] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    unmatched_customers: list[str] = field(default_factory=list)


CONTRACT_COLUMN_ALIASES: dict[str, list[str]] = {
    "contract_id": ["合同ID", "合同编号", "Contract ID", "contract_id", "id", "编号", "合同号"],
    "customer_name": ["客户名称", "客户名", "客户", "Customer", "Customer Name", "customer", "customer_name", "客户姓名", "公司名称"],
    "contract_value": ["合同金额", "金额", "合同额", "金额(元)", "金额元", "Amount", "Value", "Contract Value", "value", "amount", "总金额", "合同总值"],
    "start_date": ["合同开始日期", "开始日期", "起始日期", "Start Date", "start_date", "生效日期", "合同起始日"],
    "end_date": ["合同到期日期", "到期日期", "结束日期", "End Date", "end_date", "expiry", "到期日", "合同终止日", "终止日期"],
    "owner_name": ["负责人", "客成经理", "客户成功经理", "CSM", "Owner", "owner", "assigned_to", "归属人", "对接人", "负责同事"],
    "owner_email": ["负责人邮箱", "负责人邮件", "邮箱", "Email", "email", "owner_email"],
    "product": ["产品", "产品线", "Product", "product", "方案", "购买产品"],
    "auto_renewal": ["自动续费", "自动续约", "Auto Renewal", "auto_renewal", "是否自动续费"],
    "renewal_notes": ["续费备注", "备注", "续费说明", "Renewal Notes", "notes", "remarks", "说明"],
    "is_renewal_in_progress": ["续签中", "续签进行中", "续签状态", "renewal_in_progress", "是否在谈续费", "续费推进中"],
    "status": ["合同状态", "状态", "Contract Status", "status", "合同阶段"],
}

USAGE_COLUMN_ALIASES: dict[str, list[str]] = {
    "customer_name": ["客户名称", "客户名", "客户", "Customer", "Customer Name", "customer", "customer_name", "公司名称"],
    "period": ["统计周期", "周期", "Period", "period", "月份", "统计月份", "月份周期"],
    "period_end": ["统计结束日期", "周期结束日", "Period End", "period_end", "截止日期", "日期"],
    "active_users": ["活跃用户数", "活跃用户", "活跃数", "Active Users", "active_users", "活跃账号", "月活用户", "MAU"],
    "total_licenses": ["总授权数", "总账号数", "总License", "Total Licenses", "total_licenses", "购买授权", "授权数", "账号总数", "席位"],
    "utilization_rate": ["使用率", "利用率", "Utilization Rate", "utilization", "utilization_rate", "使用占比"],
    "core_features_used": ["核心功能使用数", "使用功能数", "Features Used", "features_used", "核心功能数"],
    "total_core_features": ["核心功能总数", "总核心功能", "Total Features", "total_features", "总功能数"],
    "login_last_30_days": ["近30天登录", "近30日登录人数", "Login 30D", "login_30d", "login_last_30_days", "登录人数"],
    "has_pilot": ["试点项目", "有试点", "试点", "Pilot", "has_pilot", "是否试点"],
    "pilot_features": ["试点功能", "试点内容", "Pilot Features", "pilot_features"],
}

TICKET_COLUMN_ALIASES: dict[str, list[str]] = {
    "ticket_id": ["工单ID", "工单编号", "Ticket ID", "ticket_id", "id", "工单号"],
    "customer_name": ["客户名称", "客户名", "客户", "Customer", "Customer Name", "customer", "customer_name", "公司名称"],
    "subject": ["工单标题", "标题", "Subject", "subject", "问题标题", "主题"],
    "status": ["工单状态", "状态", "Ticket Status", "status", "处理状态"],
    "priority": ["优先级", "Priority", "priority", "紧急程度"],
    "created_at": ["创建时间", "创建日期", "创建", "Created At", "created_at", "提交时间", "开单时间"],
    "closed_at": ["关闭时间", "关闭日期", "Closed At", "closed_at", "结案时间"],
    "reopened_count": ["重开次数", "重新打开次数", "Reopened", "reopened_count", "reopen_count", "复发次数"],
    "is_reopened": ["是否重开", "已重开", "是否重开", "Is Reopened", "is_reopened", "重新打开"],
    "category": ["工单类别", "分类", "Category", "category", "问题分类", "类型"],
    "assigned_to": ["处理人", "负责人", "Assigned To", "assigned_to", "客服", "处理同事"],
}

FORECAST_COLUMN_ALIASES: dict[str, list[str]] = {
    "opportunity_id": ["商机ID", "商机编号", "Opportunity ID", "opp_id", "id", "商机号", "机会ID"],
    "customer_name": ["客户名称", "客户名", "客户", "Customer", "Customer Name", "customer", "customer_name", "公司名称"],
    "amount": ["预测金额", "商机金额", "金额", "Amount", "amount", "value", "预计金额", "预期收入"],
    "category": ["预测类别", "预测分类", "Category", "forecast_category", "category", "预测类型", "Forecast"],
    "close_date": ["预计关单日期", "关单日", "预计结束日期", "Close Date", "close_date", "预计成交日期"],
    "stage": ["商机阶段", "阶段", "Stage", "stage", "销售阶段"],
    "probability": ["成交概率", "概率", "Probability", "probability", "%", "百分比"],
    "sales_owner": ["销售负责人", "销售", "Sales Owner", "sales_owner", "销售代表", "AE", "业务员"],
    "contract_link": ["关联合同", "关联合同ID", "Contract Link", "contract_id", "合同关联", "对应合同"],
    "notes": ["备注", "Notes", "notes", "说明", "跟进说明"],
}


def _resolve_column(df_columns: list[str], aliases: list[str]) -> Optional[str]:
    norm_to_orig = {str(c).strip().lower(): c for c in df_columns}
    for alias in aliases:
        if alias in df_columns:
            return alias
        norm = alias.strip().lower()
        if norm in norm_to_orig:
            return norm_to_orig[norm]
    for col in df_columns:
        col_norm = str(col).strip().lower()
        for alias in aliases:
            alias_norm = alias.strip().lower()
            if alias_norm in col_norm or col_norm in alias_norm:
                return col
    return None


def _build_row_dicts(df: pd.DataFrame, aliases_map: dict[str, list[str]]) -> list[dict[str, Any]]:
    resolved: dict[str, Optional[str]] = {}
    for field_name, aliases in aliases_map.items():
        resolved[field_name] = _resolve_column(list(df.columns), aliases)
    records: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        record: dict[str, Any] = {}
        raw: dict[str, Any] = {}
        for col in df.columns:
            val = row[col]
            if isinstance(val, float) and pd.isna(val):
                raw[str(col)] = None
            else:
                raw[str(col)] = val
        for field_name, src_col in resolved.items():
            if src_col and src_col in row.index:
                val = row[src_col]
                if isinstance(val, float) and pd.isna(val):
                    record[field_name] = None
                else:
                    record[field_name] = val
            record.setdefault(field_name, None)
        record["_raw"] = raw
        records.append(record)
    return records


def read_table(file_path: Path, sheet_name: Optional[str] = None) -> pd.DataFrame:
    ext = file_path.suffix.lower()
    if ext in (".xlsx", ".xls"):
        return pd.read_excel(file_path, sheet_name=sheet_name or 0, dtype=object)
    if ext == ".csv":
        for enc in ("utf-8-sig", "utf-8", "gbk", "gb18030"):
            try:
                return pd.read_csv(file_path, dtype=object, encoding=enc)
            except UnicodeDecodeError:
                continue
        raise ValueError(f"无法读取CSV文件: {file_path}")
    if ext == ".json":
        return pd.read_json(file_path, dtype=object)
    raise ValueError(f"不支持的文件格式: {ext}")


def import_contracts(file_path: Path, sheet_name: Optional[str] = None) -> ImportResult:
    df = read_table(file_path, sheet_name)
    rows = _build_row_dicts(df, CONTRACT_COLUMN_ALIASES)
    result = ImportResult(total_rows=len(rows))
    for idx, r in enumerate(rows):
        try:
            if not r.get("customer_name"):
                result.skipped_rows.append(idx)
                continue
            end_date = _parse_date(r.get("end_date"))
            start_date = _parse_date(r.get("start_date"))
            raw_status = str(r.get("status") or "").strip()
            status = ContractStatus.ACTIVE
            if "续签中" in raw_status or "renewal" in raw_status.lower():
                status = ContractStatus.RENEWAL_IN_PROGRESS
            elif end_date and end_date < date.today():
                status = ContractStatus.EXPIRED
            contract = Contract(
                contract_id=str(r.get("contract_id") or f"AUTO-{idx}").strip(),
                customer_name=str(r["customer_name"]).strip(),
                contract_value=_parse_float(r.get("contract_value")),
                start_date=start_date,
                end_date=end_date,
                status=status,
                owner_name=str(r.get("owner_name") or "").strip(),
                owner_email=str(r.get("owner_email") or "").strip(),
                product=str(r.get("product") or "").strip(),
                auto_renewal=_parse_bool(r.get("auto_renewal")),
                renewal_notes=str(r.get("renewal_notes") or "").strip(),
                is_renewal_in_progress=_parse_bool(r.get("is_renewal_in_progress")) or status == ContractStatus.RENEWAL_IN_PROGRESS,
                raw_data=r.get("_raw", {}),
            )
            result.records.append(contract)
            result.success_count += 1
        except Exception as e:
            result.errors.append(f"第{idx + 2}行: {e}")
    return result


def import_usage(file_path: Path, sheet_name: Optional[str] = None) -> ImportResult:
    df = read_table(file_path, sheet_name)
    rows = _build_row_dicts(df, USAGE_COLUMN_ALIASES)
    result = ImportResult(total_rows=len(rows))
    for idx, r in enumerate(rows):
        try:
            if not r.get("customer_name"):
                result.skipped_rows.append(idx)
                continue
            total_licenses = _parse_int(r.get("total_licenses"))
            active_users = _parse_int(r.get("active_users"))
            utilization = _parse_float(r.get("utilization_rate"))
            if utilization == 0.0 and total_licenses > 0:
                utilization = active_users / total_licenses if total_licenses > 0 else 0.0
            elif utilization > 1.0:
                utilization = utilization / 100.0
            usage = UsageRecord(
                customer_name=str(r["customer_name"]).strip(),
                period=str(r.get("period") or "").strip(),
                period_end=_parse_date(r.get("period_end")),
                active_users=active_users,
                total_licenses=total_licenses,
                utilization_rate=utilization,
                core_features_used=_parse_int(r.get("core_features_used")),
                total_core_features=_parse_int(r.get("total_core_features")),
                login_last_30_days=_parse_int(r.get("login_last_30_days")),
                has_pilot=_parse_bool(r.get("has_pilot")),
                pilot_features=str(r.get("pilot_features") or "").strip(),
                raw_data=r.get("_raw", {}),
            )
            result.records.append(usage)
            result.success_count += 1
        except Exception as e:
            result.errors.append(f"第{idx + 2}行: {e}")
    return result


def import_tickets(file_path: Path, sheet_name: Optional[str] = None) -> ImportResult:
    df = read_table(file_path, sheet_name)
    rows = _build_row_dicts(df, TICKET_COLUMN_ALIASES)
    result = ImportResult(total_rows=len(rows))
    for idx, r in enumerate(rows):
        try:
            if not r.get("customer_name"):
                result.skipped_rows.append(idx)
                continue
            raw_status = str(r.get("status") or "open").strip().lower()
            if "重开" in str(r.get("status") or "") or "reopen" in raw_status:
                status = TicketStatus.REOPENED
            elif "关闭" in raw_status or "closed" in raw_status or "done" in raw_status:
                status = TicketStatus.CLOSED
            elif "处理中" in str(r.get("status") or "") or "progress" in raw_status or "pending" in raw_status:
                if "客户" in str(r.get("status") or "") or "customer" in raw_status:
                    status = TicketStatus.PENDING_CUSTOMER
                else:
                    status = TicketStatus.IN_PROGRESS
            else:
                status = TicketStatus.OPEN
            is_reopened = _parse_bool(r.get("is_reopened")) or status == TicketStatus.REOPENED
            reopened_count = _parse_int(r.get("reopened_count"))
            if is_reopened and reopened_count == 0:
                reopened_count = 1
            ticket = Ticket(
                ticket_id=str(r.get("ticket_id") or f"T-{idx}").strip(),
                customer_name=str(r["customer_name"]).strip(),
                subject=str(r.get("subject") or "").strip(),
                status=status,
                priority=str(r.get("priority") or "medium").strip(),
                created_at=_parse_date(r.get("created_at")),
                closed_at=_parse_date(r.get("closed_at")),
                reopened_count=reopened_count,
                is_reopened=is_reopened,
                category=str(r.get("category") or "").strip(),
                assigned_to=str(r.get("assigned_to") or "").strip(),
                raw_data=r.get("_raw", {}),
            )
            result.records.append(ticket)
            result.success_count += 1
        except Exception as e:
            result.errors.append(f"第{idx + 2}行: {e}")
    return result


def import_forecasts(file_path: Path, sheet_name: Optional[str] = None) -> ImportResult:
    df = read_table(file_path, sheet_name)
    rows = _build_row_dicts(df, FORECAST_COLUMN_ALIASES)
    result = ImportResult(total_rows=len(rows))
    category_map = {
        "已赢单": ForecastCategory.WON,
        "赢单": ForecastCategory.WON,
        "won": ForecastCategory.WON,
        "承诺": ForecastCategory.COMMITTED,
        "committed": ForecastCategory.COMMITTED,
        "commit": ForecastCategory.COMMITTED,
        "最佳情况": ForecastCategory.BEST_CASE,
        "最佳": ForecastCategory.BEST_CASE,
        "best case": ForecastCategory.BEST_CASE,
        "best_case": ForecastCategory.BEST_CASE,
        "管道": ForecastCategory.PIPELINE,
        "商机管道": ForecastCategory.PIPELINE,
        "pipeline": ForecastCategory.PIPELINE,
        "省略": ForecastCategory.OMITTED,
        "忽略": ForecastCategory.OMITTED,
        "omitted": ForecastCategory.OMITTED,
        "已输单": ForecastCategory.LOST,
        "输单": ForecastCategory.LOST,
        "lost": ForecastCategory.LOST,
    }
    for idx, r in enumerate(rows):
        try:
            if not r.get("customer_name"):
                result.skipped_rows.append(idx)
                continue
            raw_cat = str(r.get("category") or "pipeline").strip().lower()
            category = ForecastCategory.PIPELINE
            for key, val in category_map.items():
                if key in raw_cat:
                    category = val
                    break
            prob = _parse_float(r.get("probability"))
            if 0 < prob <= 1:
                prob = prob * 100
            forecast = ForecastRecord(
                opportunity_id=str(r.get("opportunity_id") or f"OPP-{idx}").strip(),
                customer_name=str(r["customer_name"]).strip(),
                amount=_parse_float(r.get("amount")),
                category=category,
                close_date=_parse_date(r.get("close_date")),
                stage=str(r.get("stage") or "").strip(),
                probability=prob,
                sales_owner=str(r.get("sales_owner") or "").strip(),
                contract_link=str(r.get("contract_link") or "").strip(),
                notes=str(r.get("notes") or "").strip(),
                raw_data=r.get("_raw", {}),
            )
            result.records.append(forecast)
            result.success_count += 1
        except Exception as e:
            result.errors.append(f"第{idx + 2}行: {e}")
    return result
