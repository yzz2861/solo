#!/usr/bin/env python3
"""
种子批次发芽率脚本
功能：将种子批次发芽率原始记录整理成可复核报告
输入：原始明细、字典表、阈值规则、统计周期
输出：分组报表、坏数据清单、JSON结果、人工复核表
"""

import csv
import json
import os
import sys
import argparse
from datetime import datetime, date
from collections import defaultdict
import hashlib


class SeedGerminationAnalyzer:
    def __init__(self, raw_file, dict_file, threshold_file, period_start=None, period_end=None, output_dir="output"):
        self.raw_file = raw_file
        self.dict_file = dict_file
        self.threshold_file = threshold_file
        self.period_start = period_start
        self.period_end = period_end
        self.output_dir = output_dir

        self.raw_records = []
        self.dictionary = {}
        self.thresholds = {}
        self.valid_records = []
        self.bad_records = []
        self.duplicate_records = []
        self.group_results = {}
        self.review_records = []

        os.makedirs(self.output_dir, exist_ok=True)

    def load_dictionary(self):
        print("[INFO] 加载字典表...")
        with open(self.dict_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                self.dictionary[row['品种编号']] = row
        print(f"[INFO] 字典表加载完成，共 {len(self.dictionary)} 个品种")

    def load_thresholds(self):
        print("[INFO] 加载阈值规则...")
        with open(self.threshold_file, 'r', encoding='utf-8-sig') as f:
            self.thresholds = json.load(f)
        print(f"[INFO] 阈值规则加载完成")

    def load_raw_records(self):
        print("[INFO] 加载原始明细...")
        with open(self.raw_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            self.raw_records = list(reader)
        print(f"[INFO] 原始明细加载完成，共 {len(self.raw_records)} 条记录")

    def _record_fingerprint(self, record):
        key_fields = ['记录编号', '批次编号', '品种编号', '试验日期', '培养皿编号']
        key_str = '|'.join(str(record.get(k, '')) for k in key_fields)
        return hashlib.md5(key_str.encode('utf-8')).hexdigest()

    def _is_within_period(self, record_date_str):
        if not record_date_str:
            return True
        try:
            record_date = datetime.strptime(record_date_str, '%Y-%m-%d').date()
        except ValueError:
            return True
        if self.period_start:
            period_start = datetime.strptime(self.period_start, '%Y-%m-%d').date()
            if record_date < period_start:
                return False
        if self.period_end:
            period_end = datetime.strptime(self.period_end, '%Y-%m-%d').date()
            if record_date > period_end:
                return False
        return True

    def validate_records(self):
        print("[INFO] 数据质量校验中...")

        seen_fingerprints = defaultdict(list)
        missing_count = 0
        duplicate_count = 0
        out_of_bounds_count = 0

        for idx, record in enumerate(self.raw_records, 1):
            issues = []
            record['_行号'] = idx
            record['_问题类型'] = []
            record['_问题描述'] = []

            required_fields = ['记录编号', '批次编号', '品种编号', '试验日期', '种子粒数', '发芽粒数']
            for field in required_fields:
                if not record.get(field, '').strip():
                    issues.append(f'缺失:{field}')
                    record['_问题类型'].append('缺失')
                    record['_问题描述'].append(f'{field}为空')
                    missing_count += 1

            if record.get('品种编号') and record['品种编号'] not in self.dictionary:
                issues.append(f'字典不匹配:品种编号={record["品种编号"]}')
                record['_问题类型'].append('字典不匹配')
                record['_问题描述'].append(f'品种编号{record["品种编号"]}在字典表中不存在')
                missing_count += 1

            seed_count = None
            germ_count = None
            try:
                if record.get('种子粒数', '').strip():
                    seed_count = int(record['种子粒数'])
                    sc_min = self.thresholds['seed_count']['min']
                    sc_max = self.thresholds['seed_count']['max']
                    if seed_count < sc_min or seed_count > sc_max:
                        issues.append(f'越界:种子粒数={seed_count}')
                        record['_问题类型'].append('越界')
                        record['_问题描述'].append(f'种子粒数{seed_count}超出范围[{sc_min},{sc_max}]')
                        out_of_bounds_count += 1
            except ValueError:
                issues.append('格式错误:种子粒数')
                record['_问题类型'].append('格式错误')
                record['_问题描述'].append('种子粒数不是有效数字')

            try:
                if record.get('发芽粒数', '').strip():
                    germ_count = int(record['发芽粒数'])
                    gr_min = self.thresholds['germination_rate']['min_possible']
                    gr_max = self.thresholds['germination_rate']['max_possible']
                    if seed_count is not None:
                        if germ_count < 0 or germ_count > seed_count:
                            issues.append(f'越界:发芽粒数={germ_count}(种子粒数={seed_count})')
                            record['_问题类型'].append('越界')
                            record['_问题描述'].append(f'发芽粒数{germ_count}异常，不能超过种子粒数{seed_count}')
                            out_of_bounds_count += 1
                    else:
                        if germ_count < gr_min or germ_count > gr_max * 2:
                            issues.append(f'越界:发芽粒数={germ_count}')
                            record['_问题类型'].append('越界')
                            record['_问题描述'].append(f'发芽粒数{germ_count}超出合理范围')
                            out_of_bounds_count += 1
            except ValueError:
                issues.append('格式错误:发芽粒数')
                record['_问题类型'].append('格式错误')
                record['_问题描述'].append('发芽粒数不是有效数字')

            if seed_count is not None and germ_count is not None and seed_count > 0:
                    rate = (germ_count / seed_count) * 100
                    record['_发芽率'] = round(rate, 2)
            else:
                record['_发芽率'] = None

            fp = self._record_fingerprint(record)
            seen_fingerprints[fp].append(record)

            if not self._is_within_period(record.get('试验日期', '')):
                issues.append('统计周期外')
                record['_问题类型'].append('周期外')
                record['_问题描述'].append('不在统计周期内')

            if issues:
                record['_是否有效'] = False
                record['_问题汇总'] = '; '.join(record['_问题描述'])
            else:
                record['_是否有效'] = True
                record['_问题汇总'] = ''

        for fp, records in seen_fingerprints.items():
            if len(records) > 1:
                for i, rec in enumerate(records):
                    if i == 0:
                        if '重复' not in rec['_问题类型']:
                            rec['_问题类型'].append('重复(首次)')
                            rec['_问题描述'].append(f'重复记录，共{len(records)}条，此条为首条')
                    else:
                        rec['_问题类型'].append('重复')
                        rec['_问题描述'].append(f'重复记录，共{len(records)}条，此条为第{i+1}条')
                        rec['_问题汇总'] = '; '.join(rec['_问题描述'])
                        rec['_是否有效'] = False
                        duplicate_count += 1
                        self.duplicate_records.append(rec)

        for record in self.raw_records:
            if record['_是否有效']:
                if '重复(首次)' in record['_问题类型']:
                    record['_是否有效'] = True
                self.valid_records.append(record)
            else:
                self.bad_records.append(record)

        print(f"[INFO] 数据质量校验完成")
        print(f"  - 有效记录: {len(self.valid_records)} 条")
        print(f"  - 坏数据: {len(self.bad_records)} 条")
        print(f"    - 缺失类: {sum(1 for r in self.bad_records if '缺失' in r['_问题类型'] or '字典不匹配' in r['_问题类型'])} 条")
        print(f"    - 重复类: {duplicate_count} 条")
        print(f"    - 越界类: {sum(1 for r in self.bad_records if '越界' in r['_问题类型'])} 条")

    def calculate_group_statistics(self):
        print("[INFO] 生成分组统计报表...")

        batch_groups = defaultdict(list)
        variety_groups = defaultdict(list)
        crop_groups = defaultdict(list)

        for record in self.valid_records:
            batch = record['批次编号']
            variety = record['品种编号']
            crop = self.dictionary.get(variety, {}).get('作物类型', '未知')

            batch_groups[batch].append(record)
            variety_groups[variety].append(record)
            crop_groups[crop].append(record)

        def calc_stats(records):
            if not records:
                return {}
            rates = [r['_发芽率'] for r in records if r['_发芽率'] is not None]
            total_seeds = sum(int(r['种子粒数']) for r in records if r.get('种子粒数', '').strip().isdigit())
            total_germs = sum(int(r['发芽粒数']) for r in records if r.get('发芽粒数', '').strip().isdigit())

            avg_rate = sum(rates) / len(rates) if rates else 0
            min_rate = min(rates) if rates else 0
            max_rate = max(rates) if rates else 0

            qualified_count = sum(1 for r in rates if r >= self.thresholds['germination_rate']['qualified'])
            excellent_count = sum(1 for r in rates if r >= self.thresholds['germination_rate']['excellent'])

            overall_rate = (total_germs / total_seeds * 100) if total_seeds > 0 else 0

            return {
                '记录数': len(records),
                '种子总数': total_seeds,
                '发芽总数': total_germs,
                '平均发芽率': round(avg_rate, 2),
                '最低发芽率': round(min_rate, 2),
                '最高发芽率': round(max_rate, 2),
                '综合发芽率': round(overall_rate, 2),
                '合格皿数': qualified_count,
                '优秀皿数': excellent_count,
                '合格率': round(qualified_count / len(rates) * 100, 2) if rates else 0,
            }

        self.group_results = {
            '按批次': {},
            '按品种': {},
            '按作物类型': {},
        }

        for batch, records in batch_groups.items():
            self.group_results['按批次'][batch] = calc_stats(records)
            variety = records[0]['品种编号'] if records else ''
            self.group_results['按批次'][batch]['品种编号'] = variety
            self.group_results['按批次'][batch]['品种名称'] = self.dictionary.get(variety, {}).get('品种名称', '')

        for variety, records in variety_groups.items():
            self.group_results['按品种'][variety] = calc_stats(records)
            self.group_results['按品种'][variety]['品种名称'] = self.dictionary.get(variety, {}).get('品种名称', '')
            self.group_results['按品种'][variety]['作物类型'] = self.dictionary.get(variety, {}).get('作物类型', '')

        for crop, records in crop_groups.items():
            self.group_results['按作物类型'][crop] = calc_stats(records)

        print(f"[INFO] 分组统计完成")
        print(f"  - 批次分组: {len(self.group_results['按批次'])} 个")
        print(f"  - 品种分组: {len(self.group_results['按品种'])} 个")
        print(f"  - 作物类型分组: {len(self.group_results['按作物类型'])} 个")

    def generate_review_list(self):
        print("[INFO] 生成人工复核表...")
        self.review_records = []

        review_triggers = self.thresholds.get('review_triggers', {})

        for record in self.valid_records:
            review_reasons = []

            if review_triggers.get('below_qualified') and record['_发芽率'] is not None:
                if record['_发芽率'] < self.thresholds['germination_rate']['qualified']:
                    review_reasons.append(f'发芽率{record["_发芽率"]}%低于合格线{self.thresholds["germination_rate"]["qualified"]}%')

            if review_triggers.get('abnormal_count'):
                try:
                    seed_count = int(record.get('种子粒数', 0))
                    standard = self.thresholds['seed_count']['standard_per_petri']
                    if seed_count != standard and seed_count > 0:
                        review_reasons.append(f'种子粒数{seed_count}偏离标准{standard}')
                except (ValueError, TypeError):
                    pass

            if review_reasons:
                review_record = dict(record)
                review_record['_复核原因'] = '; '.join(review_reasons)
                review_record['_复核状态'] = '待复核'
                review_record['_复核人'] = ''
                review_record['_复核意见'] = ''
                self.review_records.append(review_record)

        for record in self.bad_records:
            if '周期外' not in record['_问题类型']:
                review_record = dict(record)
                review_record['_复核原因'] = f'数据质量问题: {record["_问题汇总"]}'
                review_record['_复核状态'] = '待复核'
                review_record['_复核人'] = ''
                review_record['_复核意见'] = ''
                self.review_records.append(review_record)

        print(f"[INFO] 人工复核表生成完成，共 {len(self.review_records)} 条待复核记录")

    def export_group_report(self):
        filepath = os.path.join(self.output_dir, 'group_report.csv')
        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['===== 种子批次发芽率分组统计报表 ====='])
            writer.writerow([f'生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'])
            if self.period_start or self.period_end:
                writer.writerow([f'统计周期: {self.period_start or "开始"} ~ {self.period_end or "结束"}'])
            writer.writerow([])

            writer.writerow(['--- 按批次统计 ---'])
            writer.writerow(['批次编号', '品种编号', '品种名称', '记录数', '种子总数',
                           '发芽总数', '平均发芽率(%)', '最低发芽率(%)',
                           '最高发芽率(%)', '综合发芽率(%)', '合格皿数', '优秀皿数', '合格率(%)'])
            for batch, stats in sorted(self.group_results['按批次'].items()):
                writer.writerow([
                    batch, stats.get('品种编号', ''), stats.get('品种名称', ''),
                    stats['记录数'], stats['种子总数'], stats['发芽总数'],
                    stats['平均发芽率'], stats['最低发芽率'], stats['最高发芽率'],
                    stats['综合发芽率'], stats['合格皿数'], stats['优秀皿数'], stats['合格率']
                ])
            writer.writerow([])

            writer.writerow(['--- 按品种统计 ---'])
            writer.writerow(['品种编号', '品种名称', '作物类型', '记录数', '种子总数',
                           '发芽总数', '平均发芽率(%)', '最低发芽率(%)',
                           '最高发芽率(%)', '综合发芽率(%)', '合格皿数', '优秀皿数', '合格率(%)'])
            for variety, stats in sorted(self.group_results['按品种'].items()):
                writer.writerow([
                    variety, stats.get('品种名称', ''), stats.get('作物类型', ''),
                    stats['记录数'], stats['种子总数'], stats['发芽总数'],
                    stats['平均发芽率'], stats['最低发芽率'], stats['最高发芽率'],
                    stats['综合发芽率'], stats['合格皿数'], stats['优秀皿数'], stats['合格率']
                ])
            writer.writerow([])

            writer.writerow(['--- 按作物类型统计 ---'])
            writer.writerow(['作物类型', '记录数', '种子总数', '发芽总数',
                           '平均发芽率(%)', '最低发芽率(%)',
                           '最高发芽率(%)', '综合发芽率(%)', '合格皿数', '优秀皿数', '合格率(%)'])
            for crop, stats in sorted(self.group_results['按作物类型'].items()):
                writer.writerow([
                    crop, stats['记录数'], stats['种子总数'], stats['发芽总数'],
                    stats['平均发芽率'], stats['最低发芽率'], stats['最高发芽率'],
                    stats['综合发芽率'], stats['合格皿数'], stats['优秀皿数'], stats['合格率']
                ])

        print(f"[INFO] 分组报表已导出: {filepath}")
        return filepath

    def export_bad_data_list(self):
        filepath = os.path.join(self.output_dir, 'bad_data_list.csv')
        fieldnames = ['行号', '记录编号', '批次编号', '品种编号', '试验日期', '培养皿编号',
                     '种子粒数', '发芽粒数', '问题类型', '问题描述']
        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for record in self.bad_records:
                writer.writerow({
                    '行号': record['_行号'],
                    '记录编号': record.get('记录编号', ''),
                    '批次编号': record.get('批次编号', ''),
                    '品种编号': record.get('品种编号', ''),
                    '试验日期': record.get('试验日期', ''),
                    '培养皿编号': record.get('培养皿编号', ''),
                    '种子粒数': record.get('种子粒数', ''),
                    '发芽粒数': record.get('发芽粒数', ''),
                    '问题类型': ','.join(record['_问题类型']),
                    '问题描述': '; '.join(record['_问题描述']),
                })
        print(f"[INFO] 坏数据清单已导出: {filepath}")
        return filepath

    def export_json_result(self):
        filepath = os.path.join(self.output_dir, 'result.json')
        result = {
            '生成时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            '统计周期': {
                '开始': self.period_start,
                '结束': self.period_end,
            },
            '数据概览': {
                '原始记录数': len(self.raw_records),
                '有效记录数': len(self.valid_records),
                '坏数据数': len(self.bad_records),
                '待复核数': len(self.review_records),
                '重复记录数': len(self.duplicate_records),
            },
            '阈值规则': self.thresholds,
            '分组统计': self.group_results,
            '有效记录明细': [
                {k: v for k, v in r.items() if not k.startswith('_')} |
                {'发芽率': r['_发芽率']}
                for r in self.valid_records
            ],
            '坏数据明细': [
                {k: v for k, v in r.items() if not k.startswith('_')} |
                {'问题类型': r['_问题类型'], '问题描述': r['_问题描述']}
                for r in self.bad_records
            ],
            '待复核明细': [
                {k: v for k, v in r.items() if not k.startswith('_')} |
                {'复核原因': r['_复核原因'], '复核状态': r['_复核状态']}
                for r in self.review_records
            ],
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"[INFO] JSON结果已导出: {filepath}")
        return filepath

    def export_review_table(self):
        filepath = os.path.join(self.output_dir, 'manual_review_table.csv')
        fieldnames = ['序号', '记录编号', '批次编号', '品种编号', '品种名称', '试验日期',
                     '培养皿编号', '种子粒数', '发芽粒数', '发芽率(%)',
                     '复核原因', '复核状态', '复核人', '复核意见']
        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for idx, record in enumerate(self.review_records, 1):
                variety = record.get('品种编号', '')
                variety_name = self.dictionary.get(variety, {}).get('品种名称', '')
                writer.writerow({
                    '序号': idx,
                    '记录编号': record.get('记录编号', ''),
                    '批次编号': record.get('批次编号', ''),
                    '品种编号': variety,
                    '品种名称': variety_name,
                    '试验日期': record.get('试验日期', ''),
                    '培养皿编号': record.get('培养皿编号', ''),
                    '种子粒数': record.get('种子粒数', ''),
                    '发芽粒数': record.get('发芽粒数', ''),
                    '发芽率(%)': record.get('_发芽率', ''),
                    '复核原因': record.get('_复核原因', ''),
                    '复核状态': record.get('_复核状态', ''),
                    '复核人': record.get('_复核人', ''),
                    '复核意见': record.get('_复核意见', ''),
                })
        print(f"[INFO] 人工复核表已导出: {filepath}")
        return filepath

    def run(self):
        print("=" * 60)
        print("种子批次发芽率分析脚本")
        print("=" * 60)

        self.load_dictionary()
        self.load_thresholds()
        self.load_raw_records()
        self.validate_records()
        self.calculate_group_statistics()
        self.generate_review_list()

        print("\n" + "=" * 60)
        print("导出结果文件")
        print("=" * 60)

        self.export_group_report()
        self.export_bad_data_list()
        self.export_json_result()
        self.export_review_table()

        print("\n" + "=" * 60)
        print("处理完成!")
        print(f"结果文件保存在: {os.path.abspath(self.output_dir)}/")
        print("=" * 60)

        return {
            'total_records': len(self.raw_records),
            'valid_records': len(self.valid_records),
            'bad_records': len(self.bad_records),
            'review_records': len(self.review_records),
            'output_dir': os.path.abspath(self.output_dir),
        }


def main():
    parser = argparse.ArgumentParser(description='种子批次发芽率分析脚本')
    parser.add_argument('--raw', default='raw_records.csv', help='原始明细CSV文件')
    parser.add_argument('--dict', default='dictionary.csv', help='字典表CSV文件')
    parser.add_argument('--threshold', default='threshold_rules.json', help='阈值规则JSON文件')
    parser.add_argument('--period-start', default=None, help='统计周期开始日期 (YYYY-MM-DD)')
    parser.add_argument('--period-end', default=None, help='统计周期结束日期 (YYYY-MM-DD)')
    parser.add_argument('--output', default='output', help='输出目录')

    args = parser.parse_args()

    analyzer = SeedGerminationAnalyzer(
        raw_file=args.raw,
        dict_file=args.dict,
        threshold_file=args.threshold,
        period_start=args.period_start,
        period_end=args.period_end,
        output_dir=args.output,
    )

    result = analyzer.run()
    return 0


if __name__ == '__main__':
    sys.exit(main())
