import csv
import json
import os
from io import StringIO
from datetime import datetime
from typing import List, Dict

from models import (
    CalibrationRecord,
    ValidationResult,
    CalibrationStatus,
    StatisticsResult,
    ExportFile,
    ResponsibilityMapping,
)
from config import THRESHOLD_CONFIG, MATERIAL_NAMES, STATUS_LABELS


class DataExporter:
    def __init__(
        self,
        records: List[CalibrationRecord],
        validation_results: Dict[str, ValidationResult],
        responsibility_map: Dict[str, ResponsibilityMapping],
        time_start: datetime,
        time_end: datetime,
    ):
        self.records = records
        self.validation_results = validation_results
        self.responsibility_map = responsibility_map
        self.time_start = time_start
        self.time_end = time_end

    def export_all_records(self) -> ExportFile:
        rows = []
        for record in self.records:
            result = self.validation_results.get(record.record_id)
            if not result:
                continue
            row = self._build_record_row(record, result)
            rows.append(row)

        summary = {
            "export_type": "全部校准记录",
            "total_count": len(rows),
            "time_range": f"{self.time_start.strftime('%Y-%m-%d')} ~ {self.time_end.strftime('%Y-%m-%d')}",
            "export_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        return ExportFile(
            file_name=f"calibration_records_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            file_type="csv",
            content_type="text/csv; charset=utf-8",
            rows=rows,
            summary=summary,
        )

    def export_abnormal_samples(self) -> ExportFile:
        rows = []
        for record in self.records:
            result = self.validation_results.get(record.record_id)
            if not result or result.status == CalibrationStatus.COMPLIANT:
                continue
            row = self._build_abnormal_row(record, result)
            rows.append(row)

        summary = {
            "export_type": "异常样本",
            "total_count": len(rows),
            "time_range": f"{self.time_start.strftime('%Y-%m-%d')} ~ {self.time_end.strftime('%Y-%m-%d')}",
            "export_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        return ExportFile(
            file_name=f"abnormal_samples_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            file_type="csv",
            content_type="text/csv; charset=utf-8",
            rows=rows,
            summary=summary,
        )

    def export_reminder_list(self) -> ExportFile:
        rows = []
        for record in self.records:
            result = self.validation_results.get(record.record_id)
            if not result or result.status == CalibrationStatus.COMPLIANT:
                continue
            resp = self.responsibility_map.get(record.station_id)
            row = {
                "记录ID": result.record_id,
                "站点ID": record.station_id,
                "站点名称": record.station_name,
                "区域": record.region,
                "责任部门": record.department,
                "责任人": resp.responsible_person if resp else "未分配",
                "联系电话": resp.phone if resp else "",
                "状态": STATUS_LABELS.get(result.status.value, result.status.value),
                "校准日期": record.calibration_date.strftime("%Y-%m-%d"),
                "校准类型": record.calibration_type,
                "问题原因": "; ".join(result.reasons),
                "时间窗口说明": result.time_window_explanation,
                "分组维度说明": result.dimension_explanation,
            }
            rows.append(row)

        summary = {
            "export_type": "校准提醒清单",
            "total_count": len(rows),
            "time_range": f"{self.time_start.strftime('%Y-%m-%d')} ~ {self.time_end.strftime('%Y-%m-%d')}",
            "export_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        return ExportFile(
            file_name=f"calibration_reminders_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            file_type="csv",
            content_type="text/csv; charset=utf-8",
            rows=rows,
            summary=summary,
        )

    def export_statistics_json(self, stats: StatisticsResult) -> ExportFile:
        data = {
            "summary": {
                "total_records": stats.total_records,
                "compliant_count": stats.compliant_count,
                "over_threshold_count": stats.over_threshold_count,
                "missing_material_count": stats.missing_material_count,
                "pending_count": stats.pending_count,
                "closed_loop_count": stats.closed_loop_count,
                "compliance_rate": stats.compliance_rate,
                "time_range": {
                    "start": self.time_start.strftime("%Y-%m-%d"),
                    "end": self.time_end.strftime("%Y-%m-%d"),
                },
            },
            "group_statistics": stats.group_stats,
            "trend_points": [
                {
                    "time_label": tp.time_label,
                    "total_count": tp.total_count,
                    "compliant_count": tp.compliant_count,
                    "over_threshold_count": tp.over_threshold_count,
                    "missing_material_count": tp.missing_material_count,
                    "pending_count": tp.pending_count,
                }
                for tp in stats.trend_points
            ],
            "top_abnormal_stations": stats.top_abnormal_stations,
            "export_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        return ExportFile(
            file_name=f"statistics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            file_type="json",
            content_type="application/json; charset=utf-8",
            rows=[data],
            summary={
                "export_type": "统计数据(JSON)",
                "total_count": 1,
            },
        )

    def _build_record_row(self, record: CalibrationRecord, result: ValidationResult) -> Dict:
        row = {
            "记录ID": result.record_id,
            "站点ID": record.station_id,
            "站点名称": record.station_name,
            "区域": record.region,
            "部门": record.department,
            "校准类型": record.calibration_type,
            "校准日期": record.calibration_date.strftime("%Y-%m-%d"),
            "操作员": record.operator,
            "状态": STATUS_LABELS.get(result.status.value, result.status.value),
            "是否合规": "是" if result.is_valid else "否",
            "原因说明": "; ".join(result.reasons),
            "时间窗口说明": result.time_window_explanation,
            "分组维度说明": result.dimension_explanation,
        }
        for param_key, param_config in THRESHOLD_CONFIG.items():
            value = record.parameters.get(param_key, "")
            row[f"{param_config['name']}({param_config['unit']})"] = value
        for mat_key, mat_name in MATERIAL_NAMES.items():
            has_mat = record.materials.get(mat_key, False)
            row[f"材料-{mat_name}"] = "是" if has_mat else "否"
        return row

    def _build_abnormal_row(self, record: CalibrationRecord, result: ValidationResult) -> Dict:
        row = {
            "记录ID": result.record_id,
            "站点ID": record.station_id,
            "站点名称": record.station_name,
            "区域": record.region,
            "部门": record.department,
            "状态": STATUS_LABELS.get(result.status.value, result.status.value),
            "校准日期": record.calibration_date.strftime("%Y-%m-%d"),
            "超阈值参数数量": len(result.threshold_hits),
            "缺失材料数量": len(result.missing_materials),
            "原因详情": "; ".join(result.reasons),
            "超阈值详情": "; ".join([
                f"{THRESHOLD_CONFIG[h.parameter]['name']}: {h.measured_value}{h.unit}(阈值{h.threshold_value}{h.unit}, 超{h.exceed_ratio}%)"
                for h in result.threshold_hits
            ]) if result.threshold_hits else "",
            "缺失材料": ", ".join([
                MATERIAL_NAMES.get(m, m) for m in result.missing_materials
            ]) if result.missing_materials else "",
            "时间窗口说明": result.time_window_explanation,
            "分组维度说明": result.dimension_explanation,
        }
        return row

    def save_to_file(self, export_file: ExportFile, output_dir: str = ".") -> str:
        os.makedirs(output_dir, exist_ok=True)
        file_path = os.path.join(output_dir, export_file.file_name)

        if export_file.file_type == "csv":
            self._save_csv(file_path, export_file.rows)
        elif export_file.file_type == "json":
            self._save_json(file_path, export_file.rows[0])

        return file_path

    def _save_csv(self, file_path: str, rows: List[Dict]):
        if not rows:
            with open(file_path, "w", encoding="utf-8-sig", newline="") as f:
                f.write("")
            return

        fieldnames = list(rows[0].keys())
        with open(file_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in rows:
                writer.writerow(row)

    def _save_json(self, file_path: str, data: Dict):
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def csv_to_string(self, export_file: ExportFile) -> str:
        if not export_file.rows:
            return ""
        output = StringIO()
        fieldnames = list(export_file.rows[0].keys())
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for row in export_file.rows:
            writer.writerow(row)
        return output.getvalue()
