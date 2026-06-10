"""核心逻辑单元测试"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cold_chain_manager.app.store import DataStore
from cold_chain_manager.app.importer import (
    import_inventory_csv, import_borrow_csv, import_return_json
)
from cold_chain_manager.app.exporter import export_report_csv, export_report_html
from cold_chain_manager.app.models import BoxStatus, ReviewResult


DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_data")


def test_import_inventory():
    store = DataStore()
    filepath = os.path.join(DATA_DIR, "inventory.csv")
    added, skipped = import_inventory_csv(filepath, store)
    assert added == 8, f"台账导入应为8条，实际{added}"
    assert skipped == 0
    assert len(store.all_boxes) == 8
    print("✓ 台账导入测试通过")

    added2, skipped2 = import_inventory_csv(filepath, store)
    assert added2 == 0, "重复导入应返回0"
    print("✓ 台账去重测试通过")


def test_import_borrow():
    store = DataStore()
    filepath = os.path.join(DATA_DIR, "borrow_records.csv")
    added, skipped = import_borrow_csv(filepath, store)
    assert added == 5, f"借出导入应为5条，实际{added}"
    assert skipped == 0
    assert len(store.all_boxes) == 5
    assert all(b.status == BoxStatus.BORROWED for b in store.all_boxes)
    print("✓ 借出记录导入测试通过")

    added2, skipped2 = import_borrow_csv(filepath, store)
    assert added2 == 0, "重复导入应返回0"
    print("✓ 借出记录去重测试通过")


def test_import_return():
    store = DataStore()
    filepath = os.path.join(DATA_DIR, "return_temperatures.json")
    added, skipped = import_return_json(filepath, store)
    assert added == 5, f"回收导入应为5条，实际{added}"
    assert skipped == 0
    assert len(store.all_boxes) == 5
    print("✓ 回收温度导入测试通过")

    added2, skipped2 = import_return_json(filepath, store)
    assert added2 == 0, "重复导入应返回0"
    print("✓ 回收温度去重测试通过")


def test_status_flow():
    store = DataStore()
    import_inventory_csv(os.path.join(DATA_DIR, "inventory.csv"), store)
    import_borrow_csv(os.path.join(DATA_DIR, "borrow_records.csv"), store)
    import_return_json(os.path.join(DATA_DIR, "return_temperatures.json"), store)

    boxes = store.all_boxes
    box_ids = {b.box_id for b in boxes}
    assert "CC-001" in box_ids
    assert "CC-002" in box_ids
    assert "CC-003" in box_ids

    cc001 = store.get_box("CC-001")
    assert cc001.status == BoxStatus.RETURNED
    assert cc001.borrow is not None
    assert cc001.return_record is not None
    assert cc001.borrow.borrower == cc001.return_record.returner
    assert cc001.returner_mismatch is False
    print("✓ 状态流转测试通过")

    cc003 = store.get_box("CC-003")
    assert cc003.batch_missing is True
    assert cc003.returner_mismatch is True
    assert cc003.has_issues is True
    print("✓ 异常检测测试通过")

    cc006 = store.get_box("CC-006")
    assert cc006.has_overtemp is True
    print("✓ 超温检测测试通过")


def test_filters():
    store = DataStore()
    import_inventory_csv(os.path.join(DATA_DIR, "inventory.csv"), store)
    import_borrow_csv(os.path.join(DATA_DIR, "borrow_records.csv"), store)
    import_return_json(os.path.join(DATA_DIR, "return_temperatures.json"), store)

    overtemp = store.filter_boxes(overtemp_only=True)
    assert len(overtemp) == 2, f"超温筛选应为2个，实际{len(overtemp)}"
    print("✓ 超温筛选测试通过")

    mismatch = store.filter_boxes(returner_mismatch_only=True)
    assert len(mismatch) == 1
    print("✓ 回收人不一致筛选测试通过")

    batch_missing = store.filter_boxes(batch_missing_only=True)
    assert len(batch_missing) == 1
    print("✓ 批号缺失筛选测试通过")

    issues = store.filter_boxes(has_issues_only=True)
    assert len(issues) >= 2
    print("✓ 异常综合筛选测试通过")

    returned = store.filter_boxes(status=BoxStatus.RETURNED)
    assert len(returned) >= 1
    print("✓ 状态筛选测试通过")

    keyword = store.filter_boxes(keyword="CC-001")
    assert len(keyword) == 1
    assert keyword[0].box_id == "CC-001"
    print("✓ 关键字搜索测试通过")


def test_review():
    store = DataStore()
    import_inventory_csv(os.path.join(DATA_DIR, "inventory.csv"), store)
    import_borrow_csv(os.path.join(DATA_DIR, "borrow_records.csv"), store)
    import_return_json(os.path.join(DATA_DIR, "return_temperatures.json"), store)

    store.set_review("CC-001", ReviewResult.NORMAL, "温度正常，放行", "李主管")
    box = store.get_box("CC-001")
    assert box.review_result == ReviewResult.NORMAL
    assert box.review_comment == "温度正常，放行"
    assert box.reviewer == "李主管"
    assert box.status == BoxStatus.REVIEWED
    print("✓ 复核正常测试通过")

    store.set_review("CC-006", ReviewResult.ISOLATED, "超温严重，隔离待查", "李主管")
    box2 = store.get_box("CC-006")
    assert box2.review_result == ReviewResult.ISOLATED
    assert box2.status == BoxStatus.ISOLATED
    print("✓ 隔离复核测试通过")


def test_export():
    store = DataStore()
    import_inventory_csv(os.path.join(DATA_DIR, "inventory.csv"), store)
    import_borrow_csv(os.path.join(DATA_DIR, "borrow_records.csv"), store)
    import_return_json(os.path.join(DATA_DIR, "return_temperatures.json"), store)
    store.set_review("CC-001", ReviewResult.NORMAL, "正常", "测试员")

    with tempfile.TemporaryDirectory() as tmp:
        csv_path = os.path.join(tmp, "test.csv")
        export_report_csv(store.all_boxes, csv_path)
        assert os.path.exists(csv_path)
        assert os.path.getsize(csv_path) > 0
        print("✓ CSV 导出测试通过")

        html_path = os.path.join(tmp, "test.html")
        export_report_html(store.all_boxes, html_path)
        assert os.path.exists(html_path)
        assert os.path.getsize(html_path) > 0
        with open(html_path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "冷链药箱交接报告" in content
        assert "CC-001" in content
        print("✓ HTML 导出测试通过")


def test_stats():
    store = DataStore()
    import_inventory_csv(os.path.join(DATA_DIR, "inventory.csv"), store)
    import_borrow_csv(os.path.join(DATA_DIR, "borrow_records.csv"), store)
    import_return_json(os.path.join(DATA_DIR, "return_temperatures.json"), store)

    s = store.stats()
    assert s["total"] > 0
    assert s["overtemp"] >= 1
    assert s["issues"] >= 1
    print("✓ 统计数据测试通过")


def run_all_tests():
    print("=" * 50)
    print("开始运行核心逻辑测试...")
    print("=" * 50)

    tests = [
        test_import_inventory,
        test_import_borrow,
        test_import_return,
        test_status_flow,
        test_filters,
        test_review,
        test_export,
        test_stats,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"✗ {test.__name__} 失败: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {test.__name__} 异常: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("=" * 50)
    print(f"测试完成: {passed} 通过, {failed} 失败")
    print("=" * 50)
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
