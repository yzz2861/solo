from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_active_user, require_admin, require_all_roles
from ..models import User, Cabinet, PDU, PDUPort, Switch, SwitchPort
from ..schemas import (
    CabinetCreate,
    CabinetUpdate,
    CabinetResponse,
    PDUCreate,
    PDUResponse,
    PDUPortCreate,
    PDUPortResponse,
    SwitchCreate,
    SwitchResponse,
    SwitchPortCreate,
    SwitchPortResponse,
    DeviceModelCreate,
    DeviceModelResponse,
)
from ..models import DeviceModel

router = APIRouter(prefix="/api", tags=["基础资源"])


@router.post("/cabinets", response_model=CabinetResponse)
async def create_cabinet(
    cabinet_data: CabinetCreate,
    db: Session = Depends(get_db),
    current_user: User = require_admin
):
    existing = db.query(Cabinet).filter(Cabinet.name == cabinet_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"机柜名称 {cabinet_data.name} 已存在")

    cabinet = Cabinet(**cabinet_data.model_dump())
    db.add(cabinet)
    db.commit()
    db.refresh(cabinet)
    return cabinet


@router.get("/cabinets", response_model=List[CabinetResponse])
async def list_cabinets(
    location: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    query = db.query(Cabinet)
    if location:
        query = query.filter(Cabinet.location.like(f"%{location}%"))
    return query.order_by(Cabinet.name).all()


@router.get("/cabinets/{cabinet_id}", response_model=CabinetResponse)
async def get_cabinet(
    cabinet_id: int,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    cabinet = db.query(Cabinet).filter(Cabinet.id == cabinet_id).first()
    if not cabinet:
        raise HTTPException(status_code=404, detail="机柜不存在")
    return cabinet


@router.put("/cabinets/{cabinet_id}", response_model=CabinetResponse)
async def update_cabinet(
    cabinet_id: int,
    update_data: CabinetUpdate,
    db: Session = Depends(get_db),
    current_user: User = require_admin
):
    cabinet = db.query(Cabinet).filter(Cabinet.id == cabinet_id).first()
    if not cabinet:
        raise HTTPException(status_code=404, detail="机柜不存在")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(cabinet, key, value)

    db.commit()
    db.refresh(cabinet)
    return cabinet


@router.post("/pdus", response_model=PDUResponse)
async def create_pdu(
    pdu_data: PDUCreate,
    db: Session = Depends(get_db),
    current_user: User = require_admin
):
    cabinet = db.query(Cabinet).filter(Cabinet.id == pdu_data.cabinet_id).first()
    if not cabinet:
        raise HTTPException(status_code=404, detail="机柜不存在")

    existing = db.query(PDU).filter(
        PDU.cabinet_id == pdu_data.cabinet_id,
        PDU.name == pdu_data.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"该机柜中已存在名为 {pdu_data.name} 的PDU")

    pdu = PDU(**pdu_data.model_dump())
    db.add(pdu)
    db.commit()
    db.refresh(pdu)

    for port_num in range(1, pdu.total_ports + 1):
        port = PDUPort(pdu_id=pdu.id, port_number=port_num)
        db.add(port)
    db.commit()

    return pdu


@router.get("/cabinets/{cabinet_id}/pdus", response_model=List[PDUResponse])
async def list_cabinet_pdus(
    cabinet_id: int,
    include_ports: bool = False,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    pdus = db.query(PDU).filter(PDU.cabinet_id == cabinet_id).all()
    result = []
    for pdu in pdus:
        pdu_dict = PDUResponse.model_validate(pdu).model_dump()
        if include_ports:
            used_ports = db.query(PDUPort).filter(
                PDUPort.pdu_id == pdu.id,
                PDUPort.is_occupied == True
            ).count()
            pdu_dict["used_ports"] = used_ports
        result.append(PDUResponse(**pdu_dict))
    return result


@router.get("/pdu-ports/{port_id}", response_model=PDUPortResponse)
async def get_pdu_port(
    port_id: int,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    port = db.query(PDUPort).filter(PDUPort.id == port_id).first()
    if not port:
        raise HTTPException(status_code=404, detail="PDU端口不存在")
    return port


@router.get("/pdus/{pdu_id}/ports", response_model=List[PDUPortResponse])
async def list_pdu_ports(
    pdu_id: int,
    available_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    query = db.query(PDUPort).filter(PDUPort.pdu_id == pdu_id)
    if available_only:
        query = query.filter(PDUPort.is_occupied == False)
    return query.order_by(PDUPort.port_number).all()


@router.post("/switches", response_model=SwitchResponse)
async def create_switch(
    switch_data: SwitchCreate,
    db: Session = Depends(get_db),
    current_user: User = require_admin
):
    cabinet = db.query(Cabinet).filter(Cabinet.id == switch_data.cabinet_id).first()
    if not cabinet:
        raise HTTPException(status_code=404, detail="机柜不存在")

    existing = db.query(Switch).filter(
        Switch.cabinet_id == switch_data.cabinet_id,
        Switch.name == switch_data.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"该机柜中已存在名为 {switch_data.name} 的交换机")

    switch = Switch(**switch_data.model_dump())
    db.add(switch)
    db.commit()
    db.refresh(switch)

    for port_num in range(1, switch.total_ports + 1):
        port = SwitchPort(switch_id=switch.id, port_number=port_num)
        db.add(port)
    db.commit()

    return switch


@router.get("/cabinets/{cabinet_id}/switches", response_model=List[SwitchResponse])
async def list_cabinet_switches(
    cabinet_id: int,
    include_ports: bool = False,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    switches = db.query(Switch).filter(Switch.cabinet_id == cabinet_id).all()
    result = []
    for switch in switches:
        switch_dict = SwitchResponse.model_validate(switch).model_dump()
        if include_ports:
            used_ports = db.query(SwitchPort).filter(
                SwitchPort.switch_id == switch.id,
                SwitchPort.is_occupied == True
            ).count()
            switch_dict["used_ports"] = used_ports
        result.append(SwitchResponse(**switch_dict))
    return result


@router.get("/switch-ports/{port_id}", response_model=SwitchPortResponse)
async def get_switch_port(
    port_id: int,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    port = db.query(SwitchPort).filter(SwitchPort.id == port_id).first()
    if not port:
        raise HTTPException(status_code=404, detail="交换机端口不存在")
    return port


@router.get("/switches/{switch_id}/ports", response_model=List[SwitchPortResponse])
async def list_switch_ports(
    switch_id: int,
    available_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    query = db.query(SwitchPort).filter(SwitchPort.switch_id == switch_id)
    if available_only:
        query = query.filter(SwitchPort.is_occupied == False)
    return query.order_by(SwitchPort.port_number).all()


@router.post("/device-models", response_model=DeviceModelResponse)
async def create_device_model(
    model_data: DeviceModelCreate,
    db: Session = Depends(get_db),
    current_user: User = require_admin
):
    existing = db.query(DeviceModel).filter(
        DeviceModel.brand == model_data.brand,
        DeviceModel.model == model_data.model
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"设备型号 {model_data.brand} {model_data.model} 已存在")

    device_model = DeviceModel(**model_data.model_dump())
    db.add(device_model)
    db.commit()
    db.refresh(device_model)
    return device_model


@router.get("/device-models", response_model=List[DeviceModelResponse])
async def list_device_models(
    brand: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    query = db.query(DeviceModel)
    if brand:
        query = query.filter(DeviceModel.brand.like(f"%{brand}%"))
    return query.order_by(DeviceModel.brand, DeviceModel.model).all()


@router.get("/device-models/{model_id}", response_model=DeviceModelResponse)
async def get_device_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    device_model = db.query(DeviceModel).filter(DeviceModel.id == model_id).first()
    if not device_model:
        raise HTTPException(status_code=404, detail="设备型号不存在")
    return device_model
