from datetime import date
from typing import Dict, List, Tuple

from .models import (
    AllocationItem,
    AllocationRule,
    BillingResult,
    MeterReading,
    MeterType,
    ShopArea,
    ShopBill,
    BillStatus,
)


class AllocationEngine:
    def __init__(
        self,
        readings: List[MeterReading],
        shops: List[ShopArea],
        rules: List[AllocationRule],
        billing_month: str,
    ):
        self.readings = readings
        self.shops = shops
        self.rules = rules
        self.billing_month = billing_month
        self.shop_map = {s.shop_id: s for s in shops}

    def _get_master_reading(self, meter_type: MeterType) -> MeterReading:
        for r in self.readings:
            if r.is_master and r.meter_type == meter_type:
                return r
        return None

    def _get_shop_readings(self, meter_type: MeterType) -> List[MeterReading]:
        return [r for r in self.readings if not r.is_master and r.meter_type == meter_type and r.shop_id]

    def _get_rule(self, meter_type: MeterType) -> AllocationRule:
        for r in self.rules:
            if r.meter_type == meter_type:
                return r
        return AllocationRule(
            rule_id="default",
            rule_name="默认规则",
            meter_type=meter_type,
            allocation_method="area_ratio",
            unit_price=1.0,
            public_area_ratio=0.15,
        )

    def _calculate_days_in_month(self) -> int:
        try:
            year, month = map(int, self.billing_month.split("-")[:2])
            if month == 12:
                next_month = date(year + 1, 1, 1)
            else:
                next_month = date(year, month + 1, 1)
            return (next_month - date(year, month, 1)).days
        except (ValueError, AttributeError):
            return 30

    def _calculate_shop_days(self, shop: ShopArea) -> int:
        total_days = self._calculate_days_in_month()
        if not shop.end_date:
            return total_days

        try:
            year, month = map(int, self.billing_month.split("-")[:2])
            bill_start = date(year, month, 1)

            if shop.end_date < bill_start:
                return 0

            if shop.end_date.year == year and shop.end_date.month == month:
                return shop.end_date.day

            return total_days
        except (ValueError, AttributeError):
            return total_days

    def _calculate_submeter_total(self, meter_type: MeterType) -> Tuple[float, Dict[str, float]]:
        shop_readings = self._get_shop_readings(meter_type)
        shop_consumptions = {}
        total = 0.0

        for r in shop_readings:
            if r.consumption is not None and r.consumption > 0:
                consumption = r.consumption
            elif r.previous_reading is None:
                consumption = 0.0
            else:
                consumption = 0.0

            shop_consumptions[r.shop_id] = consumption
            total += consumption

        return total, shop_consumptions

    def _calculate_total_area(self, active_only: bool = True) -> float:
        total = 0.0
        for shop in self.shops:
            if active_only and not shop.is_active:
                continue
            days = self._calculate_shop_days(shop)
            if days > 0:
                total += shop.area
        return total

    def allocate(self) -> BillingResult:
        result = BillingResult(billing_month=self.billing_month)

        for meter_type in [MeterType.ELECTRIC, MeterType.WATER]:
            bills = self._allocate_type(meter_type)
            result.bills.extend(bills)

            total_master = 0.0
            master = self._get_master_reading(meter_type)
            if master and master.consumption:
                total_master = master.consumption
            result.total_master_consumption[meter_type] = total_master

            total_amount = sum(b.total_amount for b in bills if b.meter_type == meter_type)
            result.total_billed_amount[meter_type] = total_amount

        return result

    def _allocate_type(self, meter_type: MeterType) -> List[ShopBill]:
        bills = []
        rule = self._get_rule(meter_type)
        master = self._get_master_reading(meter_type)
        shop_readings = self._get_shop_readings(meter_type)

        submeter_total, shop_consumptions = self._calculate_submeter_total(meter_type)
        total_area = self._calculate_total_area(active_only=True)

        master_consumption = master.consumption if master and master.consumption else submeter_total

        public_consumption = max(0, master_consumption - submeter_total)
        if public_consumption == 0 and master and master.consumption:
            public_consumption = master_consumption * rule.public_area_ratio

        for shop in self.shops:
            if not shop.is_active and shop.shop_id not in shop_consumptions:
                continue

            days = self._calculate_shop_days(shop)
            if days <= 0 and shop.shop_id not in shop_consumptions:
                continue

            shop_consumption = shop_consumptions.get(shop.shop_id, 0.0)
            shop_bill = ShopBill(
                bill_no="",
                billing_month=self.billing_month,
                shop_id=shop.shop_id,
                shop_name=shop.shop_name,
                meter_type=meter_type,
                total_amount=0.0,
            )

            metered_amount = shop_consumption * rule.unit_price
            if shop_consumption > 0:
                shop_bill.add_item(AllocationItem(
                    item_name="分表用量",
                    amount=round(metered_amount, 2),
                    quantity=shop_consumption,
                    unit_price=rule.unit_price,
                    formula=f"分表读数差 × 单价 = {shop_consumption:.2f} × {rule.unit_price:.2f}",
                ))

            public_amount = 0.0
            if total_area > 0 and public_consumption > 0:
                area_ratio = shop.area / total_area
                public_quantity = public_consumption * area_ratio
                public_amount = public_quantity * rule.unit_price

                shop_bill.add_item(AllocationItem(
                    item_name="公摊用量",
                    amount=round(public_amount, 2),
                    quantity=public_quantity,
                    unit_price=rule.unit_price,
                    formula=(f"总公摊量 × (店铺面积/总面积) × 单价 = "
                             f"{public_consumption:.2f} × ({shop.area:.2f}/{total_area:.2f}) × {rule.unit_price:.2f}"),
                ))

            if rule.fixed_fee > 0:
                shop_bill.add_item(AllocationItem(
                    item_name="固定费用",
                    amount=rule.fixed_fee,
                    formula=f"固定费用：{rule.fixed_fee:.2f}",
                ))

            shop_bill.total_amount = round(sum(item.amount for item in shop_bill.items), 2)

            if shop_bill.total_amount > 0 or shop_consumption > 0:
                bills.append(shop_bill)

        return bills
