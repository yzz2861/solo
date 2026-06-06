from typing import List, Dict, Tuple
from .models import FHRRecord, SupplementRecord, ValidationRule, ValidationResult


class ValidationEngine:
    def __init__(self, rules: List[ValidationRule]):
        self.rules = rules
        self.enabled_rules = [r for r in rules if r.enabled]

    def validate_record(
        self,
        record: FHRRecord,
        supplement: SupplementRecord = None
    ) -> List[ValidationResult]:
        results = []
        record_data = self._flatten_record(record, supplement)

        for rule in self.enabled_rules:
            result = self._apply_rule(rule, record, record_data)
            results.append(result)

        return results

    def validate_all(
        self,
        records: List[FHRRecord],
        supplements: List[SupplementRecord] = None
    ) -> Dict[str, List[ValidationResult]]:
        sup_map = {}
        if supplements:
            for s in supplements:
                sup_map[s.record_id] = s

        all_results = {}
        for record in records:
            sup = sup_map.get(record.record_id)
            results = self.validate_record(record, sup)
            all_results[record.record_id] = results

        return all_results

    def _flatten_record(
        self,
        record: FHRRecord,
        supplement: SupplementRecord = None
    ) -> Dict:
        data = {
            "record_id": record.record_id,
            "patient_id": record.patient_id,
            "patient_name": record.patient_name,
            "admission_no": record.admission_no,
            "exam_time": record.exam_time,
            "fhr_baseline": record.fhr_baseline,
            "fhr_variability": record.fhr_variability,
            "acceleration_count": record.acceleration_count,
            "deceleration_count": record.deceleration_count,
            "late_deceleration": record.late_deceleration,
            "variable_deceleration": record.variable_deceleration,
            "duration_minutes": record.duration_minutes,
            "exam_doctor": record.exam_doctor,
            "conclusion": record.conclusion,
        }

        if supplement:
            data.update({
                "maternal_age": supplement.maternal_age,
                "gestational_weeks": supplement.gestational_weeks,
                "gravidity": supplement.gravidity,
                "parity": supplement.parity,
                "high_risk_factors": supplement.high_risk_factors,
                "delivery_outcome": supplement.delivery_outcome,
                "apgar_score": supplement.apgar_score,
                "has_supplement": True,
            })
        else:
            data["has_supplement"] = False

        data.update(record.extra)
        if supplement:
            data.update(supplement.extra)

        return data

    def _apply_rule(
        self,
        rule: ValidationRule,
        record: FHRRecord,
        record_data: Dict
    ) -> ValidationResult:
        field_value = record_data.get(rule.field_name)

        if rule.rule_type == "required":
            passed = field_value is not None and field_value != ""
            message = "字段存在" if passed else f"缺少必填字段: {rule.field_name}"
            return ValidationResult(
                record_id=record.record_id,
                rule_id=rule.rule_id,
                rule_name=rule.rule_name,
                passed=passed,
                risk_level=rule.risk_level,
                message=message,
                field_name=rule.field_name,
                actual_value=field_value,
            )

        if field_value is None or field_value == "":
            return ValidationResult(
                record_id=record.record_id,
                rule_id=rule.rule_id,
                rule_name=rule.rule_name,
                passed=True,
                risk_level=rule.risk_level,
                message=f"字段 {rule.field_name} 为空，跳过校验",
                field_name=rule.field_name,
                actual_value=field_value,
            )

        condition_met = False
        message = ""

        if rule.rule_type == "range":
            condition_met = self._check_range(rule.operator, field_value, rule.threshold)
            passed = not condition_met
            if condition_met:
                message = f"检测到{rule.rule_name}: {rule.field_name}={field_value} (阈值: {rule.threshold})"
            else:
                message = f"{rule.field_name}={field_value} 正常"

        elif rule.rule_type == "enum":
            condition_met = self._check_enum(rule.operator, field_value, rule.threshold)
            passed = not condition_met
            if condition_met:
                message = f"检测到{rule.rule_name}: {rule.field_name}={field_value}"
            else:
                message = f"{rule.field_name}={field_value} 正常"

        elif rule.rule_type == "boolean":
            condition_met = self._check_boolean(field_value, rule.operator, rule.threshold)
            passed = not condition_met
            if condition_met:
                message = f"检测到{rule.rule_name}: {rule.field_name}={field_value}"
            else:
                message = f"{rule.field_name}={field_value} 正常"

        elif rule.rule_type == "count":
            condition_met = self._check_count(rule.operator, field_value, rule.threshold)
            passed = not condition_met
            if condition_met:
                message = f"检测到{rule.rule_name}: 计数={field_value} (阈值: {rule.threshold})"
            else:
                message = f"{rule.field_name} 计数正常"

        elif rule.rule_type == "custom":
            condition_met = False
            passed = True
            message = f"自定义规则: {rule.description}"

        else:
            condition_met = False
            passed = True
            message = f"未知规则类型: {rule.rule_type}，默认通过"

        return ValidationResult(
            record_id=record.record_id,
            rule_id=rule.rule_id,
            rule_name=rule.rule_name,
            passed=passed,
            risk_level=rule.risk_level,
            message=message,
            field_name=rule.field_name,
            actual_value=field_value,
        )

    def _check_range(self, operator: str, value, threshold) -> bool:
        try:
            val = float(value)
        except (ValueError, TypeError):
            return False

        if isinstance(threshold, (list, tuple)) and len(threshold) == 2:
            low, high = float(threshold[0]), float(threshold[1])
            if operator == "between":
                return low <= val <= high
            elif operator == "outside":
                return val < low or val > high
            elif operator == "between_exclusive":
                return low < val < high
            else:
                return low <= val <= high

        try:
            th = float(threshold)
        except (ValueError, TypeError):
            return True

        ops = {
            ">": lambda v, t: v > t,
            ">=": lambda v, t: v >= t,
            "<": lambda v, t: v < t,
            "<=": lambda v, t: v <= t,
            "==": lambda v, t: v == t,
            "!=": lambda v, t: v != t,
        }

        check = ops.get(operator)
        if check:
            return check(val, th)

        return True

    def _check_enum(self, operator: str, value, threshold) -> bool:
        if isinstance(threshold, (list, tuple)):
            in_list = str(value) in [str(x) for x in threshold]
        else:
            in_list = str(value) == str(threshold)

        if operator in ("not_in", "!="):
            return not in_list
        else:
            return in_list

    def _check_boolean(self, value, operator: str, threshold) -> bool:
        if isinstance(value, bool):
            val = value
        else:
            val = str(value).lower() in ("true", "1", "yes", "是")

        if isinstance(threshold, bool):
            th = threshold
        else:
            th = str(threshold).lower() in ("true", "1", "yes", "是")

        if operator == "==":
            return val == th
        elif operator == "!=":
            return val != th

        return not val if th else val

    def _check_count(self, operator: str, value, threshold) -> bool:
        if isinstance(value, (list, tuple)):
            count = len(value)
        else:
            try:
                count = int(value)
            except (ValueError, TypeError):
                return False

        try:
            th = int(threshold)
        except (ValueError, TypeError):
            return True

        ops = {
            ">": lambda c, t: c > t,
            ">=": lambda c, t: c >= t,
            "<": lambda c, t: c < t,
            "<=": lambda c, t: c <= t,
            "==": lambda c, t: c == t,
        }

        check = ops.get(operator)
        if check:
            return check(count, th)

        return True


def aggregate_risk(results: List[ValidationResult]) -> Tuple[str, List[str]]:
    failed = [r for r in results if not r.passed]

    if not failed:
        return "normal", []

    risk_tags = []
    highest_level = "normal"

    level_order = {"critical": 4, "high": 3, "medium": 2, "low": 1, "normal": 0}

    for r in failed:
        risk_tags.append(r.rule_name)
        if level_order.get(r.risk_level, 0) > level_order.get(highest_level, 0):
            highest_level = r.risk_level

    return highest_level, list(set(risk_tags))


def needs_review(results: List[ValidationResult]) -> Tuple[bool, str]:
    failed = [r for r in results if not r.passed]

    if not failed:
        return False, ""

    high_risk = [r for r in failed if r.risk_level in ("critical", "high")]
    if high_risk:
        reasons = "; ".join([r.rule_name for r in high_risk])
        return True, f"高风险规则未通过: {reasons}"

    medium_count = len([r for r in failed if r.risk_level == "medium"])
    if medium_count >= 2:
        return True, f"存在 {medium_count} 项中风险问题"

    return False, ""
