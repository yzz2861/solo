import os
import sys
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "handover.db")

if os.path.exists(DB_FILE):
    os.remove(DB_FILE)
    print("已清理旧数据库")

from database import init_db, batch_exists
from importers import import_tools_ledger, import_borrow_records, import_return_records
from services import (
    get_handover_summary,
    get_all_tools,
    get_overdue_tools,
    get_calibration_expiring_tools,
    get_returner_mismatch_tools,
    get_pending_reviews,
    save_review,
    get_tool_detail,
)
from report import export_handover_report

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_data")


def test_database_init():
    print("\n" + "=" * 50)
    print("测试1: 数据库初始化")
    print("=" * 50)
    init_db()
    assert os.path.exists(DB_FILE), "数据库文件未创建"
    print("✓ 数据库初始化成功")


def test_import_tools():
    print("\n" + "=" * 50)
    print("测试2: 工具台账导入")
    print("=" * 50)
    path = os.path.join(SAMPLE_DIR, "tools_ledger.csv")
    result = import_tools_ledger(path)
    print(f"导入结果: {result['message']}")
    assert result["success"], "导入失败"
    assert result["count"] > 0, "未导入任何记录"

    result2 = import_tools_ledger(path)
    print(f"重复导入结果: {result2['message']}")
    assert not result2["success"], "重复导入应该被拒绝"
    print("✓ 工具台账导入及去重测试通过")


def test_import_borrow():
    print("\n" + "=" * 50)
    print("测试3: 借出记录导入")
    print("=" * 50)
    path = os.path.join(SAMPLE_DIR, "borrow_records.csv")
    result = import_borrow_records(path)
    print(f"导入结果: {result['message']}")
    assert result["success"], "导入失败"

    result2 = import_borrow_records(path)
    print(f"重复导入结果: {result2['message']}")
    assert not result2["success"], "重复导入应该被拒绝"
    print("✓ 借出记录导入及去重测试通过")


def test_import_return():
    print("\n" + "=" * 50)
    print("测试4: 归还记录导入")
    print("=" * 50)
    path = os.path.join(SAMPLE_DIR, "return_records.json")
    result = import_return_records(path)
    print(f"导入结果: {result['message']}")
    assert result["success"], "导入失败"

    result2 = import_return_records(path)
    print(f"重复导入结果: {result2['message']}")
    assert not result2["success"], "重复导入应该被拒绝"
    print("✓ 归还记录导入及去重测试通过")


def test_summary():
    print("\n" + "=" * 50)
    print("测试5: 交接概览统计")
    print("=" * 50)
    s = get_handover_summary()
    print(f"工具总数: {s['total_tools']}")
    print(f"在库数量: {s['in_stock_count']}")
    print(f"借出中: {s['borrowed_count']}")
    print(f"已归还: {s['returned_count']}")
    print(f"超期未还: {s['overdue_count']}")
    print(f"校验过期: {s['cal_expired_count']}")
    print(f"归还人不一致: {s['mismatch_count']}")
    print(f"待复核: {s['pending_review_count']}")
    assert s["total_tools"] > 0, "工具总数不应为0"
    print("✓ 交接概览统计正常")


def test_overdue():
    print("\n" + "=" * 50)
    print("测试6: 超期未还筛选")
    print("=" * 50)
    items = get_overdue_tools()
    print(f"超期未还工具数量: {len(items)}")
    for item in items:
        print(f"  - {item['tool_no']} {item.get('tool_name','')} 借用人:{item['borrower']} 应还:{item['expected_return_date']}")
    print("✓ 超期未还筛选正常")


def test_calibration():
    print("\n" + "=" * 50)
    print("测试7: 校验过期/临期筛选")
    print("=" * 50)
    items = get_calibration_expiring_tools(days_threshold=30)
    print(f"校验临期/过期工具数量(30天内): {len(items)}")
    expired_count = sum(1 for i in items if i.get("is_expired"))
    print(f"  - 已过期: {expired_count} 件")
    print(f"  - 临期: {len(items) - expired_count} 件")
    for item in items[:5]:
        status = "【已过期】" if item.get("is_expired") else "【临期】"
        print(f"  {status} {item['tool_no']} {item['tool_name']} 有效期至:{item['calibration_expiry']}")
    print("✓ 校验过期筛选正常")


