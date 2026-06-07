#!/usr/bin/env python3
"""
酒店客诉补偿API - 演示脚本
展示单条成功、批量部分失败、人工复核、重复提交等场景
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hotel_compensation import (
    CompensationAPI,
    create_default_rules
)


def demo_single_success():
    """演示一：单条成功 - 低风险快速通过"""
    print("\n" + "=" * 70)
    print(" 【演示一】单条成功 - 低风险客诉快速自动通过")
    print("=" * 70)

    api = CompensationAPI(create_default_rules(), output_dir="./demo_output")

    result = api.submit_single(
        business_no="HTL-DEMO-001",
        object_status="PENDING_PROCESS",
        time_window="WORKING_HOURS",
        rule_version="v1.0",
        operator="客服小王",
        complaint_type="一般投诉",
        compensation_amount=280.0,
        materials={"complaint_form": True}
    )

    print(f"\n✅ 业务结论: {result.conclusion.value}")
    print(f"   风险标签: {result.risk_label.value}")
    print(f"   下一步动作: {result.next_action.value}")
    print(f"   审计编号: {result.audit_id}")

    return api


def demo_batch_partial_failure():
    """演示二：批量部分失败 - 含坏行隔离"""
    print("\n" + "=" * 70)
    print(" 【演示二】批量部分失败 - 坏行自动隔离")
    print("=" * 70)

    api = CompensationAPI(create_default_rules(), output_dir="./demo_output")

    objects = [
        {
            "business_no": "BATCH-001",
            "object_status": "PENDING_PROCESS",
            "time_window": "WORKING_HOURS",
            "rule_version": "v1.0",
            "operator": "小王",
            "complaint_type": "一般投诉",
            "compensation_amount": 100.0,
            "materials": {"complaint_form": True}
        },
        {
            "business_no": "BATCH-002",
            "object_status": "PENDING_PROCESS",
            "time_window": "WORKING_HOURS",
            "rule_version": "v1.0",
            "operator": "小李",
            "complaint_type": "服务投诉",
            "compensation_amount": 500.0,
            "materials": {"complaint_form": True, "evidence": True}
        },
        {
            "business_no": "",
            "object_status": "PENDING_PROCESS",
            "time_window": "WORKING_HOURS",
            "rule_version": "v1.0",
            "operator": "坏行1-缺业务编号"
        },
        {
            "business_no": "BATCH-004",
            "object_status": "PENDING_PROCESS",
            "time_window": "WORKING_HOURS",
            "rule_version": "v1.0",
            "operator": "",
            "complaint_type": "一般投诉"
        },
        {
            "business_no": "BATCH-005",
            "object_status": "PENDING_PROCESS",
            "time_window": "WORKING_HOURS",
            "rule_version": "v1.0",
            "operator": "小张",
            "complaint_type": "重大投诉",
            "compensation_amount": 3000.0,
            "materials": {"complaint_form": True, "evidence": True, "approval_doc": True}
        }
    ]

    results, bad_rows = api.submit_batch(objects)

    print(f"\n📊 处理结果:")
    print(f"   成功处理: {sum(1 for r in results if r.success)} 条")
    print(f"   需复核: {sum(1 for r in results if r.review_required)} 条")
    print(f"   坏行隔离: {len(bad_rows)} 条")

    if bad_rows:
        print(f"\n🚫 坏行详情:")
        for bad in bad_rows:
            print(f"   第{bad['index']}条: {', '.join(bad['errors'])}")

    return api


def demo_manual_review():
    """演示三：人工复核 - 高风险/缺材料进入复核"""
    print("\n" + "=" * 70)
    print(" 【演示三】人工复核 - 高风险必须复核，不可直接通过")
    print("=" * 70)

    api = CompensationAPI(create_default_rules(), output_dir="./demo_output")

    print("\n--- 步骤1: 提交高风险补偿申请 ---")
    result = api.submit_single(
        business_no="REVIEW-DEMO-001",
        object_status="PENDING_PROCESS",
        time_window="WORKING_HOURS",
        rule_version="v1.0",
        operator="前台小张",
        complaint_type="重大投诉",
        compensation_amount=8000.0,
        materials={"complaint_form": True, "evidence": True, "approval_doc": True}
    )

    print(f"   风险等级: {result.risk_label.value}")
    print(f"   是否需要复核: {'是' if result.review_required else '否'}")
    print(f"   复核原因: {result.review_reason}")

    print("\n--- 步骤2: 查看待复核列表 ---")
    review_entries = api.get_review_entries()
    print(f"   待复核数量: {len(review_entries)}")

    print("\n--- 步骤3: 经理复核通过 ---")
    review_result = api.review_approval(
        business_no="REVIEW-DEMO-001",
        audit_id=result.audit_id,
        reviewer="区域经理-李明",
        approve=True,
        review_comment="情况属实，客人是VIP会员，同意补偿"
    )

    print(f"   复核结论: {review_result.conclusion.value}")
    print(f"   下一步动作: {review_result.next_action.value}")

    print("\n--- 步骤4: 缺材料进入补料流程 ---")
    result2 = api.submit_single(
        business_no="REVIEW-DEMO-002",
        object_status="PENDING_PROCESS",
        time_window="WORKING_HOURS",
        rule_version="v1.0",
        operator="前台小王",
        complaint_type="服务投诉",
        compensation_amount=800.0,
        materials={"complaint_form": True, "evidence": False}
    )

    print(f"   业务编号: {result2.business_no}")
    print(f"   缺少材料: {', '.join(result2.missing_materials)}")
    print(f"   下一步动作: {result2.next_action.value}")

    return api


def demo_duplicate_submission():
    """演示四：重复提交 - 自动检测并进入人工确认"""
    print("\n" + "=" * 70)
    print(" 【演示四】重复提交检测 - 同一业务编号重复提交")
    print("=" * 70)

    api = CompensationAPI(create_default_rules(), output_dir="./demo_output")

    print("\n--- 第一次提交 ---")
    r1 = api.submit_single(
        business_no="DUP-DEMO-001",
        object_status="PENDING_PROCESS",
        time_window="WORKING_HOURS",
        rule_version="v1.0",
        operator="客服A",
        complaint_type="一般投诉",
        compensation_amount=200.0,
        materials={"complaint_form": True}
    )
    print(f"   结论: {r1.conclusion.value} | 审计号: {r1.audit_id}")

    print("\n--- 第二次提交（同一业务编号） ---")
    r2 = api.submit_single(
        business_no="DUP-DEMO-001",
        object_status="PENDING_PROCESS",
        time_window="WORKING_HOURS",
        rule_version="v1.0",
        operator="客服B",
        complaint_type="一般投诉",
        compensation_amount=200.0,
        materials={"complaint_form": True}
    )
    print(f"   是否重复: {'是' if r2.is_duplicate else '否'}")
    print(f"   处理方式: {r2.next_action.value}")
    print(f"   原因: {r2.review_reason}")

    print("\n--- 不同规则版本不算重复 ---")
    r3 = api.submit_single(
        business_no="DUP-DEMO-001",
        object_status="PENDING_PROCESS",
        time_window="ANYTIME",
        rule_version="v2.0",
        operator="客服C",
        complaint_type="一般投诉",
        compensation_amount=500.0,
        materials={"complaint_form": True}
    )
    print(f"   规则版本: v2.0")
    print(f"   是否重复: {'是' if r3.is_duplicate else '否'}")
    print(f"   结论: {r3.conclusion.value}")

    return api


def main():
    print("🏨 酒店客诉补偿API - 完整演示")
    print("    四层架构：对象 | 规则 | 状态 | 记录")

    demo_single_success()
    demo_batch_partial_failure()
    demo_manual_review()
    demo_duplicate_submission()

    print("\n" + "=" * 70)
    print(" 📁 输出文件已保存至 ./demo_output/ 目录")
    print("    - results/: 单条结果文件")
    print("    - bad_rows/: 坏行隔离文件")
    print("    - batch_report_*.json: 批量处理报告")
    print("=" * 70)


if __name__ == "__main__":
    main()
