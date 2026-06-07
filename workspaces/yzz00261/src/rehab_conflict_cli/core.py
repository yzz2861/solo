"""核心业务逻辑 - 冲突检测与幂等处理"""
from typing import List, Dict, Tuple, Any
from collections import defaultdict

from .models import (
    AppointmentRecord, ConfigParams, ProcessResult,
    BatchSummary, DiffRecord, LogEntry
)
from .utils import (
    check_time_overlap, validate_record, calculate_risk_label,
    now_str, generate_batch_id
)


class ConflictDetector:
    """冲突检测器"""

    def __init__(self, params: ConfigParams):
        self.params = params
        self.logs: List[LogEntry] = []

    def _log(self, level: str, action: str, message: str, details: str = ""):
        """记录日志"""
        self.logs.append(LogEntry(
            timestamp=now_str(),
            level=level,
            batch_id=self.params.batch_id,
            action=action,
            message=message,
            details=details
        ))

    def detect_conflicts(self, records: List[AppointmentRecord]) -> List[ProcessResult]:
        """检测所有记录的冲突情况"""
        self._log("INFO", "开始冲突检测", f"共{len(records)}条记录", f"批次号: {self.params.batch_id}")

        results: Dict[str, ProcessResult] = {}
        bad_records: List[Tuple[AppointmentRecord, str]] = []

        self._log("INFO", "数据校验", "开始数据完整性校验")
        for record in records:
            is_valid, error_msg = validate_record(record)
            if not is_valid:
                bad_records.append((record, error_msg))
                results[record.source_id] = ProcessResult(
                    source_id=record.source_id,
                    row_hash=record.row_hash(),
                    status="failed",
                    error_message=error_msg,
                    batch_id=self.params.batch_id,
                    processed_at=now_str()
                )
                self._log("WARN", "数据校验失败",
                          f"记录 {record.source_id} 校验失败",
                          error_msg)
            else:
                results[record.source_id] = ProcessResult(
                    source_id=record.source_id,
                    row_hash=record.row_hash(),
                    status="success",
                    risk_label="无风险",
                    batch_id=self.params.batch_id,
                    processed_at=now_str()
                )

        valid_records = [r for r in records if r.source_id in results
                         and results[r.source_id].status == "success"]
        self._log("INFO", "数据校验完成",
                  f"有效记录 {len(valid_records)} 条，失败 {len(bad_records)} 条")

        if self.params.check_therapist_conflict:
            self._detect_therapist_conflicts(valid_records, results)

        if self.params.check_room_conflict:
            self._detect_room_conflicts(valid_records, results)

        if self.params.check_patient_conflict:
            self._detect_patient_conflicts(valid_records, results)

        for source_id, result in results.items():
            if result.status == "success" and result.conflict_with:
                conflict_types = []
                for cw in result.conflict_with:
                    if cw.startswith("therapist:"):
                        if "therapist" not in conflict_types:
                            conflict_types.append("therapist")
                    elif cw.startswith("room:"):
                        if "room" not in conflict_types:
                            conflict_types.append("room")
                    elif cw.startswith("patient:"):
                        if "patient" not in conflict_types:
                            conflict_types.append("patient")

                conflict_count = len([
                    c for c in result.conflict_with
                    if c.startswith("therapist:") or c.startswith("room:") or c.startswith("patient:")
                ])
                result.risk_label = calculate_risk_label(
                    conflict_count,
                    conflict_types
                )
                result.status = "conflict" if result.status == "success" else result.status

        self._log("INFO", "冲突检测完成",
                  f"冲突记录 {len([r for r in results.values() if r.status == 'conflict'])} 条",
                  f"失败 {len([r for r in results.values() if r.status == 'failed'])} 条")

        return list(results.values())

    def _detect_therapist_conflicts(self, records: List[AppointmentRecord],
                                     results: Dict[str, ProcessResult]):
        """检测治疗师冲突"""
        self._log("INFO", "治疗师冲突检测", "开始检测治疗师时间冲突")

        therapist_groups = defaultdict(list)
        for r in records:
            key = f"{r.therapist_id}|{r.appointment_date}"
            therapist_groups[key].append(r)

        conflict_count = 0
        for key, group in therapist_groups.items():
            if len(group) < 2:
                continue
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    r1, r2 = group[i], group[j]
                    if check_time_overlap(r1.start_time, r1.end_time,
                                          r2.start_time, r2.end_time,
                                          self.params.allowed_overlap_minutes):
                        conflict_desc = f"therapist:{r2.source_id}"
                        if conflict_desc not in results[r1.source_id].conflict_with:
                            results[r1.source_id].conflict_with.append(conflict_desc)
                        conflict_desc2 = f"therapist:{r1.source_id}"
                        if conflict_desc2 not in results[r2.source_id].conflict_with:
                            results[r2.source_id].conflict_with.append(conflict_desc2)
                        conflict_count += 1

        self._log("INFO", "治疗师冲突检测完成", f"发现 {conflict_count} 对治疗师冲突")

    def _detect_room_conflicts(self, records: List[AppointmentRecord],
                                results: Dict[str, ProcessResult]):
        """检测房间冲突"""
        self._log("INFO", "房间冲突检测", "开始检测房间时间冲突")

        room_groups = defaultdict(list)
        for r in records:
            key = f"{r.room}|{r.appointment_date}"
            room_groups[key].append(r)

        conflict_count = 0
        for key, group in room_groups.items():
            if len(group) < 2:
                continue
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    r1, r2 = group[i], group[j]
                    if check_time_overlap(r1.start_time, r1.end_time,
                                          r2.start_time, r2.end_time,
                                          self.params.allowed_overlap_minutes):
                        conflict_desc = f"room:{r2.source_id}"
                        if conflict_desc not in results[r1.source_id].conflict_with:
                            results[r1.source_id].conflict_with.append(conflict_desc)
                        conflict_desc2 = f"room:{r1.source_id}"
                        if conflict_desc2 not in results[r2.source_id].conflict_with:
                            results[r2.source_id].conflict_with.append(conflict_desc2)
                        conflict_count += 1

        self._log("INFO", "房间冲突检测完成", f"发现 {conflict_count} 对房间冲突")

    def _detect_patient_conflicts(self, records: List[AppointmentRecord],
                                   results: Dict[str, ProcessResult]):
        """检测患者冲突（同一患者同一时间不能有两个治疗）"""
        self._log("INFO", "患者冲突检测", "开始检测患者时间冲突")

        patient_groups = defaultdict(list)
        for r in records:
            key = f"{r.patient_id}|{r.appointment_date}"
            patient_groups[key].append(r)

        conflict_count = 0
        for key, group in patient_groups.items():
            if len(group) < 2:
                continue
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    r1, r2 = group[i], group[j]
                    if check_time_overlap(r1.start_time, r1.end_time,
                                          r2.start_time, r2.end_time,
                                          self.params.allowed_overlap_minutes):
                        conflict_desc = f"patient:{r2.source_id}"
                        if conflict_desc not in results[r1.source_id].conflict_with:
                            results[r1.source_id].conflict_with.append(conflict_desc)
                        conflict_desc2 = f"patient:{r1.source_id}"
                        if conflict_desc2 not in results[r2.source_id].conflict_with:
                            results[r2.source_id].conflict_with.append(conflict_desc2)
                        conflict_count += 1

        self._log("INFO", "患者冲突检测完成", f"发现 {conflict_count} 对患者冲突")


