from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Dict, List, Tuple

import pandas as pd

from .models import AllocationItem, BatchInfo, UnmetReason, UnmetRecord
from .exporter import ResultExporter

logger = logging.getLogger(__name__)


class AllocationFiller:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.exporter = ResultExporter(output_dir)

    def load_actual_allocation(self, file_path: str) -> Dict[str, Tuple[int, str, str]]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"实际调拨文件不存在: {file_path}")

        df = pd.read_csv(file_path, dtype=str, keep_default_na=False)

        required_cols = ["调拨单号", "实际调拨数量"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"实际调拨表缺少必要列: {col}")

        actual_data: Dict[str, Tuple[int, str, str]] = {}

        for _, row in df.iterrows():
            allocation_id = str(row["调拨单号"]).strip()
            if not allocation_id:
                continue

            try:
                actual_qty = int(float(str(row.get("实际调拨数量", "0")).strip()))
            except (ValueError, TypeError):
                actual_qty = 0

            unexecuted_reason = str(row.get("未执行原因", "")).strip()
            remarks = str(row.get("备注", "")).strip()

            actual_data[allocation_id] = (actual_qty, unexecuted_reason, remarks)

        return actual_data

    def fill_allocations(
        self,
        allocations: List[AllocationItem],
        actual_data: Dict[str, Tuple[int, str, str]],
    ) -> Tuple[List[AllocationItem], List[str]]:
        warnings = []
        filled_allocations = []

        for alloc in allocations:
            if alloc.allocation_id not in actual_data:
                warnings.append(
                    f"调拨单 {alloc.allocation_id} 未找到实际调拨数据，保持原状态")
                filled_allocations.append(alloc)
                continue

            actual_qty, unexecuted_reason, remarks = actual_data[alloc.allocation_id]

            new_alloc = AllocationItem(
                allocation_id=alloc.allocation_id,
                from_store_id=alloc.from_store_id,
                from_store_name=alloc.from_store_name,
                to_store_id=alloc.to_store_id,
                to_store_name=alloc.to_store_name,
                sku=alloc.sku,
                sku_name=alloc.sku_name,
                canonical_sku=alloc.canonical_sku,
                suggested_qty=alloc.suggested_qty,
                actual_qty=actual_qty,
                transport_days=alloc.transport_days,
                priority=alloc.priority,
                unexecuted_reason=unexecuted_reason,
                remarks=remarks if remarks else alloc.remarks,
                status="filled" if actual_qty > 0 else "rejected",
            )

            if actual_qty == 0 and not unexecuted_reason:
                warnings.append(
                    f"调拨单 {alloc.allocation_id} 实际调拨数量为0但未填写未执行原因")
            elif actual_qty > alloc.suggested_qty:
                warnings.append(
                    f"调拨单 {alloc.allocation_id} 实际调拨数量({actual_qty})超过建议数量({alloc.suggested_qty})")

            filled_allocations.append(new_alloc)

        return filled_allocations, warnings

    def update_unmet_records_with_actual(
        self,
        unmet_records: List[UnmetRecord],
        allocations: List[AllocationItem],
    ) -> List[UnmetRecord]:
        actual_by_store_sku: Dict[Tuple[str, str], int] = {}
        for alloc in allocations:
            key = (alloc.to_store_id, alloc.canonical_sku)
            actual_by_store_sku[key] = actual_by_store_sku.get(key, 0) + alloc.actual_qty

        updated_records = []
        for record in unmet_records:
            key = (record.store_id, record.canonical_sku)
            actual_fulfilled = actual_by_store_sku.get(key, 0)

            if actual_fulfilled != record.fulfilled_qty:
                new_record = UnmetRecord(
                    store_id=record.store_id,
                    store_name=record.store_name,
                    sku=record.sku,
                    sku_name=record.sku_name,
                    canonical_sku=record.canonical_sku,
                    shortage_qty=record.shortage_qty,
                    fulfilled_qty=actual_fulfilled,
                    unmet_qty=max(0, record.shortage_qty - actual_fulfilled),
                    reason=record.reason,
                    detail=record.detail,
                )
                updated_records.append(new_record)
            else:
                updated_records.append(record)

        return updated_records

    def process_fill(
        self,
        actual_file: str,
    ) -> Dict[str, str]:
        batch_info = ResultExporter.load_batch_info(self.output_dir)
        allocations = ResultExporter.load_allocations(self.output_dir)
        unmet_records = ResultExporter.load_unmet_records(self.output_dir)

        if batch_info.status == "filled":
            logger.warning("该批次已回填过，将覆盖原有回填数据")

        actual_data = self.load_actual_allocation(actual_file)
        filled_allocations, warnings = self.fill_allocations(allocations, actual_data)
        updated_unmet = self.update_unmet_records_with_actual(
            unmet_records, filled_allocations
        )

        total_actual_qty = sum(a.actual_qty for a in filled_allocations)
        total_suggested_qty = sum(a.suggested_qty for a in filled_allocations)
        total_shortage = batch_info.total_shortage_qty
        total_unmet = sum(r.unmet_qty for r in updated_unmet)

        batch_info.total_allocated_qty = total_actual_qty
        batch_info.total_unmet_qty = total_unmet
        batch_info.fill_rate = (
            total_actual_qty / total_shortage) if total_shortage > 0 else 0.0
        batch_info.status = "filled"
        batch_info.filled_at = datetime.now()

        from .models import ProcessResult
        process_result = ProcessResult()
        process_result.warnings = warnings

        results = self.exporter.export_all(
            filled_allocations, updated_unmet, process_result, batch_info
        )

        fill_summary = {
            "total_suggested": total_suggested_qty,
            "total_actual": total_actual_qty,
            "execution_rate": (
                total_actual_qty / total_suggested_qty) if total_suggested_qty > 0 else 0.0,
            "unexecuted_count": sum(
                1 for a in filled_allocations if a.actual_qty == 0),
            "warnings": warnings,
        }

        summary_path = os.path.join(self.output_dir, "fill_summary.json")
        import json
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(fill_summary, f, ensure_ascii=False, indent=2)

        results["fill_summary"] = summary_path

        logger.info(f"回填完成，执行率: {fill_summary['execution_rate']:.2%}")
        return results
