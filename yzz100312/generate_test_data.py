#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成测试数据，用于演示和验证功能
"""
import csv
import json
import random
import os

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_data")

STORES = ["S001", "S002", "S003"]
SKUS = [
    ("SKU001", "农夫山泉550ml", 100),
    ("SKU002", "可口可乐330ml", 80),
    ("SKU003", "康师傅红烧牛肉面", 50),
    ("SKU004", "奥利奥原味饼干", 40),
    ("SKU005", "蒙牛纯牛奶250ml", 120),
    ("SKU006", "乐事薯片原味", 30),
    ("SKU007", "益达口香糖", 60),
    ("SKU008", "德芙巧克力", 25),
    ("SKU009", "海天生抽500ml", 35),
    ("SKU010", "清风抽纸3包装", 45),
]


def generate_stock_csv():
    path = os.path.join(OUT_DIR, "stock_ledger.csv")
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["store_code", "sku_code", "sku_name", "book_qty", "ledger_date"])
        for store in STORES:
            for sku_code, sku_name, base_qty in SKUS:
                qty = base_qty + random.randint(-20, 20)
                if sku_code == "SKU003" and store == "S001":
                    qty = -5
                writer.writerow([store, sku_code, sku_name, qty, "2026-06-30"])
    print(f"已生成：{path}")


def generate_stocktake_csv():
    path = os.path.join(OUT_DIR, "stocktake_scan.csv")
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["store_code", "sku_code", "actual_qty", "scan_time", "scanner"])
        for store in STORES:
            for sku_code, sku_name, base_qty in SKUS:
                actual = base_qty + random.randint(-25, 15)
                actual = max(0, actual)
                scan_time = f"2026-06-30 {random.randint(18, 22)}:{random.randint(0, 59):02d}:00"
                writer.writerow([store, sku_code, actual, scan_time, "张三"])
    print(f"已生成：{path}")


def generate_transfer_json():
    transfers = []
    transfer_no = 1
    for i in range(8):
        store_idx = random.randint(0, len(STORES) - 1)
        to_store = STORES[store_idx]
        from_store = STORES[(store_idx + 1) % len(STORES)]
        sku = random.choice(SKUS)
        qty = random.randint(5, 30)

        if i < 2:
            transfer_time = "2026-06-30 23:30:00"
            arrive_time = "2026-07-01 08:00:00"
            status = "在途"
        else:
            transfer_time = f"2026-06-30 {random.randint(10, 16)}:{random.randint(0, 59):02d}:00"
            arrive_time = f"2026-06-30 {random.randint(14, 18)}:{random.randint(0, 59):02d}:00"
            status = "已入库"

        transfers.append({
            "transfer_no": f"TR{2026060000 + transfer_no}",
            "from_store": from_store,
            "to_store": to_store,
            "sku_code": sku[0],
            "transfer_qty": qty,
            "transfer_time": transfer_time,
            "arrive_time": arrive_time,
            "status": status,
        })
        transfer_no += 1

    path = os.path.join(OUT_DIR, "transfers.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"transfers": transfers}, f, ensure_ascii=False, indent=2)
    print(f"已生成：{path}")


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    random.seed(42)
    generate_stock_csv()
    generate_stocktake_csv()
    generate_transfer_json()
    print("\n测试数据生成完毕，目录：", OUT_DIR)