class IdempotencyManager:
    """幂等性管理器 - 确保同一数据重复执行不产生新差异"""

    def __init__(self, previous_results: Dict[str, ProcessResult],
                 batch_id: str):
        self.previous_results = previous_results
        self.batch_id = batch_id
        self.logs: List[LogEntry] = []

    def _log(self, level: str, action: str, message: str, details: str = ""):
        self.logs.append(LogEntry(
            timestamp=now_str(),
            level=level,
            batch_id=self.batch_id,
            action=action,
            message=message,
            details=details
        ))

    def compare(self, current_results: List[ProcessResult]) -> Tuple[List[DiffRecord], List[ProcessResult]]:
        """
        比较当前结果与上次结果，返回差异记录和最终结果
        幂等原则：数据未变化则沿用上次结果，不产生新差异
        """
        self._log("INFO", "幂等性校验", "开始与上次结果比对")

        diffs: List[DiffRecord] = []
        final_results: List[ProcessResult] = []

        current_map = {r.source_id: r for r in current_results}
        prev_ids = set(self.previous_results.keys())
        curr_ids = set(current_map.keys())

        new_ids = curr_ids - prev_ids
        removed_ids = prev_ids - curr_ids
        common_ids = curr_ids & prev_ids

        self._log("INFO", "差异统计",
                  f"新增 {len(new_ids)} 条，删除 {len(removed_ids)} 条，共有 {len(common_ids)} 条")

        for source_id in new_ids:
            diffs.append(DiffRecord(
                source_id=source_id,
                diff_type="新增",
                field_name="record",
                old_value="",
                new_value="新增记录",
                batch_id=self.batch_id
            ))
            final_results.append(current_map[source_id])
            self._log("INFO", "新增记录", f"记录 {source_id} 为新增记录")

        for source_id in removed_ids:
            diffs.append(DiffRecord(
                source_id=source_id,
                diff_type="删除",
                field_name="record",
                old_value="存在",
                new_value="",
                batch_id=self.batch_id
            ))
            prev = self.previous_results[source_id]
            prev.batch_id = self.batch_id
            prev.processed_at = now_str()
            final_results.append(prev)
            self._log("INFO", "删除记录", f"记录 {source_id} 已删除，沿用上次结果")

        for source_id in common_ids:
            curr = current_map[source_id]
            prev = self.previous_results[source_id]

            if curr.row_hash == prev.row_hash:
                prev.batch_id = self.batch_id
                prev.processed_at = now_str()
                final_results.append(prev)
                self._log("DEBUG", "数据未变", f"记录 {source_id} 数据未变化，沿用上次结果")
            else:
                diff_fields = self._compare_record_fields(curr, prev)
                for field_name, old_val, new_val in diff_fields:
                    diffs.append(DiffRecord(
                        source_id=source_id,
                        diff_type="修改",
                        field_name=field_name,
                        old_value=old_val,
                        new_value=new_val,
                        batch_id=self.batch_id
                    ))
                final_results.append(curr)
                self._log("INFO", "记录已修改",
                          f"记录 {source_id} 数据已变化",
                          f"变化字段: {', '.join([f[0] for f in diff_fields])}")

        self._log("INFO", "幂等性校验完成", f"共产生 {len(diffs)} 条差异")

        return diffs, final_results

    def _compare_record_fields(self, curr: ProcessResult,
                                prev: ProcessResult) -> List[Tuple[str, str, str]]:
        """比较两个结果的字段差异"""
        diffs = []

        if curr.status != prev.status:
            diffs.append(("status", prev.status, curr.status))
        if curr.risk_label != prev.risk_label:
            diffs.append(("risk_label", prev.risk_label, curr.risk_label))
        if "|".join(sorted(curr.conflict_with)) != "|".join(sorted(prev.conflict_with)):
            diffs.append(("conflict_with",
                          "|".join(sorted(prev.conflict_with)),
                          "|".join(sorted(curr.conflict_with))))
        if curr.error_message != prev.error_message:
            diffs.append(("error_message", prev.error_message, curr.error_message))

        return diffs


def build_summary(results: List[ProcessResult],
                  batch_id: str, operator: str) -> BatchSummary:
    """构建批次汇总"""
    summary = BatchSummary(
        batch_id=batch_id,
        total_count=len(results),
        operator=operator,
        processed_at=now_str()
    )

    for r in results:
        if r.status == "success":
            summary.success_count += 1
        elif r.status == "failed":
            summary.failed_count += 1
        elif r.status == "conflict":
            summary.conflict_count += 1
            summary.success_count += 1

        if r.risk_label == "高风险":
            summary.high_risk_count += 1
        elif r.risk_label == "中风险":
            summary.medium_risk_count += 1
        elif r.risk_label == "低风险":
            summary.low_risk_count += 1

    return summary
