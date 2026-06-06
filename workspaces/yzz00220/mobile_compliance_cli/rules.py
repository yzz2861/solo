import yaml
from pathlib import Path


class RuleEngine:
    def __init__(self, rule_file):
        self.rule_file = Path(rule_file)
        self.rules = []
        self.required_fields = set()
        self.duplicate_keys = []
        self._load_rules()

    def _load_rules(self):
        if not self.rule_file.exists():
            raise FileNotFoundError(f"规则文件不存在: {self.rule_file}")

        with open(self.rule_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

        self.required_fields = set(config.get("required_fields", []))
        self.duplicate_keys = config.get("duplicate_keys", [])
        self.rules = config.get("rules", [])

        for rule in self.rules:
            if "field" not in rule or "condition" not in rule:
                raise ValueError(f"规则配置不完整: {rule}")

    def check_missing_fields(self, record):
        missing = []
        for field in self.required_fields:
            val = record.get(field)
            if val is None or str(val).strip() == "":
                missing.append(field)
        return missing

    def is_duplicate(self, record, seen_keys):
        if not self.duplicate_keys:
            return False, None

        key_parts = []
        for k in self.duplicate_keys:
            key_parts.append(str(record.get(k, "")))
        dup_key = "|".join(key_parts)

        if dup_key in seen_keys:
            return True, dup_key
        seen_keys.add(dup_key)
        return False, dup_key

    def apply_rules(self, record):
        matched = []
        for rule in self.rules:
            field = rule["field"]
            condition = rule["condition"]
            label = rule.get("label", field)
            severity = rule.get("severity", "warning")
            mode = rule.get("mode", "match")

            value = record.get(field)
            if value is None:
                continue

            value_str = str(value).strip()

            if mode == "match":
                if isinstance(condition, list):
                    if value_str in [str(c) for c in condition]:
                        matched.append({
                            "field": field,
                            "value": value_str,
                            "label": label,
                            "severity": severity,
                            "rule": f"{field} in {condition}",
                        })
                else:
                    if value_str == str(condition):
                        matched.append({
                            "field": field,
                            "value": value_str,
                            "label": label,
                            "severity": severity,
                            "rule": f"{field} == {condition}",
                        })

            elif mode == "not_match":
                if isinstance(condition, list):
                    if value_str not in [str(c) for c in condition]:
                        matched.append({
                            "field": field,
                            "value": value_str,
                            "label": label,
                            "severity": severity,
                            "rule": f"{field} not in {condition}",
                        })
                else:
                    if value_str != str(condition):
                        matched.append({
                            "field": field,
                            "value": value_str,
                            "label": label,
                            "severity": severity,
                            "rule": f"{field} != {condition}",
                        })

            elif mode == "contains":
                if isinstance(condition, list):
                    for c in condition:
                        if str(c) in value_str:
                            matched.append({
                                "field": field,
                                "value": value_str,
                                "label": label,
                                "severity": severity,
                                "rule": f"{field} contains {c}",
                            })
                            break
                else:
                    if str(condition) in value_str:
                        matched.append({
                            "field": field,
                            "value": value_str,
                            "label": label,
                            "severity": severity,
                            "rule": f"{field} contains {condition}",
                        })

            elif mode == "range":
                try:
                    val_num = float(value_str)
                    min_val = condition.get("min")
                    max_val = condition.get("max")
                    out_of_range = False
                    if min_val is not None and val_num < float(min_val):
                        out_of_range = True
                    if max_val is not None and val_num > float(max_val):
                        out_of_range = True
                    if out_of_range:
                        matched.append({
                            "field": field,
                            "value": value_str,
                            "label": label,
                            "severity": severity,
                            "rule": f"{field} out of range [{min_val}, {max_val}]",
                        })
                except (ValueError, TypeError):
                    matched.append({
                        "field": field,
                        "value": value_str,
                        "label": label,
                        "severity": severity,
                        "rule": f"{field} 非数值，无法比较范围",
                    })

        return matched

    def classify(self, matched_rules):
        if not matched_rules:
            return "normal"

        has_error = any(r["severity"] == "error" for r in matched_rules)
        has_warning = any(r["severity"] == "warning" for r in matched_rules)
        has_info = any(r["severity"] == "info" for r in matched_rules)

        if has_error:
            return "abnormal"
        elif has_warning:
            return "review"
        elif has_info:
            return "review"
        else:
            return "normal"
