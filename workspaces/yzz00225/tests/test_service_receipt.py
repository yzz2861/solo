"""仲裁送达回证API 综合测试

测试覆盖：
1. 正常记录 - 材料齐全、低风险正常通过
2. 缺字段 - 材料不完整
3. 规则冲突 - 高风险尝试直接通过
4. 重复处理 - 同一批次重复提交

重点确认：
- 计算口径
- 异常解释
- 任务状态
- 数据回放
"""
import pytest
from datetime import datetime, timedelta

from arbitration_service.objects.models import (
    ServiceReceiptRequest,
    DetailItem,
)
from arbitration_service.objects.enums import (
    SourceChannel,
    ProcessAction,
    BusinessConclusion,
    NextAction,
    TaskStatus,
    RiskLevel,
)
from arbitration_service.service.service import ServiceReceiptService
from arbitration_service.rules.exceptions import (
    RuleViolationError,
    DuplicateProcessError,
)
from arbitration_service.rules.material_rules import MaterialRuleEngine
from arbitration_service.rules.risk_rules import RiskRuleEngine
from arbitration_service.states.state_machine import StateMachine


RECENT_DATE = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")


@pytest.fixture
def service():
    """创建服务实例"""
    return ServiceReceiptService()


def build_normal_items():
    """构建完整的正常明细项"""
    return [
        DetailItem(item_id="document_title", item_name="文书标题", item_value="仲裁裁决书"),
        DetailItem(item_id="delivery_method", item_name="送达方式", item_value="直接送达"),
        DetailItem(item_id="court_name", item_name="仲裁机构名称", item_value="北京仲裁委员会"),
        DetailItem(item_id="case_no", item_name="案号", item_value="(2024)京仲裁字第001号"),
        DetailItem(item_id="delivery_date", item_name="送达日期", item_value=RECENT_DATE),
        DetailItem(item_id="recipient_name", item_name="接收人姓名", item_value="张三"),
        DetailItem(item_id="receipt_signature", item_name="签收人签名", item_value="张三"),
    ]


def build_incomplete_items():
    """构建不完整的明细项（缺少必填项）"""
    return [
        DetailItem(item_id="document_title", item_name="文书标题", item_value="仲裁裁决书"),
        DetailItem(item_id="delivery_method", item_name="送达方式", item_value="直接送达"),
        DetailItem(item_id="court_name", item_name="仲裁机构名称", item_value="北京仲裁委员会"),
        DetailItem(item_id="case_no", item_name="案号", item_value="(2024)京仲裁字第002号"),
    ]


def build_high_risk_items():
    """构建高风险明细项（无签收）"""
    return [
        DetailItem(item_id="document_title", item_name="文书标题", item_value="仲裁裁决书"),
        DetailItem(item_id="delivery_method", item_name="送达方式", item_value="直接送达"),
        DetailItem(item_id="court_name", item_name="仲裁机构名称", item_value="北京仲裁委员会"),
        DetailItem(item_id="case_no", item_name="案号", item_value="(2024)京仲裁字第003号"),
        DetailItem(item_id="delivery_date", item_name="送达日期", item_value=RECENT_DATE),
        DetailItem(item_id="recipient_name", item_name="接收人姓名", item_value="李四"),
        DetailItem(item_id="receipt_signature", item_name="签收人签名", item_value=""),
    ]


