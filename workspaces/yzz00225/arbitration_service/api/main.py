"""API 接口层

基于 FastAPI 的 RESTful API 接口，提供送达回证处理能力。
"""
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from ..objects.models import (
    ServiceReceiptRequest,
    ServiceReceiptResponse,
    ReceiptRecord,
)
from ..objects.enums import TaskStatus, RiskLevel
from ..rules.exceptions import RuleViolationError, DuplicateProcessError
from ..service.service import ServiceReceiptService


app = FastAPI(
    title="仲裁送达回证API",
    description="仲裁送达回证处理服务 - 四层架构实现",
    version="1.0.0",
)

service = ServiceReceiptService()


@app.post(
    "/api/v1/receipt/process",
    response_model=ServiceReceiptResponse,
    summary="处理送达回证",
    description=(
        "输入批次号、明细项、来源渠道、处理动作和复核意见，"
        "输出业务结论、风险标签、下一步动作和审计编号。"
        "高风险或缺材料时进入复核，不允许直接通过。"
    ),
)
async def process_receipt(request: ServiceReceiptRequest):
    """处理送达回证

    - **batch_no**: 批次号
    - **items**: 明细项列表
    - **source_channel**: 来源渠道
    - **process_action**: 处理动作
    - **review_opinion**: 复核意见（可选）
    """
    try:
        result = service.process_receipt(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuleViolationError as e:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "rule_violation",
                "rule_id": e.rule_id,
                "rule_name": e.rule_name,
                "message": e.message,
            },
        )
    except DuplicateProcessError as e:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "duplicate_process",
                "batch_no": e.batch_no,
                "current_status": e.current_status,
                "message": str(e),
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务异常: {str(e)}")


@app.get(
    "/api/v1/receipt/status/{batch_no}",
    summary="查询任务状态",
)
async def get_task_status(batch_no: str):
    """查询批次的当前任务状态"""
    try:
        status = service.get_task_status(batch_no)
        return {"batch_no": batch_no, "task_status": status.value}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/v1/receipt/playback/{batch_no}",
    summary="数据回放",
    description="回放批次的处理历史，用于审计追踪和问题排查",
)
async def playback_receipt(batch_no: str):
    """数据回放

    返回批次的完整处理历史、状态流转路径和时间线。
    """
    try:
        result = service.playback(batch_no)
        return {
            "batch_no": result.batch_no,
            "record_count": result.record_count,
            "status_path": [s.value for s in result.status_path],
            "final_status": result.final_status.value if result.final_status else None,
            "is_complete": result.is_complete,
            "timeline": result.timeline,
            "records": [
                {
                    "record_id": r.record_id,
                    "previous_status": r.previous_status.value,
                    "current_status": r.current_status.value,
                    "process_action": r.process_action.value,
                    "business_conclusion": r.business_conclusion.value,
                    "audit_no": r.audit_no,
                    "timestamp": r.timestamp.isoformat(),
                    "operator": r.operator,
                    "remark": r.remark,
                }
                for r in result.records
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/v1/receipt/records/{batch_no}",
    summary="获取批次所有处理记录",
)
async def get_batch_records(batch_no: str):
    """获取批次的所有处理记录快照"""
    try:
        records = service.get_batch_records(batch_no)
        return {
            "batch_no": batch_no,
            "count": len(records),
            "records": [
                {
                    "record_id": r.record_id,
                    "audit_no": r.audit_no,
                    "previous_status": r.previous_status.value,
                    "current_status": r.current_status.value,
                    "process_action": r.process_action.value,
                    "business_conclusion": r.business_conclusion.value,
                    "timestamp": r.timestamp.isoformat(),
                    "missing_items": [],
                    "risk_tags": [tag.model_dump() for tag in r.risk_tags],
                }
                for r in records
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/v1/audit/{audit_no}",
    summary="查询审计记录",
)
async def get_audit_record(audit_no: str):
    """根据审计编号查询审计记录"""
    try:
        record = service.get_audit_record(audit_no)
        if not record:
            raise HTTPException(status_code=404, detail="审计记录不存在")
        return {
            "audit_no": record.audit_no,
            "batch_no": record.batch_no,
            "action": record.action,
            "operator": record.operator,
            "timestamp": record.timestamp.isoformat(),
            "before_status": record.before_status,
            "after_status": record.after_status,
            "risk_level": record.risk_level,
            "missing_items": record.missing_items,
            "data_hash": record.data_hash,
            "remark": record.remark,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/v1/health",
    summary="健康检查",
)
async def health_check():
    """健康检查接口"""
    return {"status": "ok", "service": "arbitration-receipt-api"}
