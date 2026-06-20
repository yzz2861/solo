from datetime import date, timedelta
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from .models import LeaveRecord, LeaveType, ClassSummary, SickAlert, Anomaly
from .config import SICK_ALERT_THRESHOLD, DEFAULT_CLASS_NAME


class StatisticsAnalyzer:
    def __init__(
        self,
        merged_records: List[LeaveRecord],
        anomalies: List[Anomaly],
        class_name: str = DEFAULT_CLASS_NAME,
    ):
        self.merged_records = merged_records
        self.anomalies = anomalies
        self.class_name = class_name

    def get_class_summary(self) -> ClassSummary:
        total_count = len(self.merged_records)
        sick_count = sum(1 for r in self.merged_records if r.leave_type == LeaveType.SICK)
        personal_count = sum(1 for r in self.merged_records if r.leave_type == LeaveType.PERSONAL)
        public_count = sum(1 for r in self.merged_records if r.leave_type == LeaveType.PUBLIC)
        other_count = sum(1 for r in self.merged_records if r.leave_type == LeaveType.OTHER)

        dates = set(r.record_date for r in self.merged_records)
        students = sorted(set(r.student_name for r in self.merged_records))

        return ClassSummary(
            class_name=self.class_name,
            total_days=len(dates),
            total_leave_count=total_count,
            sick_count=sick_count,
            personal_count=personal_count,
            public_count=public_count,
            other_count=other_count,
            anomaly_count=len(self.anomalies),
            students_with_leave=students,
        )

    def get_type_stats(self) -> Dict[str, Dict]:
        stats: Dict[str, Dict] = {
            LeaveType.SICK.value: {"count": 0, "students": set(), "dates": set()},
            LeaveType.PERSONAL.value: {"count": 0, "students": set(), "dates": set()},
            LeaveType.PUBLIC.value: {"count": 0, "students": set(), "dates": set()},
            LeaveType.OTHER.value: {"count": 0, "students": set(), "dates": set()},
        }

        for r in self.merged_records:
            t = r.leave_type.value
            if t not in stats:
                stats[t] = {"count": 0, "students": set(), "dates": set()}
            stats[t]["count"] += 1
            stats[t]["students"].add(r.student_name)
            stats[t]["dates"].add(r.record_date)

        result = {}
        for t, data in stats.items():
            result[t] = {
                "count": data["count"],
                "student_count": len(data["students"]),
                "student_names": sorted(data["students"]),
                "date_count": len(data["dates"]),
                "dates": sorted(data["dates"]),
            }
        return result

    def get_daily_stats(self) -> Dict[date, Dict]:
        daily: Dict[date, Dict] = defaultdict(lambda: {
            LeaveType.SICK.value: 0,
            LeaveType.PERSONAL.value: 0,
            LeaveType.PUBLIC.value: 0,
            LeaveType.OTHER.value: 0,
            "students": set(),
            "total": 0,
        })

        for r in self.merged_records:
            d = r.record_date
            daily[d][r.leave_type.value] += 1
            daily[d]["students"].add(r.student_name)
            daily[d]["total"] += 1

        result = {}
        for d, data in sorted(daily.items()):
            result[d] = {
                "total": data["total"],
                LeaveType.SICK.value: data[LeaveType.SICK.value],
                LeaveType.PERSONAL.value: data[LeaveType.PERSONAL.value],
                LeaveType.PUBLIC.value: data[LeaveType.PUBLIC.value],
                LeaveType.OTHER.value: data[LeaveType.OTHER.value],
                "student_count": len(data["students"]),
                "student_names": sorted(data["students"]),
            }
        return result

    def get_student_stats(self) -> Dict[str, Dict]:
        student_stats: Dict[str, Dict] = defaultdict(lambda: {
            LeaveType.SICK.value: 0,
            LeaveType.PERSONAL.value: 0,
            LeaveType.PUBLIC.value: 0,
            LeaveType.OTHER.value: 0,
            "total": 0,
            "dates": [],
            "records": [],
        })

        for r in self.merged_records:
            s = r.student_name
            student_stats[s][r.leave_type.value] += 1
            student_stats[s]["total"] += 1
            student_stats[s]["dates"].append((r.record_date, r.period, r.leave_type.value, r.reason))

        result = {}
        for s, data in sorted(student_stats.items()):
            result[s] = {
                "total": data["total"],
                LeaveType.SICK.value: data[LeaveType.SICK.value],
                LeaveType.PERSONAL.value: data[LeaveType.PERSONAL.value],
                LeaveType.PUBLIC.value: data[LeaveType.PUBLIC.value],
                LeaveType.OTHER.value: data[LeaveType.OTHER.value],
                "details": data["dates"],
            }
        return result

    def check_sick_alerts(
        self,
        threshold: Optional[int] = None,
        history_days: int = 7,
    ) -> List[SickAlert]:
        threshold = threshold or SICK_ALERT_THRESHOLD
        alerts: List[SickAlert] = []

        sick_by_date: Dict[date, List[LeaveRecord]] = defaultdict(list)
        for r in self.merged_records:
            if r.leave_type == LeaveType.SICK:
                sick_by_date[r.record_date].append(r)

        sorted_dates = sorted(sick_by_date.keys())

        for i, check_date in enumerate(sorted_dates):
            window_start = check_date - timedelta(days=history_days)
            window_sick_records: List[LeaveRecord] = []

            for d in sorted_dates:
                if window_start <= d <= check_date:
                    window_sick_records.extend(sick_by_date[d])

            window_students = list(set(r.student_name for r in window_sick_records))
            daily_count = len(sick_by_date[check_date])

            if daily_count >= threshold:
                daily_students = sorted(set(r.student_name for r in sick_by_date[check_date]))
                alerts.append(SickAlert(
                    date=check_date,
                    sick_count=daily_count,
                    threshold=threshold,
                    student_names=daily_students,
                    message=f"{check_date} 病假人数达到 {daily_count} 人（阈值 {threshold}），近{history_days}天共{len(window_students)}人生病，请校医关注！",
                ))

        return alerts

    def get_sick_list_for_doctor(self) -> List[Dict]:
        sick_records = [r for r in self.merged_records if r.leave_type == LeaveType.SICK]
        sick_records.sort(key=lambda r: (r.record_date, r.student_name))

        result = []
        for r in sick_records:
            result.append({
                "日期": r.record_date.strftime("%Y-%m-%d"),
                "姓名": r.student_name,
                "节次": r.period,
                "症状/原因": r.reason,
                "来源": r.source.value,
                "记录ID": r.record_id,
            })
        return result

    def print_summary(self):
        summary = self.get_class_summary()
        print("\n" + "=" * 60)
        print(f"【{self.class_name}】请假统计汇总")
        print("=" * 60)
        print(f"统计天数: {summary.total_days} 天")
        print(f"请假总人次: {summary.total_leave_count} 次")
        print(f"涉及学生: {len(summary.students_with_leave)} 人")
        print("-" * 60)
        type_stats = self.get_type_stats()
        for t in [LeaveType.SICK.value, LeaveType.PERSONAL.value, LeaveType.PUBLIC.value, LeaveType.OTHER.value]:
            if t in type_stats:
                data = type_stats[t]
                print(f"  {t}: {data['count']:>4d} 次 / {data['student_count']:>3d} 人")
        print("-" * 60)
        print(f"异常记录数: {summary.anomaly_count} 条")
        alerts = self.check_sick_alerts()
        if alerts:
            print(f"\n⚠️  病假异常警报: {len(alerts)} 条")
            for alert in alerts:
                print(f"   - {alert.message}")
        print("=" * 60)
