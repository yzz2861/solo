import os
import re
import logging
from typing import List, Dict, Optional, Tuple
from pathlib import Path

import pandas as pd

from .models import ReimbursementEntry
from .config import Config

logger = logging.getLogger(__name__)


class ReimbursementReader:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()

    def read(self, file_path: str) -> List[ReimbursementEntry]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Reimbursement file not found: {file_path}")

        ext = Path(file_path).suffix.lower()
        if ext in ['.xlsx', '.xls']:
            df = self._read_excel(file_path)
        elif ext == '.csv':
            df = self._read_csv(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        column_mapping = self._auto_detect_columns(df)
        logger.info(f"Detected columns: {column_mapping}")

        entries = []
        for idx, row in df.iterrows():
            try:
                entry = self._parse_row(row, column_mapping, idx)
                if entry and entry.buyer_name and entry.amount > 0:
                    entries.append(entry)
            except Exception as e:
                logger.warning(f"Error parsing row {idx}: {str(e)}")
                continue

        logger.info(f"Successfully parsed {len(entries)} entries from {file_path}")
        return entries

    def _read_excel(self, file_path: str) -> pd.DataFrame:
        df = pd.read_excel(file_path, header=None)
        header_row = self._find_header_row(df)
        df = pd.read_excel(file_path, header=header_row)
        df = df.dropna(how='all')
        df.columns = [str(col).strip() for col in df.columns]
        return df

    def _read_csv(self, file_path: str) -> pd.DataFrame:
        encodings = ['utf-8', 'gbk', 'utf-16', 'latin1']
        for encoding in encodings:
            try:
                df = pd.read_csv(file_path, header=None, encoding=encoding)
                header_row = self._find_header_row(df)
                df = pd.read_csv(file_path, header=header_row, encoding=encoding)
                df = df.dropna(how='all')
                df.columns = [str(col).strip() for col in df.columns]
                return df
            except Exception as e:
                continue
        raise ValueError("Failed to read CSV with any encoding")

    def _find_header_row(self, df: pd.DataFrame, max_rows: int = 10) -> int:
        for row_idx in range(min(max_rows, len(df))):
            row = df.iloc[row_idx].astype(str).str.strip()
            row_str = ' '.join(row.tolist())

            buyer_hits = sum(1 for key in self.config.EXCEL_COLUMN_MAPPING['buyer_name']
                             if key in row_str)
            amount_hits = sum(1 for key in self.config.EXCEL_COLUMN_MAPPING['amount']
                              if key in row_str)
            project_hits = sum(1 for key in self.config.EXCEL_COLUMN_MAPPING['project_remark']
                               if key in row_str)

            if buyer_hits + amount_hits + project_hits >= 2:
                return row_idx

        return 0

    def _auto_detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        mapping = {}
        df_columns = [str(col).strip() for col in df.columns]

        for field_name, candidates in self.config.EXCEL_COLUMN_MAPPING.items():
            for df_col in df_columns:
                if df_col in mapping.values():
                    continue
                for candidate in candidates:
                    if candidate in df_col or df_col in candidate:
                        mapping[field_name] = df_col
                        break
                if field_name in mapping:
                    break

        if 'amount' not in mapping:
            for col in df_columns:
                if col in mapping.values():
                    continue
                try:
                    sample = df[col].dropna().head()
                    if len(sample) > 0:
                        sample_str = str(sample.iloc[0])
                        if re.search(r'[\d,.]', sample_str) and '¥' in str(col):
                            mapping['amount'] = col
                            break
                except:
                    continue

        if 'buyer_name' not in mapping:
            for col in df_columns:
                if col in mapping.values():
                    continue
                sample = df[col].dropna().head()
                if len(sample) > 0 and len(str(sample.iloc[0])) > 2:
                    mapping['buyer_name'] = col
                    break

        if 'project_remark' not in mapping:
            for col in df_columns:
                if col in mapping.values():
                    continue
                mapping['project_remark'] = col
                break

        return mapping

    def _parse_row(self, row: pd.Series, column_mapping: Dict[str, str], row_idx: int) -> Optional[ReimbursementEntry]:
        try:
            buyer_name = self._get_value(row, column_mapping, 'buyer_name')
            amount = self._parse_amount(self._get_value(row, column_mapping, 'amount'))
            project_remark = self._get_value(row, column_mapping, 'project_remark', '')

            if not buyer_name or amount <= 0:
                return None

            entry = ReimbursementEntry(
                row_index=row_idx,
                buyer_name=str(buyer_name).strip(),
                amount=amount,
                project_remark=str(project_remark).strip(),
            )

            if 'invoice_number' in column_mapping:
                inv_num = self._get_value(row, column_mapping, 'invoice_number')
                entry.invoice_number = str(inv_num).strip() if inv_num else None

            if 'applicant' in column_mapping:
                applicant = self._get_value(row, column_mapping, 'applicant')
                entry.applicant = str(applicant).strip() if applicant else None

            if 'department' in column_mapping:
                department = self._get_value(row, column_mapping, 'department')
                entry.department = str(department).strip() if department else None

            return entry

        except Exception as e:
            logger.warning(f"Error parsing row {row_idx}: {str(e)}")
            return None

    def _get_value(self, row: pd.Series, column_mapping: Dict[str, str], field: str, default=None):
        if field in column_mapping:
            col = column_mapping[field]
            if col in row:
                value = row[col]
                if pd.isna(value):
                    return default
                return value
        return default

    def _parse_amount(self, amount_str) -> float:
        if amount_str is None:
            return 0.0
        if isinstance(amount_str, (int, float)):
            return float(amount_str)
        cleaned = re.sub(r'[¥￥￥,\s]', '', str(amount_str))
        try:
            return float(cleaned)
        except:
            return 0.0

    def preview(self, file_path: str, rows: int = 5) -> Dict:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = Path(file_path).suffix.lower()
        if ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path, header=None, nrows=rows + 5)
        elif ext == '.csv':
            df = pd.read_csv(file_path, header=None, nrows=rows + 5, encoding='utf-8')
        else:
            raise ValueError(f"Unsupported format: {ext}")

        header_row = self._find_header_row(df)
        df_with_header = pd.read_excel(file_path, header=header_row, nrows=rows) if ext in ['.xlsx', '.xls'] \
            else pd.read_csv(file_path, header=header_row, nrows=rows, encoding='utf-8')

        column_mapping = self._auto_detect_columns(df_with_header)

        return {
            'header_row': header_row,
            'columns': list(df_with_header.columns),
            'column_mapping': column_mapping,
            'sample_data': df_with_header.head(rows).to_dict('records'),
        }
