import os
import json
import glob
from typing import List, Optional, Dict, Any, Tuple

from ..models.result import ProcessResult
from ..models.ledger import BusinessLedger, LedgerRecord
from ..models.params import ParamsConfig
from ..engine.generator import GenerationEngine


class DataReplayer:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def list_results(self) -> List[Dict[str, Any]]:
        patterns = [
            os.path.join(self.output_dir, 'result_*.json'),
            os.path.join(self.output_dir, '处理结果_*.json'),
        ]
        files = []
        for pattern in patterns:
            files.extend(glob.glob(pattern))
        files = sorted(list(set(files)), reverse=True)

        results = []
        for f in files:
            try:
                with open(f, 'r', encoding='utf-8') as fp:
                    data = json.load(fp)
                batch = data.get('batch', {})
                summary = data.get('summary_stats', {})
                results.append({
                    'file': f,
                    'batch_id': batch.get('batch_id', ''),
                    'batch_time': batch.get('batch_time', ''),
                    'task_status': batch.get('task_status', ''),
                    'total_records': data.get('total_records', 0),
                    'valid_records': data.get('valid_records', 0),
                    'total_materials': data.get('total_materials', 0),
                    'review_issues': len(data.get('review_items', [])),
                    'source_file': batch.get('source', {}).get('source_file', ''),
                    'idempotency_key': data.get('idempotency_key', ''),
                })
            except (json.JSONDecodeError, IOError):
                continue

        return results

    def load_result(self, batch_id: str) -> Optional[ProcessResult]:
        file_path = os.path.join(self.output_dir, f'result_{batch_id}.json')
        if not os.path.exists(file_path):
            alt_files = glob.glob(os.path.join(self.output_dir, f'*{batch_id}*.json'))
            if alt_files:
                file_path = alt_files[0]
            else:
                return None

        return GenerationEngine.load_result(file_path)

    def find_result_by_key(self, idempotency_key: str) -> Optional[ProcessResult]:
        results = self.list_results()
        for r in results:
            if r.get('idempotency_key') == idempotency_key:
                return self.load_result(r['batch_id'])
        return None

    def get_previous_result(self, current_key: str) -> Optional[ProcessResult]:
        results = self.list_results()
        for r in results:
            if r.get('idempotency_key') == current_key:
                continue
            if r.get('task_status') == 'completed':
                return self.load_result(r['batch_id'])
        return None

    def replay_record(self, result: ProcessResult, record_id: str) -> Dict[str, Any]:
        record = result.record_map.get(record_id)
        materials = result.get_materials_by_record(record_id)
        reviews = result.get_review_by_record(record_id)

        replay_info = {
            'record': record.to_dict() if record else None,
            'materials': [m.to_dict() for m in materials],
            'review_items': [r.to_dict() for r in reviews],
            'batch_id': result.batch.batch_id,
            'source_file': result.batch.source.source_file,
            'source_hash': result.batch.source.source_hash,
        }

        return replay_info

    def trace_record_origin(self, result: ProcessResult, record_id: str) -> Dict[str, Any]:
        record = result.record_map.get(record_id)
        if not record:
            return {'found': False, 'record_id': record_id}

        return {
            'found': True,
            'record_id': record_id,
            'customer_name': record.customer_name,
            'source_system': record.source_system,
            'source_file': result.batch.source.source_file,
            'source_hash': result.batch.source.source_hash,
            'load_time': result.batch.source.load_time,
            'batch_id': result.batch.batch_id,
            'batch_time': result.batch.batch_time,
            'idempotency_key': result.idempotency_key,
            'record_signature': record.compute_signature(),
        }

    def compare_batches(self, batch_id1: str, batch_id2: str
                        ) -> Optional[Dict[str, Any]]:
        result1 = self.load_result(batch_id1)
        result2 = self.load_result(batch_id2)

        if not result1 or not result2:
            return None

        from ..engine.generator import GenerationEngine
        engine = GenerationEngine(
            params=ParamsConfig(),
            output_dir=self.output_dir
        )
        diff = engine.compare_results(result1, result2)
        diff['batch1_id'] = batch_id1
        diff['batch2_id'] = batch_id2

        return diff

    def get_processing_chain(self, batch_id: str) -> List[Dict[str, Any]]:
        chain = []
        current = self.load_result(batch_id)
        if not current:
            return chain

        current_key = current.idempotency_key
        all_results = self.list_results()

        for r in all_results:
            if r['idempotency_key'] == current_key:
                chain.append(r)

        chain.sort(key=lambda x: x['batch_time'])
        return chain

    def verify_idempotency(self, batch_id: str) -> Dict[str, Any]:
        current = self.load_result(batch_id)
        if not current:
            return {'verified': False, 'reason': 'batch not found'}

        chain = self.get_processing_chain(batch_id)
        same_key_batches = [
            b for b in chain
            if b['idempotency_key'] == current.idempotency_key
        ]

        result = {
            'verified': True,
            'batch_id': batch_id,
            'idempotency_key': current.idempotency_key,
            'same_input_batches': len(same_key_batches),
            'batches': same_key_batches,
            'is_consistent': True,
            'differences': [],
        }

        if len(same_key_batches) >= 2:
            first = self.load_result(same_key_batches[0]['batch_id'])
            last = self.load_result(same_key_batches[-1]['batch_id'])
            if first and last:
                if len(first.material_items) != len(last.material_items):
                    result['is_consistent'] = False
                    result['differences'].append(
                        f'材料数量不一致: {len(first.material_items)} vs {len(last.material_items)}'
                    )
                if len(first.review_items) != len(last.review_items):
                    result['is_consistent'] = False
                    result['differences'].append(
                        f'问题数量不一致: {len(first.review_items)} vs {len(last.review_items)}'
                    )

        return result
