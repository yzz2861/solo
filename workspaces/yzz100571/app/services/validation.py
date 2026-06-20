from typing import List, Optional, Tuple
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..models import (
    Cabinet,
    PDUPort,
    SwitchPort,
    RackRequest,
    RackRequestStatus,
    DeviceModel,
)
from ..schemas import ValidationErrorResponse, ResourceCheckResponse


def validate_u_position(
    db: Session,
    cabinet_id: int,
    u_start: int,
    u_height: int,
    exclude_request_id: Optional[int] = None
) -> List[ValidationErrorResponse]:
    errors = []
    u_end = u_start + u_height - 1

    cabinet = db.query(Cabinet).filter(Cabinet.id == cabinet_id).first()
    if not cabinet:
        errors.append(ValidationErrorResponse(
            type="error",
            code="CABINET_NOT_FOUND",
            message=f"机柜 ID {cabinet_id} 不存在",
        ))
        return errors

    if u_start < 1:
        errors.append(ValidationErrorResponse(
            type="error",
            code="U_POSITION_INVALID",
            message=f"U位起始位置不能小于1，当前为 {u_start}",
            details={"u_start": u_start}
        ))
        return errors

    if u_end > cabinet.total_u:
        errors.append(ValidationErrorResponse(
            type="error",
            code="U_POSITION_EXCEEDS_CABINET",
            message=f"U位范围 {u_start}-{u_end} 超出机柜总U位 {cabinet.total_u}",
            details={
                "u_start": u_start,
                "u_end": u_end,
                "cabinet_total_u": cabinet.total_u
            }
        ))
        return errors

    conflict_query = db.query(RackRequest).filter(
        RackRequest.cabinet_id == cabinet_id,
        RackRequest.status.in_([
            RackRequestStatus.APPROVED,
            RackRequestStatus.IN_PROGRESS,
            RackRequestStatus.COMPLETED,
            RackRequestStatus.PENDING,
        ]),
        or_(
            and_(
                RackRequest.actual_u_start.isnot(None),
                RackRequest.actual_u_start <= u_end,
                (RackRequest.actual_u_start + DeviceModel.height_u - 1) >= u_start
            ),
            and_(
                RackRequest.actual_u_start.is_(None),
                RackRequest.planned_u_start <= u_end,
                (RackRequest.planned_u_start + DeviceModel.height_u - 1) >= u_start
            )
        )
    ).join(DeviceModel, RackRequest.device_model_id == DeviceModel.id)

    if exclude_request_id:
        conflict_query = conflict_query.filter(RackRequest.id != exclude_request_id)

    conflicts = conflict_query.all()

    for conflict in conflicts:
        if conflict.actual_u_start:
            conflict_u_start = conflict.actual_u_start
            conflict_u_end = conflict.actual_u_start + conflict.device_model.height_u - 1
        else:
            conflict_u_start = conflict.planned_u_start
            conflict_u_end = conflict.planned_u_start + conflict.device_model.height_u - 1

        errors.append(ValidationErrorResponse(
            type="error",
            code="U_POSITION_CONFLICT",
            message=f"U位 {u_start}-{u_end} 与申请单 {conflict.request_no} 的U位 {conflict_u_start}-{conflict_u_end} 冲突",
            details={
                "conflict_request_id": conflict.id,
                "conflict_request_no": conflict.request_no,
                "conflict_u_start": conflict_u_start,
                "conflict_u_end": conflict_u_end,
                "conflict_status": conflict.status.value,
                "requested_u_start": u_start,
                "requested_u_end": u_end
            }
        ))

    return errors


def validate_power_capacity(
    db: Session,
    cabinet_id: int,
    power_watts: int,
    exclude_request_id: Optional[int] = None
) -> List[ValidationErrorResponse]:
    errors = []

    cabinet = db.query(Cabinet).filter(Cabinet.id == cabinet_id).first()
    if not cabinet:
        errors.append(ValidationErrorResponse(
            type="error",
            code="CABINET_NOT_FOUND",
            message=f"机柜 ID {cabinet_id} 不存在",
        ))
        return errors

    used_power_query = db.query(RackRequest).filter(
        RackRequest.cabinet_id == cabinet_id,
        RackRequest.status.in_([
            RackRequestStatus.APPROVED,
            RackRequestStatus.IN_PROGRESS,
            RackRequestStatus.COMPLETED,
            RackRequestStatus.PENDING,
        ])
    )

    if exclude_request_id:
        used_power_query = used_power_query.filter(RackRequest.id != exclude_request_id)

    used_power = sum(r.power_draw_watts for r in used_power_query.all())
    total_power = used_power + power_watts

    if total_power > cabinet.max_power_watts:
        errors.append(ValidationErrorResponse(
            type="error",
            code="POWER_EXCEEDS_CAPACITY",
            message=f"供电超额：当前已使用 {used_power}W，新增 {power_watts}W，"
                    f"总计 {total_power}W 超过机柜最大容量 {cabinet.max_power_watts}W",
            details={
                "cabinet_id": cabinet_id,
                "cabinet_name": cabinet.name,
                "current_used_power": used_power,
                "requested_power": power_watts,
                "total_power": total_power,
                "max_power": cabinet.max_power_watts,
                "exceeded_by": total_power - cabinet.max_power_watts
            }
        ))

    return errors


