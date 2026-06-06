import pytest
from app.models.enums import (
    AuthStatus, RiskLevel, ChannelType, MaterialType, LuxuryCategory, ActionType
)
from app.models.luxury import LuxuryItem, MaterialDoc
from app.models.channel import SourceChannel
from app.models.item import AuthItem
from app.models.batch import AuthBatch
from app.services.auth_service import AuthService, AuthServiceError


@pytest.fixture
def auth_service():
    return AuthService()


@pytest.fixture
def standard_item():
    materials = [
        MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
        MaterialDoc(material_type=MaterialType.WARRANTY_CARD, name="保修卡", verified=True),
        MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原盒", verified=True),
    ]
    luxury = LuxuryItem(
        item_id="LUX-HIST-001",
        name="测试手表",
        brand="TestBrand",
        category=LuxuryCategory.WATCH,
        serial_number="TEST-001",
        estimated_value=30000.0,
        materials=materials,
    )
    channel = SourceChannel(
        channel_type=ChannelType.OFFICIAL_STORE,
        channel_name="官方店",
    )
    return AuthItem(item_no="ITEM-HIST-001", luxury=luxury, source_channel=channel)


@pytest.fixture
def high_risk_item():
    materials = [
        MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
    ]
    luxury = LuxuryItem(
        item_id="LUX-HIST-002",
        name="高风险商品",
        brand="HighRisk",
        category=LuxuryCategory.BAG,
        serial_number="HR-002",
        estimated_value=200000.0,
        materials=materials,
    )
    channel = SourceChannel(
        channel_type=ChannelType.PRIVATE_SELLER,
        channel_name="个人卖家",
    )
    return AuthItem(item_no="ITEM-HIST-002", luxury=luxury, source_channel=channel)


