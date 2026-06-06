import os
import pandas as pd
import json
from typing import Dict


class DataExporter:
    def __init__(self, output_dir: str, export_format: str, batch_id: str):
        self.output_dir = output_dir
        self.export_format = export_format
        self.batch_id = batch_id
        os.makedirs(output_dir, exist_ok=True)

    def _get_file_path(self, prefix: str) -> str:
        ext_map = {
            "csv": ".csv",
            "excel": ".xlsx",
            "json": ".json",
        }
        ext = ext_map.get(self.export_format, ".csv")
        return os.path.join(self.output_dir, f"{prefix}_{self.batch_id}{ext}")

    def _write_dataframe(self, df: pd.DataFrame, prefix: str) -> str:
        file_path = self._get_file_path(prefix)

        if self.export_format == "csv":
            df.to_csv(file_path, index=False, encoding="utf-8-sig")
        elif self.export_format == "excel":
            df.to_excel(file_path, index=False)
        elif self.export_format == "json":
            df.to_json(file_path, orient="records", force_ascii=False, indent=2)

        return file_path

    def export_success(self, df: pd.DataFrame) -> str:
        return self._write_dataframe(df, "success")

    def export_bad_rows(self, df: pd.DataFrame) -> str:
        return self._write_dataframe(df, "bad_rows")

    def export_diff(self, df: pd.DataFrame) -> str:
        return self._write_dataframe(df, "diff")

    def export_summary(self, stats: Dict, config: Dict) -> str:
        summary = {
            "batch_id": self.batch_id,
            "stats": stats,
            "config": config,
        }
        file_path = os.path.join(self.output_dir, f"summary_{self.batch_id}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2, default=str)
        return file_path
