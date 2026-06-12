import hashlib
from typing import List

from .models import MeterType, ShopBill


def generate_bill_no(shop_id: str, billing_month: str, meter_type: MeterType) -> str:
    prefix = "ELEC" if meter_type == MeterType.ELECTRIC else "WATER"
    month_clean = billing_month.replace("-", "").replace("/", "")
    hash_suffix = hashlib.md5(f"{shop_id}_{month_clean}_{meter_type.value}".encode()).hexdigest()[:6].upper()
    return f"{prefix}-{month_clean}-{hash_suffix}"


def assign_bill_numbers(
    bills: List[ShopBill],
    billing_month: str,
    use_sequential: bool = True,
) -> List[ShopBill]:
    electric_bills = sorted(
        [b for b in bills if b.meter_type == MeterType.ELECTRIC],
        key=lambda b: b.shop_id,
    )
    water_bills = sorted(
        [b for b in bills if b.meter_type == MeterType.WATER],
        key=lambda b: b.shop_id,
    )

    if use_sequential:
        month_clean = billing_month.replace("-", "").replace("/", "")
        for idx, bill in enumerate(electric_bills, 1):
            bill.bill_no = f"ELEC-{month_clean}-{idx:03d}"
        for idx, bill in enumerate(water_bills, 1):
            bill.bill_no = f"WATER-{month_clean}-{idx:03d}"
    else:
        for bill in bills:
            bill.bill_no = generate_bill_no(bill.shop_id, billing_month, bill.meter_type)

    return bills
