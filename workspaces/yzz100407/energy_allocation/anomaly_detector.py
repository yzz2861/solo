from datetime import date
from typing import Dict, List, Tuple

from .models import (
    AnomalyType,
    MeterReading,
    MeterType,
    ShopArea,
    ShopBill,
    BillStatus,
)


def detect_anomalies(
    readings: List[MeterReading],
    shops: List[ShopArea],
    billing_month: str,
    prev_readings: List[MeterReading] = None,
) -> Tuple[Dict[str, List[AnomalyType]], List[dict]]:
    anomalies_by_shop = {}
    anomaly_details = []

    shop_map = {s.shop_id: s for s in shops}
    reading_map = {}
    for r in readings:
        if not r.is_master and r.shop_id:
            key = (r.shop_id, r.meter_type)
            reading_map[key] = r

    prev_reading_map = {}
    if prev_readings:
        for r in prev_readings:
            if not r.is_master and r.shop_id:
                key = (r.shop_id, r.meter_type)
                prev_reading_map[key] = r

    for key, reading in reading_map.items():
        shop_id, meter_type = key
        shop_anomalies = anomalies_by_shop.setdefault(shop_id, [])

        if reading.previous_reading is None:
            shop_anomalies.append(AnomalyType.MISSING_PREVIOUS)
            anomaly_details.append({
                "shop_id": shop_id,
                "shop_name": reading.shop_name,
                "meter_type": meter_type.value,
                "anomaly_type": AnomalyType.MISSING_PREVIOUS.value,
                "description": f"{meter_type.value}缺少上月读数",
            })
        elif reading.reading_value < reading.previous_reading:
            shop_anomalies.append(AnomalyType.READING_REVERSAL)
            anomaly_details.append({
                "shop_id": shop_id,
                "shop_name": reading.shop_name,
                "meter_type": meter_type.value,
                "anomaly_type": AnomalyType.READING_REVERSAL.value,
                "description": (f"读数倒挂：上月{reading.previous_reading}，本月{reading.reading_value}，"
                               f"差值{reading.reading_value - reading.previous_reading}"),
                "prev_reading": reading.previous_reading,
                "curr_reading": reading.reading_value,
            })

    for shop in shops:
        shop_anomalies = anomalies_by_shop.setdefault(shop.shop_id, [])

        if shop.area <= 0:
            shop_anomalies.append(AnomalyType.ZERO_AREA)
            anomaly_details.append({
                "shop_id": shop.shop_id,
                "shop_name": shop.shop_name,
                "anomaly_type": AnomalyType.ZERO_AREA.value,
                "description": f"店铺面积为零或负数：{shop.area}",
                "area": shop.area,
            })

        if shop.end_date:
            try:
                year, month = map(int, billing_month.split("-")[:2])
                bill_date = date(year, month, 1)
                end_month = date(shop.end_date.year, shop.end_date.month, 1)

                if end_month < bill_date:
                    pass
                elif shop.end_date.day > 1 and end_month == bill_date:
                    shop_anomalies.append(AnomalyType.SHOP_CLOSED_MID_MONTH)
                    anomaly_details.append({
                        "shop_id": shop.shop_id,
                        "shop_name": shop.shop_name,
                        "anomaly_type": AnomalyType.SHOP_CLOSED_MID_MONTH.value,
                        "description": f"店铺于{shop.end_date}撤场，本月需按天分摊",
                        "close_date": shop.end_date.isoformat(),
                    })
            except (ValueError, AttributeError):
                pass

    renamed_checked = set()
    for key, reading in reading_map.items():
        shop_id, meter_type = key
        if shop_id in shop_map and shop_id not in renamed_checked:
            renamed_checked.add(shop_id)
            area_name = shop_map[shop_id].shop_name
            reading_name = reading.shop_name
            if area_name and reading_name and area_name != reading_name:
                if AnomalyType.SHOP_RENAMED not in anomalies_by_shop.get(shop_id, []):
                    anomalies_by_shop.setdefault(shop_id, []).append(AnomalyType.SHOP_RENAMED)
                    anomaly_details.append({
                        "shop_id": shop_id,
                        "shop_name": area_name,
                        "anomaly_type": AnomalyType.SHOP_RENAMED.value,
                        "description": (f"店铺名称不一致：读数表「{reading_name}」，面积表「{area_name}」"),
                        "reading_name": reading_name,
                        "area_name": area_name,
                    })

    for key, reading in reading_map.items():
        shop_id, _ = key
        if shop_id not in shop_map:
            anomalies_by_shop.setdefault(shop_id, []).append(AnomalyType.MISSING_SHOP)
            anomaly_details.append({
                "shop_id": shop_id,
                "shop_name": reading.shop_name,
                "anomaly_type": AnomalyType.MISSING_SHOP.value,
                "description": "读数表中的店铺在面积表中找不到",
            })

    return anomalies_by_shop, anomaly_details


def apply_anomalies_to_bills(bills: List[ShopBill], anomalies_by_shop: Dict[str, List[AnomalyType]]) -> List[ShopBill]:
    for bill in bills:
        shop_anomalies = anomalies_by_shop.get(bill.shop_id, [])
        for anomaly in shop_anomalies:
            bill.add_anomaly(anomaly)
    return bills


def mark_disputed_shops(bills: List[ShopBill], disputed_shop_ids: List[str]) -> List[ShopBill]:
    disputed_set = set(disputed_shop_ids)
    for bill in bills:
        if bill.shop_id in disputed_set:
            bill.status = BillStatus.DISPUTED
            bill.notes = "争议店铺，需人工复核"
    return bills
