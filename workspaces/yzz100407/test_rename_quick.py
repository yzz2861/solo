from datetime import date
from energy_allocation.models import MeterReading, MeterType, ShopArea, AnomalyType
from energy_allocation.anomaly_detector import detect_anomalies

readings = [
    MeterReading('EM-001', MeterType.ELECTRIC, 'S001', '旧名咖啡', date(2024,6,30), 5650.0, 5200.0, False),
    MeterReading('WM-001', MeterType.WATER, 'S001', '旧名咖啡', date(2024,6,30), 120.0, 85.0, False),
]
shops = [ShopArea('S001', '新名咖啡', 120.5, '1F', True)]

by_shop, details = detect_anomalies(readings, shops, '2024-06')

renames = [d for d in details if d['anomaly_type'] == 'shop_renamed']
assert len(renames) == 1, f'Expected 1, got {len(renames)}'
r = renames[0]
assert r['reading_name'] == '旧名咖啡'
assert r['area_name'] == '新名咖啡'
assert AnomalyType.SHOP_RENAMED in by_shop.get('S001', [])

print('shop_renamed: OK')
print('  ' + r['description'])
