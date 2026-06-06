#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证脚本：一键运行所有测试场景，验证控制台输出、结果文件、坏行隔离和复核入口的一致性
"""

import os
import sys
import csv
import json
import subprocess
from datetime import datetime


class VerificationRunner:
    """验证运行器"""

    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.script_path = os.path.join(base_dir, 'quality_analyzer.py')
        self.results = []

    def run_scenario(self, name, raw_file, dict_file, threshold_file, output_dir,
                     start_time, end_time, expected_valid, expected_bad, expected_abnormal,
                     group_by=None, expect_config_missing=False, check_pass_rate=None):
        """运行单个测试场景"""
        print(f"\n{'='*70}")
        print(f"【场景验证】{name}")
        print(f"{'='*70}")

        if group_by is None:
            group_by = ['kiln_id', 'clinker_code']

        cmd = [
            sys.executable, self.script_path,
            '--raw', raw_file,
            '--dict', dict_file,
            '--threshold', threshold_file,
            '--output', output_dir,
            '--start', start_time,
            '--end', end_time,
            '--period', 'day',
            '--group-by'
        ] + group_by

        print(f"  执行命令: {' '.join(cmd)}")
        print(f"\n  --- 控制台输出 ---")

        try:
            result = subprocess.run(
                cmd,
                cwd=self.base_dir,
                capture_output=True,
                text=True,
                encoding='utf-8'
            )

            lines = result.stdout.strip().split('\n')
            for line in lines[:20]:
                print(f"  {line}")
            if len(lines) > 20:
                print(f"  ... (共 {len(lines)} 行，已截断显示前20行)")

            print(f"\n  --- 结果文件检查 ---")

            files_to_check = [
                'statistics_result.csv',
                'abnormal_samples.csv',
                'bad_rows.csv',
                'trend_summary.csv',
                'audit_log.csv',
                'analysis_summary.txt'
            ]

            file_status = {}
            for f in files_to_check:
                fpath = os.path.join(output_dir, f)
                exists = os.path.exists(fpath)
                size = os.path.getsize(fpath) if exists else 0
                file_status[f] = {'exists': exists, 'size': size}
                status = '✓' if exists and size > 0 else '✗'
                print(f"  {status} {f}: {'存在' if exists else '不存在'} ({size} bytes)")

            print(f"\n  --- 数据一致性校验 ---")

            valid_count = 0
            bad_count = 0
            abnormal_count = 0

            bad_rows_file = os.path.join(output_dir, 'bad_rows.csv')
            if os.path.exists(bad_rows_file):
                with open(bad_rows_file, 'r', encoding='utf-8-sig') as f:
                    reader = csv.DictReader(f)
                    bad_count = sum(1 for _ in reader)
                print(f"  坏行数: {bad_count} (预期: {expected_bad}) {'✓' if bad_count == expected_bad else '✗ MISMATCH'}")

            abnormal_file = os.path.join(output_dir, 'abnormal_samples.csv')
            if os.path.exists(abnormal_file):
                with open(abnormal_file, 'r', encoding='utf-8-sig') as f:
                    reader = csv.DictReader(f)
                    abnormal_count = sum(1 for _ in reader)
                print(f"  异常样本数: {abnormal_count} (预期: {expected_abnormal}) {'✓' if abnormal_count == expected_abnormal else '✗ MISMATCH'}")

            stats_file = os.path.join(output_dir, 'statistics_result.csv')
            pass_rate_ok = True
            if os.path.exists(stats_file):
                with open(stats_file, 'r', encoding='utf-8-sig') as f:
                    reader = csv.DictReader(f)
                    stats_rows = list(reader)
                print(f"  统计分组数: {len(stats_rows)} 行")

                if check_pass_rate is not None:
                    for row in stats_rows:
                        f_cao_pass = float(row.get('f_cao_pass_rate', 0))
                        if f_cao_pass == 0.0 and check_pass_rate.get('f_cao_nonzero', False):
                            pass_rate_ok = False
                            print(f"  ⚠ f_cao 合格率为 0.0，可能存在分组键定位问题")
                            break
                    if pass_rate_ok and check_pass_rate.get('f_cao_nonzero', False):
                        print(f"  ✓ f_cao 合格率正常（非零），分组键定位正确")

            summary_file = os.path.join(output_dir, 'analysis_summary.txt')
            has_audit_section = False
            has_explanation = False
            has_config_missing_section = False
            if os.path.exists(summary_file):
                with open(summary_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                has_audit_section = '复核入口' in content
                has_explanation = '可解释性说明' in content
                has_config_missing_section = '配置缺失复核' in content
                print(f"  复核入口: {'✓ 存在' if has_audit_section else '✗ 缺失'}")
                print(f"  可解释性说明: {'✓ 存在' if has_explanation else '✗ 缺失'}")
                print(f"  配置缺失复核: {'✓ 存在' if has_config_missing_section else '✗ 缺失'}")

            audit_file = os.path.join(output_dir, 'audit_log.csv')
            audit_count = 0
            has_config_missing_log = False
            if os.path.exists(audit_file):
                with open(audit_file, 'r', encoding='utf-8-sig') as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)
                    audit_count = len(rows)
                    for r in rows:
                        if '配置缺失' in r.get('message', ''):
                            has_config_missing_log = True
                            break
                print(f"  操作日志条数: {audit_count} 条")
                print(f"  配置缺失留痕: {'✓ 存在' if has_config_missing_log else '✗ 缺失'}")

            all_pass = (
                bad_count == expected_bad and
                abnormal_count == expected_abnormal and
                has_audit_section and
                has_explanation and
                pass_rate_ok and
                (not expect_config_missing or (has_config_missing_section and has_config_missing_log)) and
                all(s['exists'] and s['size'] > 0 for s in file_status.values())
            )

            scenario_result = {
                'name': name,
                'success': all_pass,
                'bad_count': bad_count,
                'abnormal_count': abnormal_count,
                'expected_bad': expected_bad,
                'expected_abnormal': expected_abnormal,
                'files': file_status,
                'has_audit': has_audit_section,
                'has_explanation': has_explanation,
                'has_config_missing': has_config_missing_section,
                'has_config_missing_log': has_config_missing_log,
                'audit_log_count': audit_count,
                'pass_rate_ok': pass_rate_ok
            }
            self.results.append(scenario_result)

            print(f"\n  【场景结果】{'PASS ✓' if all_pass else 'FAIL ✗'}")

            return all_pass

        except Exception as e:
            print(f"  执行出错: {str(e)}")
            self.results.append({'name': name, 'success': False, 'error': str(e)})
            return False

    def print_summary(self):
        """打印验证总结"""
        print(f"\n\n{'#'*70}")
        print(f"#  验证总结报告")
        print(f"#  验证时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'#'*70}")

        print(f"\n{'场景名称':<25} {'结果':<10} {'坏行':<10} {'异常':<10} {'复核入口':<10} {'可解释性':<10}")
        print(f"{'-'*75}")

        pass_count = 0
        for r in self.results:
            if r.get('success'):
                pass_count += 1
            status = 'PASS' if r.get('success') else 'FAIL'
            bad = f"{r.get('bad_count', '?')}/{r.get('expected_bad', '?')}"
            abnormal = f"{r.get('abnormal_count', '?')}/{r.get('expected_abnormal', '?')}"
            audit = '✓' if r.get('has_audit') else '✗'
            explain = '✓' if r.get('has_explanation') else '✗'
            print(f"{r['name']:<25} {status:<10} {bad:<10} {abnormal:<10} {audit:<10} {explain:<10}")

        print(f"\n总通过率: {pass_count}/{len(self.results)}")

        if pass_count == len(self.results):
            print(f"\n✓ 所有验证场景均通过！")
            print(f"  控制台输出、结果文件、坏行隔离、复核入口保持一致。")
        else:
            print(f"\n✗ 部分场景验证失败，请检查详细输出。")

        return pass_count == len(self.results)


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    runner = VerificationRunner(base_dir)

    print("水泥窑熟料质量分析系统 - 验证测试套件")
    print("=" * 70)

    runner.run_scenario(
        name='场景1: 完整数据',
        raw_file='data/raw_data.csv',
        dict_file='data/dictionary.csv',
        threshold_file='data/thresholds.json',
        output_dir='output/verify_scenario1_full',
        start_time='2026-06-01 00:00:00',
        end_time='2026-06-03 23:59:59',
        expected_valid=25,
        expected_bad=0,
        expected_abnormal=7
    )

    runner.run_scenario(
        name='场景2: 时间越界',
        raw_file='tests/test_time_out_of_range.csv',
        dict_file='data/dictionary.csv',
        threshold_file='data/thresholds.json',
        output_dir='output/verify_scenario2_time',
        start_time='2026-06-01 00:00:00',
        end_time='2026-06-05 23:59:59',
        expected_valid=2,
        expected_bad=4,
        expected_abnormal=1
    )

    runner.run_scenario(
        name='场景3: 编号错误',
        raw_file='tests/test_code_error.csv',
        dict_file='data/dictionary.csv',
        threshold_file='data/thresholds.json',
        output_dir='output/verify_scenario3_code',
        start_time='2026-06-01 00:00:00',
        end_time='2026-06-05 23:59:59',
        expected_valid=3,
        expected_bad=3,
        expected_abnormal=2,
        expect_config_missing=True
    )

    runner.run_scenario(
        name='场景4: 配置缺失',
        raw_file='data/raw_data.csv',
        dict_file='data/dictionary.csv',
        threshold_file='tests/test_missing_config.json',
        output_dir='output/verify_scenario4_config',
        start_time='2026-06-01 00:00:00',
        end_time='2026-06-03 23:59:59',
        expected_valid=25,
        expected_bad=0,
        expected_abnormal=25,
        expect_config_missing=True
    )

    runner.run_scenario(
        name='场景5: 分组维度顺序调换',
        raw_file='data/raw_data.csv',
        dict_file='data/dictionary.csv',
        threshold_file='data/thresholds.json',
        output_dir='output/verify_scenario5_group_order',
        start_time='2026-06-01 00:00:00',
        end_time='2026-06-03 23:59:59',
        expected_valid=25,
        expected_bad=0,
        expected_abnormal=7,
        group_by=['clinker_code', 'kiln_id'],
        check_pass_rate={'f_cao_nonzero': True}
    )

    all_pass = runner.print_summary()

    sys.exit(0 if all_pass else 1)


if __name__ == '__main__':
    main()
