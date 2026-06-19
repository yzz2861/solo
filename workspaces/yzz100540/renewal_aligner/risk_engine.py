from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Optional

from .models import (
    ContractStatus,
    CustomerRenewalRecord,
    ForecastCategory,
    RiskFlag,
    RiskLevel,
    RiskType,
)


RISK_ORDER = [
    RiskLevel.NONE,
    RiskLevel.LOW,
    RiskLevel.MEDIUM,
    RiskLevel.HIGH,
    RiskLevel.CRITICAL,
]


@dataclass
class RiskConfig:
    expiring_soon_days: int = 90
    urgent_renewal_days: int = 30
    low_usage_threshold: float = 0.40
    very_low_usage_threshold: float = 0.20
    low_login_threshold: int = 5
    high_ticket_threshold: int = 3
    critical_ticket_threshold: int = 6
    reopened_ticket_threshold: int = 1
    high_priority_open_threshold: int = 1
    forecast_value_tolerance: float = 0.10
    forecast_close_window_days: int = 60
    zero_usage_attention_days: int = 14


def _max_risk_level(levels: list[RiskLevel]) -> RiskLevel:
    if not levels:
        return RiskLevel.NONE
    return max(levels, key=lambda l: RISK_ORDER.index(l))


def _days_until(target: Optional[date], baseline: date) -> Optional[int]:
    if not target:
        return None
    return (target - baseline).days


def _check_expiring(record: CustomerRenewalRecord, cfg: RiskConfig, baseline: date) -> list[RiskFlag]:
    flags: list[RiskFlag] = []
    contract = record.primary_contract
    if not contract or not contract.end_date:
        return flags
    days_left = _days_until(contract.end_date, baseline)
    if days_left is None:
        return flags

    if contract.is_renewal_in_progress:
        if days_left <= cfg.urgent_renewal_days:
            flags.append(RiskFlag(
                risk_type=RiskType.CONTRACT_RENEWAL_PENDING,
                risk_level=RiskLevel.MEDIUM,
                message=f"续签进行中但仅剩{days_left}天到期，需加快推进",
                details={"days_left": days_left, "contract_id": contract.contract_id},
            ))
        else:
            flags.append(RiskFlag(
                risk_type=RiskType.CONTRACT_RENEWAL_PENDING,
                risk_level=RiskLevel.LOW,
                message=f"合同续签中，还有{days_left}天到期",
                details={"days_left": days_left, "contract_id": contract.contract_id},
            ))
        return flags

    if days_left <= 0:
        flags.append(RiskFlag(
            risk_type=RiskType.EXPIRING_SOON,
            risk_level=RiskLevel.CRITICAL,
            message=f"合同已过期{abs(days_left)}天，未续签也未关闭",
            details={"days_overdue": abs(days_left), "contract_id": contract.contract_id},
        ))
    elif days_left <= cfg.urgent_renewal_days:
        flags.append(RiskFlag(
            risk_type=RiskType.EXPIRING_SOON,
            risk_level=RiskLevel.CRITICAL,
            message=f"合同{days_left}天内到期，极度紧急，尚未启动续签",
            details={"days_left": days_left, "contract_id": contract.contract_id},
        ))
    elif days_left <= cfg.expiring_soon_days:
        flags.append(RiskFlag(
            risk_type=RiskType.EXPIRING_SOON,
            risk_level=RiskLevel.HIGH,
            message=f"合同{days_left}天后到期，需尽快启动续签讨论",
            details={"days_left": days_left, "contract_id": contract.contract_id},
        ))
    return flags


