from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import Dict, List

import pandas as pd

from .models import (
    AllocationItem,
    BatchInfo,
    ProcessResult,
    UnmetRecord,
)

logger = logging.getLogger(__name__)


class ResultExporter:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def export_allocation_plan(
        self,
        allocations: List[AllocationItem],
        batch_info: BatchInfo,
    ) -> str:
        if not allocations:
            logger.info("无调拨建议，跳过导出调拨单")
            return ""

        data = []
        for alloc in allocations:
            data.append({
                "调拨单号": alloc.allocation_id,
                "调出门店ID": alloc.from_store_id,
                "调出门店名称": alloc.from_store_name,
                "调入门店ID": alloc.to_store_id,
                "调入门店名称": alloc.to_store_name,
                "SKU编码": alloc.sku,
                "SKU名称": alloc.sku_name,
                "标准SKU": alloc.canonical_sku,
                "建议调拨数量": alloc.suggested_qty,
                "实际调拨数量": alloc.actual_qty,
                "运输天数": alloc.transport_days,
                "优先级": alloc.priority,
                "状态": alloc.status,
                "未执行原因": alloc.unexecuted_reason,
                "备注": alloc.remarks,
            })

        df = pd.DataFrame(data)
        df.sort_values(
            by=["优先级", "运输天数", "调出门店名称", "调入门店名称"],
            ascending=[False, True, True, True],
            inplace=True,
        )

        file_path = os.path.join(self.output_dir, "allocation_plan.csv")
        df.to_csv(file_path, index=False, encoding="utf-8-sig")

        excel_path = os.path.join(self.output_dir, "allocation_plan.xlsx")
        df.to_excel(excel_path, index=False, sheet_name="调拨建议")

        logger.info(f"调拨建议已导出: {file_path}")
        return file_path

    def export_shortage_report(
        self,
        unmet_records: List[UnmetRecord],
        batch_info: BatchInfo,
    ) -> str:
        data = []
        for record in unmet_records:
            data.append({
                "门店ID": record.store_id,
                "门店名称": record.store_name,
                "SKU编码": record.sku,
                "SKU名称": record.sku_name,
                "标准SKU": record.canonical_sku,
                "缺货数量": record.shortage_qty,
                "已满足数量": record.fulfilled_qty,
                "未满足数量": record.unmet_qty,
                "未满足原因": record.reason.value if hasattr(record.reason, 'value') else str(record.reason),
                "详细说明": record.detail,
            })

        df = pd.DataFrame(data)
        if not df.empty:
            df.sort_values(
                by=["未满足数量", "门店名称"],
                ascending=[False, True],
                inplace=True,
            )

        file_path = os.path.join(self.output_dir, "shortage_report.csv")
        df.to_csv(file_path, index=False, encoding="utf-8-sig")

        excel_path = os.path.join(self.output_dir, "shortage_report.xlsx")
        df.to_excel(excel_path, index=False, sheet_name="缺货报告")

        logger.info(f"缺货报告已导出: {file_path}")
        return file_path

    def export_unmet_report(
        self,
        unmet_records: List[UnmetRecord],
        batch_info: BatchInfo,
    ) -> str:
        unmet_only = [r for r in unmet_records if r.unmet_qty > 0]
        if not unmet_only:
            logger.info("无未满足缺货，跳过导出未满足报告")
            return ""

        data = []
        for record in unmet_only:
            data.append({
                "门店ID": record.store_id,
                "门店名称": record.store_name,
                "SKU编码": record.sku,
                "SKU名称": record.sku_name,
                "标准SKU": record.canonical_sku,
                "缺货数量": record.shortage_qty,
                "已满足数量": record.fulfilled_qty,
                "未满足数量": record.unmet_qty,
                "未满足原因": record.reason.value if hasattr(record.reason, 'value') else str(record.reason),
                "详细说明": record.detail,
            })

        df = pd.DataFrame(data)
        df.sort_values(
            by=["未满足原因", "未满足数量"],
            ascending=[True, False],
            inplace=True,
        )

        file_path = os.path.join(self.output_dir, "unmet_report.csv")
        df.to_csv(file_path, index=False, encoding="utf-8-sig")

        excel_path = os.path.join(self.output_dir, "unmet_report.xlsx")
        df.to_excel(excel_path, index=False, sheet_name="未满足明细")

        logger.info(f"未满足报告已导出: {file_path}")
        return file_path

    def export_process_report(
        self,
        process_result: ProcessResult,
        batch_info: BatchInfo,
    ) -> str:
        file_path = os.path.join(self.output_dir, "process_report.txt")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("=" * 60 + "\n")
            f.write("数据处理报告\n")
            f.write("=" * 60 + "\n\n")

            f.write(f"批次ID: {batch_info.batch_id}\n")
            f.write(f"生成时间: {batch_info.created_at}\n\n")

            if process_result.warnings:
                f.write(f"警告信息 ({len(process_result.warnings)} 条:\n")
                for i, warning in enumerate(process_result.warnings, 1):
                    f.write(f"  {i}. {warning}\n")
                f.write("\n")

            if process_result.duplicate_records:
                f.write(f"重复记录 ({len(process_result.duplicate_records)} 条:\n")
                for i, dup in enumerate(process_result.duplicate_records, 1):
                    f.write(f"  {i}. {dup}\n")
                f.write("\n")

            if process_result.unmatched_skus:
                f.write(f"无法匹配的SKU ({len(process_result.unmatched_skus)} 个:\n")
                for i, sku in enumerate(process_result.unmatched_skus, 1):
                    f.write(f"  {i}. {sku}\n")
                f.write("\n")

            if process_result.self_allocation_stores:
                f.write(f"门店内部调拨 ({len(process_result.self_allocation_stores)} 处:\n")
                for i, (store_id, sku) in enumerate(process_result.self_allocation_stores, 1):
                    f.write(f"  {i}. 门店 {store_id}, SKU {sku}\n")
                f.write("\n")

            f.write("=" * 60 + "\n")
            f.write("汇总统计\n")
            f.write("=" * 60 + "\n")
            f.write(f"总缺货数量: {batch_info.total_shortage_qty}\n")
            f.write(f"已调拨数量: {batch_info.total_allocated_qty}\n")
            f.write(f"未满足数量: {batch_info.total_unmet_qty}\n")
            f.write(f"满足率: {batch_info.fill_rate:.2%}\n")

        logger.info(f"处理报告已导出: {file_path}")
        return file_path

    def export_batch_info(
        self,
        batch_info: BatchInfo,
    ) -> str:
        file_path = os.path.join(self.output_dir, "batch_info.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(batch_info.to_dict(), f, ensure_ascii=False, indent=2)
        logger.info(f"批次信息已导出: {file_path}")
        return file_path

    def export_all(
        self,
        allocations: List[AllocationItem],
        unmet_records: List[UnmetRecord],
        process_result: ProcessResult,
        batch_info: BatchInfo,
    ) -> Dict[str, str]:
        results = {}
        results["allocation_plan"] = self.export_allocation_plan(allocations, batch_info)
        results["shortage_report"] = self.export_shortage_report(unmet_records, batch_info)
        results["unmet_report"] = self.export_unmet_report(unmet_records, batch_info)
        results["process_report"] = self.export_process_report(process_result, batch_info)
        results["batch_info"] = self.export_batch_info(batch_info)
        return results

    @staticmethod
    def load_batch_info(output_dir: str) -> BatchInfo:
        file_path = os.path.join(output_dir, "batch_info.json")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"批次信息文件不存在: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        created_at = datetime.fromisoformat(data["created_at"])
        filled_at = datetime.fromisoformat(data["filled_at"]) if data.get("filled_at") else None

        return BatchInfo(
            batch_id=data["batch_id"],
            created_at=created_at,
            shortage_file=data["shortage_file"],
            stock_file=data["stock_file"],
            transport_file=data["transport_file"],
            safety_file=data["safety_file"],
            sku_alias_file=data.get("sku_alias_file", ""),
            total_shortage_qty=data.get("total_shortage_qty", 0),
            total_allocated_qty=data.get("total_allocated_qty", 0),
            total_unmet_qty=data.get("total_unmet_qty", 0),
            fill_rate=data.get("fill_rate", 0.0),
            status=data.get("status", "generated"),
            filled_at=filled_at,
        )

    @staticmethod
    def load_allocations(output_dir: str) -> List[AllocationItem]:
        file_path = os.path.join(output_dir, "allocation_plan.csv")
        if not os.path.exists(file_path):
            return []

        df = pd.read_csv(file_path, dtype=str, keep_default_na=False)
        allocations = []

        for _, row in df.iterrows():
            def safe_int(val: str, default: int = 0) -> int:
                try:
                    return int(float(str(val))) if str(val) else default
                except (ValueError, TypeError):
                    return default

            allocations.append(AllocationItem(
                allocation_id=str(row.get("调拨单号", "")),
                from_store_id=str(row.get("调出门店ID", "")),
                from_store_name=str(row.get("调出门店名称", "")),
                to_store_id=str(row.get("调入门店ID", "")),
                to_store_name=str(row.get("调入门店名称", "")),
                sku=str(row.get("SKU编码", "")),
                sku_name=str(row.get("SKU名称", "")),
                canonical_sku=str(row.get("标准SKU", "")),
                suggested_qty=safe_int(row.get("建议调拨数量", "0"), 0),
                actual_qty=safe_int(row.get("实际调拨数量", "0"), 0),
                transport_days=safe_int(row.get("运输天数", "0"), 0),
                priority=safe_int(row.get("优先级", "1"), 1),
                unexecuted_reason=str(row.get("未执行原因", "")),
                remarks=str(row.get("备注", "")),
                status=str(row.get("状态", "pending")),
            ))

        return allocations

    @staticmethod
    def load_unmet_records(output_dir: str) -> List[UnmetRecord]:
        file_path = os.path.join(output_dir, "shortage_report.csv")
        if not os.path.exists(file_path):
            return []

        df = pd.read_csv(file_path, dtype=str, keep_default_na=False)
        records = []

        for _, row in df.iterrows():
            from .models import UnmetReason
            reason_str = str(row.get("未满足原因", ""))
            reason = UnmetReason.INSUFFICIENT_STOCK
            for r in UnmetReason:
                if r.value == reason_str:
                    reason = r
                    break

            def safe_int(val: str, default: int = 0) -> int:
                try:
                    return int(float(str(val))) if str(val) else default
                except (ValueError, TypeError):
                    return default

            records.append(UnmetRecord(
                store_id=str(row.get("门店ID", "")),
                store_name=str(row.get("门店名称", "")),
                sku=str(row.get("SKU编码", "")),
                sku_name=str(row.get("SKU名称", "")),
                canonical_sku=str(row.get("标准SKU", "")),
                shortage_qty=safe_int(row.get("缺货数量", "0"), 0),
                fulfilled_qty=safe_int(row.get("已满足数量", "0"), 0),
                unmet_qty=safe_int(row.get("未满足数量", "0"), 0),
                reason=reason,
                detail=str(row.get("详细说明", "")),
            ))

        return records
