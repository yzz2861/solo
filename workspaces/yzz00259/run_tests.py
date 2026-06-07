import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.abnormal_check import process_abnormal_check, get_audit_by_trace, get_audit_by_biz
from services.rule_engine import get_rule_engine


def print_section(title):
    print()
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_result(label, result):
    print(f"\n[{label}]")
    if result.get("success"):
        data = result.get("data", {})
        print(f"  状态: 成功")
        print(f"  消息: {result.get('message')}")
        if data:
            print(f"  trace_id: {data.get('trace_id', 'N/A')}")
            print(f"  业务编号: {data.get('biz_no', 'N/A')}")
            print(f"  结论: {data.get('conclusion_cn', data.get('conclusion', 'N/A'))}")
            print(f"  原因: {data.get('reason', 'N/A')}")
            print(f"  规则版本: {data.get('rule_version', 'N/A')}")
            print(f"  操作人: {data.get('operator', 'N/A')}")
            if data.get("is_repeat") is not None:
                print(f"  是否重复: {data.get('is_repeat')}")
            triggered = data.get("triggered_rules", [])
            if triggered:
                print(f"  触发规则 ({len(triggered)}条):")
                for r in triggered:
                    print(f"    - {r['id']} {r['name']} [{r['action_cn']}]")
    else:
        print(f"  状态: 失败")
        print(f"  错误码: {result.get('code')}")
        print(f"  错误信息: {result.get('message')}")


