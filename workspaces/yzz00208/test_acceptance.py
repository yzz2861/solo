#!/usr/bin/env python3
"""门店盘点盈亏API - 验收测试脚本

包含验收样例：
1. 合规样例 - 正常盘点，全部通过
2. 超阈值样例 - 盈亏金额/比例超标
3. 材料缺失样例 - 盘点材料不完整
4. 历史回放样例 - 多次提交+复核+回放
5. 边界条件测试
6. 重复提交测试
7. 可追溯编号验证
"""

import sys
import json
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.models.inventory import (
    InventoryCheckRequest,
    TimeWindow,
    ObjectStatus,
    MaterialStatus,
    DecisionType,
    HitSource,
)
from app.services import inventory_service
from app.services.storage import storage


def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_subsection(title):
    print(f"\n  --- {title} ---")


def print_response(resp, indent=2):
    prefix = " " * indent
    data = json.loads(resp.model_dump_json()) if hasattr(resp, 'model_dump_json') else resp
    print(json.dumps(data, ensure_ascii=False, indent=2, default=str))


def case_1_compliant():
    """验收样例1：合规样例 - 正常盘点，全部通过"""
    print_section("验收样例1：合规样例（全部通过）")

    request = InventoryCheckRequest(
        business_no="PD-2026-00001",
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 1, 9, 0, 0),
            end_time=datetime(2026, 6, 1, 18, 0, 0),
        ),
        rule_version="v1.0",
        operator="张三",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=120.50,
        profit_loss_rate=0.005,
        remark="门店日常盘点，账实基本相符",
    )

    print_subsection("请求参数")
    print(f"  业务编号: {request.business_no}")
    print(f"  对象状态: {request.object_status.value}")
    print(f"  盈亏金额: {request.profit_loss_amount}元")
    print(f"  盈亏比例: {request.profit_loss_rate*100:.2f}%")
    print(f"  材料状态: {request.material_status.value}")
    print(f"  规则版本: {request.rule_version}")
    print(f"  操作人: {request.operator}")

    result = inventory_service.perform_inventory_check(request)

    print_subsection("判定结果")
    print(f"  追溯号: {result.trace_id}")
    print(f"  决策: {result.decision_label} ({result.decision.value})")
    print(f"  原因摘要: {result.reason_summary}")
    print(f"  命中规则数: {len(result.hit_details)}")
    print(f"  是否重复提交: {result.is_duplicate}")
    print(f"  是否需要复核: {result.review_required}")

    assert result.decision == DecisionType.PASS, "合规样例应判定为通过"
    assert len(result.hit_details) == 0, "合规样例不应命中任何规则"
    assert result.review_required is False, "合规样例不需要复核"
    assert result.is_duplicate is False, "首次提交不应判定为重复"

    print("\n  ✅ 合规样例验收通过")
    return result


def case_2_amount_exceed():
    """验收样例2：超阈值样例 - 盈亏金额超标（拦截级）"""
    print_section("验收样例2：超阈值样例 - 金额超拦截阈值")

    request = InventoryCheckRequest(
        business_no="PD-2026-00002",
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 2, 9, 0, 0),
            end_time=datetime(2026, 6, 2, 18, 0, 0),
        ),
        rule_version="v1.0",
        operator="李四",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=-15000.00,
        profit_loss_rate=0.15,
        remark="月末大盘点，发现大额盘亏",
    )

    print_subsection("请求参数")
    print(f"  业务编号: {request.business_no}")
    print(f"  盈亏金额: {request.profit_loss_amount}元（盘亏）")
    print(f"  盈亏比例: {request.profit_loss_rate*100:.2f}%")

    result = inventory_service.perform_inventory_check(request)

    print_subsection("判定结果")
    print(f"  追溯号: {result.trace_id}")
    print(f"  决策: {result.decision_label} ({result.decision.value})")
    print(f"  原因摘要: {result.reason_summary}")
    print(f"  命中规则数: {len(result.hit_details)}")

    print_subsection("命中规则详情")
    for hit in result.hit_details:
        print(f"  - [{hit.rule_id}] {hit.rule_name}")
        print(f"    来源: {hit.hit_source.value}")
        print(f"    决策: {hit.decision.value}")
        print(f"    原因码: {hit.reason_code}")
        print(f"    原因: {hit.reason_message}")
        print(f"    证据: {json.dumps(hit.evidence, ensure_ascii=False)}")

    assert result.decision == DecisionType.BLOCK, "超阈值样例应判定为拦截"
    assert any(h.reason_code == "AMOUNT_EXCEED_BLOCK" for h in result.hit_details), "应命中金额拦截规则"
    assert any(h.hit_source == HitSource.RULE for h in result.hit_details), "命中来源应为规则"

    print("\n  ✅ 超阈值样例验收通过")
    return result


