#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证脚本 - 验证不动产抵押注销校验系统的四类样例

验证目标：
1. 合规样例 - 材料齐全、金额合规、状态正常
2. 超阈值样例 - 金额超日阈值，阈值命中可解释
3. 材料缺失样例 - 材料缺失检测准确，状态分流正确
4. 历史回放样例 - 审计轨迹完整，数据回放一致
"""

import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from mortgage_discharge_validator import (
    MortgageRecord,
    ResponsibilityMapping,
    ValidationEngine,
    TimeWindow,
    HistoryPlayer,
    STATUS_FLOW,
)


def load_test_data():
    """加载测试数据"""
    with open("test_data/mortgage_records.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    records = [MortgageRecord(**item) for item in data["records"]]

    with open("test_data/mapping.json", "r", encoding="utf-8") as f:
        map_data = json.load(f)
    mapping = {}
    for item in map_data["mapping"]:
        m = ResponsibilityMapping(**item)
        mapping[m.branch] = m

    return records, mapping


def test_compliant_samples(records, mapping, time_window, engine, results):
    """验证合规样例"""
    print("=" * 60)
    print("【验证1】合规样例验证")
    print("=" * 60)

    compliant_ids = ["CY-2024-001", "CY-2024-002", "CY-2024-003", "DC-2024-001"]
    result_map = {r.record_id: r for r in results}
    record_map = {r.record_id: r for r in records}

    passed = 0
    failed = 0

    for rid in compliant_ids:
        rec = record_map.get(rid)
        res = result_map.get(rid)
        if not rec or not res:
            print(f"  ✗ {rid}: 未找到记录")
            failed += 1
            continue

        print(f"\n  ▸ {rid} ({rec.borrower_name} / {rec.branch})")
        print(f"    备注: {rec.remarks}")

        issues_mandatory_missing = [i for i in res.issues if i["type"] == "material_missing"]
        if issues_mandatory_missing:
            print(f"    ✗ 材料校验不通过，缺失必选材料: {issues_mandatory_missing[0]['missing_items']}")
            failed += 1
        else:
            print(f"    ✓ 材料完整性校验通过")
            passed += 1

        amount_issues = [i for i in res.issues if i["type"] in ("amount_exceed_daily", "amount_inconsistent")]
        if amount_issues:
            print(f"    ✗ 金额校验有问题: {[i['type'] for i in amount_issues]}")
            failed += 1
        else:
            print(f"    ✓ 金额校验通过（阈值合规+一致性通过）")
            passed += 1

        if rec.status == "discharged" and rec.actual_close_date:
            print(f"    ✓ 已闭环 - 实际办结日期: {rec.actual_close_date}")
            passed += 1
        elif rec.status in ("pending", "reviewing"):
            print(f"    ~ 办理中 - 当前状态: {STATUS_FLOW.get(rec.status, rec.status)}")

        print(f"    风险等级: {res.risk_level}")
        print(f"    解释说明 ({len(res.explanations)}条):")
        for exp in res.explanations:
            print(f"      - {exp}")

    total = passed + failed
    print(f"\n  合计: {passed} 项通过 / {total} 项检查")
    return failed == 0


def test_threshold_samples(records, mapping, time_window, engine, results):
    """验证超阈值样例"""
    print("\n" + "=" * 60)
    print("【验证2】超阈值样例验证（阈值命中可解释）")
    print("=" * 60)

    threshold_ids = ["HD-2024-001", "HD-2024-002"]
    result_map = {r.record_id: r for r in results}
    record_map = {r.record_id: r for r in records}

    passed = 0
    failed = 0

    for rid in threshold_ids:
        rec = record_map.get(rid)
        res = result_map.get(rid)
        if not rec or not res:
            print(f"  ✗ {rid}: 未找到记录")
            failed += 1
            continue

        branch_map = mapping.get(rec.branch)
        daily_threshold = branch_map.daily_threshold if branch_map else 0

        print(f"\n  ▸ {rid} ({rec.borrower_name} / {rec.branch})")
        print(f"    备注: {rec.remarks}")
        print(f"    注销金额: {rec.discharge_amount:,.2f} 元")
        print(f"    日阈值: {daily_threshold:,.2f} 元")

        exceed_issues = [i for i in res.issues if i["type"] == "amount_exceed_daily"]
        if exceed_issues:
            issue = exceed_issues[0]
            actual_exceed = rec.discharge_amount - daily_threshold
            reported_exceed = issue["exceed_by"]

            if abs(actual_exceed - reported_exceed) < 0.01:
                print(f"    ✓ 阈值命中准确，超出 {reported_exceed:,.2f} 元")
                passed += 1
            else:
                print(f"    ✗ 阈值计算不一致: 实际超出 {actual_exceed}, 报告超出 {reported_exceed}")
                failed += 1

            print(f"    ✓ 可解释性: 阈值={issue['threshold']:,.2f}, 实际={issue['actual']:,.2f}")
            passed += 1
        else:
            if rec.discharge_amount > daily_threshold:
                print(f"    ✗ 应命中阈值但未检出")
                failed += 1
            else:
                print(f"    ~ 金额未超阈值")

        inconsistent_issues = [i for i in res.issues if i["type"] == "amount_inconsistent"]
        if inconsistent_issues:
            issue = inconsistent_issues[0]
            print(f"    ✓ 金额不一致检出: 抵押={issue['mortgage_amount']:,.2f}, 注销={issue['discharge_amount']:,.2f}")
            passed += 1

        explanations = [e for e in res.explanations if "金额" in e or "阈值" in e or "一致性" in e]
        print(f"    金额相关解释 ({len(explanations)}条):")
        for exp in explanations:
            print(f"      - {exp}")

    total = passed + failed
    print(f"\n  合计: {passed} 项通过 / {total} 项检查")
    return failed == 0


def test_material_missing_samples(records, mapping, time_window, engine, results):
    """验证材料缺失样例"""
    print("\n" + "=" * 60)
    print("【验证3】材料缺失样例验证（状态分流正确）")
    print("=" * 60)

    material_ids = ["XC-2024-001", "XC-2024-002"]
    result_map = {r.record_id: r for r in results}
    record_map = {r.record_id: r for r in records}

    passed = 0
    failed = 0

    for rid in material_ids:
        rec = record_map.get(rid)
        res = result_map.get(rid)
        if not rec or not res:
            print(f"  ✗ {rid}: 未找到记录")
            failed += 1
            continue

        print(f"\n  ▸ {rid} ({rec.borrower_name} / {rec.branch})")
        print(f"    备注: {rec.remarks}")
        print(f"    原始状态: {STATUS_FLOW.get(rec.status, rec.status)}")
        print(f"    提供材料 ({len(rec.materials)}项): {', '.join(rec.materials)}")

        missing_issues = [i for i in res.issues if i["type"] == "material_missing"]
        if missing_issues:
            issue = missing_issues[0]
            missing_count = len(issue["missing_items"])
            print(f"    ✓ 检出缺失必选材料 {missing_count} 项:")
            for item in issue["missing_items"]:
                print(f"      - {item}")
            passed += 1

            if rec.status == "pending" and res.final_status == "supplement":
                print(f"    ✓ 状态分流正确: pending → supplement（待补材料）")
                passed += 1
            elif rec.status == "supplement" and res.final_status == "supplement":
                print(f"    ✓ 状态一致: 保持 supplement")
                passed += 1
            else:
                print(f"    ~ 最终状态: {STATUS_FLOW.get(res.final_status, res.final_status)}")
        else:
            print(f"    ✗ 未检出材料缺失")
            failed += 1

        print(f"    最终状态: {STATUS_FLOW.get(res.final_status, res.final_status)}")
        print(f"    责任人: {res.responsible_person}")
        if res.deadline:
            print(f"    截止日期: {res.deadline}")

        explanations = [e for e in res.explanations if "材料" in e]
        print(f"    材料相关解释 ({len(explanations)}条):")
        for exp in explanations:
            print(f"      - {exp}")

    total = passed + failed
    print(f"\n  合计: {passed} 项通过 / {total} 项检查")
    return failed == 0


def test_history_replay(records, mapping, time_window, engine, results):
    """验证历史回放样例"""
    print("\n" + "=" * 60)
    print("【验证4】历史回放样例验证（数据回放一致）")
    print("=" * 60)

    replay_ids = ["XC-2024-003", "CY-2024-004", "DC-2024-001", "DC-2024-003"]
    result_map = {r.record_id: r for r in results}
    record_map = {r.record_id: r for r in records}

    player = HistoryPlayer(engine.audit_trail)

    passed = 0
    failed = 0

    for rid in replay_ids:
        rec = record_map.get(rid)
        res = result_map.get(rid)
        if not rec or not res:
            print(f"  ✗ {rid}: 未找到记录")
            failed += 1
            continue

        in_window = time_window.contains(rec.apply_date)
        trail = player.replay_by_record(rid)
        replay_report = player.generate_replay_report(rid, rec, res)

        print(f"\n  ▸ {rid} ({rec.borrower_name} / {rec.branch})")
        print(f"    备注: {rec.remarks}")
        print(f"    申请日期: {rec.apply_date}")
        print(f"    是否在统计窗口内: {'是' if in_window else '否'}")

        if len(trail) > 0:
            print(f"    ✓ 审计轨迹完整，共 {len(trail)} 步")
            passed += 1
        else:
            print(f"    ✗ 无审计轨迹")
            failed += 1

        print(f"    审计步骤:")
        for step in replay_report["audit_steps"]:
            status_icon = "✓" if step["result"] in ("pass", "completed", "on_time") else "✗" if step["result"] == "fail" else "△"
            print(f"      {status_icon} 步骤{step['step']}: {step['rule']} → {step['result']}")
            if step["detail"]:
                print(f"         详情: {step['detail']}")

        issue_count_from_trail = sum(1 for t in trail if t["result"] in ("fail", "exceed", "overdue"))
        actual_issue_count = len(res.issues)
        print(f"    审计轨迹问题数: {issue_count_from_trail}, 实际问题数: {actual_issue_count}")

        if replay_report["final_status"] == res.final_status:
            print(f"    ✓ 回放状态与校验结果一致: {STATUS_FLOW.get(res.final_status, res.final_status)}")
            passed += 1
        else:
            print(f"    ✗ 回放状态不一致")
            failed += 1

        if replay_report["is_valid"] == res.is_valid:
            print(f"    ✓ 回放有效性与校验结果一致: {'通过' if res.is_valid else '不通过'}")
            passed += 1
        else:
            print(f"    ✗ 回放有效性不一致")
            failed += 1

        explanations = replay_report["explanations"]
        print(f"    可解释性说明 ({len(explanations)}条):")
        for exp in explanations[:3]:
            print(f"      - {exp}")
        if len(explanations) > 3:
            print(f"      ... 还有 {len(explanations) - 3} 条")

    total = passed + failed
    print(f"\n  合计: {passed} 项通过 / {total} 项检查")
    return failed == 0


def test_time_window_consistency(records, mapping, time_window, engine, results):
    """验证时间窗口一致性"""
    print("\n" + "=" * 60)
    print("【验证5】时间窗口与分组维度一致性验证")
    print("=" * 60)

    result_map = {r.record_id: r for r in results}
    in_window_records = [r for r in records if time_window.contains(r.apply_date)]
    out_window_records = [r for r in records if not time_window.contains(r.apply_date)]

    print(f"\n  时间窗口: {time_window.label}（共 {time_window.days()} 天）")
    print(f"  窗口内记录: {len(in_window_records)} 条")
    print(f"  窗口外记录: {len(out_window_records)} 条")

    passed = 0
    failed = 0

    for rec in out_window_records:
        res = result_map.get(rec.record_id)
        if not res:
            continue
        has_window_explanation = any("不在统计窗口" in e or "不在" in e for e in res.explanations)
        if has_window_explanation:
            print(f"    ✓ {rec.record_id}: 窗口外记录有明确解释")
            passed += 1
        else:
            print(f"    ✗ {rec.record_id}: 窗口外记录缺少解释")
            failed += 1

    from mortgage_discharge_validator import GroupAnalyzer
    analyzer = GroupAnalyzer(["branch"], time_window)
    group_summary = analyzer.summarize(records, results)
    total_in_summary = sum(g["count"] for g in group_summary["groups"])

    if total_in_summary == len(in_window_records):
        print(f"\n  ✓ 分组汇总统计与窗口内记录数一致: {total_in_summary}")
        passed += 1
    else:
        print(f"\n  ✗ 分组汇总统计不一致: 汇总={total_in_summary}, 窗口内={len(in_window_records)}")
        failed += 1

    print(f"\n  分支架构:")
    for g in group_summary["groups"]:
        print(f"    - {g['branch']}: {g['count']} 笔, 通过率 {g['valid_rate']}%, 金额 {g['total_discharge_amount']:,.2f} 元")

    total = passed + failed
    print(f"\n  合计: {passed} 项通过 / {total} 项检查")
    return failed == 0


def main():
    """主验证流程"""
    print("\n" + "#" * 60)
    print("#  不动产抵押注销数据校验系统 - 四类样例验证报告")
    print("#" * 60)

    records, mapping = load_test_data()

    time_window = TimeWindow.from_str("2024-01-01", "2024-12-31")
    today = date(2024, 6, 15)

    print(f"\n测试配置:")
    print(f"  记录总数: {len(records)}")
    print(f"  分支机构: {len(mapping)} 家")
    print(f"  统计窗口: {time_window.label}")
    print(f"  基准日期: {today.isoformat()}")

    engine = ValidationEngine(mapping, time_window, ["branch", "status"], today=today)
    results = engine.validate_all(records)

    print(f"\n校验概览:")
    print(f"  校验记录: {len(results)} 条")
    print(f"  校验通过: {sum(1 for r in results if r.is_valid)} 条")
    print(f"  存在问题: {sum(1 for r in results if r.issues)} 条")
    print(f"  高风险: {sum(1 for r in results if r.risk_level == 'high')} 条")
    print(f"  关注级: {sum(1 for r in results if r.risk_level == 'warning')} 条")

    all_passed = True

    all_passed &= test_compliant_samples(records, mapping, time_window, engine, results)
    all_passed &= test_threshold_samples(records, mapping, time_window, engine, results)
    all_passed &= test_material_missing_samples(records, mapping, time_window, engine, results)
    all_passed &= test_history_replay(records, mapping, time_window, engine, results)
    all_passed &= test_time_window_consistency(records, mapping, time_window, engine, results)

    print("\n" + "=" * 60)
    print("验证结论")
    print("=" * 60)
    if all_passed:
        print("  ✓ 全部验证通过！")
        print("    - 计算口径一致")
        print("    - 异常解释完整可追溯")
        print("    - 任务状态分流正确")
        print("    - 数据回放与原始校验一致")
    else:
        print("  ✗ 存在验证失败项，请检查上述详情")

    print("\n" + "#" * 60)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
