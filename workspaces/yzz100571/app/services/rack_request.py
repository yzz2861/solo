from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from ..models import (
    RackRequest,
    RackRequestStatus,
    DeviceModel,
    Cabinet,
    PDUPort,
    SwitchPort,
    User,
    AuditAction,
)
from ..schemas import (
    RackRequestCreate,
    RackRequestUpdate,
    RackRequestResponse,
    ValidationErrorResponse,
)
from .validation import check_resources, validate_u_position
from .audit import create_audit_log


def generate_request_no(db: Session) -> str:
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"RK{today}"
    last_request = db.query(RackRequest).filter(
        RackRequest.request_no.like(f"{prefix}%")
    ).order_by(RackRequest.request_no.desc()).first()

    if last_request:
        seq = int(last_request.request_no[-4:]) + 1
    else:
        seq = 1

    return f"{prefix}{seq:04d}"


def create_rack_request(
    db: Session,
    request_data: RackRequestCreate,
    created_by: int
) -> Tuple[RackRequest, List[ValidationErrorResponse]]:
    device_model = db.query(DeviceModel).filter(
        DeviceModel.id == request_data.device_model_id
    ).first()
    if not device_model:
        raise ValueError(f"设备型号 ID {request_data.device_model_id} 不存在")

    request_no = generate_request_no(db)

    planned_u_end = request_data.planned_u_start + device_model.height_u - 1

    request = RackRequest(
        request_no=request_no,
        device_model_id=request_data.device_model_id,
        device_name=request_data.device_name,
        serial_number=request_data.serial_number,
        cabinet_id=request_data.cabinet_id,
        planned_u_start=request_data.planned_u_start,
        planned_u_end=planned_u_end,
        power_draw_watts=request_data.power_draw_watts,
        planned_pdu_port_ids=request_data.planned_pdu_port_ids,
        planned_switch_port_ids=request_data.planned_switch_port_ids,
        construction_date=request_data.construction_date,
        created_by=created_by,
        status=RackRequestStatus.DRAFT
    )

    db.add(request)
    db.flush()

    validation = check_resources(
        db=db,
        cabinet_id=request.cabinet_id,
        u_start=request.planned_u_start,
        u_height=device_model.height_u,
        power_watts=request.power_draw_watts,
        pdu_port_id=request.planned_pdu_port_ids,
        switch_port_id=request.planned_switch_port_ids,
        exclude_request_id=request.id
    )

    create_audit_log(
        db=db,
        user_id=created_by,
        action=AuditAction.CREATE,
        rack_request_id=request.id,
        new_value=f"Created request {request_no}",
        remark="创建议员申请单"
    )

    return request, validation.errors


