"""摘要查看模块"""

import json
from typing import Dict, Any
from datetime import datetime


class SummaryViewer:
    """结果摘要查看器"""

    @staticmethod
    def load_result(result_path: str) -> Dict[str, Any]:
        """加载处理结果"""
        with open(result_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def format_summary(result: Dict[str, Any], detailed: bool = False) -> str:
        """格式化摘要输出"""
        lines = []

        lines.append("=" * 60)
        lines.append("  跨城搬家物品清单 - 处理摘要")
        lines.append("=" * 60)
        lines.append("")

        lines.append(f"  批次号:      {result.get('batch_no', 'N/A')}")
        lines.append(f"  来源标识:    {result.get('source', 'N/A')}")
        lines.append(f"  处理时间:    {result.get('process_time', 'N/A')}")
        if result.get("previous_batch_no"):
            lines.append(f"  上一批次:    {result['previous_batch_no']}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("  统计概览")
        lines.append("-" * 60)
        lines.append(f"  物品总数:    {result.get('total_count', 0)}")
        lines.append(f"  通过数量:    {result.get('passed_count', 0)}")
        lines.append(f"  异常数量:    {result.get('failed_count', 0)}")
        lines.append("")

        summary = result.get("summary", {})
        lines.append("-" * 60)
        lines.append("  数据汇总")
        lines.append("-" * 60)
        lines.append(f"  总数量:      {summary.get('total_quantity', 0)}")
        lines.append(f"  总重量:      {summary.get('total_weight_kg', 0):.2f} kg")
        lines.append(f"  总体积:      {summary.get('total_volume_cbm', 0):.2f} cbm")
        lines.append(f"  总价值:      ¥{summary.get('total_value', 0):.2f}")
        lines.append(f"  易碎品:      {summary.get('fragile_items', 0)} 件")
        lines.append(f"  需打包:      {summary.get('need_packing_items', 0)} 件")
        lines.append("")

        issues = result.get("issues", [])
        error_count = summary.get("error_count", 0)
        warning_count = summary.get("warning_count", 0)
        lines.append("-" * 60)
        lines.append("  校验问题")
        lines.append("-" * 60)
        lines.append(f"  错误数量:    {error_count}")
        lines.append(f"  警告数量:    {warning_count}")
        lines.append(f"  问题总数:    {len(issues)}")
        lines.append("")

        if detailed and issues:
            lines.append("-" * 60)
            lines.append("  问题详情")
            lines.append("-" * 60)
            for i, issue in enumerate(issues, 1):
                severity_tag = "❌" if issue.get("severity") == "error" else "⚠️"
                lines.append(f"  {i:02d}. {severity_tag} [{issue.get('rule_id', '')}] {issue.get('rule_name', '')}")
                lines.append(f"      物品: {issue.get('item_id', '')} ({issue.get('field', '')})")
                lines.append(f"      描述: {issue.get('description', '')}")
                lines.append(f"      追溯: {issue.get('trace_id', '')}")
                lines.append("")

        if detailed:
            category_stats = summary.get("category_stats", {})
            if category_stats:
                lines.append("-" * 60)
                lines.append("  品类分布")
                lines.append("-" * 60)
                for cat, stats in sorted(category_stats.items()):
                    lines.append(
                        f"  {cat:10s} - 数量: {stats.get('count', 0):4d}, "
                        f"重量: {stats.get('weight', 0):8.2f}kg, "
                        f"体积: {stats.get('volume', 0):6.2f}cbm"
                    )
                lines.append("")

        meta = summary.get("_meta", {})
        if meta:
            lines.append("-" * 60)
            lines.append("  元数据（幂等性校验）")
            lines.append("-" * 60)
            lines.append(f"  来源:        {meta.get('source', 'N/A')}")
            lines.append(f"  物品哈希:    {meta.get('items_hash', 'N/A')[:16]}...")
            lines.append(f"  配置哈希:    {meta.get('config_hash', 'N/A')[:16]}...")
            lines.append(f"  筛选哈希:    {meta.get('filters_hash', 'N/A')[:16]}...")
            lines.append("")

        lines.append("=" * 60)

        return "\n".join(lines)

    @staticmethod
    def get_exit_code(result: Dict[str, Any]) -> int:
        """根据结果计算退出码"""
        summary = result.get("summary", {})
        error_count = summary.get("error_count", 0)
        if error_count > 0:
            return 1
        warning_count = summary.get("warning_count", 0)
        if warning_count > 0:
            return 0
        return 0

    @staticmethod
    def compare_results(result1: Dict[str, Any], result2: Dict[str, Any]) -> Dict[str, Any]:
        """比较两个处理结果的差异"""
        diff = {
            "batch_1": result1.get("batch_no", ""),
            "batch_2": result2.get("batch_no", ""),
            "items_diff": {
                "total_1": result1.get("total_count", 0),
                "total_2": result2.get("total_count", 0),
                "passed_1": result1.get("passed_count", 0),
                "passed_2": result2.get("passed_count", 0),
                "failed_1": result1.get("failed_count", 0),
                "failed_2": result2.get("failed_count", 0),
            },
            "summary_diff": {},
            "items_hash_match": False,
            "config_hash_match": False,
        }

        meta1 = result1.get("summary", {}).get("_meta", {})
        meta2 = result2.get("summary", {}).get("_meta", {})
        diff["items_hash_match"] = meta1.get("items_hash") == meta2.get("items_hash")
        diff["config_hash_match"] = meta1.get("config_hash") == meta2.get("config_hash")

        sum1 = result1.get("summary", {})
        sum2 = result2.get("summary", {})
        for key in ["total_quantity", "total_weight_kg", "total_volume_cbm", "total_value"]:
            v1 = sum1.get(key, 0)
            v2 = sum2.get(key, 0)
            if v1 != v2:
                diff["summary_diff"][key] = {"before": v1, "after": v2}

        return diff

    @staticmethod
    def format_compare(diff: Dict[str, Any]) -> str:
        """格式化比较结果"""
        lines = []
        lines.append("=" * 60)
        lines.append("  历史回放对比")
        lines.append("=" * 60)
        lines.append(f"  批次 A: {diff['batch_1']}")
        lines.append(f"  批次 B: {diff['batch_2']}")
        lines.append("")

        items_diff = diff["items_diff"]
        lines.append("-" * 60)
        lines.append("  数量对比")
        lines.append("-" * 60)
        lines.append(f"  物品总数:  {items_diff['total_1']} → {items_diff['total_2']} "
                     f"(变化: {items_diff['total_2'] - items_diff['total_1']:+d})")
        lines.append(f"  通过数量:  {items_diff['passed_1']} → {items_diff['passed_2']} "
                     f"(变化: {items_diff['passed_2'] - items_diff['passed_1']:+d})")
        lines.append(f"  异常数量:  {items_diff['failed_1']} → {items_diff['failed_2']} "
                     f"(变化: {items_diff['failed_2'] - items_diff['failed_1']:+d})")
        lines.append("")

        lines.append("-" * 60)
        lines.append("  幂等性检查")
        lines.append("-" * 60)
        lines.append(f"  输入数据一致: {'✓ 是' if diff['items_hash_match'] else '✗ 否'}")
        lines.append(f"  配置参数一致: {'✓ 是' if diff['config_hash_match'] else '✗ 否'}")
        lines.append("")

        if diff["summary_diff"]:
            lines.append("-" * 60)
            lines.append("  汇总数据差异")
            lines.append("-" * 60)
            for key, values in diff["summary_diff"].items():
                lines.append(f"  {key}: {values['before']} → {values['after']}")
            lines.append("")

        lines.append("=" * 60)
        return "\n".join(lines)
