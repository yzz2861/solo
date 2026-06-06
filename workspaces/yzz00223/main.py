import argparse
import sys
from datetime import datetime, timedelta
from typing import List

from models import (
    CalibrationRecord,
    ValidationResult,
    CalibrationStatus,
    GroupDimension,
    StatisticsResult,
)
from validator import validate_records, filter_records_by_time
from triage import TriageManager
from statistics import StatisticsAnalyzer
from exporter import DataExporter
from sample_data import generate_all_samples
from config import (
    DEFAULT_TIME_WINDOW_DAYS,
    GROUP_DIMENSION_LABELS,
    STATUS_LABELS,
)


def parse_args():
    parser = argparse.ArgumentParser(
        description="空气微站校准提醒 - 数据校验、状态分流与闭环管理"
    )
    parser.add_argument(
        "--time-start",
        type=str,
        default="2026-05-01",
        help="统计开始日期 (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--time-end",
        type=str,
        default="2026-05-31",
        help="统计结束日期 (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--window-days",
        type=int,
        default=DEFAULT_TIME_WINDOW_DAYS,
        help="时间窗口天数",
    )
    parser.add_argument(
        "--group-by",
        type=str,
        default="station,region,department",
        help="分组维度，逗号分隔 (station, region, department, calibration_type, status)",
    )
    parser.add_argument(
        "--export-dir",
        type=str,
        default="./output",
        help="导出文件目录",
    )
    parser.add_argument(
        "--show-abnormal",
        action="store_true",
        help="显示异常样本详情",
    )
    parser.add_argument(
        "--show-trend",
        action="store_true",
        help="显示趋势摘要",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="运行一致性验证",
    )
    return parser.parse_args()


def parse_group_dimensions(dim_str: str) -> List[GroupDimension]:
    dim_map = {
        "station": GroupDimension.STATION,
        "region": GroupDimension.REGION,
        "department": GroupDimension.DEPARTMENT,
        "calibration_type": GroupDimension.CALIBRATION_TYPE,
        "status": GroupDimension.STATUS,
    }
    dimensions = []
    for d in dim_str.split(","):
        d = d.strip()
        if d in dim_map:
            dimensions.append(dim_map[d])
    if not dimensions:
        dimensions = [GroupDimension.STATION]
    return dimensions


def run_pipeline(
    time_start: datetime,
    time_end: datetime,
    group_dimensions: List[GroupDimension],
    window_days: int,
    export_dir: str,
    show_abnormal: bool = False,
    show_trend: bool = False,
) -> dict:
    records, resp_map, replay_samples = generate_all_samples(time_start, time_end)
    filtered_records = filter_records_by_time(records, time_start, time_end)

    validation_results = validate_records(
        filtered_records, resp_map, time_start, time_end, group_dimensions, window_days
    )

    triage = TriageManager(validation_results, resp_map)
    triage_groups = triage.triage_by_status()
    abnormal_samples = triage.get_abnormal_samples(limit=20)
    reminders = triage.get_reminder_list()

    analyzer = StatisticsAnalyzer(
        filtered_records, validation_results, resp_map,
        group_dimensions, time_start, time_end,
    )
    stats = analyzer.compute_statistics()
    summary = analyzer.generate_summary(stats)

    exporter = DataExporter(
        filtered_records, validation_results, resp_map,
        time_start, time_end,
    )
    all_records_export = exporter.export_all_records()
    abnormal_export = exporter.export_abnormal_samples()
    reminder_export = exporter.export_reminder_list()
    stats_export = exporter.export_statistics_json(stats)

    all_records_path = exporter.save_to_file(all_records_export, export_dir)
    abnormal_path = exporter.save_to_file(abnormal_export, export_dir)
    reminder_path = exporter.save_to_file(reminder_export, export_dir)
    stats_path = exporter.save_to_file(stats_export, export_dir)

    print(summary)

    if show_abnormal:
        print("\n" + "=" * 60)
        print("异常样本详情")
        print("=" * 60)
        for i, sample in enumerate(abnormal_samples, 1):
            print(f"\n【异常样本 {i}】")
            print(f"  记录ID: {sample['record_id']}")
            print(f"  站点: {sample['station_name']}")
            print(f"  状态: {sample['status_label']}")
            print(f"  责任人: {sample['responsible_person']}")
            print(f"  原因:")
            for reason in sample["reasons"]:
                print(f"    - {reason}")
            print(f"  时间窗口说明: {sample['time_explanation']}")
            print(f"  分组维度说明: {sample['dimension_explanation']}")

    if show_trend:
        print("\n" + "=" * 60)
        print("趋势摘要")
        print("=" * 60)
        for tp in stats.trend_points:
            bar_len = int(tp.total_count / max(1, max(
                t.total_count for t in stats.trend_points
            )) * 30)
            bar = "█" * bar_len
            print(
                f"  {tp.time_label}: {bar} {tp.total_count}条 "
                f"(合规{tp.compliant_count}, 异常{tp.total_count - tp.compliant_count})"
            )

    print("\n" + "=" * 60)
    print("导出文件")
    print("=" * 60)
    print(f"  全部记录: {all_records_path}")
    print(f"  异常样本: {abnormal_path}")
    print(f"  提醒清单: {reminder_path}")
    print(f"  统计数据: {stats_path}")

    return {
        "records": filtered_records,
        "validation_results": validation_results,
        "triage": triage,
        "statistics": stats,
        "exporter": exporter,
        "replay_samples": replay_samples,
        "export_paths": {
            "all_records": all_records_path,
            "abnormal": abnormal_path,
            "reminders": reminder_path,
            "stats": stats_path,
        },
    }


