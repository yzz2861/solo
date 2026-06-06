from typing import List, Dict, Any, Tuple, Set
from collections import defaultdict

from .config import AppConfig
from .logger import OperationLogger
from .reader import DataReader


class DiffComparator:
    def __init__(self, config: AppConfig, logger: OperationLogger):
        self.config = config
        self.logger = logger

    def compare(
        self, current_results: List[Dict[str, Any]], last_results: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], int, int, int]:
        if not last_results:
            self.logger.info("无上次结果数据，跳过差异对比")
            diff_results = []
            for r in current_results:
                diff_row = dict(r)
                diff_row['_diff_type'] = 'new'
                diff_row['_diff_type_label'] = '新增'
                diff_row['_changed_fields'] = ''
                diff_results.append(diff_row)
            return diff_results, len(current_results), 0, 0

        self.logger.info(
            f"开始差异对比：当前 {len(current_results)} 条，上次 {len(last_results)} 条"
        )

        last_by_merge_id = {r.get('merge_id', ''): r for r in last_results}
        last_id_index = self._build_single_id_index(last_results)
        last_addr_index = self._build_address_index(last_results)

        matched_last_merge_ids: Set[str] = set()
        diff_results = []
        added_count = 0
        removed_count = 0
        updated_count = 0
        unchanged_count = 0

        for current in current_results:
            matched_last = None
            match_strategy = None

            current_merge_id = current.get('merge_id', '')
            if current_merge_id and current_merge_id in last_by_merge_id:
                matched_last = last_by_merge_id[current_merge_id]
                match_strategy = 'merge_id'

            if not matched_last:
                matched_last = self._match_by_complaint_ids(current, last_id_index)
                if matched_last:
                    match_strategy = 'complaint_id'

            if not matched_last:
                matched_last = self._match_by_address(current, last_addr_index)
                if matched_last:
                    match_strategy = 'address'

            if matched_last is None:
                diff_row = dict(current)
                diff_row['_diff_type'] = 'new'
                diff_row['_diff_type_label'] = '新增'
                diff_row['_changed_fields'] = ''
                diff_row['_last_merge_id'] = ''
                diff_row['_match_strategy'] = ''
                diff_results.append(diff_row)
                added_count += 1
            else:
                last_merge_id = matched_last.get('merge_id', '')
                if last_merge_id in matched_last_merge_ids:
                    diff_row = dict(current)
                    diff_row['_diff_type'] = 'new'
                    diff_row['_diff_type_label'] = '新增'
                    diff_row['_changed_fields'] = ''
                    diff_row['_last_merge_id'] = last_merge_id
                    diff_row['_match_strategy'] = match_strategy or ''
                    diff_row['_match_note'] = '匹配到已匹配过的上次结果，按新增处理'
                    diff_results.append(diff_row)
                    added_count += 1
                else:
                    matched_last_merge_ids.add(last_merge_id)
                    changed_fields = self._find_changes(current, matched_last)
                    if changed_fields:
                        diff_row = dict(current)
                        diff_row['_diff_type'] = 'updated'
                        diff_row['_diff_type_label'] = '更新'
                        diff_row['_changed_fields'] = "; ".join(changed_fields)
                        diff_row['_last_merge_id'] = last_merge_id
                        diff_row['_match_strategy'] = match_strategy or ''
                        diff_results.append(diff_row)
                        updated_count += 1
                    else:
                        diff_row = dict(current)
                        diff_row['_diff_type'] = 'unchanged'
                        diff_row['_diff_type_label'] = '未变'
                        diff_row['_changed_fields'] = ''
                        diff_row['_last_merge_id'] = last_merge_id
                        diff_row['_match_strategy'] = match_strategy or ''
                        diff_results.append(diff_row)
                        unchanged_count += 1

        for last_merge_id, last in last_by_merge_id.items():
            if last_merge_id not in matched_last_merge_ids:
                diff_row = dict(last)
                diff_row['_diff_type'] = 'removed'
                diff_row['_diff_type_label'] = '移除'
                diff_row['_changed_fields'] = ''
                diff_row['_last_merge_id'] = last_merge_id
                diff_results.append(diff_row)
                removed_count += 1

        self.logger.info(
            f"差异对比完成：新增 {added_count} 条，更新 {updated_count} 条，"
            f"移除 {removed_count} 条，未变 {unchanged_count} 条"
        )

        return diff_results, added_count, removed_count, updated_count

    def _build_single_id_index(
        self, last_results: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        index = {}
        for row in last_results:
            merged_ids = str(row.get('merged_complaint_ids', '')).strip()
            if merged_ids:
                for cid in merged_ids.split(';'):
                    cid = cid.strip()
                    if cid:
                        if cid not in index:
                            index[cid] = row
            single_id = str(row.get('complaint_id', '')).strip()
            if single_id and single_id not in index:
                index[single_id] = row
        return index

    def _build_address_index(
        self, last_results: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        index = defaultdict(list)
        for row in last_results:
            address = str(row.get('address', '')).strip()
            if address:
                index[address].append(row)
        return index

    def _match_by_complaint_ids(
        self, current: Dict[str, Any], last_id_index: Dict[str, Dict[str, Any]]
    ):
        current_ids = []
        merged = str(current.get('merged_complaint_ids', '')).strip()
        if merged:
            current_ids = [cid.strip() for cid in merged.split(';') if cid.strip()]
        single = str(current.get('complaint_id', '')).strip()
        if single:
            current_ids.append(single)

        for cid in current_ids:
            if cid in last_id_index:
                return last_id_index[cid]
        return None

    def _match_by_address(
        self, current: Dict[str, Any], last_addr_index: Dict[str, List[Dict[str, Any]]]
    ):
        address = str(current.get('address', '')).strip()
        if not address:
            return None

        candidates = last_addr_index.get(address, [])
        if not candidates:
            return None

        phone = str(current.get('phone', '')).strip()
        complainant = str(current.get('complainant', '')).strip()

        for cand in candidates:
            cand_phones = str(cand.get('phone', '')).split(';')
            cand_phones = [p.strip() for p in cand_phones if p.strip()]
            if phone and phone in cand_phones:
                return cand

        for cand in candidates:
            cand_names = str(cand.get('complainant', '')).split(';')
            cand_names = [n.strip() for n in cand_names if n.strip()]
            if complainant and complainant in cand_names:
                return cand

        return candidates[0]

    def _find_changes(
        self, current: Dict[str, Any], last: Dict[str, Any]
    ) -> List[str]:
        changed_fields = []

        compare_fields = [
            'complaint_count',
            'complaint_content',
            'noise_type',
            'risk_level',
            'risk_score',
            'first_complaint_time',
            'last_complaint_time',
            'source',
        ]

        for field in compare_fields:
            curr_val = str(current.get(field, '')).strip()
            last_val = str(last.get(field, '')).strip()
            if curr_val != last_val:
                changed_fields.append(field)

        return changed_fields

    def detect_duplicates_in_batch(
        self, rows: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        self.logger.info("检测批次内重复投诉")

        id_map = defaultdict(list)
        for row in rows:
            cid = str(row.get('complaint_id', '')).strip()
            if cid:
                id_map[cid].append(row)

        duplicates = []
        for cid, rows_list in id_map.items():
            if len(rows_list) > 1:
                for dup_row in rows_list:
                    dup_info = dict(dup_row)
                    dup_info['_duplicate_type'] = 'same_complaint_id'
                    dup_info['_duplicate_count'] = len(rows_list)
                    duplicates.append(dup_info)

        if duplicates:
            self.logger.warning(
                f"检测到 {len(duplicates)} 条重复投诉（按投诉编号），"
                f"涉及 {len([k for k, v in id_map.items() if len(v) > 1])} 个编号"
            )

        return duplicates
