import json
import os
import hashlib
from datetime import datetime
from typing import Dict, Optional, List
from .scanner import ScanResult
from .risk import RiskLevel, classify_risk


def _fingerprint(result: ScanResult) -> str:
    payload = (
        f"{result.domain.key}|"
        f"{result.dns_resolved}|"
        f"{result.connectable}|"
        f"{result.cert_verified}|"
        f"{result.cert_chain_complete}|"
        f"{result.days_until_expiry}|"
        f"{result.error}"
    )
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


class AlertDedup:
    def __init__(self, state_path: str = "scan_state.json"):
        self.state_path = state_path
        self._state: Dict = {}
        self._load()

    def _load(self):
        if os.path.exists(self.state_path):
            try:
                with open(self.state_path, "r", encoding="utf-8") as f:
                    self._state = json.load(f)
            except (json.JSONDecodeError, OSError):
                self._state = {}

    def _save(self):
        with open(self.state_path, "w", encoding="utf-8") as f:
            json.dump(self._state, f, indent=2, ensure_ascii=False)

    def is_new_or_changed(self, result: ScanResult) -> tuple:
        key = result.domain.key
        fp = _fingerprint(result)
        risk = classify_risk(result)

        now = datetime.now().isoformat()

        prev = self._state.get(key)
        is_new = prev is None
        is_changed = False
        prev_risk = None

        if prev is not None:
            prev_risk = RiskLevel(prev.get("risk_level", "OK"))
            if prev.get("fingerprint") != fp:
                is_changed = True
        else:
            is_changed = True

        self._state[key] = {
            "fingerprint": fp,
            "risk_level": risk.value,
            "host": result.domain.host,
            "port": result.domain.port,
            "environment": result.domain.environment,
            "owner": result.domain.owner,
            "is_orphan": result.domain.is_orphan,
            "days_until_expiry": result.days_until_expiry,
            "dns_resolved": result.dns_resolved,
            "connectable": result.connectable,
            "cert_verified": result.cert_verified,
            "cert_chain_complete": result.cert_chain_complete,
            "error": result.error,
            "last_seen": now,
        }

        self._save()

        return is_new, is_changed, prev_risk

    def get_all_states(self) -> Dict:
        return dict(self._state)

    def get_active_keys(self) -> List[str]:
        return list(self._state.keys())

    def purge_missing(self, current_keys: set):
        stale = [k for k in self._state if k not in current_keys]
        for k in stale:
            del self._state[k]
        if stale:
            self._save()