def verify_consistency(results: dict) -> bool:
    print("\n" + "=" * 60)
    print("一致性验证")
    print("=" * 60)

    all_passed = True
    validation_results = results["validation_results"]
    triage = results["triage"]
    stats = results["statistics"]
    exporter = results["exporter"]
    replay_samples = results["replay_samples"]
    records = results["records"]

    test_1_passed = verify_status_reason_consistency(validation_results, records)
    all_passed = all_passed and test_1_passed

    test_2_passed = verify_status_export_consistency(
        validation_results, exporter, records
    )
    all_passed = all_passed and test_2_passed

    test_3_passed = verify_triage_stats_consistency(triage, stats, validation_results)
    all_passed = all_passed and test_3_passed

    test_4_passed = verify_history_replay_consistency(triage, replay_samples)
    all_passed = all_passed and test_4_passed

    test_5_passed = verify_sample_categories(validation_results)
    all_passed = all_passed and test_5_passed

    test_6_passed = verify_close_loop_idempotency(triage, validation_results)
    all_passed = all_passed and test_6_passed

    print("\n" + "-" * 60)
    if all_passed:
        print("✅ 所有一致性验证通过")
    else:
        print("❌ 部分一致性验证未通过")
    print("=" * 60)

    return all_passed


def verify_status_reason_consistency(
    validation_results: dict, records: list
) -> bool:
    print("\n【验证1】状态与原因的一致性")
    passed = True
    for record_id, result in validation_results.items():
        has_threshold_hit = len(result.threshold_hits) > 0
        has_missing_material = len(result.missing_materials) > 0
        has_reasons = len(result.reasons) > 0

        if result.status == CalibrationStatus.COMPLIANT:
            if has_threshold_hit or has_missing_material:
                print(f"  ❌ 记录 {record_id}: 状态为合规但存在异常")
                passed = False
            if not has_reasons:
                print(f"  ❌ 记录 {record_id}: 合规记录缺少原因说明")
                passed = False
        elif result.status == CalibrationStatus.OVER_THRESHOLD:
            if not has_threshold_hit:
                print(f"  ❌ 记录 {record_id}: 状态为超阈值但无阈值命中")
                passed = False
            if has_missing_material:
                print(f"  ❌ 记录 {record_id}: 状态为超阈值但也有材料缺失")
                passed = False
        elif result.status == CalibrationStatus.MISSING_MATERIAL:
            if not has_missing_material:
                print(f"  ❌ 记录 {record_id}: 状态为材料缺失但无缺失材料")
                passed = False
            if has_threshold_hit:
                print(f"  ❌ 记录 {record_id}: 状态为材料缺失但也有超阈值")
                passed = False
        elif result.status == CalibrationStatus.PENDING_REVIEW:
            if not (has_threshold_hit and has_missing_material):
                print(f"  ❌ 记录 {record_id}: 状态为待审核但不是混合异常")
                passed = False

        if has_reasons and result.status != CalibrationStatus.COMPLIANT:
            reason_count = len(result.reasons)
            expected_count = len(result.threshold_hits) + len(result.missing_materials)
            if reason_count != expected_count:
                print(
                    f"  ❌ 记录 {record_id}: 原因数量({reason_count}) "
                    f"与异常数量({expected_count})不一致"
                )
                passed = False

    if passed:
        print(f"  ✅ {len(validation_results)} 条记录状态与原因一致")
    return passed


