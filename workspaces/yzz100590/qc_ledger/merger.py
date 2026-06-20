from collections import defaultdict
from typing import List, Dict, Tuple
from .models import (
    DefectRecord, ReinspectionRecord, MergedRecord, Warning,
    STATUS_PENDING, STATUS_REWORK_PASSED, STATUS_CONCESSION,
    STATUS_SCRAPPED, STATUS_TAKEN_AWAY, STATUS_REWORKING, TEAM_ALIASES,
)


def _determine_status(defect: DefectRecord, reinspections: List[ReinspectionRecord]) -> str:
    if not reinspections:
        if defect.status in [STATUS_TAKEN_AWAY, STATUS_SCRAPPED]:
            return defect.status
        return STATUS_PENDING

    latest = reinspections[-1]
    result = latest.result

    if "通过" in result or "合格" in result or "ok" in result.lower():
        return STATUS_REWORK_PASSED
    elif "让步" in result or "接收" in result:
        return STATUS_CONCESSION
    elif "报废" in result:
        return STATUS_SCRAPPED
    elif "返工" in result or "再次" in result or "重检" in result:
        return STATUS_REWORKING
    elif "取走" in result or "拿走" in result:
        return STATUS_TAKEN_AWAY
    else:
        return defect.status or STATUS_PENDING


def _normalize_team_name(raw: str) -> Tuple[str, bool]:
    if not raw:
        return "未指定", False
    name = str(raw).strip()
    if name in TEAM_ALIASES:
        normalized = TEAM_ALIASES[name]
        was_abbr = (name != normalized)
        return normalized, was_abbr
    return name, False


def merge_and_validate(
    defects: List[DefectRecord],
    reinspections: List[ReinspectionRecord]
) -> Tuple[List[MergedRecord], List[Warning]]:
    all_warnings: List[Warning] = []

    reinspect_map: Dict[str, List[ReinspectionRecord]] = defaultdict(list)
    for r in reinspections:
        reinspect_map[r.batch_no].append(r)

    for batch, re_list in reinspect_map.items():
        re_list.sort(key=lambda x: (x.reinspection_date or __import__("datetime").datetime.min))

    defect_counts: Dict[str, int] = defaultdict(int)
    for d in defects:
        defect_counts[d.batch_no] += 1

    merged: List[MergedRecord] = []

    for defect in defects:
        batch_reinspections = reinspect_map.get(defect.batch_no, [])
        latest_re = batch_reinspections[-1] if batch_reinspections else None

        final_status = _determine_status(defect, batch_reinspections)

        normalized_team, was_abbr = _normalize_team_name(defect.raw_responsible_team)

        record_warnings: List[Warning] = []

        if not batch_reinspections and final_status not in [STATUS_TAKEN_AWAY, STATUS_SCRAPPED]:
            w = Warning(
                level="HIGH",
                category="复检缺失",
                message=f"批次 {defect.batch_no} 未找到复检记录",
                batch_no=defect.batch_no,
                process=defect.process,
            )
            record_warnings.append(w)
            all_warnings.append(w)

        if len(batch_reinspections) > 1:
            total_rework = sum(r.rework_count for r in batch_reinspections)
            w = Warning(
                level="MEDIUM",
                category="多次返工",
                message=f"批次 {defect.batch_no} 存在 {len(batch_reinspections)} 次复检记录，累计返工 {total_rework} 次",
                batch_no=defect.batch_no,
                process=defect.process,
            )
            record_warnings.append(w)
            all_warnings.append(w)

        if final_status == STATUS_CONCESSION:
            approved = latest_re.is_concession_approved if latest_re else None
            if approved is None:
                w = Warning(
                    level="HIGH",
                    category="审批缺失",
                    message=f"批次 {defect.batch_no} 让步接收但未标注审批状态",
                    batch_no=defect.batch_no,
                    process=defect.process,
                )
                record_warnings.append(w)
                all_warnings.append(w)
            elif not approved:
                w = Warning(
                    level="HIGH",
                    category="审批未通过",
                    message=f"批次 {defect.batch_no} 让步接收审批未通过",
                    batch_no=defect.batch_no,
                    process=defect.process,
                )
                record_warnings.append(w)
                all_warnings.append(w)

        if was_abbr:
            w = Warning(
                level="LOW",
                category="班组简称",
                message=f"班组名称使用简称: '{defect.raw_responsible_team}' 已标准化为 '{normalized_team}'",
                batch_no=defect.batch_no,
                process=defect.process,
            )
            record_warnings.append(w)
            all_warnings.append(w)

        if defect_counts[defect.batch_no] > 1 and final_status == STATUS_PENDING:
            w = Warning(
                level="MEDIUM",
                category="同批多缺陷",
                message=f"批次 {defect.batch_no} 存在 {defect_counts[defect.batch_no]} 条不合格记录",
                batch_no=defect.batch_no,
                process=defect.process,
            )
            record_warnings.append(w)
            all_warnings.append(w)

        merged.append(MergedRecord(
            batch_no=defect.batch_no,
            process=defect.process,
            defect_item=defect.defect_item,
            defect_date=defect.defect_date,
            responsible_team=normalized_team,
            quantity=defect.quantity,
            status=final_status,
            inspector=defect.inspector,
            defect_remark=defect.remark,
            reinspection_date=latest_re.reinspection_date if latest_re else None,
            reinspection_result=latest_re.result if latest_re else "",
            reinspector=latest_re.reinspector if latest_re else "",
            is_concession_approved=latest_re.is_concession_approved if latest_re else None,
            rework_count=sum(r.rework_count for r in batch_reinspections) if batch_reinspections else 0,
            reinspection_remark=latest_re.remark if latest_re else "",
            warnings=record_warnings,
        ))

    for batch_no, re_list in reinspect_map.items():
        if batch_no not in defect_counts:
            w = Warning(
                level="MEDIUM",
                category="复检无对应",
                message=f"复检批次 {batch_no} 在不合格记录中找不到对应条目",
                batch_no=batch_no,
            )
            all_warnings.append(w)

    return merged, all_warnings
