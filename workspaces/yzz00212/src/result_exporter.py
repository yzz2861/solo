import csv
import json
import os
from typing import List, Dict, Any
from datetime import datetime


class ResultExporter:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.output_config = config.get('output', {})
        self.include_history_trace = self.output_config.get('include_history_trace', True)
        self.include_reasoning = self.output_config.get('include_reasoning', True)
        self.group_dimensions = config.get('group_dimensions', ['tunnel_id'])

    def export_all(self, all_results: Dict[str, Any], bad_data: List[Dict[str, Any]],
                   output_dir: str, history_traces: Dict[str, List[Dict[str, Any]]] = None,
                   source_info: List[Dict[str, Any]] = None,
                   clean_stats: Dict[str, Any] = None):
        os.makedirs(output_dir, exist_ok=True)

        output_files = {}

        report_file = self.export_group_report(all_results, output_dir, history_traces)
        output_files['group_report'] = report_file

        bad_data_file = self.export_bad_data(bad_data, output_dir)
        output_files['bad_data'] = bad_data_file

        result_json_file = self.export_result_json(all_results, output_dir, history_traces,
                                                    source_info, clean_stats)
        output_files['result_json'] = result_json_file

        review_file = self.export_manual_review(all_results, output_dir)
        output_files['manual_review'] = review_file

        return output_files

    def export_group_report(self, all_results: Dict[str, Any],
                            output_dir: str,
                            history_traces: Dict[str, List[Dict[str, Any]]] = None) -> str:
        filename = self.output_config.get('report_filename', 'group_report.csv')
        filepath = os.path.join(output_dir, filename)

        rows = []
        headers = self._get_report_headers()

        latest_window_key = self._get_latest_non_empty_window(all_results)

        if latest_window_key:
            window_data = all_results[latest_window_key]
            group_results = window_data.get('group_results', {})

            for group_key, result in sorted(group_results.items()):
                row = self._build_report_row(result, window_data, history_traces)
                rows.append(row)

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)

        return filepath

    def _get_report_headers(self) -> List[str]:
        headers = []
        headers.extend(self.group_dimensions)
        headers.extend([
            '风险等级',
            '风险等级(英文)',
            '置信度',
            '记录数',
            '设备数',
            '平均亮度(lux)',
            '亮度最小值(lux)',
            '亮度最大值(lux)',
            '平均功率(W)',
            '故障率(%)',
            '闪烁次数(次/小时)',
            '主要原因',
            '阈值命中项',
            '时间窗口',
            '是否需复核'
        ])
        if self.include_history_trace:
            headers.append('历史窗口数')
        return headers

    def _build_report_row(self, result: Dict[str, Any],
                          window_data: Dict[str, Any],
                          history_traces: Dict[str, List[Dict[str, Any]]] = None) -> Dict[str, str]:
        group_info = result.get('group_info', {})
        metrics = result.get('metrics', {})
        threshold_hits = result.get('threshold_hits', {})
        reasons = result.get('reasons', [])

        row = {}
        for dim in self.group_dimensions:
            row[dim] = group_info.get(dim, '')

        row['风险等级'] = result.get('risk_level_cn', '')
        row['风险等级(英文)'] = result.get('risk_level', '')
        row['置信度'] = f"{result.get('confidence', 0):.2f}"
        row['记录数'] = result.get('record_count', 0)
        row['设备数'] = result.get('device_count', 0)

        row['平均亮度(lux)'] = f"{metrics.get('brightness_mean', 0):.1f}" if metrics.get('brightness_mean') is not None else ''
        row['亮度最小值(lux)'] = f"{metrics.get('brightness_min', 0):.1f}" if metrics.get('brightness_min') is not None else ''
        row['亮度最大值(lux)'] = f"{metrics.get('brightness_max', 0):.1f}" if metrics.get('brightness_max') is not None else ''
        row['平均功率(W)'] = f"{metrics.get('power_mean', 0):.1f}" if metrics.get('power_mean') is not None else ''
        row['故障率(%)'] = f"{metrics.get('failure_rate', 0):.2f}" if metrics.get('failure_rate') is not None else ''
        row['闪烁次数(次/小时)'] = f"{metrics.get('flicker_count', 0)}" if metrics.get('flicker_count') is not None else ''

        row['主要原因'] = '; '.join(reasons[:3]) if reasons else ''
        row['阈值命中项'] = ', '.join(threshold_hits.keys()) if threshold_hits else ''

        window_info = window_data.get('window_info', {})
        row['时间窗口'] = f"{window_info.get('window_start', '')} ~ {window_info.get('window_end', '')}"

        from .risk_engine import RiskEngine
        risk_engine = RiskEngine(self.config)
        row['是否需复核'] = '是' if risk_engine.needs_manual_review(result) else '否'

        if self.include_history_trace and history_traces:
            group_key = result.get('group_key', '')
            trace = history_traces.get(group_key, [])
            row['历史窗口数'] = len(trace)

        return row

    def export_bad_data(self, bad_data: List[Dict[str, Any]], output_dir: str) -> str:
        filename = self.output_config.get('bad_data_filename', 'bad_data_list.csv')
        filepath = os.path.join(output_dir, filename)

        if not bad_data:
            with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['提示', '无坏数据'])
            return filepath

        all_keys = set()
        for record in bad_data:
            all_keys.update(record.keys())

        special_fields = ['_bad_reasons', '_bad_count', '_original_index',
                         '_source_file', '_load_time', '_clean_time']
        regular_fields = [k for k in all_keys if not k.startswith('_')]
        meta_fields = [k for k in all_keys if k.startswith('_') and k in special_fields]

        headers = regular_fields + ['坏数据原因', '坏数据数量', '来源文件', '原始索引']

        rows = []
        for record in bad_data:
            row = {}
            for field in regular_fields:
                value = record.get(field, '')
                if isinstance(value, datetime):
                    value = value.isoformat()
                row[field] = value

            bad_reasons = record.get('_bad_reasons', [])
            row['坏数据原因'] = '; '.join(bad_reasons) if bad_reasons else ''
            row['坏数据数量'] = record.get('_bad_count', 0)
            row['来源文件'] = record.get('_source_file', '')
            row['原始索引'] = record.get('_original_index', '')

            rows.append(row)

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)

        return filepath

    def export_result_json(self, all_results: Dict[str, Any], output_dir: str,
                           history_traces: Dict[str, List[Dict[str, Any]]] = None,
                           source_info: List[Dict[str, Any]] = None,
                           clean_stats: Dict[str, Any] = None) -> str:
        filename = self.output_config.get('result_json_filename', 'inspection_results.json')
        filepath = os.path.join(output_dir, filename)

        output_data = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'config_summary': self._get_config_summary()
            },
            'source_info': source_info or [],
            'data_cleaning_stats': clean_stats or {},
            'windows': {},
            'final_summary': self._get_final_summary(all_results)
        }

        for window_key, window_data in all_results.items():
            window_output = {
                'window_info': window_data.get('window_info', {}),
                'risk_summary': window_data.get('risk_summary', {}),
                'groups': {}
            }

            group_results = window_data.get('group_results', {})
            for group_key, result in group_results.items():
                group_output = {
                    'group_key': group_key,
                    'group_info': result.get('group_info', {}),
                    'risk_level': result.get('risk_level'),
                    'risk_level_cn': result.get('risk_level_cn'),
                    'confidence': result.get('confidence'),
                    'metrics': result.get('metrics', {}),
                    'reasons': result.get('reasons', []),
                    'threshold_hits': result.get('threshold_hits', {})
                }

                if self.include_reasoning:
                    group_output['risk_details'] = result.get('risk_details', [])
                    group_output['baseline_comparison'] = result.get('baseline_comparison')

                if self.include_history_trace and history_traces:
                    trace = history_traces.get(group_key, [])
                    group_output['history_trace'] = trace

                window_output['groups'][group_key] = group_output

            output_data['windows'][window_key] = window_output

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)

        return filepath

    def export_manual_review(self, all_results: Dict[str, Any], output_dir: str) -> str:
        filename = self.output_config.get('review_filename', 'manual_review_list.csv')
        filepath = os.path.join(output_dir, filename)

        from .risk_engine import RiskEngine
        risk_engine = RiskEngine(self.config)

        review_items = []
        latest_window_key = self._get_latest_non_empty_window(all_results)

        if latest_window_key:
            window_data = all_results[latest_window_key]
            group_results = window_data.get('group_results', {})

            for group_key, result in group_results.items():
                if risk_engine.needs_manual_review(result):
                    review_items.append(self._build_review_row(result, window_data))

        headers = self._get_review_headers()

        with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(review_items)

        return filepath

    def _get_review_headers(self) -> List[str]:
        headers = []
        headers.extend(self.group_dimensions)
        headers.extend([
            '风险等级',
            '置信度',
            '需复核原因',
            '主要问题',
            '平均亮度(lux)',
            '平均功率(W)',
            '故障率(%)',
            '闪烁次数',
            '时间窗口',
            '复核人',
            '复核结论',
            '备注'
        ])
        return headers

    def _build_review_row(self, result: Dict[str, Any],
                          window_data: Dict[str, Any]) -> Dict[str, str]:
        group_info = result.get('group_info', {})
        metrics = result.get('metrics', {})
        reasons = result.get('reasons', [])
        risk_level = result.get('risk_level', '')
        confidence = result.get('confidence', 0)

        review_reasons = []
        if risk_level == 'high':
            review_reasons.append('高风险')
        if risk_level == 'undetermined':
            review_reasons.append('无法判定')
        if confidence < 0.5:
            review_reasons.append(f'置信度低({confidence:.2f})')

        threshold_hits = result.get('threshold_hits', {})
        if len(threshold_hits) >= 3:
            review_reasons.append(f'多阈值命中({len(threshold_hits)}项)')

        row = {}
        for dim in self.group_dimensions:
            row[dim] = group_info.get(dim, '')

        row['风险等级'] = result.get('risk_level_cn', '')
        row['置信度'] = f"{confidence:.2f}"
        row['需复核原因'] = '; '.join(review_reasons) if review_reasons else ''
        row['主要问题'] = '; '.join(reasons[:3]) if reasons else ''
        row['平均亮度(lux)'] = f"{metrics.get('brightness_mean', 0):.1f}" if metrics.get('brightness_mean') is not None else ''
        row['平均功率(W)'] = f"{metrics.get('power_mean', 0):.1f}" if metrics.get('power_mean') is not None else ''
        row['故障率(%)'] = f"{metrics.get('failure_rate', 0):.2f}" if metrics.get('failure_rate') is not None else ''
        row['闪烁次数'] = f"{metrics.get('flicker_count', 0)}" if metrics.get('flicker_count') is not None else ''

        window_info = window_data.get('window_info', {})
        row['时间窗口'] = f"{window_info.get('window_start', '')} ~ {window_info.get('window_end', '')}"
        row['复核人'] = ''
        row['复核结论'] = ''
        row['备注'] = ''

        return row

    def _get_latest_non_empty_window(self, all_results: Dict[str, Any]) -> str:
        latest_window_key = None
        latest_time = None
        for window_key, window_data in all_results.items():
            groups = window_data.get('group_results', {})
            if not groups:
                continue
            window_start = window_data.get('window_info', {}).get('window_start')
            if window_start and (latest_time is None or window_start > latest_time):
                latest_time = window_start
                latest_window_key = window_key
        return latest_window_key

    def _get_config_summary(self) -> Dict[str, Any]:
        return {
            'time_window': {
                'window_size_minutes': self.config.get('time_window', {}).get('window_size_minutes'),
                'slide_step_minutes': self.config.get('time_window', {}).get('slide_step_minutes')
            },
            'group_dimensions': self.config.get('group_dimensions', []),
            'thresholds': self.config.get('thresholds', {})
        }

    def _get_final_summary(self, all_results: Dict[str, Any]) -> Dict[str, Any]:
        from .risk_engine import RiskEngine
        risk_engine = RiskEngine(self.config)
        return risk_engine.get_final_summary(all_results)
