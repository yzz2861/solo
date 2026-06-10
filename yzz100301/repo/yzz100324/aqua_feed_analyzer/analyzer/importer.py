
import os
import json
import hashlib
import pandas as pd
from pathlib import Path
from datetime import datetime


class DataImporter:
    def __init__(self, config):
        self.config = config
        self.base_dir = Path.cwd()
        self.state_file = self.base_dir / config["import"]["state_file"]
        self.dedup_by = config["import"]["dedup_by"]
        self._state = self._load_state()

    def _load_state(self):
        if self.state_file.exists():
            with open(self.state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return {
            "plans": {},
            "records": {},
            "water": {},
            "file_hashes": {},
        }

    def _save_state(self):
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(self._state, f, ensure_ascii=False, indent=2)

    @staticmethod
    def _file_hash(filepath):
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(8192):
                h.update(chunk)
        return h.hexdigest()

    def _is_file_imported(self, filepath, category):
        filepath = str(filepath)
        if filepath in self._state["file_hashes"]:
            saved_hash = self._state["file_hashes"][filepath]
            current_hash = self._file_hash(filepath)
            if saved_hash == current_hash:
                return True
        return False

    def _mark_file_imported(self, filepath, category):
        filepath = str(filepath)
        self._state["file_hashes"][filepath] = self._file_hash(filepath)

    def _dedup_records(self, df, category):
        if self.dedup_by in df.columns:
            existing_ids = set(self._state.get(category, {}).get("record_ids", []))
            new_mask = ~df[self.dedup_by].astype(str).isin(existing_ids)
            new_df = df[new_mask].copy()
            all_ids = existing_ids | set(df[self.dedup_by].astype(str).tolist())
            if category not in self._state:
                self._state[category] = {}
            self._state[category]["record_ids"] = sorted(list(all_ids))
            return new_df
        return df

    def import_plans(self):
        plans_dir = self.base_dir / self.config["paths"]["plans_dir"]
        if not plans_dir.exists():
            return pd.DataFrame()

        all_dfs = []
        for fpath in sorted(plans_dir.glob("*.csv")):
            if self._is_file_imported(fpath, "plans"):
                continue
            try:
                df = pd.read_csv(fpath)
                df["_source_file"] = fpath.name
                all_dfs.append(df)
                self._mark_file_imported(fpath, "plans")
            except Exception as e:
                print(f"[WARN] 读取计划文件失败: {fpath.name} - {e}")

        if not all_dfs:
            return pd.DataFrame()

        combined = pd.concat(all_dfs, ignore_index=True)
        combined = self._dedup_records(combined, "plans")
        combined = self._normalize_plan_columns(combined)
        return combined

    def import_records(self):
        records_dir = self.base_dir / self.config["paths"]["records_dir"]
        if not records_dir.exists():
            return pd.DataFrame()

        all_dfs = []
        for fpath in sorted(records_dir.glob("*.json")):
            if self._is_file_imported(fpath, "records"):
                continue
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, list):
                    df = pd.DataFrame(data)
                elif isinstance(data, dict):
                    df = pd.DataFrame([data])
                else:
                    df = pd.DataFrame()
                df["_source_file"] = fpath.name
                all_dfs.append(df)
                self._mark_file_imported(fpath, "records")
            except Exception as e:
                print(f"[WARN] 读取记录文件失败: {fpath.name} - {e}")

        if not all_dfs:
            return pd.DataFrame()

        combined = pd.concat(all_dfs, ignore_index=True)
        combined = self._dedup_records(combined, "records")
        combined = self._normalize_record_columns(combined)
        return combined

    def import_water(self):
        water_dir = self.base_dir / self.config["paths"]["water_dir"]
        if not water_dir.exists():
            return pd.DataFrame()

        all_dfs = []
        for fpath in sorted(water_dir.glob("*.csv")):
            if self._is_file_imported(fpath, "water"):
                continue
            try:
                df = pd.read_csv(fpath)
                df["_source_file"] = fpath.name
                all_dfs.append(df)
                self._mark_file_imported(fpath, "water")
            except Exception as e:
                print(f"[WARN] 读取水质文件失败: {fpath.name} - {e}")

        if not all_dfs:
            return pd.DataFrame()

        combined = pd.concat(all_dfs, ignore_index=True)
        combined = self._dedup_records(combined, "water")
        combined = self._normalize_water_columns(combined)
        return combined

    @staticmethod
    def _normalize_plan_columns(df):
        col_map = {}
        lower_cols = {c.lower(): c for c in df.columns}
        mappings = {
            "pond_id": ["养殖池编号", "池号", "池塘编号", "pond_id", "pond", "pool_id"],
            "plan_date": ["计划日期", "日期", "投喂日期", "plan_date", "date"],
            "feed_type": ["饲料类型", "饲料", "饵料类型", "feed_type", "feed"],
            "plan_amount_kg": ["计划投喂量", "计划量", "投喂量(kg)", "plan_amount", "amount_kg"],
            "feed_time": ["计划时间", "投喂时间", "feed_time", "time"],
        }
        for std_name, candidates in mappings.items():
            for cand in candidates:
                if cand.lower() in lower_cols:
                    col_map[lower_cols[cand.lower()]] = std_name
                    break
        df = df.rename(columns=col_map)
        if "plan_date" in df.columns:
            df["plan_date"] = pd.to_datetime(df["plan_date"]).dt.date
        if "feed_time" not in df.columns:
            df["feed_time"] = "08:00:00"
        if "plan_amount_kg" in df.columns:
            df["plan_amount_kg"] = pd.to_numeric(df["plan_amount_kg"], errors="coerce")
        return df

    @staticmethod
    def _normalize_record_columns(df):
        col_map = {}
        lower_cols = {c.lower(): c for c in df.columns}
        mappings = {
            "record_id": ["记录编号", "记录ID", "record_id", "id", "record_id"],
            "pond_id": ["养殖池编号", "池号", "池塘编号", "pond_id", "pond", "pool_id"],
            "feed_date": ["投喂日期", "日期", "实际日期", "feed_date", "date"],
            "feed_time": ["投喂时间", "实际时间", "feed_time", "time"],
            "feed_type": ["饲料类型", "饲料", "饵料类型", "feed_type", "feed"],
            "actual_amount_kg": ["实际投喂量", "投喂量", "实际量", "actual_amount", "amount_kg"],
            "operator": ["操作人员", "操作人", "投喂人", "operator", "staff"],
            "review_status": ["复核状态", "审核状态", "状态", "review_status", "status"],
            "reviewer": ["复核人", "审核人", "reviewer"],
            "review_time": ["复核时间", "审核时间", "review_time"],
            "notes": ["备注", "说明", "notes", "remark"],
        }
        for std_name, candidates in mappings.items():
            for cand in candidates:
                if cand.lower() in lower_cols:
                    col_map[lower_cols[cand.lower()]] = std_name
                    break
        df = df.rename(columns=col_map)
        if "feed_date" in df.columns:
            df["feed_date"] = pd.to_datetime(df["feed_date"]).dt.date
        if "feed_time" not in df.columns:
            df["feed_time"] = "08:00:00"
        if "actual_amount_kg" in df.columns:
            df["actual_amount_kg"] = pd.to_numeric(df["actual_amount_kg"], errors="coerce")
        if "review_status" not in df.columns:
            df["review_status"] = "未复核"
        return df

    @staticmethod
    def _normalize_water_columns(df):
        col_map = {}
        lower_cols = {c.lower(): c for c in df.columns}
        mappings = {
            "record_id": ["记录编号", "记录ID", "record_id", "id"],
            "pond_id": ["养殖池编号", "池号", "池塘编号", "pond_id", "pond", "pool_id"],
            "water_date": ["检测日期", "日期", "测定日期", "water_date", "date"],
            "water_time": ["检测时间", "测定时间", "water_time", "time"],
            "temperature": ["水温", "温度", "temperature", "temp"],
            "dissolved_oxygen": ["溶解氧", "溶氧", "DO", "dissolved_oxygen", "do"],
            "ph": ["pH值", "pH", "ph", "酸碱度"],
            "salinity": ["盐度", "salinity", "salt"],
            "ammonia_nitrogen": ["氨氮", "氨氮含量", "ammonia_nitrogen", "nh3n"],
            "nitrite": ["亚硝酸盐", "亚硝氮", "nitrite", "no2"],
            "is_supplement": ["是否补录", "补录", "is_supplement", "supplement"],
            "supplement_time": ["补录时间", "补录日期", "supplement_time"],
            "operator": ["检测人", "操作人员", "operator", "staff"],
        }
        for std_name, candidates in mappings.items():
            for cand in candidates:
                if cand.lower() in lower_cols:
                    col_map[lower_cols[cand.lower()]] = std_name
                    break
        df = df.rename(columns=col_map)
        if "water_date" in df.columns:
            df["water_date"] = pd.to_datetime(df["water_date"]).dt.date
        if "water_time" not in df.columns:
            df["water_time"] = "08:00:00"
        for col in ["temperature", "dissolved_oxygen", "ph", "salinity",
                    "ammonia_nitrogen", "nitrite"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
        if "is_supplement" in df.columns:
            df["is_supplement"] = df["is_supplement"].astype(str).str.lower().isin(
                ["是", "true", "1", "yes", "补录"]
            )
        else:
            df["is_supplement"] = False
        return df

    def import_all(self):
        plans = self.import_plans()
        records = self.import_records()
        water = self.import_water()
        self._save_state()
        return {
            "plans": plans,
            "records": records,
            "water": water,
        }

    def reset_state(self):
        self._state = {
            "plans": {},
            "records": {},
            "water": {},
            "file_hashes": {},
        }
        self._save_state()
        print("导入状态已重置")
