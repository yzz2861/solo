"""API 接口测试脚本"""
import httpx
import json

BASE_URL = "http://localhost:8080/api/v1"


def test_health():
    """测试健康检查"""
    print("=" * 60)
    print("测试 1: 健康检查")
    response = httpx.get(f"{BASE_URL}/health", timeout=10)
    print(f"  状态码: {response.status_code}")
    print(f"  响应: {response.json()}")
    assert response.status_code == 200
    print("  ✓ 通过")


def test_normal_submit():
    """测试正常提交"""
    print("\n" + "=" * 60)
    print("测试 2: 正常提交（材料齐全、低风险）")
    data = {
        "batch_no": "BATCH-API-NORMAL-001",
        "items": [
            {"item_id": "document_title", "item_name": "文书标题", "item_value": "仲裁裁决书"},
            {"item_id": "delivery_method", "item_name": "送达方式", "item_value": "直接送达"},
            {"item_id": "court_name", "item_name": "仲裁机构名称", "item_value": "北京仲裁委员会"},
            {"item_id": "case_no", "item_name": "案号", "item_value": "(2024)京仲裁字第001号"},
            {"item_id": "delivery_date", "item_name": "送达日期", "item_value": "2026-05-01"},
            {"item_id": "recipient_name", "item_name": "接收人姓名", "item_value": "张三"},
            {"item_id": "receipt_signature", "item_name": "签收人签名", "item_value": "张三"},
        ],
        "source_channel": "COURT",
        "process_action": "SUBMIT",
        "operator": "api_test_user",
    }

    response = httpx.post(f"{BASE_URL}/receipt/process", json=data, timeout=10)
    result = response.json()
    print(f"  状态码: {response.status_code}")
    print(f"  业务结论: {result.get('business_conclusion')}")
    print(f"  下一步动作: {result.get('next_action')}")
    print(f"  任务状态: {result.get('task_status')}")
    print(f"  审计编号: {result.get('audit_no')}")
    print(f"  风险标签数: {len(result.get('risk_tags', []))}")
    print(f"  缺失材料: {result.get('missing_items')}")
    print(f"  消息: {result.get('message')}")

    assert result["business_conclusion"] == "PASSED"
    assert result["task_status"] == "APPROVED"
    assert result["audit_no"].startswith("AR")
    print("  ✓ 通过")
    return result["audit_no"]


def test_missing_materials():
    """测试缺材料场景"""
    print("\n" + "=" * 60)
    print("测试 3: 缺材料场景")
    data = {
        "batch_no": "BATCH-API-MISSING-001",
        "items": [
            {"item_id": "document_title", "item_name": "文书标题", "item_value": "仲裁裁决书"},
            {"item_id": "delivery_method", "item_name": "送达方式", "item_value": "直接送达"},
            {"item_id": "case_no", "item_name": "案号", "item_value": "(2024)京仲裁字第002号"},
        ],
        "source_channel": "COURT",
        "process_action": "SUBMIT",
        "operator": "api_test_user",
    }

    response = httpx.post(f"{BASE_URL}/receipt/process", json=data, timeout=10)
    result = response.json()
    print(f"  状态码: {response.status_code}")
    print(f"  业务结论: {result.get('business_conclusion')}")
    print(f"  下一步动作: {result.get('next_action')}")
    print(f"  任务状态: {result.get('task_status')}")
    print(f"  缺失材料数: {len(result.get('missing_items', []))}")
    print(f"  缺失材料: {result.get('missing_items')}")

    assert result["business_conclusion"] == "PENDING_SUPPLEMENT"
    assert result["task_status"] == "SUPPLEMENTING"
    assert len(result["missing_items"]) > 0
    print("  ✓ 通过")


