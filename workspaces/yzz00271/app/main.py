from fastapi import FastAPI, HTTPException, Query
from typing import List, Optional
from app.domain import (
    BatchReceiptRequest,
    ReviewRequest,
    BatchReceiptResponse,
)
from app.services import ReceiptService

app = FastAPI(
    title="影像报告危急值回执API",
    description="基于对象-规则-状态-记录四层架构的危急值回执管理系统",
    version="1.0.0",
)

receipt_service = ReceiptService()


@app.post("/api/receipts/batch", response_model=BatchReceiptResponse, summary="批量提交危急值回执")
def submit_batch(request: BatchReceiptRequest):
    """
    批量提交影像报告危急值回执

    - **batch_no**: 批次号
    - **source_channel**: 来源渠道 (pacs/his/manual/emergency)
    - **action**: 处理动作，默认 submit
    - **items**: 明细项列表
    """
    try:
        result = receipt_service.submit_batch(
            batch_no=request.batch_no,
            source_channel=request.source_channel,
            items=request.items,
            action=request.action,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/receipts/review", summary="人工复核回执")
def review_receipts(request: ReviewRequest):
    """
    人工复核危急值回执

    - **batch_no**: 批次号
    - **receipt_ids**: 回执ID列表
    - **action**: 复核动作 (approve/reject)
    - **review_opinion**: 复核意见
    - **review_user**: 复核人
    """
    try:
        result = receipt_service.review_receipts(
            batch_no=request.batch_no,
            receipt_ids=request.receipt_ids,
            action=request.action,
            review_opinion=request.review_opinion,
            review_user=request.review_user,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/receipts/batch/{batch_no}", summary="查询批次详情")
def get_batch(batch_no: str):
    """
    查询批次详情，包括汇总统计、明细列表和操作日志
    """
    result = receipt_service.get_batch(batch_no)
    if not result:
        raise HTTPException(status_code=404, detail="批次不存在")
    return result


@app.get("/api/receipts/{receipt_id}", summary="查询单条回执详情")
def get_receipt(receipt_id: str):
    """
    查询单条回执详情及操作日志
    """
    result = receipt_service.get_receipt(receipt_id)
    if not result:
        raise HTTPException(status_code=404, detail="回执不存在")
    return result


@app.get("/api/audit-logs", summary="查询操作日志")
def get_audit_logs(
    batch_no: Optional[str] = Query(None, description="按批次号筛选"),
    receipt_id: Optional[str] = Query(None, description="按回执ID筛选"),
):
    """
    查询操作日志，可按批次号或回执ID筛选
    """
    logs = receipt_service.get_audit_logs(batch_no=batch_no, receipt_id=receipt_id)
    return {
        "total": len(logs),
        "logs": logs,
    }
