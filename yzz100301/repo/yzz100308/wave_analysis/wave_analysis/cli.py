"""
命令行入口
"""
import argparse
import os
import sys

from .importer import DataImporter
from .engine import WaveAnalysisEngine
from .anomalies import AnomalyDetector
from .report import ReportGenerator


def run_analysis(wave_csv=None, review_json=None, supplement_csv=None,
                 wave_dir=None, review_dir=None, supplement_dir=None,
                 output_dir='output', report_title='晚班拣货波次复盘报告',
                 reset=False):
    """运行完整分析流程"""

    os.makedirs(output_dir, exist_ok=True)
    state_file = os.path.join(output_dir, 'import_state.json')

    importer = DataImporter(state_file=state_file)

    if reset:
        importer.reset_state()
        print("已重置导入状态")

    wave_df = None
    if wave_csv:
        wave_df, is_new = importer.import_wave_csv(wave_csv)
        print(f"波次CSV: {'新导入' if is_new else '已存在，跳过'} ({len(wave_df)}条)")
    elif wave_dir:
        wave_df = importer.import_wave_dir(wave_dir)
        print(f"波次目录: 共 {len(wave_df)} 条记录")

    review_df = None
    if review_json:
        review_df, is_new = importer.import_review_json(review_json)
        print(f"复核JSON: {'新导入' if is_new else '已存在，跳过'} ({len(review_df)}条)")
    elif review_dir:
        review_df = importer.import_review_dir(review_dir)
        print(f"复核目录: 共 {len(review_df)} 条记录")

    supplement_df = None
    if supplement_csv:
        supplement_df, is_new = importer.import_supplement_csv(supplement_csv)
        print(f"短拣补录CSV: {'新导入' if is_new else '已存在，跳过'} ({len(supplement_df)}条)")
    elif supplement_dir:
        supplement_df = importer.import_supplement_dir(supplement_dir)
        print(f"短拣补录目录: 共 {len(supplement_df)} 条记录")

    if wave_df is None:
        print("错误: 请提供波次数据 (--wave-csv 或 --wave-dir)")
        sys.exit(1)

    engine = WaveAnalysisEngine()
    review_df_final = review_df if review_df is not None else _empty_df()
    supplement_df_final = supplement_df if supplement_df is not None else _empty_df()
    engine.load_data(wave_df, review_df_final, supplement_df_final)
    merged = engine.build_merged_detail()

    print(f"\n关联完成: 共 {len(merged)} 条波次-SKU记录")
    overall = engine.get_overall_summary()
    print(f"  应拣总数: {overall['total_expected']}")
    print(f"  实拣总数: {overall['total_picked']}")
    print(f"  最终短拣: {overall['total_final_short']}")
    print(f"  拣货完成率: {overall['pick_rate_pct']}%")
    print(f"  最终履约率: {overall['fulfill_rate_pct']}%")

    detector = AnomalyDetector(engine)
    anomalies = detector.detect_all()

    print(f"\n异常检测结果:")
    for name, df in anomalies.items():
        desc = detector._get_anomaly_description(name)
        print(f"  {name}: {len(df)} 条 - {desc}")

    detail_csv = os.path.join(output_dir, 'merged_detail.csv')
    merged.to_csv(detail_csv, index=False, encoding='utf-8-sig')
    print(f"\n关联明细已导出: {detail_csv}")

    anomaly_csv_dir = os.path.join(output_dir, 'anomalies')
    anomaly_paths = detector.export_anomalies_csv(anomaly_csv_dir)
    all_anomaly_csv = os.path.join(output_dir, 'all_anomalies.csv')
    detector.export_all_anomalies_csv(all_anomaly_csv)
    print(f"异常明细已导出: {all_anomaly_csv}")

    wave_summary = engine.get_wave_summary()
    wave_summary_csv = os.path.join(output_dir, 'wave_summary.csv')
    wave_summary.to_csv(wave_summary_csv, index=False, encoding='utf-8-sig')
    print(f"波次汇总已导出: {wave_summary_csv}")

    report_path = os.path.join(output_dir, 'report.html')
    report_gen = ReportGenerator(engine, detector)
    report_gen.generate_html_report(report_path, report_title=report_title)
    print(f"\nHTML报告已生成: {report_path}")

    print("\n=== 分析完成 ===")
    return {
        'merged_detail': detail_csv,
        'all_anomalies': all_anomaly_csv,
        'wave_summary': wave_summary_csv,
        'anomaly_files': anomaly_paths,
        'report': report_path,
    }


def _empty_df():
    import pandas as pd
    return pd.DataFrame()


def main():
    parser = argparse.ArgumentParser(
        description='电商仓晚班拣货波次复盘分析工具'
    )

    parser.add_argument('--wave-csv', help='波次CSV文件路径')
    parser.add_argument('--review-json', help='复核扫描JSON文件路径')
    parser.add_argument('--supplement-csv', help='短拣补录CSV文件路径')

    parser.add_argument('--wave-dir', help='波次CSV目录（批量导入）')
    parser.add_argument('--review-dir', help='复核JSON目录（批量导入）')
    parser.add_argument('--supplement-dir', help='短拣补录CSV目录（批量导入）')

    parser.add_argument('-o', '--output', default='output', help='输出目录 (默认: output)')
    parser.add_argument('--title', default='晚班拣货波次复盘报告', help='报告标题')
    parser.add_argument('--reset', action='store_true', help='重置导入状态，重新导入所有文件')

    parser.add_argument('--sample', action='store_true', help='生成示例数据并运行分析')

    args = parser.parse_args()

    if args.sample:
        from .sample_data import generate_sample_data
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        wave_csv, review_json, supplement_csv = generate_sample_data(data_dir)
        run_analysis(
            wave_csv=wave_csv,
            review_json=review_json,
            supplement_csv=supplement_csv,
            output_dir=args.output,
            report_title=args.title,
            reset=True,
        )
        return

    if not args.wave_csv and not args.wave_dir:
        parser.print_help()
        print("\n错误: 请至少提供 --wave-csv 或 --wave-dir")
        sys.exit(1)

    run_analysis(
        wave_csv=args.wave_csv,
        review_json=args.review_json,
        supplement_csv=args.supplement_csv,
        wave_dir=args.wave_dir,
        review_dir=args.review_dir,
        supplement_dir=args.supplement_dir,
        output_dir=args.output,
        report_title=args.title,
        reset=args.reset,
    )


if __name__ == '__main__':
    main()