def case_3_material_missing():
    """验收样例3：材料缺失样例 - 盘点材料不完整"""
    print_section("验收样例3：材料缺失样例")

    request = InventoryCheckRequest(
        business_no="PD-2026-00003",
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 3, 9, 0, 0),
            end_time=datetime(2026, 6, 3, 18, 0, 0),
        ),
        rule_version="v1.1",
        operator="王五",
        material_status=MaterialStatus.MISSING,
        profit_loss_amount=500.00,
        profit_loss_rate=0.02,
        remark="缺少盘点签字单",
    )

    print_subsection("请求参数")
    print(f"  业务编号: {request.business_no}")
    print(f"  材料状态: {request.material_status.value}")
    print(f"  规则版本: {request.rule_version}")

    result = inventory_service.perform_inventory_check(request)

    print_subsection("判定结果")
    print(f"  追溯号: {result.trace_id}")
    print(f"  决策: {result.decision_label} ({result.decision.value})")
    print(f"  原因摘要: {result.reason_summary}")

    print_subsection("命中规则详情")
    for hit in result.hit_details:
        print(f"  - [{hit.rule_id}] {hit.rule_name}: {hit.reason_message}")

    assert result.decision == DecisionType.BLOCK, "材料缺失应判定为拦截"
    assert any(h.reason_code == "MATERIAL_MISSING" for h in result.hit_details), "应命中材料缺失规则"

    print("\n  ✅ 材料缺失样例验收通过")
    return result


def case_4_history_replay():
    """验收样例4：历史回放样例 - 多次提交+复核+回放"""
    print_section("验收样例4：历史回放样例")

    business_no = "PD-2026-00004"
    print_subsection("步骤1：首次提交（待复核）")

    request1 = InventoryCheckRequest(
        business_no=business_no,
        object_status=ObjectStatus.DAMAGED,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 4, 9, 0, 0),
            end_time=datetime(2026, 6, 4, 18, 0, 0),
        ),
        rule_version="v1.1",
        operator="赵六",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=2500.00,
        profit_loss_rate=0.03,
        remark="部分商品损坏",
    )

    result1 = inventory_service.perform_inventory_check(request1)
    print(f"  追溯号: {result1.trace_id}")
    print(f"  决策: {result1.decision_label}")
    print(f"  需要复核: {result1.review_required}")
    if result1.review_deadline:
        print(f"  复核截止: {result1.review_deadline}")

    assert result1.decision == DecisionType.PENDING_REVIEW
    assert result1.review_required is True

    print_subsection("步骤2：人工复核（通过）")

    review = inventory_service.perform_review(
        trace_id=result1.trace_id,
        reviewer="钱主管",
        final_decision=DecisionType.PASS,
        review_comment="损坏为正常损耗，金额在合理范围内，予以通过",
    )

    print(f"  复核人: {review.reviewer}")
    print(f"  原决策: {review.original_decision.value}")
    print(f"  终决策: {review.final_decision.value}")
    print(f"  复核意见: {review.review_comment}")
    print(f"  复核时间: {review.review_time}")

    assert review is not None
    assert review.final_decision == DecisionType.PASS

    print_subsection("步骤3：历史回放（验证完整链路）")

    history = inventory_service.replay_history(business_no)
    print(f"  历史记录数: {len(history)}")

    for i, rec in enumerate(history, 1):
        print(f"\n  记录 {i}:")
        print(f"    追溯号: {rec.trace_id}")
        print(f"    操作人: {rec.operator}")
        print(f"    判定时间: {rec.check_time}")
        print(f"    决策: {rec.decision.value}")
        print(f"    规则版本: {rec.rule_version}")
        print(f"    命中规则数: {len(rec.hit_details)}")
        if rec.review_record:
            print(f"    有复核记录: 是")
            print(f"      复核人: {rec.review_record.reviewer}")
            print(f"      终决策: {rec.review_record.final_decision.value}")

    assert len(history) >= 1
    assert history[0].review_record is not None
    assert history[0].review_record.final_decision == DecisionType.PASS

    print("\n  ✅ 历史回放样例验收通过")
    return history


