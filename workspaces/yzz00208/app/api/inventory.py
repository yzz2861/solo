from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.inventory import (
    InventoryCheckRequest,
    InventoryCheckResponse,
    TraceRecord,
    ReviewRecord,
    DecisionType,
)
from app.services import inventory_service

router = APIRouter(prefix="/api/v1/inventory", tags=["门店盘点盈亏"])


@router.post("/check", response_model=InventoryCheckResponse, summary="门店盘点盈亏判定")
async def inventory_check(request: InventoryCheckRequest):
    """
    执行门店盘点盈亏判定

    - **business_no**: 业务编号，唯一标识一次盘点业务
    - **object_status**: 盘点对象状态（正常/异常/损坏/丢失）
    - **time_window**: 盘点时间窗口（开始/结束时间）
    - **rule_version**: 规则版本号
    - **operator**: 操作人
    - **material_status**: 材料状态（完整/缺失/无效）
    - **profit_loss_amount**: 盈亏金额
    - **profit_loss_rate**: 盈亏比例
    """
    result = inventory_service.perform_inventory_check(request)
    return result


@router.get("/trace/{trace_id}", response_model=TraceRecord, summary="按追溯号查询")
async def get_trace(trace_id: str):
    """
    根据追溯号查询盘点记录详情
    """
    record = inventory_service.get_trace_record(trace_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"追溯号 {trace_id} 不存在")
    return record


@router.get("/business/{business_no}", response_model=List[TraceRecord], summary="按业务编号查询历史")
async def get_business_history(business_no: str):
    """
    根据业务编号查询所有盘点历史记录
    """
    records = inventory_service.list_by_business_no(business_no)
    if not records:
        raise HTTPException(status_code=404, detail=f"业务编号 {business_no} 无记录")
    return records


@router.post("/review/{trace_id}", response_model=ReviewRecord, summary="人工复核")
async def review_inventory(
    trace_id: str,
    reviewer: str = Query(..., description="复核人"),
    final_decision: DecisionType = Query(..., description="最终决策"),
    review_comment: str = Query(..., description="复核意见"),
):
    """
    对盘点结果进行人工复核

    - **trace_id**: 盘点追溯号
    - **reviewer**: 复核人
    - **final_decision**: 最终决策（通过/拦截/待复核）
    - **review_comment**: 复核意见
    """
    review = inventory_service.perform_review(trace_id, reviewer, final_decision, review_comment)
    if not review:
        raise HTTPException(status_code=404, detail=f"追溯号 {trace_id} 不存在")
    return review


@router.get("/replay/{business_no}", response_model=List[TraceRecord], summary="历史回放")
async def replay_inventory_history(business_no: str):
    """
    回放到指定业务编号的所有盘点历史，用于审计和追溯
    """
    records = inventory_service.replay_history(business_no)
    if not records:
        raise HTTPException(status_code=404, detail=f"业务编号 {business_no} 无历史记录")
    return records


@router.get("/rules/versions", response_model=List[str], summary="获取可用规则版本")
async def get_rule_versions():
    """
    获取所有可用的规则版本列表
    """
    return inventory_service.get_available_rule_versions()
