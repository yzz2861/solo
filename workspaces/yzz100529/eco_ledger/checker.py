from __future__ import annotations

from collections import defaultdict
from datetime import date

from .models import (
    IssueRecord,
    IssueType,
    LedgerEntry,
    ManifestEntry,
    ReorderResult,
    WeightUnit,
)


def check_issues(
    entries: list[LedgerEntry],
    manifests: list[ManifestEntry],
) -> list[IssueRecord]:
    issues: list[IssueRecord] = []

    _check_duplicate_barrels(entries, issues)
    _check_missing_manifests(entries, manifests, issues)
    _check_weight_mismatch(entries, manifests, issues)
    _check_cross_month_storage(entries, manifests, issues)
    _check_voided_manifests(entries, manifests, issues)
    _check_unit_inconsistency(entries, manifests, issues)

    return issues


def _check_duplicate_barrels(
    entries: list[LedgerEntry], issues: list[IssueRecord]
) -> None:
    barrel_map: dict[str, list[LedgerEntry]] = defaultdict(list)
    for e in entries:
        barrel_map[e.barrel_no].append(e)

    for barrel_no, group in barrel_map.items():
        if len(group) > 1:
            ids = ", ".join(e.original_id for e in group)
            issues.append(
                IssueRecord(
                    issue_type=IssueType.DUPLICATE_BARREL,
                    barrel_no=barrel_no,
                    ledger_id=ids,
                    detail=f"桶号 {barrel_no} 在台账中出现 {len(group)} 次"
                    f"（条目: {ids}）",
                    suggestion="请核实是否为录入错误或同一桶多次称重；"
                    "若为后者，需在桶号后添加后缀区分",
                )
            )


def _check_missing_manifests(
    entries: list[LedgerEntry],
    manifests: list[ManifestEntry],
    issues: list[IssueRecord],
) -> None:
    manifest_nos = {m.manifest_no for m in manifests}

    entries_without_manifest = [
        e for e in entries if not e.manifest_no
    ]
    for e in entries_without_manifest:
        issues.append(
            IssueRecord(
                issue_type=IssueType.MISSING_MANIFEST,
                barrel_no=e.barrel_no,
                batch_no=e.batch_no,
                ledger_id=e.original_id,
                detail=f"台账条目 {e.original_id}（桶号 {e.barrel_no}）"
                f"缺少关联的转移联单编号",
                suggestion="请补充联单编号，或确认该废物尚未转移",
            )
        )

    entries_with_invalid_manifest = [
        e for e in entries
        if e.manifest_no and e.manifest_no not in manifest_nos
    ]
    for e in entries_with_invalid_manifest:
        issues.append(
            IssueRecord(
                issue_type=IssueType.MISSING_MANIFEST,
                barrel_no=e.barrel_no,
                batch_no=e.batch_no,
                manifest_no=e.manifest_no,
                ledger_id=e.original_id,
                detail=f"台账条目 {e.original_id}（桶号 {e.barrel_no}）"
                f"关联联单 {e.manifest_no} 在联单表中不存在",
                suggestion="请核实联单编号是否录入有误",
            )
        )


def _check_weight_mismatch(
    entries: list[LedgerEntry],
    manifests: list[ManifestEntry],
    issues: list[IssueRecord],
) -> None:
    manifest_map: dict[str, ManifestEntry] = {
        m.manifest_no: m for m in manifests
    }

    batch_entries: dict[str, list[LedgerEntry]] = defaultdict(list)
    for e in entries:
        if e.manifest_no:
            batch_entries[e.manifest_no].append(e)

    for manifest_no, group in batch_entries.items():
        manifest = manifest_map.get(manifest_no)
        if manifest is None:
            continue

        ledger_total_kg = sum(e.weight_kg for e in group)
        manifest_total_kg = manifest.total_weight_kg

        tolerance = max(manifest_total_kg * 0.02, 0.5)

        if abs(ledger_total_kg - manifest_total_kg) > tolerance:
            barrel_nos = ", ".join(e.barrel_no for e in group)
            issues.append(
                IssueRecord(
                    issue_type=IssueType.WEIGHT_MISMATCH,
                    batch_no=group[0].batch_no,
                    manifest_no=manifest_no,
                    barrel_no=barrel_nos,
                    detail=f"联单 {manifest_no} 总重 {manifest_total_kg:.2f}kg，"
                    f"关联台账条目合计 {ledger_total_kg:.2f}kg，"
                    f"差异 {abs(ledger_total_kg - manifest_total_kg):.2f}kg",
                    suggestion="请核实称重单是否被贴错批次，"
                    "或检查是否有遗漏/多余的台账条目",
                )
            )