def case_5_duplicate_submission():
    """验收样例5：重复提交测试"""
    print_section("验收样例5：重复提交检测")

    business_no = "PD-2026-00005"

    print_subsection("首次提交")
    request1 = InventoryCheckRequest(
        business_no=business_no,
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 5, 9, 0, 0),
            end_time=datetime(2026, 6, 5, 18, 0, 0),
        ),
        rule_version="v1.0",
        operator="孙八",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=200.00,
        profit_loss_rate=0.01,
    )

    result1 = inventory_service.perform_inventory_check(request1)
    print(f"  追溯号: {result1.trace_id}")
    print(f"  决策: {result1.decision_label}")
    print(f"  是否重复: {result1.is_duplicate}")

    assert result1.is_duplicate is False

    print_subsection("重复提交（相同业务编号+相同规则版本）")
    request2 = InventoryCheckRequest(
        business_no=business_no,
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 5, 9, 0, 0),
            end_time=datetime(2026, 6, 5, 18, 0, 0),
        ),
        rule_version="v1.0",
        operator="孙八",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=200.00,
        profit_loss_rate=0.01,
    )

    result2 = inventory_service.perform_inventory_check(request2)
    print(f"  追溯号: {result2.trace_id}")
    print(f"  决策: {result2.decision_label}")
    print(f"  是否重复: {result2.is_duplicate}")
    print(f"  原始追溯号: {result2.original_trace_id}")

    print_subsection("重复提交命中详情")
    for hit in result2.hit_details:
        if hit.hit_source == HitSource.DUPLICATE_SUBMISSION:
            print(f"  - 来源: {hit.hit_source.value}")
            print(f"    原因码: {hit.reason_code}")
            print(f"    原因: {hit.reason_message}")

    assert result2.is_duplicate is True
    assert result2.original_trace_id == result1.trace_id
    assert any(h.hit_source == HitSource.DUPLICATE_SUBMISSION for h in result2.hit_details)

    print_subsection("不同规则版本（不判定为重复）")
    request3 = InventoryCheckRequest(
        business_no=business_no,
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 5, 9, 0, 0),
            end_time=datetime(2026, 6, 5, 18, 0, 0),
        ),
        rule_version="v1.1",
        operator="孙八",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=200.00,
        profit_loss_rate=0.01,
    )

    result3 = inventory_service.perform_inventory_check(request3)
    print(f"  追溯号: {result3.trace_id}")
    print(f"  规则版本: {result3.rule_version}")
    print(f"  是否重复: {result3.is_duplicate}")

    assert result3.is_duplicate is False

    print("\n  ✅ 重复提交样例验收通过")
    return result1, result2, result3


