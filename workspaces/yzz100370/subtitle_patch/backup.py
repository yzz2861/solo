"""
文件备份与安全机制
File backup and safety mechanisms: backup before write, protection flags
"""

import os
import shutil
import hashlib
import datetime
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass, field


@dataclass
class BackupRecord:
    """备份记录"""
    original_path: str
    backup_path: str
    checksum: str
    timestamp: str
    size_bytes: int
    encoding: str = "utf-8"


@dataclass
class BatchBackup:
    """批量备份会话"""
    session_id: str
    backup_dir: str
    records: List[BackupRecord] = field(default_factory=list)
    created_at: str = ""

    def as_dict(self) -> Dict:
        return {
            "session_id": self.session_id,
            "backup_dir": self.backup_dir,
            "created_at": self.created_at,
            "record_count": len(self.records),
            "records": [r.__dict__ for r in self.records],
        }


class BackupManager:
    """文件备份管理器"""

    def __init__(self, base_backup_dir: Optional[str] = None):
        if base_backup_dir is None:
            base_backup_dir = os.path.join(os.getcwd(), "_subtitle_backups")
        self.base_backup_dir = os.path.abspath(base_backup_dir)
        self.current_session: Optional[BatchBackup] = None

    def _ensure_dir(self, path: str) -> None:
        os.makedirs(path, exist_ok=True)

    def _file_checksum(self, filepath: str) -> str:
        """计算文件 SHA256 校验和"""
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    def start_session(self, tag: str = "") -> BatchBackup:
        """开始一个新的备份会话"""
        session_ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        tag_part = f"_{tag}" if tag else ""
        session_id = f"patch_{session_ts}{tag_part}"

        session_dir = os.path.join(self.base_backup_dir, session_id)
        self._ensure_dir(session_dir)

        self.current_session = BatchBackup(
            session_id=session_id,
            backup_dir=session_dir,
            created_at=datetime.datetime.now().isoformat(timespec="seconds"),
        )
        return self.current_session

    def backup_file(
        self,
        filepath: str,
        encoding: str = "utf-8",
        subfolder: str = "",
    ) -> BackupRecord:
        """
        备份单个文件
        不会覆盖原文件，备份文件会带上时间戳和原始路径映射
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"源文件不存在 / Source not found: {filepath}")

        if self.current_session is None:
            self.start_session()

        abs_path = os.path.abspath(filepath)
        checksum = self._file_checksum(filepath)
        file_size = os.path.getsize(filepath)

        safe_basename = os.path.basename(filepath)
        if subfolder:
            dest_dir = os.path.join(self.current_session.backup_dir, subfolder)
            self._ensure_dir(dest_dir)
        else:
            dest_dir = self.current_session.backup_dir

        dest_path = os.path.join(dest_dir, safe_basename)

        counter = 1
        base, ext = os.path.splitext(dest_path)
        while os.path.exists(dest_path):
            existing_hash = self._file_checksum(dest_path)
            if existing_hash == checksum:
                record = BackupRecord(
                    original_path=abs_path,
                    backup_path=dest_path,
                    checksum=checksum,
                    timestamp=datetime.datetime.now().isoformat(timespec="seconds"),
                    size_bytes=file_size,
                    encoding=encoding,
                )
                self.current_session.records.append(record)
                return record
            dest_path = f"{base}_{counter}{ext}"
            counter += 1

        shutil.copy2(filepath, dest_path)

        record = BackupRecord(
            original_path=abs_path,
            backup_path=dest_path,
            checksum=checksum,
            timestamp=datetime.datetime.now().isoformat(timespec="seconds"),
            size_bytes=file_size,
            encoding=encoding,
        )
        self.current_session.records.append(record)
        return record

    def write_manifest(self) -> str:
        """写入备份清单文件（便于恢复时查找）"""
        if self.current_session is None:
            raise RuntimeError("没有活动的备份会话 / No active backup session")

        manifest_path = os.path.join(self.current_session.backup_dir, "BACKUP_MANIFEST.txt")

        lines = []
        lines.append("=" * 72)
        lines.append("  字幕修补备份清单 / Subtitle Patch Backup Manifest")
        lines.append("=" * 72)
        lines.append(f"  会话 ID   : {self.current_session.session_id}")
        lines.append(f"  创建时间   : {self.current_session.created_at}")
        lines.append(f"  备份目录   : {self.current_session.backup_dir}")
        lines.append(f"  备份文件数 : {len(self.current_session.records)}")
        lines.append("")
        lines.append("  恢复命令示例 / Restore example:")
        lines.append(f"    cp <备份文件> <原路径>")
        lines.append("")
        lines.append("-" * 72)
        lines.append("")

        for i, rec in enumerate(self.current_session.records, 1):
            lines.append(f"[{i}] 原始文件 / Original:")
            lines.append(f"      路径: {rec.original_path}")
            lines.append(f"      大小: {rec.size_bytes} bytes | 编码: {rec.encoding}")
            lines.append(f"      SHA256: {rec.checksum}")
            lines.append(f"    备份文件 / Backup:")
            lines.append(f"      路径: {rec.backup_path}")
            lines.append(f"      时间: {rec.timestamp}")
            lines.append("")

        lines.append("=" * 72)
        lines.append("  注：请不要删除本目录下的文件，直到确认修补结果正确")
        lines.append("  Note: Keep this directory until patches are verified correct.")
        lines.append("=" * 72)

        with open(manifest_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return manifest_path

    def get_backup_for(self, original_path: str) -> Optional[BackupRecord]:
        """查找某个原文件的最近备份记录"""
        if self.current_session is None:
            return None
        abs_path = os.path.abspath(original_path)
        for rec in reversed(self.current_session.records):
            if rec.original_path == abs_path:
                return rec
        return None

    def list_sessions(self) -> List[Tuple[str, str, int]]:
        """列出所有备份会话"""
        sessions = []
        if not os.path.isdir(self.base_backup_dir):
            return sessions
        for entry in sorted(os.listdir(self.base_backup_dir), reverse=True):
            full = os.path.join(self.base_backup_dir, entry)
            if os.path.isdir(full) and entry.startswith("patch_"):
                count = len([f for f in os.listdir(full) if f != "BACKUP_MANIFEST.txt"])
                sessions.append((entry, full, count))
        return sessions
