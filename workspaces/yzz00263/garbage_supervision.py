#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime

try:
    import yaml
except ImportError:
    print("错误: 需要安装 PyYAML。请运行: pip install pyyaml")
    sys.exit(1)


class GarbageSupervisionAnalyzer:
    def __init__(self, config_path, baseline_path=None):
        self.config = self._load_config(config_path)
        self.baseline = self._load_baseline(baseline_path) if baseline_path else None
        self.records = []
        self.bad_records = []
        self.summary = defaultdict(lambda: {
            'total_records': 0,
            'total_weight': 0.0,
            'by_category': defaultdict(lambda: {'count': 0, 'weight': 0.0}),
            'by_building': defaultdict(lambda: {'count': 0, 'weight': 0.0}),
            'bad_data_count': 0
        })
        self.supervisor_stats = defaultdict(lambda: {
            'records': 0,
            'good_records': 0,
            'bad_records': 0
        })

    def _load_config(self, config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        return config['garbage_supervision']

    def _load_baseline(self, baseline_path):
        if not os.path.exists(baseline_path):
            return None
        with open(baseline_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def load_logs(self, log_paths):
        for log_path in log_paths:
            if not os.path.exists(log_path):
                print(f"警告: 日志文件不存在: {log_path}")
                continue
            self._load_single_log(log_path)

    def _load_single_log(self, log_path):
        source_name = os.path.basename(log_path)
        try:
            with open(log_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    row['_source'] = source_name
                    self.records.append(row)
        except Exception as e:
            print(f"错误: 读取文件 {log_path} 失败: {e}")

    def validate_records(self):
        seen_ids = defaultdict(list)
        required_fields = self.config['required_fields']
        categories = self.config['categories']
        thresholds = self.config['thresholds']
        duplicate_fields = self.config['duplicate_check_fields']

        for idx, record in enumerate(self.records):
            issues = []
            is_bad = False

            for field in required_fields:
                value = record.get(field, '').strip()
                if not value:
                    issues.append(f'缺失字段:{field}')
                    is_bad = True

            category = record.get('category', '').strip()
            if category and category not in categories:
                issues.append(f'无效分类:{category}')
                is_bad = True

            weight_str = record.get('weight', '').strip()
            weight = None
            if weight_str:
                try:
                    weight = float(weight_str)
                    record['_weight_num'] = weight
                except ValueError:
                    issues.append(f'重量格式错误:{weight_str}')
                    is_bad = True

            if weight is not None and category and category in thresholds:
                th = thresholds[category]
                if weight < th['min_weight']:
                    issues.append(f'重量越界(低于下限):{weight}')
                    is_bad = True
                elif weight > th['max_weight']:
                    issues.append(f'重量越界(超过上限):{weight}')
                    is_bad = True

            dup_key = tuple(record.get(f, '').strip() for f in duplicate_fields)
            if all(k for k in dup_key):
                seen_ids[dup_key].append(idx)

            record['_issues'] = issues
            record['_is_bad'] = is_bad
            record['_idx'] = idx

            if is_bad:
                self.bad_records.append(record)

        for dup_key, indices in seen_ids.items():
            if len(indices) > 1:
                for idx in indices:
                    record = self.records[idx]
                    dup_issue = f'重复记录:{dup_key[0]}'
                    if dup_issue not in record['_issues']:
                        record['_issues'].append(dup_issue)
                        if not record['_is_bad']:
                            record['_is_bad'] = True
                            self.bad_records.append(record)

    def build_summary(self):
        for record in self.records:
            community = record.get('community', '未知小区').strip() or '未知小区'
            building = record.get('building', '未知楼').strip() or '未知楼'
            category = record.get('category', '未知分类').strip() or '未知分类'
            supervisor = record.get('supervisor', '未知督导').strip() or '未知督导'
            weight = record.get('_weight_num', 0.0)

            comm_data = self.summary[community]
            comm_data['total_records'] += 1

            if weight:
                comm_data['total_weight'] += weight

            comm_data['by_category'][category]['count'] += 1
            if weight:
                comm_data['by_category'][category]['weight'] += weight

            comm_data['by_building'][building]['count'] += 1
            if weight:
                comm_data['by_building'][building]['weight'] += weight

            if record['_is_bad']:
                comm_data['bad_data_count'] += 1

            self.supervisor_stats[supervisor]['records'] += 1
            if record['_is_bad']:
                self.supervisor_stats[supervisor]['bad_records'] += 1
            else:
                self.supervisor_stats[supervisor]['good_records'] += 1

    def compare_with_baseline(self):
        if not self.baseline:
            return None

        comparison = {}
        baseline_comm = self.baseline.get('community_summary', {})

        for community, data in self.summary.items():
            if community in baseline_comm:
                b = baseline_comm[community]
                comparison[community] = {
                    'records_change': data['total_records'] - b['total_records'],
                    'records_change_pct': round(
                        (data['total_records'] - b['total_records']) / b['total_records'] * 100, 2
                    ) if b['total_records'] else 0,
                    'weight_change': round(data['total_weight'] - b['total_weight'], 2),
                    'weight_change_pct': round(
                        (data['total_weight'] - b['total_weight']) / b['total_weight'] * 100, 2
                    ) if b['total_weight'] else 0,
                    'bad_data_change': data['bad_data_count'] - b['bad_data_count']
                }
            else:
                comparison[community] = {
                    'records_change': data['total_records'],
                    'records_change_pct': 100.0,
                    'weight_change': data['total_weight'],
                    'weight_change_pct': 100.0,
                    'bad_data_change': data['bad_data_count'],
                    'note': '新增小区'
                }

        return comparison

    def generate_group_report(self):
        lines = []
        lines.append('=' * 60)
        lines.append('      小区垃圾分类督导 - 分组报表')
        lines.append('=' * 60)
        lines.append(f'生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        lines.append(f'总记录数: {len(self.records)}')
        lines.append(f'异常记录数: {len(self.bad_records)}')
        lines.append(f'正常记录数: {len(self.records) - len(self.bad_records)}')
        lines.append('')

        for community, data in sorted(self.summary.items()):
            lines.append('-' * 50)
            lines.append(f'小区: {community}')
            lines.append(f'  记录总数: {data["total_records"]}')
            lines.append(f'  总重量: {data["total_weight"]:.2f} kg')
            lines.append(f'  异常数据: {data["bad_data_count"]} 条')
            lines.append('')
            lines.append('  按分类统计:')
            for cat, cat_data in sorted(data['by_category'].items()):
                lines.append(f'    {cat}: {cat_data["count"]} 条, {cat_data["weight"]:.2f} kg')
            lines.append('')
            lines.append('  按楼栋统计:')
            for bld, bld_data in sorted(data['by_building'].items()):
                lines.append(f'    {bld}: {bld_data["count"]} 条, {bld_data["weight"]:.2f} kg')
            lines.append('')

        lines.append('-' * 50)
        lines.append('督导员统计:')
        for sup, stats in sorted(self.supervisor_stats.items(), key=lambda x: x[1]['records'], reverse=True):
            accuracy = (stats['good_records'] / stats['records'] * 100) if stats['records'] else 0
            lines.append(f'  {sup}: {stats["records"]} 条记录, 准确率 {accuracy:.1f}%')

        comparison = self.compare_with_baseline()
        if comparison:
            lines.append('')
            lines.append('=' * 50)
            lines.append('历史基线对比:')
            for community, comp in sorted(comparison.items()):
                lines.append(f'  {community}:')
                lines.append(f'    记录数变化: {comp["records_change"]:+d} ({comp["records_change_pct"]:+.2f}%)')
                lines.append(f'    重量变化: {comp["weight_change"]:+.2f} kg ({comp["weight_change_pct"]:+.2f}%)')
                lines.append(f'    异常数据变化: {comp["bad_data_change"]:+d}')
                if 'note' in comp:
                    lines.append(f'    备注: {comp["note"]}')

        lines.append('')
        lines.append('=' * 60)
        return '\n'.join(lines)

    def generate_bad_data_list(self):
        lines = []
        lines.append('=' * 70)
        lines.append('      小区垃圾分类督导 - 坏数据清单')
        lines.append('=' * 70)
        lines.append(f'生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        lines.append(f'坏数据总数: {len(self.bad_records)}')
        lines.append('')

        missing_count = sum(1 for r in self.bad_records if any('缺失字段' in i for i in r['_issues']))
        duplicate_count = sum(1 for r in self.bad_records if any('重复记录' in i for i in r['_issues']))
        out_of_range_count = sum(1 for r in self.bad_records if any('越界' in i for i in r['_issues']))
        format_error_count = sum(1 for r in self.bad_records if any('格式错误' in i for i in r['_issues']))
        invalid_cat_count = sum(1 for r in self.bad_records if any('无效分类' in i for i in r['_issues']))

        lines.append('问题类型统计:')
        lines.append(f'  缺失字段: {missing_count} 条')
        lines.append(f'  重复记录: {duplicate_count} 条')
        lines.append(f'  重量越界: {out_of_range_count} 条')
        lines.append(f'  格式错误: {format_error_count} 条')
        lines.append(f'  无效分类: {invalid_cat_count} 条')
        lines.append('')

        lines.append('-' * 70)
        lines.append(f'{"序号":<6}{"记录ID":<10}{"来源":<25}{"问题描述"}')
        lines.append('-' * 70)

        for idx, record in enumerate(self.bad_records, 1):
            rid = record.get('record_id', '')
            source = record.get('_source', '')
            issues = '; '.join(record['_issues'])
            lines.append(f'{idx:<6}{rid:<10}{source:<25}{issues}')

        lines.append('')
        lines.append('=' * 70)
        return '\n'.join(lines)

    def generate_json_result(self):
        result = {
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_records': len(self.records),
            'bad_records': len(self.bad_records),
            'good_records': len(self.records) - len(self.bad_records),
            'community_summary': {},
            'bad_data_details': [],
            'baseline_comparison': self.compare_with_baseline()
        }

        for community, data in self.summary.items():
            result['community_summary'][community] = {
                'total_records': data['total_records'],
                'total_weight': round(data['total_weight'], 2),
                'by_category': dict(data['by_category']),
                'bad_data_count': data['bad_data_count']
            }

        for record in self.bad_records:
            result['bad_data_details'].append({
                'record_id': record.get('record_id', ''),
                'community': record.get('community', ''),
                'building': record.get('building', ''),
                'unit': record.get('unit', ''),
                'category': record.get('category', ''),
                'weight': record.get('weight', ''),
                'timestamp': record.get('timestamp', ''),
                'supervisor': record.get('supervisor', ''),
                'source': record.get('_source', ''),
                'issues': record['_issues']
            })

        return json.dumps(result, ensure_ascii=False, indent=2)

    def generate_review_table(self):
        headers = ['记录ID', '小区', '楼栋', '单元', '分类', '重量', '时间', '督导员', '来源', '问题类型', '问题描述', '复核状态', '复核意见']

        lines = []
        lines.append(','.join(headers))

        for record in self.bad_records:
            issues = record['_issues']
            issue_types = []
            for issue in issues:
                if '缺失字段' in issue:
                    issue_types.append('缺失')
                elif '重复记录' in issue:
                    issue_types.append('重复')
                elif '越界' in issue:
                    issue_types.append('越界')
                elif '格式错误' in issue:
                    issue_types.append('格式错误')
                elif '无效分类' in issue:
                    issue_types.append('无效分类')
            issue_type_str = '/'.join(issue_types) if issue_types else '未知'
            issue_desc = '; '.join(issues)

            row = [
                record.get('record_id', ''),
                record.get('community', ''),
                record.get('building', ''),
                record.get('unit', ''),
                record.get('category', ''),
                record.get('weight', ''),
                record.get('timestamp', ''),
                record.get('supervisor', ''),
                record.get('_source', ''),
                issue_type_str,
                issue_desc.replace(',', '，'),
                '',
                ''
            ]
            lines.append(','.join(row))

        return '\n'.join(lines)

    def run_analysis(self, log_paths):
        self.load_logs(log_paths)
        self.validate_records()
        self.build_summary()

    def export_results(self, output_dir):
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        output_config = self.config['output']

        group_report_path = os.path.join(output_dir, output_config['group_report'])
        with open(group_report_path, 'w', encoding='utf-8') as f:
            f.write(self.generate_group_report())
        print(f'分组报表已导出: {group_report_path}')

        bad_data_path = os.path.join(output_dir, output_config['bad_data_list'])
        with open(bad_data_path, 'w', encoding='utf-8') as f:
            f.write(self.generate_bad_data_list())
        print(f'坏数据清单已导出: {bad_data_path}')

        json_path = os.path.join(output_dir, output_config['json_result'])
        with open(json_path, 'w', encoding='utf-8') as f:
            f.write(self.generate_json_result())
        print(f'JSON结果已导出: {json_path}')

        review_path = os.path.join(output_dir, output_config['review_table'])
        with open(review_path, 'w', encoding='utf-8') as f:
            f.write(self.generate_review_table())
        print(f'人工复核表已导出: {review_path}')


def main():
    parser = argparse.ArgumentParser(description='小区垃圾分类督导脚本 - 将原始记录整理成可复核报告')
    parser.add_argument('--logs', nargs='+', required=True, help='日志文件路径（支持多个）')
    parser.add_argument('--config', required=True, help='配置文件路径 (YAML)')
    parser.add_argument('--baseline', default=None, help='历史基线文件路径 (JSON)')
    parser.add_argument('--output', required=True, help='输出目录路径')

    args = parser.parse_args()

    print('=' * 50)
    print('  小区垃圾分类督导分析工具')
    print('=' * 50)
    print(f'配置文件: {args.config}')
    print(f'日志文件: {len(args.logs)} 个')
    print(f'历史基线: {args.baseline or "无"}')
    print(f'输出目录: {args.output}')
    print('')

    analyzer = GarbageSupervisionAnalyzer(args.config, args.baseline)
    analyzer.run_analysis(args.logs)
    analyzer.export_results(args.output)

    print('')
    print('分析完成!')
    print(f'总记录: {len(analyzer.records)} 条')
    print(f'正常记录: {len(analyzer.records) - len(analyzer.bad_records)} 条')
    print(f'异常记录: {len(analyzer.bad_records)} 条')


if __name__ == '__main__':
    main()
