from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import os
import shutil
import uuid

from ..database import get_db
from ..schemas.sample import (
    Sample,
    SampleCreate,
    SampleUpdate,
    SampleListResponse,
    SampleStatus,
    ApprovalStatus,
    SamplePurpose,
    ApprovalRequest,
    ReturnRequest,
    DestroyRequest,
    OutboundRequest,
    OverdueSample,
    SampleAttachment,
    SampleCreateResponse,
    BatchDuplicateCheck,
)
from ..services import (
    get_samples,
    get_sample,
    create_sample,
    update_sample,
    delete_sample,
    approve_sample,
    outbound_sample,
    return_sample,
    destroy_sample,
    get_overdue_samples,
    get_out_samples,
    get_missing_docs_samples,
    get_statistics,
    check_batch_duplicates,
    calculate_overdue_days,
)
from ..models.sample import SampleAttachment as SampleAttachmentModel

router = APIRouter(prefix="/api/samples", tags=["samples"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=SampleListResponse)
def list_samples(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[SampleStatus] = None,
    approval_status: Optional[ApprovalStatus] = None,
    batch_number: Optional[str] = None,
    applicant: Optional[str] = None,
    keyword: Optional[str] = None,
    purpose: Optional[SamplePurpose] = None,
    db: Session = Depends(get_db),
):
    total, items = get_samples(
        db, skip=skip, limit=limit, status=status,
        approval_status=approval_status, batch_number=batch_number,
        applicant=applicant, keyword=keyword, purpose=purpose,
    )
    return {"total": total, "items": items}


@router.get("/statistics")
def get_stats(db: Session = Depends(get_db)):
    return get_statistics(db)


@router.get("/overdue", response_model=List[OverdueSample])
def list_overdue_samples(
    sort_by_overdue_days: bool = Query(True),
    db: Session = Depends(get_db),
):
    samples = get_overdue_samples(db, sort_by_overdue_days=sort_by_overdue_days)
    result = []
    for sample in samples:
        result.append({
            "id": sample.id,
            "sample_no": sample.sample_no,
            "sample_name": sample.sample_name,
            "batch_number": sample.batch_number,
            "applicant": sample.applicant,
            "expected_return_time": sample.expected_return_time,
            "out_time": sample.out_time,
            "overdue_days": calculate_overdue_days(sample),
            "status": sample.status,
        })
    return result


@router.get("/out", response_model=List[Sample])
def list_out_samples(db: Session = Depends(get_db)):
    return get_out_samples(db)


@router.get("/missing-docs", response_model=List[Sample])
def list_missing_docs_samples(db: Session = Depends(get_db)):
    return get_missing_docs_samples(db)


@router.get("/batch-check/{batch_number}")
def check_batch(batch_number: str, db: Session = Depends(get_db)):
    existing = check_batch_duplicates(db, batch_number)
    return {
        "batch_number": batch_number,
        "existing_count": len(existing),
        "existing_samples": [
            {
                "id": s.id,
                "sample_no": s.sample_no,
                "sample_name": s.sample_name,
                "status": s.status,
                "applicant": s.applicant,
            }
            for s in existing
        ],
    }


@router.get("/{sample_id}", response_model=Sample)
def get_sample_detail(sample_id: int, db: Session = Depends(get_db)):
    sample = get_sample(db, sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="样品不存在")
    return sample


@router.post("", response_model=SampleCreateResponse)
def create_new_sample(sample_in: SampleCreate, db: Session = Depends(get_db)):
    existing = check_batch_duplicates(db, sample_in.batch_number)
    sample = create_sample(db, sample_in)

    batch_duplicate_info = None
    if existing:
        batch_duplicate_info = BatchDuplicateCheck(
            batch_number=sample_in.batch_number,
            existing_count=len(existing),
            existing_samples=[
                {
                    "id": s.id,
                    "sample_no": s.sample_no,
                    "sample_name": s.sample_name,
                    "status": s.status,
                    "applicant": s.applicant,
                }
                for s in existing
            ],
        )

    return SampleCreateResponse(
        sample=sample,
        batch_warning=len(existing) > 0,
        batch_duplicate_info=batch_duplicate_info,
    )


@router.put("/{sample_id}", response_model=Sample)
def update_sample_detail(sample_id: int, sample_in: SampleUpdate, db: Session = Depends(get_db)):
    sample = update_sample(db, sample_id, sample_in)
    if not sample:
        raise HTTPException(status_code=404, detail="样品不存在或状态不允许修改")
    return sample


@router.delete("/{sample_id}")
def delete_sample_item(sample_id: int, db: Session = Depends(get_db)):
    success = delete_sample(db, sample_id)
    if not success:
        raise HTTPException(status_code=400, detail="样品不存在或状态不允许删除")
    return {"message": "删除成功"}


@router.post("/{sample_id}/approve", response_model=Sample)
def approve(sample_id: int, approval: ApprovalRequest, db: Session = Depends(get_db)):
    sample = approve_sample(db, sample_id, approval)
    if not sample:
        raise HTTPException(status_code=400, detail="样品不存在或当前状态无法审批")
    return sample


@router.post("/{sample_id}/outbound", response_model=Sample)
def outbound(sample_id: int, outbound_req: OutboundRequest, db: Session = Depends(get_db)):
    sample = outbound_sample(db, sample_id, outbound_req)
    if not sample:
        raise HTTPException(status_code=400, detail="样品不存在或未通过审批，无法出区")
    return sample


@router.post("/{sample_id}/return", response_model=Sample)
def return_sample_item(sample_id: int, return_req: ReturnRequest, db: Session = Depends(get_db)):
    sample = return_sample(db, sample_id, return_req)
    if not sample:
        raise HTTPException(status_code=400, detail="样品不存在或当前状态无法归还")
    return sample


@router.post("/{sample_id}/destroy", response_model=Sample)
def destroy(sample_id: int, destroy_req: DestroyRequest, db: Session = Depends(get_db)):
    sample = destroy_sample(db, sample_id, destroy_req)
    if not sample:
        raise HTTPException(status_code=400, detail="样品不存在或当前状态无法销毁")
    return sample


@router.post("/{sample_id}/attachments", response_model=SampleAttachment)
async def upload_attachment(
    sample_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    sample = get_sample(db, sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="样品不存在")

    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    new_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    attachment = SampleAttachmentModel(
        sample_id=sample_id,
        file_name=file.filename or new_filename,
        file_path=file_path,
        file_size=file_size,
        file_type=file.content_type,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return attachment


@router.get("/{sample_id}/attachments/{attachment_id}")
def download_attachment(
    sample_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
):
    attachment = db.query(SampleAttachmentModel).filter(
        SampleAttachmentModel.id == attachment_id,
        SampleAttachmentModel.sample_id == sample_id,
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="附件不存在")

    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="文件不存在")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.file_name,
        media_type=attachment.file_type or "application/octet-stream",
    )


@router.delete("/{sample_id}/attachments/{attachment_id}")
def delete_attachment(
    sample_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
):
    attachment = db.query(SampleAttachmentModel).filter(
        SampleAttachmentModel.id == attachment_id,
        SampleAttachmentModel.sample_id == sample_id,
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="附件不存在")

    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    db.delete(attachment)
    db.commit()

    return {"message": "删除成功"}
