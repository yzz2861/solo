import csv
import json
import os
from typing import List, Dict, Tuple
from .models import FHRRecord, SupplementRecord, ValidationRule


def read_main_list(file_path: str) -> List[FHRRecord]:
    records = []
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".csv":
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                record = _parse_fhr_record(row, file_path)
                records.append(record)
    elif ext == ".json":
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for row in data:
                record = _parse_fhr_record(row, file_path)
                records.append(record)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")

    return records


def _parse_fhr_record(row: Dict, source_file: str) -> FHRRecord:
    def get_val(key, default=None):
        return row.get(key) or row.get(key.lower()) or default

    record = FHRRecord(
        record_id=str(get_val("record_id", get_val("记录ID", ""))),
        patient_id=str(get_val("patient_id", get_val("患者ID", ""))),
        patient_name=str(get_val("patient_name", get_val("患者姓名", ""))),
        admission_no=str(get_val("admission_no", get_val("住院号", ""))),
        exam_time=str(get_val("exam_time", get_val("检查时间", ""))),
        source_file=os.path.basename(source_file),
    )

    fhr_baseline = get_val("fhr_baseline", get_val("胎心基线"))
    if fhr_baseline not in (None, "", "null", "NULL"):
        try:
            record.fhr_baseline = float(fhr_baseline)
        except (ValueError, TypeError):
            pass

    record.fhr_variability = str(
        get_val("fhr_variability", get_val("胎心变异", ""))
    ) if get_val("fhr_variability", get_val("胎心变异")) else None

    accel = get_val("acceleration_count", get_val("加速次数"))
    if accel not in (None, "", "null", "NULL"):
        try:
            record.acceleration_count = int(accel)
        except (ValueError, TypeError):
            pass

    decel = get_val("deceleration_count", get_val("减速次数"))
    if decel not in (None, "", "null", "NULL"):
        try:
            record.deceleration_count = int(decel)
        except (ValueError, TypeError):
            pass

    late = get_val("late_deceleration", get_val("晚期减速"))
    if late is not None and late != "":
        record.late_deceleration = str(late).lower() in ("true", "1", "yes", "是")

    var_dec = get_val("variable_deceleration", get_val("变异减速"))
    if var_dec is not None and var_dec != "":
        record.variable_deceleration = str(var_dec).lower() in ("true", "1", "yes", "是")

    duration = get_val("duration_minutes", get_val("监护时长"))
    if duration not in (None, "", "null", "NULL"):
        try:
            record.duration_minutes = float(duration)
        except (ValueError, TypeError):
            pass

    record.exam_doctor = str(
        get_val("exam_doctor", get_val("检查医生", ""))
    ) if get_val("exam_doctor", get_val("检查医生")) else None

    record.conclusion = str(
        get_val("conclusion", get_val("结论", ""))
    ) if get_val("conclusion", get_val("结论")) else None

    known_keys = {
        "record_id", "patient_id", "patient_name", "admission_no",
        "exam_time", "fhr_baseline", "fhr_variability", "acceleration_count",
        "deceleration_count", "late_deceleration", "variable_deceleration",
        "duration_minutes", "exam_doctor", "conclusion",
        "记录ID", "患者ID", "患者姓名", "住院号", "检查时间",
        "胎心基线", "胎心变异", "加速次数", "减速次数",
        "晚期减速", "变异减速", "监护时长", "检查医生", "结论"
    }
    for key, value in row.items():
        if key not in known_keys and key.lower() not in known_keys:
            record.extra[key] = value

    return record


def read_supplement(file_path: str) -> List[SupplementRecord]:
    records = []
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".csv":
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                record = _parse_supplement_record(row, file_path)
                records.append(record)
    elif ext == ".json":
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for row in data:
                record = _parse_supplement_record(row, file_path)
                records.append(record)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")

    return records