class TestHistoryPlaybackSamples:
    def test_item_history_recording(self, auth_service, standard_item):
        batch = AuthBatch(
            batch_no="BATCH-HIST-001",
            items=[standard_item],
            action=ActionType.AUTO_AUTH,
            operator="system",
        )
        auth_service.process_batch(batch)

        history = auth_service.get_item_history("BATCH-HIST-001", "ITEM-HIST-001")
        assert len(history) >= 1
        assert history[0]["batch_no"] == "BATCH-HIST-001"
        assert history[0]["item_no"] == "ITEM-HIST-001"
        assert "action" in history[0]
        assert "from_status" in history[0]
        assert "to_status" in history[0]

    def test_playback_multiple_states(self, auth_service, high_risk_item):
        batch_no = "BATCH-HIST-002"
        item_no = "ITEM-HIST-002"

        batch1 = AuthBatch(
            batch_no=batch_no,
            items=[high_risk_item],
            action=ActionType.AUTO_AUTH,
            operator="system",
        )
        result1 = auth_service.process_batch(batch1)
        assert result1.item_results[0].status == AuthStatus.PENDING_REVIEW

        result2 = auth_service.review_item(
            batch_no=batch_no,
            item_no=item_no,
            action=ActionType.REVIEW_PASS,
            review_opinion="人工复核通过，材料真实有效",
            review_by="reviewer_001",
        )
        assert result2.status == AuthStatus.REVIEW_PASSED

        playback = auth_service.play_back_item(batch_no, item_no)
        assert len(playback) >= 2
        assert playback[0]["step_index"] == 1
        assert playback[1]["step_index"] == 2
        assert playback[-1]["status"] == "review_passed"

    def test_trace_id_is_unique_and_traceable(self, auth_service, standard_item):
        batch1 = AuthBatch(
            batch_no="BATCH-HIST-003",
            items=[standard_item],
            action=ActionType.AUTO_AUTH,
        )
        result1 = auth_service.process_batch(batch1)
        trace_id1 = result1.item_results[0].trace_id

        record = auth_service.get_record_by_trace_id(trace_id1)
        assert record is not None
        assert record["trace_id"] == trace_id1
        assert record["item_no"] == "ITEM-HIST-001"

    def test_invalid_trace_id_returns_none(self, auth_service):
        record = auth_service.get_record_by_trace_id("INVALID_TRACE_ID_12345")
        assert record is None

    def test_boundary_empty_batch_raises_error(self, auth_service):
        batch = AuthBatch(
            batch_no="BATCH-BOUND-001",
            items=[],
            action=ActionType.AUTO_AUTH,
        )
        with pytest.raises(AuthServiceError) as exc_info:
            auth_service.process_batch(batch)
        assert exc_info.value.code == "BATCH_ITEMS_EMPTY"
        assert "明细项不能为空" in exc_info.value.message

    def test_boundary_empty_batch_no_raises_error(self, auth_service, standard_item):
        batch = AuthBatch(
            batch_no="",
            items=[standard_item],
            action=ActionType.AUTO_AUTH,
        )
        with pytest.raises(AuthServiceError) as exc_info:
            auth_service.process_batch(batch)
        assert exc_info.value.code == "BATCH_NO_EMPTY"

    def test_boundary_duplicate_item_nos_raises_error(self, auth_service, standard_item):
        item2 = AuthItem(
            item_no="ITEM-HIST-001",
            luxury=standard_item.luxury,
            source_channel=standard_item.source_channel,
        )
        batch = AuthBatch(
            batch_no="BATCH-BOUND-002",
            items=[standard_item, item2],
            action=ActionType.AUTO_AUTH,
        )
        with pytest.raises(AuthServiceError) as exc_info:
            auth_service.process_batch(batch)
        assert exc_info.value.code == "DUPLICATE_ITEM_NO"
        assert "重复" in exc_info.value.message
        assert "ITEM-HIST-001" in exc_info.value.details.get("duplicates", [])

    def test_reprocess_after_passed(self, auth_service, standard_item):
        batch_no = "BATCH-HIST-004"
        item_no = "ITEM-HIST-001"

        batch1 = AuthBatch(
            batch_no=batch_no,
            items=[standard_item],
            action=ActionType.AUTO_AUTH,
        )
        result1 = auth_service.process_batch(batch1)
        assert result1.item_results[0].status == AuthStatus.PASSED

        batch2 = AuthBatch(
            batch_no=batch_no,
            items=[standard_item],
            action=ActionType.REPROCESS,
            operator="reprocessor",
        )
        result2 = auth_service.process_batch(batch2)
        assert result2.item_results[0].status == AuthStatus.IN_PROGRESS

        history = auth_service.get_item_history(batch_no, item_no)
        assert len(history) >= 2

    def test_processing_count(self, auth_service, standard_item):
        batch_no = "BATCH-HIST-005"
        item_no = "ITEM-HIST-001"

        for i in range(2):
            batch = AuthBatch(
                batch_no=batch_no,
                items=[standard_item],
                action=ActionType.REPROCESS if i > 0 else ActionType.AUTO_AUTH,
                operator="system",
            )
            auth_service.process_batch(batch)

        count = auth_service.get_processing_count(batch_no, item_no)
        assert count >= 1

    def test_review_flow_complete(self, auth_service, high_risk_item):
        batch_no = "BATCH-HIST-006"
        item_no = "ITEM-HIST-002"

        batch1 = AuthBatch(
            batch_no=batch_no,
            items=[high_risk_item],
            action=ActionType.AUTO_AUTH,
        )
        result1 = auth_service.process_batch(batch1)
        assert result1.item_results[0].status == AuthStatus.PENDING_REVIEW

        result2 = auth_service.review_item(
            batch_no=batch_no,
            item_no=item_no,
            action=ActionType.REVIEW_REJECT,
            review_opinion="鉴定为仿品，予以拦截",
            review_by="senior_reviewer",
        )
        assert result2.status == AuthStatus.REVIEW_REJECTED
        assert result2.reviewed is True
        assert result2.review_by == "senior_reviewer"
        assert result2.passed is False

        playback = auth_service.play_back_item(batch_no, item_no)
        assert len(playback) >= 2
        assert playback[0]["status"] == "pending_review"
        assert playback[-1]["status"] == "review_rejected"

    def test_review_on_wrong_status_raises_error(self, auth_service, standard_item):
        batch_no = "BATCH-HIST-007"
        item_no = "ITEM-HIST-001"

        batch = AuthBatch(
            batch_no=batch_no,
            items=[standard_item],
            action=ActionType.AUTO_AUTH,
        )
        auth_service.process_batch(batch)

        with pytest.raises(AuthServiceError) as exc_info:
            auth_service.review_item(
                batch_no=batch_no,
                item_no=item_no,
                action=ActionType.REVIEW_PASS,
                review_opinion="测试错误状态复核",
                review_by="tester",
            )
        assert exc_info.value.code == "INVALID_REVIEW_STATUS"

    def test_trace_ids_are_unique(self, auth_service, standard_item):
        trace_ids = set()
        for i in range(5):
            batch = AuthBatch(
                batch_no=f"BATCH-TRACE-{i}",
                items=[standard_item],
                action=ActionType.AUTO_AUTH,
            )
            result = auth_service.process_batch(batch)
            trace_id = result.item_results[0].trace_id
            assert trace_id not in trace_ids
            trace_ids.add(trace_id)

    def test_history_records_include_risk_change(self, auth_service, high_risk_item):
        batch_no = "BATCH-HIST-008"
        item_no = "ITEM-HIST-002"

        batch = AuthBatch(
            batch_no=batch_no,
            items=[high_risk_item],
            action=ActionType.AUTO_AUTH,
        )
        auth_service.process_batch(batch)

        history = auth_service.get_item_history(batch_no, item_no)
        assert len(history) >= 1
        assert "risk_level_before" in history[0]
        assert "risk_level_after" in history[0]
        assert "risk_score_after" in history[0]

    def test_playback_step_order_correct(self, auth_service, high_risk_item):
        batch_no = "BATCH-HIST-009"
        item_no = "ITEM-HIST-002"

        batch1 = AuthBatch(batch_no=batch_no, items=[high_risk_item], action=ActionType.AUTO_AUTH)
        auth_service.process_batch(batch1)

        auth_service.review_item(
            batch_no=batch_no,
            item_no=item_no,
            action=ActionType.REVIEW_PASS,
            review_opinion="通过",
            review_by="reviewer",
        )

        batch3 = AuthBatch(batch_no=batch_no, items=[high_risk_item], action=ActionType.REPROCESS)
        auth_service.process_batch(batch3)

        playback = auth_service.play_back_item(batch_no, item_no)
        step_indices = [s["step_index"] for s in playback]
        assert step_indices == list(range(1, len(playback) + 1))
