import os
from typing import List, Tuple
from .rules import RuleEngine


class ValidationError(Exception):
    pass


def validate_input_params(input_csv: str, rule_config: str, history_snapshot: str, output_dir: str) -> List[str]:
    """校验输入参数，返回错误列表"""
    errors = []

    if not input_csv:
        errors.append("必须指定输入CSV清单路径 (--input)")
    elif not os.path.exists(input_csv):
        errors.append(f"输入CSV文件不存在: {input_csv}")
    elif not os.path.isfile(input_csv):
        errors.append(f"输入路径不是文件: {input_csv}")
    elif os.path.getsize(input_csv) == 0:
        errors.append(f"输入CSV文件为空: {input_csv}")

    if not rule_config:
        errors.append("必须指定规则配置文件路径 (--rules)")
    elif not os.path.exists(rule_config):
        errors.append(f"规则配置文件不存在: {rule_config}")
    elif not os.path.isfile(rule_config):
        errors.append(f"规则配置路径不是文件: {rule_config}")

    if history_snapshot:
        if not os.path.exists(history_snapshot):
            errors.append(f"历史快照文件不存在: {history_snapshot}")
        elif not os.path.isfile(history_snapshot):
            errors.append(f"历史快照路径不是文件: {history_snapshot}")

    if not output_dir:
        errors.append("必须指定输出目录 (--output-dir)")

    return errors


def validate_rule_config(rule_config: str) -> Tuple[bool, List[str], RuleEngine]:
    """校验规则配置文件，返回(是否有效, 错误列表, 规则引擎)"""
    errors = []
    engine = None

    try:
        import json
        with open(rule_config, "r", encoding="utf-8") as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        errors.append(f"规则配置JSON解析失败: {str(e)}")
        return False, errors, None
    except Exception as e:
        errors.append(f"读取规则配置失败: {str(e)}")
        return False, errors, None

    if not isinstance(config, dict):
        errors.append("规则配置必须是JSON对象")
        return False, errors, None

    rules = config.get("rules", [])
    if not isinstance(rules, list):
        errors.append("rules字段必须是数组")
    else:
        for i, r in enumerate(rules):
            if not isinstance(r, dict):
                errors.append(f"第{i+1}条规则不是对象")
                continue
            if "field" not in r or not r["field"]:
                errors.append(f"第{i+1}条规则缺少field字段")
            if "operator" not in r or not r["operator"]:
                errors.append(f"第{i+1}条规则缺少operator字段")

    required_fields = config.get("required_fields", [])
    if not isinstance(required_fields, list):
        errors.append("required_fields字段必须是数组")

    if errors:
        return False, errors, None

    try:
        engine = RuleEngine.from_config(rule_config)
    except Exception as e:
        errors.append(f"初始化规则引擎失败: {str(e)}")
        return False, errors, None

    return True, errors, engine


def validate_csv_structure(fieldnames: List[str], required_fields: List[str]) -> List[str]:
    """校验CSV结构是否包含必填字段"""
    errors = []
    field_set = set(fieldnames)
    for rf in required_fields:
        if rf not in field_set:
            errors.append(f"CSV缺少字段列: {rf}")
    return errors
