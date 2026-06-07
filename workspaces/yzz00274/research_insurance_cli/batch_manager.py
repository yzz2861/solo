"""批次管理与历史轨迹"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

from .config import BATCH_FILE
from .models import ProcessResult
from .utils import save_json_file, load_json_file


class BatchManager:
    def __init__(self, data_dir: str = "."):
        self.data_dir = data_dir
        self.history_file = os.path.join(data_dir, BATCH_FILE)
        self._history: List[Dict[str, Any]] = self._load_history()

    def _load_history(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.history_file):
            try:
                return load_json_file(self.history_file)
            except Exception:
                return []
        return []

    def _save_history(self) -> None:
        save_json_file(self.history_file, self._history)

    def record_batch(self, result: ProcessResult, output_files: Dict[str, str]) -> None:
        batch_info = {
            "batch_id": result.batch_id,
            "processed_at": result.processed_at.strftime("%Y-%m-%d %H:%M:%S"),
            "source_files": result.source_files,
            "total_count": result.total_count,
            "normal_count": result.normal_count,
            "abnormal_count": result.abnormal_count,
            "pending_count": result.pending_count,
            "output_files": output_files,
            "reviewed": False,
            "review_notes": "",
            "reviewed_at": None,
        }
        self._history.append(batch_info)
        self._save_history()

    def list_batches(self, limit: int = 10) -> List[Dict[str, Any]]:
        return list(reversed(self._history[-limit:]))

    def get_batch(self, batch_id: str) -> Optional[Dict[str, Any]]:
        for batch in self._history:
            if batch["batch_id"] == batch_id:
                return batch
        return None

    def review_batch(
        self,
        batch_id: str,
        notes: str = "",
        status: Optional[str] = None,
    ) -> bool:
        for batch in self._history:
            if batch["batch_id"] == batch_id:
                batch["reviewed"] = True
                batch["review_notes"] = notes
                batch["reviewed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                if status:
                    batch["review_status"] = status
                self._save_history()
                return True
        return False

    def get_statistics(self) -> Dict[str, Any]:
        total_batches = len(self._history)
        total_records = sum(b["total_count"] for b in self._history)
        total_normal = sum(b["normal_count"] for b in self._history)
        total_abnormal = sum(b["abnormal_count"] for b in self._history)
        total_pending = sum(b["pending_count"] for b in self._history)
        reviewed_count = sum(1 for b in self._history if b.get("reviewed"))

        return {
            "总批次数": total_batches,
            "总记录数": total_records,
            "正常记录总数": total_normal,
            "异常记录总数": total_abnormal,
            "待复核记录总数": total_pending,
            "已验收批次数": reviewed_count,
            "待验收批次数": total_batches - reviewed_count,
        }
