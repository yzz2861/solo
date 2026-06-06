import csv
import os
from typing import List, Dict, Any

from .config import AppConfig
from .logger import OperationLogger


class DataExporter:
    def __init__(self, config: AppConfig, logger: OperationLogger):
        self.config = config
        self.logger = logger

    def export_all(
        self,
        success_results: List[Dict[str, Any]],
        bad_rows: List[Dict[str, Any]],
        diff_results: List[Dict[str, Any]],
    ):
        if self.config.dry_run:
            self.logger.info("DRY-RUN 模式：仅预览，不导出文件")
            self._preview_results(success_results, bad_rows, diff_results)
            return

        output_dir = self.config.output.output_dir
        os.makedirs(output_dir, exist_ok=True)

        self.logger.info(f"开始导出结果到目录: {output_dir}")

        success_path = self._export_success_results(success_results)
        bad_path = self._export_bad_rows(bad_rows)
        diff_path = self._export_diff_results(diff_results)

        self.logger.info("所有文件导出完成")
        self.logger.info(f"  - 成功结果: {success_path}")
        self.logger.info(f"  - 坏行文件: {bad_path}")
        self.logger.info(f"  - 差异表: {diff_path}")
        self.logger.info(f"  - 操作日志: {os.path.join(output_dir, self.config.output.log_file)}")

    def _preview_results(
        self,
        success_results: List[Dict[str, Any]],
        bad_rows: List[Dict[str, Any]],
        diff_results: List[Dict[str, Any]],
    ):
        self.logger.info("=" * 60)
        self.logger.info("【预览】成功结果 (前5条）")
        self.logger.info("=" * 60)
        for i, row in enumerate(success_results[:5]):
            self.logger.info(
                f"  [{i+1}] 归并ID={row.get('merge_id', '')} | "
                f"地址={row.get('address', '')} | "
                f"投诉数={row.get('complaint_count', '')} | "
                f"风险={row.get('risk_level_label', '')}"
            )
        if len(success_results) > 5:
            self.logger.info(f"  ... 共 {len(success_results)} 条")

        self.logger.info("=" * 60)
        self.logger.info("【预览】坏行 (前5条）")
        self.logger.info("=" * 60)
        for i, row in enumerate(bad_rows[:5]):
            self.logger.info(
                f"  [{i+1}] 行号={row.get('_row_no', '')} | "
                f"原因={row.get('_bad_reason_labels', '')} | "
                f"追溯号={row.get('_trace_id', '')}"
            )
        if len(bad_rows) > 5:
            self.logger.info(f"  ... 共 {len(bad_rows)} 条")

        self.logger.info("=" * 60)
        self.logger.info("【预览】差异 (前5条）")
        self.logger.info("=" * 60)
        for i, row in enumerate(diff_results[:5]):
            self.logger.info(
                f"  [{i+1}] 类型={row.get('_diff_type_label', '')} | "
                f"归并ID={row.get('merge_id', '')} | "
                f"变化字段={row.get('_changed_fields', '')}"
            )
        if len(diff_results) > 5:
            self.logger.info(f"  ... 共 {len(diff_results)} 条")

    def _export_success_results(
        self, results: List[Dict[str, Any]]
    ) -> str:
        output_path = os.path.join(
            self.config.output.output_dir, self.config.output.success_file
        )

        if not results:
            self.logger.warning("无成功结果数据，创建空文件")
            with open(output_path, 'w', encoding=self.config.output.encoding, newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['merge_id', 'batch_no', 'source_system'])
            return output_path

        success_keys = [
            'merge_id',
            'complaint_count',
            'merged_complaint_ids',
            'first_complaint_time',
            'last_complaint_time',
            'complainant',
            'phone',
            'address',
            'complaint_content',
            'noise_type',
            'source',
            'risk_level',
            'risk_level_label',
            'risk_score',
            'risk_reasons',
            'trace_ids',
            'batch_no',
            'source_system',
        ]

        available_keys = [k for k in success_keys if any(k in r for r in results)]

        with open(output_path, 'w', encoding=self.config.output.encoding, newline='') as f:
            writer = csv.DictWriter(f, fieldnames=available_keys, extrasaction='ignore')
            writer.writeheader()
            for row in results:
                export_row = {k: row.get(k, '') for k in available_keys}
                writer.writerow(export_row)

        self.logger.info(f"成功结果已导出: {output_path} ({len(results)} 条)")
        return output_path

    def _export_bad_rows(self, bad_rows: List[Dict[str, Any]]) -> str:
        output_path = os.path.join(
            self.config.output.output_dir, self.config.output.bad_rows_file
        )

        if not bad_rows:
            self.logger.info("无坏行数据，创建空文件")
            with open(output_path, 'w', encoding=self.config.output.encoding, newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['_trace_id', '_row_no', '_bad_reason_labels'])
            return output_path

        base_keys = [
            '_trace_id',
            '_row_no',
            '_source_file',
            '_batch_no',
            '_source_system',
            '_bad_reason_codes',
            '_bad_reason_labels',
            '_bad_reason_details',
        ]

        data_keys = []
        for row in bad_rows:
            for key in row.keys():
                if key not in base_keys and not key.startswith('_bad_reasons') and key not in data_keys:
                    data_keys.append(key)

        all_keys = base_keys + data_keys

        with open(output_path, 'w', encoding=self.config.output.encoding, newline='') as f:
            writer = csv.DictWriter(f, fieldnames=all_keys, extrasaction='ignore')
            writer.writeheader()
            for row in bad_rows:
                export_row = {}
                for k in all_keys:
                    val = row.get(k, '')
                    if isinstance(val, list):
                        val = str(val)
                    export_row[k] = val
                writer.writerow(export_row)

        self.logger.info(f"坏行已导出: {output_path} ({len(bad_rows)} 条)")
        return output_path

    def _export_diff_results(
        self, diff_results: List[Dict[str, Any]]
    ) -> str:
        output_path = os.path.join(
            self.config.output.output_dir, self.config.output.diff_file
        )

        if not diff_results:
            self.logger.info("无差异数据，创建空文件")
            with open(output_path, 'w', encoding=self.config.output.encoding, newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['merge_id', '_diff_type_label'])
            return output_path

        diff_meta_keys = [
            '_diff_type',
            '_diff_type_label',
            '_changed_fields',
            '_last_merge_id',
        ]

        data_keys = []
        for row in diff_results:
            for key in row.keys():
                if (
                    key not in diff_meta_keys
                    and not key.startswith('_')
                    and key not in data_keys
                    and key != '_original_rows'
                ):
                    data_keys.append(key)

        all_keys = diff_meta_keys + data_keys

        with open(output_path, 'w', encoding=self.config.output.encoding, newline='') as f:
            writer = csv.DictWriter(f, fieldnames=all_keys, extrasaction='ignore')
            writer.writeheader()
            for row in diff_results:
                export_row = {}
                for k in all_keys:
                    val = row.get(k, '')
                    if isinstance(val, (list, dict)):
                        val = str(val)
                    export_row[k] = val
                writer.writerow(export_row)

        self.logger.info(f"差异表已导出: {output_path} ({len(diff_results)} 条)")
        return output_path
