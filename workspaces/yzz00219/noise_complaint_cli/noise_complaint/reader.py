import csv
import os
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from .config import AppConfig
from .logger import OperationLogger


class DataReader:
    def __init__(self, config: AppConfig, logger: OperationLogger):
        self.config = config
        self.logger = logger

    def read_business_ledger(self) -> List[Dict[str, Any]]:
        self.logger.info(f"开始读取业务台账: {self.config.business_ledger_path}")
        path = self.config.business_ledger_path

        if not os.path.exists(path):
            raise FileNotFoundError(f"业务台账文件不存在: {path}")

        ext = os.path.splitext(path)[1].lower()

        if ext == '.csv':
            rows = self._read_csv(path)
        elif ext in ['.xlsx', '.xls']:
            rows = self._read_excel(path)
        else:
            self.logger.warning(f"未知文件格式 {ext}，尝试按 CSV 读取")
            rows = self._read_csv(path)

        self.logger.info(f"业务台账读取完成，共 {len(rows)} 行数据")
        return rows

    def _read_csv(self, path: str) -> List[Dict[str, Any]]:
        rows = []
        encodings = ['utf-8-sig', 'utf-8', 'gbk', 'gb2312']

        for encoding in encodings:
            try:
                with open(path, 'r', encoding=encoding) as f:
                    reader = csv.DictReader(f)
                    for i, row in enumerate(reader, start=2):
                        row['_row_no'] = i
                        row['_source_file'] = os.path.basename(path)
                        rows.append(dict(row))
                self.logger.debug(f"使用编码 {encoding} 成功读取 CSV")
                break
            except UnicodeDecodeError:
                continue
            except Exception as e:
                self.logger.error(f"读取 CSV 失败: {e}")
                raise

        return rows

    def _read_excel(self, path: str) -> List[Dict[str, Any]]:
        try:
            import openpyxl
        except ImportError:
            self.logger.error("需要 openpyxl 库来读取 Excel 文件，请先安装: pip install openpyxl")
            raise

        try:
            wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
            ws = wb.active

            rows = []
            headers = []

            for row_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
                if row_idx == 1:
                    headers = [str(cell) if cell is not None else '' for cell in row]
                    continue

                row_data = {}
                for col_idx, cell in enumerate(row):
                    key = headers[col_idx] if col_idx < len(headers) else f'col_{col_idx}'
                    row_data[key] = str(cell) if cell is not None else ''

                row_data['_row_no'] = row_idx
                row_data['_source_file'] = os.path.basename(path)
                rows.append(row_data)

            wb.close()
            self.logger.debug(f"使用 openpyxl 成功读取 Excel，共 {len(rows)} 行")
            return rows
        except Exception as e:
            self.logger.error(f"读取 Excel 失败: {e}")
            raise

    def read_last_result(self) -> List[Dict[str, Any]]:
        if not self.config.last_result_path:
            self.logger.info("未提供上次结果文件，跳过差异对比")
            return []

        path = self.config.last_result_path
        if not os.path.exists(path):
            self.logger.warning(f"上次结果文件不存在: {path}，跳过差异对比")
            return []

        self.logger.info(f"开始读取上次结果: {path}")
        ext = os.path.splitext(path)[1].lower()

        try:
            if ext == '.csv':
                rows = self._read_csv(path)
            elif ext in ['.xlsx', '.xls']:
                rows = self._read_excel(path)
            else:
                rows = self._read_csv(path)

            self.logger.info(f"上次结果读取完成，共 {len(rows)} 行数据")
            return rows
        except Exception as e:
            self.logger.warning(f"读取上次结果失败: {e}，跳过差异对比")
            return []

    @staticmethod
    def parse_datetime(date_str: str) -> Optional[datetime]:
        if not date_str or not date_str.strip():
            return None

        date_str = date_str.strip()
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y/%m/%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y/%m/%d %H:%M",
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%Y%m%d%H%M%S",
            "%Y%m%d",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue

        return None
