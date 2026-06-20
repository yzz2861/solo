import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models import RackRequest, RackRequestStatus, DeviceModel, PDUPort, SwitchPort, Cabinet
from app.services.validation import (
    validate_u_position,
    validate_power_capacity,
    validate_pdu_port,
    validate_switch_port,
    check_resources,
)
from .conftest import get_auth_headers


class TestUPositionValidation:
    def test_u_position_basic(self, db_session, test_cabinet, test_device_model):
        errors = validate_u_position(
            db=db_session,
            cabinet_id=test_cabinet.id,
            u_start=1,
            u_height=2
        )
        assert len(errors) == 0

    def test_u_position_start_invalid(self, db_session, test_cabinet, test_device_model):
        errors = validate_u_position(
            db=db_session,
            cabinet_id=test_cabinet.id,
            u_start=0,
            u_height=2
        )
        assert len(errors) == 1
        assert errors[0].code == "U_POSITION_INVALID"

    def test_u_position_exceeds_cabinet(self, db_session, test_cabinet, test_device_model):
        errors = validate_u_position(
            db=db_session,
            cabinet_id=test_cabinet.id,
            u_start=42,
            u_height=2
        )
        assert len(errors) == 1
        assert errors[0].code == "U_POSITION_EXCEEDS_CABINET"

    def test_u_position_conflict(self, db_session, test_cabinet, test_device_model, test_users):
        existing_request = RackRequest(
            request_no="RK202606200001",
            device_model_id=test_device_model.id,
            device_name="测试服务器",
            cabinet_id=test_cabinet.id,
            planned_u_start=5,
            planned_u_end=6,
            power_draw_watts=750,
            created_by=test_users[1].id,
            status=RackRequestStatus.APPROVED
        )
        db_session.add(existing_request)
        db_session.commit()

        errors = validate_u_position(
            db=db_session,
            cabinet_id=test_cabinet.id,
            u_start=6,
            u_height=2
        )
        assert len(errors) == 1
        assert errors[0].code == "U_POSITION_CONFLICT"
        assert "U位 6-7" in errors[0].message

    def test_u_position_no_conflict_excluded_request(self, db_session, test_cabinet, test_device_model, test_users):
        existing_request = RackRequest(
            request_no="RK202606200002",
            device_model_id=test_device_model.id,
            device_name="测试服务器",
            cabinet_id=test_cabinet.id,
            planned_u_start=5,
            planned_u_end=6,
            power_draw_watts=750,
            created_by=test_users[1].id,
            status=RackRequestStatus.DRAFT
        )
        db_session.add(existing_request)
        db_session.commit()

        errors = validate_u_position(
            db=db_session,
            cabinet_id=test_cabinet.id,
            u_start=5,
            u_height=2,
            exclude_request_id=existing_request.id
        )
        assert len(errors) == 0

    def test_u_position_actual_conflict(self, db_session, test_cabinet, test_device_model, test_users):
        existing_request = RackRequest(
            request_no="RK202606200003",
            device_model_id=test_device_model.id,
            device_name="测试服务器",
            cabinet_id=test_cabinet.id,
            planned_u_start=1,
            planned_u_end=2,
            actual_u_start=10,
            actual_u_end=11,
            power_draw_watts=750,
            created_by=test_users[1].id,
            status=RackRequestStatus.COMPLETED
        )
        db_session.add(existing_request)
        db_session.commit()

        errors = validate_u_position(
            db=db_session,
            cabinet_id=test_cabinet.id,
            u_start=11,
            u_height=2
        )
        assert len(errors) == 1
        assert errors[0].code == "U_POSITION_CONFLICT"