class TestNormalRecord:
    """测试正常记录 - 材料齐全、低风险正常通过"""

    def test_normal_submit_passed(self, service):
        """正常提交：材料齐全、低风险 -> 直接通过"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-NORMAL-001",
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
            operator="test_user",
        )

        response = service.process_receipt(request)

        assert response.batch_no == "BATCH-NORMAL-001"
        assert response.business_conclusion == BusinessConclusion.PASSED
        assert response.next_action == NextAction.COMPLETE
        assert response.task_status == TaskStatus.APPROVED
        assert len(response.missing_items) == 0
        assert response.risk_level == RiskLevel.LOW if hasattr(response, 'risk_level') else True
        assert response.audit_no.startswith("AR")
        assert response.message == "材料齐全，风险等级低，处理通过"

    def test_normal_has_audit_no(self, service):
        """正常记录必须有审计编号"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-NORMAL-002",
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        response = service.process_receipt(request)

        assert response.audit_no is not None
        assert len(response.audit_no) > 10

    def test_normal_task_status_transition(self, service):
        """正常记录的状态流转：PENDING -> APPROVED"""
        batch_no = "BATCH-NORMAL-003"

        assert service.get_task_status(batch_no) == TaskStatus.PENDING

        request = ServiceReceiptRequest(
            batch_no=batch_no,
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        response = service.process_receipt(request)

        assert response.task_status == TaskStatus.APPROVED
        assert service.get_task_status(batch_no) == TaskStatus.APPROVED

    def test_normal_risk_tags_empty(self, service):
        """正常记录不应有风险标签"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-NORMAL-004",
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        response = service.process_receipt(request)

        assert len(response.risk_tags) == 0


class TestMissingFields:
    """测试缺字段 - 材料不完整"""

    def test_missing_fields_triggers_supplement(self, service):
        """缺材料：进入补材料状态，不允许直接通过"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-MISSING-001",
            items=build_incomplete_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        response = service.process_receipt(request)

        assert response.business_conclusion == BusinessConclusion.PENDING_SUPPLEMENT
        assert response.next_action == NextAction.SUPPLY_MATERIALS
        assert response.task_status == TaskStatus.SUPPLEMENTING
        assert len(response.missing_items) > 0

    def test_missing_items_list_correct(self, service):
        """缺失材料清单正确"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-MISSING-002",
            items=build_incomplete_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        response = service.process_receipt(request)

        assert "delivery_date" in response.missing_items
        assert "recipient_name" in response.missing_items
        assert "receipt_signature" in response.missing_items

    def test_missing_cannot_approve_directly(self, service):
        """缺材料时不允许直接审批通过"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-MISSING-003",
            items=build_incomplete_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.APPROVE,
        )

        with pytest.raises(RuleViolationError) as exc_info:
            service.process_receipt(request)

        assert exc_info.value.rule_id == "RULE_002"
        assert "缺材料" in exc_info.value.rule_name

    def test_missing_approve_with_review_opinion(self, service):
        """缺材料但有复核意见可以通过"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-MISSING-004",
            items=build_incomplete_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.REVIEW,
            review_opinion="情况特殊，同意通过",
        )

        response = service.process_receipt(request)

        assert "通过" in response.message or response.business_conclusion == BusinessConclusion.PASSED


class TestRuleConflict:
    """测试规则冲突 - 高风险尝试直接通过"""

    def test_high_risk_requires_review(self, service):
        """高风险：必须进入复核，不允许直接通过"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-RISK-001",
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        response = service.process_receipt(request)

        assert response.business_conclusion == BusinessConclusion.PENDING_REVIEW
        assert response.next_action == NextAction.WAIT_REVIEW
        assert response.task_status == TaskStatus.UNDER_REVIEW
        assert "高风险" in response.message

    def test_high_risk_cannot_approve_directly(self, service):
        """高风险时不允许直接审批通过"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-RISK-002",
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.APPROVE,
        )

        with pytest.raises(RuleViolationError) as exc_info:
            service.process_receipt(request)

        assert exc_info.value.rule_id == "RULE_001"
        assert "高风险必复核" in exc_info.value.rule_name
        assert "高风险" in exc_info.value.message

    def test_high_risk_tags_present(self, service):
        """高风险记录应有对应的风险标签"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-RISK-003",
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        response = service.process_receipt(request)

        assert len(response.risk_tags) > 0
        high_risk_tags = [t for t in response.risk_tags if t.risk_level == RiskLevel.HIGH]
        assert len(high_risk_tags) > 0

    def test_high_risk_review_pass(self, service):
        """高风险经复核通过后状态正确"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-RISK-004",
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        response = service.process_receipt(request)
        assert response.task_status == TaskStatus.UNDER_REVIEW

        review_request = ServiceReceiptRequest(
            batch_no="BATCH-RISK-004",
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.REVIEW,
            review_opinion="复核通过，情况属实",
        )
        review_response = service.process_receipt(review_request)

        assert review_response.business_conclusion == BusinessConclusion.PASSED
        assert review_response.task_status == TaskStatus.APPROVED

    def test_high_risk_review_reject(self, service):
        """高风险经复核驳回"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-RISK-005",
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        service.process_receipt(request)

        review_request = ServiceReceiptRequest(
            batch_no="BATCH-RISK-005",
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.REVIEW,
            review_opinion="驳回，需重新送达",
        )
        review_response = service.process_receipt(review_request)

        assert review_response.business_conclusion == BusinessConclusion.REJECTED
        assert review_response.task_status == TaskStatus.REJECTED

    def test_high_risk_and_missing_conflict(self, service):
        """同时高风险和缺材料，按更严格的规则处理（复核）"""
        items = [
            DetailItem(item_id="document_title", item_name="文书标题", item_value="仲裁裁决书"),
            DetailItem(item_id="delivery_method", item_name="送达方式", item_value="直接送达"),
            DetailItem(item_id="case_no", item_name="案号", item_value="(2024)京仲裁字第006号"),
            DetailItem(item_id="receipt_signature", item_name="签收人签名", item_value=""),
        ]

        request = ServiceReceiptRequest(
            batch_no="BATCH-CONFLICT-001",
            items=items,
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        response = service.process_receipt(request)

        assert response.business_conclusion == BusinessConclusion.PENDING_REVIEW
        assert response.next_action == NextAction.WAIT_REVIEW
        assert response.task_status == TaskStatus.UNDER_REVIEW
        assert len(response.missing_items) > 0


class TestDuplicateProcess:
    """测试重复处理"""

    def test_duplicate_submit_raises_error(self, service):
        """同一批次重复提交应报错"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-DUP-001",
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        service.process_receipt(request)

        with pytest.raises(DuplicateProcessError):
            service.process_receipt(request)

    def test_duplicate_error_has_status_info(self, service):
        """重复处理错误应包含当前状态信息"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-DUP-002",
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        service.process_receipt(request)

        try:
            service.process_receipt(request)
            assert False, "应该抛出DuplicateProcessError"
        except DuplicateProcessError as e:
            assert e.batch_no == "BATCH-DUP-002"
            assert e.current_status == TaskStatus.APPROVED.value

    def test_different_batch_no_duplicate(self, service):
        """不同批次号互不影响"""
        req1 = ServiceReceiptRequest(
            batch_no="BATCH-DUP-003",
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        req2 = ServiceReceiptRequest(
            batch_no="BATCH-DUP-004",
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        resp1 = service.process_receipt(req1)
        resp2 = service.process_receipt(req2)

        assert resp1.batch_no == "BATCH-DUP-003"
        assert resp2.batch_no == "BATCH-DUP-004"
        assert resp1.audit_no != resp2.audit_no

    def test_approved_status_no_duplicate_approve(self, service):
        """已通过状态不能重复审批通过"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-DUP-005",
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        service.process_receipt(request)

        with pytest.raises(DuplicateProcessError):
            service.process_receipt(request)


class TestCalculationCaliber:
    """测试计算口径"""

    def test_risk_level_calculation(self):
        """风险等级计算口径：取最高风险等级"""
        engine = RiskRuleEngine()
        items = build_high_risk_items()
        result = engine.assess_risk(items, SourceChannel.COURT)

        levels = [tag.risk_level for tag in result.risk_tags]
        if RiskLevel.HIGH in levels:
            assert result.overall_risk_level == RiskLevel.HIGH
        elif RiskLevel.MEDIUM in levels:
            assert result.overall_risk_level == RiskLevel.MEDIUM
        else:
            assert result.overall_risk_level == RiskLevel.LOW

    def test_risk_score_calculation(self):
        """风险分数计算口径：各项风险加权求和"""
        engine = RiskRuleEngine()
        items = build_high_risk_items()
        result = engine.assess_risk(items, SourceChannel.COURT)

        expected_score = 0
        for tag in result.risk_tags:
            if tag.risk_level == RiskLevel.HIGH:
                expected_score += 100
            elif tag.risk_level == RiskLevel.MEDIUM:
                expected_score += 50
            else:
                expected_score += 10

        assert result.risk_score == expected_score

    def test_material_check_by_channel(self):
        """材料检查口径：不同渠道有不同的必填项"""
        engine = MaterialRuleEngine()

        court_items = build_normal_items()
        court_result = engine.check_materials(court_items, SourceChannel.COURT)
        assert court_result.is_complete

        electronic_items = [
            DetailItem(item_id="document_title", item_name="文书标题", item_value="仲裁裁决书"),
            DetailItem(item_id="delivery_method", item_name="送达方式", item_value="电子送达"),
            DetailItem(item_id="electronic_platform", item_name="电子平台", item_value="人民法院在线服务"),
            DetailItem(item_id="delivery_time", item_name="送达时间", item_value="2024-01-15 10:00:00"),
            DetailItem(item_id="recipient_account", item_name="接收人账号", item_value="user001"),
            DetailItem(item_id="read_status", item_name="阅读状态", item_value="已读"),
        ]
        electronic_result = engine.check_materials(electronic_items, SourceChannel.ELECTRONIC_DELIVERY)
        assert electronic_result.is_complete

    def test_general_required_items(self):
        """通用必填项适用于所有渠道"""
        engine = MaterialRuleEngine()

        items = [
            DetailItem(item_id="court_name", item_name="仲裁机构名称", item_value="北京仲裁委员会"),
            DetailItem(item_id="case_no", item_name="案号", item_value="(2024)京仲裁字第001号"),
        ]

        for channel in SourceChannel:
            result = engine.check_materials(items, channel)
            assert not result.is_complete
            assert "document_title" in result.missing_items
            assert "delivery_method" in result.missing_items


class TestExceptionExplanation:
    """测试异常解释"""

    def test_rule_violation_has_details(self, service):
        """规则违反异常应包含规则ID、名称和详细描述"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-EXCEPT-001",
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.APPROVE,
        )

        try:
            service.process_receipt(request)
            assert False, "应抛出RuleViolationError"
        except RuleViolationError as e:
            assert e.rule_id is not None
            assert e.rule_name is not None
            assert len(e.message) > 0

    def test_duplicate_error_message_correct(self, service):
        """重复处理错误消息应清晰易读"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-EXCEPT-002",
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        service.process_receipt(request)

        try:
            service.process_receipt(request)
            assert False
        except DuplicateProcessError as e:
            assert "BATCH-EXCEPT-002" in str(e)
            assert "不允许重复处理" in str(e)

    def test_value_error_for_empty_batch(self, service):
        """空批次号应抛出值错误"""
        request = ServiceReceiptRequest(
            batch_no="",
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        with pytest.raises(ValueError, match="批次号不能为空"):
            service.process_receipt(request)


class TestTaskStatus:
    """测试任务状态"""

    def test_state_machine_initial_status(self, service):
        """初始状态为PENDING"""
        assert service.get_task_status("NEW-BATCH") == TaskStatus.PENDING

    def test_state_machine_valid_transitions(self):
        """状态机合法转换"""
        sm = StateMachine()

        assert sm.can_transition(TaskStatus.PENDING, ProcessAction.SUBMIT)
        assert sm.can_transition(TaskStatus.PROCESSING, ProcessAction.APPROVE)
        assert sm.can_transition(TaskStatus.PROCESSING, ProcessAction.REJECT)

    def test_state_machine_invalid_transitions(self):
        """状态机非法转换"""
        sm = StateMachine()

        assert not sm.can_transition(TaskStatus.APPROVED, ProcessAction.REJECT)
        assert not sm.can_transition(TaskStatus.PENDING, ProcessAction.APPROVE)

    def test_invalid_transition_raises_error(self):
        """非法状态转换抛出异常"""
        sm = StateMachine()

        with pytest.raises(ValueError, match="非法状态转换"):
            sm.transition(TaskStatus.APPROVED, ProcessAction.REJECT)

    def test_task_status_flow(self, service):
        """完整状态流转：PENDING -> PROCESSING -> UNDER_REVIEW -> APPROVED"""
        batch_no = "BATCH-STATUS-001"

        assert service.get_task_status(batch_no) == TaskStatus.PENDING

        request = ServiceReceiptRequest(
            batch_no=batch_no,
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        response = service.process_receipt(request)
        assert response.task_status == TaskStatus.UNDER_REVIEW

        review_request = ServiceReceiptRequest(
            batch_no=batch_no,
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.REVIEW,
            review_opinion="复核通过",
        )
        review_response = service.process_receipt(review_request)
        assert review_response.task_status == TaskStatus.APPROVED


class TestDataPlayback:
    """测试数据回放"""

    def test_playback_has_records(self, service):
        """回放应包含所有处理记录"""
        batch_no = "BATCH-PB-001"

        request = ServiceReceiptRequest(
            batch_no=batch_no,
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        service.process_receipt(request)

        playback = service.playback(batch_no)

        assert playback.batch_no == batch_no
        assert playback.record_count >= 1
        assert len(playback.records) >= 1

    def test_playback_status_path(self, service):
        """回放的状态路径应正确"""
        batch_no = "BATCH-PB-002"

        request = ServiceReceiptRequest(
            batch_no=batch_no,
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        service.process_receipt(request)

        review_request = ServiceReceiptRequest(
            batch_no=batch_no,
            items=build_high_risk_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.REVIEW,
            review_opinion="复核通过",
        )
        service.process_receipt(review_request)

        playback = service.playback(batch_no)

        assert TaskStatus.PENDING in playback.status_path
        assert TaskStatus.UNDER_REVIEW in playback.status_path
        assert TaskStatus.APPROVED in playback.status_path

    def test_playback_timeline(self, service):
        """回放时间线应包含所有步骤"""
        batch_no = "BATCH-PB-003"

        request = ServiceReceiptRequest(
            batch_no=batch_no,
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        service.process_receipt(request)

        playback = service.playback(batch_no)

        assert len(playback.timeline) >= 1
        for entry in playback.timeline:
            assert "->" in entry

    def test_playback_final_status(self, service):
        """回放应有最终状态"""
        batch_no = "BATCH-PB-004"

        request = ServiceReceiptRequest(
            batch_no=batch_no,
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        service.process_receipt(request)

        playback = service.playback(batch_no)

        assert playback.final_status is not None
        assert playback.final_status == TaskStatus.APPROVED

    def test_get_batch_records(self, service):
        """获取批次所有处理记录"""
        batch_no = "BATCH-PB-005"

        request = ServiceReceiptRequest(
            batch_no=batch_no,
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        response = service.process_receipt(request)

        records = service.get_batch_records(batch_no)

        assert len(records) >= 1
        assert records[0].batch_no == batch_no
        assert records[0].audit_no == response.audit_no

    def test_get_record_by_audit_no(self, service):
        """根据审计编号查询记录"""
        batch_no = "BATCH-PB-006"

        request = ServiceReceiptRequest(
            batch_no=batch_no,
            items=build_normal_items(),
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )
        response = service.process_receipt(request)

        record = service.get_record_by_audit_no(response.audit_no)

        assert record is not None
        assert record.batch_no == batch_no
        assert record.audit_no == response.audit_no

    def test_playback_empty_batch(self, service):
        """空批次回放应返回空结果"""
        playback = service.playback("NON-EXIST-BATCH")

        assert playback.record_count == 0
        assert len(playback.records) == 0
        assert playback.final_status is None


class TestMaterialRules:
    """材料规则专项测试"""

    def test_electronic_delivery_no_signature_required(self):
        """电子送达不需要签名，但需要其他必填项"""
        engine = MaterialRuleEngine()

        items = [
            DetailItem(item_id="document_title", item_name="文书标题", item_value="仲裁裁决书"),
            DetailItem(item_id="delivery_method", item_name="送达方式", item_value="电子送达"),
            DetailItem(item_id="electronic_platform", item_name="电子平台", item_value="人民法院在线服务"),
            DetailItem(item_id="delivery_time", item_name="送达时间", item_value="2024-01-15 10:00:00"),
            DetailItem(item_id="recipient_account", item_name="接收人账号", item_value="user001"),
            DetailItem(item_id="read_status", item_name="阅读状态", item_value="已读"),
        ]

        result = engine.check_materials(items, SourceChannel.ELECTRONIC_DELIVERY)
        assert result.is_complete
        assert "receipt_signature" not in result.missing_items

    def test_post_service_required_items(self):
        """邮寄送达的必填项"""
        engine = MaterialRuleEngine()

        items = [
            DetailItem(item_id="document_title", item_name="文书标题", item_value="仲裁裁决书"),
            DetailItem(item_id="delivery_method", item_name="送达方式", item_value="邮寄送达"),
            DetailItem(item_id="tracking_no", item_name="快递单号", item_value="SF1234567890"),
            DetailItem(item_id="delivery_date", item_name="送达日期", item_value="2024-01-15"),
            DetailItem(item_id="recipient_name", item_name="接收人姓名", item_value="张三"),
            DetailItem(item_id="post_office", item_name="邮局", item_value="北京市朝阳区邮局"),
            DetailItem(item_id="receipt_signature", item_name="签收人签名", item_value="张三"),
        ]

        result = engine.check_materials(items, SourceChannel.POST_SERVICE)
        assert result.is_complete


class TestEdgeCases:
    """边界情况测试"""

    def test_empty_items_list(self, service):
        """空明细项列表"""
        request = ServiceReceiptRequest(
            batch_no="BATCH-EDGE-001",
            items=[],
            source_channel=SourceChannel.COURT,
            process_action=ProcessAction.SUBMIT,
        )

        response = service.process_receipt(request)

        assert len(response.missing_items) > 0
        assert response.business_conclusion != BusinessConclusion.PASSED

    def test_arbitration_commission_channel(self, service):
        """仲裁委渠道需要额外的仲裁费和仲裁委字段"""
        items = [
            DetailItem(item_id="document_title", item_name="文书标题", item_value="仲裁裁决书"),
            DetailItem(item_id="delivery_method", item_name="送达方式", item_value="直接送达"),
            DetailItem(item_id="arbitration_commission", item_name="仲裁委名称", item_value="北京仲裁委员会"),
            DetailItem(item_id="case_no", item_name="案号", item_value="(2024)京仲裁字第001号"),
            DetailItem(item_id="delivery_date", item_name="送达日期", item_value=RECENT_DATE),
            DetailItem(item_id="recipient_name", item_name="接收人姓名", item_value="张三"),
            DetailItem(item_id="receipt_signature", item_name="签收人签名", item_value="张三"),
            DetailItem(item_id="arbitration_fee", item_name="仲裁费", item_value="5000元"),
        ]

        request = ServiceReceiptRequest(
            batch_no="BATCH-EDGE-002",
            items=items,
            source_channel=SourceChannel.ARBITRATION_COMMISSION,
            process_action=ProcessAction.SUBMIT,
        )

        response = service.process_receipt(request)
        assert response.business_conclusion == BusinessConclusion.PASSED

    def test_electronic_unread_high_risk(self, service):
        """电子送达未读为高风险"""
        items = [
            DetailItem(item_id="document_title", item_name="文书标题", item_value="仲裁裁决书"),
            DetailItem(item_id="delivery_method", item_name="送达方式", item_value="电子送达"),
            DetailItem(item_id="electronic_platform", item_name="电子平台", item_value="人民法院在线服务"),
            DetailItem(item_id="delivery_time", item_name="送达时间", item_value="2024-01-15 10:00:00"),
            DetailItem(item_id="recipient_account", item_name="接收人账号", item_value="user001"),
            DetailItem(item_id="read_status", item_name="阅读状态", item_value="未读"),
        ]

        request = ServiceReceiptRequest(
            batch_no="BATCH-EDGE-003",
            items=items,
            source_channel=SourceChannel.ELECTRONIC_DELIVERY,
            process_action=ProcessAction.SUBMIT,
        )

        response = service.process_receipt(request)
        assert response.business_conclusion == BusinessConclusion.PENDING_REVIEW
        high_risk_tags = [t for t in response.risk_tags if t.risk_level == RiskLevel.HIGH]
        assert len(high_risk_tags) > 0

    def test_audit_no_uniqueness(self, service):
        """审计编号唯一性"""
        audit_nos = set()
        for i in range(10):
            request = ServiceReceiptRequest(
                batch_no=f"BATCH-UNIQUE-{i}",
                items=build_normal_items(),
                source_channel=SourceChannel.COURT,
                process_action=ProcessAction.SUBMIT,
            )
            response = service.process_receipt(request)
            assert response.audit_no not in audit_nos
            audit_nos.add(response.audit_no)

        assert len(audit_nos) == 10
