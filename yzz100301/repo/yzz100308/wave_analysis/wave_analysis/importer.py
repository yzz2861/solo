"""
数据导入与去重模块
负责导入波次CSV、复核JSON、短拣补录数据，并对重复导入做去重处理
"""
import hashlib
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd


class DataImporter:
    """数据导入器，支持三种数据源的导入与去重"""

    def __init__(self, state_file: str = None):
        if state_file is None:
            state_file = os.path.join(os.path.dirname(__file__), '..', 'output', 'import_state.json')
        self.state_file = Path(state_file)
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        self._imported_hashes = self._load_state()

    def _load_state(self) -> Dict[str, List[str]]:
        """加载已导入文件的哈希状态"""
        if self.state_file.exists():
            with open(self.state_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {'wave_csv': [], 'review_json': [], 'supplement': []}

    def _save_state(self):
        """保存导入状态"""
        with open(self.state_file, 'w', encoding='utf-8') as f:
            json.dump(self._imported_hashes, f, ensure_ascii=False, indent=2)

    @staticmethod
    def _file_hash(filepath: str) -> str:
        """计算文件内容的SHA256哈希，用于去重"""
        sha256 = hashlib.sha256()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

    def _is_duplicate(self, data_type: str, file_hash: str) -> bool:
        """检查文件是否已导入过"""
        return file_hash in self._imported_hashes.get(data_type, [])

    def _mark_imported(self, data_type: str, file_hash: str):
        """标记文件为已导入"""
        if data_type not in self._imported_hashes:
            self._imported_hashes[data_type] = []
        if file_hash not in self._imported_hashes[data_type]:
            self._imported_hashes[data_type].append(file_hash)
            self._save_state()

    def import_wave_csv(self, filepath: str, skip_duplicate: bool = True) -> Tuple[pd.DataFrame, bool]:
        """
        导入波次CSV文件
        
        CSV需包含字段: wave_no, sku, sku_name, qty_expected, picker, warehouse, create_time
        
        Returns:
            (DataFrame, 是否为新导入)
        """
        file_hash = self._file_hash(filepath)
        if skip_duplicate and self._is_duplicate('wave_csv', file_hash):
            return pd.DataFrame(), False

        df = pd.read_csv(filepath, dtype={'wave_no': str, 'sku': str})
        df.columns = df.columns.str.strip().str.lower()
        
        required_cols = ['wave_no', 'sku', 'qty_expected']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            raise ValueError(f"波次CSV缺少必要字段: {missing}")

        for col in ['sku_name', 'picker', 'warehouse', 'create_time']:
            if col not in df.columns:
                df[col] = ''

        df['qty_expected'] = pd.to_numeric(df['qty_expected'], errors='coerce').fillna(0).astype(int)
        df = df[df['qty_expected'] > 0].reset_index(drop=True)

        self._mark_imported('wave_csv', file_hash)
        return df, True

    def import_review_json(self, filepath: str, skip_duplicate: bool = True) -> Tuple[pd.DataFrame, bool]:
        """
        导入复核扫描JSON文件
        
        JSON格式: 数组，每条包含 wave_no, sku, qty_picked, reviewer, review_time, container_no
        
        Returns:
            (DataFrame, 是否为新导入)
        """
        file_hash = self._file_hash(filepath)
        if skip_duplicate and self._is_duplicate('review_json', file_hash):
            return pd.DataFrame(), False

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if not isinstance(data, list):
            raise ValueError("复核JSON必须是数组格式")

        df = pd.DataFrame(data)
        df.columns = df.columns.str.strip().str.lower()
        
        required_cols = ['wave_no', 'sku', 'qty_picked']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            raise ValueError(f"复核JSON缺少必要字段: {missing}")

        for col in ['reviewer', 'review_time', 'container_no']:
            if col not in df.columns:
                df[col] = ''

        df['wave_no'] = df['wave_no'].astype(str)
        df['sku'] = df['sku'].astype(str)
        df['qty_picked'] = pd.to_numeric(df['qty_picked'], errors='coerce').fillna(0).astype(int)
        df = df[df['qty_picked'] > 0].reset_index(drop=True)

        self._mark_imported('review_json', file_hash)
        return df, True

    def import_supplement_csv(self, filepath: str, skip_duplicate: bool = True) -> Tuple[pd.DataFrame, bool]:
        """
        导入短拣补录CSV文件
        
        CSV需包含字段: wave_no, sku, qty_supplemented, supplement_time, operator, reason
        
        Returns:
            (DataFrame, 是否为新导入)
        """
        file_hash = self._file_hash(filepath)
        if skip_duplicate and self._is_duplicate('supplement', file_hash):
            return pd.DataFrame(), False

        df = pd.read_csv(filepath, dtype={'wave_no': str, 'sku': str})
        df.columns = df.columns.str.strip().str.lower()
        
        required_cols = ['wave_no', 'sku', 'qty_supplemented']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            raise ValueError(f"短拣补录CSV缺少必要字段: {missing}")

        for col in ['supplement_time', 'operator', 'reason']:
            if col not in df.columns:
                df[col] = ''

        df['qty_supplemented'] = pd.to_numeric(df['qty_supplemented'], errors='coerce').fillna(0).astype(int)
        df = df[df['qty_supplemented'] > 0].reset_index(drop=True)

        self._mark_imported('supplement', file_hash)
        return df, True

    def import_wave_dir(self, dirpath: str) -> pd.DataFrame:
        """批量导入目录下所有波次CSV"""
        all_dfs = []
        for f in sorted(Path(dirpath).glob('*.csv')):
            df, is_new = self.import_wave_csv(str(f))
            if not df.empty:
                all_dfs.append(df)
        if all_dfs:
            return pd.concat(all_dfs, ignore_index=True).drop_duplicates()
        return pd.DataFrame()

    def import_review_dir(self, dirpath: str) -> pd.DataFrame:
        """批量导入目录下所有复核JSON"""
        all_dfs = []
        for f in sorted(Path(dirpath).glob('*.json')):
            df, is_new = self.import_review_json(str(f))
            if not df.empty:
                all_dfs.append(df)
        if all_dfs:
            return pd.concat(all_dfs, ignore_index=True).drop_duplicates()
        return pd.DataFrame()

    def import_supplement_dir(self, dirpath: str) -> pd.DataFrame:
        """批量导入目录下所有短拣补录CSV"""
        all_dfs = []
        for f in sorted(Path(dirpath).glob('*.csv')):
            df, is_new = self.import_supplement_csv(str(f))
            if not df.empty:
                all_dfs.append(df)
        if all_dfs:
            return pd.concat(all_dfs, ignore_index=True).drop_duplicates()
        return pd.DataFrame()

    def reset_state(self):
        """清空导入状态，用于重新导入"""
        self._imported_hashes = {'wave_csv': [], 'review_json': [], 'supplement': []}
        self._save_state()
