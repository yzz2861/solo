import json
from app.models.enums import (
    AuthStatus, RiskLevel, ChannelType, MaterialType, LuxuryCategory, ActionType
)
from app.models.luxury import LuxuryItem, MaterialDoc
from app.models.channel import SourceChannel
from app.models.item import AuthItem
from app.models.batch import AuthBatch
from app.services.auth_service import AuthService

service = AuthService()

print("=" * 60)
print("测试1: 合规样例 - 官方店手表")
print("=" * 60)
materials = [
    MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="购买发票", verified=True),
    MaterialDoc(material_type=MaterialType.WARRANTY_CARD, name="保修卡", verified=True),
    MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原装表盒", verified=True),
]
luxury = LuxuryItem(
    item_id="LUX-001", name="劳力士潜航者型", brand="Rolex",
    category=LuxuryCategory.WATCH, serial_number="12345678",
    estimated_value=85000.0, materials=materials,
)
channel = SourceChannel(channel_type=ChannelType.OFFICIAL_STORE, channel_name="劳力士官方店")
item = AuthItem(item_no="ITEM-001", luxury=luxury, source_channel=channel)
batch = AuthBatch(batch_no="BATCH-001", items=[item], action=ActionType.AUTO_AUTH)
result = service.process_batch(batch)
print(f"批次号: {result.batch_no}")
print(f"批次状态: {result.status.value}")
print(f"通过: {result.passed_count}, 拦截: {result.rejected_count}, 待复核: {result.pending_review_count}")
item_r = result.item_results[0]
print(f"明细状态: {item_r.status.value}")
print(f"风险等级: {item_r.risk_level.value}, 风险分数: {item_r.risk_score}")
print(f"是否通过: {item_r.passed}")
print(f"追溯编号: {item_r.trace_id}")
print(f"原因示例: {item_r.reasons[:2]}")

print("\n" + "=" * 60)
print("测试2: 高风险样例 - 私人卖家高价值手表")
print("=" * 60)
luxury2 = LuxuryItem(
    item_id="LUX-002", name="百达翡丽鹦鹉螺", brand="Patek Philippe",
    category=LuxuryCategory.WATCH, serial_number="PP-88888",
    estimated_value=500000.0, materials=materials,
)
channel2 = SourceChannel(channel_type=ChannelType.PRIVATE_SELLER, channel_name="个人卖家")
item2 = AuthItem(item_no="ITEM-002", luxury=luxury2, source_channel=channel2)
batch2 = AuthBatch(batch_no="BATCH-002", items=[item2], action=ActionType.AUTO_AUTH)
result2 = service.process_batch(batch2)
item_r2 = result2.item_results[0]
print(f"明细状态: {item_r2.status.value}")
print(f"风险等级: {item_r2.risk_level.value}, 风险分数: {item_r2.risk_score}")
print(f"是否需要复核: {item_r2.status == AuthStatus.PENDING_REVIEW}")
print(f"触发规则: {item_r2.triggered_rules}")

print("\n" + "=" * 60)
print("测试3: 材料缺失样例 - 缺少保修卡")
print("=" * 60)
materials3 = [
    MaterialDoc(material_type=MaterialType.PURCHASE_INVOICE, name="发票", verified=True),
    MaterialDoc(material_type=MaterialType.ORIGINAL_BOX, name="原盒", verified=True),
]
luxury3 = LuxuryItem(
    item_id="LUX-003", name="欧米茄海马", brand="Omega",
    category=LuxuryCategory.WATCH, serial_number="OMEGA-001",
    estimated_value=40000.0, materials=materials3,
)
channel3 = SourceChannel(channel_type=ChannelType.AUTHORIZED_DEALER, channel_name="授权店")
item3 = AuthItem(item_no="ITEM-003", luxury=luxury3, source_channel=channel3)
batch3 = AuthBatch(batch_no="BATCH-003", items=[item3], action=ActionType.AUTO_AUTH)
result3 = service.process_batch(batch3)
item_r3 = result3.item_results[0]
print(f"明细状态: {item_r3.status.value}")
print(f"缺失材料: {item_r3.missing_materials}")
print(f"是否待复核: {item_r3.status == AuthStatus.PENDING_REVIEW}")

print("\n" + "=" * 60)
print("测试4: 可追溯性验证")
print("=" * 60)
trace_id = item_r.trace_id
record = service.get_record_by_trace_id(trace_id)
print(f"追溯编号 {trace_id}:")
print(f"  - 批次号: {record['batch_no']}")
print(f"  - 明细号: {record['item_no']}")
print(f"  - 动作: {record['action']}")
print(f"  - 状态变化: {record['from_status']} -> {record['to_status']}")

print("\n" + "=" * 60)
print("测试5: 历史回放 - 完整流程")
print("=" * 60)
review_result = service.review_item(
    batch_no="BATCH-002", item_no="ITEM-002",
    action=ActionType.REVIEW_PASS,
    review_opinion="人工复核通过，商品为正品",
    review_by="高级鉴定师-001",
)
print(f"复核后状态: {review_result.status.value}")
print(f"复核人: {review_result.review_by}")
print(f"复核意见: {review_result.review_opinion}")

playback = service.play_back_item("BATCH-002", "ITEM-002")
print(f"\n历史回放（共 {len(playback)} 步）:")
for step in playback:
    print(f"  第{step['step_index']}步: {step['status']} (trace: {step['trace_id'][:24]}...)")

print("\n" + "=" * 60)
print("测试6: 边界条件 - 空批次号")
print("=" * 60)
try:
    bad_batch = AuthBatch(batch_no="", items=[item], action=ActionType.AUTO_AUTH)
    service.process_batch(bad_batch)
except Exception as e:
    print(f"错误类型: {type(e).__name__}")
    print(f"错误消息: {e}")

print("\n" + "=" * 60)
print("所有功能验证完成！")
print("=" * 60)
