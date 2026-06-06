"""导出功能模块"""

import csv
import json
import os
from typing import Dict, Any, List


class Exporter:
    """结果导出器"""

    SUPPORTED_FORMATS = ["csv", "json", "excel"]

    def __init__(self, output_dir: str = "data/output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def export_passed(self, result: Dict[str, Any], fmt: str = "csv") -> str:
        """导出通过清单"""
        items = result.get("passed_items", [])
        batch_no = result.get("batch_no", "unknown")
        return self._export_items(items, f"{batch_no}_passed", fmt)

    def export_failed(self, result: Dict[str, Any], fmt: str = "csv") -> str:
        """导出异常清单"""
        items = result.get("failed_items", [])
        batch_no = result.get("batch_no", "unknown")
        return self._export_items(items, f"{batch_no}_failed", fmt)

    def export_issues(self, result: Dict[str, Any], fmt: str = "csv") -> str:
        """导出问题清单"""
        issues = result.get("issues", [])
        batch_no = result.get("batch_no", "unknown")
        return self._export_issues(issues, f"{batch_no}_issues", fmt)

    def export_summary(self, result: Dict[str, Any], fmt: str = "csv") -> str:
        """导出摘要"""
        summary = result.get("summary", {})
        batch_no = result.get("batch_no", "unknown")
        return self._export_summary(summary, f"{batch_no}_summary", fmt)

    def export_all(self, result: Dict[str, Any], fmt: str = "csv") -> Dict[str, str]:
        """导出所有内容"""
        return {
            "passed": self.export_passed(result, fmt),
            "failed": self.export_failed(result, fmt),
            "issues": self.export_issues(result, fmt),
            "summary": self.export_summary(result, fmt),
        }

    def _export_items(self, items: List[Dict[str, Any]], filename: str, fmt: str) -> str:
        """导出物品列表"""
        if fmt == "json":
            return self._export_json(items, f"{filename}.json")
        elif fmt == "csv":
            return self._export_csv(items, f"{filename}.csv")
        else:
            raise ValueError(f"不支持的导出格式: {fmt}")

    def _export_issues(self, issues: List[Dict[str, Any]], filename: str, fmt: str) -> str:
        """导出问题列表"""
        if fmt == "json":
            return self._export_json(issues, f"{filename}.json")
        elif fmt == "csv":
            return self._export_csv(issues, f"{filename}.csv")
        else:
            raise ValueError(f"不支持的导出格式: {fmt}")

    def _export_summary(self, summary: Dict[str, Any], filename: str, fmt: str) -> str:
        """导出摘要"""
        summary_rows = self._flatten_summary(summary)
        if fmt == "json":
            return self._export_json(summary, f"{filename}.json")
        elif fmt == "csv":
            return self._export_csv(summary_rows, f"{filename}.csv")
        else:
            raise ValueError(f"不支持的导出格式: {fmt}")

    def _flatten_summary(self, summary: Dict[str, Any]) -> List[Dict[str, Any]]:
        """将摘要数据扁平化，便于CSV导出"""
        rows = []

        basic_fields = [
            ("total_items", "物品总数"),
            ("total_quantity", "总数量"),
            ("total_weight_kg", "总重量(kg)"),
            ("total_volume_cbm", "总体积(cbm)"),
            ("total_value", "总价值"),
            ("fragile_items", "易碎品数量"),
            ("need_packing_items", "需打包数量"),
            ("error_count", "错误数"),
            ("warning_count", "警告数"),
        ]

        for key, label in basic_fields:
            if key in summary:
                rows.append({
                    "类别": "基础统计",
                    "项目": label,
                    "数值": summary[key],
                    "说明": "",
                })

        category_stats = summary.get("category_stats", {})
        for cat, stats in category_stats.items():
            rows.append({
                "类别": f"品类-{cat}",
                "项目": "数量",
                "数值": stats.get("count", 0),
                "说明": "",
            })
            rows.append({
                "类别": f"品类-{cat}",
                "项目": "重量(kg)",
                "数值": stats.get("weight", 0),
                "说明": "",
            })
            rows.append({
                "类别": f"品类-{cat}",
                "项目": "体积(cbm)",
                "数值": stats.get("volume", 0),
                "说明": "",
            })
            rows.append({
                "类别": f"品类-{cat}",
                "项目": "价值",
                "数值": stats.get("value", 0),
                "说明": "",
            })

        meta = summary.get("_meta", {})
        for key, value in meta.items():
            rows.append({
                "类别": "元数据",
                "项目": key,
                "数值": str(value),
                "说明": "用于幂等性校验",
            })

        return rows

    def _export_json(self, data: Any, filename: str) -> str:
        """导出为JSON"""
        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return filepath

    def _export_csv(self, data: List[Dict[str, Any]], filename: str) -> str:
        """导出为CSV"""
        filepath = os.path.join(self.output_dir, filename)
        if not data:
            with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["无数据"])
            return filepath

        fieldnames = list(data[0].keys())
        with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in data:
                writer.writerow(row)
        return filepath

    @staticmethod
    def load_result(result_path: str) -> Dict[str, Any]:
        """加载处理结果文件"""
        with open(result_path, "r", encoding="utf-8") as f:
            return json.load(f)
