from dataclasses import dataclass, field
from typing import Dict, Any, Optional
import uuid
import hashlib
import json
from datetime import datetime


@dataclass
class SourceIdentifier:
    source_file: str = ""
    source_system: str = ""
    load_time: str = ""
    source_hash: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            'source_file': self.source_file,
            'source_system': self.source_system,
            'load_time': self.load_time,
            'source_hash': self.source_hash,
        }

    @classmethod
    def from_file(cls, file_path: str, source_system: str = "") -> 'SourceIdentifier':
        import os
        file_stat = os.stat(file_path)
        file_size = file_stat.st_size
        file_mtime = file_stat.st_mtime
        hash_input = f"{file_path}:{file_size}:{file_mtime}"
        source_hash = hashlib.md5(hash_input.encode('utf-8')).hexdigest()[:12]
        return cls(
            source_file=file_path,
            source_system=source_system,
            load_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            source_hash=source_hash,
        )


@dataclass
class BatchInfo:
    batch_id: str = ""
    batch_time: str = ""
    params_hash: str = ""
    ledger_hash: str = ""
    filter_hash: str = ""
    source: SourceIdentifier = field(default_factory=SourceIdentifier)
    task_status: str = "pending"
    operator: str = ""

    def __post_init__(self):
        if not self.batch_id:
            self.batch_id = self._generate_batch_id()
        if not self.batch_time:
            self.batch_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    def _generate_batch_id(self) -> str:
        ts = datetime.now().strftime('%Y%m%d%H%M%S')
        rand = uuid.uuid4().hex[:8]
        return f"BATCH{ts}{rand.upper()}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            'batch_id': self.batch_id,
            'batch_time': self.batch_time,
            'params_hash': self.params_hash,
            'ledger_hash': self.ledger_hash,
            'filter_hash': self.filter_hash,
            'source': self.source.to_dict(),
            'task_status': self.task_status,
            'operator': self.operator,
        }

    def compute_inputs_hash(self, ledger_data: str, params_data: str, filter_data: str = "") -> str:
        combined = f"ledger:{ledger_data}|params:{params_data}|filters:{filter_data}"
        return hashlib.sha256(combined.encode('utf-8')).hexdigest()

    @classmethod
    def create(cls, source: SourceIdentifier, params: Any, ledger: Any,
               filters: Optional[Dict[str, Any]] = None,
               operator: str = "") -> 'BatchInfo':
        params_dict = params.to_dict() if hasattr(params, 'to_dict') else {}
        params_str = json.dumps(params_dict, sort_keys=True, ensure_ascii=False)
        params_hash = hashlib.md5(params_str.encode('utf-8')).hexdigest()[:12]

        records_data = [r.compute_signature() for r in ledger.records]
        ledger_str = "|".join(sorted(records_data))
        ledger_hash = hashlib.md5(ledger_str.encode('utf-8')).hexdigest()[:12]

        filter_dict = filters or {}
        filter_str = json.dumps(filter_dict, sort_keys=True, ensure_ascii=False)
        filter_hash = hashlib.md5(filter_str.encode('utf-8')).hexdigest()[:12]

        batch = cls(
            source=source,
            params_hash=params_hash,
            ledger_hash=ledger_hash,
            filter_hash=filter_hash,
            task_status="pending",
            operator=operator,
        )
        return batch

    def get_idempotency_key(self) -> str:
        return f"{self.ledger_hash}_{self.params_hash}_{self.filter_hash}"
