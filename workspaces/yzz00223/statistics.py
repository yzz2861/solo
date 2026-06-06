from typing import List, Dict
from datetime import datetime, timedelta
from collections import defaultdict

from models import (
    CalibrationRecord,
    ValidationResult,
    CalibrationStatus,
    StatisticsResult,
    TrendPoint,
    GroupDimension,
    ResponsibilityMapping,
)
from config import GROUP_DIMENSION_LABELS, STATUS_LABELS


class StatisticsAnalyzer:
    def __init__(
        self,
        records: List[CalibrationRecord],
        validation_results: Dict[str, ValidationResult],
        responsibility_map: Dict[str, ResponsibilityMapping],
        group_dimensions: List[GroupDimension],
        time_start: datetime,
        time_end: datetime,
    ):
        self.records = records
        self.validation_results = validation_results
        self.responsibility_map = responsibility_map
        self.group_dimensions = group_dimensions
        self.time_start = time_start
        self.time_end = time_end

    def compute_statistics(self) -> StatisticsResult:
        total = len(self.validation_results)
        compliant = 0
        over_threshold = 0
        missing_material = 0
        pending = 0
        closed_loop = 0

        for result in self.validation_results.values():
            if result.status == CalibrationStatus.COMPLIANT:
                compliant += 1
            elif result.status == CalibrationStatus.OVER_THRESHOLD:
                over_threshold += 1
            elif result.status == CalibrationStatus.MISSING_MATERIAL:
                missing_material += 1
            elif result.status == CalibrationStatus.PENDING_REVIEW:
                pending += 1
            if result.record_id in self._get_closed_loop_ids():
                closed_loop += 1

        compliance_rate = round(compliant / total * 100, 2) if total > 0 else 0.0

        group_stats = self._compute_group_stats()
        trend_points = self._compute_trend_points()
        top_abnormal = self._get_top_abnormal_stations()

        return StatisticsResult(
            total_records=total,
            compliant_count=compliant,
            over_threshold_count=over_threshold,
            missing_material_count=missing_material,
            pending_count=pending,
            closed_loop_count=closed_loop,
            compliance_rate=compliance_rate,
            group_stats=group_stats,
            trend_points=trend_points,
            top_abnormal_stations=top_abnormal,
        )

    def _compute_group_stats(self) -> Dict[str, Dict[str, int]]:
        stats: Dict[str, Dict[str, int]] = {}
        for dim in self.group_dimensions:
            dim_key = dim.value
            stats[dim_key] = defaultdict(int)
            for result in self.validation_results.values():
                record = self._find_record(result.record_id)
                if not record:
                    continue
                group_key = self._get_group_key(record, dim)
                stats[dim_key][group_key] += 1
            stats[dim_key] = dict(stats[dim_key])
        return stats

    def _compute_trend_points(self) -> List[TrendPoint]:
        points = []
        total_days = (self.time_end - self.time_start).days + 1
        if total_days <= 7:
            step_days = 1
            format_str = "%m-%d"
        elif total_days <= 30:
            step_days = 7
            format_str = "%m-%d"
        else:
            step_days = 30
            format_str = "%Y-%m"

        current = self.time_start
        while current <= self.time_end:
            window_end = current + timedelta(days=step_days - 1)
            if window_end > self.time_end:
                window_end = self.time_end

            total = 0
            compliant = 0
            over = 0
            missing = 0
            pending = 0

            for result in self.validation_results.values():
                record = self._find_record(result.record_id)
                if not record:
                    continue
                if current <= record.calibration_date <= window_end:
                    total += 1
                    if result.status == CalibrationStatus.COMPLIANT:
                        compliant += 1
                    elif result.status == CalibrationStatus.OVER_THRESHOLD:
                        over += 1
                    elif result.status == CalibrationStatus.MISSING_MATERIAL:
                        missing += 1
                    elif result.status == CalibrationStatus.PENDING_REVIEW:
                        pending += 1

            label = current.strftime(format_str)
            points.append(TrendPoint(
                time_label=label,
                total_count=total,
                compliant_count=compliant,
                over_threshold_count=over,
                missing_material_count=missing,
                pending_count=pending,
            ))
            current = window_end + timedelta(days=1)

        return points

    def _get_top_abnormal_stations(self, top_n: int = 5) -> List[Dict]:
        station_stats: Dict[str, Dict] = defaultdict(
            lambda: {"abnormal_count": 0, "total_count": 0, "station_name": ""}
        )
        for result in self.validation_results.values():
            record = self._find_record(result.record_id)
            if not record:
                continue
            station_stats[result.station_id]["total_count"] += 1
            station_stats[result.station_id]["station_name"] = record.station_name
            if result.status != CalibrationStatus.COMPLIANT:
                station_stats[result.station_id]["abnormal_count"] += 1

        sorted_stations = sorted(
            station_stats.items(),
            key=lambda x: x[1]["abnormal_count"],
            reverse=True,
        )

        result = []
        for station_id, stats in sorted_stations[:top_n]:
            if stats["abnormal_count"] > 0:
                result.append({
                    "station_id": station_id,
                    "station_name": stats["station_name"],
                    "abnormal_count": stats["abnormal_count"],
                    "total_count": stats["total_count"],
                    "abnormal_rate": round(
                        stats["abnormal_count"] / stats["total_count"] * 100, 2
                    ) if stats["total_count"] > 0 else 0,
                })
        return result

    def _find_record(self, record_id: str) -> CalibrationRecord:
        for r in self.records:
            if r.record_id == record_id:
                return r
        return None

    def _get_group_key(self, record: CalibrationRecord, dim: GroupDimension) -> str:
        if dim == GroupDimension.STATION:
            return f"{record.station_name}({record.station_id})"
        elif dim == GroupDimension.REGION:
            return record.region
        elif dim == GroupDimension.DEPARTMENT:
            return record.department
        elif dim == GroupDimension.CALIBRATION_TYPE:
            return record.calibration_type
        elif dim == GroupDimension.STATUS:
            result = self.validation_results.get(record.record_id)
            if result:
                return STATUS_LABELS.get(result.status.value, result.status.value)
            return "未知"
        return "未知"

    def _get_closed_loop_ids(self) -> set:
        return set()

    def generate_summary(self, stats: StatisticsResult) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("空气微站校准提醒 - 统计摘要")
        lines.append("=" * 60)
        lines.append(f"统计时间范围: {self.time_start.strftime('%Y-%m-%d')} 至 {self.time_end.strftime('%Y-%m-%d')}")
        lines.append(f"分组维度: {', '.join([GROUP_DIMENSION_LABELS.get(d.value, d.value) for d in self.group_dimensions])}")
        lines.append("-" * 60)
        lines.append(f"总记录数: {stats.total_records}")
        lines.append(f"合规数: {stats.compliant_count} ({stats.compliance_rate}%)")
        lines.append(f"超阈值: {stats.over_threshold_count}")
        lines.append(f"材料缺失: {stats.missing_material_count}")
        lines.append(f"待审核: {stats.pending_count}")
        lines.append(f"已闭环: {stats.closed_loop_count}")
        lines.append("-" * 60)
        lines.append("趋势摘要:")
        for tp in stats.trend_points:
            lines.append(
                f"  {tp.time_label}: 总计{tp.total_count} "
                f"(合规{tp.compliant_count}, "
                f"超阈值{tp.over_threshold_count}, "
                f"材料缺失{tp.missing_material_count})"
            )
        lines.append("-" * 60)
        if stats.top_abnormal_stations:
            lines.append("异常站点TOP5:")
            for i, s in enumerate(stats.top_abnormal_stations, 1):
                lines.append(
                    f"  {i}. {s['station_name']}: "
                    f"异常{s['abnormal_count']}次, "
                    f"异常率{s['abnormal_rate']}%"
                )
        lines.append("=" * 60)
        return "\n".join(lines)
