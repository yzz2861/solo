"""记录层：审计记录与数据回放

负责生成审计编号、记录操作历史、支持数据回放。
"""
from .audit import AuditManager, AuditRecord
from .playback import PlaybackManager, PlaybackResult

__all__ = [
    "AuditManager",
    "AuditRecord",
    "PlaybackManager",
    "PlaybackResult",
]
