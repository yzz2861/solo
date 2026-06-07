from typing import List, Dict, Tuple
from datetime import datetime
from .models import ValveRecord, RecordStatus, ExceptionType, ProcessConfig


def validate_records(records: List[ValveRecord], config: ProcessConfig) -> Tuple[List[ValveRecord], List[ValveRecord]]:
    passed = []
    exceptions = []
    
    seen_ids = set()
    
    for record in records:
        record.status = RecordStatus.PASSED
        record.exception_types = []
        record.exception_reasons = []
        
        _check_duplicate(record, seen_ids)
        _check_date_valid(record)
        _check_date_range(record, config)
        _check_pressure_threshold(record, config)
        _check_material(record, config)
        
        if record.exception_types:
            record.status = RecordStatus.EXCEPTION
            exceptions.append(record)
        else:
            passed.append(record)
    
    return passed, exceptions


def _check_duplicate(record: ValveRecord, seen_ids: set):
    key = (record.valve_id, record.operation_date.strftime("%Y%m%d") if record.operation_date else "nodate")
    if key in seen_ids:
        record.exception_types.append(ExceptionType.DUPLICATE)
        record.exception_reasons.append(f"重复记录: 阀门 {record.valve_id} 同一日期重复操作")
    else:
        seen_ids.add(key)


def _check_date_valid(record: ValveRecord):
    if not record.operation_date:
        record.exception_types.append(ExceptionType.INVALID_DATE)
        record.exception_reasons.append("操作日期为空或格式无效")


def _check_date_range(record: ValveRecord, config: ProcessConfig):
    if not record.operation_date:
        return
    
    if config.date_start and record.operation_date < config.date_start:
        record.exception_types.append(ExceptionType.DATE_OUT_OF_RANGE)
        record.exception_reasons.append(
            f"操作日期 {record.operation_date.strftime('%Y-%m-%d')} 早于起始日期 {config.date_start.strftime('%Y-%m-%d')}"
        )
    
    if config.date_end and record.operation_date > config.date_end:
        record.exception_types.append(ExceptionType.DATE_OUT_OF_RANGE)
        record.exception_reasons.append(
            f"操作日期 {record.operation_date.strftime('%Y-%m-%d')} 晚于结束日期 {config.date_end.strftime('%Y-%m-%d')}"
        )


def _check_pressure_threshold(record: ValveRecord, config: ProcessConfig):
    pressure_change = abs(record.pressure_after - record.pressure_before)
    if pressure_change > config.pressure_threshold:
        record.exception_types.append(ExceptionType.OVER_THRESHOLD)
        record.exception_reasons.append(
            f"压力变化 {pressure_change:.2f} MPa 超过阈值 {config.pressure_threshold} MPa"
        )


def _check_material(record: ValveRecord, config: ProcessConfig):
    if config.require_material and not record.material:
        record.exception_types.append(ExceptionType.MISSING_MATERIAL)
        record.exception_reasons.append("材料字段缺失")


def mark_bad_records(bad_rows: List[Dict]) -> List[Dict]:
    for row in bad_rows:
        row["status"] = RecordStatus.BAD.value
    return bad_rows


def build_exception_breakdown(exception_records: List[ValveRecord], bad_rows: List[Dict]) -> Dict[str, int]:
    breakdown = {}
    
    for record in exception_records:
        for exc_type in record.exception_types:
            key = exc_type.value
            breakdown[key] = breakdown.get(key, 0) + 1
    
    if bad_rows:
        breakdown[RecordStatus.BAD.value] = len(bad_rows)
    
    return breakdown


def detect_history_replay(new_records: List[ValveRecord], history_records: List[ValveRecord]) -> List[ValveRecord]:
    history_keys = set()
    for h in history_records:
        key = (h.valve_id, h.operation_date.strftime("%Y%m%d%H%M%S") if h.operation_date else "", h.operation_type)
        history_keys.add(key)
    
    replay_records = []
    for record in new_records:
        key = (record.valve_id, record.operation_date.strftime("%Y%m%d%H%M%S") if record.operation_date else "", record.operation_type)
        if key in history_keys:
            record.exception_types.append(ExceptionType.HISTORY_REPLAY)
            record.exception_reasons.append("历史回放：该操作记录已在历史数据中存在")
            record.status = RecordStatus.EXCEPTION
            replay_records.append(record)
    
    return replay_records