def case_6_boundary_conditions():
    """验收样例6：边界条件测试"""
    print_section("验收样例6：边界条件测试")

    print_subsection("边界1：金额正好在阈值临界点（拦截级阈值10000元）")
    request_exact_block = InventoryCheckRequest(
        business_no="PD-2026-BOUND-001",
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 6, 9, 0, 0),
            end_time=datetime(2026, 6, 6, 18, 0, 0),
        ),
        rule_version="v1.0",
        operator="测试员",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=10000.00,
        profit_loss_rate=0.04,
    )
    result = inventory_service.perform_inventory_check(request_exact_block)
    print(f"  金额: 10000.00元")
    print(f"  决策: {result.decision_label}")
    assert result.decision == DecisionType.BLOCK, "等于阈值应拦截"

    print_subsection("边界2：金额略低于拦截阈值（9999.99元）")
    request_below_block = InventoryCheckRequest(
        business_no="PD-2026-BOUND-002",
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 6, 9, 0, 0),
            end_time=datetime(2026, 6, 6, 18, 0, 0),
        ),
        rule_version="v1.0",
        operator="测试员",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=9999.99,
        profit_loss_rate=0.04,
    )
    result = inventory_service.perform_inventory_check(request_below_block)
    print(f"  金额: 9999.99元")
    print(f"  决策: {result.decision_label}")
    assert result.decision == DecisionType.PENDING_REVIEW, "低于拦截阈值但高于复核阈值应待复核"

    print_subsection("边界3：金额正好在复核级阈值（1000元）")
    request_exact_review = InventoryCheckRequest(
        business_no="PD-2026-BOUND-003",
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 6, 9, 0, 0),
            end_time=datetime(2026, 6, 6, 18, 0, 0),
        ),
        rule_version="v1.0",
        operator="测试员",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=1000.00,
        profit_loss_rate=0.005,
    )
    result = inventory_service.perform_inventory_check(request_exact_review)
    print(f"  金额: 1000.00元")
    print(f"  决策: {result.decision_label}")
    assert result.decision == DecisionType.PENDING_REVIEW, "等于复核阈值应待复核"

    print_subsection("边界4：金额低于复核阈值（999.99元）")
    request_below_review = InventoryCheckRequest(
        business_no="PD-2026-BOUND-004",
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 6, 9, 0, 0),
            end_time=datetime(2026, 6, 6, 18, 0, 0),
        ),
        rule_version="v1.0",
        operator="测试员",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=999.99,
        profit_loss_rate=0.005,
    )
    result = inventory_service.perform_inventory_check(request_below_review)
    print(f"  金额: 999.99元")
    print(f"  决策: {result.decision_label}")
    assert result.decision == DecisionType.PASS, "低于复核阈值应通过"

    print_subsection("边界5：时间窗口无效（开始时间晚于结束时间）")
    request_invalid_time = InventoryCheckRequest(
        business_no="PD-2026-BOUND-005",
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 7, 18, 0, 0),
            end_time=datetime(2026, 6, 7, 9, 0, 0),
        ),
        rule_version="v1.0",
        operator="测试员",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=0.00,
        profit_loss_rate=0.0,
    )
    result = inventory_service.perform_inventory_check(request_invalid_time)
    print(f"  决策: {result.decision_label}")
    print(f"  原因: {result.reason_summary}")
    assert result.decision == DecisionType.BLOCK
    assert any(h.reason_code == "TIME_WINDOW_INVALID" for h in result.hit_details)

    print_subsection("边界6：规则版本不存在")
    request_bad_version = InventoryCheckRequest(
        business_no="PD-2026-BOUND-006",
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 6, 9, 0, 0),
            end_time=datetime(2026, 6, 6, 18, 0, 0),
        ),
        rule_version="v99.9",
        operator="测试员",
    )
    result = inventory_service.perform_inventory_check(request_bad_version)
    print(f"  请求版本: v99.9")
    print(f"  决策: {result.decision_label}")
    print(f"  原因: {result.reason_summary}")
    assert result.decision == DecisionType.BLOCK
    assert any(h.reason_code == "RULE_VERSION_NOT_FOUND" for h in result.hit_details)

    print("\n  ✅ 边界条件测试验收通过")


def case_7_traceability():
    """验收样例7：可追溯编号验证"""
    print_section("验收样例7：可追溯编号验证")

    print_subsection("追溯号格式验证")
    request = InventoryCheckRequest(
        business_no="PD-2026-TRACE-001",
        object_status=ObjectStatus.NORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 6, 9, 0, 0),
            end_time=datetime(2026, 6, 6, 18, 0, 0),
        ),
        rule_version="v1.0",
        operator="周九",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=100.00,
        profit_loss_rate=0.001,
    )

    result = inventory_service.perform_inventory_check(request)
    trace_id = result.trace_id
    print(f"  生成追溯号: {trace_id}")
    print(f"  格式: INV-YYYYMMDDHHMMSS-XXXXXXXX")

    assert trace_id.startswith("INV-"), "追溯号应以INV-开头"
    parts = trace_id.split("-")
    assert len(parts) == 3, "追溯号应包含三部分"
    assert len(parts[1]) == 14, "时间戳部分应为14位"
    assert len(parts[2]) == 8, "随机部分应为8位"

    print_subsection("通过追溯号查询")
    retrieved = inventory_service.get_trace_record(trace_id)
    assert retrieved is not None
    assert retrieved.trace_id == trace_id
    assert retrieved.business_no == request.business_no
    assert retrieved.operator == request.operator
    print(f"  查询成功: 追溯号={retrieved.trace_id}, 业务编号={retrieved.business_no}")

    print_subsection("不存在的追溯号")
    not_found = inventory_service.get_trace_record("INV-NOTEXIST-00000000")
    assert not_found is None
    print(f"  不存在的追溯号返回: None (正确)")

    print("\n  ✅ 可追溯编号验证通过")