def test_high_risk():
    """测试高风险场景"""
    print("\n" + "=" * 60)
    print("测试 4: 高风险场景（无签收）")
    data = {
        "batch_no": "BATCH-API-HIGHRISK-001",
        "items": [
            {"item_id": "document_title", "item_name": "文书标题", "item_value": "仲裁裁决书"},
            {"item_id": "delivery_method", "item_name": "送达方式", "item_value": "直接送达"},
            {"item_id": "court_name", "item_name": "仲裁机构名称", "item_value": "北京仲裁委员会"},
            {"item_id": "case_no", "item_name": "案号", "item_value": "(2024)京仲裁字第003号"},
            {"item_id": "delivery_date", "item_name": "送达日期", "item_value": "2026-05-01"},
            {"item_id": "recipient_name", "item_name": "接收人姓名", "item_value": "李四"},
            {"item_id": "receipt_signature", "item_name": "签收人签名", "item_value": ""},
        ],
        "source_channel": "COURT",
        "process_action": "SUBMIT",
        "operator": "api_test_user",
    }

    response = httpx.post(f"{BASE_URL}/receipt/process", json=data, timeout=10)
    result = response.json()
    print(f"  状态码: {response.status_code}")
    print(f"  业务结论: {result.get('business_conclusion')}")
    print(f"  下一步动作: {result.get('next_action')}")
    print(f"  任务状态: {result.get('task_status')}")
    print(f"  高风险标签数: {len([t for t in result.get('risk_tags', []) if t.get('risk_level') == 'HIGH'])}")
    print(f"  消息: {result.get('message')}")

    assert result["business_conclusion"] == "PENDING_REVIEW"
    assert result["task_status"] == "UNDER_REVIEW"
    assert len(result["risk_tags"]) > 0
    print("  ✓ 通过")


def test_high_risk_cannot_approve():
    """测试高风险不能直接审批通过"""
    print("\n" + "=" * 60)
    print("测试 5: 高风险不能直接审批通过（规则冲突）")
    data = {
        "batch_no": "BATCH-API-CONFLICT-001",
        "items": [
            {"item_id": "document_title", "item_name": "文书标题", "item_value": "仲裁裁决书"},
            {"item_id": "delivery_method", "item_name": "送达方式", "item_value": "直接送达"},
            {"item_id": "court_name", "item_name": "仲裁机构名称", "item_value": "北京仲裁委员会"},
            {"item_id": "case_no", "item_name": "案号", "item_value": "(2024)京仲裁字第004号"},
            {"item_id": "delivery_date", "item_name": "送达日期", "item_value": "2026-05-01"},
            {"item_id": "recipient_name", "item_name": "接收人姓名", "item_value": "王五"},
            {"item_id": "receipt_signature", "item_name": "签收人签名", "item_value": ""},
        ],
        "source_channel": "COURT",
        "process_action": "APPROVE",
        "operator": "api_test_user",
    }

    response = httpx.post(f"{BASE_URL}/receipt/process", json=data, timeout=10)
    result = response.json()
    print(f"  状态码: {response.status_code}")
    print(f"  错误类型: {result.get('detail', {}).get('error') if isinstance(result.get('detail'), dict) else result.get('detail')}")
    print(f"  规则ID: {result.get('detail', {}).get('rule_id') if isinstance(result.get('detail'), dict) else 'N/A'}")
    print(f"  规则名称: {result.get('detail', {}).get('rule_name') if isinstance(result.get('detail'), dict) else 'N/A'}")

    assert response.status_code == 403
    detail = result["detail"]
    assert detail["error"] == "rule_violation"
    assert detail["rule_id"] == "RULE_001"
    print("  ✓ 通过")


