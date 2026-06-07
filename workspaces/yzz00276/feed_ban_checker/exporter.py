"""多格式导出模块。"""
import os
import json
from typing import Dict, List

import pandas as pd

from .config import ExportFormat, ProcessContext
from .models import ProcessResult, FormulaRow, BadRow, CheckResult, DiffRecord


class ResultExporter:
    """结果导出器。"""

    def __init__(self, output_dir: str, fmt: ExportFormat, ctx: ProcessContext):
        self.output_dir = output_dir
        self.fmt = fmt
        self.ctx = ctx
        os.makedirs(output_dir, exist_ok=True)

    def export_all(self, result: ProcessResult) -> Dict[str, str]:
        """导出所有结果文件。"""
        files = {}

        files["success"] = self._export_success(result)
        files["bad_rows"] = self._export_bad_rows(result)
        files["diff"] = self._export_diff(result)
        files["summary"] = self._export_summary(result)

        return files

    def _export_success(self, result: ProcessResult) -> str:
        """导出成功结果（含风险标记、批次、来源）。"""
        records = []
        for cr in result.check_results:
            rec = {
                "处理批次": result.batch_id,
                "来源文件": cr.row.source_file,
                "原始行号": cr.row.row_index,
                "配方编号": cr.row.formula_id,
                "配方名称": cr.row.formula_name,
                "原料名称": cr.row.ingredient_name,
                "原料编码": cr.row.ingredient_code,
                "添加量": cr.row.dosage,
                "添加量单位": cr.row.dosage_unit,
                "生效日期": cr.row.effective_date,
                "是否命中禁用料": "是" if cr.is_banned else "否",
                "风险等级": cr.risk_level.value,
                "匹配方式": cr.matched_by,
                "命中禁料名称": cr.banned_ingredient_name,
                "异常解释": cr.reason,
                "备注": cr.row.remark,
            }
            records.append(rec)

        df = pd.DataFrame(records)
        path_prefix = self._make_path(f"{result.batch_id}_成功结果")
        return self._write_df(df, path_prefix)

    def _export_bad_rows(self, result: ProcessResult) -> str:
        """导出坏行文件。"""
        records = []
        for br in result.bad_rows_list:
            rec = {
                "处理批次": result.batch_id,
                "来源文件": br.source_file,
                "原始行号": br.row_index,
                "错误类型": br.error_type,
                "错误信息": br.error_message,
            }
            for k, v in br.raw_data.items():
                rec[f"原始_{k}"] = v
            records.append(rec)

        df = pd.DataFrame(records)
        path_prefix = self._make_path(f"{result.batch_id}_坏行")
        return self._write_df(df, path_prefix)

    def _export_diff(self, result: ProcessResult) -> str:
        """导出差异表。"""
        records = []
        for dr in result.diff_records:
            records.append({
                "处理批次": result.batch_id,
                "来源文件": dr.source_file,
                "原始行号": dr.row_index,
                "配方编号": dr.formula_id,
                "字段名": dr.field_name,
                "原始值": dr.original_value,
                "期望值/命中值": dr.expected_value,
                "差异类型": dr.diff_type,
            })

        df = pd.DataFrame(records)
        path_prefix = self._make_path(f"{result.batch_id}_差异表")
        return self._write_df(df, path_prefix)

    def _export_summary(self, result: ProcessResult) -> str:
        """导出汇总报告。"""
        summary = {
            "处理批次": result.batch_id,
            "任务状态": result.task_status.value,
            "处理时间": result.processed_at.strftime("%Y-%m-%d %H:%M:%S"),
            "来源文件": ", ".join(result.source_files),
            "总行数": result.total_rows,
            "有效行数": result.valid_rows,
            "坏行数": result.bad_rows,
            "命中禁用料数": result.banned_count,
            "高风险数": result.high_risk_count,
            "中风险数": result.medium_risk_count,
            "低风险数": result.low_risk_count,
            "无法判定数": result.unknown_risk_count,
            "错误信息": "; ".join(result.errors) if result.errors else "",
            "警告信息": "; ".join(result.warnings) if result.warnings else "",
            "输出文件": "; ".join(f"{k}: {v}" for k, v in result.output_files.items()),
        }

        if self.fmt == ExportFormat.JSON:
            path = self._make_path(f"{result.batch_id}_汇总") + ".json"
            with open(path, "w", encoding="utf-8") as f:
                json.dump(summary, f, ensure_ascii=False, indent=2)
        else:
            df = pd.DataFrame([summary])
            path_prefix = self._make_path(f"{result.batch_id}_汇总")
            return self._write_df(df, path_prefix)
        return path

    def _make_path(self, name: str) -> str:
        return os.path.join(self.output_dir, name)

    def _write_df(self, df: pd.DataFrame, path_prefix: str) -> str:
        if self.fmt == ExportFormat.CSV:
            path = path_prefix + ".csv"
            df.to_csv(path, index=False, encoding="utf-8-sig")
        elif self.fmt == ExportFormat.EXCEL:
            path = path_prefix + ".xlsx"
            with pd.ExcelWriter(path, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="Sheet1")
        elif self.fmt == ExportFormat.JSON:
            path = path_prefix + ".json"
            df.to_json(path, orient="records", force_ascii=False, indent=2)
        else:
            raise ValueError(f"不支持的导出格式: {self.fmt}")
        return path
