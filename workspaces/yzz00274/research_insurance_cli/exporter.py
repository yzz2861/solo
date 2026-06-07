"""多格式数据导出器"""

import os
import json
from typing import List, Dict, Any

from .models import ProcessResult, InsuranceRecord
from .config import RecordStatus


class DataExporter:
    def __init__(self, output_dir: str = "."):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def export(
        self,
        result: ProcessResult,
        fmt: str = "csv",
        split_files: bool = True,
    ) -> Dict[str, str]:
        fmt = fmt.lower()
        if fmt not in ["csv", "excel", "json"]:
            raise ValueError(f"不支持的导出格式：{fmt}")

        exported_files = {}

        if split_files:
            exported_files["正常"] = self._export_by_status(
                result.normal_records, result.batch_id, "正常", fmt
            )
            exported_files["异常"] = self._export_by_status(
                result.abnormal_records, result.batch_id, "异常", fmt
            )
            exported_files["待复核"] = self._export_by_status(
                result.pending_records, result.batch_id, "待复核", fmt
            )
            exported_files["汇总"] = self._export_by_status(
                result.records, result.batch_id, "全部", fmt
            )
        else:
            exported_files["全部"] = self._export_by_status(
                result.records, result.batch_id, "全部", fmt
            )

        summary_file = self._export_summary(result, fmt)
        exported_files["统计摘要"] = summary_file

        return exported_files

    def _export_by_status(
        self,
        records: List[InsuranceRecord],
        batch_id: str,
        status_label: str,
        fmt: str,
    ) -> str:
        filename = f"{batch_id}_{status_label}"
        filepath = os.path.join(self.output_dir, filename)

        data = [r.to_compact_dict() for r in records]

        if fmt == "csv":
            return self._export_csv(data, filepath)
        elif fmt == "excel":
            return self._export_excel(data, filepath)
        elif fmt == "json":
            return self._export_json(data, filepath)

        return filepath

    def _export_csv(self, data: List[Dict[str, Any]], filepath: str) -> str:
        import csv

        filepath = filepath + ".csv"
        if not data:
            with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
                pass
            return filepath

        fieldnames = list(data[0].keys())
        with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)

        return filepath

    def _export_excel(self, data: List[Dict[str, Any]], filepath: str) -> str:
        try:
            import pandas as pd
        except ImportError:
            return self._export_csv(data, filepath)

        filepath = filepath + ".xlsx"
        df = pd.DataFrame(data)
        df.to_excel(filepath, index=False, engine="openpyxl")
        return filepath

    def _export_json(self, data: List[Dict[str, Any]], filepath: str) -> str:
        filepath = filepath + ".json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return filepath

    def _export_summary(self, result: ProcessResult, fmt: str) -> str:
        summary = {
            "基本信息": result.summary(),
            "风险分布": self._risk_distribution(result),
            "按来源文件统计": self._by_source_file(result),
        }

        filename = f"{result.batch_id}_统计摘要"
        filepath = os.path.join(self.output_dir, filename)

        if fmt == "json":
            return self._export_json([summary], filepath)
        elif fmt == "excel":
            return self._export_summary_excel(summary, filepath)
        else:
            summary_rows = []
            for key, value in summary["基本信息"].items():
                if isinstance(value, list):
                    value = ", ".join(value)
                summary_rows.append({"项目": key, "值": value})
            summary_rows.append({})
            summary_rows.append({"项目": "风险等级", "值": "记录数"})
            for risk, count in summary["风险分布"].items():
                summary_rows.append({"项目": risk, "值": count})
            return self._export_csv(summary_rows, filepath)

    def _export_summary_excel(self, summary: Dict, filepath: str) -> str:
        try:
            import pandas as pd
        except ImportError:
            return self._export_summary_csv(summary, filepath)

        filepath = filepath + ".xlsx"
        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            basic_df = pd.DataFrame(
                list(summary["基本信息"].items()),
                columns=["项目", "值"],
            )
            basic_df.to_excel(writer, sheet_name="基本信息", index=False)

            risk_df = pd.DataFrame(
                list(summary["风险分布"].items()),
                columns=["风险等级", "记录数"],
            )
            risk_df.to_excel(writer, sheet_name="风险分布", index=False)

            source_df = pd.DataFrame(summary["按来源文件统计"])
            source_df.to_excel(writer, sheet_name="来源文件统计", index=False)

        return filepath

    def _export_summary_csv(self, summary: Dict, filepath: str) -> str:
        rows = []
        for key, value in summary["基本信息"].items():
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value)
            rows.append({"项目": key, "值": str(value)})
        return self._export_csv(rows, filepath)

    def _risk_distribution(self, result: ProcessResult) -> Dict[str, int]:
        from .config import RISK_CN

        distribution = {}
        for record in result.records:
            risk_cn = record.risk_level_cn
            distribution[risk_cn] = distribution.get(risk_cn, 0) + 1
        return distribution

    def _by_source_file(self, result: ProcessResult) -> List[Dict]:
        from collections import defaultdict

        stats = defaultdict(lambda: {"总数": 0, "正常": 0, "异常": 0, "待复核": 0})

        for record in result.records:
            s = stats[record.source_file]
            s["总数"] += 1
            if record.status == RecordStatus.NORMAL:
                s["正常"] += 1
            elif record.status == RecordStatus.ABNORMAL:
                s["异常"] += 1
            elif record.status == RecordStatus.PENDING_REVIEW:
                s["待复核"] += 1

        result_list = []
        for source, counts in stats.items():
            result_list.append({"来源文件": source, **counts})
        return result_list
