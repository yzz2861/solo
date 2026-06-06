"""数据回放管理器

支持对历史处理记录进行回放，重现当时的处理结果，
用于审计追踪和问题排查。
"""
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime

from ..objects.models import ReceiptRecord, DetailItem, RiskTag
from ..objects.enums import (
    TaskStatus,
    ProcessAction,
    SourceChannel,
    BusinessConclusion,
)


@dataclass
class PlaybackResult:
    """回放结果"""
    batch_no: str
    record_count: int
    records: List[ReceiptRecord]
    status_path: List[TaskStatus]
    is_complete: bool
    final_status: Optional[TaskStatus] = None
    timeline: List[str] = field(default_factory=list)


class PlaybackManager:
    """数据回放管理器

    记录每次处理的完整快照，支持历史回放。
    """

    def __init__(self):
        self._records: List[ReceiptRecord] = []
        self._batch_records: Dict[str, List[ReceiptRecord]] = {}
        self._record_index: Dict[str, ReceiptRecord] = {}

    def record_snapshot(
        self,
        batch_no: str,
        source_channel: SourceChannel,
        process_action: ProcessAction,
        previous_status: TaskStatus,
        current_status: TaskStatus,
        items: List[DetailItem],
        risk_tags: List[RiskTag],
        business_conclusion: BusinessConclusion,
        audit_no: str,
        review_opinion: Optional[str] = None,
        operator: Optional[str] = None,
        remark: Optional[str] = None,
    ) -> ReceiptRecord:
        """记录处理快照

        保存每次处理的完整数据快照，用于后续回放。
        """
        import uuid

        record = ReceiptRecord(
            record_id=str(uuid.uuid4()),
            batch_no=batch_no,
            source_channel=source_channel,
            process_action=process_action,
            previous_status=previous_status,
            current_status=current_status,
            items=[item.model_copy() for item in items],
            risk_tags=[tag.model_copy() for tag in risk_tags],
            business_conclusion=business_conclusion,
            review_opinion=review_opinion,
            operator=operator,
            audit_no=audit_no,
            timestamp=datetime.now(),
            remark=remark,
        )

        self._records.append(record)
        self._record_index[record.record_id] = record

        if batch_no not in self._batch_records:
            self._batch_records[batch_no] = []
        self._batch_records[batch_no].append(record)

        return record

    def playback(self, batch_no: str) -> PlaybackResult:
        """回放批次处理历史

        Args:
            batch_no: 批次号

        Returns:
            PlaybackResult: 回放结果
        """
        records = self._batch_records.get(batch_no, [])

        sorted_records = sorted(records, key=lambda r: r.timestamp)

        status_path = []
        timeline = []

        for record in sorted_records:
            if not status_path:
                status_path.append(record.previous_status)
            status_path.append(record.current_status)

            timeline.append(
                f"[{record.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] "
                f"{record.previous_status.value} -> {record.current_status.value} "
                f"(动作: {record.process_action.value})"
            )

        final_status = sorted_records[-1].current_status if sorted_records else None
        is_complete = final_status in [TaskStatus.CLOSED, TaskStatus.REJECTED] if final_status else False

        return PlaybackResult(
            batch_no=batch_no,
            record_count=len(sorted_records),
            records=sorted_records,
            status_path=status_path,
            is_complete=is_complete,
            final_status=final_status,
            timeline=timeline,
        )

    def get_record(self, record_id: str) -> Optional[ReceiptRecord]:
        """根据记录ID获取快照"""
        return self._record_index.get(record_id)

    def get_batch_records(self, batch_no: str) -> List[ReceiptRecord]:
        """获取批次的所有记录"""
        return self._batch_records.get(batch_no, [])

    def get_all_batches(self) -> List[str]:
        """获取所有批次号"""
        return list(self._batch_records.keys())

    def get_record_by_audit_no(self, audit_no: str) -> Optional[ReceiptRecord]:
        """根据审计编号查找记录"""
        for record in self._records:
            if record.audit_no == audit_no:
                return record
        return None

    def compare_records(
        self,
        record_id1: str,
        record_id2: str,
    ) -> Dict[str, Dict]:
        """比较两条记录的差异

        用于审计追踪，查看两次处理之间的变化。
        """
        r1 = self._record_index.get(record_id1)
        r2 = self._record_index.get(record_id2)

        if not r1 or not r2:
            return {}

        diff = {}

        if r1.current_status != r2.current_status:
            diff["status"] = {
                "from": r1.current_status.value,
                "to": r2.current_status.value,
            }

        if r1.business_conclusion != r2.business_conclusion:
            diff["conclusion"] = {
                "from": r1.business_conclusion.value,
                "to": r2.business_conclusion.value,
            }

        items1 = {item.item_id: item.item_value for item in r1.items}
        items2 = {item.item_id: item.item_value for item in r2.items}

        item_diff = {}
        all_item_ids = set(items1.keys()) | set(items2.keys())
        for item_id in all_item_ids:
            v1 = items1.get(item_id)
            v2 = items2.get(item_id)
            if v1 != v2:
                item_diff[item_id] = {"from": v1, "to": v2}

        if item_diff:
            diff["items"] = item_diff

        risk_tags1 = {tag.tag_id: tag.risk_level.value for tag in r1.risk_tags}
        risk_tags2 = {tag.tag_id: tag.risk_level.value for tag in r2.risk_tags}

        risk_diff = {}
        all_tag_ids = set(risk_tags1.keys()) | set(risk_tags2.keys())
        for tag_id in all_tag_ids:
            v1 = risk_tags1.get(tag_id)
            v2 = risk_tags2.get(tag_id)
            if v1 != v2:
                risk_diff[tag_id] = {"from": v1, "to": v2}

        if risk_diff:
            diff["risk_tags"] = risk_diff

        return diff
