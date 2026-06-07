import re
from datetime import datetime
from typing import Dict, Optional, Tuple
from dateutil.parser import parse as dateparse


BIZ_NO_PATTERN = re.compile(r'^LD-SB-\d{4}-\d{6}$')


def validate_biz_no(biz_no: str) -> Tuple[bool, Optional[str]]:
    if not biz_no:
        return False, "业务编号不能为空"
    if not BIZ_NO_PATTERN.match(biz_no):
        return False, f"业务编号格式错误，应为 LD-SB-年份-6位序号，例如 LD-SB-2024-000001，实际为 {biz_no}"
    return True, None


def validate_time_window(time_window: Dict) -> Tuple[bool, Optional[str]]:
    if not time_window:
        return False, "时间窗口不能为空"

    start = time_window.get("start")
    end = time_window.get("end")

    if not start:
        return False, "时间窗口起始时间不能为空"
    if not end:
        return False, "时间窗口结束时间不能为空"

    try:
        start_dt = dateparse(start)
    except (ValueError, TypeError):
        return False, f"时间窗口起始时间格式错误：{start}"

    try:
        end_dt = dateparse(end)
    except (ValueError, TypeError):
        return False, f"时间窗口结束时间格式错误：{end}"

    if start_dt >= end_dt:
        return False, "时间窗口起始时间必须早于结束时间"

    return True, None


def validate_object_status(object_status: Dict) -> Tuple[bool, Optional[str]]:
    if not object_status:
        return False, "对象状态不能为空"

    building_id = object_status.get("building_id")
    if not building_id:
        return False, "楼栋ID不能为空"

    metrics = object_status.get("metrics")
    if metrics is None:
        return False, "指标数据不能为空"

    if not isinstance(metrics, dict):
        return False, "指标数据格式错误，应为字典类型"

    return True, None


def check_time_in_rule_effective(time_window: Dict, rule_version) -> Tuple[bool, Optional[str]]:
    start = time_window.get("start")
    end = time_window.get("end")

    start_dt = dateparse(start)
    end_dt = dateparse(end)

    if not rule_version.is_effective(start_dt):
        effective_from = rule_version.effective_from.strftime("%Y-%m-%d %H:%M:%S")
        return False, f"时间窗口起始时间{start}越界：早于规则版本生效时间{effective_from}"

    if rule_version.effective_to and end_dt > rule_version.effective_to:
        effective_to = rule_version.effective_to.strftime("%Y-%m-%d %H:%M:%S")
        return False, f"时间窗口结束时间{end}越界：晚于规则版本失效时间{effective_to}"

    return True, None


def validate_request(data: Dict, rule_version=None) -> Tuple[bool, Optional[str]]:
    biz_no = data.get("biz_no")
    valid, err = validate_biz_no(biz_no)
    if not valid:
        return False, err

    object_status = data.get("object_status")
    valid, err = validate_object_status(object_status)
    if not valid:
        return False, err

    time_window = data.get("time_window")
    valid, err = validate_time_window(time_window)
    if not valid:
        return False, err

    operator = data.get("operator")
    if not operator:
        return False, "操作人不能为空"

    if rule_version is not None:
        valid, err = check_time_in_rule_effective(time_window, rule_version)
        if not valid:
            return False, err

    return True, None
