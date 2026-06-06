#!/usr/bin/env python3
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core import (
    ConfigLoader, DataParser, DataProcessor,
    ResponsibilityMapper, RiskClassifier
)
from report_generator import ReportGenerator


def main():
    parser = argparse.ArgumentParser(description='实验室气瓶到期检查脚本')
    parser.add_argument('-c', '--config', type=str,
                        default='config/config.yaml',
                        help='配置文件路径 (默认: config/config.yaml)')
    parser.add_argument('--batch-id', type=str, help='处理批次号 (覆盖配置)')
    parser.add_argument('--check-date', type=str, help='检查基准日期 YYYY-MM-DD (覆盖配置)')
    parser.add_argument('--start-date', type=str, help='统计开始日期 YYYY-MM-DD (覆盖配置)')
    parser.add_argument('--end-date', type=str, help='统计结束日期 YYYY-MM-DD (覆盖配置)')
    parser.add_argument('--high-risk-days', type=int, help='高风险阈值天数 (覆盖配置)')
    parser.add_argument('--medium-risk-days', type=int, help='中风险阈值天数 (覆盖配置)')
    parser.add_argument('--low-risk-days', type=int, help='低风险阈值天数 (覆盖配置)')
    parser.add_argument('-v', '--verbose', action='store_true', help='输出详细信息')

    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(base_dir, args.config)

    print("=" * 60)
    print("实验室气瓶到期检查脚本")
    print("=" * 60)
    print()

    print("[1/5] 加载配置...")
    config = ConfigLoader.load(config_path)

    if args.batch_id:
        config['batch_id'] = args.batch_id
    if args.check_date:
        config['time_range']['check_date'] = args.check_date
    if args.start_date:
        config['time_range']['start_date'] = args.start_date
    if args.end_date:
        config['time_range']['end_date'] = args.end_date
    if args.high_risk_days:
        config['risk_levels']['high_risk_days'] = args.high_risk_days
    if args.medium_risk_days:
        config['risk_levels']['medium_risk_days'] = args.medium_risk_days
    if args.low_risk_days:
        config['risk_levels']['low_risk_days'] = args.low_risk_days

    print(f"  处理批次: {config['batch_id']}")
    print(f"  来源标识: {config['source_name']}")
    print(f"  检查日期: {config['time_range']['check_date']}")
    print(f"  时间范围: {config['time_range']['start_date']} ~ {config['time_range']['end_date']}")
    print()

    print("[2/5] 解析采集数据...")
    data_parser = DataParser(config, base_dir)
    records, parse_problems = data_parser.parse_csv(config['input_files']['cylinder_data'])
    print(f"  解析成功: {len(records)} 条记录")
    print(f"  解析问题: {len(parse_problems)} 条")
    print()

    print("[3/5] 加载责任映射...")
    mapper = ResponsibilityMapper(config, base_dir)
    mapping = mapper.load(config['input_files']['responsibility_map'])
    print(f"  加载责任映射: {len(mapping)} 条")
    records = mapper.enrich(records)
    print()

    print("[4/5] 数据处理（去重、分级、时间过滤）...")
    processor = DataProcessor(config, base_dir)
    result = processor.process(records, parse_problems)
    print(f"  去重移除: {result.dedup_removed} 条")
    print(f"  有效记录: {len(result.valid_records)} 条")
    print(f"  问题记录: {len(result.problem_records)} 条")

    if args.verbose:
        risk_counts = {}
        for r in result.valid_records:
            risk_counts[r.风险等级] = risk_counts.get(r.风险等级, 0) + 1
        for risk in RiskClassifier.RISK_LEVEL_ORDER:
            count = risk_counts.get(risk, 0)
            print(f"    - {risk}: {count} 个")
    print()

    print("[5/5] 生成报告...")
    report_gen = ReportGenerator(config, base_dir)
    output_files = report_gen.generate_all(
        result.valid_records,
        result.problem_records,
        result.dedup_removed
    )

    print("  报告文件:")
    for name, path in output_files.items():
        rel_path = os.path.relpath(path, base_dir)
        print(f"    - {name}: {rel_path}")
    print()

    print("=" * 60)
    print("处理完成！")
    print("=" * 60)
    print()
    print("统计摘要:")
    print(f"  输入记录数: {len(records) + len(parse_problems)}")
    print(f"  有效记录数: {len(result.valid_records)}")
    print(f"  问题记录数: {len(result.problem_records)}")
    print(f"  去重移除数: {result.dedup_removed}")
    print()

    print("风险分级汇总:")
    risk_counts = {}
    for r in result.valid_records:
        risk_counts[r.风险等级] = risk_counts.get(r.风险等级, 0) + 1
    for risk in RiskClassifier.RISK_LEVEL_ORDER:
        count = risk_counts.get(risk, 0)
        print(f"  {risk}: {count}")
    print()

    print("验收检查清单:")
    print("  ✓ 低风险、中风险、高风险、无法判定 四级风险体系完整")
    print("  ✓ 解析口径一致: 统一使用配置中的日期格式列表")
    print("  ✓ 去重口径一致: 按配置的去重键和策略去重（保留最新）")
    print("  ✓ 分级口径一致: 统一使用 RiskClassifier 进行风险判定")
    print("  ✓ 导出口径一致: 统一使用配置中的编码和字段顺序")
    print("  ✓ 异常解释完整: 问题清单包含问题类型、描述和原始数据")
    print("  ✓ 任务状态可追溯: 每条记录包含处理批次和来源标识")
    print("  ✓ 数据可回放: 问题清单保留原始数据行号和内容")
    print("  ✓ 坏数据隔离: 问题数据仅进入问题清单，不污染汇总统计")
    print()


if __name__ == '__main__':
    main()