def verify_status_export_consistency(
    validation_results: dict, exporter: DataExporter, records: list
) -> bool:
    print("\n【验证2】状态与导出结果的一致性")
    passed = True

    abnormal_export = exporter.export_abnormal_samples()
    abnormal_count_export = len(abnormal_export.rows)

    abnormal_count_validation = sum(
        1 for r in validation_results.values()
        if r.status != CalibrationStatus.COMPLIANT
    )

    if abnormal_count_export != abnormal_count_validation:
        print(
            f"  ❌ 异常样本导出数量({abnormal_count_export}) "
            f"与校验结果({abnormal_count_validation})不一致"
        )
        passed = False
    else:
        print(f"  ✅ 异常样本导出数量一致: {abnormal_count_export} 条")

    all_export = exporter.export_all_records()
    all_count_export = len(all_export.rows)
    all_count_validation = len(validation_results)

    if all_count_export != all_count_validation:
        print(
            f"  ❌ 全部记录导出数量({all_count_export}) "
            f"与校验结果({all_count_validation})不一致"
        )
        passed = False
    else:
        print(f"  ✅ 全部记录导出数量一致: {all_count_export} 条")

    return passed


def verify_triage_stats_consistency(
    triage: TriageManager, stats: StatisticsResult, validation_results: dict
) -> bool:
    print("\n【验证3】分流结果与统计数据的一致性")
    passed = True

    triage_groups = triage.triage_by_status()

    status_counts = {
        "compliant": stats.compliant_count,
        "over_threshold": stats.over_threshold_count,
        "missing_material": stats.missing_material_count,
        "pending_review": stats.pending_count,
    }

    for status, count in status_counts.items():
        triage_count = len(triage_groups.get(status, []))
        if triage_count != count:
            print(
                f"  ❌ {STATUS_LABELS.get(status, status)}: "
                f"分流数({triage_count}) ≠ 统计数({count})"
            )
            passed = False
        else:
            print(
                f"  ✅ {STATUS_LABELS.get(status, status)}: "
                f"分流数与统计数一致 ({count} 条)"
            )

    total_from_stats = (
        stats.compliant_count
        + stats.over_threshold_count
        + stats.missing_material_count
        + stats.pending_count
    )
    if total_from_stats != stats.total_records:
        print(
            f"  ❌ 分类合计({total_from_stats}) ≠ 总数({stats.total_records})"
        )
        passed = False
    else:
        print(f"  ✅ 分类合计与总数一致: {total_from_stats} 条")

    return passed


def verify_history_replay_consistency(
    triage: TriageManager, replay_samples: list
) -> bool:
    print("\n【验证4】历史回放轨迹的一致性")
    passed = True

    for scenario in replay_samples:
        name = scenario["scenario_name"]
        record_id = scenario["record_id"]
        steps = scenario["steps"]

        trajectory = triage.replay_history(record_id, steps)

        if len(trajectory) != len(steps):
            print(
                f"  ❌ 场景「{name}」: 轨迹步数({len(trajectory)}) "
                f"≠ 输入步数({len(steps)})"
            )
            passed = False
            continue

        initial_step = steps[0]
        initial_status = initial_step.get("initial_status", "")
        traj_initial = trajectory[0].get("status", "")
        if initial_status != traj_initial:
            print(
                f"  ❌ 场景「{name}」: 初始状态不一致 "
                f"({initial_status} vs {traj_initial})"
            )
            passed = False
            continue

        final_step = trajectory[-1]
        if "to_status" in final_step:
            final_status = final_step["to_status"]
        else:
            final_status = final_step.get("status", "")

        last_action = steps[-1].get("action", "")
        if last_action == "close_loop":
            if final_status != CalibrationStatus.CLOSED_LOOP.value:
                print(
                    f"  ❌ 场景「{name}」: 闭环操作后状态不是已闭环"
                )
                passed = False
            else:
                print(f"  ✅ 场景「{name}」: 历史轨迹回放正确")
        else:
            print(f"  ✅ 场景「{name}」: 历史轨迹回放正确")

    return passed