def _check_cross_month_storage(
    entries: list[LedgerEntry],
    manifests: list[ManifestEntry],
    issues: list[IssueRecord],
) -> None:
    barrel_production: dict[str, date] = {}
    barrel_manifest_date: dict[str, date] = {}

    for e in entries:
        barrel_production[e.barrel_no] = e.production_date

    manifest_map: dict[str, ManifestEntry] = {
        m.manifest_no: m for m in manifests
    }
    for e in entries:
        if e.manifest_no and e.manifest_no in manifest_map:
            barrel_manifest_date[e.barrel_no] = manifest_map[
                e.manifest_no
            ].transfer_date

    for barrel_no, prod_date in barrel_production.items():
        transfer_date = barrel_manifest_date.get(barrel_no)
        if transfer_date is None:
            continue

        if (prod_date.year, prod_date.month) != (
            transfer_date.year,
            transfer_date.month,
        ):
            issues.append(
                IssueRecord(
                    issue_type=IssueType.CROSS_MONTH_STORAGE,
                    barrel_no=barrel_no,
                    detail=f"桶号 {barrel_no} 产生于 {prod_date.strftime('%Y-%m')}"
                    f"，转移于 {transfer_date.strftime('%Y-%m')}，存在跨月暂存",
                    suggestion="跨月暂存需在台账备注中说明暂存原因和存放期限",
                )
            )


def _check_voided_manifests(
    entries: list[LedgerEntry],
    manifests: list[ManifestEntry],
    issues: list[IssueRecord],
) -> None:
    voided_manifests = [m for m in manifests if m.status == "作废"]

    for vm in voided_manifests:
        linked_entries = [
            e for e in entries if e.manifest_no == vm.manifest_no
        ]
        if linked_entries:
            barrel_nos = ", ".join(e.barrel_no for e in linked_entries)
            issues.append(
                IssueRecord(
                    issue_type=IssueType.VOIDED_MANIFEST,
                    manifest_no=vm.manifest_no,
                    batch_no=vm.batch_no,
                    barrel_no=barrel_nos,
                    detail=f"联单 {vm.manifest_no} 已作废，"
                    f"但仍有台账条目（桶号 {barrel_nos}）关联该联单",
                    suggestion=f"联单作废原因：{vm.remark or '未说明'}；"
                    "请为关联台账条目更换有效联单或标注说明",
                )
            )


def _check_unit_inconsistency(
    entries: list[LedgerEntry],
    manifests: list[ManifestEntry],
    issues: list[IssueRecord],
) -> None:
    batch_units: dict[str, set[WeightUnit]] = defaultdict(set)
    for e in entries:
        batch_units[e.batch_no].add(e.weight_unit)

    for batch_no, units in batch_units.items():
        if len(units) > 1:
            unit_names = ", ".join(u.value for u in units)
            issues.append(
                IssueRecord(
                    issue_type=IssueType.UNIT_INCONSISTENCY,
                    batch_no=batch_no,
                    detail=f"批次 {batch_no} 内存在多种称重单位: {unit_names}",
                    suggestion="建议统一为同一单位（推荐kg），并在备注中说明换算关系",
                )
            )

    manifest_map: dict[str, ManifestEntry] = {
        m.manifest_no: m for m in manifests
    }
    for e in entries:
        if e.manifest_no and e.manifest_no in manifest_map:
            m = manifest_map[e.manifest_no]
            if e.weight_unit != m.weight_unit:
                issues.append(
                    IssueRecord(
                        issue_type=IssueType.UNIT_INCONSISTENCY,
                        batch_no=e.batch_no,
                        manifest_no=e.manifest_no,
                        barrel_no=e.barrel_no,
                        detail=f"桶号 {e.barrel_no} 台账单位为 {e.weight_unit.value}，"
                        f"联单 {e.manifest_no} 单位为 {m.weight_unit.value}",
                        suggestion="称重单位不一致，已自动换算比对；"
                        "建议统一记录单位并保留换算说明",
                    )
                )
