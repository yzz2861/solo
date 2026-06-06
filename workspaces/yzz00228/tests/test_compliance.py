import pytest
from datetime import datetime
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
def compliant_watch_item():
    materials = [
        MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="购买发票", verified=True),
        MaterialDoc(material_type=MaterialType.WARRANTY_CARD, name="保修卡", verified=True),
        MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原装表盒", verified=True),
    ]
    luxury = LuxuryItem(
        item_id="LUX-001",
        name="劳力士潜航者型",
        brand="Rolex",
        category=LuxuryCategory.WATCH,
        model="116610LN",
        serial_number="12345678",
        estimated_value=85000.0,
        materials=materials,
    )
    channel = SourceChannel(
        channel_type=ChannelType.OFFICIAL_STORE,
        channel_name="劳力士官方专卖店",
        seller_id="ROLEX-SH-001",
    )
    return AuthItem(
        item_no="ITEM-COMP-001",
        luxury=luxury,
        source_channel=channel,
    )


@pytest.fixture
def compliant_batch(compliant_watch_item):
    return AuthBatch(
        batch_no="BATCH-COMP-001",
        items=[compliant_watch_item],
        action=ActionType.AUTO_AUTH,
        operator="system",
    )


class TestComplianceSamples:
    def test_official_store_watch_auto_pass(self, auth_service, compliant_batch):
        result = auth_service.process_batch(compliant_batch)

        assert result.batch_no == "BATCH-COMP-001"
        assert result.total_count == 1
        assert result.passed_count == 1
        assert result.rejected_count == 0
        assert result.pending_review_count == 0

        item_result = result.item_results[0]
        assert item_result.status == AuthStatus.PASSED
        assert item_result.passed is True
        assert item_result.risk_level in {RiskLevel.LOW, RiskLevel.MEDIUM}
        assert len(item_result.reasons) > 0
        assert item_result.trace_id is not None

    def test_authorized_dealer_bag_pass(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="购买发票", verified=True),
            MaterialDoc(material_type=MaterialType.CERTIFICATE, name="品牌证书", verified=True),
            MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原装包盒", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-002",
            name="爱马仕Birkin 30",
            brand="Hermes",
            category=LuxuryCategory.BAG,
            serial_number="ABC123",
            estimated_value=150000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.AUTHORIZED_DEALER,
            channel_name="爱马仕授权经销商",
            seller_id="HERMES-DEALER-001",
        )
        item = AuthItem(item_no="ITEM-COMP-002", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-COMP-002",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert result.passed_count + result.pending_review_count >= 1
        assert len(item_result.triggered_rules) >= 0
        assert item_result.trace_id is not None

    def test_low_value_accessory_pass(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="购买发票", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-003",
            name="LV经典款腰带",
            brand="Louis Vuitton",
            category=LuxuryCategory.ACCESSORY,
            serial_number="M9808",
            estimated_value=5000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.OFFICIAL_STORE,
            channel_name="LV官方旗舰店",
        )
        item = AuthItem(item_no="ITEM-COMP-003", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-COMP-003",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.status == AuthStatus.PASSED
        assert item_result.risk_score < 30
        assert item_result.passed is True

    def test_multiple_compliant_items_batch(self, auth_service, compliant_watch_item):
        materials_bag = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
            MaterialDoc(material_type=MaterialType.CERTIFICATE, name="证书", verified=True),
            MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原盒", verified=True),
        ]
        luxury_bag = LuxuryItem(
            item_id="LUX-004",
            name="香奈儿Classic Flap",
            brand="Chanel",
            category=LuxuryCategory.BAG,
            serial_number="CHANEL-001",
            estimated_value=45000.0,
            materials=materials_bag,
        )
        channel_bag = SourceChannel(
            channel_type=ChannelType.OFFICIAL_STORE,
            channel_name="香奈儿精品店",
        )
        item_bag = AuthItem(item_no="ITEM-COMP-004", luxury=luxury_bag, source_channel=channel_bag)

        batch = AuthBatch(
            batch_no="BATCH-COMP-MULTI-001",
            items=[compliant_watch_item, item_bag],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        assert result.total_count == 2
        assert all(r.trace_id is not None for r in result.item_results)

    def test_trace_id_format_valid(self, auth_service, compliant_batch):
        result = auth_service.process_batch(compliant_batch)
        item_result = result.item_results[0]

        assert item_result.trace_id.startswith("ITEM-")
        assert "-" in item_result.trace_id
        assert len(item_result.trace_id) > 20

    def test_all_reasons_readable(self, auth_service, compliant_batch):
        result = auth_service.process_batch(compliant_batch)
        item_result = result.item_results[0]

        for reason in item_result.reasons:
            assert isinstance(reason, str)
            assert len(reason) > 0
            assert any("\u4e00" <= c <= "\u9fff" for c in reason) or reason.isascii()
