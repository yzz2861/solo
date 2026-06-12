from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path
from typing import TextIO

from fuel_recon.models import (
    Anomaly,
    AnomalyType,
    ReconciliationResult,
    ReimburseStatus,
)
from fuel_recon.reconciler import Reconciler


def export_pending_list(
    result: ReconciliationResult,
    reconciler: Reconciler,
    output_path: str,
):
    classified = reconciler.classify_reimburse(result)
    pending = classified.get(ReimburseStatus.PENDING, [])
    rejected = classified.get(ReimburseStatus.REJECTED, [])

    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "流水号", "卡号", "车牌号", "司机", "加油时间",
            "油站名称", "油站城市", "油品", "加油量(L)",
            "含税金额", "不含税金额", "税额", "票据号",
            "异常类型", "异常说明", "严重程度", "处理状态",
            "关联排班司机", "关联排班车牌", "排班时间段",
            "关联里程日期", "当日里程(km)", "最大可加油量(L)",
        ])
        for a in pending + rejected:
            row = _anomaly_to_row(a)
            writer.writerow(row)


def export_reimburse_summary(
    result: ReconciliationResult,
    reconciler: Reconciler,
    output_path: str,
):
    classified = reconciler.classify_reimburse(result)
    approved = classified.get(ReimburseStatus.APPROVED, [])

    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "流水号", "卡号", "车牌号", "司机", "加油时间",
            "油站名称", "油品", "加油量(L)",
            "含税金额", "不含税金额", "税额", "票据号",
            "备注",
        ])
        for a in approved:
            txn = a.txn
            writer.writerow([
                txn.txn_id,
                txn.card_number,
                txn.plate_number,
                txn.driver_name,
                txn.fuel_time.strftime("%Y-%m-%d %H:%M"),
                txn.station_name,
                txn.fuel_type,
                f"{txn.volume_liters:.1f}",
                f"{txn.amount_with_tax:.2f}",
                f"{txn.amount_without_tax:.2f}",
                f"{txn.tax_amount:.2f}",
                txn.receipt_number,
                a.description,
            ])

    total_with_tax = sum(a.txn.amount_with_tax for a in approved)
    total_without_tax = sum(a.txn.amount_without_tax for a in approved)
    total_tax = sum(a.txn.tax_amount for a in approved)
    summary_path = Path(output_path).with_suffix(".summary.csv")
    with open(summary_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["项目", "笔数", "含税总额", "不含税总额", "税额总额"])
        writer.writerow([
            "可报销",
            len(approved),
            f"{total_with_tax:.2f}",
            f"{total_without_tax:.2f}",
            f"{total_tax:.2f}",
        ])


def export_audit_report(
    result: ReconciliationResult,
    reconciler: Reconciler,
    output_path: str,
):
    classified = reconciler.classify_reimburse(result)

    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "流水号", "卡号", "车牌号", "司机", "加油时间",
            "油站名称", "油站城市", "油品", "加油量(L)",
            "含税金额", "不含税金额", "税额", "税率", "票据号",
            "异常类型", "异常说明", "严重程度", "报销状态",
            "排班司机", "排班车牌", "排班开始", "排班结束",
            "里程日期", "起始里程", "结束里程", "当日里程(km)",
            "关联重复流水号", "关联重复加油时间", "关联重复加油量(L)",
        ])

        for status in (ReimburseStatus.APPROVED, ReimburseStatus.PENDING, ReimburseStatus.REJECTED):
            for a in classified.get(status, []):
                row = _anomaly_to_full_row(a, status)
                writer.writerow(row)


def _anomaly_to_row(a: Anomaly) -> list[str]:
    txn = a.txn
    shift_info = _shift_info(a)
    mileage_info = _mileage_info(a)
    status = "待解释" if a.anomaly_type != AnomalyType.SUSPECTED_DUPLICATE else "不可报销"
    return [
        txn.txn_id,
        txn.card_number,
        txn.plate_number,
        txn.driver_name,
        txn.fuel_time.strftime("%Y-%m-%d %H:%M"),
        txn.station_name,
        txn.station_city,
        txn.fuel_type,
        f"{txn.volume_liters:.1f}",
        f"{txn.amount_with_tax:.2f}",
        f"{txn.amount_without_tax:.2f}",
        f"{txn.tax_amount:.2f}",
        txn.receipt_number,
        a.anomaly_type.value,
        a.description,
        a.severity,
        status,
        shift_info[0],
        shift_info[1],
        shift_info[2],
        mileage_info[0],
        mileage_info[1],
        mileage_info[2],
    ]


def _anomaly_to_full_row(a: Anomaly, status: ReimburseStatus) -> list[str]:
    txn = a.txn
    shift_info = _shift_info(a)
    mileage_info = _mileage_info(a)
    related_dup = _related_dup_info(a)
    return [
        txn.txn_id,
        txn.card_number,
        txn.plate_number,
        txn.driver_name,
        txn.fuel_time.strftime("%Y-%m-%d %H:%M"),
        txn.station_name,
        txn.station_city,
        txn.fuel_type,
        f"{txn.volume_liters:.1f}",
        f"{txn.amount_with_tax:.2f}",
        f"{txn.amount_without_tax:.2f}",
        f"{txn.tax_amount:.2f}",
        f"{txn.tax_rate:.0%}",
        txn.receipt_number,
        a.anomaly_type.value,
        a.description,
        a.severity,
        status.value,
        shift_info[0],
        shift_info[1],
        shift_info[2],
        shift_info[3],
        mileage_info[0],
        mileage_info[3],
        mileage_info[4],
        mileage_info[1],
        related_dup[0],
        related_dup[1],
        related_dup[2],
    ]


def _shift_info(a: Anomaly) -> list[str]:
    shift = a.related_shift
    if shift is None:
        return ["", "", "", ""]
    return [
        shift.driver_name,
        shift.plate_number,
        shift.shift_start.strftime("%Y-%m-%d %H:%M"),
        shift.shift_end.strftime("%Y-%m-%d %H:%M"),
    ]


def _mileage_info(a: Anomaly) -> list[str]:
    mr = a.related_mileage
    if mr is None:
        return ["", "", "", "", ""]
    return [
        mr.record_date,
        f"{mr.daily_mileage:.1f}",
        f"{mr.daily_mileage / 100.0 * 30.0:.1f}",
        f"{mr.start_mileage:.1f}",
        f"{mr.end_mileage:.1f}",
    ]


def _related_dup_info(a: Anomaly) -> list[str]:
    if not a.related_txns:
        return ["", "", ""]
    rt = a.related_txns[0]
    return [
        rt.txn_id,
        rt.fuel_time.strftime("%Y-%m-%d %H:%M"),
        f"{rt.volume_liters:.1f}",
    ]
