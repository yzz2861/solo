import os
import json
import re
from typing import Tuple, List, Dict, Any
from datetime import datetime

from .config import AppConfig, OutputConfig, MergeParams, FilterParams, RiskLevel


class ValidationError(Exception):
    pass


class ConfigValidator:
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def validate(self, config: AppConfig) -> Tuple[bool, List[str], List[str]]:
        self.errors = []
        self.warnings = []

        self._validate_input_files(config)
        self._validate_params_file(config)
        self._validate_filter_file(config)
        self._validate_batch_no(config)
        self._validate_output_config(config)
        self._validate_merge_params(config)

        is_valid = len(self.errors) == 0
        return is_valid, self.errors, self.warnings

    def _validate_input_files(self, config: AppConfig):
        if not config.business_ledger_path:
            self.errors.append("业务台账路径不能为空")
        elif not os.path.exists(config.business_ledger_path):
            self.errors.append(f"业务台账文件不存在: {config.business_ledger_path}")
        elif not os.path.isfile(config.business_ledger_path):
            self.errors.append(f"业务台账路径不是文件: {config.business_ledger_path}")
        else:
            ext = os.path.splitext(config.business_ledger_path)[1].lower()
            if ext not in ['.csv', '.xlsx', '.xls']:
                self.warnings.append(f"业务台账文件格式 {ext} 可能不受支持，建议使用 CSV 或 Excel")

        if not config.params_path:
            self.errors.append("参数文件路径不能为空")
        elif not os.path.exists(config.params_path):
            self.errors.append(f"参数文件不存在: {config.params_path}")
        elif not os.path.isfile(config.params_path):
            self.errors.append(f"参数文件路径不是文件: {config.params_path}")

        if config.last_result_path:
            if not os.path.exists(config.last_result_path):
                self.warnings.append(f"上次结果文件不存在，将跳过差异对比: {config.last_result_path}")
            elif not os.path.isfile(config.last_result_path):
                self.warnings.append(f"上次结果路径不是文件，将跳过差异对比: {config.last_result_path}")

        if config.filter_path:
            if not os.path.exists(config.filter_path):
                self.warnings.append(f"筛选条件文件不存在，将使用默认筛选: {config.filter_path}")
            elif not os.path.isfile(config.filter_path):
                self.warnings.append(f"筛选条件路径不是文件，将使用默认筛选: {config.filter_path}")

    def _validate_params_file(self, config: AppConfig):
        if not os.path.exists(config.params_path):
            return
        try:
            with open(config.params_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if not isinstance(data, dict):
                self.errors.append("参数文件格式错误，应为 JSON 对象")
        except json.JSONDecodeError as e:
            self.errors.append(f"参数文件 JSON 解析失败: {e}")
        except Exception as e:
            self.errors.append(f"读取参数文件失败: {e}")

    def _validate_filter_file(self, config: AppConfig):
        if not config.filter_path or not os.path.exists(config.filter_path):
            return
        try:
            with open(config.filter_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if not isinstance(data, dict):
                self.warnings.append("筛选条件文件格式错误，应为 JSON 对象，将使用默认筛选")
            if 'start_date' in data and data['start_date']:
                if not self._is_valid_date(data['start_date']):
                    self.warnings.append(f"筛选起始日期格式无效: {data['start_date']}")
            if 'end_date' in data and data['end_date']:
                if not self._is_valid_date(data['end_date']):
                    self.warnings.append(f"筛选结束日期格式无效: {data['end_date']}")
        except json.JSONDecodeError as e:
            self.warnings.append(f"筛选条件文件 JSON 解析失败: {e}，将使用默认筛选")
        except Exception as e:
            self.warnings.append(f"读取筛选条件文件失败: {e}，将使用默认筛选")

    def _validate_batch_no(self, config: AppConfig):
        if not config.batch_no:
            self.errors.append("批次号不能为空")
        elif len(config.batch_no) < 8:
            self.warnings.append("批次号长度较短，建议使用更长的唯一标识")
        if not config.source_system:
            self.warnings.append("来源系统标识为空")

    def _validate_output_config(self, config: AppConfig):
        out = config.output
        if not out.output_dir:
            self.errors.append("输出目录不能为空")

        if out.success_file and not out.success_file.endswith('.csv'):
            self.warnings.append("成功结果文件建议使用 .csv 扩展名")
        if out.bad_rows_file and not out.bad_rows_file.endswith('.csv'):
            self.warnings.append("坏行文件建议使用 .csv 扩展名")
        if out.diff_file and not out.diff_file.endswith('.csv'):
            self.warnings.append("差异表文件建议使用 .csv 扩展名")

        if config.dry_run:
            self.warnings.append("DRY-RUN 模式：仅预览，不会写入正式结果文件")

    def _validate_merge_params(self, config: AppConfig):
        mp = config.merge
        if mp.same_address_distance_threshold <= 0:
            self.errors.append("同地址归并距离阈值必须大于0")
        if mp.time_window_hours <= 0:
            self.errors.append("时间窗口小时数必须大于0")
        if mp.risk_score_low_max <= 0:
            self.errors.append("低风险分数上限必须大于0")
        if mp.risk_score_medium_max <= mp.risk_score_low_max:
            self.errors.append("中风险分数上限必须大于低风险上限")

    @staticmethod
    def _is_valid_date(date_str: str) -> bool:
        formats = [
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%Y-%m-%d %H:%M:%S",
            "%Y/%m/%d %H:%M:%S",
            "%Y%m%d",
        ]
        for fmt in formats:
            try:
                datetime.strptime(date_str, fmt)
                return True
            except ValueError:
                continue
        return False


def load_config_from_args(
    business_ledger: str,
    params_file: str,
    last_result: str = None,
    filter_file: str = None,
    dry_run: bool = False,
    batch_no: str = None,
    output_dir: str = None,
    source_system: str = "decoration_noise_complaint",
) -> AppConfig:
    config = AppConfig(
        business_ledger_path=business_ledger,
        params_path=params_file,
        last_result_path=last_result if last_result else None,
        filter_path=filter_file if filter_file else None,
        dry_run=dry_run,
        source_system=source_system,
    )

    if batch_no:
        config.batch_no = batch_no

    if output_dir:
        config.output.output_dir = output_dir

    if os.path.exists(params_file):
        try:
            with open(params_file, 'r', encoding='utf-8') as f:
                params_data = json.load(f)

            if 'output' in params_data and isinstance(params_data['output'], dict):
                out_data = params_data['output']
                if 'output_dir' in out_data and not output_dir:
                    config.output.output_dir = out_data['output_dir']
                if 'success_file' in out_data:
                    config.output.success_file = out_data['success_file']
                if 'bad_rows_file' in out_data:
                    config.output.bad_rows_file = out_data['bad_rows_file']
                if 'diff_file' in out_data:
                    config.output.diff_file = out_data['diff_file']
                if 'log_file' in out_data:
                    config.output.log_file = out_data['log_file']
                if 'encoding' in out_data:
                    config.output.encoding = out_data['encoding']

            if 'merge' in params_data and isinstance(params_data['merge'], dict):
                merge_data = params_data['merge']
                if 'same_address_distance_threshold' in merge_data:
                    config.merge.same_address_distance_threshold = merge_data['same_address_distance_threshold']
                if 'same_complainant_merge' in merge_data:
                    config.merge.same_complainant_merge = merge_data['same_complainant_merge']
                if 'time_window_hours' in merge_data:
                    config.merge.time_window_hours = merge_data['time_window_hours']
                if 'risk_score_low_max' in merge_data:
                    config.merge.risk_score_low_max = merge_data['risk_score_low_max']
                if 'risk_score_medium_max' in merge_data:
                    config.merge.risk_score_medium_max = merge_data['risk_score_medium_max']
                if 'high_risk_keywords' in merge_data:
                    config.merge.high_risk_keywords = merge_data['high_risk_keywords']
                if 'medium_risk_keywords' in merge_data:
                    config.merge.medium_risk_keywords = merge_data['medium_risk_keywords']

        except Exception:
            pass

    if filter_file and os.path.exists(filter_file):
        try:
            with open(filter_file, 'r', encoding='utf-8') as f:
                filter_data = json.load(f)

            if 'start_date' in filter_data:
                config.filters.start_date = filter_data['start_date']
            if 'end_date' in filter_data:
                config.filters.end_date = filter_data['end_date']
            if 'noise_types' in filter_data and isinstance(filter_data['noise_types'], list):
                config.filters.noise_types = filter_data['noise_types']
            if 'districts' in filter_data and isinstance(filter_data['districts'], list):
                config.filters.districts = filter_data['districts']
            if 'sources' in filter_data and isinstance(filter_data['sources'], list):
                config.filters.sources = filter_data['sources']
            if 'min_risk_level' in filter_data:
                try:
                    config.filters.min_risk_level = RiskLevel(filter_data['min_risk_level'])
                except ValueError:
                    pass

        except Exception:
            pass

    return config
