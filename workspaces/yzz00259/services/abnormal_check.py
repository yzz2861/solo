import hashlib
import json
import uuid
from datetime import datetime
from typing import Dict, Optional

from models.audit import AuditLog, audit_store
from services.rule_engine import get_rule_engine
from services.validator import validate_request, validate_biz_no


def generate_trace_id(biz_no: str, rule_version: str, time_window: Dict,
                       object_status: Dict) -> str:
    payload = {
        "biz_no": biz_no,
        "rule_version": rule_version,
        "time_window": time_window,
        "object_status_metrics": object_status.get("metrics", {})
    }
    content = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    hash_hex = hashlib.md5(content.encode("utf-8")).hexdigest()
    return f"TRACE-{hash_hex.upper()}"


def process_abnormal_check(data: Dict) -> Dict:
    biz_no = data.get("biz_no", "")
    rule_version_str = data.get("rule_version")
    operator = data.get("operator", "")
    time_window = data.get("time_window", {})
    object_status = data.get("object_status", {})

    engine, err = get_rule_engine(rule_version_str)
    if err:
        return {
            "success": False,
            "code": "CONFIG_MISSING",
            "message": err,
            "data": None
        }

    valid, err_msg = validate_request(data, engine.rule_version)
    if not valid:
        return {
            "success": False,
            "code": "INVALID_REQUEST",
            "message": err_msg,
            "data": None
        }

    trace_id = generate_trace_id(
        biz_no,
        engine.rule_version.version,
        time_window,
        object_status
    )

    existing_log = audit_store.get_by_trace_id(trace_id)
    if existing_log:
        return {
            "success": True,
            "code": "SUCCESS",
            "message": "重复请求，返回历史结果",
            "data": {
                "trace_id": trace_id,
                "biz_no": biz_no,
                "conclusion": existing_log.result["conclusion"],
                "conclusion_cn": existing_log.result["conclusion_cn"],
                "reason": existing_log.result["reason"],
                "triggered_rules": existing_log.result["triggered_rules"],
                "rule_version": existing_log.rule_version,
                "operator": existing_log.operator,
                "is_repeat": True
            }
        }

    conclusion, triggered_rules, reason = engine.evaluate(object_status)

    conclusion_map = {
        "pass": "通过",
        "intercept": "拦截",
        "review": "待复核"
    }

    result_data = {
        "conclusion": conclusion,
        "conclusion_cn": conclusion_map.get(conclusion, conclusion),
        "reason": reason,
        "triggered_rules": [
            {
                "id": r["id"],
                "name": r["name"],
                "description": r["description"],
                "action": r["action"],
                "action_cn": conclusion_map.get(r["action"], r["action"]),
                "priority": r.get("priority", 999)
            }
            for r in triggered_rules
        ]
    }

    audit_log = AuditLog(
        trace_id=trace_id,
        biz_no=biz_no,
        operator=operator,
        rule_version=engine.rule_version.version,
        request_data={
            "object_status": object_status,
            "time_window": time_window
        },
        result=result_data,
        time_window=time_window
    )
    audit_store.add_log(audit_log)

    return {
        "success": True,
        "code": "SUCCESS",
        "message": "处理成功",
        "data": {
            "trace_id": trace_id,
            "biz_no": biz_no,
            "conclusion": conclusion,
            "conclusion_cn": conclusion_map.get(conclusion, conclusion),
            "reason": reason,
            "triggered_rules": result_data["triggered_rules"],
            "rule_version": engine.rule_version.version,
            "operator": operator,
            "is_repeat": False
        }
    }


def get_audit_by_trace(trace_id: str) -> Dict:
    log = audit_store.get_by_trace_id(trace_id)
    if not log:
        return {
            "success": False,
            "code": "NOT_FOUND",
            "message": f"未找到 trace_id={trace_id} 的审计记录",
            "data": None
        }
    return {
        "success": True,
        "code": "SUCCESS",
        "message": "查询成功",
        "data": log.to_dict()
    }


def get_audit_by_biz(biz_no: str) -> Dict:
    valid, err = validate_biz_no(biz_no)
    if not valid:
        return {
            "success": False,
            "code": "INVALID_BIZ_NO",
            "message": err,
            "data": None
        }
    logs = audit_store.get_by_biz_no(biz_no)
    return {
        "success": True,
        "code": "SUCCESS",
        "message": "查询成功",
        "data": {
            "biz_no": biz_no,
            "count": len(logs),
            "records": logs
        }
    }
