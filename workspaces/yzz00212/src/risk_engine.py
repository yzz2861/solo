from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime


class RiskEngine:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.thresholds = config.get('thresholds', {})
        self.risk_levels = config.get('risk_levels', ['low', 'medium', 'high', 'undetermined'])

    def evaluate_group(self, group_data: Dict[str, Any],
                       baseline_comparison: Optional[Dict[str, Any]] = None,
                       history_trace: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        metrics = group_data.get('metrics', {})
        group_info = group_data.get('group_info', {})
        group_key = group_data.get('group_key', 'unknown')

        risk_details = []
        overall_risk = 'undetermined'
        confidence = 0.0

        brightness_risk = self._evaluate_brightness(metrics)
        if brightness_risk:
            risk_details.append(brightness_risk)

        power_risk = self._evaluate_power(metrics)
        if power_risk:
            risk_details.append(power_risk)

        failure_risk = self._evaluate_failure_rate(metrics)
        if failure_risk:
            risk_details.append(failure_risk)

        flicker_risk = self._evaluate_flicker(metrics)
        if flicker_risk:
            risk_details.append(flicker_risk)

        if baseline_comparison and baseline_comparison.get('has_baseline'):
            baseline_risk = self._evaluate_baseline_deviation(baseline_comparison)
            if baseline_risk:
                risk_details.append(baseline_risk)

        if history_trace:
            trend_risk = self._evaluate_trend(history_trace)
            if trend_risk:
                risk_details.append(trend_risk)

        if not risk_details:
            overall_risk = 'low'
            confidence = 0.8
            risk_details.append({
                'metric': 'overall',
                'risk_level': 'low',
                'reason': '所有指标均在正常范围内',
                'evidence': {}
            })
        else:
            overall_risk, confidence = self._combine_risks(risk_details)

        reasons = self._generate_reasons(risk_details, overall_risk)

        threshold_hits = self._get_threshold_hits(metrics, baseline_comparison)

        return {
            'group_key': group_key,
            'group_info': group_info,
            'record_count': group_data.get('record_count', 0),
            'device_count': group_data.get('device_count', 0),
            'risk_level': overall_risk,
            'risk_level_cn': self._risk_level_cn(overall_risk),
            'confidence': confidence,
            'risk_details': risk_details,
            'reasons': reasons,
            'threshold_hits': threshold_hits,
            'metrics': metrics,
            'baseline_comparison': baseline_comparison,
            'evaluation_time': datetime.now().isoformat()
        }

    def _evaluate_brightness(self, metrics: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        brightness = metrics.get('brightness_mean')
        if brightness is None:
            return None

        brightness_thresholds = self.thresholds.get('brightness', {})
        high_threshold = brightness_thresholds.get('high', 50)
        medium_threshold = brightness_thresholds.get('medium', 100)
        low_threshold = brightness_thresholds.get('low', 150)

        if brightness < high_threshold:
            risk_level = 'high'
            reason = f"平均亮度 {brightness:.1f} lux 低于高风险阈值 {high_threshold} lux"
        elif brightness < medium_threshold:
            risk_level = 'medium'
            reason = f"平均亮度 {brightness:.1f} lux 低于中风险阈值 {medium_threshold} lux"
        elif brightness < low_threshold:
            risk_level = 'low'
            reason = f"平均亮度 {brightness:.1f} lux 接近低风险阈值 {low_threshold} lux"
        else:
            return {
                'metric': 'brightness',
                'risk_level': 'low',
                'reason': f"平均亮度 {brightness:.1f} lux 正常",
                'evidence': {
                    'value': brightness,
                    'unit': 'lux',
                    'threshold_low': low_threshold,
                    'threshold_medium': medium_threshold,
                    'threshold_high': high_threshold
                }
            }

        return {
            'metric': 'brightness',
            'risk_level': risk_level,
            'reason': reason,
            'evidence': {
                'value': brightness,
                'unit': 'lux',
                'threshold_low': low_threshold,
                'threshold_medium': medium_threshold,
                'threshold_high': high_threshold
            }
        }

    def _evaluate_power(self, metrics: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        power = metrics.get('power_mean')
        if power is None:
            return None

        power_thresholds = self.thresholds.get('power', {})
        high_threshold = power_thresholds.get('high', 100)
        medium_threshold = power_thresholds.get('medium', 300)
        low_threshold = power_thresholds.get('low', 500)

        if power < high_threshold:
            risk_level = 'high'
            reason = f"平均功率 {power:.1f} W 低于高风险阈值 {high_threshold} W，可能大面积熄灯"
        elif power < medium_threshold:
            risk_level = 'medium'
            reason = f"平均功率 {power:.1f} W 低于中风险阈值 {medium_threshold} W"
        elif power < low_threshold:
            risk_level = 'low'
            reason = f"平均功率 {power:.1f} W 接近低风险阈值 {low_threshold} W"
        else:
            return {
                'metric': 'power',
                'risk_level': 'low',
                'reason': f"平均功率 {power:.1f} W 正常",
                'evidence': {
                    'value': power,
                    'unit': 'W',
                    'threshold_low': low_threshold,
                    'threshold_medium': medium_threshold,
                    'threshold_high': high_threshold
                }
            }

        return {
            'metric': 'power',
            'risk_level': risk_level,
            'reason': reason,
            'evidence': {
                'value': power,
                'unit': 'W',
                'threshold_low': low_threshold,
                'threshold_medium': medium_threshold,
                'threshold_high': high_threshold
            }
        }

    def _evaluate_failure_rate(self, metrics: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        failure_rate = metrics.get('failure_rate')
        if failure_rate is None:
            return None

        failure_thresholds = self.thresholds.get('failure_rate', {})
        high_threshold = failure_thresholds.get('high', 10.0)
        medium_threshold = failure_thresholds.get('medium', 5.0)
        low_threshold = failure_thresholds.get('low', 1.0)

        if failure_rate > high_threshold:
            risk_level = 'high'
            reason = f"故障率 {failure_rate:.2f}% 超过高风险阈值 {high_threshold}%"
        elif failure_rate > medium_threshold:
            risk_level = 'medium'
            reason = f"故障率 {failure_rate:.2f}% 超过中风险阈值 {medium_threshold}%"
        elif failure_rate > low_threshold:
            risk_level = 'low'
            reason = f"故障率 {failure_rate:.2f}% 超过低风险阈值 {low_threshold}%"
        else:
            return {
                'metric': 'failure_rate',
                'risk_level': 'low',
                'reason': f"故障率 {failure_rate:.2f}% 正常",
                'evidence': {
                    'value': failure_rate,
                    'unit': '%',
                    'threshold_low': low_threshold,
                    'threshold_medium': medium_threshold,
                    'threshold_high': high_threshold
                }
            }

        return {
            'metric': 'failure_rate',
            'risk_level': risk_level,
            'reason': reason,
            'evidence': {
                'value': failure_rate,
                'unit': '%',
                'threshold_low': low_threshold,
                'threshold_medium': medium_threshold,
                'threshold_high': high_threshold
            }
        }

    def _evaluate_flicker(self, metrics: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        flicker_count = metrics.get('flicker_count')
        if flicker_count is None:
            return None

        flicker_thresholds = self.thresholds.get('flicker_count', {})
        high_threshold = flicker_thresholds.get('high', 30)
        medium_threshold = flicker_thresholds.get('medium', 10)
        low_threshold = flicker_thresholds.get('low', 3)

        if flicker_count > high_threshold:
            risk_level = 'high'
            reason = f"闪烁次数 {flicker_count} 次/小时 超过高风险阈值 {high_threshold} 次"
        elif flicker_count > medium_threshold:
            risk_level = 'medium'
            reason = f"闪烁次数 {flicker_count} 次/小时 超过中风险阈值 {medium_threshold} 次"
        elif flicker_count > low_threshold:
            risk_level = 'low'
            reason = f"闪烁次数 {flicker_count} 次/小时 超过低风险阈值 {low_threshold} 次"
        else:
            return {
                'metric': 'flicker_count',
                'risk_level': 'low',
                'reason': f"闪烁次数 {flicker_count} 次/小时 正常",
                'evidence': {
                    'value': flicker_count,
                    'unit': '次/小时',
                    'threshold_low': low_threshold,
                    'threshold_medium': medium_threshold,
                    'threshold_high': high_threshold
                }
            }

        return {
            'metric': 'flicker_count',
            'risk_level': risk_level,
            'reason': reason,
            'evidence': {
                'value': flicker_count,
                'unit': '次/小时',
                'threshold_low': low_threshold,
                'threshold_medium': medium_threshold,
                'threshold_high': high_threshold
            }
        }

    def _evaluate_baseline_deviation(self, baseline_comparison: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not baseline_comparison.get('has_baseline'):
            return None

        level = baseline_comparison.get('deviation_level', 'normal')
        max_deviation = baseline_comparison.get('max_deviation', 0)

        if level == 'critical':
            risk_level = 'high'
            reason = f"与历史基线偏差 {max_deviation*100:.1f}%，超过临界阈值"
        elif level == 'warning':
            risk_level = 'medium'
            reason = f"与历史基线偏差 {max_deviation*100:.1f}%，超过警告阈值"
        else:
            return {
                'metric': 'baseline_deviation',
                'risk_level': 'low',
                'reason': f"与历史基线偏差 {max_deviation*100:.1f}%，在正常范围内",
                'evidence': {
                    'max_deviation': max_deviation,
                    'level': level,
                    'details': baseline_comparison.get('details', [])
                }
            }

        return {
            'metric': 'baseline_deviation',
            'risk_level': risk_level,
            'reason': reason,
            'evidence': {
                'max_deviation': max_deviation,
                'level': level,
                'details': baseline_comparison.get('details', [])
            }
        }

    def _evaluate_trend(self, history_trace: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if len(history_trace) < 3:
            return None

        brightness_values = []
        for entry in history_trace:
            metrics = entry.get('metrics', {})
            if 'brightness_mean' in metrics:
                brightness_values.append(metrics['brightness_mean'])

        if len(brightness_values) < 3:
            return None

        first_half = brightness_values[:len(brightness_values)//2]
        second_half = brightness_values[len(brightness_values)//2:]

        if not first_half or not second_half:
            return None

        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)

        if avg_first == 0:
            return None

        change_rate = (avg_second - avg_first) / avg_first

        if change_rate < -0.2:
            risk_level = 'high'
            reason = f"亮度呈快速下降趋势，降幅 {abs(change_rate)*100:.1f}%"
        elif change_rate < -0.1:
            risk_level = 'medium'
            reason = f"亮度呈下降趋势，降幅 {abs(change_rate)*100:.1f}%"
        elif change_rate > 0.1:
            risk_level = 'medium'
            reason = f"亮度呈上升趋势，增幅 {change_rate*100:.1f}%，需关注"
        else:
            return {
                'metric': 'trend',
                'risk_level': 'low',
                'reason': f"亮度趋势稳定，变化率 {change_rate*100:.1f}%",
                'evidence': {
                    'change_rate': change_rate,
                    'window_count': len(history_trace)
                }
            }

        return {
            'metric': 'trend',
            'risk_level': risk_level,
            'reason': reason,
            'evidence': {
                'change_rate': change_rate,
                'avg_first': avg_first,
                'avg_second': avg_second,
                'window_count': len(history_trace)
            }
        }

    def _combine_risks(self, risk_details: List[Dict[str, Any]]) -> Tuple[str, float]:
        risk_priority = {'high': 3, 'medium': 2, 'low': 1, 'undetermined': 0}

        has_high = False
        has_medium = False
        has_low = False
        total_score = 0
        count = 0

        for detail in risk_details:
            level = detail.get('risk_level', 'low')
            priority = risk_priority.get(level, 0)
            total_score += priority
            count += 1

            if level == 'high':
                has_high = True
            elif level == 'medium':
                has_medium = True
            elif level == 'low':
                has_low = True

        if has_high:
            overall = 'high'
            confidence = 0.9 if count > 1 else 0.7
        elif has_medium:
            overall = 'medium'
            confidence = 0.8 if count > 1 else 0.6
        elif has_low:
            overall = 'low'
            confidence = 0.9
        else:
            overall = 'undetermined'
            confidence = 0.3

        return overall, confidence

    def _generate_reasons(self, risk_details: List[Dict[str, Any]],
                          overall_risk: str) -> List[str]:
        reasons = []

        for detail in risk_details:
            if detail.get('risk_level') in ['high', 'medium']:
                reasons.append(detail.get('reason', ''))

        if not reasons and overall_risk == 'low':
            reasons.append("各项指标均在正常范围内")

        return reasons

    def _get_threshold_hits(self, metrics: Dict[str, Any],
                            baseline_comparison: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        hits = {}

        brightness = metrics.get('brightness_mean')
        if brightness is not None:
            bt = self.thresholds.get('brightness', {})
            if brightness < bt.get('high', 50):
                hits['brightness'] = {'level': 'high', 'threshold': bt.get('high'), 'value': brightness}
            elif brightness < bt.get('medium', 100):
                hits['brightness'] = {'level': 'medium', 'threshold': bt.get('medium'), 'value': brightness}
            elif brightness < bt.get('low', 150):
                hits['brightness'] = {'level': 'low', 'threshold': bt.get('low'), 'value': brightness}

        power = metrics.get('power_mean')
        if power is not None:
            pt = self.thresholds.get('power', {})
            if power < pt.get('high', 100):
                hits['power'] = {'level': 'high', 'threshold': pt.get('high'), 'value': power}
            elif power < pt.get('medium', 300):
                hits['power'] = {'level': 'medium', 'threshold': pt.get('medium'), 'value': power}

        failure_rate = metrics.get('failure_rate')
        if failure_rate is not None:
            ft = self.thresholds.get('failure_rate', {})
            if failure_rate > ft.get('high', 10.0):
                hits['failure_rate'] = {'level': 'high', 'threshold': ft.get('high'), 'value': failure_rate}
            elif failure_rate > ft.get('medium', 5.0):
                hits['failure_rate'] = {'level': 'medium', 'threshold': ft.get('medium'), 'value': failure_rate}

        flicker_count = metrics.get('flicker_count')
        if flicker_count is not None:
            fct = self.thresholds.get('flicker_count', {})
            if flicker_count > fct.get('high', 30):
                hits['flicker_count'] = {'level': 'high', 'threshold': fct.get('high'), 'value': flicker_count}
            elif flicker_count > fct.get('medium', 10):
                hits['flicker_count'] = {'level': 'medium', 'threshold': fct.get('medium'), 'value': flicker_count}

        if baseline_comparison and baseline_comparison.get('has_baseline'):
            level = baseline_comparison.get('deviation_level')
            if level in ['critical', 'warning']:
                hits['baseline_deviation'] = {
                    'level': 'high' if level == 'critical' else 'medium',
                    'max_deviation': baseline_comparison.get('max_deviation', 0)
                }

        return hits

    def _risk_level_cn(self, level: str) -> str:
        mapping = {
            'low': '低风险',
            'medium': '中风险',
            'high': '高风险',
            'undetermined': '无法判定'
        }
        return mapping.get(level, level)

    def needs_manual_review(self, risk_result: Dict[str, Any]) -> bool:
        risk_level = risk_result.get('risk_level', 'undetermined')
        confidence = risk_result.get('confidence', 0)
        threshold_hits = risk_result.get('threshold_hits', {})

        if risk_level == 'high':
            return True
        if risk_level == 'undetermined':
            return True
        if confidence < 0.5:
            return True
        if len(threshold_hits) >= 3:
            return True
        if risk_level == 'medium' and 'baseline_deviation' in threshold_hits:
            return True

        return False

    def evaluate_all_windows(self, window_results: Dict[str, Any],
                             baseline_manager=None,
                             time_window_aggregator=None) -> Dict[str, Any]:
        all_results = {}

        for window_key, window_data in window_results.items():
            groups = window_data.get('groups', {})
            window_results_data = {}

            for group_key, group_data in groups.items():
                baseline_comparison = None
                if baseline_manager:
                    baseline_comparison = baseline_manager.compare_with_baseline(
                        group_key, group_data.get('metrics', {})
                    )

                history_trace = None
                if time_window_aggregator:
                    history_trace = time_window_aggregator.get_history_trace(group_key)

                risk_result = self.evaluate_group(
                    group_data, baseline_comparison, history_trace
                )
                window_results_data[group_key] = risk_result

            all_results[window_key] = {
                'window_info': {
                    'window_start': window_data.get('window_start'),
                    'window_end': window_data.get('window_end'),
                    'group_count': window_data.get('group_count')
                },
                'group_results': window_results_data,
                'risk_summary': self._summarize_window(window_results_data)
            }

        return all_results

    def _summarize_window(self, group_results: Dict[str, Any]) -> Dict[str, Any]:
        summary = {
            'total': len(group_results),
            'high': 0,
            'medium': 0,
            'low': 0,
            'undetermined': 0,
            'needs_review': 0
        }

        for result in group_results.values():
            level = result.get('risk_level', 'undetermined')
            if level in summary:
                summary[level] += 1

            if self.needs_manual_review(result):
                summary['needs_review'] += 1

        return summary

    def get_final_summary(self, all_results: Dict[str, Any]) -> Dict[str, Any]:
        latest_window = None
        latest_time = None

        for window_key, window_data in all_results.items():
            group_results = window_data.get('group_results', {})
            if not group_results:
                continue
            window_start = window_data.get('window_info', {}).get('window_start')
            if window_start and (latest_time is None or window_start > latest_time):
                latest_time = window_start
                latest_window = window_data

        if not latest_window:
            return {}

        group_results = latest_window.get('group_results', {})
        summary = {
            'total_groups': len(group_results),
            'high_risk': 0,
            'medium_risk': 0,
            'low_risk': 0,
            'undetermined': 0,
            'needs_review': 0,
            'high_risk_groups': [],
            'medium_risk_groups': [],
            'needs_review_groups': []
        }

        for group_key, result in group_results.items():
            level = result.get('risk_level', 'undetermined')
            if level == 'high':
                summary['high_risk'] += 1
                summary['high_risk_groups'].append(group_key)
            elif level == 'medium':
                summary['medium_risk'] += 1
                summary['medium_risk_groups'].append(group_key)
            elif level == 'low':
                summary['low_risk'] += 1
            else:
                summary['undetermined'] += 1

            if self.needs_manual_review(result):
                summary['needs_review'] += 1
                summary['needs_review_groups'].append(group_key)

        return summary
