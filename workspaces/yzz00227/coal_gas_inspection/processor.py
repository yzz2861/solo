import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple
import re


class DataProcessor:
    def __init__(self, mapping: Dict[str, str], start_date: datetime, end_date: datetime):
        self.mapping = mapping
        self.start_date = start_date
        self.end_date = end_date
        self.date_formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d",
            "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d %H:%M",
            "%Y/%m/%d",
            "%Y%m%d %H:%M:%S",
            "%Y%m%d",
        ]

    def _parse_datetime(self, value: str) -> datetime:
        if not value or pd.isna(value) or str(value).strip() == "":
            return None
        value = str(value).strip()
        for fmt in self.date_formats:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
        return None

    def _validate_inspection_id(self, value: str) -> bool:
        if not value or str(value).strip() == "":
            return False
        value = str(value).strip()
        pattern = r"^[A-Za-z0-9\-_]{3,32}$"
        return bool(re.match(pattern, value))

    def _validate_gas_concentration(self, value: str) -> bool:
        if not value or str(value).strip() == "":
            return False
        try:
            val = float(str(value).strip())
            return 0 <= val <= 100
        except (ValueError, TypeError):
            return False

    def process(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, Dict]:
        if df.empty:
            return pd.DataFrame(), pd.DataFrame(), {"total": 0, "valid": 0, "bad": 0}

        id_col = self.mapping["inspection_id"]
        time_col = self.mapping["inspection_time"]
        gas_col = self.mapping["gas_concentration"]
        loc_col = self.mapping["location"]

        bad_mask = pd.Series([False] * len(df))
        bad_reasons = pd.Series([""] * len(df))

        for idx, row in df.iterrows():
            reasons = []

            id_val = str(row.get(id_col, "")).strip()
            if not self._validate_inspection_id(id_val):
                reasons.append("巡检编号格式错误或为空")
                bad_mask.iloc[idx] = True

            time_val = str(row.get(time_col, "")).strip()
            parsed_time = self._parse_datetime(time_val)
            if parsed_time is None:
                reasons.append("巡检时间格式无法解析")
                bad_mask.iloc[idx] = True
            else:
                if parsed_time < self.start_date:
                    reasons.append("巡检时间早于起始日期")
                    bad_mask.iloc[idx] = True
                elif parsed_time > self.end_date.replace(hour=23, minute=59, second=59):
                    reasons.append("巡检时间晚于结束日期")
                    bad_mask.iloc[idx] = True

            gas_val = str(row.get(gas_col, "")).strip()
            if not self._validate_gas_concentration(gas_val):
                reasons.append("瓦斯浓度无效或超出范围")
                bad_mask.iloc[idx] = True

            loc_val = str(row.get(loc_col, "")).strip()
            if not loc_val:
                reasons.append("巡检地点为空")
                bad_mask.iloc[idx] = True

            bad_reasons.iloc[idx] = "; ".join(reasons)

        bad_df = df[bad_mask].copy()
        bad_df["_bad_reason"] = bad_reasons[bad_mask].values

        good_df = df[~bad_mask].copy()

        if not good_df.empty:
            good_df["_parsed_time"] = good_df[time_col].apply(
                lambda x: self._parse_datetime(str(x))
            )
            good_df["_gas_value"] = pd.to_numeric(good_df[gas_col], errors="coerce")

        stats = {
            "total": len(df),
            "valid": len(good_df),
            "bad": len(bad_df),
        }

        return good_df, bad_df, stats


class DiffGenerator:
    def __init__(self, mapping: Dict[str, str]):
        self.mapping = mapping

    def generate_diff(self, df: pd.DataFrame, group_col: str = "location") -> pd.DataFrame:
        if df.empty:
            return pd.DataFrame()

        loc_col = self.mapping["location"]
        gas_col = self.mapping["gas_concentration"]
        time_col = self.mapping["inspection_time"]
        id_col = self.mapping["inspection_id"]

        diff_rows = []
        grouped = df.groupby(loc_col)

        for location, group in grouped:
            if len(group) < 2:
                continue

            sorted_group = group.sort_values("_parsed_time")
            prev = None

            for _, row in sorted_group.iterrows():
                if prev is not None:
                    prev_gas = float(prev["_gas_value"])
                    curr_gas = float(row["_gas_value"])
                    diff = curr_gas - prev_gas
                    diff_pct = (diff / prev_gas * 100) if prev_gas != 0 else None

                    diff_rows.append({
                        "location": location,
                        "prev_inspection_id": prev.get(id_col, ""),
                        "prev_time": prev.get(time_col, ""),
                        "prev_gas": prev_gas,
                        "curr_inspection_id": row.get(id_col, ""),
                        "curr_time": row.get(time_col, ""),
                        "curr_gas": curr_gas,
                        "diff_value": round(diff, 4),
                        "diff_percent": round(diff_pct, 2) if diff_pct is not None else None,
                        "_source_file": row.get("_source_file", ""),
                        "_batch_id": row.get("_batch_id", ""),
                    })

                prev = row

        return pd.DataFrame(diff_rows)