def update_rack_request(
    db: Session,
    request_id: int,
    update_data: RackRequestUpdate,
    user_id: int
) -> Tuple[Optional[RackRequest], List[ValidationErrorResponse]]:
    request = db.query(RackRequest).filter(RackRequest.id == request_id).first()
    if not request:
        return None, []

    if request.status not in [RackRequestStatus.DRAFT, RackRequestStatus.REJECTED]:
        raise ValueError("只有草稿或已驳回状态的申请单可以编辑")

    old_values = []
    new_values = []

    if update_data.device_model_id is not None:
        device_model = db.query(DeviceModel).filter(
            DeviceModel.id == update_data.device_model_id
        ).first()
        if not device_model:
            raise ValueError(f"设备型号 ID {update_data.device_model_id} 不存在")
        old_values.append(f"device_model_id={request.device_model_id}")
        request.device_model_id = update_data.device_model_id
        new_values.append(f"device_model_id={update_data.device_model_id}")

    if update_data.device_name is not None:
        old_values.append(f"device_name={request.device_name}")
        request.device_name = update_data.device_name
        new_values.append(f"device_name={update_data.device_name}")

    if update_data.serial_number is not None:
        old_values.append(f"serial_number={request.serial_number}")
        request.serial_number = update_data.serial_number
        new_values.append(f"serial_number={update_data.serial_number}")

    if update_data.cabinet_id is not None:
        old_values.append(f"cabinet_id={request.cabinet_id}")
        request.cabinet_id = update_data.cabinet_id
        new_values.append(f"cabinet_id={update_data.cabinet_id}")

    device_model = db.query(DeviceModel).filter(
        DeviceModel.id == request.device_model_id
    ).first()

    if update_data.planned_u_start is not None:
        old_values.append(f"planned_u_start={request.planned_u_start}")
        request.planned_u_start = update_data.planned_u_start
        request.planned_u_end = update_data.planned_u_start + device_model.height_u - 1
        new_values.append(f"planned_u_start={update_data.planned_u_start}, planned_u_end={request.planned_u_end}")

    if update_data.power_draw_watts is not None:
        old_values.append(f"power_draw_watts={request.power_draw_watts}")
        request.power_draw_watts = update_data.power_draw_watts
        new_values.append(f"power_draw_watts={update_data.power_draw_watts}")

    if update_data.planned_pdu_port_ids is not None:
        old_values.append(f"planned_pdu_port_ids={request.planned_pdu_port_ids}")
        request.planned_pdu_port_ids = update_data.planned_pdu_port_ids
        new_values.append(f"planned_pdu_port_ids={update_data.planned_pdu_port_ids}")

    if update_data.planned_switch_port_ids is not None:
        old_values.append(f"planned_switch_port_ids={request.planned_switch_port_ids}")
        request.planned_switch_port_ids = update_data.planned_switch_port_ids
        new_values.append(f"planned_switch_port_ids={update_data.planned_switch_port_ids}")

    if update_data.construction_date is not None:
        old_values.append(f"construction_date={request.construction_date}")
        request.construction_date = update_data.construction_date
        new_values.append(f"construction_date={update_data.construction_date}")

    validation = check_resources(
        db=db,
        cabinet_id=request.cabinet_id,
        u_start=request.planned_u_start,
        u_height=device_model.height_u,
        power_watts=request.power_draw_watts,
        pdu_port_id=request.planned_pdu_port_ids,
        switch_port_id=request.planned_switch_port_ids,
        exclude_request_id=request.id
    )

    create_audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.UPDATE,
        rack_request_id=request.id,
        old_value="; ".join(old_values),
        new_value="; ".join(new_values),
        remark="更新上架申请单"
    )

    return request, validation.errors


def submit_rack_request(
    db: Session,
    request_id: int,
    user_id: int
) -> Tuple[Optional[RackRequest], List[ValidationErrorResponse]]:
    request = db.query(RackRequest).filter(RackRequest.id == request_id).first()
    if not request:
        return None, []

    if request.status not in [RackRequestStatus.DRAFT, RackRequestStatus.REJECTED]:
        raise ValueError("只有草稿或已驳回状态的申请单可以提交")

    device_model = db.query(DeviceModel).filter(
        DeviceModel.id == request.device_model_id
    ).first()

    validation = check_resources(
        db=db,
        cabinet_id=request.cabinet_id,
        u_start=request.planned_u_start,
        u_height=device_model.height_u,
        power_watts=request.power_draw_watts,
        pdu_port_id=request.planned_pdu_port_ids,
        switch_port_id=request.planned_switch_port_ids,
        exclude_request_id=request.id
    )

    if not validation.available:
        return request, validation.errors

    old_status = request.status.value
    request.status = RackRequestStatus.PENDING

    if request.planned_pdu_port_ids:
        pdu_port = db.query(PDUPort).filter(PDUPort.id == request.planned_pdu_port_ids).first()
        if pdu_port:
            pdu_port.is_occupied = True
            pdu_port.occupied_by = request.id
            pdu_port.power_draw_watts = request.power_draw_watts

    if request.planned_switch_port_ids:
        switch_port = db.query(SwitchPort).filter(SwitchPort.id == request.planned_switch_port_ids).first()
        if switch_port:
            switch_port.is_occupied = True
            switch_port.occupied_by = request.id

    create_audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.SUBMIT,
        rack_request_id=request.id,
        old_value=old_status,
        new_value=RackRequestStatus.PENDING.value,
        remark="提交上架申请单等待审批"
    )

    return request, []


