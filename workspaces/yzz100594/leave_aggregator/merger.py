from typing import List, Dict, Tuple, Set
from collections import defaultdict

from .models import LeaveRecord, SourceType, LeaveType, Anomaly, AnomalyType
from .utils import find_homonym_groups, get_name_pinyin


class RecordMerger:
    def __init__(self, records: List[LeaveRecord]):
        self.records = records
        self.merge_groups: Dict[Tuple, List[LeaveRecord]] = defaultdict(list)
        self.merged: List[LeaveRecord] = []
        self._merge_duplicates()

    def _merge_duplicates(self):
        for record in self.records:
            key = record.merge_key()
            self.merge_groups[key].append(record)

    def get_merged_records(self) -> List[LeaveRecord]:
        if self.merged:
            return self.merged

        for key, group in self.merge_groups.items():
            if len(group) == 1:
                self.merged.append(group[0])
                continue

            primary = self._select_primary(group)
            merged_reasons = self._merge_reasons(group)
            merged_sources = ",".join(sorted(set(r.source.value for r in group)))

            primary.reason = merged_reasons
            primary.raw_content = self._build_raw_content(group)
            primary.record_id = "MERGED-" + primary.record_id.split("-", 1)[-1]

            self.merged.append(primary)

        self.merged.sort(key=lambda r: (r.record_date, r.student_name, r.period))
        return self.merged

    def _select_primary(self, group: List[LeaveRecord]) -> LeaveRecord:
        priority = {SourceType.PAPER: 3, SourceType.SMS: 2, SourceType.ABSENCE: 1}
        group_sorted = sorted(group, key=lambda r: (priority.get(r.source, 0), -len(r.reason)))
        return group_sorted[-1]

    def _merge_reasons(self, group: List[LeaveRecord]) -> str:
        reasons = set()
        for r in group:
            if r.reason and r.reason != "未说明" and r.reason != "未填写":
                reasons.add(r.reason)
        if reasons:
            return " / ".join(sorted(reasons))
        return group[0].reason if group else "未说明"

    def _build_raw_content(self, group: List[LeaveRecord]) -> str:
        parts = []
        for r in group:
            parts.append(f"[{r.source.value}] {r.reason} (ID:{r.record_id})")
        return " | ".join(parts)

    def get_duplicate_groups(self) -> List[List[LeaveRecord]]:
        return [g for g in self.merge_groups.values() if len(g) > 1]


class LeaveClassifier:
    def __init__(self, records: List[LeaveRecord]):
        self.records = records

    def classify(self) -> Dict[str, List[LeaveRecord]]:
        result = {
            "leaves": [],
            "absences_only": [],
            "conflicts": [],
        }

        grouped: Dict[Tuple, List[LeaveRecord]] = defaultdict(list)
        for r in self.records:
            grouped[r.merge_key()].append(r)

        for key, group in grouped.items():
            sources = set(r.source for r in group)

            has_absence = SourceType.ABSENCE in sources
            has_letter = (SourceType.PAPER in sources) or (SourceType.SMS in sources)

            if has_absence and not has_letter:
                result["absences_only"].extend(group)
            elif has_absence and has_letter:
                result["conflicts"].extend(group)
                result["leaves"].extend(group)
            else:
                result["leaves"].extend(group)

        return result