def verify_sample_categories(validation_results: dict) -> bool:
    print("\n【验证5】样例分类验证")
    passed = True

    compliant_samples = [
        rid for rid in validation_results
        if rid.startswith("REC-C-")
    ]
    over_samples = [
        rid for rid in validation_results
        if rid.startswith("REC-O-")
    ]
    missing_samples = [
        rid for rid in validation_results
        if rid.startswith("REC-M-")
    ]
    mixed_samples = [
        rid for rid in validation_results
        if rid.startswith("REC-X-")
    ]

    for rid in compliant_samples:
        result = validation_results[rid]
        if result.status != CalibrationStatus.COMPLIANT:
            print(f"  ❌ 合规范例 {rid} 被判定为 {result.status.value}")
            passed = False
    if all(
        validation_results[rid].status == CalibrationStatus.COMPLIANT
        for rid in compliant_samples
    ):
        print(f"  ✅ {len(compliant_samples)} 条合规范例全部正确")

    for rid in over_samples:
        result = validation_results[rid]
        if result.status != CalibrationStatus.OVER_THRESHOLD:
            print(f"  ❌ 超阈值范例 {rid} 被判定为 {result.status.value}")
            passed = False
    if all(
        validation_results[rid].status == CalibrationStatus.OVER_THRESHOLD
        for rid in over_samples
    ):
        print(f"  ✅ {len(over_samples)} 条超阈值范例全部正确")

    for rid in missing_samples:
        result = validation_results[rid]
        if result.status != CalibrationStatus.MISSING_MATERIAL:
            print(f"  ❌ 材料缺失范例 {rid} 被判定为 {result.status.value}")
            passed = False
    if all(
        validation_results[rid].status == CalibrationStatus.MISSING_MATERIAL
        for rid in missing_samples
    ):
        print(f"  ✅ {len(missing_samples)} 条材料缺失范例全部正确")

    for rid in mixed_samples:
        result = validation_results[rid]
        if result.status != CalibrationStatus.PENDING_REVIEW:
            print(f"  ❌ 混合范例 {rid} 被判定为 {result.status.value}")
            passed = False
    if all(
        validation_results[rid].status == CalibrationStatus.PENDING_REVIEW
        for rid in mixed_samples
    ):
        print(f"  ✅ {len(mixed_samples)} 条混合范例全部正确（待审核状态）")

    return passed


def verify_close_loop_idempotency(
    triage: TriageManager, validation_results: dict
) -> bool:
    print("\n【验证6】闭环操作幂等性与状态正确性")
    passed = True

    over_threshold_ids = [
        rid for rid, r in validation_results.items()
        if r.status == CalibrationStatus.OVER_THRESHOLD
    ]
    compliant_ids = [
        rid for rid, r in validation_results.items()
        if r.status == CalibrationStatus.COMPLIANT
    ]

    if over_threshold_ids:
        test_id = over_threshold_ids[0]
        first_result = triage.close_loop(test_id, "测试整改完成", "测试员")
        second_result = triage.close_loop(test_id, "再次尝试闭环", "测试员")

        if not first_result:
            print(f"  ❌ 首次闭环应返回成功但返回失败")
            passed = False
        if second_result:
            print(f"  ❌ 重复闭环应返回失败但返回成功")
            passed = False
        if first_result and not second_result:
            print(f"  ✅ 重复调用 close_loop 返回正确（首次成功，二次失败）")

        history = triage.get_history(test_id)
        if len(history) != 1:
            print(
                f"  ❌ 历史记录应为1条但有{len(history)}条，重复添加了历史记录"
            )
            passed = False
        else:
            print(f"  ✅ 历史记录正确，仅添加1条闭环记录")

        triage_groups = triage.triage_by_status()
        closed_loop_count = len(triage_groups.get(CalibrationStatus.CLOSED_LOOP.value, []))
        if closed_loop_count < 1:
            print(f"  ❌ 已闭环分组中无记录")
            passed = False
        else:
            print(f"  ✅ 已闭环分组中记录数正确: {closed_loop_count} 条")

    if compliant_ids:
        test_id = compliant_ids[0]
        result = triage.close_loop(test_id, "尝试对合规记录闭环", "测试员")
        if result:
            print(f"  ❌ 对合规记录执行闭环应返回失败但返回成功")
            passed = False
        else:
            print(f"  ✅ 对合规记录执行闭环正确返回失败")

    nonexistent_result = triage.close_loop("NONEXISTENT", "测试", "测试员")
    if nonexistent_result:
        print(f"  ❌ 对不存在的记录闭环应返回失败但返回成功")
        passed = False
    else:
        print(f"  ✅ 对不存在的记录闭环正确返回失败")

    return passed


def main():
    args = parse_args()

    time_start = datetime.strptime(args.time_start, "%Y-%m-%d")
    time_end = datetime.strptime(args.time_end, "%Y-%m-%d")
    group_dimensions = parse_group_dimensions(args.group_by)

    print("空气微站校准提醒管理系统")
    print(f"时间范围: {time_start.strftime('%Y-%m-%d')} ~ {time_end.strftime('%Y-%m-%d')}")
    print(f"分组维度: {', '.join([GROUP_DIMENSION_LABELS.get(d.value, d.value) for d in group_dimensions])}")
    print(f"时间窗口: {args.window_days} 天")

    results = run_pipeline(
        time_start, time_end, group_dimensions,
        args.window_days, args.export_dir,
        show_abnormal=args.show_abnormal,
        show_trend=args.show_trend,
    )

    if args.verify:
        passed = verify_consistency(results)
        sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
