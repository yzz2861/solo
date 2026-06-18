from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
import uuid

from ..models.sample import Sample as SampleModel, SampleStatus, ApprovalStatus, SamplePurpose
from ..schemas.sample import SampleCreate, SampleUpdate, ApprovalRequest, ReturnRequest, DestroyRequest, OutboundRequest


def generate_sample_no() -> str:
    date_str = datetime.now().strftime("%Y%m%d")
    random_str = uuid.uuid4().hex[:6].upper()
    return f"BS{date_str}{random_str}"


def check_batch_duplicates(db: Session, batch_number: str, exclude_id: Optional[int] = None) -> List[SampleModel]:
    query = db.query(SampleModel).filter(
        SampleModel.batch_number == batch_number,
        SampleModel.status.in_([
            SampleStatus.PENDING_APPROVAL,
            SampleStatus.APPROVED,
            SampleStatus.OUT,
            SampleStatus.OVERDUE
        ])
    )
    if exclude_id:
        query = query.filter(SampleModel.id != exclude_id)
    return query.all()


def get_samples(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[SampleStatus] = None,
    approval_status: Optional[ApprovalStatus] = None,
    batch_number: Optional[str] = None,
    applicant: Optional[str] = None,
    keyword: Optional[str] = None,
    purpose: Optional[SamplePurpose] = None,
) -> Tuple[int, List[SampleModel]]:
    query = db.query(SampleModel)

    if status:
        query = query.filter(SampleModel.status == status)
    if approval_status:
        query = query.filter(SampleModel.approval_status == approval_status)
    if batch_number:
        query = query.filter(SampleModel.batch_number.contains(batch_number))
    if applicant:
        query = query.filter(SampleModel.applicant.contains(applicant))
    if purpose:
        query = query.filter(SampleModel.purpose == purpose)
    if keyword:
        query = query.filter(
            or_(
                SampleModel.sample_name.contains(keyword),
                SampleModel.sample_no.contains(keyword),
                SampleModel.batch_number.contains(keyword),
                SampleModel.applicant.contains(keyword),
            )
        )

    total = query.count()
    items = query.order_by(SampleModel.created_at.desc()).offset(skip).limit(limit).all()
    return total, items


def get_sample(db: Session, sample_id: int) -> Optional[SampleModel]:
    return db.query(SampleModel).filter(SampleModel.id == sample_id).first()


def get_sample_by_no(db: Session, sample_no: str) -> Optional[SampleModel]:
    return db.query(SampleModel).filter(SampleModel.sample_no == sample_no).first()


def create_sample(db: Session, sample_in: SampleCreate) -> SampleModel:
    sample = SampleModel(
        sample_no=generate_sample_no(),
        sample_name=sample_in.sample_name,
        batch_number=sample_in.batch_number,
        purpose=sample_in.purpose,
        purpose_detail=sample_in.purpose_detail,
        applicant=sample_in.applicant,
        department=sample_in.department,
        quantity=sample_in.quantity,
        unit=sample_in.unit,
        out_time=sample_in.out_time,
        expected_return_time=sample_in.expected_return_time,
        customs_documents=sample_in.customs_documents,
        remark=sample_in.remark,
        status=SampleStatus.PENDING_APPROVAL,
        approval_status=ApprovalStatus.PENDING,
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)
    return sample


def update_sample(db: Session, sample_id: int, sample_in: SampleUpdate) -> Optional[SampleModel]:
    sample = get_sample(db, sample_id)
    if not sample:
        return None

    if sample.status not in [SampleStatus.PENDING_APPROVAL, SampleStatus.APPROVED]:
        return None

    update_data = sample_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sample, key, value)

    db.commit()
    db.refresh(sample)
    return sample


def delete_sample(db: Session, sample_id: int) -> bool:
    sample = get_sample(db, sample_id)
    if not sample:
        return False

    if sample.status in [SampleStatus.OUT, SampleStatus.OVERDUE]:
        return False

    db.delete(sample)
    db.commit()
    return True


def approve_sample(db: Session, sample_id: int, approval: ApprovalRequest) -> Optional[SampleModel]:
    sample = get_sample(db, sample_id)
    if not sample:
        return None

    if sample.approval_status != ApprovalStatus.PENDING:
        return None

    sample.approval_status = ApprovalStatus.APPROVED if approval.approved else ApprovalStatus.REJECTED
    sample.approver = approval.approver
    sample.approval_time = datetime.utcnow()
    sample.approval_opinion = approval.opinion

    if approval.approved:
        sample.status = SampleStatus.APPROVED
    else:
        sample.status = SampleStatus.PENDING_APPROVAL

    db.commit()
    db.refresh(sample)
    return sample


def outbound_sample(db: Session, sample_id: int, outbound: OutboundRequest) -> Optional[SampleModel]:
    sample = get_sample(db, sample_id)
    if not sample:
        return None

    if sample.status != SampleStatus.APPROVED:
        return None

    if sample.approval_status != ApprovalStatus.APPROVED:
        return None

    sample.status = SampleStatus.OUT
    sample.out_time = outbound.out_time or datetime.utcnow()

    db.commit()
    db.refresh(sample)
    return sample


