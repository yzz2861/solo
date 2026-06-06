from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import statistics


class TimeWindowAggregator:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.time_window_config = config.get('time_window', {})
        self.group_dimensions = config.get('group_dimensions', ['tunnel_id'])

        self.window_size = timedelta(
            minutes=self.time_window_config.get('window_size_minutes', 60)
        )
        self.slide_step = timedelta(
            minutes=self.time_window_config.get('slide_step_minutes', 30)
        )

        self.start_time = self._parse_config_time(
            self.time_window_config.get('start_time')
        )
        self.end_time = self._parse_config_time(
            self.time_window_config.get('end_time')
        )

        self.window_groups = {}
        self.history_traces = defaultdict(list)

    def _parse_config_time(self, time_str: str) -> datetime:
        if not time_str:
            return None
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y/%m/%d %H:%M:%S',
        ]
        for fmt in formats:
            try:
                return datetime.strptime(time_str, fmt)
            except ValueError:
                continue
        return datetime.fromisoformat(time_str)

    def aggregate(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not records:
            return {}

        if not self.start_time or not self.end_time:
            timestamps = [r['timestamp'] for r in records
                         if isinstance(r.get('timestamp'), datetime)]
            if timestamps:
                if not self.start_time:
                    self.start_time = min(timestamps)
                if not self.end_time:
                    self.end_time = max(timestamps)

        grouped_by_time_group = self._group_records(records)
        window_results = {}

        current_start = self.start_time
        while current_start + self.window_size <= self.end_time + timedelta(seconds=1):
            window_end = current_start + self.window_size
            window_key = self._format_window_key(current_start, window_end)

            window_groups = self._aggregate_window(
                grouped_by_time_group, current_start, window_end
            )

            window_results[window_key] = {
                'window_start': current_start.isoformat(),
                'window_end': window_end.isoformat(),
                'window_size_minutes': self.window_size.total_seconds() / 60,
                'groups': window_groups,
                'group_count': len(window_groups),
                'total_records': sum(g['record_count'] for g in window_groups.values())
            }

            for group_key, group_data in window_groups.items():
                trace_entry = {
                    'window_key': window_key,
                    'window_start': current_start.isoformat(),
                    'window_end': window_end.isoformat(),
                    'metrics': group_data.get('metrics', {})
                }
                self.history_traces[group_key].append(trace_entry)

            current_start += self.slide_step

        self.window_groups = window_results
        return window_results

    def _group_records(self, records: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        grouped = defaultdict(list)

        for record in records:
            if not isinstance(record.get('timestamp'), datetime):
                continue

            group_key = self._get_group_key(record)
            grouped[group_key].append(record)

        for key in grouped:
            grouped[key].sort(key=lambda x: x['timestamp'])

        return grouped

    def _get_group_key(self, record: Dict[str, Any]) -> str:
        key_parts = []
        for dim in self.group_dimensions:
            value = record.get(dim, 'unknown')
            key_parts.append(str(value))
        return '|'.join(key_parts)

    def _aggregate_window(self, grouped_records: Dict[str, List[Dict[str, Any]]],
                          window_start: datetime, window_end: datetime) -> Dict[str, Any]:
        window_groups = {}

        for group_key, records in grouped_records.items():
            in_window = [
                r for r in records
                if window_start <= r['timestamp'] < window_end
            ]

            if not in_window:
                continue

            metrics = self._calculate_metrics(in_window)

            group_info = self._parse_group_key(group_key)

            window_groups[group_key] = {
                'group_key': group_key,
                'group_info': group_info,
                'record_count': len(in_window),
                'device_count': len(set(r.get('device_id', '') for r in in_window)),
                'metrics': metrics,
                'time_range': {
                    'first': min(r['timestamp'] for r in in_window).isoformat(),
                    'last': max(r['timestamp'] for r in in_window).isoformat()
                }
            }

        return window_groups

    def _calculate_metrics(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        metrics = {}

        brightness_values = [r.get('brightness') for r in records
                            if r.get('brightness') is not None]
        if brightness_values:
            metrics['brightness_mean'] = statistics.mean(brightness_values)
            metrics['brightness_min'] = min(brightness_values)
            metrics['brightness_max'] = max(brightness_values)
            metrics['brightness_std'] = (statistics.stdev(brightness_values)
                                        if len(brightness_values) > 1 else 0.0)
            metrics['brightness_median'] = statistics.median(brightness_values)

        power_values = [r.get('power') for r in records
                       if r.get('power') is not None]
        if power_values:
            metrics['power_mean'] = statistics.mean(power_values)
            metrics['power_min'] = min(power_values)
            metrics['power_max'] = max(power_values)
            metrics['power_std'] = (statistics.stdev(power_values)
                                   if len(power_values) > 1 else 0.0)

        failure_count = sum(1 for r in records if r.get('status') == 'failure'
                           or r.get('is_fault') == True)
        metrics['failure_count'] = failure_count
        metrics['failure_rate'] = (failure_count / len(records) * 100) if records else 0.0

        flicker_total = sum(r.get('flicker_count', 0) for r in records
                           if isinstance(r.get('flicker_count'), (int, float)))
        metrics['flicker_count'] = flicker_total

        temp_values = [r.get('temperature') for r in records
                      if r.get('temperature') is not None]
        if temp_values:
            metrics['temperature_mean'] = statistics.mean(temp_values)
            metrics['temperature_max'] = max(temp_values)

        return metrics

    def _parse_group_key(self, group_key: str) -> Dict[str, str]:
        parts = group_key.split('|')
        info = {}
        for i, dim in enumerate(self.group_dimensions):
            if i < len(parts):
                info[dim] = parts[i]
            else:
                info[dim] = 'unknown'
        return info

    def _format_window_key(self, start: datetime, end: datetime) -> str:
        return f"{start.strftime('%Y%m%d_%H%M')}_{end.strftime('%Y%m%d_%H%M')}"

    def get_window_results(self) -> Dict[str, Any]:
        return self.window_groups

    def get_history_trace(self, group_key: str) -> List[Dict[str, Any]]:
        return self.history_traces.get(group_key, [])

    def get_all_group_keys(self) -> List[str]:
        all_keys = set()
        for window_data in self.window_groups.values():
            all_keys.update(window_data.get('groups', {}).keys())
        return list(all_keys)

    def get_group_latest_metrics(self, group_key: str) -> Dict[str, Any]:
        trace = self.history_traces.get(group_key, [])
        if not trace:
            return {}
        return trace[-1].get('metrics', {})

    def get_window_count(self) -> int:
        return len(self.window_groups)

    def get_summary(self) -> Dict[str, Any]:
        total_records = 0
        total_groups = set()

        for window_data in self.window_groups.values():
            total_records += window_data.get('total_records', 0)
            total_groups.update(window_data.get('groups', {}).keys())

        return {
            'window_count': len(self.window_groups),
            'total_records_across_windows': total_records,
            'unique_groups': len(total_groups),
            'window_size_minutes': self.window_size.total_seconds() / 60,
            'slide_step_minutes': self.slide_step.total_seconds() / 60,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None
        }