class AnomalyDetector:
    def __init__(self, all_records: List[LeaveRecord], merged_records: List[LeaveRecord]):
        self.all_records = all_records
        self.merged_records = merged_records
        self.anomalies: List[Anomaly] = []

    def detect_all(self) -> List[Anomaly]:
        self.anomalies = []
        self._detect_homonyms()
        self._detect_half_day_conflicts()
        self._detect_type_conflicts()
        self._detect_absences_without_letter()
        self._detect_duplicates()
        return self.anomalies

    def _detect_homonyms(self):
        names = list(set(r.student_name for r in self.merged_records))
        homonym_groups = find_homonym_groups(names)

        for group in homonym_groups:
            related = [r for r in self.all_records if r.student_name in group]
            pinyins = {n: get_name_pinyin(n) for n in group}
            desc = f"姓名可能同音: {', '.join(f'{n}({pinyins[n]})' for n in group)}"
            self.anomalies.append(Anomaly(
                anomaly_type=AnomalyType.HOMONYM,
                description=desc,
                related_records=related,
                severity="warning",
                suggestions="请核对以上姓名是否为同一人，确认后可合并处理",
            ))

    def _detect_half_day_conflicts(self):
        grouped: Dict[Tuple, List[LeaveRecord]] = defaultdict(list)
        for r in self.all_records:
            key = (r.student_name, r.record_date)
            grouped[key].append(r)

        for key, records in grouped.items():
            periods = set(r.period for r in records)
            if len(periods) > 1:
                has_full_day = any(p == "全天" for p in periods)
                has_half = any(p in ["上午", "下午"] for p in periods)
                has_specific = any(p.startswith("第") for p in periods)

                if (has_full_day and has_half) or (has_full_day and has_specific):
                    student, date_val = key
                    desc = f"{student}({date_val}) 半天/全天/节次记录冲突: {', '.join(sorted(periods))}"
                    self.anomalies.append(Anomaly(
                        anomaly_type=AnomalyType.HALF_DAY,
                        description=desc,
                        related_records=records,
                        severity="warning",
                        suggestions="请确认请假时段：全天假覆盖上午和下午，具体节次需要单独核实",
                    ))

    def _detect_type_conflicts(self):
        grouped: Dict[Tuple, List[LeaveRecord]] = defaultdict(list)
        for r in self.all_records:
            key = r.merge_key()
            grouped[key].append(r)

        for key, records in grouped.items():
            leave_records = [r for r in records if r.source != SourceType.ABSENCE]
            if len(leave_records) < 2:
                continue

            types = set(r.leave_type for r in leave_records)
            if len(types) <= 1:
                continue

            has_sick = LeaveType.SICK in types
            has_personal = LeaveType.PERSONAL in types

            if has_sick and has_personal:
                student, date_val, period = key
                type_names = " vs ".join(sorted(t.value for t in types))
                sources = ", ".join(sorted(set(r.source.value for r in leave_records)))
                desc = f"{student}({date_val} {period}) 病假转事假冲突: {type_names} [来源:{sources}]"
                self.anomalies.append(Anomaly(
                    anomaly_type=AnomalyType.TYPE_CONFLICT,
                    description=desc,
                    related_records=records,
                    severity="error",
                    suggestions="病假转事假需家长补充说明，以请假条或最后确认的消息为准，联系家长核实",
                ))
            else:
                student, date_val, period = key
                type_names = " vs ".join(sorted(t.value for t in types))
                sources = ", ".join(sorted(set(r.source.value for r in leave_records)))
                desc = f"{student}({date_val} {period}) 请假类型不一致: {type_names} [来源:{sources}]"
                self.anomalies.append(Anomaly(
                    anomaly_type=AnomalyType.TYPE_MISMATCH,
                    description=desc,
                    related_records=records,
                    severity="warning",
                    suggestions="不同来源记录类型不同，以纸质请假条或班主任确认为准",
                ))

    def _detect_absences_without_letter(self):
        grouped: Dict[Tuple, List[LeaveRecord]] = defaultdict(list)
        for r in self.all_records:
            grouped[r.merge_key()].append(r)

        for key, records in grouped.items():
            sources = set(r.source for r in records)
            if SourceType.ABSENCE in sources and SourceType.PAPER not in sources and SourceType.SMS not in sources:
                student, date_val, period = key
                desc = f"{student}({date_val} {period}) 缺勤但无请假条/短信记录"
                self.anomalies.append(Anomaly(
                    anomaly_type=AnomalyType.NO_LETTER,
                    description=desc,
                    related_records=records,
                    severity="error",
                    suggestions="立即联系家长了解情况，补填请假条并说明原因，必要时上报年级组",
                ))

    def _detect_duplicates(self):
        grouped: Dict[Tuple, List[LeaveRecord]] = defaultdict(list)
        for r in self.all_records:
            grouped[r.detail_key()].append(r)

        for key, records in grouped.items():
            if len(records) > 1:
                student, date_val, period, type_val, reason = key
                sources = ", ".join(sorted(set(r.source.value for r in records)))
                desc = f"{student}({date_val} {period}) 存在{len(records)}条重复记录 [来源:{sources}]"
                self.anomalies.append(Anomaly(
                    anomaly_type=AnomalyType.DUPLICATE,
                    description=desc,
                    related_records=records,
                    severity="info",
                    suggestions="不同来源记录一致，已自动合并处理，无需额外操作",
                ))
