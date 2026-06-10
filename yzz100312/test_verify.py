#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
功能验证脚本：测试导入、去重、差异计算、复核、导出
"""
import os
import sys
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import init_db, DB_PATH, get_all_batches, check_batch_exists, compute_file_hash
from importer import import_stock_csv, import_stocktake_csv, import_transfer_json
from diff_engine import compute_diff, save_review, get_diff_summary, export_store_report

TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_data")


def reset_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    init_db()
    print("[OK] 数据库已初始化")


def test_import_and_dedup():
    print("\n=== 测试 1: 数据导入与去重 ===")

    stock_path = os.path.join(TEST_DIR, "stock_ledger.csv")
    result = import_stock_csv(stock_path)
    print(f"  库存导入: {result['message']}")
    assert result["success"] is True, "首次导入应该成功"

    result2 = import_stock_csv(stock_path)
    print(f"  重复导入: {result2['message']}")
    assert result2["success"] is False, "重复导入应该被拒绝"
    assert result2["batch_id"] is None, "重复导入不应返回新batch_id"

    stocktake_path = os.path.join(TEST_DIR, "stocktake_scan.csv")
    r3 = import_stocktake_csv(stocktake_path)
    print(f"  盘点导入: {r3['message']}")
    assert r3["success"] is True

    r4 = import_stocktake_csv(stocktake_path)
    print(f"  盘点重复导入: {r4['message']}")
    assert r4["success"] is False

    transfer_path = os.path.join(TEST_DIR, "transfers.json")
    r5 = import_transfer_json(transfer_path)
    print(f"  调拨导入: {r5['message']}")
    assert r5["success"] is True

    r6 = import_transfer_json(transfer_path)
    print(f"  调拨重复导入: {r6['message']}")
    assert r6["success"] is False

    batches = get_all_batches()
    print(f"  当前批次数量: {len(batches)}")
    assert len(batches) == 3, f"应该只有3个有效批次，实际{len(batches)}个"

    print("[OK] 导入与去重测试通过")


def test_diff_computation():
    print("\n=== 测试 2: 差异计算 ===")

    diffs = compute_diff(store_code="S001")
    print(f"  门店S001 SKU数: {len(diffs)}")
    assert len(diffs) > 0, "应该有差异数据"

    for d in diffs[:3]:
        print(f"    {d['sku_code']}: 账面={d['book_qty']}, 实盘={d['actual_qty']}, "
              f"净调拨={d['net_transfer_qty']}, 差异={d['diff_qty']}, "
              f"负库存={d['negative_stock']}, 调拨晚到={d['late_transfer']}")

    has_neg = any(d["negative_stock"] for d in diffs)
    print(f"  存在负库存: {has_neg}")

    diffs_filtered = compute_diff(store_code="S001", filters={"negative_stock": True})
    print(f"  负库存筛选结果数: {len(diffs_filtered)}")
    assert len(diffs_filtered) >= 1, "应该有负库存记录"

    diffs_late = compute_diff(store_code="S001", filters={"late_transfer": True})
    print(f"  调拨晚到筛选结果数: {len(diffs_late)}")

    diffs_diff = compute_diff(store_code="S001", filters={"has_diff": True})
    print(f"  有差异的SKU数: {len(diffs_diff)}")

    print("[OK] 差异计算测试通过")


def test_review():
    print("\n=== 测试 3: 复核意见 ===")

    diffs = compute_diff(store_code="S001", filters={"has_diff": True})
    assert len(diffs) > 0
    sku = diffs[0]["sku_code"]
    store = "S001"

    r1 = save_review(store, sku, "漏盘，已核实", "督导A")
    print(f"  首次保存: {r1}")
    assert r1["success"] is True
    assert r1.get("modified", False) is False

    r2 = save_review(store, sku, "录单错误，已修正", "督导B")
    print(f"  改写意见: {r2}")
    assert r2["success"] is True
    assert r2.get("modified") is True, "改写应该标记为modified"

    r3 = save_review(store, sku, "录单错误，已修正", "督导B")
    print(f"  内容相同保存: {r3}")
    assert r3.get("modified") is False, "相同内容不应算修改"

    diffs_after = compute_diff(store_code="S001", filters={"review_modified": True})
    modified_count = sum(1 for d in diffs_after if d["sku_code"] == sku)
    print(f"  被改写筛选命中: {modified_count}")
    assert modified_count >= 1, "应该能筛选出被改写的记录"

    for d in diffs_after:
        if d["sku_code"] == sku:
            print(f"    原始意见: {d.get('original_opinion')}, 当前: {d.get('review_opinion')}")
            assert d.get("original_opinion") == "漏盘，已核实", "原始意见应该被保留"
            break

    print("[OK] 复核测试通过")


def test_summary_and_export():
    print("\n=== 测试 4: 汇总与导出 ===")

    summaries = get_diff_summary()
    print(f"  门店汇总数: {len(summaries)}")
    for s in summaries:
        print(f"    {s['store_code']}: SKU={s['sku_count']}, 差异SKU={s['diff_sku_count']}, "
              f"负库存={s['negative_stock_count']}, 晚到={s['late_transfer_count']}, "
              f"被改写={s['review_modified_count']}, 未复核={s['no_review_count']}")

    out_path = os.path.join(TEST_DIR, "S001_report.csv")
    count = export_store_report("S001", out_path)
    print(f"  导出门店S001报告: {count} 条 -> {out_path}")
    assert count > 0
    assert os.path.exists(out_path)

    with open(out_path, "r", encoding="utf-8-sig") as f:
        lines = f.readlines()
    print(f"  报告行数: {len(lines)} (含表头)")
    assert len(lines) == count + 1

    print("[OK] 汇总与导出测试通过")


def main():
    print("=" * 50)
    print("盘点差异管理工具 - 功能验证")
    print("=" * 50)

    try:
        reset_db()
        test_import_and_dedup()
        test_diff_computation()
        test_review()
        test_summary_and_export()

        print("\n" + "=" * 50)
        print("✓ 所有测试通过！")
        print("=" * 50)
        return 0
    except AssertionError as e:
        print(f"\n✗ 断言失败: {e}")
        import traceback
        traceback.print_exc()
        return 1
    except Exception as e:
        print(f"\n✗ 异常: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
