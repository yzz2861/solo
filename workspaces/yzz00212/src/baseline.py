import json
import csv
import os
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime


class BaselineManager:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.baseline_config = config.get('baseline', {})
        self.baseline_data = {}
        self.compare_metrics = self.baseline_config.get('compare_metrics', [
            'brightness_mean', 'brightness_std', 'power_mean', 'failure_rate'
        ])
        self.deviation_threshold_warning = self.baseline_config.get('deviation_threshold_warning', 0.15)
        self.deviation_threshold_critical = self.baseline_config.get('deviation_threshold_critical', 0.3)

    def load_baseline(self, baseline_path: str) -> Dict[str, Any]:
        if not os.path.exists(baseline_path):
            raise ValueError(f"基线文件不存在: {baseline_path}")

        if os.path.isdir(baseline_path):
            self._load_baseline_from_dir(baseline_path)
        else:
            self._load_baseline_file(baseline_path)

        return self.baseline_data

    def _load_baseline_from_dir(self, dir_path: str):
        for filename in sorted(os.listdir(dir_path)):
            filepath = os.path.join(dir_path, filename)
            if not os.path.isfile(filepath):
                continue
            ext = os.path.splitext(filename)[1].lower()
            if ext in ['.json', '.csv']:
                self._load_baseline_file(filepath)

    def _load_baseline_file(self, filepath: str):
        ext = os.path.splitext(filepath)[1].lower()
        if ext == '.json':
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self._process_baseline_data(data, filepath)
        elif ext == '.csv':
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self._process_baseline_row(row, filepath)

    def _process_baseline_data(self, data: Any, filepath: str):
        if isinstance(data, dict):
            if 'groups' in data and isinstance(data['groups'], list):
                for group in data['groups']:
                    self._add_baseline_entry(group, filepath)
            elif 'tunnel_id' in data or 'group_key' in data:
                self._add_baseline_entry(data, filepath)
            else:
                for key, value in data.items():
                    if isinstance(value, dict):
                        value['group_key'] = key
                        self._add_baseline_entry(value, filepath)
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    self._add_baseline_entry(item, filepath)

    def _process_baseline_row(self, row: Dict[str, Any], filepath: str):
        converted = {}
        for key, value in row.items():
            try:
                converted[key] = float(value)
            except (ValueError, TypeError):
                converted[key] = value
        self._add_baseline_entry(converted, filepath)

    def _add_baseline_entry(self, entry: Dict[str, Any], filepath: str):
        group_key = self._get_group_key(entry)
        if group_key not in self.baseline_data:
            self.baseline_data[group_key] = {}

        metrics = {}
        for metric in self.compare_metrics:
            if metric in entry:
                try:
                    metrics[metric] = float(entry[metric])
                except (ValueError, TypeError):
                    pass

        self.baseline_data[group_key].update({
            'metrics': metrics,
            'source_file': os.path.basename(filepath),
            'metadata': {k: v for k, v in entry.items() if k not in metrics}
        })

    def _get_group_key(self, entry: Dict[str, Any]) -> str:
        dimensions = self.config.get('group_dimensions', ['tunnel_id'])
        key_parts = []
        for dim in dimensions:
            if dim in entry:
                key_parts.append(str(entry[dim]))
        if key_parts:
            return '|'.join(key_parts)
        return entry.get('group_key', 'default')

    def compare_with_baseline(self, group_key: str, current_metrics: Dict[str, float]) -> Dict[str, Any]:
        if group_key not in self.baseline_data:
            return {
                'has_baseline': False,
                'deviations': {},
                'deviation_level': 'no_baseline',
                'details': []
            }

        baseline_metrics = self.baseline_data[group_key]['metrics']
        deviations = {}
        details = []
        max_deviation = 0.0

        for metric in self.compare_metrics:
            if metric not in baseline_metrics or metric not in current_metrics:
                continue

            baseline_value = baseline_metrics[metric]
            current_value = current_metrics[metric]

            if baseline_value == 0:
                deviation_ratio = 0.0 if current_value == 0 else 1.0
            else:
                deviation_ratio = abs(current_value - baseline_value) / abs(baseline_value)

            deviations[metric] = {
                'baseline_value': baseline_value,
                'current_value': current_value,
                'deviation_ratio': deviation_ratio,
                'deviation_abs': current_value - baseline_value
            }

            if deviation_ratio > max_deviation:
                max_deviation = deviation_ratio

            if deviation_ratio >= self.deviation_threshold_critical:
                level = 'critical'
            elif deviation_ratio >= self.deviation_threshold_warning:
                level = 'warning'
            else:
                level = 'normal'

            details.append({
                'metric': metric,
                'deviation_ratio': deviation_ratio,
                'level': level,
                'description': f"{metric}: 基线={baseline_value:.2f}, 当前={current_value:.2f}, 偏差={deviation_ratio*100:.1f}%"
            })

        if max_deviation >= self.deviation_threshold_critical:
            overall_level = 'critical'
        elif max_deviation >= self.deviation_threshold_warning:
            overall_level = 'warning'
        else:
            overall_level = 'normal'

        return {
            'has_baseline': True,
            'deviations': deviations,
            'deviation_level': overall_level,
            'max_deviation': max_deviation,
            'details': details,
            'baseline_source': self.baseline_data[group_key].get('source_file', '')
        }

    def get_baseline_metrics(self, group_key: str) -> Optional[Dict[str, float]]:
        if group_key in self.baseline_data:
            return self.baseline_data[group_key]['metrics']
        return None

    def has_baseline(self, group_key: str) -> bool:
        return group_key in self.baseline_data

    def get_all_group_keys(self) -> List[str]:
        return list(self.baseline_data.keys())

    def generate_baseline_from_records(self, records: List[Dict[str, Any]],
                                        group_dimensions: List[str]) -> Dict[str, Any]:
        from collections import defaultdict
        import statistics

        groups = defaultdict(list)
        for record in records:
            key_parts = [str(record.get(dim, 'unknown')) for dim in group_dimensions]
            group_key = '|'.join(key_parts)
            groups[group_key].append(record)

        baseline_data = {}
        for group_key, group_records in groups.items():
            brightness_values = [r.get('brightness') for r in group_records
                                 if r.get('brightness') is not None]
            power_values = [r.get('power') for r in group_records
                            if r.get('power') is not None]

            metrics = {}
            if brightness_values:
                metrics['brightness_mean'] = statistics.mean(brightness_values)
                metrics['brightness_std'] = statistics.stdev(brightness_values) if len(brightness_values) > 1 else 0.0

            if power_values:
                metrics['power_mean'] = statistics.mean(power_values)

            failure_count = sum(1 for r in group_records if r.get('status') == 'failure')
            metrics['failure_rate'] = (failure_count / len(group_records) * 100) if group_records else 0.0

            key_parts = group_key.split('|')
            metadata = {}
            for i, dim in enumerate(group_dimensions):
                if i < len(key_parts):
                    metadata[dim] = key_parts[i]

            baseline_data[group_key] = {
                'metrics': metrics,
                'record_count': len(group_records),
                'metadata': metadata
            }

        self.baseline_data = baseline_data
        return baseline_data

    def save_baseline(self, output_path: str):
        output_data = []
        for group_key, data in self.baseline_data.items():
            entry = {
                'group_key': group_key,
                'record_count': data.get('record_count', 0)
            }
            entry.update(data.get('metrics', {}))
            entry.update(data.get('metadata', {}))
            output_data.append(entry)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
