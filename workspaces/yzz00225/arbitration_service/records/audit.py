"""审计管理器

生成审计编号、记录审计信息。
"""
import uuid
import hashlib
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, field


@dataclass
class AuditRecord:
    """审计记录"""
    audit_no: str
    batch_no: str
    action: str
    operator: Optional[str]
    timestamp: datetime
    before_status: str
    after_status: str
    risk_level: str
    missing_items: List[str] = field(default_factory=list)
    data_hash: str = ""
    remark: str = ""


class AuditManager:
    """审计管理器

    生成唯一审计编号，记录每次操作的审计信息。
    """

    AUDIT_NO_PREFIX = "AR"

    def __init__(self):
        self._audit_records: List[AuditRecord] = []
        self._audit_index: Dict[str, AuditRecord] = {}
        self._batch_audit_map: Dict[str, List[str]] = {}

    def generate_audit_no(self, batch_no: str, action: str) -> str:
        """生成审计编号

        格式: AR + 日期(8位) + 批次号哈希(4位) + 序号(4位) + UUID片段
        确保全局唯一且可追溯。
        """
        today = datetime.now().strftime("%Y%m%d")

        batch_hash = hashlib.md5(batch_no.encode()).hexdigest()[:4].upper()

        seq = len(self._audit_records) + 1
        seq_str = f"{seq:04d}"

        uuid_fragment = uuid.uuid4().hex[:4].upper()

        audit_no = f"{self.AUDIT_NO_PREFIX}{today}{batch_hash}{seq_str}{uuid_fragment}"
        return audit_no

    def create_audit_record(
        self,
        batch_no: str,
        action: str,
        before_status: str,
        after_status: str,
        risk_level: str,
        operator: Optional[str] = None,
        missing_items: Optional[List[str]] = None,
        data_content: Optional[str] = None,
        remark: str = "",
    ) -> AuditRecord:
        """创建审计记录

        Args:
            batch_no: 批次号
            action: 处理动作
            before_status: 处理前状态
            after_status: 处理后状态
            risk_level: 风险等级
            operator: 操作人
            missing_items: 缺失材料
            data_content: 数据内容(用于生成哈希)
            remark: 备注

        Returns:
            AuditRecord: 审计记录
        """
        audit_no = self.generate_audit_no(batch_no, action)

        data_hash = self._compute_data_hash(data_content or batch_no + action)

        record = AuditRecord(
            audit_no=audit_no,
            batch_no=batch_no,
            action=action,
            operator=operator,
            timestamp=datetime.now(),
            before_status=before_status,
            after_status=after_status,
            risk_level=risk_level,
            missing_items=missing_items or [],
            data_hash=data_hash,
            remark=remark,
        )

        self._audit_records.append(record)
        self._audit_index[audit_no] = record

        if batch_no not in self._batch_audit_map:
            self._batch_audit_map[batch_no] = []
        self._batch_audit_map[batch_no].append(audit_no)

        return record

    def get_audit_record(self, audit_no: str) -> Optional[AuditRecord]:
        """根据审计编号查询记录"""
        return self._audit_index.get(audit_no)

    def get_batch_audit_records(self, batch_no: str) -> List[AuditRecord]:
        """获取批次的所有审计记录"""
        audit_nos = self._batch_audit_map.get(batch_no, [])
        return [self._audit_index[no] for no in audit_nos if no in self._audit_index]

    def get_all_records(self) -> List[AuditRecord]:
        """获取所有审计记录"""
        return list(self._audit_records)

    def _compute_data_hash(self, content: str) -> str:
        """计算数据哈希"""
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def verify_audit_chain(self, batch_no: str) -> bool:
        """验证审计链完整性

        检查批次的所有审计记录是否形成完整链路。
        """
        records = self.get_batch_audit_records(batch_no)
        if not records:
            return True

        sorted_records = sorted(records, key=lambda r: r.timestamp)

        for i in range(1, len(sorted_records)):
            prev = sorted_records[i - 1]
            curr = sorted_records[i]
            if prev.after_status != curr.before_status:
                return False

        return True
