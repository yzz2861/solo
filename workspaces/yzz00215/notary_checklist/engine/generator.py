from typing import List, Dict, Any, Optional, Tuple
import os
import json
import hashlib

from ..models.ledger import BusinessLedger, LedgerRecord
from ..models.params import ParamsConfig
from ..models.batch import BatchInfo, SourceIdentifier
from ..models.result import ProcessResult, MaterialItem, ReviewItem
from ..utils.hashing import compute_idempotency_key
from .validator import ValidationEngine


class GenerationEngine:
    def __init__(self, params: ParamsConfig, output_dir: str = "./output"):
        self.params = params
        self.output_dir = output_dir
        self.validator = ValidationEngine(params)
        self._ensure_output_dir()

    def _ensure_output_dir(self):
        os.makedirs(self.output_dir, exist_ok=True)

    def generate(self, ledger: BusinessLedger, source: SourceIdentifier,
                 filters: Optional[Dict[str, Any]] = None,
                 operator: str = "",
                 previous_result: Optional[ProcessResult] = None,
                 ) -> ProcessResult:
        batch = BatchInfo.create(source, self.params, ledger, filters, operator)
        idempotency_key = batch.get_idempotency_key()

        is_replay = False
        if previous_result and previous_result.idempotency_key == idempotency_key:
            is_replay = True
            result = previous_result
            result.batch = batch
            result.is_idempotent_replay = True
            return result

        filtered_ledger = self._apply_filters(ledger, filters)
        review_items, val_stats = self.validator.validate(filtered_ledger)
        material_items = self._generate_materials(filtered_ledger, review_items)

        total_records = len(filtered_ledger)
        valid_count = val_stats['valid_records']
        invalid_count = val_stats['invalid_records']
        total_materials = len(material_items)

        record_map = {r.record_id: r for r in filtered_ledger.records}

        batch.task_status = "completed"

        result = ProcessResult(
            batch=batch,
            total_records=total_records,
            valid_records=valid_count,
            invalid_records=invalid_count,
            total_materials=total_materials,
            material_items=material_items,
            review_items=review_items,
            record_map=record_map,
            idempotency_key=idempotency_key,
            is_idempotent_replay=is_replay,
        )

        result.get_summary()

        return result

    def _apply_filters(self, ledger: BusinessLedger,
                       filters: Optional[Dict[str, Any]]) -> BusinessLedger:
        if not filters:
            return ledger

        param_filters = {f.field_name: f.value for f in self.params.filters}
        combined = {**param_filters, **filters}
        combined = {k: v for k, v in combined.items() if v is not None and v != ''}

        if not combined:
            return ledger

        return ledger.filter_by(combined)

    def _generate_materials(self, ledger: BusinessLedger,
                            review_items: List[ReviewItem]) -> List[MaterialItem]:
        materials: List[MaterialItem] = []
        error_record_ids = set(
            item.record_id for item in review_items if item.severity == 'error'
        )

        for record in ledger.records:
            if record.record_id in error_record_ids:
                continue

            matched_rules = self.params.get_matching_rules(record)
            if not matched_rules:
                continue

            top_rule = matched_rules[0]
            for mat_name in top_rule.materials:
                mat_item = MaterialItem(
                    record_id=record.record_id,
                    material_name=mat_name,
                    rule_id=top_rule.rule_id,
                    rule_name=top_rule.rule_name,
                    required=True,
                    status='pending',
                    notes='',
                )
                materials.append(mat_item)

        return materials

    def save_result(self, result: ProcessResult, file_path: Optional[str] = None) -> str:
        if not file_path:
            batch_id = result.batch.batch_id
            file_path = os.path.join(self.output_dir, f'result_{batch_id}.json')

        data = self._result_to_serializable(result)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return file_path

    def _result_to_serializable(self, result: ProcessResult) -> Dict[str, Any]:
        data = result.to_dict()
        data['record_data'] = {
            rid: rec.to_dict() for rid, rec in result.record_map.items()
        }
        return data

    @classmethod
    def load_result(cls, file_path: str) -> ProcessResult:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        batch_data = data.get('batch', {})
        source_data = batch_data.get('source', {})

        from ..models.batch import BatchInfo, SourceIdentifier
        source = SourceIdentifier(
            source_file=source_data.get('source_file', ''),
            source_system=source_data.get('source_system', ''),
            load_time=source_data.get('load_time', ''),
            source_hash=source_data.get('source_hash', ''),
        )

        batch = BatchInfo(
            batch_id=batch_data.get('batch_id', ''),
            batch_time=batch_data.get('batch_time', ''),
            params_hash=batch_data.get('params_hash', ''),
            ledger_hash=batch_data.get('ledger_hash', ''),
            filter_hash=batch_data.get('filter_hash', ''),
            source=source,
            task_status=batch_data.get('task_status', 'pending'),
            operator=batch_data.get('operator', ''),
        )

        material_items = [
            MaterialItem(**m) for m in data.get('material_items', [])
        ]
        review_items = [
            ReviewItem(**r) for r in data.get('review_items', [])
        ]

        record_map = {}
        record_data = data.get('record_data', {})
        for rid, rdata in record_data.items():
            extra = {}
            base_fields = {f.name for f in LedgerRecord.__dataclass_fields__.values()}
            base_data = {}
            for k, v in rdata.items():
                if k in base_fields or k in ['record_id', 'customer_name', 'id_card',
                                              'business_type', 'notary_type', 'amount',
                                              'status', 'apply_date', 'source_system']:
                    base_data[k] = v
                else:
                    extra[k] = v
            base_data['extra_fields'] = extra
            record_map[rid] = LedgerRecord(**base_data)

        result = ProcessResult(
            batch=batch,
            total_records=data.get('total_records', 0),
            valid_records=data.get('valid_records', 0),
            invalid_records=data.get('invalid_records', 0),
            total_materials=data.get('total_materials', 0),
            material_items=material_items,
            review_items=review_items,
            record_map=record_map,
            summary_stats=data.get('summary_stats', {}),
            idempotency_key=data.get('idempotency_key', ''),
            is_idempotent_replay=data.get('is_idempotent_replay', False),
        )

        return result

    def compare_results(self, result1: ProcessResult,
                        result2: ProcessResult) -> Dict[str, Any]:
        diff = {
            'same_inputs': result1.idempotency_key == result2.idempotency_key,
            'total_materials_diff': result2.total_materials - result1.total_materials,
            'total_records_diff': result2.total_records - result1.total_records,
            'review_items_diff': len(result2.review_items) - len(result1.review_items),
            'added_materials': [],
            'removed_materials': [],
            'added_issues': [],
            'removed_issues': [],
        }

        def mat_key(m):
            return f"{m.record_id}|{m.material_name}|{m.rule_id}"

        set1 = {mat_key(m) for m in result1.material_items}
        set2 = {mat_key(m) for m in result2.material_items}

        for m in result2.material_items:
            if mat_key(m) not in set1:
                diff['added_materials'].append(m.to_dict())

        for m in result1.material_items:
            if mat_key(m) not in set2:
                diff['removed_materials'].append(m.to_dict())

        def rev_key(r):
            return f"{r.record_id}|{r.issue_type}|{r.field_name}"

        rset1 = {rev_key(r) for r in result1.review_items}
        rset2 = {rev_key(r) for r in result2.review_items}

        for r in result2.review_items:
            if rev_key(r) not in rset1:
                diff['added_issues'].append(r.to_dict())

        for r in result1.review_items:
            if rev_key(r) not in rset2:
                diff['removed_issues'].append(r.to_dict())

        return diff
