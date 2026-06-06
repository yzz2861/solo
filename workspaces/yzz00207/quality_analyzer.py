#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
水泥窑熟料质量分析脚本
功能：规则判断、异常解释、处理留痕、统计输出
"""

import csv
import json
import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict, OrderedDict


class ClinkerQualityAnalyzer:
    """水泥窑熟料质量分析器"""

    def __init__(self, raw_data_path, dict_path, threshold_path, output_dir,
                 start_time=None, end_time=None, period='day', group_by=None):
        """
        初始化分析器
        :param raw_data_path: 原始明细数据路径
        :param dict_path: 字典表路径
        :param threshold_path: 阈值规则路径
        :param output_dir: 输出目录
        :param start_time: 统计开始时间
        :param end_time: 统计结束时间
        :param period: 统计周期 day/week/month
        :param group_by: 分组维度列表，如 ['kiln_id', 'clinker_code']
        """
        self.raw_data_path = raw_data_path
        self.dict_path = dict_path
        self.threshold_path = threshold_path
        self.output_dir = output_dir
        self.period = period
        self.group_by = group_by or ['kiln_id', 'clinker_code']

        self.start_time = start_time
        self.end_time = end_time

        self.raw_data = []
        self.dictionary = {}
        self.thresholds = {}

        self.valid_data = []
        self.bad_rows = []

        self.stats_result = {}
        self.abnormal_samples = []
        self.trend_summary = {}

        self.audit_log = []

        os.makedirs(output_dir, exist_ok=True)

    def _log(self, level, module, message):
        """记录操作日志"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        entry = {
            'timestamp': timestamp,
            'level': level,
            'module': module,
            'message': message
        }
        self.audit_log.append(entry)
        prefix = f"[{timestamp}] [{level}] [{module}]"
        print(f"{prefix} {message}")

    def load_dictionary(self):
        """加载字典表"""
        self._log('INFO', '字典加载', f'开始加载字典表: {self.dict_path}')
        try:
            with open(self.dict_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    code = row.get('clinker_code', '').strip()
                    if code:
                        self.dictionary[code] = row
            self._log('INFO', '字典加载', f'字典表加载完成，共 {len(self.dictionary)} 条熟料编号映射')
            return True
        except Exception as e:
            self._log('ERROR', '字典加载', f'字典表加载失败: {str(e)}')
            return False

    def load_thresholds(self):
        """加载阈值规则"""
        self._log('INFO', '阈值加载', f'开始加载阈值规则: {self.threshold_path}')
        try:
            with open(self.threshold_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.thresholds = data.get('rules', {})
            version = data.get('version', 'unknown')
            self._log('INFO', '阈值加载', f'阈值规则加载完成，版本: {version}，共 {len(self.thresholds)} 个品种规则')
            return True
        except Exception as e:
            self._log('ERROR', '阈值加载', f'阈值规则加载失败: {str(e)}')
            return False

    def _parse_datetime(self, dt_str):
        """解析时间字符串"""
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y-%m-%d',
            '%Y/%m/%d %H:%M:%S',
            '%Y/%m/%d'
        ]
        for fmt in formats:
            try:
                return datetime.strptime(dt_str.strip(), fmt)
            except ValueError:
                continue
        return None

    def _in_time_range(self, dt):
        """判断时间是否在统计范围内"""
        if self.start_time and dt < self.start_time:
            return False
        if self.end_time and dt > self.end_time:
            return False
        return True

    def load_raw_data(self):
        """加载原始明细数据，进行初步校验"""
        self._log('INFO', '数据加载', f'开始加载原始明细: {self.raw_data_path}')
        total_count = 0
        valid_count = 0
        bad_count = 0

        try:
            with open(self.raw_data_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                fieldnames = reader.fieldnames or []

                for line_num, row in enumerate(reader, start=2):
                    total_count += 1
                    issues = []

                    ts_str = row.get('timestamp', '').strip()
                    dt = self._parse_datetime(ts_str) if ts_str else None
                    if not dt:
                        issues.append(f'时间格式错误: {ts_str}')
                    else:
                        row['_parsed_time'] = dt
                        row['_line_num'] = line_num

                    code = row.get('clinker_code', '').strip()
                    if not code:
                        issues.append('熟料编号为空')
                    elif code not in self.dictionary:
                        issues.append(f'熟料编号不在字典表中: {code}')

                    if dt and not self._in_time_range(dt):
                        issues.append(
                            f'时间越界: {ts_str} '
                            f'(统计范围: {self.start_time.strftime("%Y-%m-%d %H:%M:%S") if self.start_time else "不限"} ~ '
                            f'{self.end_time.strftime("%Y-%m-%d %H:%M:%S") if self.end_time else "不限"})'
                        )

                    if issues:
                        bad_count += 1
                        bad_row = dict(row)
                        bad_row['_issues'] = '; '.join(issues)
                        bad_row['_line_num'] = line_num
                        self.bad_rows.append(bad_row)
                        self._log('WARN', '数据校验', f'第{line_num}行异常: {"; ".join(issues)}')
                    else:
                        valid_count += 1
                        row['_line_num'] = line_num
                        self.valid_data.append(row)

            self._log('INFO', '数据加载',
                      f'数据加载完成，总计 {total_count} 条，有效 {valid_count} 条，坏行 {bad_count} 条')
            return True
        except Exception as e:
            self._log('ERROR', '数据加载', f'原始数据加载失败: {str(e)}')
            return False

    def _get_period_key(self, dt):
        """获取统计周期的键值"""
        if self.period == 'day':
            return dt.strftime('%Y-%m-%d')
        elif self.period == 'week':
            year, week, _ = dt.isocalendar()
            return f'{year}-W{week:02d}'
        elif self.period == 'month':
            return dt.strftime('%Y-%m')
        else:
            return dt.strftime('%Y-%m-%d')

    def _check_threshold(self, code, metric, value):
        """
        检查指标是否超出阈值
        :return: (level, explanation, diff) level: normal/warning/critical/unknown
        """
        if code not in self.thresholds:
            return 'unknown', f'品种{code}无阈值配置', None

        metric_rules = self.thresholds[code].get(metric)
        if not metric_rules:
            return 'unknown', f'指标{metric}无阈值配置', None

        metric_name = metric_rules.get('name', metric)
        unit = metric_rules.get('unit', '')
        explanation_template = metric_rules.get('explanation', '')

        if 'allowed_values' in metric_rules:
            allowed = metric_rules['allowed_values']
            if value not in allowed:
                return 'critical', f'{metric_name}={value}，不在允许值{allowed}范围内。{explanation_template}', None
            return 'normal', f'{metric_name}={value}，符合要求', None

        try:
            num_val = float(value)
        except (ValueError, TypeError):
            return 'unknown', f'{metric_name}={value}，数值无法解析', None

        result = 'normal'
        reason_parts = []
        diff = 0

        if 'critical_upper' in metric_rules and num_val > metric_rules['critical_upper']:
            result = 'critical'
            diff_val = num_val - metric_rules['critical_upper']
            reason_parts.append(
                f'{metric_name}={num_val}{unit}，超过严重上限{metric_rules["critical_upper"]}{unit}，超出{diff_val:.2f}{unit}'
            )
            diff = diff_val
        elif 'warning_upper' in metric_rules and num_val > metric_rules['warning_upper']:
            if result != 'critical':
                result = 'warning'
            diff_val = num_val - metric_rules['warning_upper']
            reason_parts.append(
                f'{metric_name}={num_val}{unit}，超过预警上限{metric_rules["warning_upper"]}{unit}，超出{diff_val:.2f}{unit}'
            )
            if result == 'warning':
                diff = diff_val

        if 'critical_lower' in metric_rules and num_val < metric_rules['critical_lower']:
            result = 'critical'
            diff_val = metric_rules['critical_lower'] - num_val
            reason_parts.append(
                f'{metric_name}={num_val}{unit}，低于严重下限{metric_rules["critical_lower"]}{unit}，低出{diff_val:.2f}{unit}'
            )
            diff = diff_val
        elif 'warning_lower' in metric_rules and num_val < metric_rules['warning_lower']:
            if result != 'critical':
                result = 'warning'
            diff_val = metric_rules['warning_lower'] - num_val
            reason_parts.append(
                f'{metric_name}={num_val}{unit}，低于预警下限{metric_rules["warning_lower"]}{unit}，低出{diff_val:.2f}{unit}'
            )
            if result == 'warning':
                diff = diff_val

        if result == 'normal':
            reason_parts.append(f'{metric_name}={num_val}{unit}，在合格范围内')

        explanation = '; '.join(reason_parts)
        if result != 'normal' and explanation_template:
            explanation += f'。{explanation_template}'

        return result, explanation, diff

    def analyze_abnormal(self):
        """分析异常样本，进行阈值命中判断"""
        self._log('INFO', '异常检测', '开始异常样本检测')
        abnormal_count = 0
        warning_count = 0
        critical_count = 0
        unknown_count = 0
        config_missing_samples = 0

        numeric_metrics = ['f_cao', 'strength_3d', 'strength_28d', 'specific_surface', 'loss_on_ignition']
        enum_metrics = ['soundness']

        for row in self.valid_data:
            code = row.get('clinker_code', '')
            row_abnormal = False
            row_has_unknown = False
            row_issues = []
            max_level = 'normal'

            for metric in numeric_metrics + enum_metrics:
                value = row.get(metric, '')
                level, explanation, diff = self._check_threshold(code, metric, value)

                if level == 'unknown':
                    row_has_unknown = True
                    unknown_count += 1
                    row_issues.append({
                        'metric': metric,
                        'level': 'unknown',
                        'value': value,
                        'explanation': explanation,
                        'diff': diff
                    })
                elif level in ('warning', 'critical'):
                    row_abnormal = True
                    row_issues.append({
                        'metric': metric,
                        'level': level,
                        'value': value,
                        'explanation': explanation,
                        'diff': diff
                    })
                    if level == 'critical':
                        critical_count += 1
                        if max_level != 'critical':
                            max_level = 'critical'
                    elif level == 'warning':
                        warning_count += 1
                        if max_level == 'normal':
                            max_level = 'warning'

            if row_abnormal or row_has_unknown:
                abnormal_count += 1
                if row_has_unknown and not row_abnormal:
                    config_missing_samples += 1
                    if max_level == 'normal':
                        max_level = 'unknown'

                sample = dict(row)
                sample['_abnormal_level'] = max_level
                sample['_abnormal_count'] = len(row_issues)
                sample['_has_config_missing'] = row_has_unknown
                sample['_abnormal_details'] = row_issues
                self.abnormal_samples.append(sample)

        if unknown_count > 0:
            self._log('WARN', '异常检测',
                      f'检测到 {unknown_count} 项配置缺失，涉及 {config_missing_samples} 条样本，请检查阈值规则配置')

        self._log('INFO', '异常检测',
                  f'异常检测完成，异常样本 {abnormal_count} 条，其中严重 {critical_count} 项，预警 {warning_count} 项，配置缺失 {unknown_count} 项')
        return True

    def calculate_statistics(self):
        """按时间窗口和分组维度计算统计结果"""
        self._log('INFO', '统计计算', f'开始统计计算，周期: {self.period}，分组维度: {", ".join(self.group_by)}')

        numeric_metrics = ['f_cao', 'strength_3d', 'strength_28d', 'specific_surface', 'loss_on_ignition']

        grouped = defaultdict(lambda: defaultdict(list))

        for row in self.valid_data:
            period_key = self._get_period_key(row['_parsed_time'])
            group_key_parts = []
            for dim in self.group_by:
                val = row.get(dim, '未知')
                dict_info = self.dictionary.get(row.get('clinker_code', ''), {})
                if dim in dict_info and dim != 'clinker_code':
                    val = dict_info[dim]
                group_key_parts.append(str(val))
            group_key = '|'.join(group_key_parts)

            for metric in numeric_metrics:
                try:
                    val = float(row.get(metric, ''))
                    grouped[(period_key, group_key)][metric].append(val)
                except (ValueError, TypeError):
                    pass

        stats = OrderedDict()
        for (period_key, group_key), metrics_data in sorted(grouped.items()):
            if period_key not in stats:
                stats[period_key] = OrderedDict()
            if group_key not in stats[period_key]:
                stats[period_key][group_key] = {'count': 0, 'metrics': {}}

            total_count = max(len(v) for v in metrics_data.values()) if metrics_data else 0
            stats[period_key][group_key]['count'] = total_count

            for metric in numeric_metrics:
                values = metrics_data.get(metric, [])
                if values:
                    avg = sum(values) / len(values)
                    min_val = min(values)
                    max_val = max(values)
                    sorted_vals = sorted(values)
                    n = len(sorted_vals)
                    if n % 2 == 0:
                        median = (sorted_vals[n // 2 - 1] + sorted_vals[n // 2]) / 2
                    else:
                        median = sorted_vals[n // 2]

                    variance = sum((v - avg) ** 2 for v in values) / len(values)
                    std_dev = variance ** 0.5

                    pass_count = 0
                    code = None
                    if 'clinker_code' in self.group_by:
                        code_idx = self.group_by.index('clinker_code')
                        code = group_key.split('|')[code_idx]
                    else:
                        code = list(self.dictionary.keys())[0] if self.dictionary else ''
                    for v in values:
                        level, _, _ = self._check_threshold(code, metric, str(v))
                        if level == 'normal':
                            pass_count += 1
                    pass_rate = pass_count / len(values) * 100 if values else 0

                    stats[period_key][group_key]['metrics'][metric] = {
                        'count': len(values),
                        'avg': round(avg, 3),
                        'min': round(min_val, 3),
                        'max': round(max_val, 3),
                        'median': round(median, 3),
                        'std_dev': round(std_dev, 3),
                        'pass_rate': round(pass_rate, 2)
                    }

        self.stats_result = stats
        period_count = len(stats)
        group_count = sum(len(g) for g in stats.values())
        self._log('INFO', '统计计算', f'统计计算完成，{period_count} 个周期，{group_count} 个分组')
        return True

    def analyze_trend(self):
        """分析趋势摘要"""
        self._log('INFO', '趋势分析', '开始趋势摘要分析')

        if len(self.stats_result) < 2:
            self._log('INFO', '趋势分析', '周期数不足2个，跳过环比趋势分析')
            self.trend_summary = {'note': '数据周期不足，无法计算趋势'}
            return True

        periods = list(self.stats_result.keys())
        current_period = periods[-1]
        prev_period = periods[-2]

        trend = {
            'current_period': current_period,
            'previous_period': prev_period,
            'groups': {}
        }

        numeric_metrics = ['f_cao', 'strength_3d', 'strength_28d', 'specific_surface', 'loss_on_ignition']

        all_groups = set()
        for p in periods:
            all_groups.update(self.stats_result[p].keys())

        for group in sorted(all_groups):
            curr_data = self.stats_result.get(current_period, {}).get(group, {})
            prev_data = self.stats_result.get(prev_period, {}).get(group, {})

            group_trend = {'metrics': {}}

            for metric in numeric_metrics:
                curr_metric = curr_data.get('metrics', {}).get(metric, {})
                prev_metric = prev_data.get('metrics', {}).get(metric, {})

                curr_avg = curr_metric.get('avg')
                prev_avg = prev_metric.get('avg')

                if curr_avg is not None and prev_avg is not None and prev_avg != 0:
                    change_pct = (curr_avg - prev_avg) / prev_avg * 100
                    direction = '上升' if change_pct > 0 else '下降' if change_pct < 0 else '持平'
                    group_trend['metrics'][metric] = {
                        'current_avg': curr_avg,
                        'previous_avg': prev_avg,
                        'change_pct': round(change_pct, 2),
                        'direction': direction
                    }
                elif curr_avg is not None:
                    group_trend['metrics'][metric] = {
                        'current_avg': curr_avg,
                        'previous_avg': None,
                        'change_pct': None,
                        'direction': '新增'
                    }
                else:
                    group_trend['metrics'][metric] = {
                        'current_avg': None,
                        'previous_avg': prev_avg,
                        'change_pct': None,
                        'direction': '消失'
                    }

            if group_trend['metrics']:
                trend['groups'][group] = group_trend

        self.trend_summary = trend
        self._log('INFO', '趋势分析', f'趋势分析完成，覆盖 {len(trend["groups"])} 个分组')
        return True

    def print_summary(self):
        """打印控制台输出摘要"""
        print("\n" + "=" * 80)
        print("【水泥窑熟料质量分析报告】")
        print("=" * 80)

        print(f"\n  统计时间范围: "
              f"{self.start_time.strftime('%Y-%m-%d %H:%M:%S') if self.start_time else '不限'} "
              f"~ {self.end_time.strftime('%Y-%m-%d %H:%M:%S') if self.end_time else '不限'}")
        print(f"  统计周期: {self.period}")
        print(f"  分组维度: {', '.join(self.group_by)}")
        print(f"  有效数据: {len(self.valid_data)} 条")
        print(f"  坏行数量: {len(self.bad_rows)} 条")
        print(f"  异常样本: {len(self.abnormal_samples)} 条")

        print("\n" + "-" * 80)
        print("【统计结果摘要】")
        print("-" * 80)

        for period, groups in self.stats_result.items():
            print(f"\n  ▶ 周期: {period}")
            for group_key, group_data in groups.items():
                group_parts = group_key.split('|')
                group_desc = ' / '.join(
                    f"{dim}={val}" for dim, val in zip(self.group_by, group_parts)
                )
                print(f"    ■ {group_desc} (样本数: {group_data['count']})")

                for metric, stats in group_data['metrics'].items():
                    metric_name = metric
                    for code_rules in self.thresholds.values():
                        if metric in code_rules:
                            metric_name = code_rules[metric].get('name', metric)
                            break

                    print(f"      · {metric_name}: "
                          f"均值={stats['avg']}, "
                          f"最小={stats['min']}, "
                          f"最大={stats['max']}, "
                          f"标准差={stats['std_dev']}, "
                          f"合格率={stats['pass_rate']}%")

        print("\n" + "-" * 80)
        print("【异常样本详情 - 按严重程度排序】")
        print("-" * 80)

        level_priority = {'critical': 0, 'warning': 1, 'unknown': 2, 'normal': 99}
        sorted_abnormal = sorted(
            self.abnormal_samples,
            key=lambda x: level_priority.get(x.get('_abnormal_level'), 99)
        )

        if not sorted_abnormal:
            print("  暂无异常样本")
        else:
            level_cn_map = {'critical': '严重', 'warning': '预警', 'unknown': '配置缺失'}
            for i, sample in enumerate(sorted_abnormal[:10], 1):
                level_cn = level_cn_map.get(
                    sample.get('_abnormal_level', ''), sample.get('_abnormal_level', '')
                )
                print(f"\n  [{level_cn}] #{i} 行号:{sample.get('_line_num', '?')} "
                      f"{sample.get('timestamp', '')} "
                      f"{sample.get('kiln_id', '')} "
                      f"{sample.get('clinker_code', '')}")
                for issue in sample.get('_abnormal_details', []):
                    metric_name = issue['metric']
                    for code_rules in self.thresholds.values():
                        if issue['metric'] in code_rules:
                            metric_name = code_rules[issue['metric']].get('name', issue['metric'])
                            break
                    issue_level_cn = level_cn_map.get(issue['level'], issue['level'])
                    print(f"    - [{issue_level_cn}] {issue['explanation']}")

            if len(sorted_abnormal) > 10:
                print(f"\n  ... 还有 {len(sorted_abnormal) - 10} 条异常样本，详见导出文件")

        if self.trend_summary and 'groups' in self.trend_summary:
            print("\n" + "-" * 80)
            print("【趋势摘要 - 环比变化】")
            print("-" * 80)
            print(f"  对比周期: {self.trend_summary['previous_period']} → {self.trend_summary['current_period']}")

            for group_key, group_data in self.trend_summary['groups'].items():
                group_parts = group_key.split('|')
                group_desc = ' / '.join(
                    f"{dim}={val}" for dim, val in zip(self.group_by, group_parts)
                )
                print(f"\n  ■ {group_desc}")

                for metric, trend in group_data['metrics'].items():
                    metric_name = metric
                    for code_rules in self.thresholds.values():
                        if metric in code_rules:
                            metric_name = code_rules[metric].get('name', metric)
                            break

                    if trend['change_pct'] is not None:
                        arrow = '↑' if trend['change_pct'] > 0 else '↓' if trend['change_pct'] < 0 else '→'
                        print(f"    · {metric_name}: {arrow} {abs(trend['change_pct'])}% "
                              f"({trend['previous_avg']} → {trend['current_avg']})")
                    else:
                        print(f"    · {metric_name}: {trend['direction']}")

        print("\n" + "=" * 80)
        print("  详细数据请查看输出目录下的导出文件")
        print("=" * 80 + "\n")

    def export_results(self):
        """导出结果文件"""
        self._log('INFO', '结果导出', '开始导出结果文件')

        stats_file = os.path.join(self.output_dir, 'statistics_result.csv')
        abnormal_file = os.path.join(self.output_dir, 'abnormal_samples.csv')
        bad_rows_file = os.path.join(self.output_dir, 'bad_rows.csv')
        trend_file = os.path.join(self.output_dir, 'trend_summary.csv')
        audit_file = os.path.join(self.output_dir, 'audit_log.csv')
        summary_file = os.path.join(self.output_dir, 'analysis_summary.txt')

        self._export_statistics(stats_file)
        self._export_abnormal(abnormal_file)
        self._export_bad_rows(bad_rows_file)
        self._export_trend(trend_file)
        self._export_audit_log(audit_file)
        self._export_summary_txt(summary_file)

        self._log('INFO', '结果导出', f'结果文件已导出至: {self.output_dir}')
        return True

    def _export_statistics(self, filepath):
        """导出统计结果"""
        numeric_metrics = ['f_cao', 'strength_3d', 'strength_28d', 'specific_surface', 'loss_on_ignition']
        metric_stats = ['avg', 'min', 'max', 'median', 'std_dev', 'pass_rate']

        headers = ['period', 'sample_count'] + [f"{m}_{s}" for m in numeric_metrics for s in metric_stats]
        headers = self.group_by + headers

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)

            for period, groups in self.stats_result.items():
                for group_key, group_data in groups.items():
                    group_parts = group_key.split('|')
                    row = list(group_parts) + [period, group_data['count']]

                    for metric in numeric_metrics:
                        m_stats = group_data.get('metrics', {}).get(metric, {})
                        for s in metric_stats:
                            row.append(m_stats.get(s, ''))

                    writer.writerow(row)

        self._log('INFO', '结果导出', f'统计结果已导出: {os.path.basename(filepath)}')

    def _export_abnormal(self, filepath):
        """导出异常样本"""
        base_fields = ['_line_num', 'timestamp', 'kiln_id', 'clinker_code',
                       '_abnormal_level', '_abnormal_count']
        data_fields = ['f_cao', 'strength_3d', 'strength_28d', 'specific_surface',
                       'soundness', 'loss_on_ignition']
        detail_field = '_abnormal_explanation'

        headers = base_fields + data_fields + [detail_field]

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)

            for sample in self.abnormal_samples:
                row = []
                for field in base_fields:
                    row.append(sample.get(field, ''))
                for field in data_fields:
                    row.append(sample.get(field, ''))

                explanations = []
                for issue in sample.get('_abnormal_details', []):
                    level_cn_map = {'critical': '【严重】', 'warning': '【预警】', 'unknown': '【配置缺失】'}
                    level_cn = level_cn_map.get(issue['level'], f"【{issue['level']}】")
                    explanations.append(f"{level_cn}{issue['explanation']}")
                row.append(' | '.join(explanations))

                writer.writerow(row)

        count = len(self.abnormal_samples)
        self._log('INFO', '结果导出', f'异常样本已导出: {os.path.basename(filepath)} ({count} 条)')

    def _export_bad_rows(self, filepath):
        """导出坏行数据"""
        default_data_fields = ['timestamp', 'kiln_id', 'clinker_code', 'f_cao',
                               'strength_3d', 'strength_28d', 'specific_surface',
                               'soundness', 'loss_on_ignition']

        if self.bad_rows:
            data_fields = [k for k in self.bad_rows[0].keys() if not k.startswith('_')]
        else:
            data_fields = default_data_fields

        headers = ['_line_num', '_issues'] + data_fields

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)

            for row in self.bad_rows:
                out_row = [row.get('_line_num', ''), row.get('_issues', '')]
                for h in headers[2:]:
                    out_row.append(row.get(h, ''))
                writer.writerow(out_row)

        count = len(self.bad_rows)
        self._log('INFO', '结果导出', f'坏行数据已导出: {os.path.basename(filepath)} ({count} 条)')

    def _export_trend(self, filepath):
        """导出趋势摘要"""
        numeric_metrics = ['f_cao', 'strength_3d', 'strength_28d', 'specific_surface', 'loss_on_ignition']

        headers = self.group_by + ['metric', 'previous_avg', 'current_avg', 'change_pct', 'direction']

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)

            if self.trend_summary and 'groups' in self.trend_summary:
                for group_key, group_data in self.trend_summary['groups'].items():
                    group_parts = group_key.split('|')
                    for metric in numeric_metrics:
                        trend = group_data.get('metrics', {}).get(metric, {})
                        row = list(group_parts) + [
                            metric,
                            trend.get('previous_avg', ''),
                            trend.get('current_avg', ''),
                            trend.get('change_pct', ''),
                            trend.get('direction', '')
                        ]
                        writer.writerow(row)

        count = len(self.trend_summary.get('groups', {})) if self.trend_summary and 'groups' in self.trend_summary else 0
        self._log('INFO', '结果导出', f'趋势摘要已导出: {os.path.basename(filepath)} ({count} 个分组)')

    def _export_audit_log(self, filepath):
        """导出操作日志"""
        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['timestamp', 'level', 'module', 'message'])
            for entry in self.audit_log:
                writer.writerow([entry['timestamp'], entry['level'], entry['module'], entry['message']])

        self._log('INFO', '结果导出', f'操作日志已导出: {os.path.basename(filepath)}')

    def _export_summary_txt(self, filepath):
        """导出文本摘要（复核入口）"""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("=" * 70 + "\n")
            f.write("水泥窑熟料质量分析复核报告\n")
            f.write("=" * 70 + "\n\n")

            f.write("一、分析基本信息\n")
            f.write("-" * 70 + "\n")
            f.write(f"  分析时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"  原始数据: {self.raw_data_path}\n")
            f.write(f"  字典表: {self.dict_path}\n")
            f.write(f"  阈值规则: {self.threshold_path}\n")
            f.write(f"  统计周期: {self.period}\n")
            f.write(f"  分组维度: {', '.join(self.group_by)}\n")
            f.write(f"  时间范围: {self.start_time.strftime('%Y-%m-%d %H:%M:%S') if self.start_time else '不限'}"
                    f" ~ {self.end_time.strftime('%Y-%m-%d %H:%M:%S') if self.end_time else '不限'}\n")
            f.write(f"  有效数据: {len(self.valid_data)} 条\n")
            f.write(f"  坏行数量: {len(self.bad_rows)} 条\n")
            f.write(f"  异常样本: {len(self.abnormal_samples)} 条\n\n")

            f.write("二、质量总评\n")
            f.write("-" * 70 + "\n")

            critical_count = sum(1 for s in self.abnormal_samples if s.get('_abnormal_level') == 'critical')
            warning_count = sum(1 for s in self.abnormal_samples if s.get('_abnormal_level') == 'warning')
            unknown_count = sum(1 for s in self.abnormal_samples if s.get('_abnormal_level') == 'unknown')

            if len(self.valid_data) > 0:
                quality_issue_count = len(self.abnormal_samples) - unknown_count
                overall_pass = len(self.valid_data) - quality_issue_count
                overall_rate = overall_pass / len(self.valid_data) * 100
                f.write(f"  整体合格率: {overall_rate:.2f}%\n")
                f.write(f"  严重异常: {critical_count} 条\n")
                f.write(f"  预警异常: {warning_count} 条\n")
                f.write(f"  配置缺失: {unknown_count} 条（需补充阈值配置后重新判定）\n")
            f.write("\n")

            f.write("三、复核入口\n")
            f.write("-" * 70 + "\n")
            f.write("  请重点关注以下项目，必要时进行人工复核：\n\n")

            if self.abnormal_samples:
                f.write("  [异常样本复核]\n")
                level_priority = {'critical': 0, 'warning': 1, 'unknown': 2, 'normal': 99}
                level_cn_map = {'critical': '严重', 'warning': '预警', 'unknown': '配置缺失'}
                sorted_samples = sorted(
                    self.abnormal_samples,
                    key=lambda x: level_priority.get(x.get('_abnormal_level'), 99)
                )
                for i, sample in enumerate(sorted_samples[:5], 1):
                    level_cn = level_cn_map.get(
                        sample.get('_abnormal_level', ''), ''
                    )
                    f.write(f"    {i}. [{level_cn}] {sample.get('timestamp', '')} "
                            f"{sample.get('kiln_id', '')} {sample.get('clinker_code', '')}\n")
                    for issue in sample.get('_abnormal_details', []):
                        issue_level_cn = level_cn_map.get(issue['level'], issue['level'])
                        f.write(f"       - [{issue_level_cn}] {issue['explanation']}\n")
                f.write("\n")

            config_missing_count = sum(
                1 for s in self.abnormal_samples
                if any(i.get('level') == 'unknown' for i in s.get('_abnormal_details', []))
            )
            if config_missing_count > 0:
                f.write("  [配置缺失复核]\n")
                f.write(f"    共 {config_missing_count} 条样本存在阈值配置缺失，请补充配置后重新分析：\n")
                missing_metrics = defaultdict(set)
                for sample in self.abnormal_samples:
                    code = sample.get('clinker_code', '')
                    for issue in sample.get('_abnormal_details', []):
                        if issue.get('level') == 'unknown':
                            missing_metrics[code].add(issue['metric'])
                for code, metrics in sorted(missing_metrics.items()):
                    f.write(f"    - {code}: {', '.join(sorted(metrics))}\n")
                f.write("\n")

            if self.bad_rows:
                f.write("  [坏行复核]\n")
                for i, row in enumerate(self.bad_rows[:5], 1):
                    f.write(f"    {i}. 第{row.get('_line_num', '?')}行: {row.get('_issues', '')}\n")
                f.write("\n")

            if self.trend_summary and 'groups' in self.trend_summary:
                f.write("  [趋势复核]\n")
                for group_key, group_data in self.trend_summary['groups'].items():
                    significant_changes = []
                    for metric, trend in group_data.get('metrics', {}).items():
                        if trend.get('change_pct') is not None and abs(trend['change_pct']) > 5:
                            significant_changes.append((metric, trend))
                    if significant_changes:
                        f.write(f"    {group_key}:\n")
                        for metric, trend in significant_changes:
                            arrow = '上升' if trend['change_pct'] > 0 else '下降'
                            f.write(f"      - {metric}{arrow} {abs(trend['change_pct'])}%\n")
                f.write("\n")

            f.write("四、可解释性说明\n")
            f.write("-" * 70 + "\n")
            f.write("  1. 时间窗口: 基于统计周期参数，将数据按日/周/月切分计算\n")
            f.write("  2. 分组维度: 按指定维度（窑号、熟料编号等）分组统计\n")
            f.write("  3. 阈值命中: 每条异常样本均标注触发的具体阈值规则和超出量\n")
            f.write("  4. 处理留痕: 所有操作均记录在 audit_log.csv 中，可追溯\n")
            f.write("  5. 坏行隔离: 异常数据单独存放，不影响正常统计结果\n\n")

            f.write("=" * 70 + "\n")
            f.write("  分析完成。请质量人员复核以上内容。\n")
            f.write("=" * 70 + "\n")

        self._log('INFO', '结果导出', f'复核摘要已导出: {os.path.basename(filepath)}')

    def run(self):
        """执行完整分析流程"""
        self._log('INFO', '流程启动', '水泥窑熟料质量分析开始')

        if not self.load_dictionary():
            self._log('ERROR', '流程终止', '字典表加载失败，分析终止')
            return False

        if not self.load_thresholds():
            self._log('WARN', '流程继续', '阈值规则加载异常，继续但部分检测可能失效')

        if not self.load_raw_data():
            self._log('ERROR', '流程终止', '原始数据加载失败，分析终止')
            return False

        if not self.valid_data:
            self._log('ERROR', '流程终止', '无有效数据可分析')
            self.export_results()
            return False

        self.analyze_abnormal()
        self.calculate_statistics()
        self.analyze_trend()
        self.print_summary()
        self.export_results()

        self._log('INFO', '流程完成', '水泥窑熟料质量分析完成')
        return True


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='水泥窑熟料质量分析工具')
    parser.add_argument('--raw', default='data/raw_data.csv', help='原始明细数据文件路径')
    parser.add_argument('--dict', default='data/dictionary.csv', help='字典表文件路径')
    parser.add_argument('--threshold', default='data/thresholds.json', help='阈值规则文件路径')
    parser.add_argument('--output', default='output', help='输出目录')
    parser.add_argument('--start', help='统计开始时间 (YYYY-MM-DD HH:MM:SS)')
    parser.add_argument('--end', help='统计结束时间 (YYYY-MM-DD HH:MM:SS)')
    parser.add_argument('--period', default='day', choices=['day', 'week', 'month'],
                        help='统计周期 (day/week/month)')
    parser.add_argument('--group-by', nargs='+', default=['kiln_id', 'clinker_code'],
                        help='分组维度，如: kiln_id clinker_code')

    args = parser.parse_args()

    start_time = None
    end_time = None

    if args.start:
        start_time = datetime.strptime(args.start, '%Y-%m-%d %H:%M:%S')
    if args.end:
        end_time = datetime.strptime(args.end, '%Y-%m-%d %H:%M:%S')

    analyzer = ClinkerQualityAnalyzer(
        raw_data_path=args.raw,
        dict_path=args.__dict__['dict'],
        threshold_path=args.threshold,
        output_dir=args.output,
        start_time=start_time,
        end_time=end_time,
        period=args.period,
        group_by=args.group_by
    )

    success = analyzer.run()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
