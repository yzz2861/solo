from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .models import ConfirmationState, ConfirmationEntry, ScanResult
from .config import DEFAULT_CONFIG


class Confirmer:
    def __init__(self, client_dir: Path, metadata_dir_name: str = ".studio-check"):
        self.client_dir = client_dir.resolve()
        self.meta_dir = self.client_dir / metadata_dir_name
        self.state_path = self.meta_dir / "confirmations.json"

    def load_state(self) -> ConfirmationState:
        if not self.state_path.exists():
            return ConfirmationState()
        try:
            data = json.loads(self.state_path.read_text(encoding="utf-8"))
            entries = {}
            for pid, edata in data.get("entries", {}).items():
                entries[pid] = ConfirmationEntry(
                    photo_id=edata["photo_id"],
                    confirmed_version=edata.get("confirmed_version"),
                    confirmed_path=edata["confirmed_path"],
                    confirmed_at=edata["confirmed_at"],
                )
            return ConfirmationState(
                locked=data.get("locked", False),
                locked_at=data.get("locked_at"),
                entries=entries,
            )
        except (json.JSONDecodeError, KeyError):
            return ConfirmationState()

    def save_state(self, state: ConfirmationState) -> None:
        self.meta_dir.mkdir(exist_ok=True)
        self.state_path.write_text(
            json.dumps(state.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def confirm(
        self,
        photo_ids: list[str],
        result: ScanResult,
        version: Optional[int] = None,
    ) -> ConfirmationState:
        state = self.load_state()
        if state.locked:
            raise RuntimeError("交付包已锁定，无法修改确认状态。如需修改请先解锁。")

        retouched_by_id = {}
        for p in result.retouched:
            if p.photo_id not in retouched_by_id:
                retouched_by_id[p.photo_id] = []
            retouched_by_id[p.photo_id].append(p)

        now = datetime.now(timezone.utc).isoformat()

        for pid in photo_ids:
            items = retouched_by_id.get(pid, [])
            if not items:
                continue

            target = None
            if version is not None:
                for it in items:
                    if it.version == version:
                        target = it
                        break
            if target is None:
                if len(items) == 1:
                    target = items[0]
                else:
                    versioned = [it for it in items if it.version is not None]
                    if versioned:
                        target = max(versioned, key=lambda it: it.version or 0)
                    else:
                        target = items[0]

            state.entries[pid] = ConfirmationEntry(
                photo_id=pid,
                confirmed_version=target.version,
                confirmed_path=str(target.path),
                confirmed_at=now,
            )

        self.save_state(state)
        return state

    def unconfirm(self, photo_ids: list[str]) -> ConfirmationState:
        state = self.load_state()
        if state.locked:
            raise RuntimeError("交付包已锁定，无法修改确认状态。如需修改请先解锁。")
        for pid in photo_ids:
            state.entries.pop(pid, None)
        self.save_state(state)
        return state

    def lock(self) -> ConfirmationState:
        state = self.load_state()
        if state.locked:
            return state
        state.locked = True
        state.locked_at = datetime.now(timezone.utc).isoformat()
        self.save_state(state)
        return state

    def unlock(self) -> ConfirmationState:
        state = self.load_state()
        state.locked = False
        state.locked_at = None
        self.save_state(state)
        return state