class TestPowerCapacityValidation:
    def test_power_ok(self, db_session, test_cabinet):
        errors = validate_power_capacity(
            db=db_session,
            cabinet_id=test_cabinet.id,
            power_watts=1000
        )
        assert len(errors) == 0

    def test_power_exceeds(self, db_session, test_cabinet, test_device_model, test_users):
        for i in range(7):
            req = RackRequest(
                request_no=f"RK2026062000{i+10}",
                device_model_id=test_device_model.id,
                device_name=f"服务器{i+1}",
                cabinet_id=test_cabinet.id,
                planned_u_start=i*2 + 1,
                planned_u_end=i*2 + 2,
                power_draw_watts=750,
                created_by=test_users[1].id,
                status=RackRequestStatus.APPROVED
            )
            db_session.add(req)
        db_session.commit()

        errors = validate_power_capacity(
            db=db_session,
            cabinet_id=test_cabinet.id,
            power_watts=1000
        )
        assert len(errors) == 1
        assert errors[0].code == "POWER_EXCEEDS_CAPACITY"
        assert "总计 6250W 超过机柜最大容量 5000W" in errors[0].message

    def test_power_excludes_draft(self, db_session, test_cabinet, test_device_model, test_users):
        draft_req = RackRequest(
            request_no="RK202606200020",
            device_model_id=test_device_model.id,
            device_name="草稿服务器",
            cabinet_id=test_cabinet.id,
            planned_u_start=1,
            planned_u_end=2,
            power_draw_watts=6000,
            created_by=test_users[1].id,
            status=RackRequestStatus.DRAFT
        )
        db_session.add(draft_req)
        db_session.commit()

        errors = validate_power_capacity(
            db=db_session,
            cabinet_id=test_cabinet.id,
            power_watts=1000
        )
        assert len(errors) == 0


class TestPDUPortValidation:
    def test_pdu_port_available(self, db_session, test_pdu, test_cabinet):
        port = db_session.query(PDUPort).filter(
            PDUPort.pdu_id == test_pdu.id,
            PDUPort.port_number == 1
        ).first()

        errors = validate_pdu_port(
            db=db_session,
            pdu_port_id=port.id,
            cabinet_id=test_cabinet.id
        )
        assert len(errors) == 0

    def test_pdu_port_occupied(self, db_session, test_pdu, test_cabinet, test_users, test_device_model):
        port = db_session.query(PDUPort).filter(
            PDUPort.pdu_id == test_pdu.id,
            PDUPort.port_number == 2
        ).first()

        existing_request = RackRequest(
            request_no="RK202606200030",
            device_model_id=test_device_model.id,
            device_name="占用服务器",
            cabinet_id=test_cabinet.id,
            planned_u_start=1,
            planned_u_end=2,
            power_draw_watts=750,
            created_by=test_users[1].id,
            status=RackRequestStatus.APPROVED
        )
        db_session.add(existing_request)
        db_session.flush()

        port.is_occupied = True
        port.occupied_by = existing_request.id
        db_session.commit()

        errors = validate_pdu_port(
            db=db_session,
            pdu_port_id=port.id,
            cabinet_id=test_cabinet.id
        )
        assert len(errors) == 1
        assert errors[0].code == "PDU_PORT_OCCUPIED"

    def test_pdu_port_wrong_cabinet(self, db_session, test_pdu, test_cabinet):
        other_cabinet = Cabinet(
            name="B01",
            location="机房1-B区",
            total_u=42,
            max_power_watts=5000
        )
        db_session.add(other_cabinet)
        db_session.commit()

        port = db_session.query(PDUPort).filter(
            PDUPort.pdu_id == test_pdu.id,
            PDUPort.port_number == 1
        ).first()

        errors = validate_pdu_port(
            db=db_session,
            pdu_port_id=port.id,
            cabinet_id=other_cabinet.id
        )
        assert len(errors) == 1
        assert errors[0].code == "PDU_PORT_WRONG_CABINET"


