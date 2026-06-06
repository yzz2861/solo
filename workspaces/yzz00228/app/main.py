from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from .services.auth_service import AuthService, AuthServiceError
from .models.batch import AuthBatch
from .schemas import (
    AuthBatchRequest,
    AuthBatchResultSchema,
    AuthItemResultSchema,
    ReviewRequest,
    ErrorResponse,
    AuditRecordSchema,
    PlaybackSnapshotSchema,
)

app = FastAPI(
    title="二手奢品鉴定流程API",
    description="四层架构（对象/规则/状态/记录）的二手奢品鉴定流程服务",
    version="1.0.0",
)

auth_service = AuthService()


@app.post(
    "/api/v1/auth/batch/process",
    response_model=AuthBatchResultSchema,
    summary="处理鉴定批次",
    responses={400: {"model": ErrorResponse}},
)
async def process_batch(request: AuthBatchRequest):
    try:
        batch = AuthBatch(
            batch_no=request.batch_no,
            items=request.items,
            action=request.action,
            review_opinion=request.review_opinion,
            review_by=request.review_by,
            operator=request.operator,
            remark=request.remark,
        )
        result = auth_service.process_batch(batch)
        return result
    except AuthServiceError as e:
        raise HTTPException(
            status_code=400,
            detail={"code": e.code, "message": e.message, "details": e.details},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"code": "INTERNAL_ERROR", "message": str(e), "details": {}},
        )


@app.get(
    "/api/v1/auth/batch/{batch_no}",
    response_model=AuthBatchResultSchema,
    summary="查询批次鉴定结果",
)
async def get_batch_result(batch_no: str):
    result = auth_service.get_batch_result(batch_no)
    if not result:
        raise HTTPException(status_code=404, detail="批次不存在")
    return result


@app.post(
    "/api/v1/auth/item/{batch_no}/{item_no}/review",
    response_model=AuthItemResultSchema,
    summary="复核明细项",
    responses={400: {"model": ErrorResponse}},
)
async def review_item(batch_no: str, item_no: str, request: ReviewRequest):
    try:
        result = auth_service.review_item(
            batch_no=batch_no,
            item_no=item_no,
            action=request.action,
            review_opinion=request.review_opinion,
            review_by=request.review_by,
        )
        return result
    except AuthServiceError as e:
        raise HTTPException(
            status_code=400,
            detail={"code": e.code, "message": e.message, "details": e.details},
        )


@app.get(
    "/api/v1/auth/item/{batch_no}/{item_no}/history",
    response_model=List[AuditRecordSchema],
    summary="查询明细项历史记录",
)
async def get_item_history(batch_no: str, item_no: str):
    history = auth_service.get_item_history(batch_no, item_no)
    if not history:
        raise HTTPException(status_code=404, detail="未找到历史记录")
    return history


@app.get(
    "/api/v1/auth/item/{batch_no}/{item_no}/playback",
    response_model=List[PlaybackSnapshotSchema],
    summary="历史回放明细项状态流转",
)
async def play_back_item(batch_no: str, item_no: str):
    snapshots = auth_service.play_back_item(batch_no, item_no)
    if not snapshots:
        raise HTTPException(status_code=404, detail="未找到回放记录")
    return snapshots


@app.get(
    "/api/v1/auth/trace/{trace_id}",
    response_model=AuditRecordSchema,
    summary="按可追溯编号查询记录",
)
async def get_record_by_trace_id(trace_id: str):
    record = auth_service.get_record_by_trace_id(trace_id)
    if not record:
        raise HTTPException(status_code=404, detail="追溯编号不存在")
    return record


@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "service": "luxury-auth-api"}


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": "UNKNOWN_ERROR", "message": str(exc.detail), "details": {}},
    )