def _check_usage(record: CustomerRenewalRecord, cfg: RiskConfig, baseline: date) -> list[RiskFlag]:
    flags: list[RiskFlag] = []
    usage = record.latest_usage
    if not usage:
        flags.append(RiskFlag(
            risk_type=RiskType.USAGE_MISSING,
            risk_level=RiskLevel.MEDIUM,
            message="缺少使用量数据，请确认系统已同步",
            details={},
        ))
        return flags

    if usage.is_zero_usage:
        if usage.has_pilot:
            flags.append(RiskFlag(
                risk_type=RiskType.ZERO_USAGE_WITH_PILOT,
                risk_level=RiskLevel.HIGH,
                message="使用量为零但有试点项目：需确认试点是否真正落地，避免试点变永久零使用",
                details={
                    "pilot_features": usage.pilot_features,
                    "total_licenses": usage.total_licenses,
                },
            ))
        else:
            flags.append(RiskFlag(
                risk_type=RiskType.LOW_USAGE,
                risk_level=RiskLevel.CRITICAL,
                message="使用量为零且无试点，客户完全未使用产品，流失风险极高",
                details={
                    "total_licenses": usage.total_licenses,
                    "login_last_30d": usage.login_last_30_days,
                },
            ))
        return flags

    if usage.utilization_rate <= cfg.very_low_usage_threshold:
        flags.append(RiskFlag(
            risk_type=RiskType.LOW_USAGE,
            risk_level=RiskLevel.CRITICAL,
            message=f"使用率仅{usage.utilization_rate*100:.0f}%，远低于正常水平",
            details={
                "utilization_rate": usage.utilization_rate,
                "active_users": usage.active_users,
                "total_licenses": usage.total_licenses,
            },
        ))
    elif usage.utilization_rate <= cfg.low_usage_threshold:
        flags.append(RiskFlag(
            risk_type=RiskType.LOW_USAGE,
            risk_level=RiskLevel.HIGH,
            message=f"使用率仅{usage.utilization_rate*100:.0f}%，低于警戒线({cfg.low_usage_threshold*100:.0f}%)",
            details={
                "utilization_rate": usage.utilization_rate,
                "active_users": usage.active_users,
                "total_licenses": usage.total_licenses,
            },
        ))

    if usage.login_last_30_days > 0 and usage.login_last_30_days <= cfg.low_login_threshold:
        flags.append(RiskFlag(
            risk_type=RiskType.LOW_USAGE,
            risk_level=RiskLevel.MEDIUM,
            message=f"近30天仅{usage.login_last_30_days}人登录，活跃度较低",
            details={"login_last_30d": usage.login_last_30_days},
        ))
    return flags


def _check_tickets(record: CustomerRenewalRecord, cfg: RiskConfig, baseline: date) -> list[RiskFlag]:
    flags: list[RiskFlag] = []
    open_count = record.open_ticket_count
    reopened_count = record.reopened_ticket_count
    high_priority_open = 0
    for t in record.tickets:
        if t.status in ("open", "in_progress", "reopened", "pending_customer"):
            p = (t.priority or "").lower()
            if p in ("高", "high", "紧急", "urgent", "critical", "严重", "p0", "p1"):
                high_priority_open += 1

    if reopened_count >= cfg.reopened_ticket_threshold:
        sample = [t.subject for t in record.tickets if t.is_reopened][:3]
        flags.append(RiskFlag(
            risk_type=RiskType.TICKET_REOPENED,
            risk_level=RiskLevel.HIGH,
            message=f"有{reopened_count}个工单关闭后又重开，说明问题未根本解决",
            details={"reopened_count": reopened_count, "samples": sample},
        ))

    if open_count >= cfg.critical_ticket_threshold:
        flags.append(RiskFlag(
            risk_type=RiskType.HIGH_TICKETS,
            risk_level=RiskLevel.CRITICAL,
            message=f"当前{open_count}个未关闭工单，远超正常水平",
            details={"open_count": open_count, "high_priority": high_priority_open},
        ))
    elif open_count >= cfg.high_ticket_threshold:
        flags.append(RiskFlag(
            risk_type=RiskType.HIGH_TICKETS,
            risk_level=RiskLevel.HIGH,
            message=f"当前{open_count}个未关闭工单，较多",
            details={"open_count": open_count, "high_priority": high_priority_open},
        ))

    if high_priority_open >= cfg.high_priority_open_threshold:
        flags.append(RiskFlag(
            risk_type=RiskType.HIGH_TICKETS,
            risk_level=RiskLevel.HIGH,
            message=f"有{high_priority_open}个高优先级未关闭工单，需立即处理",
            details={"high_priority": high_priority_open},
        ))

    return flags


