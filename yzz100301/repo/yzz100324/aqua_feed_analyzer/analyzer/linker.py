
import pandas as pd
from datetime import datetime, timedelta


class DataLinker:
    def __init__(self, plans_df, records_df, water_df):
        self.plans = plans_df.copy()
        self.records = records_df.copy()
        self.water = water_df.copy()

    def link_all(self):
        merged = self._link_plans_and_records()
        merged = self._link_water(merged)
        merged = self._compute_deviation(merged)
        merged = self._enrich_supplement_info(merged)
        return merged

    def _link_plans_and_records(self):
        if self.plans.empty and self.records.empty:
            return pd.DataFrame()

        if self.plans.empty:
            rec = self.records.copy()
            rec["plan_amount_kg"] = None
            rec["feed_type_plan"] = None
            return rec

        if self.records.empty:
            plans = self.plans.copy()
            plans["record_id"] = None
            plans["actual_amount_kg"] = None
            plans["operator"] = None
            plans["review_status"] = "无记录"
            plans["reviewer"] = None
            plans["review_time"] = None
            return plans

        plans = self.plans.copy()
        records = self.records.copy()

        if "feed_date" not in records.columns:
            records["feed_date"] = None
        if "plan_date" not in plans.columns:
            plans["plan_date"] = None

        plans = plans.rename(columns={"plan_date": "feed_date"})

        merged = pd.merge(
            records,
            plans,
            on=["pond_id", "feed_date"],
            how="outer",
            suffixes=("_record", "_plan"),
        )

        merged["feed_type"] = merged["feed_type_record"].combine_first(merged["feed_type_plan"])
        merged["feed_time"] = merged["feed_time_record"].combine_first(merged["feed_time_plan"])
        if "_source_file_record" in merged.columns and "_source_file_plan" in merged.columns:
            merged["_source_file"] = merged["_source_file_record"].combine_first(merged["_source_file_plan"])

        drop_cols = [c for c in merged.columns if c.endswith("_record") or c.endswith("_plan")]
        merged = merged.drop(columns=drop_cols, errors="ignore")

        merged = merged.sort_values(["pond_id", "feed_date", "feed_time"]).reset_index(drop=True)
        return merged

    def _link_water(self, merged_df):
        if self.water.empty or merged_df.empty:
            if not merged_df.empty:
                merged_df["water_temp"] = None
                merged_df["water_do"] = None
                merged_df["water_ph"] = None
                merged_df["water_salinity"] = None
                merged_df["water_ammonia_nitrogen"] = None
                merged_df["water_nitrite"] = None
                merged_df["is_supplement"] = False
                merged_df["supplement_time"] = None
            return merged_df

        water = self.water.copy()
        water["_water_key"] = water["pond_id"].astype(str) + "|" + water["water_date"].astype(str)

        water_agg = water.groupby(["pond_id", "water_date"]).agg(
            water_temp=("temperature", "mean"),
            water_do=("dissolved_oxygen", "mean"),
            water_ph=("ph", "mean"),
            water_salinity=("salinity", "mean"),
            water_ammonia_nitrogen=("ammonia_nitrogen", "mean"),
            water_nitrite=("nitrite", "mean"),
            is_supplement=("is_supplement", "any"),
            supplement_time=("supplement_time", "first"),
            water_records=("record_id", "count"),
        ).reset_index()

        water_agg["_join_key"] = water_agg["pond_id"].astype(str) + "|" + water_agg["water_date"].astype(str)

        merged = merged_df.copy()
        if "feed_date" in merged.columns:
            merged["_join_key"] = merged["pond_id"].astype(str) + "|" + merged["feed_date"].astype(str)
        else:
            merged["_join_key"] = merged["pond_id"].astype(str) + "|None"

        result = pd.merge(
            merged,
            water_agg,
            left_on=["pond_id", "feed_date"],
            right_on=["pond_id", "water_date"],
            how="left",
            suffixes=("", "_water"),
        )

        result = result.drop(columns=["_join_key", "_join_key_water"] if "_join_key_water" in result.columns else ["_join_key"], errors="ignore")
        return result

    @staticmethod
    def _compute_deviation(merged_df):
        if merged_df.empty:
            return merged_df

        df = merged_df.copy()
        if "plan_amount_kg" in df.columns and "actual_amount_kg" in df.columns:
            df["deviation_kg"] = df["actual_amount_kg"] - df["plan_amount_kg"]
            df["deviation_pct"] = (df["deviation_kg"] / df["plan_amount_kg"] * 100).round(2)
            df.loc[df["plan_amount_kg"] == 0, "deviation_pct"] = None
        return df

    def _enrich_supplement_info(self, merged_df):
        if merged_df.empty or self.water.empty:
            return merged_df

        df = merged_df.copy()
        if "is_supplement" not in df.columns:
            df["is_supplement"] = False

        water_records = self.water[self.water["is_supplement"] == True].copy()
        if not water_records.empty and "supplement_time" in water_records.columns:
            water_records["feed_dt"] = pd.to_datetime(
                water_records["water_date"].astype(str) + " " + water_records["water_time"].astype(str),
                errors="coerce"
            )
            water_records["sup_dt"] = pd.to_datetime(water_records["supplement_time"], errors="coerce")
            water_records["supplement_after_feed"] = water_records["sup_dt"] > water_records["feed_dt"]

            sup_by_pond_date = water_records.groupby(["pond_id", "water_date"]).agg(
                is_supplement=("is_supplement", "any"),
                supplement_after_feed=("supplement_after_feed", "any"),
                latest_supplement_time=("supplement_time", "max"),
            ).reset_index()

            df = pd.merge(
                df,
                sup_by_pond_date,
                left_on=["pond_id", "feed_date"],
                right_on=["pond_id", "water_date"],
                how="left",
                suffixes=("", "_enriched"),
            )
            df["is_supplement"] = df["is_supplement_enriched"].combine_first(df["is_supplement"])
            df = df.drop(columns=["water_date", "is_supplement_enriched"], errors="ignore")

        return df

    def summary(self, merged_df):
        if merged_df.empty:
            return {"total_records": 0}
        info = {
            "total_records": len(merged_df),
            "pond_count": merged_df["pond_id"].nunique() if "pond_id" in merged_df.columns else 0,
            "date_range": self._date_range(merged_df),
            "has_plan": int(merged_df.get("plan_amount_kg", pd.Series()).notna().sum()),
            "has_actual": int(merged_df.get("actual_amount_kg", pd.Series()).notna().sum()),
            "has_water": int(merged_df.get("water_temp", pd.Series()).notna().sum()),
            "reviewed_count": int((merged_df.get("review_status", "") == "已复核").sum()) if "review_status" in merged_df.columns else 0,
        }
        return info

    @staticmethod
    def _date_range(df):
        if "feed_date" not in df.columns or df["feed_date"].isna().all():
            return None
        dates = pd.to_datetime(df["feed_date"].dropna())
        if dates.empty:
            return None
        return f"{dates.min().date()} ~ {dates.max().date()}"