def main():
    print("楼栋水表异常API - 验收测试")
    print()
    print("初始化规则引擎...")
    engine, err = get_rule_engine("v2.0")
    if err:
        print(f"  错误: {err}")
        return
    print(f"  当前默认版本: v2.0, 规则数: {len(engine.rule_version.rules)}")

    print_section("场景一：完整数据")

    req_pass = {
        "biz_no": "LD-SB-2025-000001",
        "object_status": {
            "building_id": "BLD-001",
            "metrics": {
                "usage_increase_rate": 0.1,
                "usage_decrease_rate": 0.05,
                "night_day_ratio": 0.1,
                "zero_usage_days": 0,
                "pressure_cv": 0.1,
                "min_hourly_flow_ratio": 0.8
            }
        },
        "time_window": {
            "start": "2025-07-01 00:00:00",
            "end": "2025-07-07 23:59:59"
        },
        "rule_version": "v2.0",
        "operator": "zhangsan"
    }
    result = process_abnormal_check(req_pass)
    print_result("1.1 通过 - 数据正常", result)
    assert result["success"] is True, "应返回成功"
    assert result["data"]["conclusion"] == "pass", "结论应为pass"
    trace_id_pass = result["data"]["trace_id"]

    req_intercept = {
        "biz_no": "LD-SB-2025-000002",
        "object_status": {
            "building_id": "BLD-002",
            "metrics": {
                "usage_increase_rate": 0.6,
                "night_day_ratio": 0.4,
                "min_hourly_flow_ratio": 2.0
            }
        },
        "time_window": {
            "start": "2025-07-01 00:00:00",
            "end": "2025-07-07 23:59:59"
        },
        "rule_version": "v2.0",
        "operator": "lisi"
    }
    result = process_abnormal_check(req_intercept)
    print_result("1.2 拦截 - 触发高优先级异常", result)
    assert result["success"] is True
    assert result["data"]["conclusion"] == "intercept"
    assert len(result["data"]["triggered_rules"]) >= 1

    req_review = {
        "biz_no": "LD-SB-2025-000003",
        "object_status": {
            "building_id": "BLD-003",
            "metrics": {
                "zero_usage_days": 6,
                "pressure_cv": 0.35
            }
        },
        "time_window": {
            "start": "2025-07-01 00:00:00",
            "end": "2025-07-07 23:59:59"
        },
        "rule_version": "v2.0",
        "operator": "wangwu"
    }
    result = process_abnormal_check(req_review)
    print_result("1.3 待复核 - 触发中优先级异常", result)
    assert result["success"] is True
    assert result["data"]["conclusion"] == "review"

    print_section("场景二：时间越界")

    req_time_early = {
        "biz_no": "LD-SB-2025-000004",
        "object_status": {
            "building_id": "BLD-004",
            "metrics": {"usage_increase_rate": 0.1}
        },
        "time_window": {
            "start": "2023-01-01 00:00:00",
            "end": "2023-01-07 23:59:59"
        },
        "rule_version": "v2.0",
        "operator": "test_user"
    }
    result = process_abnormal_check(req_time_early)
    print_result("2.1 时间越界 - 早于规则生效", result)
    assert result["success"] is False
    assert result["code"] == "INVALID_REQUEST"
    assert "越界" in result["message"]

    req_time_bad = {
        "biz_no": "LD-SB-2025-000005",
        "object_status": {
            "building_id": "BLD-005",
            "metrics": {"usage_increase_rate": 0.1}
        },
        "time_window": {
            "start": "not-a-date",
            "end": "2025-07-07 23:59:59"
        },
        "rule_version": "v2.0",
        "operator": "test_user"
    }
    result = process_abnormal_check(req_time_bad)
    print_result("2.2 时间格式错误", result)
    assert result["success"] is False
    assert "格式错误" in result["message"]

    print_section("场景三：编号错误")

    req_biz_bad = {
        "biz_no": "INVALID-123",
        "object_status": {
            "building_id": "BLD-006",
            "metrics": {"usage_increase_rate": 0.1}
        },
        "time_window": {
            "start": "2025-07-01 00:00:00",
            "end": "2025-07-07 23:59:59"
        },
        "rule_version": "v2.0",
        "operator": "test_user"
    }
    result = process_abnormal_check(req_biz_bad)
    print_result("3.1 业务编号格式错误", result)
    assert result["success"] is False
    assert result["code"] == "INVALID_REQUEST"
    assert "格式错误" in result["message"] or "编号" in result["message"]

    req_biz_empty = {
        "biz_no": "",
        "object_status": {
            "building_id": "BLD-007",
            "metrics": {"usage_increase_rate": 0.1}
        },
        "time_window": {
            "start": "2025-07-01 00:00:00",
            "end": "2025-07-07 23:59:59"
        },
        "rule_version": "v2.0",
        "operator": "test_user"
    }
    result = process_abnormal_check(req_biz_empty)
    print_result("3.2 业务编号为空", result)
    assert result["success"] is False
    assert "不能为空" in result["message"]

    print_section("场景四：配置缺失")

    req_ver_missing = {
        "biz_no": "LD-SB-2025-000008",
        "object_status": {
            "building_id": "BLD-008",
            "metrics": {"usage_increase_rate": 0.1}
        },
        "time_window": {
            "start": "2025-07-01 00:00:00",
            "end": "2025-07-07 23:59:59"
        },
        "rule_version": "v99.0",
        "operator": "test_user"
    }
    result = process_abnormal_check(req_ver_missing)
    print_result("4.1 规则版本不存在", result)
    assert result["success"] is False
    assert result["code"] == "CONFIG_MISSING"
    assert "不存在" in result["message"]

    print_section("验证：重复处理稳定性")

    req_repeat = {
        "biz_no": "LD-SB-2025-000010",
        "object_status": {
            "building_id": "BLD-010",
            "metrics": {"usage_increase_rate": 0.5}
        },
        "time_window": {
            "start": "2025-07-01 00:00:00",
            "end": "2025-07-07 23:59:59"
        },
        "rule_version": "v2.0",
        "operator": "repeat_test"
    }
    result1 = process_abnormal_check(req_repeat)
    print_result("5.1 第一次请求", result1)
    trace_id_1 = result1["data"]["trace_id"]
    conclusion_1 = result1["data"]["conclusion"]

    result2 = process_abnormal_check(req_repeat)
    print_result("5.2 第二次请求 (重复)", result2)
    trace_id_2 = result2["data"]["trace_id"]
    conclusion_2 = result2["data"]["conclusion"]

    assert trace_id_1 == trace_id_2, "重复请求应返回相同trace_id"
    assert conclusion_1 == conclusion_2, "重复请求结论应一致"
    assert result2["data"]["is_repeat"] is True, "应标记为重复请求"
    assert "重复" in result2["message"], "消息应提示重复"

    result3 = process_abnormal_check(req_repeat)
    assert result3["data"]["trace_id"] == trace_id_1, "第三次请求仍应稳定"
    print("\n  ✓ 重复处理验证通过：3次请求结论一致，trace_id相同")

    print_section("验证：可追溯编号")

    audit_result = get_audit_by_trace(trace_id_1)
    print_result("6.1 通过trace_id查询审计记录", audit_result)
    assert audit_result["success"] is True
    assert audit_result["data"]["biz_no"] == "LD-SB-2025-000010"
    assert audit_result["data"]["operator"] == "repeat_test"
    assert audit_result["data"]["rule_version"] == "v2.0"
    assert "request_data" in audit_result["data"]
    assert "result" in audit_result["data"]

    biz_audit = get_audit_by_biz("LD-SB-2025-000010")
    print_result("6.2 通过biz_no查询历史记录", biz_audit)
    assert biz_audit["success"] is True
    assert biz_audit["data"]["count"] >= 1

    print_section("验证：边界条件")

    req_low = dict(req_pass)
    req_low["biz_no"] = "LD-SB-2025-000101"
    req_low["object_status"]["metrics"] = {"usage_increase_rate": 0.399}
    result = process_abnormal_check(req_low)
    print(f"\n[7.1] 阈值下界 0.399 -> {result['data']['conclusion_cn']}")
    assert result["data"]["conclusion"] == "pass", "0.399应不触发"

    req_high = dict(req_pass)
    req_high["biz_no"] = "LD-SB-2025-000102"
    req_high["object_status"]["metrics"] = {"usage_increase_rate": 0.401}
    result = process_abnormal_check(req_high)
    print(f"[7.2] 阈值上界 0.401 -> {result['data']['conclusion_cn']}")
    assert result["data"]["conclusion"] == "intercept", "0.401应触发"

    req_zero4 = dict(req_pass)
    req_zero4["biz_no"] = "LD-SB-2025-000103"
    req_zero4["object_status"]["metrics"] = {"zero_usage_days": 4}
    result = process_abnormal_check(req_zero4)
    print(f"[7.3] 连续零用量 4天 -> {result['data']['conclusion_cn']}")
    assert result["data"]["conclusion"] == "pass", "4天应不触发"

    req_zero5 = dict(req_pass)
    req_zero5["biz_no"] = "LD-SB-2025-000104"
    req_zero5["object_status"]["metrics"] = {"zero_usage_days": 5}
    result = process_abnormal_check(req_zero5)
    print(f"[7.4] 连续零用量 5天 -> {result['data']['conclusion_cn']}")
    assert result["data"]["conclusion"] == "review", "5天应触发"

    print_section("验证：失败提示清晰可读")

    test_cases = [
        ("操作人缺失", {
            "biz_no": "LD-SB-2025-000020",
            "object_status": {"building_id": "B01", "metrics": {}},
            "time_window": {"start": "2025-07-01", "end": "2025-07-07"},
            "rule_version": "v2.0"
        }, "操作人"),
        ("楼栋ID缺失", {
            "biz_no": "LD-SB-2025-000021",
            "object_status": {"metrics": {}},
            "time_window": {"start": "2025-07-01", "end": "2025-07-07"},
            "rule_version": "v2.0",
            "operator": "test"
        }, "楼栋ID"),
        ("时间窗口为空", {
            "biz_no": "LD-SB-2025-000022",
            "object_status": {"building_id": "B01", "metrics": {}},
            "time_window": {},
            "rule_version": "v2.0",
            "operator": "test"
        }, "时间窗口"),
    ]

    for case_name, payload, keyword in test_cases:
        result = process_abnormal_check(payload)
        msg = result.get("message", "")
        ok = keyword in msg
        print(f"\n  [8.{test_cases.index((case_name, payload, keyword))+1}] {case_name}: "
              f"{'✓' if ok else '✗'} 提示包含'{keyword}'")
        if not ok:
            print(f"      实际消息: {msg}")
        assert ok, f"失败提示应包含'{keyword}'"

    print()
    print("=" * 60)
    print("  ✓ 所有验收测试通过！")
    print("=" * 60)


if __name__ == "__main__":
    main()
