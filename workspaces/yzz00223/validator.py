from typing import List, Dict, Tuple
from datetime import datetime, timedelta
from models import (
    CalibrationRecord,
    CalibrationStatus,
    ValidationResult,
    ThresholdHit,
    ResponsibilityMapping,
    GroupDimension,
)
from config import (
    THRESHOLD_CONFIG,
    REQUIRED_MATERIALS,
    MATERIAL_NAMES,
    DEFAULT_TIME_WINDOW_DAYS,
    GROUP_DIMENSION_LABELS,
)


def check_thresholds(parameters: Dict[str, float]) -> List[ThresholdHit]:
    hits = []
    for param_key, measured_value in parameters.items():
        if param_key not in THRESHOLD_CONFIG:
            continue
        config = THRESHOLD_CONFIG[param_key]
        upper = config["upper"]
        lower = config["lower"]
        unit = config["unit"]

        if measured_value > upper:
            exceed_ratio = (measured_value - upper) / upper * 100
            hits.append(
                ThresholdHit(
                    parameter=param_key,
                    measured_value=measured_value,
                    threshold_value=upper,
                    unit=unit,
                    exceed_ratio=round(exceed_ratio, 2),
                    is_upper=True,
                )
            )
        elif measured_value < lower:
            exceed_ratio = (lower - measured_value) / lower * 100 if lower > 0 else 0
            hits.append(
                ThresholdHit(
                    parameter=param_key,
                    measured_value=measured_value,
                    threshold_value=lower,
                    unit=unit,
                    exceed_ratio=round(exceed_ratio, 2),
                    is_upper=False,
                )
            )
    return hits


def check_materials(materials: Dict[str, bool]) -> List[str]:
    missing = []
    for mat in REQUIRED_MATERIALS:
        if not materials.get(mat, False):
            missing.append(mat)
    return missing


def explain_time_window(
    record_date: datetime,
    time_start: datetime,
    time_end: datetime,
    window_days: int = DEFAULT_TIME_WINDOW_DAYS,
) -> str:
    days_from_start = (record_date - time_start).days
    days_from_end = (time_end - record_date).days
    return (
        f"记录日期 {record_date.strftime('%Y-%m-%d')} 位于时间窗口 "
        f"[{time_start.strftime('%Y-%m-%d')}, {time_end.strftime('%Y-%m-%d')}] 内，"
        f"距窗口起点 {days_from_start} 天，距窗口终点 {days_from_end} 天，"
        f"窗口长度 {window_days} 天"
    )


def explain_group_dimension(
    record: CalibrationRecord,
    dimensions: List[GroupDimension],
) -> str:
    dim_parts = []
    for dim in dimensions:
        if dim == GroupDimension.STATION:
            dim_parts.append(f"站点: {record.station_name}({record.station_id})")
        elif dim == GroupDimension.REGION:
            dim_parts.append(f"区域: {record.region}")
        elif dim == GroupDimension.DEPARTMENT:
            dim_parts.append(f"部门: {record.department}")
        elif dim == GroupDimension.CALIBRATION_TYPE:
            dim_parts.append(f"校准类型: {record.calibration_type}")
        elif dim == GroupDimension.STATUS:
            dim_parts.append("状态: 待计算")
    return f"分组维度[{', '.join(dim_parts)}]"


def validate_record(
    record: CalibrationRecord,
    responsibility_map: Dict[str, ResponsibilityMapping],
    time_start: datetime,
    time_end: datetime,
    group_dimensions: List[GroupDimension],
    window_days: int = DEFAULT_TIME_WINDOW_DAYS,
) -> ValidationResult:
    threshold_hits = check_thresholds(record.parameters)
    missing_materials = check_materials(record.materials)

    reasons = []
    status = CalibrationStatus.COMPLIANT
    is_valid = True

    if threshold_hits:
        status = CalibrationStatus.OVER_THRESHOLD
        is_valid = False
        for hit in threshold_hits:
            direction = "上限" if hit.is_upper else "下限"
            param_name = THRESHOLD_CONFIG[hit.parameter]["name"]
            reasons.append(
                f"{param_name}测量值 {hit.measured_value}{hit.unit} "
                f"超过{direction}阈值 {hit.threshold_value}{hit.unit}，"
                f"超出比例 {hit.exceed_ratio}%"
            )

    if missing_materials:
        if status == CalibrationStatus.COMPLIANT:
            status = CalibrationStatus.MISSING_MATERIAL
        else:
            status = CalibrationStatus.PENDING_REVIEW
        is_valid = False
        for mat in missing_materials:
            reasons.append(f"缺少校准材料: {MATERIAL_NAMES.get(mat, mat)}")

    if not reasons:
        reasons.append("所有参数均在阈值范围内，校准材料齐全")

    time_explanation = explain_time_window(
        record.calibration_date, time_start, time_end, window_days
    )

    dimension_explanation = explain_group_dimension(record, group_dimensions)

    return ValidationResult(
        record_id=record.record_id,
        station_id=record.station_id,
        is_valid=is_valid,
        status=status,
        threshold_hits=threshold_hits,
        missing_materials=missing_materials,
        reasons=reasons,
        time_window_explanation=time_explanation,
        dimension_explanation=dimension_explanation,
    )


def validate_records(
    records: List[CalibrationRecord],
    responsibility_map: Dict[str, ResponsibilityMapping],
    time_start: datetime,
    time_end: datetime,
    group_dimensions: List[GroupDimension],
    window_days: int = DEFAULT_TIME_WINDOW_DAYS,
) -> Dict[str, ValidationResult]:
    results = {}
    for record in records:
        result = validate_record(
            record,
            responsibility_map,
            time_start,
            time_end,
            group_dimensions,
            window_days,
        )
        results[record.record_id] = result
    return results


def filter_records_by_time(
    records: List[CalibrationRecord],
    time_start: datetime,
    time_end: datetime,
) -> List[CalibrationRecord]:
    return [
        r for r in records
        if time_start <= r.calibration_date <= time_end
    ]
