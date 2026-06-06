from typing import List, Dict
from .models import (
    BikeRecord, AssessmentResult, RiskLevel, CheckStatus, RuleConfig
)
from .snapshot import build_history_trace


def assess_records(
    records: List[BikeRecord],
    rule_config: RuleConfig,
    snapshot_map: Dict[str, BikeRecord],
    batch_id: str,
    source: str,
) -> List[AssessmentResult]:
    results: List[AssessmentResult] = []

    for record in records:
        result = _assess_single_record(
            record, rule_config, snapshot_map, batch_id, source
        )
        results.append(result)

    return results


def _assess_single_record(
    record: BikeRecord,
    rule_config: RuleConfig,
    snapshot_map: Dict[str, BikeRecord],
    batch_id: str,
    source: str,
) -> AssessmentResult:
    risk_level, reason = _determine_risk(record, rule_config)
    check_status = _determine_check_status(risk_level)
    export_result = _determine_export_result(risk_level)
    history_trace = build_history_trace(record.bike_id, snapshot_map)

    return AssessmentResult(
        bike_id=record.bike_id,
        station_id=record.station_id,
        station_name=record.station_name,
        risk_level=risk_level,
        check_status=check_status,
        reason=reason,
        export_result=export_result,
        history_trace=history_trace,
        source=source,
        batch_id=batch_id,
        raw_record=record,
    )


def _determine_risk(
    record: BikeRecord,
    rule_config: RuleConfig,
) -> tuple[RiskLevel, str]:
    if record.capacity <= 0:
        return RiskLevel.UNKNOWN, "站点容量为0或无效，无法判定风险等级"

    occupancy = record.occupancy_rate

    if occupancy >= rule_config.occupancy_rate_high:
        if record.capacity >= rule_config.station_capacity_medium:
            return (
                RiskLevel.HIGH,
                f"高淤积风险: 停放量{record.parking_count}/{record.capacity}，"
                f"占比{occupancy:.1%}，超过高风险阈值"
            )
        else:
            return (
                RiskLevel.MEDIUM,
                f"中淤积风险: 小站点停放量{record.parking_count}/{record.capacity}，"
                f"占比{occupancy:.1%}，容量不足但站点规模较小"
            )

    if occupancy >= rule_config.occupancy_rate_medium:
        if record.capacity >= rule_config.station_capacity_medium:
            return (
                RiskLevel.MEDIUM,
                f"中淤积风险: 停放量{record.parking_count}/{record.capacity}，"
                f"占比{occupancy:.1%}，接近高风险阈值"
            )
        else:
            return (
                RiskLevel.LOW,
                f"低淤积风险: 小站点停放量{record.parking_count}/{record.capacity}，"
                f"占比{occupancy:.1%}，在可控范围内"
            )

    if record.parking_count == 0:
        return (
            RiskLevel.LOW,
            f"低风险: 站点无车辆停放，不存在淤积问题"
        )

    return (
        RiskLevel.LOW,
        f"低淤积风险: 停放量{record.parking_count}/{record.capacity}，"
        f"占比{occupancy:.1%}，在正常范围内"
    )


def _determine_check_status(risk_level: RiskLevel) -> CheckStatus:
    if risk_level == RiskLevel.HIGH:
        return CheckStatus.FAIL
    if risk_level == RiskLevel.UNKNOWN:
        return CheckStatus.PENDING
    return CheckStatus.PASS


def _determine_export_result(risk_level: RiskLevel) -> str:
    if risk_level == RiskLevel.HIGH:
        return "需立即清运"
    if risk_level == RiskLevel.MEDIUM:
        return "建议清运"
    if risk_level == RiskLevel.LOW:
        return "无需清运"
    return "待人工确认"


def summarize_assessments(
    results: List[AssessmentResult],
) -> Dict[RiskLevel, int]:
    summary: Dict[RiskLevel, int] = {
        RiskLevel.LOW: 0,
        RiskLevel.MEDIUM: 0,
        RiskLevel.HIGH: 0,
        RiskLevel.UNKNOWN: 0,
    }
    for r in results:
        summary[r.risk_level] = summary.get(r.risk_level, 0) + 1
    return summary
