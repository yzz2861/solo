from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..services import (
    get_compliance_export_data,
    export_compliance_excel,
    generate_release_order,
    get_sample,
)
from fastapi import HTTPException

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


@router.get("/summary")
def get_compliance_summary(db: Session = Depends(get_db)):
    data = get_compliance_export_data(db)
    return {
        "outbound_count": len(data["outbound_samples"]),
        "returned_count": len(data["returned_samples"]),
        "destroyed_count": len(data["destroyed_samples"]),
        "missing_docs_count": len(data["missing_docs_samples"]),
    }


@router.get("/export")
def export_compliance(db: Session = Depends(get_db)):
    data = get_compliance_export_data(db)
    output = export_compliance_excel(data)

    filename = f"合规导出_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/release-order/{sample_id}")
def get_release_order(sample_id: int, db: Session = Depends(get_db)):
    sample = get_sample(db, sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="样品不存在")

    if sample.status not in ["approved", "out", "overdue"] and \
       sample.approval_status != "approved":
        raise HTTPException(status_code=400, detail="样品未通过审批，无法打印放行单")

    output = generate_release_order(sample)

    filename = f"放行单_{sample.sample_no}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
