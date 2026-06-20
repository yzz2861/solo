from __future__ import annotations

import logging
from typing import Dict, List, Tuple

from .models import (
    AllocationItem,
    ProcessResult,
    ShortageRecord,
    StockRecord,
    TransportRoute,
    UnmetReason,
    UnmetRecord,
)

logger = logging.getLogger(__name__)


class AllocationAlgorithm:
    def __init__(
        self,
        max_transport_days: int = 7,
        min_transfer_qty: int = 1,
    ):
        self.max_transport_days = max_transport_days
        self.min_transfer_qty = min_transfer_qty
        self.allocation_counter = 0

    def _generate_allocation_id(self) -> str:
        self.allocation_counter += 1
        return f"ALLOC-{self.allocation_counter:06d}"

    def _build_transport_map(
        self,
        routes: List[TransportRoute],
    ) -> Dict[Tuple[str, str], int]:
        transport_map: Dict[Tuple[str, str], int] = {}
        for route in routes:
            key = (route.from_store, route.to_store)
            transport_map[key] = route.transport_days
        return transport_map

    def _build_stock_by_sku(
        self,
        stocks: List[StockRecord],
    ) -> Dict[str, List[StockRecord]]:
        stock_by_sku: Dict[str, List[StockRecord]] = {}
        for stock in stocks:
            if stock.canonical_sku not in stock_by_sku:
                stock_by_sku[stock.canonical_sku] = []
            stock_by_sku[stock.canonical_sku].append(stock)
        return stock_by_sku

    def _sort_shortages(
        self,
        shortages: List[ShortageRecord],
        transport_map: Dict[Tuple[str, str], int],
        stock_by_sku: Dict[str, List[StockRecord]],
    ) -> List[ShortageRecord]:
        def sort_key(shortage: ShortageRecord) -> Tuple[int, int, int]:
            priority_score = -shortage.priority

            sku_stocks = stock_by_sku.get(shortage.canonical_sku, [])
            min_days = self.max_transport_days + 1
            for stock in sku_stocks:
                if stock.store_id == shortage.store_id:
                    continue
                days = transport_map.get(
                    (stock.store_id, shortage.store_id),
                    self.max_transport_days + 1,
                )
                if days < min_days:
                    min_days = days

            return (priority_score, min_days, -shortage.shortage_qty)

        return sorted(shortages, key=sort_key)

    def _get_sorted_suppliers(
        self,
        shortage: ShortageRecord,
        sku_stocks: List[StockRecord],
        transport_map: Dict[Tuple[str, str], int],
        safety_map: Dict[str, int],
    ) -> List[Tuple[StockRecord, int, int]]:
        suppliers = []
        safety_qty = safety_map.get(shortage.canonical_sku, 0)

        for stock in sku_stocks:
            if stock.store_id == shortage.store_id:
                continue

            if stock.available_qty <= safety_qty:
                continue

            transport_days = transport_map.get(
                (stock.store_id, shortage.store_id),
                self.max_transport_days + 1,
            )

            if transport_days > self.max_transport_days:
                continue

            available_for_transfer = max(0, stock.available_qty - safety_qty)
            if available_for_transfer < self.min_transfer_qty:
                continue

            suppliers.append((stock, transport_days, available_for_transfer))

        suppliers.sort(key=lambda x: (x[1], -x[2]))
        return suppliers

    def match(
        self,
        shortages: List[ShortageRecord],
        stocks: List[StockRecord],
        routes: List[TransportRoute],
        safety_stocks: Dict[str, int],
        process_result: ProcessResult,
    ) -> Tuple[List[AllocationItem], List[UnmetRecord]]:
        transport_map = self._build_transport_map(routes)
        stock_by_sku = self._build_stock_by_sku(stocks)
        sorted_shortages = self._sort_shortages(
            shortages, transport_map, stock_by_sku
        )

        allocations: List[AllocationItem] = []
        unmet_records: List[UnmetRecord] = []
        store_names: Dict[str, str] = {}

        for s in stocks:
            store_names[s.store_id] = s.store_name
        for s in shortages:
            store_names[s.store_id] = s.store_name

        for shortage in sorted_shortages:
            original_shortage_qty = shortage.shortage_qty
            total_fulfilled = 0

            if shortage.canonical_sku not in stock_by_sku:
                unmet_records.append(UnmetRecord(
                    store_id=shortage.store_id,
                    store_name=shortage.store_name,
                    sku=shortage.sku,
                    sku_name=shortage.sku_name,
                    canonical_sku=shortage.canonical_sku,
                    shortage_qty=original_shortage_qty,
                    fulfilled_qty=0,
                    unmet_qty=original_shortage_qty,
                    reason=UnmetReason.INSUFFICIENT_STOCK,
                    detail="无可用库存",
                ))
                continue

            sku_stocks = stock_by_sku[shortage.canonical_sku]
            suppliers = self._get_sorted_suppliers(
                shortage, sku_stocks, transport_map, safety_stocks
            )

            if not suppliers:
                reason = UnmetReason.INSUFFICIENT_STOCK
                detail = "所有可调库存扣除安全库存后不足以调拨"

                if sku_stocks:
                    available_stores = []
                    for s in sku_stocks:
                        if s.store_id == shortage.store_id:
                            continue
                        days = transport_map.get(
                            (s.store_id, shortage.store_id),
                            self.max_transport_days + 1,
                        )
                        if days > self.max_transport_days:
                            available_stores.append(
                                f"{s.store_name}(运输{days}天超限制)"
                            )
                        else:
                            safety = safety_stocks.get(shortage.canonical_sku, 0)
                            available = max(0, s.available_qty - safety)
                            if available < self.min_transfer_qty:
                                available_stores.append(
                                    f"{s.store_name}(可调{available}件<最小调拨{self.min_transfer_qty}件)"
                                )
                    if available_stores:
                        detail = f"无法调拨原因: {', '.join(available_stores)}"

                all_routes = [
                    k for k in transport_map.keys()
                    if k[1] == shortage.store_id
                ]
                if not all_routes:
                    reason = UnmetReason.NO_TRANSPORT_ROUTE
                    detail = "无到达该门店的运输路线"

                unmet_records.append(UnmetRecord(
                    store_id=shortage.store_id,
                    store_name=shortage.store_name,
                    sku=shortage.sku,
                    sku_name=shortage.sku_name,
                    canonical_sku=shortage.canonical_sku,
                    shortage_qty=original_shortage_qty,
                    fulfilled_qty=0,
                    unmet_qty=original_shortage_qty,
                    reason=reason,
                    detail=detail,
                ))
                continue

            remaining_qty = shortage.shortage_qty

            for stock, transport_days, available_for_transfer in suppliers:
                if remaining_qty <= 0:
                    break

                transfer_qty = min(remaining_qty, available_for_transfer)

                if transfer_qty < self.min_transfer_qty:
                    continue

                alloc = AllocationItem(
                    allocation_id=self._generate_allocation_id(),
                    from_store_id=stock.store_id,
                    from_store_name=stock.store_name,
                    to_store_id=shortage.store_id,
                    to_store_name=shortage.store_name,
                    sku=stock.sku,
                    sku_name=stock.sku_name,
                    canonical_sku=shortage.canonical_sku,
                    suggested_qty=transfer_qty,
                    transport_days=transport_days,
                    priority=shortage.priority,
                    status="pending",
                )
                allocations.append(alloc)

                stock.available_qty -= transfer_qty
                remaining_qty -= transfer_qty
                total_fulfilled += transfer_qty

            if remaining_qty > 0 or total_fulfilled > 0:
                if remaining_qty > 0 and total_fulfilled > 0:
                    unmet_records.append(UnmetRecord(
                        store_id=shortage.store_id,
                        store_name=shortage.store_name,
                        sku=shortage.sku,
                        sku_name=shortage.sku_name,
                        canonical_sku=shortage.canonical_sku,
                        shortage_qty=original_shortage_qty,
                        fulfilled_qty=total_fulfilled,
                        unmet_qty=remaining_qty,
                        reason=UnmetReason.PARTIAL_FULFILLED,
                        detail=f"仅满足{total_fulfilled}/{original_shortage_qty}，剩余{remaining_qty}件因库存不足无法满足",
                    ))
                elif remaining_qty > 0:
                    unmet_records.append(UnmetRecord(
                        store_id=shortage.store_id,
                        store_name=shortage.store_name,
                        sku=shortage.sku,
                        sku_name=shortage.sku_name,
                        canonical_sku=shortage.canonical_sku,
                        shortage_qty=original_shortage_qty,
                        fulfilled_qty=total_fulfilled,
                        unmet_qty=remaining_qty,
                        reason=UnmetReason.INSUFFICIENT_STOCK,
                        detail="库存全部用完仍无法满足",
                    ))

        return allocations, unmet_records
