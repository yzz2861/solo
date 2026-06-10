"""
示例数据生成器
生成演示用的波次CSV、复核JSON、短拣补录CSV
"""
import csv
import json
import os
import random
from datetime import datetime, timedelta


def generate_sample_data(output_dir: str, seed: int = 42):
    """生成示例数据"""
    random.seed(seed)
    os.makedirs(output_dir, exist_ok=True)

    skus = [
        ('SKU001', '无线蓝牙耳机'),
        ('SKU002', '手机快充充电器'),
        ('SKU003', '蓝牙音箱便携版'),
        ('SKU004', '智能手环运动版'),
        ('SKU005', 'USB-C数据线2米'),
        ('SKU006', '手机壳透明款'),
        ('SKU007', '无线鼠标静音版'),
        ('SKU008', '机械键盘青轴'),
        ('SKU009', '平板电脑支架'),
        ('SKU010', '充电宝20000mAh'),
        ('SKU011', '耳机收纳盒'),
        ('SKU012', '手机贴膜高清'),
        ('SKU013', '车载手机支架'),
        ('SKU014', '笔记本散热器'),
        ('SKU015', '移动硬盘1TB'),
    ]

    pickers = ['张三', '李四', '王五', '赵六', '钱七']
    reviewers = ['陈A', '林B', '黄C', '周D']
    warehouses = ['A仓-1区', 'A仓-2区', 'B仓-1区']

    wave_nos = ['W2026060801', 'W2026060802', 'W2026060803', 'W2026060804', 'W2026060805']

    wave_records = []
    review_records = []
    supplement_records = []

    for wave_idx, wave_no in enumerate(wave_nos):
        wave_time = datetime(2026, 6, 8, 20, 0) + timedelta(hours=wave_idx)
        sku_count = random.randint(6, 10)
        selected_skus = random.sample(skus, sku_count)

        for sku_code, sku_name in selected_skus:
            qty_expected = random.randint(5, 30)
            picker = random.choice(pickers)
            warehouse = random.choice(warehouses)

            wave_records.append({
                'wave_no': wave_no,
                'sku': sku_code,
                'sku_name': sku_name,
                'qty_expected': qty_expected,
                'picker': picker,
                'warehouse': warehouse,
                'create_time': wave_time.strftime('%Y-%m-%d %H:%M:%S'),
            })

            short_prob = random.random()
            if short_prob < 0.15:
                qty_picked = qty_expected - random.randint(1, min(3, qty_expected))
            elif short_prob < 0.2:
                qty_picked = qty_expected + random.randint(1, 2)
            else:
                qty_picked = qty_expected

            reviewer_count = 1 if random.random() > 0.2 else random.randint(2, 3)
            selected_reviewers = random.sample(reviewers, reviewer_count)

            qty_per_reviewer = qty_picked // reviewer_count
            remainder = qty_picked % reviewer_count

            for rev_idx, reviewer in enumerate(selected_reviewers):
                rev_qty = qty_per_reviewer + (1 if rev_idx < remainder else 0)
                if rev_qty <= 0:
                    continue
                review_time = wave_time + timedelta(minutes=random.randint(10, 60))
                review_records.append({
                    'wave_no': wave_no,
                    'sku': sku_code,
                    'qty_picked': rev_qty,
                    'reviewer': reviewer,
                    'review_time': review_time.strftime('%Y-%m-%d %H:%M:%S'),
                    'container_no': f'CON{random.randint(1000, 9999)}',
                })

            qty_short = max(0, qty_expected - qty_picked)
            if qty_short > 0 and random.random() < 0.6:
                qty_supplemented = random.randint(1, qty_short)
                supplement_records.append({
                    'wave_no': wave_no,
                    'sku': sku_code,
                    'qty_supplemented': qty_supplemented,
                    'supplement_time': (wave_time + timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S'),
                    'operator': random.choice(pickers),
                    'reason': random.choice(['货架补货', '其他库区调货', '紧急补货']),
                })

    wave_csv_path = os.path.join(output_dir, 'wave_data.csv')
    with open(wave_csv_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'wave_no', 'sku', 'sku_name', 'qty_expected',
            'picker', 'warehouse', 'create_time'
        ])
        writer.writeheader()
        writer.writerows(wave_records)

    review_json_path = os.path.join(output_dir, 'review_data.json')
    with open(review_json_path, 'w', encoding='utf-8') as f:
        json.dump(review_records, f, ensure_ascii=False, indent=2)

    supplement_csv_path = os.path.join(output_dir, 'supplement_data.csv')
    with open(supplement_csv_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'wave_no', 'sku', 'qty_supplemented',
            'supplement_time', 'operator', 'reason'
        ])
        writer.writeheader()
        writer.writerows(supplement_records)

    print(f"生成示例数据完成:")
    print(f"  波次CSV: {wave_csv_path} ({len(wave_records)}条)")
    print(f"  复核JSON: {review_json_path} ({len(review_records)}条)")
    print(f"  短拣补录CSV: {supplement_csv_path} ({len(supplement_records)}条)")

    return wave_csv_path, review_json_path, supplement_csv_path


if __name__ == '__main__':
    generate_sample_data(os.path.join(os.path.dirname(__file__), '..', 'data'))