class TestSwitchPortValidation:
    def test_switch_port_available(self, db_session, test_switch, test_cabinet):
        port = db_session.query(SwitchPort).filter(
            SwitchPort.switch_id == test_switch.id,
            SwitchPort.port_number == 1
        ).first()

        errors = validate_switch_port(
            db=db_session,
            switch_port_id=port.id,
            cabinet_id=test_cabinet.id
        )
        assert len(errors) == 0

    def test_switch_port_occupied(self, db_session, test_switch, test_cabinet, test_users, test_device_model):
        port = db_session.query(SwitchPort).filter(
            SwitchPort.switch_id == test_switch.id,
            SwitchPort.port_number == 5
        ).first()

        existing_request = RackRequest(
            request_no="RK202606200040",
            device_model_id=test_device_model.id,
            device_name="占用服务器",
            cabinet_id=test_cabinet.id,
            planned_u_start=1,
            planned_u_end=2,
            power_draw_watts=750,
            created_by=test_users[1].id,
            status=RackRequestStatus.APPROVED
        )
        db_session.add(existing_request)
        db_session.flush()

        port.is_occupied = True
        port.occupied_by = existing_request.id
        db_session.commit()

        errors = validate_switch_port(
            db=db_session,
            switch_port_id=port.id,
            cabinet_id=test_cabinet.id
        )
        assert len(errors) == 1
        assert errors[0].code == "SWITCH_PORT_OCCUPIED"


class TestCheckResources:
    def test_all_available(self, db_session, test_cabinet, test_pdu, test_switch):
        pdu_port = db_session.query(PDUPort).filter(
            PDUPort.pdu_id == test_pdu.id,
            PDUPort.port_number == 1
        ).first()
        switch_port = db_session.query(SwitchPort).filter(
            SwitchPort.switch_id == test_switch.id,
            SwitchPort.port_number == 1
        ).first()

        result = check_resources(
            db=db_session,
            cabinet_id=test_cabinet.id,
            u_start=10,
            u_height=2,
            power_watts=500,
            pdu_port_id=pdu_port.id,
            switch_port_id=switch_port.id
        )

        assert result.available is True
        assert len(result.errors) == 0

    def test_multiple_errors(self, db_session, test_cabinet, test_pdu, test_switch, test_users, test_device_model):
        existing = RackRequest(
            request_no="RK202606200050",
            device_model_id=test_device_model.id,
            device_name="冲突服务器",
            cabinet_id=test_cabinet.id,
            planned_u_start=1,
            planned_u_end=2,
            power_draw_watts=750,
            created_by=test_users[1].id,
            status=RackRequestStatus.APPROVED
        )
        db_session.add(existing)
        db_session.commit()

        pdu_port = db_session.query(PDUPort).filter(
            PDUPort.pdu_id == test_pdu.id,
            PDUPort.port_number == 1
        ).first()
        pdu_port.is_occupied = True
        pdu_port.occupied_by = existing.id
        db_session.commit()

        result = check_resources(
            db=db_session,
            cabinet_id=test_cabinet.id,
            u_start=1,
            u_height=2,
            power_watts=1000,
            pdu_port_id=pdu_port.id,
        )

        assert result.available is False
        assert len(result.errors) >= 2
        error_codes = [e.code for e in result.errors]
        assert "U_POSITION_CONFLICT" in error_codes
        assert "PDU_PORT_OCCUPIED" in error_codes

    def test_power_warning(self, db_session, test_cabinet, test_device_model, test_users):
        for i in range(5):
            req = RackRequest(
                request_no=f"RK2026062000{i+60}",
                device_model_id=test_device_model.id,
                device_name=f"服务器{i+1}",
                cabinet_id=test_cabinet.id,
                planned_u_start=i*2 + 1,
                planned_u_end=i*2 + 2,
                power_draw_watts=750,
                created_by=test_users[1].id,
                status=RackRequestStatus.APPROVED
            )
            db_session.add(req)
        db_session.commit()

        result = check_resources(
            db=db_session,
            cabinet_id=test_cabinet.id,
            u_start=20,
            u_height=2,
            power_watts=500
        )

        assert result.available is True
        assert len(result.warnings) == 1
        assert result.warnings[0].code == "POWER_UTILIZATION_HIGH"