def _parse_supplement_record(row: Dict, source_file: str) -> SupplementRecord:
    def get_val(key, default=None):
        return row.get(key) or row.get(key.lower()) or default

    record = SupplementRecord(
        record_id=str(get_val("record_id", get_val("记录ID", ""))),
        source_file=os.path.basename(source_file),
    )

    age = get_val("maternal_age", get_val("孕妇年龄"))
    if age not in (None, "", "null", "NULL"):
        try:
            record.maternal_age = int(age)
        except (ValueError, TypeError):
            pass

    gw = get_val("gestational_weeks", get_val("孕周"))
    if gw not in (None, "", "null", "NULL"):
        try:
            record.gestational_weeks = float(gw)
        except (ValueError, TypeError):
            pass

    grav = get_val("gravidity", get_val("孕次"))
    if grav not in (None, "", "null", "NULL"):
        try:
            record.gravidity = int(grav)
        except (ValueError, TypeError):
            pass

    par = get_val("parity", get_val("产次"))
    if par not in (None, "", "null", "NULL"):
        try:
            record.parity = int(par)
        except (ValueError, TypeError):
            pass

    hrf = get_val("high_risk_factors", get_val("高危因素", ""))
    if hrf:
        if isinstance(hrf, list):
            record.high_risk_factors = [str(x) for x in hrf]
        elif isinstance(hrf, str):
            record.high_risk_factors = [x.strip() for x in hrf.split(";") if x.strip()]

    record.delivery_outcome = str(
        get_val("delivery_outcome", get_val("分娩结局", ""))
    ) if get_val("delivery_outcome", get_val("分娩结局")) else None

    apgar = get_val("apgar_score", get_val("Apgar评分", get_val("apgar")))
    if apgar not in (None, "", "null", "NULL"):
        try:
            record.apgar_score = int(apgar)
        except (ValueError, TypeError):
            pass

    known_keys = {
        "record_id", "maternal_age", "gestational_weeks", "gravidity",
        "parity", "high_risk_factors", "delivery_outcome", "apgar_score",
        "记录ID", "孕妇年龄", "孕周", "孕次", "产次",
        "高危因素", "分娩结局", "Apgar评分", "apgar"
    }
    for key, value in row.items():
        if key not in known_keys and key.lower() not in known_keys:
            record.extra[key] = value

    return record


def read_validation_rules(file_path: str) -> List[ValidationRule]:
    rules = []
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".csv":
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rule = _parse_validation_rule(row)
                if rule.enabled:
                    rules.append(rule)
    elif ext == ".json":
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for row in data:
                rule = _parse_validation_rule(row)
                if rule.enabled:
                    rules.append(rule)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")

    return rules


def _parse_validation_rule(row: Dict) -> ValidationRule:
    def get_val(key, default=None):
        return row.get(key) or row.get(key.lower()) or default

    enabled_val = get_val("enabled", get_val("是否启用", "true"))
    enabled = str(enabled_val).lower() in ("true", "1", "yes", "是")

    threshold = get_val("threshold", get_val("阈值", ""))
    threshold_type = str(get_val("threshold_type", get_val("阈值类型", "string"))).lower()
    operator = str(get_val("operator", get_val("操作符", "")))

    range_operators = {"between", "outside", "between_exclusive"}
    if operator in range_operators and isinstance(threshold, str):
        parts = [x.strip() for x in threshold.split(";") if x.strip()]
        if len(parts) == 2:
            if threshold_type in ("int", "integer", "数字", "整数"):
                try:
                    threshold = [int(parts[0]), int(parts[1])]
                except (ValueError, TypeError):
                    threshold = [0, 0]
            elif threshold_type in ("float", "number", "小数"):
                try:
                    threshold = [float(parts[0]), float(parts[1])]
                except (ValueError, TypeError):
                    threshold = [0.0, 0.0]
            else:
                threshold = parts
    elif threshold_type in ("int", "integer", "数字", "整数"):
        try:
            threshold = int(threshold)
        except (ValueError, TypeError):
            threshold = 0
    elif threshold_type in ("float", "number", "小数"):
        try:
            threshold = float(threshold)
        except (ValueError, TypeError):
            threshold = 0.0
    elif threshold_type in ("list", "array", "列表"):
        if isinstance(threshold, str):
            threshold = [x.strip() for x in threshold.split(";") if x.strip()]
        elif isinstance(threshold, list):
            threshold = [str(x) for x in threshold]

    return ValidationRule(
        rule_id=str(get_val("rule_id", get_val("规则ID", ""))),
        rule_name=str(get_val("rule_name", get_val("规则名称", ""))),
        field_name=str(get_val("field_name", get_val("字段名", ""))),
        rule_type=str(get_val("rule_type", get_val("规则类型", ""))),
        operator=str(get_val("operator", get_val("操作符", ""))),
        threshold=threshold,
        risk_level=str(get_val("risk_level", get_val("风险等级", "low"))),
        description=str(get_val("description", get_val("描述", ""))),
        enabled=enabled,
    )