def test_duplicate_process():
    """测试重复处理"""
    print("\n" + "=" * 60)
    print("测试 6: 重复处理")
    data = {
        "batch_no": "BATCH-API-DUP-001",
        "items": [
            {"item_id": "document_title", "item_name": "文书标题", "item_value": "仲裁裁决书"},
            {"item_id": "delivery_method", "item_name": "送达方式", "item_value": "直接送达"},
            {"item_id": "court_name", "item_name": "仲裁机构名称", "item_value": "北京仲裁委员会"},
            {"item_id": "case_no", "item_name": "案号", "item_value": "(2024)京仲裁字第005号"},
            {"item_id": "delivery_date", "item_name": "送达日期", "item_value": "2026-05-01"},
            {"item_id": "recipient_name", "item_name": "接收人姓名", "item_value": "赵六"},
            {"item_id": "receipt_signature", "item_name": "签收人签名", "item_value": "赵六"},
        ],
        "source_channel": "COURT",
        "process_action": "SUBMIT",
        "operator": "api_test_user",
    }

    response1 = httpx.post(f"{BASE_URL}/receipt/process", json=data, timeout=10)
    print(f"  第一次提交状态码: {response1.status_code}")
    assert response1.status_code == 200

    response2 = httpx.post(f"{BASE_URL}/receipt/process", json=data, timeout=10)
    result2 = response2.json()
    print(f"  第二次提交状态码: {response2.status_code}")
    print(f"  错误类型: {result2.get('detail', {}).get('error') if isinstance(result2.get('detail'), dict) else result2.get('detail')}")
    print(f"  当前状态: {result2.get('detail', {}).get('current_status') if isinstance(result2.get('detail'), dict) else 'N/A'}")

    assert response2.status_code == 409
    detail = result2["detail"]
    assert detail["error"] == "duplicate_process"
    print("  ✓ 通过")


def test_playback(audit_no):
    """测试数据回放"""
    print("\n" + "=" * 60)
    print("测试 7: 数据回放")

    batch_no = "BATCH-API-NORMAL-001"
    response = httpx.get(f"{BASE_URL}/receipt/playback/{batch_no}", timeout=10)
    result = response.json()
    print(f"  状态码: {response.status_code}")
    print(f"  批次号: {result.get('batch_no')}")
    print(f"  记录数: {result.get('record_count')}")
    print(f"  最终状态: {result.get('final_status')}")
    print(f"  状态路径: {result.get('status_path')}")
    print(f"  时间线数: {len(result.get('timeline', []))}")

    assert response.status_code == 200
    assert result["batch_no"] == batch_no
    assert result["record_count"] >= 1
    assert "APPROVED" in result["status_path"]
    print("  ✓ 通过")


def test_get_audit_record(audit_no):
    """测试查询审计记录"""
    print("\n" + "=" * 60)
    print("测试 8: 查询审计记录")

    response = httpx.get(f"{BASE_URL}/audit/{audit_no}", timeout=10)
    result = response.json()
    print(f"  状态码: {response.status_code}")
    print(f"  审计编号: {result.get('audit_no')}")
    print(f"  批次号: {result.get('batch_no')}")
    print(f"  处理动作: {result.get('action')}")
    print(f"  处理前状态: {result.get('before_status')}")
    print(f"  处理后状态: {result.get('after_status')}")
    print(f"  风险等级: {result.get('risk_level')}")
    print(f"  数据哈希: {result.get('data_hash')}")

    assert response.status_code == 200
    assert result["audit_no"] == audit_no
    print("  ✓ 通过")


def test_task_status():
    """测试查询任务状态"""
    print("\n" + "=" * 60)
    print("测试 9: 查询任务状态")

    batch_no = "BATCH-API-NORMAL-001"
    response = httpx.get(f"{BASE_URL}/receipt/status/{batch_no}", timeout=10)
    result = response.json()
    print(f"  状态码: {response.status_code}")
    print(f"  批次号: {result.get('batch_no')}")
    print(f"  任务状态: {result.get('task_status')}")

    assert response.status_code == 200
    assert result["task_status"] == "APPROVED"
    print("  ✓ 通过")


if __name__ == "__main__":
    print("仲裁送达回证 API 接口测试\n")

    test_health()
    audit_no = test_normal_submit()
    test_missing_materials()
    test_high_risk()
    test_high_risk_cannot_approve()
    test_duplicate_process()
    test_task_status()
    test_playback(audit_no)
    test_get_audit_record(audit_no)

    print("\n" + "=" * 60)
    print("所有测试通过！✓")
    print("=" * 60)