def return_sample(db: Session, sample_id: int, return_req: ReturnRequest) -> Optional[SampleModel]:
    sample = get_sample(db, sample_id)
    if not sample:
        return None

    if sample.status not in [SampleStatus.OUT, SampleStatus.OVERDUE]:
        return None

    sample.status = SampleStatus.RETURNED
    sample.actual_return_time = return_req.return_time or datetime.utcnow()
    if return_req.remark:
        sample.remark = (sample.remark or "") + f"\n归还备注: {return_req.remark}"

    db.commit()
    db.refresh(sample)
    return sample


def destroy_sample(db: Session, sample_id: int, destroy_req: DestroyRequest) -> Optional[SampleModel]:
    sample = get_sample(db, sample_id)
    if not sample:
        return None

    if sample.status == SampleStatus.DESTROYED:
        return None

    if sample.status == SampleStatus.RETURNED:
        return None

    sample.status = SampleStatus.DESTROYED
    sample.destroy_time = destroy_req.destroy_time or datetime.utcnow()
    sample.destroy_reason = destroy_req.reason
    sample.destroy_operator = destroy_req.operator

    db.commit()
    db.refresh(sample)
    return sample


def get_overdue_samples(db: Session, sort_by_overdue_days: bool = True) -> List[SampleModel]:
    now = datetime.utcnow()
    query = db.query(SampleModel).filter(
        SampleModel.status.in_([SampleStatus.OUT, SampleStatus.OVERDUE]),
        SampleModel.expected_return_time.isnot(None),
        SampleModel.expected_return_time < now,
    )

    samples = query.all()

    for sample in samples:
        if sample.status == SampleStatus.OUT:
            sample.status = SampleStatus.OVERDUE
    db.commit()

    if sort_by_overdue_days:
        samples.sort(
            key=lambda s: (s.expected_return_time - now).days if s.expected_return_time else 0
        )

    return samples


def get_out_samples(db: Session) -> List[SampleModel]:
    return db.query(SampleModel).filter(
        SampleModel.status.in_([SampleStatus.OUT, SampleStatus.OVERDUE])
    ).order_by(SampleModel.out_time.desc()).all()


def get_missing_docs_samples(db: Session) -> List[SampleModel]:
    return db.query(SampleModel).filter(
        SampleModel.status.in_([SampleStatus.OUT, SampleStatus.OVERDUE, SampleStatus.APPROVED]),
        or_(
            SampleModel.customs_documents.is_(None),
            SampleModel.customs_documents == "",
        )
    ).order_by(SampleModel.created_at.desc()).all()


def get_compliance_export_data(db: Session) -> dict:
    outbound_samples = get_out_samples(db)
    returned_samples = db.query(SampleModel).filter(
        SampleModel.status == SampleStatus.RETURNED
    ).order_by(SampleModel.actual_return_time.desc()).all()
    destroyed_samples = db.query(SampleModel).filter(
        SampleModel.status == SampleStatus.DESTROYED
    ).order_by(SampleModel.destroy_time.desc()).all()
    missing_docs_samples = get_missing_docs_samples(db)

    return {
        "outbound_samples": outbound_samples,
        "returned_samples": returned_samples,
        "destroyed_samples": destroyed_samples,
        "missing_docs_samples": missing_docs_samples,
    }


def calculate_overdue_days(sample: SampleModel) -> int:
    if not sample.expected_return_time:
        return 0
    now = datetime.utcnow()
    if now <= sample.expected_return_time:
        return 0
    return (now - sample.expected_return_time).days


def get_statistics(db: Session) -> dict:
    total = db.query(SampleModel).count()
    pending_approval = db.query(SampleModel).filter(
        SampleModel.status == SampleStatus.PENDING_APPROVAL
    ).count()
    out_count = db.query(SampleModel).filter(
        SampleModel.status.in_([SampleStatus.OUT, SampleStatus.OVERDUE])
    ).count()
    overdue_count = db.query(SampleModel).filter(
        SampleModel.status == SampleStatus.OVERDUE
    ).count()
    returned = db.query(SampleModel).filter(
        SampleModel.status == SampleStatus.RETURNED
    ).count()
    destroyed = db.query(SampleModel).filter(
        SampleModel.status == SampleStatus.DESTROYED
    ).count()

    now = datetime.utcnow()
    overdue_count = db.query(SampleModel).filter(
        SampleModel.status.in_([SampleStatus.OUT, SampleStatus.OVERDUE]),
        SampleModel.expected_return_time.isnot(None),
        SampleModel.expected_return_time < now,
    ).count()

    return {
        "total": total,
        "pending_approval": pending_approval,
        "out": out_count,
        "overdue": overdue_count,
        "returned": returned,
        "destroyed": destroyed,
    }
