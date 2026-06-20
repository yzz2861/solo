from __future__ import annotations

import logging
import os
from collections import Counter, defaultdict
from typing import Dict, List

import pandas as pd

from .exporter import ResultExporter
from .models import AllocationItem, BatchInfo, UnmetReason, UnmetRecord

logger = logging.getLogger(__name__)


class AllocationReviewer:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir

    def generate_review_report(self) -> Dict:
        batch_info = ResultExporter.load_batch_info(self.output_dir)
        allocations = ResultExporter.load_allocations(self.output_dir)
        unmet_records = ResultExporter.load_unmet_records(self.output_dir)

        if batch_info.status != "filled":
            logger.warning("该批次尚未回填，复盘数据可能不完整")

        review = self._analyze_allocations(allocations, unmet_records, batch_info)
        self._export_review_report(review, batch_info)

        return review

    def _analyze_allocations(
        self,
        allocations: List[AllocationItem],
        unmet_records: List[UnmetRecord],
        batch_info: BatchInfo,
    ) -> Dict:
        total_suggested = sum(a.suggested_qty for a in allocations)
        total_actual = sum(a.actual_qty for a in allocations)

        executed = [a for a in allocations if a.actual_qty > 0]
        unexecuted = [a for a in allocations if a.actual_qty == 0]

        execution_rate = (
            total_actual / total_suggested) if total_suggested > 0 else 0.0

        unexecuted_reasons = Counter()
        unexecuted_by_reason: Dict[str, List[AllocationItem]] = defaultdict(list)
        for a in unexecuted:
            reason = a.unexecuted_reason or "未说明原因"
            unexecuted_reasons[reason] += 1
            unexecuted_by_reason[reason].append(a)

        unmet_reasons = Counter()
        unmet_by_reason: Dict[str, List[UnmetRecord]] = defaultdict(list)
        for r in unmet_records:
            if r.unmet_qty > 0:
                reason = r.reason.value if hasattr(r.reason, 'value') else str(r.reason)
                unmet_reasons[reason] += r.unmet_qty
                unmet_by_reason[reason].append(r)

        store_analysis = self._analyze_by_store(allocations, unmet_records)
        sku_analysis = self._analyze_by_sku(allocations, unmet_records)

        review = {
            "batch_info": {
                "batch_id": batch_info.batch_id,
                "created_at": batch_info.created_at.isoformat(),
                "filled_at": batch_info.filled_at.isoformat() if batch_info.filled_at else None,
                "status": batch_info.status,
            },
            "summary": {
                "total_shortage": batch_info.total_shortage_qty,
                "total_suggested": total_suggested,
                "total_actual": total_actual,
                "total_allocation_count": len(allocations),
                "executed_count": len(executed),
                "unexecuted_count": len(unexecuted),
                "execution_rate": execution_rate,
                "fill_rate": batch_info.fill_rate,
                "total_unmet": batch_info.total_unmet_qty,
            },
            "unexecuted_analysis": {
                "total_count": len(unexecuted),
                "total_qty": sum(a.suggested_qty for a in unexecuted),
                "reasons": dict(unexecuted_reasons),
                "details": {
                    reason: [
                        {
                            "allocation_id": a.allocation_id,
                            "from_store": a.from_store_name,
                            "to_store": a.to_store_name,
                            "sku": a.sku_name,
                            "suggested_qty": a.suggested_qty,
                            "remarks": a.remarks,
                        }
                        for a in items
                    ]
                    for reason, items in unexecuted_by_reason.items()
                },
            },
            "unmet_analysis": {
                "total_qty": sum(r.unmet_qty for r in unmet_records if r.unmet_qty > 0),
                "reasons": dict(unmet_reasons),
                "details": {
                    reason: [
                        {
                            "store": r.store_name,
                            "sku": r.sku_name,
                            "shortage_qty": r.shortage_qty,
                            "unmet_qty": r.unmet_qty,
                            "detail": r.detail,
                        }
                        for r in items
                    ]
                    for reason, items in unmet_by_reason.items()
                },
            },
            "store_analysis": store_analysis,
            "sku_analysis": sku_analysis,
            "improvement_suggestions": self._generate_suggestions(
                allocations, unmet_records, unexecuted,
            ),
        }

        return review

    def _analyze_by_store(
        self,
        allocations: List[AllocationItem],
        unmet_records: List[UnmetRecord],
    ) -> Dict:
        store_data: Dict[str, Dict] = defaultdict(lambda: {
            "outbound_suggested": 0,
            "outbound_actual": 0,
            "inbound_suggested": 0,
            "inbound_actual": 0,
            "unmet_qty": 0,
        })

        for a in allocations:
            store_data[a.from_store_id]["outbound_suggested"] += a.suggested_qty
            store_data[a.from_store_id]["outbound_actual"] += a.actual_qty
            store_data[a.to_store_id]["inbound_suggested"] += a.suggested_qty
            store_data[a.to_store_id]["inbound_actual"] += a.actual_qty
            store_data[a.from_store_id]["store_name"] = a.from_store_name
            store_data[a.to_store_id]["store_name"] = a.to_store_name

        for r in unmet_records:
            if r.unmet_qty > 0:
                store_data[r.store_id]["unmet_qty"] += r.unmet_qty
                store_data[r.store_id]["store_name"] = r.store_name

        for store_id, data in store_data.items():
            out_suggested = data["outbound_suggested"]
            out_actual = data["outbound_actual"]
            data["outbound_execution_rate"] = (
                out_actual / out_suggested) if out_suggested > 0 else 1.0

        return dict(store_data)

    def _analyze_by_sku(
        self,
        allocations: List[AllocationItem],
        unmet_records: List[UnmetRecord],
    ) -> Dict:
        sku_data: Dict[str, Dict] = defaultdict(lambda: {
            "suggested_qty": 0,
            "actual_qty": 0,
            "unmet_qty": 0,
        })

        for a in allocations:
            sku_data[a.canonical_sku]["suggested_qty"] += a.suggested_qty
            sku_data[a.canonical_sku]["actual_qty"] += a.actual_qty
            sku_data[a.canonical_sku]["sku_name"] = a.sku_name
            sku_data[a.canonical_sku]["canonical_sku"] = a.canonical_sku

        for r in unmet_records:
            if r.unmet_qty > 0:
                sku_data[r.canonical_sku]["unmet_qty"] += r.unmet_qty
                sku_data[r.canonical_sku]["sku_name"] = r.sku_name
                sku_data[r.canonical_sku]["canonical_sku"] = r.canonical_sku

        for sku, data in sku_data.items():
            suggested = data["suggested_qty"]
            actual = data["actual_qty"]
            data["execution_rate"] = (
                actual / suggested) if suggested > 0 else 1.0
            total_demand = suggested + data["unmet_qty"]
            data["fulfillment_rate"] = (
                actual / total_demand) if total_demand > 0 else 1.0

        return dict(sku_data)

    def _generate_suggestions(
        self,
        allocations: List[AllocationItem],
        unmet_records: List[UnmetRecord],
        unexecuted: List[AllocationItem],
    ) -> List[str]:
        suggestions = []

        transport_not_worth = [
            a for a in unexecuted
            if "运输不划算" in (a.unexecuted_reason or "")
        ]
        if transport_not_worth:
            total_qty = sum(a.suggested_qty for a in transport_not_worth)
            suggestions.append(
                f"有 {len(transport_not_worth)} 笔调拨（共{total_qty}件）因运输不划算未执行，"
                f"建议优化调拨阈值或调整运输路线"
            )

        stock_shortage = [
            r for r in unmet_records
            if r.reason == UnmetReason.INSUFFICIENT_STOCK and r.unmet_qty > 0
        ]
        if stock_shortage:
            skus = set(r.canonical_sku for r in stock_shortage)
            suggestions.append(
                f"有 {len(stock_shortage)} 笔缺货（涉及{len(skus)}个SKU）因库存不足无法满足，"
                f"建议增加采购量或设置更高的安全库存"
            )

        safety_stock_issues = [
            r for r in unmet_records
            if r.reason == UnmetReason.SAFETY_STOCK_VIOLATION and r.unmet_qty > 0
        ]
        if safety_stock_issues:
            suggestions.append(
                f"有 {len(safety_stock_issues)} 笔缺货因安全库存限制无法调拨，"
                f"建议评估安全库存设置是否合理"
            )

        no_route = [
            r for r in unmet_records
            if r.reason == UnmetReason.NO_TRANSPORT_ROUTE and r.unmet_qty > 0
        ]
        if no_route:
            stores = set(r.store_id for r in no_route)
            suggestions.append(
                f"有 {len(no_route)} 笔缺货（涉及{len(stores)}个门店）因无运输路线无法满足，"
                f"建议补充运输路线配置"
            )

        high_value_unexecuted = [
            a for a in unexecuted
            if a.suggested_qty >= 50 and not a.unexecuted_reason
        ]
        if high_value_unexecuted:
            suggestions.append(
                f"有 {len(high_value_unexecuted)} 笔大额调拨（>=50件）未执行且未填写原因，"
                f"建议完善流程，要求仓管必须填写未执行原因"
            )

        if not suggestions:
            suggestions.append("本次调拨执行情况良好，无明显需要改进的问题")

        return suggestions

    def _export_review_report(self, review: Dict, batch_info: BatchInfo) -> str:
        report_path = os.path.join(self.output_dir, "review_report.txt")
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("=" * 70 + "\n")
            f.write("调拨复盘报告\n")
            f.write("=" * 70 + "\n\n")

            f.write(f"批次ID: {review['batch_info']['batch_id']}\n")
            f.write(f"生成时间: {review['batch_info']['created_at']}\n")
            f.write(f"回填时间: {review['batch_info']['filled_at'] or '未回填'}\n")
            f.write(f"批次状态: {review['batch_info']['status']}\n\n")

            s = review["summary"]
            f.write("-" * 70 + "\n")
            f.write("一、总体情况\n")
            f.write("-" * 70 + "\n")
            f.write(f"总缺货数量: {s['total_shortage']:>10,}\n")
            f.write(f"建议调拨数量: {s['total_suggested']:>10,}\n")
            f.write(f"实际调拨数量: {s['total_actual']:>10,}\n")
            f.write(f"调拨单总数: {s['total_allocation_count']:>10,}\n")
            f.write(f"已执行: {s['executed_count']:>10,}\n")
            f.write(f"未执行: {s['unexecuted_count']:>10,}\n")
            f.write(f"执行率: {s['execution_rate']:>14.2%}\n")
            f.write(f"整体满足率: {s['fill_rate']:>14.2%}\n")
            f.write(f"最终未满足数量: {s['total_unmet']:>10,}\n\n")

            ue = review["unexecuted_analysis"]
            if ue["total_count"] > 0:
                f.write("-" * 70 + "\n")
                f.write("二、未执行调拨分析\n")
                f.write("-" * 70 + "\n")
                f.write(f"未执行调拨单数: {ue['total_count']}\n")
                f.write(f"未执行调拨数量: {ue['total_qty']:,}\n\n")

                f.write("未执行原因分布:\n")
                for reason, count in ue["reasons"].items():
                    f.write(f"  {reason}: {count} 笔\n")
                f.write("\n")

                f.write("未执行明细:\n")
                for reason, items in ue["details"].items():
                    f.write(f"\n【{reason}】\n")
                    for item in items:
                        f.write(
                            f"  {item['allocation_id']}: "
                            f"{item['from_store']} → {item['to_store']}, "
                            f"{item['sku']} x{item['suggested_qty']:,}"
                        )
                        if item["remarks"]:
                            f.write(f"（{item['remarks']}）")
                        f.write("\n")
                f.write("\n")

            um = review["unmet_analysis"]
            if um["total_qty"] > 0:
                f.write("-" * 70 + "\n")
                f.write("三、未满足缺货分析\n")
                f.write("-" * 70 + "\n")
                f.write(f"未满足总数量: {um['total_qty']:,}\n\n")

                f.write("未满足原因分布:\n")
                for reason, qty in um["reasons"].items():
                    f.write(f"  {reason}: {qty:,} 件\n")
                f.write("\n")

                f.write("未满足明细:\n")
                for reason, items in um["details"].items():
                    f.write(f"\n【{reason}】\n")
                    for item in items:
                        f.write(
                            f"  {item['store']} - {item['sku']}: "
                            f"缺货{item['shortage_qty']:,} / "
                            f"未满足{item['unmet_qty']:,}"
                        )
                        if item["detail"]:
                            f.write(f"（{item['detail']}）")
                        f.write("\n")
                f.write("\n")

            f.write("-" * 70 + "\n")
            f.write("四、改进建议\n")
            f.write("-" * 70 + "\n")
            for i, suggestion in enumerate(review["improvement_suggestions"], 1):
                f.write(f"{i}. {suggestion}\n")
            f.write("\n")

            f.write("=" * 70 + "\n")
            f.write("报告结束\n")
            f.write("=" * 70 + "\n")

        import json
        json_path = os.path.join(self.output_dir, "review_report.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(review, f, ensure_ascii=False, indent=2)

        logger.info(f"复盘报告已导出: {report_path}")
        return report_path
