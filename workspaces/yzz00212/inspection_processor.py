#!/usr/bin/env python3
"""
快速路隧道照明巡检批量处理脚本

功能：
- 输入多来源日志、配置文件、历史基线
- 输出分组报表、坏数据清单、JSON结果、人工复核表
- 支持时间窗口、分组维度和阈值命中可解释
- 风险等级：低风险、中风险、高风险、无法判定
- 状态、原因、导出结果和历史轨迹保持一致
"""

import argparse
import sys
import os
import yaml
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.log_loader import LogLoader
from src.baseline import BaselineManager
from src.data_cleaner import DataCleaner
from src.time_window import TimeWindowAggregator
from src.risk_engine import RiskEngine
from src.result_exporter import ResultExporter


def load_config(config_path: str) -> dict:
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
    return config


def main():
    parser = argparse.ArgumentParser(
        description='快速路隧道照明巡检批量处理脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例：
  python inspection_processor.py -l ./data/logs -c ./config/config.yaml -o ./output
  python inspection_processor.py -l ./data/logs -b ./data/baseline -c ./config/config.yaml -o ./output
        """
    )

    parser.add_argument('-l', '--logs', required=True,
                        help='日志文件目录或单个日志文件路径')
    parser.add_argument('-c', '--config', required=True,
                        help='配置文件路径 (YAML)')
    parser.add_argument('-o', '--output', required=True,
                        help='输出目录路径')
    parser.add_argument('-b', '--baseline', default=None,
                        help='历史基线文件或目录路径 (可选)')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='显示详细处理信息')

    args = parser.parse_args()

    print("=" * 60)
    print("  快速路隧道照明巡检批量处理工具")
    print("=" * 60)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    if not os.path.exists(args.config):
        print(f"错误: 配置文件不存在: {args.config}")
        sys.exit(1)

    config = load_config(args.config)
    if args.verbose:
        print(f"[配置] 已加载配置文件: {args.config}")

    print("[步骤 1/6] 加载日志数据...")
    log_loader = LogLoader(config)

    if os.path.isdir(args.logs):
        records = log_loader.load_from_directory(args.logs)
    else:
        records = log_loader.load_from_files([args.logs])

    source_info = log_loader.get_source_info()
    print(f"  - 加载文件数: {len(source_info)}")
    print(f"  - 总记录数: {len(records)}")
    if args.verbose:
        for info in source_info:
            print(f"    * {info['filename']}: {info['record_count']} 条")

    print()
    print("[步骤 2/6] 数据清洗与坏数据识别...")
    cleaner = DataCleaner(config)
    clean_data, bad_data = cleaner.clean(records)
    stats = cleaner.get_stats()
    print(f"  - 有效记录: {stats['valid']}")
    print(f"  - 坏数据: {stats['invalid']}")
    print(f"  - 缺失字段: {stats['missing_field']}")
    print(f"  - 超出范围: {stats['out_of_range']}")
    print(f"  - 重复记录: {stats['duplicate']}")
    print(f"  - 无效时间戳: {stats['invalid_timestamp']}")

    baseline_manager = None
    if args.baseline and os.path.exists(args.baseline):
        print()
        print("[步骤 3/6] 加载历史基线...")
        baseline_manager = BaselineManager(config)
        baseline_manager.load_baseline(args.baseline)
        baseline_keys = baseline_manager.get_all_group_keys()
        print(f"  - 基线分组数: {len(baseline_keys)}")
        if args.verbose:
            for key in baseline_keys[:5]:
                print(f"    * {key}")
            if len(baseline_keys) > 5:
                print(f"    ... 共 {len(baseline_keys)} 个分组")
    else:
        print()
        print("[步骤 3/6] 跳过历史基线（未提供）")

    print()
    print("[步骤 4/6] 时间窗口聚合与分组...")
    aggregator = TimeWindowAggregator(config)
    window_results = aggregator.aggregate(clean_data)
    summary = aggregator.get_summary()
    print(f"  - 时间窗口数: {summary['window_count']}")
    print(f"  - 窗口大小: {summary['window_size_minutes']} 分钟")
    print(f"  - 滑动步长: {summary['slide_step_minutes']} 分钟")
    print(f"  - 独立分组数: {summary['unique_groups']}")
    if args.verbose:
        print(f"  - 起始时间: {summary['start_time']}")
        print(f"  - 结束时间: {summary['end_time']}")

    print()
    print("[步骤 5/6] 风险判定...")
    risk_engine = RiskEngine(config)
    all_results = risk_engine.evaluate_all_windows(
        window_results, baseline_manager, aggregator
    )

    final_summary = risk_engine.get_final_summary(all_results)
    print(f"  - 总组数: {final_summary.get('total_groups', 0)}")
    print(f"  - 高风险: {final_summary.get('high_risk', 0)}")
    print(f"  - 中风险: {final_summary.get('medium_risk', 0)}")
    print(f"  - 低风险: {final_summary.get('low_risk', 0)}")
    print(f"  - 无法判定: {final_summary.get('undetermined', 0)}")
    print(f"  - 需人工复核: {final_summary.get('needs_review', 0)}")

    print()
    print("[步骤 6/6] 导出结果...")
    exporter = ResultExporter(config)

    history_traces = {}
    for group_key in aggregator.get_all_group_keys():
        history_traces[group_key] = aggregator.get_history_trace(group_key)

    output_files = exporter.export_all(
        all_results=all_results,
        bad_data=bad_data,
        output_dir=args.output,
        history_traces=history_traces,
        source_info=source_info,
        clean_stats=stats
    )

    print(f"  - 分组报表: {output_files['group_report']}")
    print(f"  - 坏数据清单: {output_files['bad_data']}")
    print(f"  - JSON结果: {output_files['result_json']}")
    print(f"  - 人工复核表: {output_files['manual_review']}")

    print()
    print("=" * 60)
    print("  处理完成")
    print(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"输出目录: {os.path.abspath(args.output)}")
    print("=" * 60)


if __name__ == '__main__':
    main()
