from __future__ import annotations

import hashlib
import logging
from typing import Dict, List, Tuple

import pandas as pd

from .models import (
    AllocationItem,
    ProcessResult,
    SafetyStock,
    ShortageRecord,
    SkuAlias,
    StockRecord,
    TransportRoute,
    UnmetReason,
    UnmetRecord,
)

logger = logging.getLogger(__name__)


class DataPreprocessor:
    def __init__(self, sku_alias: List[SkuAlias] | None = None):
        self.sku_alias_map: Dict[str, str] = {}
        self.canonical_skus: set = set()
        self.sku_alias_list: List[SkuAlias] = sku_alias or []
        if sku_alias:
            for alias in sku_alias:
                self.sku_alias_map[alias.sku_alias] = alias.canonical_sku
                self.sku_alias_map[alias.canonical_sku] = alias.canonical_sku
                self.canonical_skus.add(alias.canonical_sku)

    def normalize_sku(self, sku: str) -> str:
        if not sku:
            return ""
        sku_clean = str(sku).strip().lower()
        if sku_clean in self.sku_alias_map:
            return self.sku_alias_map[sku_clean]
        return sku

    def get_record_hash(self, record_type: str, **kwargs) -> str:
        key = f"{record_type}:{':'.join(f'{k}={v}' for k, v in sorted(kwargs.items()))}"
        return hashlib.md5(key.encode()).hexdigest()[:12]

    @staticmethod
    def read_csv(file_path: str) -> pd.DataFrame:
        return pd.read_csv(file_path, dtype=str, keep_default_na=False)

    def load_shortage(self, file_path: str) -> Tuple[List[ShortageRecord], ProcessResult]:
        df = self.read_csv(file_path)
        required_cols = ["store_id", "sku", "shortage_qty"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"缺货表缺少必要列: {col}")

        records: List[ShortageRecord] = []
        seen_hashes = set()
        result = ProcessResult()
        store_skus: Dict[Tuple[str, str], int] = {}

        for _, row in df.iterrows():
            store_id = str(row["store_id"]).strip()
            sku = str(row["sku"]).strip()
            try:
                shortage_qty = int(float(str(row.get("shortage_qty", "0")).strip()))
            except (ValueError, TypeError):
                result.warnings.append(f"门店{store_id} SKU{sku}缺货数量无效，已跳过")
                continue

            if shortage_qty <= 0:
                result.warnings.append(f"门店{store_id} SKU{sku}缺货数量<=0，已跳过")
                continue

            record_hash = self.get_record_hash(
                "shortage", store_id=store_id, sku=sku
            )
            if record_hash in seen_hashes:
                result.duplicate_records.append(
                    f"缺货表重复记录: 门店{store_id} SKU{sku}"
                )
                continue
            seen_hashes.add(record_hash)

            canonical_sku = self.normalize_sku(sku)
            sku_lower = sku.strip().lower()
            if (self.sku_alias_map and 
                    sku_lower not in self.sku_alias_map and 
                    canonical_sku not in self.canonical_skus and
                    sku_lower not in self.canonical_skus):
                result.unmatched_skus.append(f"SKU无法匹配: {sku}")

            priority = int(str(row.get("priority", "1")).strip() or "1")
            store_name = str(row.get("store_name", store_id)).strip()
            sku_name = str(row.get("sku_name", sku)).strip()

            key = (store_id, canonical_sku)
            store_skus[key] = store_skus.get(key, 0) + shortage_qty

            records.append(ShortageRecord(
                store_id=store_id,
                store_name=store_name,
                sku=sku,
                sku_name=sku_name,
                shortage_qty=shortage_qty,
                canonical_sku=canonical_sku,
                priority=priority,
            ))

        merged_records = []
        for (store_id, canonical_sku), total_qty in store_skus.items():
            matching = [
                r for r in records
                if r.store_id == store_id and r.canonical_sku == canonical_sku
            ]
            if matching:
                r = matching[0]
                r.shortage_qty = total_qty
                merged_records.append(r)

        return merged_records, result

    def load_stock(self, file_path: str) -> Tuple[List[StockRecord], ProcessResult]:
        df = self.read_csv(file_path)
        required_cols = ["store_id", "sku", "stock_qty"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"库存表缺少必要列: {col}")

        records: List[StockRecord] = []
        seen_hashes = set()
        result = ProcessResult()
        store_skus: Dict[Tuple[str, str], int] = {}

        for _, row in df.iterrows():
            store_id = str(row["store_id"]).strip()
            sku = str(row["sku"]).strip()
            try:
                stock_qty = int(float(str(row.get("stock_qty", "0")).strip()))
            except (ValueError, TypeError):
                result.warnings.append(f"门店{store_id} SKU{sku}库存数量无效，已跳过")
                continue

            if stock_qty <= 0:
                continue

            record_hash = self.get_record_hash(
                "stock", store_id=store_id, sku=sku
            )
            if record_hash in seen_hashes:
                result.duplicate_records.append(
                    f"库存表重复记录: 门店{store_id} SKU{sku}"
                )
                continue
            seen_hashes.add(record_hash)

            canonical_sku = self.normalize_sku(sku)
            sku_lower = sku.strip().lower()
            if (self.sku_alias_map and 
                    sku_lower not in self.sku_alias_map and 
                    canonical_sku not in self.canonical_skus and
                    sku_lower not in self.canonical_skus):
                result.unmatched_skus.append(f"SKU无法匹配: {sku}")
            store_name = str(row.get("store_name", store_id)).strip()
            sku_name = str(row.get("sku_name", sku)).strip()

            key = (store_id, canonical_sku)
            store_skus[key] = store_skus.get(key, 0) + stock_qty

            records.append(StockRecord(
                store_id=store_id,
                store_name=store_name,
                sku=sku,
                sku_name=sku_name,
                stock_qty=stock_qty,
                canonical_sku=canonical_sku,
                available_qty=stock_qty,
            ))

        merged_records = []
        for (store_id, canonical_sku), total_qty in store_skus.items():
            matching = [
                r for r in records
                if r.store_id == store_id and r.canonical_sku == canonical_sku
            ]
            if matching:
                r = matching[0]
                r.stock_qty = total_qty
                r.available_qty = total_qty
                merged_records.append(r)

        return merged_records, result

    @staticmethod
    def load_transport(file_path: str) -> List[TransportRoute]:
        df = pd.read_csv(file_path, dtype=str, keep_default_na=False)
        required_cols = ["from_store", "to_store", "transport_days"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"运输表缺少必要列: {col}")

        routes: List[TransportRoute] = []
        seen = set()

        for _, row in df.iterrows():
            from_store = str(row["from_store"]).strip()
            to_store = str(row["to_store"]).strip()

            if from_store == to_store:
                continue

            key = (from_store, to_store)
            if key in seen:
                continue
            seen.add(key)

            try:
                transport_days = int(float(str(row.get("transport_days", "999")).strip()))
            except (ValueError, TypeError):
                transport_days = 999

            routes.append(TransportRoute(
                from_store=from_store,
                to_store=to_store,
                transport_days=transport_days,
            ))

        return routes

    @staticmethod
    def load_safety_stock(file_path: str) -> List[SafetyStock]:
        df = pd.read_csv(file_path, dtype=str, keep_default_na=False)
        required_cols = ["sku", "safety_qty"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"安全库存表缺少必要列: {col}")

        safety_stocks: List[SafetyStock] = []
        seen = set()

        for _, row in df.iterrows():
            sku = str(row["sku"]).strip()
            if sku in seen:
                continue
            seen.add(sku)

            try:
                safety_qty = int(float(str(row.get("safety_qty", "0")).strip()))
            except (ValueError, TypeError):
                safety_qty = 0

            safety_stocks.append(SafetyStock(
                sku=sku,
                safety_qty=safety_qty,
                canonical_sku=sku,
            ))

        return safety_stocks

    @staticmethod
    def load_sku_alias(file_path: str) -> List[SkuAlias]:
        df = pd.read_csv(file_path, dtype=str, keep_default_na=False)
        required_cols = ["sku", "canonical_sku"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"SKU别名表缺少必要列: {col}")

        aliases: List[SkuAlias] = []
        for _, row in df.iterrows():
            sku = str(row["sku"]).strip().lower()
            canonical_sku = str(row["canonical_sku"]).strip().lower()
            if sku and canonical_sku:
                aliases.append(SkuAlias(
                    sku_alias=sku,
                    canonical_sku=canonical_sku,
                ))

        return aliases

    def detect_self_allocation(
        self,
        shortages: List[ShortageRecord],
        stocks: List[StockRecord],
    ) -> List[Tuple[ShortageRecord, StockRecord]]:
        stock_map: Dict[Tuple[str, str], StockRecord] = {}
        for s in stocks:
            stock_map[(s.store_id, s.canonical_sku)] = s

        self_allocations = []
        for shortage in shortages:
            key = (shortage.store_id, shortage.canonical_sku)
            if key in stock_map:
                stock = stock_map[key]
                self_allocations.append((shortage, stock))

        return self_allocations

    def process_self_allocation(
        self,
        shortages: List[ShortageRecord],
        stocks: List[StockRecord],
        safety_map: Dict[str, int],
        result: ProcessResult,
    ) -> Tuple[List[AllocationItem], List[UnmetRecord]]:
        self_alloc_pairs = self.detect_self_allocation(shortages, stocks)
        allocations: List[AllocationItem] = []
        unmet_records: List[UnmetRecord] = []

        for shortage, stock in self_alloc_pairs:
            result.self_allocation_stores.append(
                (shortage.store_id, shortage.canonical_sku)
            )

            safety_qty = safety_map.get(shortage.canonical_sku, 0)
            max_available = max(0, stock.available_qty - safety_qty)
            transfer_qty = min(shortage.shortage_qty, max_available)

            if transfer_qty > 0:
                alloc = AllocationItem(
                    allocation_id=f"SELF-{shortage.store_id}-{shortage.canonical_sku}",
                    from_store_id=shortage.store_id,
                    from_store_name=shortage.store_name,
                    to_store_id=shortage.store_id,
                    to_store_name=shortage.store_name,
                    sku=shortage.sku,
                    sku_name=shortage.sku_name,
                    canonical_sku=shortage.canonical_sku,
                    suggested_qty=transfer_qty,
                    transport_days=0,
                    priority=shortage.priority,
                    remarks="门店内部调拨",
                )
                allocations.append(alloc)

                stock.available_qty -= transfer_qty
                shortage.shortage_qty -= transfer_qty

            if shortage.shortage_qty > 0:
                unmet_records.append(UnmetRecord(
                    store_id=shortage.store_id,
                    store_name=shortage.store_name,
                    sku=shortage.sku,
                    sku_name=shortage.sku_name,
                    canonical_sku=shortage.canonical_sku,
                    shortage_qty=shortage.shortage_qty + transfer_qty,
                    fulfilled_qty=transfer_qty,
                    unmet_qty=shortage.shortage_qty,
                    reason=UnmetReason.SAFETY_STOCK_VIOLATION,
                    detail=f"内部调拨后仍缺货{shortage.shortage_qty}，需外部调拨",
                ))
            else:
                unmet_records.append(UnmetRecord(
                    store_id=shortage.store_id,
                    store_name=shortage.store_name,
                    sku=shortage.sku,
                    sku_name=shortage.sku_name,
                    canonical_sku=shortage.canonical_sku,
                    shortage_qty=transfer_qty,
                    fulfilled_qty=transfer_qty,
                    unmet_qty=0,
                    reason=UnmetReason.SELF_ALLOCATION,
                    detail="门店内部调拨满足全部需求",
                ))

        remaining_shortages = [s for s in shortages if s.shortage_qty > 0]
        return allocations, unmet_records, remaining_shortages
