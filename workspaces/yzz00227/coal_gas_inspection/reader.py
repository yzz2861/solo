import os
import pandas as pd
from typing import Dict, List, Tuple
from datetime import datetime


class FileReader:
    def __init__(self, mapping: Dict[str, str]):
        self.mapping = mapping

    def read_file(self, file_path: str) -> Tuple[pd.DataFrame, List[Dict]]:
        ext = os.path.splitext(file_path)[1].lower()
        bad_rows = []

        if ext == ".csv":
            df = pd.read_csv(file_path, dtype=str, keep_default_na=False)
        elif ext in (".xlsx", ".xls"):
            df = pd.read_excel(file_path, dtype=str, keep_default_na=False)
        else:
            raise ValueError(f"不支持的文件格式: {ext}")

        df.columns = df.columns.str.strip()
        df = df.fillna("")

        return df, bad_rows

    def read_files(self, file_paths: List[str], batch_id: str) -> Tuple[pd.DataFrame, List[Dict]]:
        all_dfs = []
        all_bad_rows = []

        for fp in file_paths:
            source_name = os.path.basename(fp)
            df, bad_rows = self.read_file(fp)
            df["_source_file"] = source_name
            df["_batch_id"] = batch_id
            df["_row_number"] = range(2, len(df) + 2)
            all_dfs.append(df)

            for br in bad_rows:
                br["_source_file"] = source_name
                br["_batch_id"] = batch_id
                all_bad_rows.append(br)

        if all_dfs:
            combined = pd.concat(all_dfs, ignore_index=True)
        else:
            combined = pd.DataFrame()

        return combined, all_bad_rows
