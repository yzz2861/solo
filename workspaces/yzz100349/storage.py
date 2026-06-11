import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import hashlib

from config import SNAPSHOT_DIR, DATA_DIR, IMAGE_FORMAT


class StorageManager:
    def __init__(self, base_dir: Path = DATA_DIR, snapshot_dir: Path = SNAPSHOT_DIR):
        self.base_dir = base_dir
        self.snapshot_dir = snapshot_dir
        self.latest_file = self.base_dir / "latest_results.json"
        self.history_dir = self.base_dir / "history"
        self.history_dir.mkdir(parents=True, exist_ok=True)

    def _generate_run_id(self) -> str:
        now = datetime.now()
        return now.strftime("%Y%m%d_%H%M%S")

    def _get_date_dir(self, date_str: str = None) -> Path:
        if date_str is None:
            date_str = datetime.now().strftime("%Y%m%d")
        date_dir = self.snapshot_dir / date_str
        date_dir.mkdir(parents=True, exist_ok=True)
        return date_dir

    def _get_screenshot_path(
        self, url_id: str, run_id: str, page_title: str = ""
    ) -> Tuple[Path, str]:
        date_str = run_id.split('_')[0]
        date_dir = self._get_date_dir(date_str)

        title_hash = hashlib.md5(page_title.encode('utf-8')).hexdigest()[:8] if page_title else ""
        filename_parts = [url_id, run_id]
        if title_hash:
            filename_parts.append(title_hash)

        base_filename = "_".join(filename_parts)
        relative_path = f"{date_str}/{base_filename}.{IMAGE_FORMAT}"
        full_path = date_dir / f"{base_filename}.{IMAGE_FORMAT}"

        return full_path, relative_path

    def _get_data_path(self, run_id: str) -> Path:
        date_str = run_id.split('_')[0]
        date_dir = self._get_date_dir(date_str)
        return date_dir / f"data_{run_id}.json"

    def _sanitize_for_json(self, obj):
        if isinstance(obj, bytes):
            return None
        if isinstance(obj, dict):
            return {k: self._sanitize_for_json(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self._sanitize_for_json(item) for item in obj]
        return obj

    def save_screenshot(
        self,
        screenshot_bytes: bytes,
        url_id: str,
        run_id: str,
        page_title: str = "",
    ) -> Tuple[str, str]:
        full_path, relative_path = self._get_screenshot_path(url_id, run_id, page_title)

        with open(full_path, 'wb') as f:
            f.write(screenshot_bytes)

        return str(full_path), relative_path

    def save_run_results(
        self,
        results: List[Dict],
        run_id: str,
        url_manager,
    ) -> Dict:
        processed_results = []
        screenshot_paths = {}

        for result in results:
            url_id = result.get("url_id")
            processed = dict(result)

            if result.get("success") and result.get("screenshot"):
                page_title = ""
                if result.get("data"):
                    page_title = result["data"].get("page_title", "")
                    safe_title = url_manager.sanitize_filename(page_title)

                full_path, rel_path = self.save_screenshot(
                    result["screenshot"],
                    url_id,
                    run_id,
                    safe_title,
                )
                screenshot_paths[url_id] = {
                    "full_path": full_path,
                    "relative_path": rel_path,
                }
                processed["screenshot_path"] = full_path
                processed["screenshot_relative"] = rel_path

            del processed["screenshot"]
            processed_results.append(processed)

        run_data = {
            "run_id": run_id,
            "timestamp": datetime.now().isoformat(),
            "results": self._sanitize_for_json(processed_results),
            "screenshot_paths": screenshot_paths,
        }

        data_path = self._get_data_path(run_id)
        with open(data_path, 'w', encoding='utf-8') as f:
            json.dump(run_data, f, ensure_ascii=False, indent=2)

        history_path = self.history_dir / f"run_{run_id}.json"
        with open(history_path, 'w', encoding='utf-8') as f:
            json.dump(run_data, f, ensure_ascii=False, indent=2)

        self._update_latest(run_data)

        return {
            "run_id": run_id,
            "data_path": str(data_path),
            "history_path": str(history_path),
            "results_count": len(processed_results),
            "screenshot_count": len(screenshot_paths),
        }

    def _update_latest(self, run_data: Dict) -> None:
        latest_data = {
            "last_run_id": run_data["run_id"],
            "last_run_time": run_data["timestamp"],
            "results": {},
        }

        for result in run_data["results"]:
            url_id = result.get("url_id")
            if url_id:
                latest_data["results"][url_id] = result

        temp_file = self.latest_file.with_suffix('.tmp')
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(latest_data, f, ensure_ascii=False, indent=2)
        temp_file.replace(self.latest_file)

    def load_latest_results(self) -> Dict[str, Dict]:
        if not self.latest_file.exists():
            return {}

        try:
            with open(self.latest_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data.get("results", {})
        except (json.JSONDecodeError, IOError):
            return {}

    def load_run_results(self, run_id: str) -> Optional[Dict]:
        history_path = self.history_dir / f"run_{run_id}.json"
        if history_path.exists():
            try:
                with open(history_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass

        date_str = run_id.split('_')[0]
        data_path = self._get_date_dir(date_str) / f"data_{run_id}.json"
        if data_path.exists():
            try:
                with open(data_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass

        return None

    def list_runs(self, date_str: str = None, limit: int = 50) -> List[Dict]:
        runs = []

        if date_str:
            date_dir = self._get_date_dir(date_str)
            for file_path in sorted(date_dir.glob("data_*.json")):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    runs.append({
                        "run_id": data.get("run_id"),
                        "timestamp": data.get("timestamp"),
                        "results_count": len(data.get("results", [])),
                        "path": str(file_path),
                    })
                except Exception:
                    pass
        else:
            for file_path in sorted(self.history_dir.glob("run_*.json"), reverse=True):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    runs.append({
                        "run_id": data.get("run_id"),
                        "timestamp": data.get("timestamp"),
                        "results_count": len(data.get("results", [])),
                        "path": str(file_path),
                    })
                    if len(runs) >= limit:
                        break
                except Exception:
                    pass

        return runs

    def find_previous_run(self, current_run_id: str) -> Optional[str]:
        all_runs = self.list_runs()
        sorted_runs = sorted(all_runs, key=lambda x: x["run_id"], reverse=True)

        for run in sorted_runs:
            if run["run_id"] < current_run_id:
                return run["run_id"]

        return None

    def get_screenshot_relative_path(
        self, url_id: str, run_id: str
    ) -> Optional[str]:
        date_str = run_id.split('_')[0]
        date_dir = self._get_date_dir(date_str)

        for file_path in date_dir.glob(f"{url_id}_{run_id}*.{IMAGE_FORMAT}"):
            return f"{date_str}/{file_path.name}"

        return None

    def save_diff_results(
        self,
        diffs: List[Dict],
        run_id: str,
    ) -> str:
        date_str = run_id.split('_')[0]
        date_dir = self._get_date_dir(date_str)

        serializable_diffs = []
        for diff in diffs:
            serializable = {
                "url_id": diff.get("url_id"),
                "has_changes": diff.get("has_changes"),
                "summary": diff.get("summary"),
                "changes": [],
            }

            for change in diff.get("changes", []):
                if hasattr(change, "__dict__"):
                    serializable["changes"].append({
                        "type": change.type.value if hasattr(change.type, 'value') else str(change.type),
                        "description": change.description,
                        "old_value": change.old_value,
                        "new_value": change.new_value,
                        "severity": change.severity,
                        "details": change.details,
                    })
                else:
                    serializable["changes"].append(change)

            if "new_result" in diff:
                serializable["new_result"] = {
                    "url_id": diff["new_result"].get("url_id"),
                    "normalized_url": diff["new_result"].get("normalized_url"),
                    "success": diff["new_result"].get("success"),
                    "error": diff["new_result"].get("error"),
                    "load_time_ms": diff["new_result"].get("load_time_ms"),
                    "retry_count": diff["new_result"].get("retry_count"),
                    "screenshot_relative": diff["new_result"].get("screenshot_relative"),
                }

            if "old_result" in diff and diff["old_result"]:
                serializable["old_result"] = {
                    "url_id": diff["old_result"].get("url_id"),
                    "normalized_url": diff["old_result"].get("normalized_url"),
                    "success": diff["old_result"].get("success"),
                    "screenshot_relative": diff["old_result"].get("screenshot_relative"),
                }

            serializable_diffs.append(serializable)

        diff_data = {
            "run_id": run_id,
            "timestamp": datetime.now().isoformat(),
            "diffs": serializable_diffs,
        }

        diff_path = date_dir / f"diff_{run_id}.json"
        with open(diff_path, 'w', encoding='utf-8') as f:
            json.dump(diff_data, f, ensure_ascii=False, indent=2)

        return str(diff_path)

    def cleanup_old_runs(self, keep_days: int = 30) -> int:
        import time
        cutoff = time.time() - (keep_days * 24 * 60 * 60)
        deleted_count = 0

        for date_dir in self.snapshot_dir.iterdir():
            if not date_dir.is_dir():
                continue

            try:
                dir_time = date_dir.stat().st_mtime
                if dir_time < cutoff:
                    shutil.rmtree(date_dir)
                    deleted_count += 1
            except Exception:
                pass

        for history_file in self.history_dir.glob("run_*.json"):
            try:
                file_time = history_file.stat().st_mtime
                if file_time < cutoff:
                    history_file.unlink()
                    deleted_count += 1
            except Exception:
                pass

        return deleted_count
