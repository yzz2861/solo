import os
import csv
from typing import List
from datetime import datetime

from .models import (
    AssessmentResult, BadRecord, DiffRecord, ProcessingSummary, RiskLevel
)


class ResultExporter:
    def __init__(self, output_dir: str, batch_id: str, source: str, is_dry_run: bool = False):
        self.output_dir = output_dir
        self.batch_id = batch_id
        self.source = source
        self.is_dry_run = is_dry_run
        self.log_entries: List[str] = []

        os.makedirs(output_dir, exist_ok=True)

    def log(self, message: str, level: str = "INFO") -> None:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"[{timestamp}] [{level}] {message}"
        self.log_entries.append(entry)

    def export_all(
        self,
        results: List[AssessmentResult],
        bad_records: List[BadRecord],
        diffs: List[DiffRecord],
        summary: ProcessingSummary,
    ) -> dict:
        self.log(f"开始导出批次 {self.batch_id} (来源: {self.source})")
        self.log(f"总计: {summary.total_count}, 成功: {summary.success_count}, "
                 f"坏行: {summary.bad_count}, 差异: {summary.diff_count}")

        paths = {
            "success": self._path("success_results.csv"),
            "bad": self._path("bad_records.csv"),
            "diff": self._path("diff_report.csv"),
            "log": self._path("operation_log.txt"),
            "summary": self._path("summary.txt"),
        }

        if self.is_dry_run:
            self.log("[DRY-RUN] 仅预览，不写入正式结果文件")
            self._dry_run_preview(results, bad_records, diffs, summary)
            self._export_log()
            return paths

        self._export_success_results(results)
        self._export_bad_records(bad_records)
        self._export_diff_report(diffs)
        self._export_summary(summary)
        self._export_log()

        self.log("所有文件导出完成")
        return paths

    def _path(self, filename: str) -> str:
        return os.path.join(self.output_dir, f"{self.batch_id}_{filename}")

    def _dry_run_preview(
        self,
        results: List[AssessmentResult],
        bad_records: List[BadRecord],
        diffs: List[DiffRecord],
        summary: ProcessingSummary,
    ) -> None:
        self.log(f"[DRY-RUN] 预览成功结果: {len(results)} 条")
        for r in results[:5]:
            self.log(f"  - {r.bike_id} | {r.station_name} | {r.risk_level.value} | {r.export_result}")
        if len(results) > 5:
            self.log(f"  ... 共 {len(results)} 条，仅显示前 5 条")

        self.log(f"[DRY-RUN] 预览坏行: {len(bad_records)} 条")
        for b in bad_records[:3]:
            reasons = "; ".join(b.error_reasons)
            self.log(f"  - 第{b.row_number}行: {reasons}")
        if len(bad_records) > 3:
            self.log(f"  ... 共 {len(bad_records)} 条，仅显示前 3 条")

        self.log(f"[DRY-RUN] 预览差异: {len(diffs)} 条")
        for d in diffs[:5]:
            self.log(f"  - {d.bike_id}: {d.field_name} {d.old_value} -> {d.new_value} ({d.change_type})")
        if len(diffs) > 5:
            self.log(f"  ... 共 {len(diffs)} 条，仅显示前 5 条")

    def _export_success_results(self, results: List[AssessmentResult]) -> None:
        path = self._path("success_results.csv")
        self.log(f"导出成功结果文件: {path}")

        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "bike_id", "station_id", "station_name",
                "risk_level", "check_status", "reason",
                "export_result", "history_trace",
                "source", "batch_id",
            ])

            for r in results:
                writer.writerow([
                    r.bike_id,
                    r.station_id,
                    r.station_name,
                    r.risk_level.value,
                    r.check_status.value,
                    r.reason,
                    r.export_result,
                    r.history_trace,
                    r.source,
                    r.batch_id,
                ])

        self.log(f"成功结果导出完成，共 {len(results)} 条记录")

    def _export_bad_records(self, bad_records: List[BadRecord]) -> None:
        path = self._path("bad_records.csv")
        self.log(f"导出坏行文件: {path}")

        if not bad_records:
            self.log("没有坏行记录，创建空文件占位")
            with open(path, "w", encoding="utf-8-sig", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "row_number", "error_reasons", "source", "batch_id", "raw_data"
                ])
            return

        all_keys = set()
        for b in bad_records:
            all_keys.update(b.raw_data.keys())
        all_keys = sorted(all_keys)

        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            header = ["row_number", "error_reasons", "source", "batch_id"] + all_keys
            writer.writerow(header)

            for b in bad_records:
                row = [
                    b.row_number,
                    "; ".join(b.error_reasons),
                    b.source,
                    b.batch_id,
                ]
                for key in all_keys:
                    row.append(b.raw_data.get(key, ""))
                writer.writerow(row)

        self.log(f"坏行文件导出完成，共 {len(bad_records)} 条坏行")

    def _export_diff_report(self, diffs: List[DiffRecord]) -> None:
        path = self._path("diff_report.csv")
        self.log(f"导出差异表: {path}")

        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "bike_id", "station_id", "field_name",
                "old_value", "new_value", "change_type",
                "source", "batch_id",
            ])

            for d in diffs:
                writer.writerow([
                    d.bike_id,
                    d.station_id,
                    d.field_name,
                    d.old_value,
                    d.new_value,
                    d.change_type,
                    d.source,
                    d.batch_id,
                ])

        self.log(f"差异表导出完成，共 {len(diffs)} 条差异")

    def _export_summary(self, summary: ProcessingSummary) -> None:
        path = self._path("summary.txt")
        self.log(f"导出处理摘要: {path}")

        lines = [
            "=" * 60,
            "城市共享单车淤积清运处理摘要",
            "=" * 60,
            f"批次号 (batch_id): {summary.batch_id}",
            f"来源标识 (source): {summary.source}",
            f"是否试运行 (dry_run): {'是' if summary.is_dry_run else '否'}",
            f"开始时间: {summary.started_at.strftime('%Y-%m-%d %H:%M:%S')}",
            f"结束时间: {summary.finished_at.strftime('%Y-%m-%d %H:%M:%S') if summary.finished_at else '-'}",
            "-" * 60,
            "数据统计",
            "-" * 60,
            f"总记录数: {summary.total_count}",
            f"成功处理: {summary.success_count}",
            f"坏行记录: {summary.bad_count}",
            f"差异记录: {summary.diff_count}",
            "-" * 60,
            "风险分级统计",
            "-" * 60,
            f"低风险 (low_risk): {summary.low_risk_count}",
            f"中风险 (medium_risk): {summary.medium_risk_count}",
            f"高风险 (high_risk): {summary.high_risk_count}",
            f"无法判定 (undetermined): {summary.unknown_risk_count}",
            "=" * 60,
        ]

        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

    def _export_log(self) -> None:
        path = self._path("operation_log.txt")

        if self.is_dry_run:
            preview_path = self._path("dry_run_preview.txt")
            self.log(f"导出试运行预览日志: {preview_path}")
            with open(preview_path, "w", encoding="utf-8") as f:
                f.write("\n".join(self.log_entries) + "\n")
            return

        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(self.log_entries) + "\n")
