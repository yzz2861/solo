import pytest
from datetime import datetime, timedelta

from app.models import RackRequest, RackRequestStatus, PDUPort, SwitchPort, AuditLog, AuditAction
from .conftest import get_auth_headers


class TestRackRequestWorkflow:
    def test_full_workflow_approved(self, client, db_session, test_users, test_cabinet,
                                   test_pdu, test_switch, test_device_model):
        op_headers = get_auth_headers(client, "operation")
        duty_headers = get_auth_headers(client, "duty")

        pdu_port = db_session.query(PDUPort).filter(
            PDUPort.pdu_id == test_pdu.id,
            PDUPort.port_number == 1
        ).first()
        switch_port = db_session.query(SwitchPort).filter(
            SwitchPort.switch_id == test_switch.id,
            SwitchPort.port_number == 1
        ).first()
        construction_date = datetime.utcnow().replace(microsecond=0)

        create_data = {
            "device_model_id": test_device_model.id,
            "device_name": "测试服务器-01",
            "serial_number": "SN202606200001",
            "cabinet_id": test_cabinet.id,
            "planned_u_start": 1,
            "power_draw_watts": 750,
            "planned_pdu_port_ids": pdu_port.id,
            "planned_switch_port_ids": switch_port.id,
            "construction_date": construction_date.isoformat()
        }
        response = client.post("/api/rack-requests", json=create_data, headers=op_headers)
        assert response.status_code == 200
        data = response.json()
        request_id = data["id"]
        assert data["status"] == "draft"
        assert data["planned_u_start"] == 1
        assert data["planned_u_end"] == 2
        assert data["validation_errors"] is None

        response = client.post(f"/api/rack-requests/{request_id}/submit", json={}, headers=op_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"

        db_session.refresh(pdu_port)
        assert pdu_port.is_occupied is True
        assert pdu_port.occupied_by == request_id

        db_session.refresh(switch_port)
        assert switch_port.is_occupied is True
        assert switch_port.occupied_by == request_id

        response = client.post(f"/api/rack-requests/{request_id}/approve", json={}, headers=op_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
        assert data["approver_name"] == "运维工程师"

        response = client.get("/api/rack-requests/today-construction", headers=duty_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == request_id

        response = client.post(f"/api/rack-requests/{request_id}/start-construction", json={}, headers=duty_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"

        actual_pdu_port = db_session.query(PDUPort).filter(
            PDUPort.pdu_id == test_pdu.id,
            PDUPort.port_number == 2
        ).first()
        actual_switch_port = db_session.query(SwitchPort).filter(
            SwitchPort.switch_id == test_switch.id,
            SwitchPort.port_number == 2
        ).first()

        complete_data = {
            "actual_u_start": 3,
            "actual_pdu_port_ids": actual_pdu_port.id,
            "actual_switch_port_ids": actual_switch_port.id,
            "completion_remark": "施工完成，实际位置调整到U3-U4"
        }
        response = client.post(f"/api/rack-requests/{request_id}/complete", json=complete_data, headers=duty_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["actual_u_start"] == 3
        assert data["actual_u_end"] == 4

        db_session.refresh(pdu_port)
        assert pdu_port.is_occupied is False

        db_session.refresh(actual_pdu_port)
        assert actual_pdu_port.is_occupied is True
        assert actual_pdu_port.occupied_by == request_id

        db_session.refresh(actual_switch_port)
        assert actual_switch_port.is_occupied is True
        assert actual_switch_port.occupied_by == request_id

        decommission_data = {
            "decommission_remark": "设备到期下架",
            "release_pdu_remark": "端口释放，正常下架",
            "release_switch_remark": "端口释放，正常下架"
        }
        response = client.post(f"/api/rack-requests/{request_id}/decommission", json=decommission_data, headers=op_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "decommissioned"

        db_session.refresh(actual_pdu_port)
        assert actual_pdu_port.is_occupied is False
        assert actual_pdu_port.released_at is not None

        db_session.refresh(actual_switch_port)
        assert actual_switch_port.is_occupied is False
        assert actual_switch_port.released_at is not None

        audit_logs = db_session.query(AuditLog).filter(
            AuditLog.rack_request_id == request_id
        ).order_by(AuditLog.created_at).all()
        assert len(audit_logs) >= 7
        actions = [log.action.value for log in audit_logs]
        assert "create" in actions
        assert "submit" in actions
        assert "approve" in actions
        assert "start_construction" in actions
        assert "complete_construction" in actions
        assert "decommission" in actions

    def test_submit_with_validation_errors(self, client, db_session, test_users, test_cabinet,
                                           test_pdu, test_switch, test_device_model):
        op_headers = get_auth_headers(client, "operation")

        pdu_port = db_session.query(PDUPort).filter(
            PDUPort.pdu_id == test_pdu.id,
            PDUPort.port_number == 1
        ).first()
        switch_port = db_session.query(SwitchPort).filter(
            SwitchPort.switch_id == test_switch.id,
            SwitchPort.port_number == 1
        ).first()

        existing_request = RackRequest(
            request_no="RK202606209999",
            device_model_id=test_device_model.id,
            device_name="已存在服务器",
            cabinet_id=test_cabinet.id,
            planned_u_start=1,
            planned_u_end=2,
            power_draw_watts=750,
            created_by=test_users[1].id,
            status=RackRequestStatus.APPROVED
        )
        db_session.add(existing_request)
        db_session.commit()

        create_data = {
            "device_model_id": test_device_model.id,
            "device_name": "冲突服务器",
            "cabinet_id": test_cabinet.id,
            "planned_u_start": 1,
            "power_draw_watts": 750,
            "planned_pdu_port_ids": pdu_port.id,
            "planned_switch_port_ids": switch_port.id
        }
        response = client.post("/api/rack-requests", json=create_data, headers=op_headers)
        assert response.status_code == 200
        data = response.json()
        request_id = data["id"]
        assert data["validation_errors"] is not None
        assert len(data["validation_errors"]) == 1
        assert data["validation_errors"][0]["code"] == "U_POSITION_CONFLICT"

        response = client.post(f"/api/rack-requests/{request_id}/submit", json={}, headers=op_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "draft"
        assert data["validation_errors"] is not None
        assert len(data["validation_errors"]) == 1

    def test_reject_request(self, client, db_session, test_users, test_cabinet,
                            test_pdu, test_switch, test_device_model):
        op_headers = get_auth_headers(client, "operation")

        pdu_port = db_session.query(PDUPort).filter(
            PDUPort.pdu_id == test_pdu.id,
            PDUPort.port_number == 5
        ).first()
        switch_port = db_session.query(SwitchPort).filter(
            SwitchPort.switch_id == test_switch.id,
            SwitchPort.port_number == 5
        ).first()

        create_data = {
            "device_model_id": test_device_model.id,
            "device_name": "待驳回服务器",
            "cabinet_id": test_cabinet.id,
            "planned_u_start": 10,
            "power_draw_watts": 750,
            "planned_pdu_port_ids": pdu_port.id,
            "planned_switch_port_ids": switch_port.id
        }
        response = client.post("/api/rack-requests", json=create_data, headers=op_headers)
        assert response.status_code == 200
        request_id = response.json()["id"]

        response = client.post(f"/api/rack-requests/{request_id}/submit", json={}, headers=op_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "pending"

        db_session.refresh(pdu_port)
        assert pdu_port.is_occupied is True

        reject_data = {
            "reject_reason": "U位规划不合理，建议调整到其他机柜"
        }
        response = client.post(f"/api/rack-requests/{request_id}/reject", json=reject_data, headers=op_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "rejected"
        assert data["reject_reason"] == "U位规划不合理，建议调整到其他机柜"

        db_session.refresh(pdu_port)
        assert pdu_port.is_occupied is False

    def test_abnormal_release_detected(self, client, db_session, test_users, test_cabinet,
                                       test_pdu, test_switch, test_device_model):
        op_headers = get_auth_headers(client, "operation")

        pdu_port = db_session.query(PDUPort).filter(
            PDUPort.pdu_id == test_pdu.id,
            PDUPort.port_number == 3
        ).first()
        switch_port = db_session.query(SwitchPort).filter(
            SwitchPort.switch_id == test_switch.id,
            SwitchPort.port_number == 3
        ).first()

        create_data = {
            "device_model_id": test_device_model.id,
            "device_name": "异常下架测试服务器",
            "cabinet_id": test_cabinet.id,
            "planned_u_start": 20,
            "power_draw_watts": 750,
            "planned_pdu_port_ids": pdu_port.id,
            "planned_switch_port_ids": switch_port.id
        }
        response = client.post("/api/rack-requests", json=create_data, headers=op_headers)
        request_id = response.json()["id"]

        client.post(f"/api/rack-requests/{request_id}/submit", json={}, headers=op_headers)
        client.post(f"/api/rack-requests/{request_id}/approve", json={}, headers=op_headers)

        decommission_data = {
            "decommission_remark": "未施工直接取消",
            "release_pdu_remark": "未使用端口直接释放",
            "release_switch_remark": "未使用端口直接释放"
        }
        response = client.post(f"/api/rack-requests/{request_id}/decommission", json=decommission_data, headers=op_headers)
        assert response.status_code == 200

        audit_logs = db_session.query(AuditLog).filter(
            AuditLog.rack_request_id == request_id,
            AuditLog.is_abnormal_release == True
        ).all()
        assert len(audit_logs) >= 1
        release_logs = [log for log in audit_logs if log.action == AuditAction.DECOMMISSION]
        assert len(release_logs) >= 1
        assert release_logs[0].is_abnormal_release is True

    def test_role_permissions(self, client, db_session, test_cabinet, test_device_model,
                              test_pdu, test_switch):
        duty_headers = get_auth_headers(client, "duty")
        auditor_headers = get_auth_headers(client, "auditor")
        op_headers = get_auth_headers(client, "operation")

        pdu_port = db_session.query(PDUPort).filter(
            PDUPort.pdu_id == test_pdu.id,
            PDUPort.port_number == 4
        ).first()
        switch_port = db_session.query(SwitchPort).filter(
            SwitchPort.switch_id == test_switch.id,
            SwitchPort.port_number == 4
        ).first()

        create_data = {
            "device_model_id": test_device_model.id,
            "device_name": "权限测试服务器",
            "cabinet_id": test_cabinet.id,
            "planned_u_start": 30,
            "power_draw_watts": 750,
            "planned_pdu_port_ids": pdu_port.id,
            "planned_switch_port_ids": switch_port.id
        }
        response = client.post("/api/rack-requests", json=create_data, headers=duty_headers)
        assert response.status_code == 403

        response = client.post("/api/rack-requests", json=create_data, headers=auditor_headers)
        assert response.status_code == 403

        response = client.post("/api/rack-requests", json=create_data, headers=op_headers)
        assert response.status_code == 200
        request_id = response.json()["id"]

        client.post(f"/api/rack-requests/{request_id}/submit", json={}, headers=op_headers)

        response = client.post(f"/api/rack-requests/{request_id}/approve", json={}, headers=duty_headers)
        assert response.status_code == 403

        response = client.post(f"/api/rack-requests/{request_id}/approve", json={}, headers=auditor_headers)
        assert response.status_code == 403

        response = client.post(f"/api/rack-requests/{request_id}/approve", json={}, headers=op_headers)
        assert response.status_code == 200
