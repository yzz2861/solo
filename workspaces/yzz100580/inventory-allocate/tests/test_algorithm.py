from unittest import TestCase

from inventory_allocate.algorithm import AllocationAlgorithm
from inventory_allocate.models import (
    ProcessResult,
    ShortageRecord,
    StockRecord,
    TransportRoute,
    UnmetReason,
)


class TestAllocationAlgorithm(TestCase):
    def setUp(self):
        self.algorithm = AllocationAlgorithm(
            max_transport_days=7,
            min_transfer_qty=1,
        )

    def test_basic_matching(self):
        shortages = [
            ShortageRecord(
                store_id="S001", store_name="东门", sku="P001",
                sku_name="可乐", shortage_qty=50, canonical_sku="p001", priority=1
            )
        ]
        stocks = [
            StockRecord(
                store_id="S002", store_name="西门", sku="P001",
                sku_name="可乐", stock_qty=100, canonical_sku="p001", available_qty=100
            )
        ]
        routes = [
            TransportRoute(from_store="S002", to_store="S001", transport_days=1)
        ]
        safety_map = {"p001": 20}
        process_result = ProcessResult()

        allocations, unmet = self.algorithm.match(
            shortages, stocks, routes, safety_map, process_result
        )

        self.assertEqual(len(allocations), 1)
        self.assertEqual(allocations[0].from_store_id, "S002")
        self.assertEqual(allocations[0].to_store_id, "S001")
        self.assertEqual(allocations[0].suggested_qty, 50)
        self.assertEqual(stocks[0].available_qty, 50)

    def test_safety_stock_constraint(self):
        shortages = [
            ShortageRecord(
                store_id="S001", store_name="东门", sku="P001",
                sku_name="可乐", shortage_qty=100, canonical_sku="p001", priority=1
            )
        ]
        stocks = [
            StockRecord(
                store_id="S002", store_name="西门", sku="P001",
                sku_name="可乐", stock_qty=60, canonical_sku="p001", available_qty=60
            )
        ]
        routes = [
            TransportRoute(from_store="S002", to_store="S001", transport_days=1)
        ]
        safety_map = {"p001": 20}
        process_result = ProcessResult()

        allocations, unmet = self.algorithm.match(
            shortages, stocks, routes, safety_map, process_result
        )

        self.assertEqual(len(allocations), 1)
        self.assertEqual(allocations[0].suggested_qty, 40)
        self.assertEqual(len(unmet), 1)
        self.assertEqual(unmet[0].unmet_qty, 60)

    def test_transport_days_constraint(self):
        shortages = [
            ShortageRecord(
                store_id="S001", store_name="东门", sku="P001",
                sku_name="可乐", shortage_qty=50, canonical_sku="p001", priority=1
            )
        ]
        stocks = [
            StockRecord(
                store_id="S002", store_name="西门", sku="P001",
                sku_name="可乐", stock_qty=100, canonical_sku="p001", available_qty=100
            )
        ]
        routes = [
            TransportRoute(from_store="S002", to_store="S001", transport_days=10)
        ]
        safety_map = {"p001": 20}
        process_result = ProcessResult()

        allocations, unmet = self.algorithm.match(
            shortages, stocks, routes, safety_map, process_result
        )

        self.assertEqual(len(allocations), 0)
        self.assertEqual(len(unmet), 1)
        self.assertEqual(unmet[0].reason, UnmetReason.INSUFFICIENT_STOCK)

    def test_multiple_suppliers_priority(self):
        shortages = [
            ShortageRecord(
                store_id="S001", store_name="东门", sku="P001",
                sku_name="可乐", shortage_qty=80, canonical_sku="p001", priority=1
            )
        ]
        stocks = [
            StockRecord(
                store_id="S002", store_name="西门近", sku="P001",
                sku_name="可乐", stock_qty=50, canonical_sku="p001", available_qty=50
            ),
            StockRecord(
                store_id="S003", store_name="南门远", sku="P001",
                sku_name="可乐", stock_qty=100, canonical_sku="p001", available_qty=100
            ),
        ]
        routes = [
            TransportRoute(from_store="S002", to_store="S001", transport_days=1),
            TransportRoute(from_store="S003", to_store="S001", transport_days=3),
        ]
        safety_map = {"p001": 10}
        process_result = ProcessResult()

        allocations, unmet = self.algorithm.match(
            shortages, stocks, routes, safety_map, process_result
        )

        self.assertEqual(len(allocations), 2)
        self.assertEqual(allocations[0].from_store_id, "S002")
        self.assertEqual(allocations[0].suggested_qty, 40)
        self.assertEqual(allocations[1].from_store_id, "S003")
        self.assertEqual(allocations[1].suggested_qty, 40)
