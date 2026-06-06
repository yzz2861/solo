import re
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from collections import defaultdict

from .config import AppConfig, RiskLevel, RISK_LABELS
from .logger import OperationLogger
from .reader import DataReader


class ComplaintMerger:
    def __init__(self, config: AppConfig, logger: OperationLogger):
        self.config = config
        self.logger = logger

    def merge_and_classify(
        self, good_rows: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        self.logger.info(f"开始归并处理，共 {len(good_rows)} 条有效数据")

        if not good_rows:
            self.logger.warning("没有有效数据可处理")
            return []

        groups = self._group_complaints(good_rows)
        self.logger.info(f"归并为 {len(groups)} 个投诉组")

        results = []
        for group_key, group_rows in groups.items():
            merged = self._merge_group(group_key, group_rows)
            results.append(merged)

        for result in results:
            risk_level, risk_score, risk_reasons = self._assess_risk(result)
            result['risk_level'] = risk_level.value
            result['risk_level_label'] = RISK_LABELS[risk_level]
            result['risk_score'] = risk_score
            result['risk_reasons'] = "; ".join(risk_reasons) if risk_reasons else ""

        risk_counts = defaultdict(int)
        for r in results:
            risk_counts[r['risk_level']] += 1

        self.logger.info("风险分级统计:")
        for level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.UNDETERMINED]:
            count = risk_counts.get(level.value, 0)
            self.logger.info(f"  - {RISK_LABELS[level]}: {count} 条")

        self.logger.info(f"归并处理完成，共 {len(results)} 条归并结果")
        return results

    def _group_complaints(
        self, rows: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        groups = defaultdict(list)
        mp = self.config.merge

        address_groups = defaultdict(list)
        for row in rows:
            address = str(row.get('address', '')).strip()
            address_norm = self._normalize_address(address)
            address_groups[address_norm].append(row)

        for addr_key, addr_rows in address_groups.items():
            if len(addr_rows) == 1:
                row = addr_rows[0]
                single_key = f"{addr_key}_single_{row.get('complaint_id', '')}"
                groups[single_key] = [row]
                continue

            time_sorted = sorted(
                addr_rows,
                key=lambda r: DataReader.parse_datetime(
                    str(r.get('complaint_time', ''))
                ) or datetime.min
            )

            current_group = [time_sorted[0]]
            current_time = DataReader.parse_datetime(
                str(time_sorted[0].get('complaint_time', ''))
            )

            for row in time_sorted[1:]:
                row_time = DataReader.parse_datetime(
                    str(row.get('complaint_time', ''))
                )

                if current_time and row_time:
                    time_diff = abs((row_time - current_time).total_seconds()) / 3600
                    in_time_window = time_diff <= mp.time_window_hours
                else:
                    in_time_window = False

                same_person = False
                if mp.same_complainant_merge:
                    complainant1 = str(current_group[-1].get('complainant', '')).strip()
                    complainant2 = str(row.get('complainant', '')).strip()
                    phone1 = str(current_group[-1].get('phone', '')).strip()
                    phone2 = str(row.get('phone', '')).strip()
                    same_person = (
                        complainant1 == complainant2
                        or (phone1 and phone2 and phone1 == phone2)
                    )

                if in_time_window or same_person:
                    current_group.append(row)
                    if row_time and (not current_time or row_time > current_time):
                        current_time = row_time
                else:
                    group_key = f"{addr_key}_{len(groups)}"
                    groups[group_key] = current_group
                    current_group = [row]
                    current_time = row_time

            if current_group:
                group_key = f"{addr_key}_{len(groups)}"
                groups[group_key] = current_group

        return groups

    @staticmethod
    def _normalize_address(address: str) -> str:
        if not address:
            return ""
        addr = address.strip()
        addr = re.sub(r'[\s\-_—\.]', '', addr)
        addr = re.sub(r'[号号楼幢栋单元室]', '#', addr)
        return addr.lower()

    def _merge_group(
        self, group_key: str, group_rows: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not group_rows:
            return {}

        sorted_rows = sorted(
            group_rows,
            key=lambda r: DataReader.parse_datetime(
                str(r.get('complaint_time', ''))
            ) or datetime.max
        )

        first = sorted_rows[0]
        last = sorted_rows[-1]

        merged_complaint_ids = [
            str(r.get('complaint_id', '')) for r in sorted_rows
            if r.get('complaint_id')
        ]
        merged_contents = [
            str(r.get('complaint_content', '')) for r in sorted_rows
            if r.get('complaint_content')
        ]
        merged_complainants = list(set([
            str(r.get('complainant', '')) for r in sorted_rows
            if r.get('complainant')
        ]))
        merged_phones = list(set([
            str(r.get('phone', '')) for r in sorted_rows
            if r.get('phone')
        ]))
        merged_sources = list(set([
            str(r.get('source', '')) for r in sorted_rows
            if r.get('source')
        ]))
        noise_types = list(set([
            str(r.get('noise_type', '')) for r in sorted_rows
            if r.get('noise_type')
        ]))

        trace_ids = [str(r.get('_trace_id', '')) for r in sorted_rows]

        result = {
            'merge_id': f"MERGE{group_key}_{len(group_rows)}",
            'complaint_count': len(group_rows),
            'merged_complaint_ids': "; ".join(merged_complaint_ids),
            'first_complaint_time': first.get('complaint_time', ''),
            'last_complaint_time': last.get('complaint_time', ''),
            'complainant': "; ".join(merged_complainants),
            'phone': "; ".join(merged_phones),
            'address': first.get('address', ''),
            'complaint_content': "\n---\n".join(merged_contents),
            'noise_type': "; ".join(noise_types),
            'source': "; ".join(merged_sources),
            'trace_ids': "; ".join(trace_ids),
            'batch_no': self.config.batch_no,
            'source_system': self.config.source_system,
            '_original_rows': group_rows,
        }

        return result

    def _assess_risk(
        self, merged: Dict[str, Any]
    ) -> Tuple[RiskLevel, int, List[str]]:
        score = 0
        reasons = []
        mp = self.config.merge

        complaint_count = merged.get('complaint_count', 1)
        if complaint_count >= 5:
            score += 5
            reasons.append(f"投诉频次高({complaint_count}次)")
        elif complaint_count >= 3:
            score += 3
            reasons.append(f"投诉频次较高({complaint_count}次)")
        elif complaint_count >= 2:
            score += 1
            reasons.append(f"重复投诉({complaint_count}次)")

        content = str(merged.get('complaint_content', ''))

        for keyword in mp.high_risk_keywords:
            if keyword in content:
                score += 3
                reasons.append(f"含高风险关键词: {keyword}")

        for keyword in mp.medium_risk_keywords:
            if keyword in content:
                score += 1
                reasons.append(f"含中风险关键词: {keyword}")

        first_time = DataReader.parse_datetime(
            str(merged.get('first_complaint_time', ''))
        )
        last_time = DataReader.parse_datetime(
            str(merged.get('last_complaint_time', ''))
        )

        if first_time and last_time:
            duration_hours = (last_time - first_time).total_seconds() / 3600
            if duration_hours > 168:
                score += 2
                reasons.append(f"持续时间长({int(duration_hours/24)}天)")
            elif duration_hours > 72:
                score += 1
                reasons.append(f"持续时间较长({int(duration_hours/24)}天)")

        noise_types = str(merged.get('noise_type', ''))
        if '装修噪声' in noise_types or '施工噪声' in noise_types:
            if complaint_count >= 2:
                score += 1
                reasons.append("装修/施工类重复投诉")

        if complaint_count == 1 and not reasons:
            return RiskLevel.UNDETERMINED, 0, ["信息不足，无法判定风险等级"]

        if score <= mp.risk_score_low_max:
            risk_level = RiskLevel.LOW
        elif score <= mp.risk_score_medium_max:
            risk_level = RiskLevel.MEDIUM
        else:
            risk_level = RiskLevel.HIGH

        return risk_level, score, reasons
