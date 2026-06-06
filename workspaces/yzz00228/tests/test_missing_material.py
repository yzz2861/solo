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


class TestMissingMaterialSamples:
    def test_watch_missing_warranty_card_needs_review(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="购买发票", verified=True),
            MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原装盒", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-MM-001",
            name="欧米茄海马",
            brand="Omega",
            category=LuxuryCategory.WATCH,
            serial_number="OMEGA-001",
            estimated_value=40000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.AUTHORIZED_DEALER,
            channel_name="欧米茄授权店",
        )
        item = AuthItem(item_no="ITEM-MM-001", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-MM-001",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.status == AuthStatus.PENDING_REVIEW
        assert len(item_result.missing_materials) >= 1
        assert "warranty_card" in item_result.missing_materials
        assert any("缺少" in r for r in item_result.reasons)
        assert item_result.passed is False

    def test_bag_missing_all_materials_needs_review(self, auth_service):
        luxury = LuxuryItem(
            item_id="LUX-MM-002",
            name="迪奥戴妃包",
            brand="Dior",
            category=LuxuryCategory.BAG,
            serial_number="DIOR-002",
            estimated_value=35000.0,
            materials=[],
        )
        channel = SourceChannel(
            channel_type=ChannelType.SECOND_HAND_MARKET,
            channel_name="二手市场",
        )
        item = AuthItem(item_no="ITEM-MM-002", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-MM-002",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.status == AuthStatus.PENDING_REVIEW
        assert len(item_result.missing_materials) >= 2
        assert item_result.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}

    def test_materials_unverified_not_counted(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=False),
            MaterialDoc(material_type=MaterialType.CERTIFICATE, name="证书", verified=False),
            MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原盒", verified=False),
        ]
        luxury = LuxuryItem(
            item_id="LUX-MM-003",
            name="卡地亚戒指",
            brand="Cartier",
            category=LuxuryCategory.JEWELRY,
            serial_number="CART-003",
            estimated_value=25000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.OFFICIAL_STORE,
            channel_name="卡地亚精品店",
        )
        item = AuthItem(item_no="ITEM-MM-003", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-MM-003",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.status == AuthStatus.PENDING_REVIEW
        assert len(item_result.missing_materials) >= 1
        assert any("核验" in r or "缺少" in r for r in item_result.reasons)

    def test_partial_materials_missing_clothing(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-MM-004",
            name="香奈儿外套",
            brand="Chanel",
            category=LuxuryCategory.CLOTHING,
            serial_number="CHANEL-004",
            estimated_value=15000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.OFFICIAL_STORE,
            channel_name="香奈儿官方店",
        )
        item = AuthItem(item_no="ITEM-MM-004", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-MM-004",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert "receipt" in item_result.missing_materials
        assert item_result.status == AuthStatus.PENDING_REVIEW

    def test_missing_materials_cannot_manual_pass_directly(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-MM-005",
            name="古驰鞋子",
            brand="Gucci",
            category=LuxuryCategory.SHOES,
            serial_number="GUCCI-005",
            estimated_value=8000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.OFFICIAL_STORE,
            channel_name="古驰专卖店",
        )
        item = AuthItem(item_no="ITEM-MM-005", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-MM-005",
            items=[item],
            action=ActionType.MANUAL_PASS,
            operator="tester",
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.status == AuthStatus.PENDING_REVIEW
        assert item_result.passed is False
        assert any("复核" in r for r in item_result.reasons) or any("不允许" in r for r in item_result.reasons)

    def test_high_value_missing_appraisal_report(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
            MaterialDoc(material_type=MaterialType.CERTIFICATE, name="证书", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-MM-006",
            name="梵克雅宝项链",
            brand="Van Cleef & Arpels",
            category=LuxuryCategory.JEWELRY,
            serial_number="VCA-006",
            estimated_value=150000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.OFFICIAL_STORE,
            channel_name="梵克雅宝精品店",
        )
        item = AuthItem(item_no="ITEM-MM-006", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-MM-006",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.status == AuthStatus.PENDING_REVIEW
        assert any("第三方鉴定报告" in r for r in item_result.reasons)

    def test_missing_serial_number_increases_risk(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
            MaterialDoc(material_type=MaterialType.WARRANTY_CARD, name="保修卡", verified=True),
            MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原盒", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-MM-007",
            name="无序列号手表",
            brand="NoSerial",
            category=LuxuryCategory.WATCH,
            estimated_value=30000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.AUTHORIZED_DEALER,
            channel_name="授权经销商",
        )
        item = AuthItem(item_no="ITEM-MM-007", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-MM-007",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert any("序列号" in r for r in item_result.reasons)
        assert "RULE_SERIAL_001" in item_result.triggered_rules
