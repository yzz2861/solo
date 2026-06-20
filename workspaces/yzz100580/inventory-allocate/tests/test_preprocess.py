import os
import tempfile
from unittest import TestCase

from inventory_allocate.models import SkuAlias
from inventory_allocate.preprocess import DataPreprocessor


class TestDataPreprocessor(TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        sku_aliases = [
            SkuAlias(sku_alias="可乐", canonical_sku="p001"),
            SkuAlias(sku_alias="可口可乐", canonical_sku="p001"),
        ]
        self.preprocessor = DataPreprocessor(sku_aliases)

    def test_sku_normalization(self):
        self.assertEqual(self.preprocessor.normalize_sku("可乐"), "p001")
        self.assertEqual(self.preprocessor.normalize_sku("可口可乐"), "p001")
        self.assertEqual(self.preprocessor.normalize_sku("P001"), "P001")
        self.assertEqual(self.preprocessor.normalize_sku("未知SKU"), "未知SKU")

    def test_load_shortage_basic(self):
        csv_content = """store_id,store_name,sku,sku_name,shortage_qty,priority
S001,东门店铺,P001,可乐330ml,50,2
S001,东门店铺,可乐,可乐,15,1
"""
        file_path = os.path.join(self.temp_dir, "shortage.csv")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(csv_content)

        records, result = self.preprocessor.load_shortage(file_path)

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].store_id, "S001")
        self.assertEqual(records[0].canonical_sku, "p001")
        self.assertEqual(records[0].shortage_qty, 65)

    def test_load_shortage_duplicate(self):
        csv_content = """store_id,store_name,sku,sku_name,shortage_qty
S001,东门店铺,P001,可乐330ml,50
S001,东门店铺,P001,可乐330ml,30
"""
        file_path = os.path.join(self.temp_dir, "shortage.csv")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(csv_content)

        records, result = self.preprocessor.load_shortage(file_path)

        self.assertEqual(len(records), 1)
        self.assertEqual(len(result.duplicate_records), 1)

    def test_detect_self_allocation(self):
        from inventory_allocate.models import ShortageRecord, StockRecord

        shortages = [
            ShortageRecord(
                store_id="S001", store_name="东门", sku="P001",
                sku_name="可乐", shortage_qty=50, canonical_sku="p001"
            )
        ]
        stocks = [
            StockRecord(
                store_id="S001", store_name="东门", sku="P001",
                sku_name="可乐", stock_qty=100, canonical_sku="p001", available_qty=100
            ),
            StockRecord(
                store_id="S002", store_name="西门", sku="P001",
                sku_name="可乐", stock_qty=200, canonical_sku="p001", available_qty=200
            ),
        ]

        self_allocations = self.preprocessor.detect_self_allocation(shortages, stocks)
        self.assertEqual(len(self_allocations), 1)
        self.assertEqual(self_allocations[0][0].store_id, "S001")
