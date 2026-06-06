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


class TestThresholdSamples:
    def test_private_seller_high_value_needs_review(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="购买发票", verified=True),
            MaterialDoc(material_type=MaterialType.WARRANTY_CARD, name="保修卡", verified=True),
            MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原装盒", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-TH-001",
            name="百达翡丽鹦鹉螺",
            brand="Patek Philippe",
            category=LuxuryCategory.WATCH,
            serial_number="PP-88888",
            estimated_value=500000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.PRIVATE_SELLER,
            channel_name="个人卖家",
            seller_id="SELLER-999",
        )
        item = AuthItem(item_no="ITEM-TH-001", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-TH-001",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.status == AuthStatus.PENDING_REVIEW
        assert result.pending_review_count == 1
        assert item_result.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}
        assert item_result.risk_score >= 50
        assert len(item_result.triggered_rules) >= 1
        assert item_result.passed is False
        assert "高风险" in "".join(item_result.reasons) or "复核" in "".join(item_result.reasons)

    def test_unknown_channel_always_needs_review(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-TH-002",
            name="某品牌项链",
            brand="Unknown",
            category=LuxuryCategory.JEWELRY,
            serial_number="UNK-001",
            estimated_value=5000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.UNKNOWN,
            channel_name="不明渠道",
        )
        item = AuthItem(item_no="ITEM-TH-002", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-TH-002",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.status == AuthStatus.PENDING_REVIEW
        assert item_result.risk_level == RiskLevel.CRITICAL
        assert item_result.passed is False

    def test_boundary_value_at_threshold(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
            MaterialDoc(material_type=MaterialType.WARRANTY_CARD, name="保修卡", verified=True),
            MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原盒", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-TH-003",
            name="边界价值手表",
            brand="TestBrand",
            category=LuxuryCategory.WATCH,
            serial_number="BDRY-001",
            estimated_value=50000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.AUTHORIZED_DEALER,
            channel_name="授权经销商",
        )
        item = AuthItem(item_no="ITEM-TH-003", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-TH-003",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.risk_score is not None
        assert item_result.risk_level is not None

    def test_very_high_value_missing_appraisal_report(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
            MaterialDoc(material_type=MaterialType.CERTIFICATE, name="证书", verified=True),
            MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原盒", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-TH-004",
            name="天价钻石项链",
            brand="Cartier",
            category=LuxuryCategory.JEWELRY,
            serial_number="CART-99999",
            estimated_value=500000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.AUTHORIZED_DEALER,
            channel_name="卡地亚授权店",
        )
        item = AuthItem(item_no="ITEM-TH-004", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-TH-004",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert any("第三方鉴定报告" in r for r in item_result.reasons)
        assert item_result.status == AuthStatus.PENDING_REVIEW

    def test_high_risk_cannot_direct_pass(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
            MaterialDoc(material_type=MaterialType.WARRANTY_CARD, name="保修卡", verified=True),
            MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原盒", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-TH-005",
            name="高风险手表",
            brand="HighRisk",
            category=LuxuryCategory.WATCH,
            serial_number="HR-001",
            estimated_value=100000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.PRIVATE_SELLER,
            channel_name="个人卖家",
        )
        item = AuthItem(item_no="ITEM-TH-005", luxury=luxury, source_channel=channel)

        batch = AuthBatch(
            batch_no="BATCH-TH-005",
            items=[item],
            action=ActionType.MANUAL_PASS,
            operator="tester",
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.status == AuthStatus.PENDING_REVIEW
        assert item_result.passed is False
        assert any("复核" in r for r in item_result.reasons) or any("不允许" in r for r in item_result.reasons)

    def test_auction_medium_value(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="拍卖凭证", verified=True),
            MaterialDoc(material_type=MaterialType.CERTIFICATE, name="证书", verified=True),
        ]
        luxury = LuxuryItem(
            item_id="LUX-TH-006",
            name="拍卖包包",
            brand="AuctionBrand",
            category=LuxuryCategory.BAG,
            serial_number="AUC-006",
            estimated_value=30000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.AUCTION,
            channel_name="苏富比拍卖",
        )
        item = AuthItem(item_no="ITEM-TH-006", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-TH-006",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.risk_level in {RiskLevel.MEDIUM, RiskLevel.HIGH}
        assert "拍卖" in item_result.reasons[0] or "渠道" in item_result.reasons[0]

    def test_second_hand_market_materials(self, auth_service):
        materials = [
            MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="二手交易凭证", verified=False),
        ]
        luxury = LuxuryItem(
            item_id="LUX-TH-007",
            name="二手市场包包",
            brand="SecondHand",
            category=LuxuryCategory.BAG,
            serial_number="SH-007",
            estimated_value=20000.0,
            materials=materials,
        )
        channel = SourceChannel(
            channel_type=ChannelType.SECOND_HAND_MARKET,
            channel_name="某二手交易平台",
        )
        item = AuthItem(item_no="ITEM-TH-007", luxury=luxury, source_channel=channel)
        batch = AuthBatch(
            batch_no="BATCH-TH-007",
            items=[item],
            action=ActionType.AUTO_AUTH,
        )

        result = auth_service.process_batch(batch)
        item_result = result.item_results[0]

        assert item_result.status == AuthStatus.PENDING_REVIEW
        assert len(item_result.missing_materials) > 0