def _check_forecast(record: CustomerRenewalRecord, cfg: RiskConfig, baseline: date) -> list[RiskFlag]:
    flags: list[RiskFlag] = []
    contract = record.primary_contract
    contract_value = record.contract_value

    if not contract:
        return flags

    days_left = _days_until(contract.end_date, baseline)
    needs_forecast = (
        days_left is not None
        and days_left <= cfg.expiring_soon_days
        and not contract.is_renewal_in_progress
    )

    if needs_forecast and not record.has_forecast:
        flags.append(RiskFlag(
            risk_type=RiskType.FORECAST_MISSING,
            risk_level=RiskLevel.CRITICAL,
            message=f"合同{days_left}天内到期，但销售预测中没有对应商机，请立即与销售确认",
            details={"contract_value": contract_value, "days_left": days_left},
        ))
        return flags

    if not record.has_forecast:
        return flags

    committed_amount = record.committed_forecast_amount
    has_any_forecast = any(
        f.category in (ForecastCategory.WON, ForecastCategory.COMMITTED,
                      ForecastCategory.BEST_CASE, ForecastCategory.PIPELINE)
        for f in record.forecasts
    )

    if needs_forecast and committed_amount == 0 and has_any_forecast:
        flags.append(RiskFlag(
            risk_type=RiskType.FORECAST_MISMATCH,
            risk_level=RiskLevel.HIGH,
            message=f"合同{days_left}天内到期，但预测中没有WON/COMMITTED商机，续费概率存疑",
            details={
                "contract_value": contract_value,
                "forecasts": [
                    {"category": f.category, "amount": f.amount, "stage": f.stage}
                    for f in record.forecasts
                ],
            },
        ))
        return flags

    if contract_value > 0 and committed_amount > 0:
        ratio = committed_amount / contract_value
        lower = 1.0 - cfg.forecast_value_tolerance
        upper = 1.0 + cfg.forecast_value_tolerance
        if ratio < lower:
            flags.append(RiskFlag(
                risk_type=RiskType.FORECAST_MISMATCH,
                risk_level=RiskLevel.HIGH,
                message=f"预测金额(￥{committed_amount:,.0f})低于合同额(￥{contract_value:,.0f})的{(1-cfg.forecast_value_tolerance)*100:.0f}%，可能缩量或流失",
                details={
                    "contract_value": contract_value,
                    "committed_forecast": committed_amount,
                    "ratio": ratio,
                },
            ))
        elif ratio > upper:
            flags.append(RiskFlag(
                risk_type=RiskType.FORECAST_MISMATCH,
                risk_level=RiskLevel.LOW,
                message=f"预测金额(￥{committed_amount:,.0f})高于合同额(￥{contract_value:,.0f})，可能是增购，需与销售确认",
                details={
                    "contract_value": contract_value,
                    "committed_forecast": committed_amount,
                    "ratio": ratio,
                },
            ))

    if days_left is not None and days_left <= cfg.expiring_soon_days:
        for f in record.forecasts:
            if f.close_date:
                close_delta = (f.close_date - contract.end_date).days
                if abs(close_delta) > cfg.forecast_close_window_days:
                    direction = "晚于" if close_delta > 0 else "早于"
                    flags.append(RiskFlag(
                        risk_type=RiskType.FORECAST_MISMATCH,
                        risk_level=RiskLevel.MEDIUM,
                        message=f"预测商机关单日{direction}合同到期日{abs(close_delta)}天，时间线不一致",
                        details={
                            "contract_end": contract.end_date.isoformat(),
                            "forecast_close": f.close_date.isoformat(),
                            "delta_days": close_delta,
                            "opportunity_id": f.opportunity_id,
                        },
                    ))
    return flags


def _check_rename(record: CustomerRenewalRecord, cfg: RiskConfig, baseline: date) -> list[RiskFlag]:
    flags: list[RiskFlag] = []
    if record.was_renamed and record.rename_details:
        prev = "、".join(record.rename_details.get("previous_names") or [])
        rename_note = ""
        if record.rename_details.get("rename_date"):
            rename_note = f" (改名时间: {record.rename_details['rename_date']})"
        raw_name = record.rename_details.get("raw_name", "")
        if raw_name and raw_name != record.canonical_customer_name:
            flags.append(RiskFlag(
                risk_type=RiskType.CUSTOMER_RENAMED,
                risk_level=RiskLevel.MEDIUM,
                message=f"源数据使用旧名「{raw_name}」，标准名「{record.canonical_customer_name}」。曾用名: {prev}{rename_note}。请确认各系统已同步更新客户名称，避免后续混淆",
                details=record.rename_details,
            ))
    return flags