def case_8_rule_versions():
    """验收样例8：规则版本对比"""
    print_section("验收样例8：多版本规则验证")

    versions = inventory_service.get_available_rule_versions()
    print(f"  可用规则版本: {versions}")
    assert "v1.0" in versions
    assert "v1.1" in versions
    assert "v2.0" in versions

    business_no_base = "PD-2026-VERSION"

    print_subsection("v1.0 规则（基础版）")
    req_v1 = InventoryCheckRequest(
        business_no=f"{business_no_base}-V1",
        object_status=ObjectStatus.ABNORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 1, 9, 0, 0),
            end_time=datetime(2026, 7, 15, 18, 0, 0),
        ),
        rule_version="v1.0",
        operator="测试员",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=3000.00,
        profit_loss_rate=0.04,
    )
    res_v1 = inventory_service.perform_inventory_check(req_v1)
    print(f"  命中规则数: {len(res_v1.hit_details)}")
    print(f"  决策: {res_v1.decision_label}")
    for hit in res_v1.hit_details:
        print(f"    - {hit.rule_id}: {hit.rule_name}")

    print_subsection("v1.1 规则（增加物品异常和时间跨度校验）")
    req_v11 = InventoryCheckRequest(
        business_no=f"{business_no_base}-V11",
        object_status=ObjectStatus.ABNORMAL,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 1, 9, 0, 0),
            end_time=datetime(2026, 7, 15, 18, 0, 0),
        ),
        rule_version="v1.1",
        operator="测试员",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=3000.00,
        profit_loss_rate=0.04,
    )
    res_v11 = inventory_service.perform_inventory_check(req_v11)
    print(f"  命中规则数: {len(res_v11.hit_details)}")
    print(f"  决策: {res_v11.decision_label}")
    for hit in res_v11.hit_details:
        print(f"    - {hit.rule_id}: {hit.rule_name}")

    assert len(res_v11.hit_details) > len(res_v1.hit_details), "v1.1应比v1.0命中更多规则"
    assert any(h.rule_id == "RULE-OBJ-003" for h in res_v11.hit_details), "v1.1应有物品状态异常校验"
    assert any(h.rule_id == "RULE-TIME-002" for h in res_v11.hit_details), "v1.1应有时间跨度校验"

    print_subsection("v2.0 规则（增加组合风险校验）")
    req_v2 = InventoryCheckRequest(
        business_no=f"{business_no_base}-V2",
        object_status=ObjectStatus.DAMAGED,
        time_window=TimeWindow(
            start_time=datetime(2026, 6, 1, 9, 0, 0),
            end_time=datetime(2026, 6, 2, 18, 0, 0),
        ),
        rule_version="v2.0",
        operator="测试员",
        material_status=MaterialStatus.COMPLETE,
        profit_loss_amount=6000.00,
        profit_loss_rate=0.06,
    )
    res_v2 = inventory_service.perform_inventory_check(req_v2)
    print(f"  命中规则数: {len(res_v2.hit_details)}")
    print(f"  决策: {res_v2.decision_label}")
    for hit in res_v2.hit_details:
        print(f"    - {hit.rule_id}: {hit.rule_name} ({hit.decision.value})")

    assert any(h.rule_id == "RULE-COMB-001" for h in res_v2.hit_details), "v2.0应有组合风险校验"

    print("\n  ✅ 多版本规则验证通过")


def main():
    print("\n" + "🚀" * 35)
    print("  门店盘点盈亏API - 验收测试套件")
    print("🚀" * 35)

    total_cases = 8
    passed = 0

    try:
        case_1_compliant()
        passed += 1
    except AssertionError as e:
        print(f"\n  ❌ 样例1失败: {e}")

    try:
        case_2_amount_exceed()
        passed += 1
    except AssertionError as e:
        print(f"\n  ❌ 样例2失败: {e}")

    try:
        case_3_material_missing()
        passed += 1
    except AssertionError as e:
        print(f"\n  ❌ 样例3失败: {e}")

    try:
        case_4_history_replay()
        passed += 1
    except AssertionError as e:
        print(f"\n  ❌ 样例4失败: {e}")

    try:
        case_5_duplicate_submission()
        passed += 1
    except AssertionError as e:
        print(f"\n  ❌ 样例5失败: {e}")

    try:
        case_6_boundary_conditions()
        passed += 1
    except AssertionError as e:
        print(f"\n  ❌ 样例6失败: {e}")

    try:
        case_7_traceability()
        passed += 1
    except AssertionError as e:
        print(f"\n  ❌ 样例7失败: {e}")

    try:
        case_8_rule_versions()
        passed += 1
    except AssertionError as e:
        print(f"\n  ❌ 样例8失败: {e}")

    print("\n" + "=" * 70)
    print(f"  测试结果: {passed}/{total_cases} 样例通过")
    print("=" * 70)

    if passed == total_cases:
        print("\n  🎉 所有验收样例全部通过！")
        return 0
    else:
        print(f"\n  ⚠️  有 {total_cases - passed} 个样例未通过")
        return 1


if __name__ == "__main__":
    sys.exit(main())
