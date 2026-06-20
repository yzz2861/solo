import os
import tempfile
from unittest import TestCase

from inventory_allocate.algorithm import AllocationAlgorithm
from inventory_allocate.exporter import ResultExporter
from inventory_allocate.models import ProcessResult
from inventory_allocate.preprocess import DataPreprocessor


class TestIntegration(TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.examples_dir = os.path.join(
            os.path.dirname(__file__), "..", "examples"
        )

    def test_full_flow(self):
        examples_dir = os.path.abspath(self.examples_dir)

        shortage_file = os.path.join(examples_dir, "shortage.csv")
        stock_file = os.path.join(examples_dir, "stock.csv")
        transport_file = os.path.join(examples_dir, "transport_days.csv")
        safety_file = os.path.join(examples_dir, "safety_stock.csv")
        sku_alias_file = os.path.join(examples_dir, "sku_alias.csv")

        self.assertTrue(os.path.exists(shortage_file))
        self.assertTrue(os.path.exists(stock_file))

        sku_aliases = DataPreprocessor.load_sku_alias(sku_alias_file)
        preprocessor = DataPreprocessor(sku_aliases)

        shortages, shortage_result = preprocessor.load_shortage(shortage_file)
        stocks, stock_result = preprocessor.load_stock(stock_file)
        routes = preprocessor.load_transport(transport_file)
        safety_stocks = preprocessor.load_safety_stock(safety_file)

        self.assertGreater(len(shortages), 0)
        self.assertGreater(len(stocks), 0)
        self.assertGreater(len(routes), 0)

        process_result = ProcessResult()
        process_result.warnings.extend(shortage_result.warnings + stock_result.warnings)
        process_result.duplicate_records.extend(
            shortage_result.duplicate_records + stock_result.duplicate_records
        )
        process_result.unmatched_skus.extend(
            shortage_result.unmatched_skus + stock_result.unmatched_skus
        )

        safety_map = {}
        for s in safety_stocks:
            canonical = preprocessor.normalize_sku(s.sku)
            safety_map[canonical] = s.safety_qty

        self_allocations, self_unmet, remaining_shortages = (
            preprocessor.process_self_allocation(
                shortages, stocks, safety_map, process_result
            )
        )

        algorithm = AllocationAlgorithm()
        allocations, unmet_records = algorithm.match(
            remaining_shortages, stocks, routes, safety_map, process_result
        )

        all_allocations = self_allocations + allocations
        all_unmet = self_unmet + unmet_records

        self.assertGreater(len(all_allocations), 0)

        total_shortage = sum(r.shortage_qty for r in all_unmet)
        total_allocated = sum(a.suggested_qty for a in all_allocations)
        total_unmet = sum(r.unmet_qty for r in all_unmet)

        self.assertGreater(total_shortage, 0)
        self.assertGreater(total_allocated, 0)

        from datetime import datetime
        from inventory_allocate.models import BatchInfo

        batch_info = BatchInfo(
            batch_id="TEST-001",
            created_at=datetime.now(),
            shortage_file=shortage_file,
            stock_file=stock_file,
            transport_file=transport_file,
            safety_file=safety_file,
            sku_alias_file=sku_alias_file,
            total_shortage_qty=total_shortage,
            total_allocated_qty=total_allocated,
            total_unmet_qty=total_unmet,
            fill_rate=total_allocated / total_shortage if total_shortage > 0 else 0,
            status="generated",
        )

        exporter = ResultExporter(self.temp_dir)
        result_files = exporter.export_all(
            all_allocations, all_unmet, process_result, batch_info
        )

        self.assertTrue(os.path.exists(result_files["allocation_plan"]))
        self.assertTrue(os.path.exists(result_files["shortage_report"]))
        self.assertTrue(os.path.exists(result_files["batch_info"]))

        loaded_batch = ResultExporter.load_batch_info(self.temp_dir)
        self.assertEqual(loaded_batch.batch_id, "TEST-001")

        loaded_allocations = ResultExporter.load_allocations(self.temp_dir)
        self.assertEqual(len(loaded_allocations), len(all_allocations))
