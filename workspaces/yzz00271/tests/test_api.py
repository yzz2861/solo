from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app, receipt_service
from app.domain import RiskLevel, SourceChannel, ActionType


@pytest.fixture
def client():
    return TestClient(app)


def _make_item_dict(item_id, report_no, risk_level="low", desc="常规",
                    required=None, provided=None, exam_type="CT",
                    exam_body_part="胸部", department="内科"):
    return {
        "item_id": item_id,
        "report_no": report_no,
        "patient_id": f"P{item_id}",
        "patient_name": f"患者{item_id}",
        "exam_type": exam_type,
        "exam_body_part": exam_body_part,
        "critical_value_desc": desc,
        "risk_level": risk_level,
        "required_materials": required or [],
        "provided_materials": provided or [],
        "department": department,
        "reporting_physician": "张医生",
        "report_time": datetime.now().isoformat(),
    }


class TestApiSingleSuccess:
    def test_submit_single_success(self, client):
        payload = {
            "batch_no": "API-BATCH-001",
            "source_channel": "pacs",
            "action": "submit",
            "items": [
                _make_item_dict("api-001", "API-RPT-001", "low", "常规",
                                ["身份证"], ["身份证"]),
            ],
        }
        resp = client.post("/api/receipts/batch", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["batch_no"] == "API-BATCH-001"
        assert data["total_count"] == 1
        assert data["summary"]["total"] == 1
        assert data["summary"]["processable"] == 1
        assert data["results"][0]["status"] == "processable"
        assert data["results"][0]["need_review"] is False


class TestApiBatchPartialFailure:
    def test_batch_mixed_statuses(self, client):
        payload = {
            "batch_no": "API-BATCH-MIXED",
            "source_channel": "his",
            "action": "submit",
            "items": [
                _make_item_dict("api-mix-1", "API-MIX-1", "low", "常规",
                                ["A"], ["A"]),
                _make_item_dict("api-mix-2", "API-MIX-2", "low", "常规",
                                ["A", "B"], ["A"]),
                _make_item_dict("api-mix-3", "API-MIX-3", "high", "脑出血",
                                ["身份证"], ["身份证"], "CT", "头部", "急诊科"),
            ],
        }
        resp = client.post("/api/receipts/batch", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["summary"]["total"] == 3
        assert data["summary"]["processable"] >= 1
        assert data["summary"]["need_supplement"] >= 1
        assert data["summary"]["locked"] >= 1
        assert data["summary"]["high_risk"] == 1


class TestApiReview:
    def test_review_locked_receipt(self, client):
        submit_payload = {
            "batch_no": "API-BATCH-REVIEW",
            "source_channel": "emergency",
            "action": "submit",
            "items": [
                _make_item_dict("api-rv-1", "API-RV-1", "high", "急性脑梗塞",
                                ["身份证"], ["身份证"], "MRI", "颅脑", "神经外科"),
            ],
        }
        submit_resp = client.post("/api/receipts/batch", json=submit_payload)
        submit_data = submit_resp.json()
        receipt_id = submit_data["results"][0]["receipt_id"]
        assert submit_data["results"][0]["status"] == "locked"

        review_payload = {
            "batch_no": "API-BATCH-REVIEW",
            "receipt_ids": [receipt_id],
            "action": "approve",
            "review_opinion": "已复核，危急值诊断准确",
            "review_user": "李主任",
        }
        review_resp = client.post("/api/receipts/review", json=review_payload)
        assert review_resp.status_code == 200
        review_data = review_resp.json()
        assert review_data["results"][0]["success"] is True
        assert review_data["results"][0]["status"] == "approved"
        assert review_data["summary"]["approved"] == 1

        detail_resp = client.get(f"/api/receipts/{receipt_id}")
        detail_data = detail_resp.json()
        assert detail_data["receipt"]["status"] == "approved"
        assert detail_data["receipt"]["review_opinion"] == "已复核，危急值诊断准确"
        assert len(detail_data["audit_logs"]) == 2


class TestApiDuplicate:
    def test_duplicate_in_same_batch(self, client):
        payload = {
            "batch_no": "API-BATCH-DUP",
            "source_channel": "manual",
            "action": "submit",
            "items": [
                _make_item_dict("api-dup-1", "API-DUP-RPT", "low", "常规",
                                ["身份证"], ["身份证"]),
                _make_item_dict("api-dup-2", "API-DUP-RPT", "low", "常规",
                                ["身份证"], ["身份证"]),
            ],
        }
        resp = client.post("/api/receipts/batch", json=payload)
        data = resp.json()
        assert data["summary"]["failed"] == 1
        assert data["summary"]["total"] == 2

        failed = [r for r in data["results"] if r["status"] == "failed"]
        assert len(failed) == 1
        assert any("重复" in reason for reason in failed[0]["failure_reasons"])


class TestApiBatchQuery:
    def test_get_batch_detail(self, client):
        payload = {
            "batch_no": "API-BATCH-QUERY",
            "source_channel": "pacs",
            "action": "submit",
            "items": [
                _make_item_dict("api-q-1", "API-Q-1", "low", "常规",
                                ["A"], ["A"]),
                _make_item_dict("api-q-2", "API-Q-2", "medium", "肺炎",
                                ["A", "B"], ["A"]),
            ],
        }
        client.post("/api/receipts/batch", json=payload)

        resp = client.get("/api/receipts/batch/API-BATCH-QUERY")
        assert resp.status_code == 200
        data = resp.json()
        assert data["batch_info"]["batch_no"] == "API-BATCH-QUERY"
        assert data["summary"]["total"] == 2
        assert len(data["receipts"]) == 2
        assert data["logs_count"] == 2
        assert len(data["audit_logs"]) == 2

    def test_get_batch_not_found(self, client):
        resp = client.get("/api/receipts/batch/NONEXISTENT")
        assert resp.status_code == 404


class TestApiAuditLogs:
    def test_get_audit_logs_by_batch(self, client):
        payload = {
            "batch_no": "API-LOG-BATCH",
            "source_channel": "pacs",
            "items": [
                _make_item_dict("api-log-1", "API-LOG-1", "low", "常规",
                                ["身份证"], ["身份证"]),
            ],
        }
        client.post("/api/receipts/batch", json=payload)

        resp = client.get("/api/audit-logs?batch_no=API-LOG-BATCH")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["logs"][0]["batch_no"] == "API-LOG-BATCH"
        assert data["logs"][0]["action"] == "submit"
