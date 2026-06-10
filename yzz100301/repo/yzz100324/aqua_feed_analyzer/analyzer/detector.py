
import pandas as pd
from datetime import datetime


class AnomalyDetector:
    def __init__(self, config):
        self.thresholds = config["thresholds"]
        self.deviation_pct = self.thresholds.get("feed_deviation_pct", 10.0)

    def detect_all(self, merged_df):
        if merged_df.empty:
            return {
                "feed_deviation": pd.DataFrame(),
                "water_threshold": pd.DataFrame(),
                "late_supplement": pd.DataFrame(),
                "all_anomalies": pd.DataFrame(),
                "summary": {},
            }

        feed_dev = self._detect_feed_deviation(merged_df)
        water_thresh = self._detect_water_threshold(merged_df)
        late_sup = self._detect_late_supplement(merged_df)

        all_anom = self._combine_anomalies(feed_dev, water_thresh, late_sup)

        summary = {
            "total_anomalies": len(all_anom),
            "feed_deviation_count": len(feed_dev),
            "water_threshold_count": len(water_thresh),
            "late_supplement_count": len(late_sup),
            "affected_ponds": all_anom["pond_id"].nunique() if not all_anom.empty else 0,
            "high_risk_count": len(all_anom[all_anom["risk_level"] == "高"]) if not all_anom.empty else 0,
            "medium_risk_count": len(all_anom[all_anom["risk_level"] == "中"]) if not all_anom.empty else 0,
            "low_risk_count": len(all_anom[all_anom["risk_level"] == "低"]) if not all_anom.empty else 0,
        }

        return {
            "feed_deviation": feed_dev,
            "water_threshold": water_thresh,
            "late_supplement": late_sup,
            "all_anomalies": all_anom,
            "summary": summary,
        }

    def _detect_feed_deviation(self, df):
        if "deviation_pct" not in df.columns or "plan_amount_kg" not in df.columns:
            return pd.DataFrame()

        mask = (
            df["deviation_pct"].abs() > self.deviation_pct
        ) & (
            df["plan_amount_kg"].notna() & df["actual_amount_kg"].notna()
        )

        anomalies = df[mask].copy()
        if anomalies.empty:
            return pd.DataFrame()

        anomalies["anomaly_type"] = "投喂量偏差"
        anomalies["anomaly_detail"] = anomalies.apply(
            lambda r: f"偏差 {r['deviation_pct']:.1f}% (计划{r['plan_amount_kg']:.1f}kg / 实际{r['actual_amount_kg']:.1f}kg)",
            axis=1
        )
        anomalies["risk_level"] = anomalies["deviation_pct"].abs().apply(self._risk_level_by_pct)
        return self._format_anomaly_df(anomalies)

    def _detect_water_threshold(self, df):
        if df.empty:
            return pd.DataFrame()

        all_water_anom = []
        thresh = self.thresholds

        if "water_temp" in df.columns:
            temp_low = df[(df["water_temp"].notna()) & (df["water_temp"] < thresh.get("water_temp_min", 18))].copy()
            if not temp_low.empty:
                temp_low["anomaly_type"] = "水温过低"
                temp_low["anomaly_detail"] = temp_low["water_temp"].apply(lambda x: f"水温 {x:.1f}℃ 低于阈值 {thresh['water_temp_min']}℃")
                temp_low["risk_level"] = temp_low["water_temp"].apply(
                    lambda x: "高" if x < thresh["water_temp_min"] - 3 else "中"
                )
                all_water_anom.append(temp_low)

            temp_high = df[(df["water_temp"].notna()) & (df["water_temp"] > thresh.get("water_temp_max", 28))].copy()
            if not temp_high.empty:
                temp_high["anomaly_type"] = "水温过高"
                temp_high["anomaly_detail"] = temp_high["water_temp"].apply(lambda x: f"水温 {x:.1f}℃ 高于阈值 {thresh['water_temp_max']}℃")
                temp_high["risk_level"] = temp_high["water_temp"].apply(
                    lambda x: "高" if x > thresh["water_temp_max"] + 3 else "中"
                )
                all_water_anom.append(temp_high)

        if "water_do" in df.columns:
            do_low = df[(df["water_do"].notna()) & (df["water_do"] < thresh.get("water_do_min", 5))].copy()
            if not do_low.empty:
                do_low["anomaly_type"] = "溶解氧过低"
                do_low["anomaly_detail"] = do_low["water_do"].apply(lambda x: f"溶氧 {x:.1f}mg/L 低于阈值 {thresh['water_do_min']}mg/L")
                do_low["risk_level"] = do_low["water_do"].apply(
                    lambda x: "高" if x < thresh["water_do_min"] - 1.5 else "中"
                )
                all_water_anom.append(do_low)

        if "water_ph" in df.columns:
            ph_low = df[(df["water_ph"].notna()) & (df["water_ph"] < thresh.get("water_ph_min", 7.5))].copy()
            if not ph_low.empty:
                ph_low["anomaly_type"] = "pH偏低"
                ph_low["anomaly_detail"] = ph_low["water_ph"].apply(lambda x: f"pH {x:.1f} 低于阈值 {thresh['water_ph_min']}")
                ph_low["risk_level"] = "低"
                all_water_anom.append(ph_low)

            ph_high = df[(df["water_ph"].notna()) & (df["water_ph"] > thresh.get("water_ph_max", 8.5))].copy()
            if not ph_high.empty:
                ph_high["anomaly_type"] = "pH偏高"
                ph_high["anomaly_detail"] = ph_high["water_ph"].apply(lambda x: f"pH {x:.1f} 高于阈值 {thresh['water_ph_max']}")
                ph_high["risk_level"] = "低"
                all_water_anom.append(ph_high)

        if "water_salinity" in df.columns:
            sal_low = df[(df["water_salinity"].notna()) & (df["water_salinity"] < thresh.get("water_salinity_min", 20))].copy()
            if not sal_low.empty:
                sal_low["anomaly_type"] = "盐度偏低"
                sal_low["anomaly_detail"] = sal_low["water_salinity"].apply(lambda x: f"盐度 {x:.1f}‰ 低于阈值 {thresh['water_salinity_min']}‰")
                sal_low["risk_level"] = "中"
                all_water_anom.append(sal_low)

            sal_high = df[(df["water_salinity"].notna()) & (df["water_salinity"] > thresh.get("water_salinity_max", 35))].copy()
            if not sal_high.empty:
                sal_high["anomaly_type"] = "盐度偏高"
                sal_high["anomaly_detail"] = sal_high["water_salinity"].apply(lambda x: f"盐度 {x:.1f}‰ 高于阈值 {thresh['water_salinity_max']}‰")
                sal_high["risk_level"] = "中"
                all_water_anom.append(sal_high)

        if not all_water_anom:
            return pd.DataFrame()

        combined = pd.concat(all_water_anom, ignore_index=True)
        return self._format_anomaly_df(combined)

    def _detect_late_supplement(self, df):
        if df.empty:
            return pd.DataFrame()

        if "supplement_after_feed" not in df.columns and "is_supplement" not in df.columns:
            return pd.DataFrame()

        mask = df.get("supplement_after_feed", False) == True
        if mask.sum() == 0:
            mask = df.get("is_supplement", False) == True
            if mask.sum() == 0:
                return pd.DataFrame()

        anomalies = df[mask].copy()
        if anomalies.empty:
            return pd.DataFrame()

        anomalies["anomaly_type"] = "补录时间异常"
        anomalies["anomaly_detail"] = anomalies.apply(
            lambda r: f"水质数据补录晚于投喂时间{' (补录时间: ' + str(r.get('supplement_time', '')) + ')' if r.get('supplement_time') else ''}",
            axis=1
        )
        anomalies["risk_level"] = "中"
        return self._format_anomaly_df(anomalies)

    @staticmethod
    def _format_anomaly_df(df):
        if df.empty:
            return df
        cols_order = [
            "anomaly_type", "risk_level", "pond_id", "feed_date", "feed_time",
            "plan_amount_kg", "actual_amount_kg", "deviation_kg", "deviation_pct",
            "water_temp", "water_do", "water_ph", "water_salinity",
            "is_supplement", "supplement_time", "supplement_after_feed",
            "review_status", "reviewer",
            "anomaly_detail", "record_id", "_source_file",
        ]
        existing = [c for c in cols_order if c in df.columns]
        others = [c for c in df.columns if c not in existing]
        return df[existing + others].copy()

    @staticmethod
    def _combine_anomalies(*anomaly_dfs):
        valid_dfs = [df for df in anomaly_dfs if not df.empty]
        if not valid_dfs:
            return pd.DataFrame()
        combined = pd.concat(valid_dfs, ignore_index=True)
        combined = combined.sort_values(
            by=["risk_level", "feed_date", "pond_id"],
            key=lambda x: x.map({"高": 0, "中": 1, "低": 2}) if x.name == "risk_level" else x,
            na_position="last"
        ).reset_index(drop=True)
        return combined

    def _risk_level_by_pct(self, pct):
        pct = abs(pct)
        if pct >= 30:
            return "高"
        elif pct >= 15:
            return "中"
        else:
            return "低"