def assess_record(
    record: CustomerRenewalRecord,
    baseline: Optional[date] = None,
    config: Optional[RiskConfig] = None,
) -> CustomerRenewalRecord:
    cfg = config or RiskConfig()
    base = baseline or date.today()

    all_flags: list[RiskFlag] = []
    all_flags.extend(_check_expiring(record, cfg, base))
    all_flags.extend(_check_usage(record, cfg, base))
    all_flags.extend(_check_tickets(record, cfg, base))
    all_flags.extend(_check_forecast(record, cfg, base))
    all_flags.extend(_check_rename(record, cfg, base))

    record.risks = all_flags
    record.highest_risk_level = _max_risk_level([f.risk_level for f in all_flags])

    if not record.next_action:
        record.next_action = _suggest_action(record, cfg, base)
    if not record.follow_up_date:
        record.follow_up_date = _suggest_follow_up(record, cfg, base)
    return record


def _suggest_action(record: CustomerRenewalRecord, cfg: RiskConfig, baseline: date) -> str:
    actions: list[str] = []
    level = record.highest_risk_level
    types = {f.risk_type for f in record.risks}

    if RiskType.EXPIRING_SOON in types:
        contract = record.primary_contract
        if contract and contract.end_date:
            d = (contract.end_date - baseline).days
            if d <= cfg.urgent_renewal_days:
                actions.append(f"本周内与客户完成续费谈判并签单（剩余{d}天，极度紧急）")
            else:
                actions.append(f"本周内启动续费会议，确认客户续约意向（剩余{d}天）")
    elif RiskType.CONTRACT_RENEWAL_PENDING in types:
        actions.append("跟进续签进度，与法务和客户确认合同条款细节")

    if RiskType.LOW_USAGE in types:
        actions.append("安排客户成功拜访，了解使用障碍，制定激活/培训计划")
    if RiskType.ZERO_USAGE_WITH_PILOT in types:
        actions.append("核查试点项目落地情况，必要时升级为商务问题与决策层沟通")

    if RiskType.HIGH_TICKETS in types:
        actions.append("拉通产品和技术负责人，集中解决积压工单，与客户同步进度")
    if RiskType.TICKET_REOPENED in types:
        actions.append("复盘重开工单根本原因，指派资深工程师彻底解决")

    if RiskType.FORECAST_MISSING in types:
        actions.append("立即联系销售负责人，要求本周内录入对应续费商机")
    if RiskType.FORECAST_MISMATCH in types:
        actions.append("与销售对齐预测金额和时间线，确认是增购、缩量还是流失")

    if RiskType.CUSTOMER_RENAMED in types:
        actions.append("同步客户新名称到CRM/合同/工单系统，更新内部通讯录")

    if not actions:
        if level == RiskLevel.LOW:
            actions.append("正常维护，月度例行回访")
        elif level == RiskLevel.NONE:
            actions.append("无特殊动作，保持日常客户成功关怀")
        else:
            actions.append("保持关注，按计划跟进")

    return "；".join(actions)


def _suggest_follow_up(record: CustomerRenewalRecord, cfg: RiskConfig, baseline: date) -> Optional[date]:
    level = record.highest_risk_level
    types = {f.risk_type for f in record.risks}

    if RiskType.EXPIRING_SOON in types:
        contract = record.primary_contract
        if contract and contract.end_date:
            d = (contract.end_date - baseline).days
            if d <= cfg.urgent_renewal_days:
                return baseline + timedelta(days=2)
            return baseline + timedelta(days=5)
    if level in (RiskLevel.CRITICAL, RiskLevel.HIGH):
        return baseline + timedelta(days=3)
    if RiskType.CONTRACT_RENEWAL_PENDING in types:
        return baseline + timedelta(days=5)
    if level == RiskLevel.MEDIUM:
        return baseline + timedelta(days=7)
    if level == RiskLevel.LOW:
        return baseline + timedelta(days=14)
    return baseline + timedelta(days=30)


def run_risk_assessment(
    records: dict[str, CustomerRenewalRecord],
    baseline: Optional[date] = None,
    config: Optional[RiskConfig] = None,
) -> dict[str, CustomerRenewalRecord]:
    base = baseline or date.today()
    cfg = config or RiskConfig()
    for rec in records.values():
        assess_record(rec, baseline=base, config=cfg)
    return records