def validate_pdu_port(
    db: Session,
    pdu_port_id: int,
    cabinet_id: int,
    exclude_request_id: Optional[int] = None
) -> List[ValidationErrorResponse]:
    errors = []

    pdu_port = db.query(PDUPort).filter(PDUPort.id == pdu_port_id).first()
    if not pdu_port:
        errors.append(ValidationErrorResponse(
            type="error",
            code="PDU_PORT_NOT_FOUND",
            message=f"PDU端口 ID {pdu_port_id} 不存在",
        ))
        return errors

    if pdu_port.pdu.cabinet_id != cabinet_id:
        errors.append(ValidationErrorResponse(
            type="error",
            code="PDU_PORT_WRONG_CABINET",
            message=f"PDU端口 {pdu_port.pdu.name}-{pdu_port.port_number} 不属于机柜 ID {cabinet_id}",
            details={
                "pdu_port_id": pdu_port_id,
                "pdu_cabinet_id": pdu_port.pdu.cabinet_id,
                "requested_cabinet_id": cabinet_id
            }
        ))
        return errors

    if pdu_port.is_occupied:
        if exclude_request_id and pdu_port.occupied_by == exclude_request_id:
            pass
        else:
            occupied_request = db.query(RackRequest).filter(
                RackRequest.id == pdu_port.occupied_by
            ).first()
            errors.append(ValidationErrorResponse(
                type="error",
                code="PDU_PORT_OCCUPIED",
                message=f"PDU端口 {pdu_port.pdu.name}-{pdu_port.port_number} 已被占用",
                details={
                    "pdu_port_id": pdu_port_id,
                    "pdu_name": pdu_port.pdu.name,
                    "port_number": pdu_port.port_number,
                    "occupied_by": pdu_port.occupied_by,
                    "occupied_by_request_no": occupied_request.request_no if occupied_request else None,
                    "occupied_by_status": occupied_request.status.value if occupied_request else None
                }
            ))

    return errors


def validate_switch_port(
    db: Session,
    switch_port_id: int,
    cabinet_id: int,
    exclude_request_id: Optional[int] = None
) -> List[ValidationErrorResponse]:
    errors = []

    switch_port = db.query(SwitchPort).filter(SwitchPort.id == switch_port_id).first()
    if not switch_port:
        errors.append(ValidationErrorResponse(
            type="error",
            code="SWITCH_PORT_NOT_FOUND",
            message=f"交换机端口 ID {switch_port_id} 不存在",
        ))
        return errors

    if switch_port.switch.cabinet_id != cabinet_id:
        errors.append(ValidationErrorResponse(
            type="error",
            code="SWITCH_PORT_WRONG_CABINET",
            message=f"交换机端口 {switch_port.switch.name}-{switch_port.port_number} 不属于机柜 ID {cabinet_id}",
            details={
                "switch_port_id": switch_port_id,
                "switch_cabinet_id": switch_port.switch.cabinet_id,
                "requested_cabinet_id": cabinet_id
            }
        ))
        return errors

    if switch_port.is_occupied:
        if exclude_request_id and switch_port.occupied_by == exclude_request_id:
            pass
        else:
            occupied_request = db.query(RackRequest).filter(
                RackRequest.id == switch_port.occupied_by
            ).first()
            errors.append(ValidationErrorResponse(
                type="error",
                code="SWITCH_PORT_OCCUPIED",
                message=f"交换机端口 {switch_port.switch.name}-{switch_port.port_number} 已被占用",
                details={
                    "switch_port_id": switch_port_id,
                    "switch_name": switch_port.switch.name,
                    "port_number": switch_port.port_number,
                    "occupied_by": switch_port.occupied_by,
                    "occupied_by_request_no": occupied_request.request_no if occupied_request else None,
                    "occupied_by_status": occupied_request.status.value if occupied_request else None
                }
            ))

    return errors


def check_resources(
    db: Session,
    cabinet_id: int,
    u_start: int,
    u_height: int,
    power_watts: int,
    pdu_port_id: Optional[int] = None,
    switch_port_id: Optional[int] = None,
    exclude_request_id: Optional[int] = None
) -> ResourceCheckResponse:
    errors = []
    warnings = []

    errors.extend(validate_u_position(db, cabinet_id, u_start, u_height, exclude_request_id))
    errors.extend(validate_power_capacity(db, cabinet_id, power_watts, exclude_request_id))

    if pdu_port_id:
        errors.extend(validate_pdu_port(db, pdu_port_id, cabinet_id, exclude_request_id))

    if switch_port_id:
        errors.extend(validate_switch_port(db, switch_port_id, cabinet_id, exclude_request_id))

    cabinet = db.query(Cabinet).filter(Cabinet.id == cabinet_id).first()
    if cabinet:
        used_power_query = db.query(RackRequest).filter(
            RackRequest.cabinet_id == cabinet_id,
            RackRequest.status.in_([
                RackRequestStatus.APPROVED,
                RackRequestStatus.IN_PROGRESS,
                RackRequestStatus.COMPLETED,
                RackRequestStatus.PENDING,
            ])
        )
        if exclude_request_id:
            used_power_query = used_power_query.filter(RackRequest.id != exclude_request_id)

        used_power = sum(r.power_draw_watts for r in used_power_query.all())
        total_power = used_power + power_watts
        utilization_rate = (total_power / cabinet.max_power_watts) * 100

        if utilization_rate > 80:
            warnings.append(ValidationErrorResponse(
                type="warning",
                code="POWER_UTILIZATION_HIGH",
                message=f"机柜功率利用率达到 {utilization_rate:.1f}%，建议关注",
                details={
                    "utilization_rate": utilization_rate,
                    "total_power": total_power,
                    "max_power": cabinet.max_power_watts
                }
            ))

    return ResourceCheckResponse(
        available=len(errors) == 0,
        errors=errors,
        warnings=warnings
    )