def approve_rack_request(
    db: Session,
    request_id: int,
    user_id: int
) -> Optional[RackRequest]:
    request = db.query(RackRequest).filter(RackRequest.id == request_id).first()
    if not request:
        return None

    if request.status != RackRequestStatus.PENDING:
        raise ValueError("只有待审批状态的申请单可以批准")

    old_status = request.status.value
    request.status = RackRequestStatus.APPROVED
    request.approved_by = user_id
    request.approved_at = datetime.utcnow()

    create_audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.APPROVE,
        rack_request_id=request.id,
        old_value=old_status,
        new_value=RackRequestStatus.APPROVED.value,
        remark="上架申请单已批准"
    )

    return request


def reject_rack_request(
    db: Session,
    request_id: int,
    user_id: int,
    reject_reason: str
) -> Optional[RackRequest]:
    request = db.query(RackRequest).filter(RackRequest.id == request_id).first()
    if not request:
        return None

    if request.status != RackRequestStatus.PENDING:
        raise ValueError("只有待审批状态的申请单可以驳回")

    old_status = request.status.value
    request.status = RackRequestStatus.REJECTED
    request.reject_reason = reject_reason

    if request.planned_pdu_port_ids:
        pdu_port = db.query(PDUPort).filter(PDUPort.id == request.planned_pdu_port_ids).first()
        if pdu_port and pdu_port.occupied_by == request.id:
            pdu_port.is_occupied = False
            pdu_port.occupied_by = None
            pdu_port.power_draw_watts = 0

    if request.planned_switch_port_ids:
        switch_port = db.query(SwitchPort).filter(SwitchPort.id == request.planned_switch_port_ids).first()
        if switch_port and switch_port.occupied_by == request.id:
            switch_port.is_occupied = False
            switch_port.occupied_by = None

    create_audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.REJECT,
        rack_request_id=request.id,
        old_value=old_status,
        new_value=RackRequestStatus.REJECTED.value,
        remark=f"驳回原因: {reject_reason}"
    )

    return request


def start_construction(
    db: Session,
    request_id: int,
    user_id: int
) -> Optional[RackRequest]:
    request = db.query(RackRequest).filter(RackRequest.id == request_id).first()
    if not request:
        return None

    if request.status != RackRequestStatus.APPROVED:
        raise ValueError("只有已批准状态的申请单可以开始施工")

    old_status = request.status.value
    request.status = RackRequestStatus.IN_PROGRESS
    request.construction_user_id = user_id

    create_audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.START_CONSTRUCTION,
        rack_request_id=request.id,
        old_value=old_status,
        new_value=RackRequestStatus.IN_PROGRESS.value,
        remark="开始上架施工"
    )

    return request