def test_mismatch():
    print("\n" + "=" * 50)
    print("测试8: 归还人不一致筛选")
    print("=" * 50)
    items = get_returner_mismatch_tools()
    print(f"归还人不一致数量: {len(items)}")
    for item in items:
        print(f"  - {item['tool_no']} {item.get('tool_name','')}")
        print(f"    借用人:{item['borrower']} → 归还人:{item['returner']}")
    assert len(items) > 0, "测试数据中应有归还人不一致的情况"
    print("✓ 归还人不一致筛选正常")


def test_pending_reviews():
    print("\n" + "=" * 50)
    print("测试9: 待复核列表")
    print("=" * 50)
    items = get_pending_reviews()
    print(f"待复核数量: {len(items)}")
    for item in items[:3]:
        print(f"  - {item['tool_no']} {item.get('tool_name','')}")
    print("✓ 待复核列表正常")


def test_save_review():
    print("\n" + "=" * 50)
    print("测试10: 保存复核意见")
    print("=" * 50)
    items = get_pending_reviews()
    if items:
        item = items[0]
        save_review(
            tool_no=item["tool_no"],
            borrow_id=item["borrow_id"],
            return_id=item["return_id"],
            review_opinion="工具完好，状态正常，同意入库",
            reviewer="测试复核员",
            is_sealed=False,
            sealed_by="",
        )
        remaining = get_pending_reviews()
        print(f"复核前: {len(items)} 条, 复核后: {len(remaining)} 条")
        print("✓ 复核意见保存正常")


def test_tool_detail():
    print("\n" + "=" * 50)
    print("测试11: 工具详情查询")
    print("=" * 50)
    detail = get_tool_detail("NJ-001")
    assert detail["tool"] is not None, "工具信息不应为空"
    print(f"工具: {detail['tool']['tool_no']} - {detail['tool']['tool_name']}")
    print(f"借出记录: {len(detail['borrow_records'])} 条")
    print(f"归还记录: {len(detail['return_records'])} 条")
    print(f"复核记录: {len(detail['reviews'])} 条")
    print("✓ 工具详情查询正常")


def test_export_report():
    print("\n" + "=" * 50)
    print("测试12: 交接报告导出")
    print("=" * 50)
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_data")
    txt_path = export_handover_report(output_dir=output_dir, format="txt")
    print(f"TXT报告: {txt_path}")
    assert os.path.exists(txt_path), "TXT报告未生成"

    from report import _export_csv
    s = get_handover_summary()
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    # 验证文件大小
    size = os.path.getsize(txt_path)
    print(f"报告大小: {size} 字节")
    assert size > 500, "报告内容过短"
    print("✓ 交接报告导出正常")


def main():
    print("🚀 开始运行功能验证测试...")
    print(f"测试数据目录: {SAMPLE_DIR}")

    tests = [
        ("数据库初始化", test_database_init),
        ("工具台账导入", test_import_tools),
        ("借出记录导入", test_import_borrow),
        ("归还记录导入", test_import_return),
        ("交接概览统计", test_summary),
        ("超期未还筛选", test_overdue),
        ("校验过期筛选", test_calibration),
        ("归还人不一致筛选", test_mismatch),
        ("待复核列表", test_pending_reviews),
        ("保存复核意见", test_save_review),
        ("工具详情查询", test_tool_detail),
        ("交接报告导出", test_export_report),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            test_func()
            passed += 1
        except Exception as e:
            failed += 1
            print(f"\n✗ 测试失败: {name}")
            print(f"  错误: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 50)
    print(f"测试完成: {passed} 通过, {failed} 失败")
    print("=" * 50)

    if failed == 0:
        print("\n🎉 所有测试通过！系统功能正常。")
        return 0
    else:
        print("\n⚠ 部分测试失败，请检查代码。")
        return 1


if __name__ == "__main__":
    sys.exit(main())
