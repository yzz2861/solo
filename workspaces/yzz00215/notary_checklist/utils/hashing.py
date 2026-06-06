import hashlib
import json
import os
from typing import Any, Dict, List


def compute_data_hash(data: Any, algorithm: str = 'sha256') -> str:
    if isinstance(data, (dict, list)):
        data_str = json.dumps(data, sort_keys=True, ensure_ascii=False)
    else:
        data_str = str(data)
    h = hashlib.new(algorithm)
    h.update(data_str.encode('utf-8'))
    return h.hexdigest()


def compute_file_hash(file_path: str, algorithm: str = 'md5') -> str:
    h = hashlib.new(algorithm)
    with open(file_path, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def compute_record_list_hash(records: List[Any]) -> str:
    signatures = []
    for r in records:
        if hasattr(r, 'compute_signature'):
            signatures.append(r.compute_signature())
        else:
            signatures.append(compute_data_hash(r))
    signatures.sort()
    combined = "|".join(signatures)
    return hashlib.md5(combined.encode('utf-8')).hexdigest()[:16]


def compute_idempotency_key(ledger_hash: str, params_hash: str,
                            filter_hash: str = "") -> str:
    combined = f"{ledger_hash}|{params_hash}|{filter_hash}"
    return hashlib.sha256(combined.encode('utf-8')).hexdigest()[:32]