def complete_construction(
    db: Session,
    request_id: int,
    user_id: int,
    actual_u_start: int,
    actual_pdu_port_ids: int,
    actual_switch_port_ids: int,
    completion_remark: Optional[str] = None
) -> Optional[RackRequest]:
    request = db.query(RackRequest).filter(RackRequest.id == request_id).first()
    if not request:
        return None

    if request.status != RackRequestStatus.IN_PROGRESS:
        raise ValueError("只有施工中状态的申请单可以完成施工")

    device_model = db.query(DeviceModel).filter(
        DeviceModel.id == request.device_model_id
    ).first()

    actual_u_end = actual_u_start + device_model.height_u - 1

    u_errors = validate_u_position(
        db=db,
        cabinet_id=request.cabinet_id,
        u_start=actual_u_start,
        u_height=device_model.height_u,
        exclude_request_id=request.id
    )
    if u_errors:
        raise ValueError(f"实际U位校验失败: {[e.message for e in u_errors]}")

    new_pdu_port = db.query(PDUPort).filter(PDUPort.id == actual_pdu_port_ids).first()
    if not new_pdu_port:
        raise ValueError(f"PDU端口 ID {actual_pdu_port_ids} 不存在")
    if new_pdu_port.is_occupied and new_pdu_port.occupied_by != request.id:
        raise ValueError(f"PDU端口 {new_pdu_port.pdu.name}-{new_pdu_port.port_number} 已被占用")

    new_switch_port = db.query(SwitchPort).filter(SwitchPort.id == actual_switch_port_ids).first()
    if not new_switch_port:
        raise ValueError(f"交换机端口 ID {actual_switch_port_ids} 不存在")
    if new_switch_port.is_occupied and new_switch_port.occupied_by != request.id:
        raise ValueError(f"交换机端口 {new_switch_port.switch.name}-{new_switch_port.port_number} 已被占用")

    if request.planned_pdu_port_ids and request.planned_pdu_port_ids != actual_pdu_port_ids:
        old_pdu_port = db.query(PDUPort).filter(PDUPort.id == request.planned_pdu_port_ids).first()
        if old_pdu_port and old_pdu_port.occupied_by == request.id:
            old_pdu_port.is_occupied = False
            old_pdu_port.occupied_by = None
            old_pdu_port.power_draw_watts = 0

    if request.planned_switch_port_ids and request.planned_switch_port_ids != actual_switch_port_ids:
        old_switch_port = db.query(SwitchPort).filter(SwitchPort.id == request.planned_switch_port_ids).first()
        if old_switch_port and old_switch_port.occupied_by == request.id:
            old_switch_port.is_occupied = False
            old_switch_port.occupied_by = None

    new_pdu_port.is_occupied = True
    new_pdu_port.occupied_by = request.id
    new_pdu_port.power_draw_watts = request.power_draw_watts

    new_switch_port.is_occupied = True
    new_switch_port.occupied_by = request.id

    old_status = request.status.value
    request.status = RackRequestStatus.COMPLETED
    request.actual_u_start = actual_u_start
    request.actual_u_end = actual_u_end
    request.actual_pdu_port_ids = actual_pdu_port_ids
    request.actual_switch_port_ids = actual_switch_port_ids
    request.completed_at = datetime.utcnow()
    request.completion_remark = completion_remark

    create_audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.COMPLETE_CONSTRUCTION,
        rack_request_id=request.id,
        old_value=old_status,
        new_value=f"status=completed, u_start={actual_u_start}, u_end={actual_u_end}, pdu_port={actual_pdu_port_ids}, switch_port={actual_switch_port_ids}",
        remark=completion_remark or "上架施工完成"
    )

    return request


def build_request_response(
    db: Session,
    request: RackRequest,
    validation_errors: Optional[List[ValidationErrorResponse]] = None
) -> RackRequestResponse:
    device_model = db.query(DeviceModel).filter(
        DeviceModel.id == request.device_model_id
    ).first()
    cabinet = db.query(Cabinet).filter(Cabinet.id == request.cabinet_id).first()
    creator = db.query(User).filter(User.id == request.created_by).first()
    approver = db.query(User).filter(User.id == request.approved_by).first() if request.approved_by else None

    return RackRequestResponse(
        id=request.id,
        request_no=request.request_no,
        device_model_id=request.device_model_id,
        device_name=request.device_name,
        serial_number=request.serial_number,
        cabinet_id=request.cabinet_id,
        cabinet_name=cabinet.name if cabinet else None,
        planned_u_start=request.planned_u_start,
        planned_u_end=request.planned_u_end,
        actual_u_start=request.actual_u_start,
        actual_u_end=request.actual_u_end,
        power_draw_watts=request.power_draw_watts,
        planned_pdu_port_ids=request.planned_pdu_port_ids,
        actual_pdu_port_ids=request.actual_pdu_port_ids,
        planned_switch_port_ids=request.planned_switch_port_ids,
        actual_switch_port_ids=request.actual_switch_port_ids,
        status=request.status,
        reject_reason=request.reject_reason,
        construction_date=request.construction_date,
        completed_at=request.completed_at,
        decommissioned_at=request.decommissioned_at,
        created_by=request.created_by,
        creator_name=creator.full_name if creator else None,
        created_at=request.created_at,
        approved_by=request.approved_by,
        approver_name=approver.full_name if approver else None,
        approved_at=request.approved_at,
        completion_remark=request.completion_remark,
        decommission_remark=request.decommission_remark,
        validation_errors=[{"code": e.code, "message": e.message, "details": e.details} for e in validation_errors] if validation_errors else None
    )
