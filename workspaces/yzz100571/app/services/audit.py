from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from ..models import (
    AuditLog,
    AuditAction,
    User,
    RackRequest,
    RackRequestStatus,
    PDUPort,
    SwitchPort,
)


def create_audit_log(
    db: Session,
    user_id: int,
    action: AuditAction,
    rack_request_id: Optional[int] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    remark: Optional[str] = None,
    is_abnormal_release: bool = False
) -> AuditLog:
    audit_log = AuditLog(
        rack_request_id=rack_request_id,
        user_id=user_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        remark=remark,
        is_abnormal_release=is_abnormal_release
    )
    db.add(audit_log)
    db.flush()
    return audit_log


def release_pdu_port(
    db: Session,
    port_id: int,
    user_id: int,
    request_id: Optional[int] = None,
    remark: Optional[str] = None,
    is_abnormal: bool = False
) -> Optional[PDUPort]:
    port = db.query(PDUPort).filter(PDUPort.id == port_id).first()
    if not port:
        return None

    if not port.is_occupied:
        return port

    if request_id and port.occupied_by != request_id:
        raise ValueError("该PDU端口不属于指定的申请单")

    old_status = "occupied"
    port.is_occupied = False
    port.occupied_by = None
    port.power_draw_watts = 0
    port.released_at = datetime.utcnow()
    port.release_remark = remark

    create_audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.RELEASE_RESOURCE,
        rack_request_id=request_id,
        old_value=f"PDU_PORT_{port_id}_{old_status}",
        new_value=f"PDU_PORT_{port_id}_released",
        remark=remark or f"释放PDU端口 {port.pdu.name}-{port.port_number}",
        is_abnormal_release=is_abnormal
    )

    return port


def release_switch_port(
    db: Session,
    port_id: int,
    user_id: int,
    request_id: Optional[int] = None,
    remark: Optional[str] = None,
    is_abnormal: bool = False
) -> Optional[SwitchPort]:
    port = db.query(SwitchPort).filter(SwitchPort.id == port_id).first()
    if not port:
        return None

    if not port.is_occupied:
        return port

    if request_id and port.occupied_by != request_id:
        raise ValueError("该交换机端口不属于指定的申请单")

    old_status = "occupied"
    port.is_occupied = False
    port.occupied_by = None
    port.released_at = datetime.utcnow()
    port.release_remark = remark

    create_audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.RELEASE_RESOURCE,
        rack_request_id=request_id,
        old_value=f"SWITCH_PORT_{port_id}_{old_status}",
        new_value=f"SWITCH_PORT_{port_id}_released",
        remark=remark or f"释放交换机端口 {port.switch.name}-{port.port_number}",
        is_abnormal_release=is_abnormal
    )

    return port


def decommission_rack_request(
    db: Session,
    request_id: int,
    user_id: int,
    decommission_remark: str,
    release_pdu_remark: Optional[str] = None,
    release_switch_remark: Optional[str] = None
) -> Optional[RackRequest]:
    request = db.query(RackRequest).filter(RackRequest.id == request_id).first()
    if not request:
        return None

    if request.status == RackRequestStatus.DECOMMISSIONED:
        raise ValueError("该设备已下架")

    if request.status not in [RackRequestStatus.COMPLETED, RackRequestStatus.APPROVED, RackRequestStatus.IN_PROGRESS]:
        raise ValueError("只有已完成、已批准或施工中的申请单才能执行下架操作")

    is_abnormal = request.status != RackRequestStatus.COMPLETED

    old_status = request.status.value

    if request.actual_pdu_port_ids:
        release_pdu_port(
            db=db,
            port_id=request.actual_pdu_port_ids,
            user_id=user_id,
            request_id=request_id,
            remark=release_pdu_remark,
            is_abnormal=is_abnormal
        )

    if request.actual_switch_port_ids:
        release_switch_port(
            db=db,
            port_id=request.actual_switch_port_ids,
            user_id=user_id,
            request_id=request_id,
            remark=release_switch_remark,
            is_abnormal=is_abnormal
        )

    if request.planned_pdu_port_ids and not request.actual_pdu_port_ids:
        release_pdu_port(
            db=db,
            port_id=request.planned_pdu_port_ids,
            user_id=user_id,
            request_id=request_id,
            remark=release_pdu_remark or "释放计划PDU端口",
            is_abnormal=True
        )

    if request.planned_switch_port_ids and not request.actual_switch_port_ids:
        release_switch_port(
            db=db,
            port_id=request.planned_switch_port_ids,
            user_id=user_id,
            request_id=request_id,
            remark=release_switch_remark or "释放计划交换机端口",
            is_abnormal=True
        )

    request.status = RackRequestStatus.DECOMMISSIONED
    request.decommissioned_at = datetime.utcnow()
    request.decommission_remark = decommission_remark

    create_audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.DECOMMISSION,
        rack_request_id=request_id,
        old_value=old_status,
        new_value=RackRequestStatus.DECOMMISSIONED.value,
        remark=decommission_remark,
        is_abnormal_release=is_abnormal
    )

    return request
