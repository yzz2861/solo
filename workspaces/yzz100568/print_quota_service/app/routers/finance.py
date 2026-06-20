from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import csv
import io
from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/finance", tags=["财务报表导出"])


def _rows_to_csv(headers, rows, name) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    for r in rows:
        writer.writerow(r)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename={name}"},
    )


@router.get("/deductions", summary="扣费报表（含CSV导出）")
def deduction_report(
    format: str = Query("json", pattern="^(json|csv)$", description="输出格式"),
    start_date: Optional[datetime] = Query(None, description="起始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
    db: Session = Depends(get_db),
):
    report = crud.get_finance_deduction_report(db, start_date, end_date)
    if format == "csv":
        headers = ["交易ID", "学号", "任务ID", "金额", "现金扣费", "补贴扣费", "原因", "操作人", "时间"]
        rows = [
            [t.id, t.student_id, t.task_id or "", abs(t.amount),
             abs(t.cash_change), abs(t.subsidy_change), t.reason,
             t.operator_name or "", t.created_at.isoformat()]
            for t in report["records"]
        ]
        return _rows_to_csv(headers, rows, f"deductions_{datetime.now().strftime('%Y%m%d')}.csv")
    return {
        "count": report["count"],
        "total_amount": report["total_amount"],
        "records": [schemas.TransactionOut.model_validate(t).model_dump(mode="json") for t in report["records"]],
    }


@router.get("/refunds", summary="退款报表（含CSV导出）")
def refund_report(
    format: str = Query("json", pattern="^(json|csv)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    report = crud.get_finance_refund_report(db, start_date, end_date)
    if format == "csv":
        headers = ["退款ID", "任务ID", "学号", "退款总额", "现金返还", "补贴返还",
                   "异常类型", "退款原因", "申请人", "审批人", "审批意见", "状态", "申请时间", "处理时间"]
        rows = [
            [r.id, r.task_id, r.student_id, r.refund_amount, r.cash_refund, r.subsidy_refund,
             r.exception_type, r.refund_reason, r.applicant_name, r.approver_name or "",
             r.approval_comment or "", r.status.value,
             r.applied_at.isoformat(), (r.processed_at.isoformat() if r.processed_at else "")]
            for r in report["records"]
        ]
        return _rows_to_csv(headers, rows, f"refunds_{datetime.now().strftime('%Y%m%d')}.csv")
    return {
        "count": report["count"],
        "total_amount": report["total_amount"],
        "records": [schemas.RefundOut.model_validate(r).model_dump(mode="json") for r in report["records"]],
    }


@router.get("/subsidies", summary="补贴消耗报表（含CSV导出）")
def subsidy_report(
    format: str = Query("json", pattern="^(json|csv)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    report = crud.get_finance_subsidy_report(db, start_date, end_date)
    if format == "csv":
        headers = ["类型", "补贴ID", "补贴码", "学号", "课程名", "老师",
                   "总额", "已用", "剩余", "发放人", "创建时间"]
        rows = [
            ["发放", g.id, g.subsidy_code, g.student_id, g.course_name, g.teacher_name,
             g.total_quota, g.used_quota, g.remaining_quota, g.granted_by_name, g.created_at.isoformat()]
            for g in report["grant_records"]
        ]
        for u in report["usage_records"]:
            sub = crud.get_subsidy(db, u.subsidy_id)
            if sub:
                rows.append([
                    "消耗", sub.id, sub.subsidy_code, sub.student_id, sub.course_name, sub.teacher_name,
                    "", u.amount_used, "", "", u.created_at.isoformat()
                ])
        return _rows_to_csv(headers, rows, f"subsidies_{datetime.now().strftime('%Y%m%d')}.csv")
    return {
        "grant_count": report["grant_count"],
        "total_granted": report["total_granted"],
        "usage_count": report["usage_count"],
        "total_used": report["total_used"],
        "grant_records": [schemas.SubsidyOut.model_validate(g).model_dump(mode="json") for g in report["grant_records"]],
        "usage_records": [
            {
                "id": u.id,
                "subsidy_id": u.subsidy_id,
                "task_id": u.task_id,
                "amount_used": u.amount_used,
                "created_at": u.created_at.isoformat(),
            }
            for u in report["usage_records"]
        ],
    }


@router.get("/locked-tasks", summary="被锁定任务报表（含CSV导出）")
def locked_tasks_report(
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db),
):
    report = crud.get_locked_tasks_report(db)
    if format == "csv":
        headers = ["任务ID", "学号", "打印机", "页数", "金额", "状态", "异常原因", "锁定原因", "创建时间"]
        rows = [
            [t.id, t.student_id, t.printer_id, t.page_count, t.total_amount,
             t.status.value, t.exception_reason or "", t.lock_reason or "", t.created_at.isoformat()]
            for t in report["records"]
        ]
        return _rows_to_csv(headers, rows, f"locked_tasks_{datetime.now().strftime('%Y%m%d')}.csv")
    return {
        "count": report["count"],
        "total_amount": report["total_amount"],
        "records": [schemas.PrintTaskOut.model_validate(t).model_dump(mode="json") for t in report["records"]],
    }
