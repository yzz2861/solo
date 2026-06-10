
import os
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from pathlib import Path
from datetime import datetime

plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "Heiti TC", "WenQuanYi Micro Hei"]
plt.rcParams["axes.unicode_minus"] = False


class ChartGenerator:
    def __init__(self, output_dir):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.charts = []

    def generate_all(self, merged_df, anomalies_result):
        self.charts = []
        if merged_df.empty and anomalies_result["all_anomalies"].empty:
            return []

        self._generate_anomaly_type_chart(anomalies_result["all_anomalies"])
        self._generate_risk_level_chart(anomalies_result["all_anomalies"])
        self._generate_pond_anomaly_chart(anomalies_result["all_anomalies"])
        self._generate_feed_trend_chart(merged_df)
        self._generate_water_temp_chart(merged_df)
        return self.charts

    def _save_fig(self, fig, filename):
        filepath = self.output_dir / filename
        fig.tight_layout()
        fig.savefig(filepath, dpi=150, bbox_inches="tight")
        plt.close(fig)
        self.charts.append(str(filepath))
        return filepath

    def _generate_anomaly_type_chart(self, all_anom):
        if all_anom.empty:
            return
        type_counts = all_anom.groupby("anomaly_type").size().sort_values(ascending=False)
        fig, ax = plt.subplots(figsize=(8, 5))
        colors = ["#ff6b6b", "#ffa502", "#ffd93d", "#6bcb77", "#4d96ff", "#9b59b6"]
        bars = ax.bar(type_counts.index, type_counts.values, color=colors[:len(type_counts)])
        ax.set_title("异常类型分布", fontsize=14, fontweight="bold")
        ax.set_ylabel("异常次数")
        ax.set_xlabel("异常类型")
        plt.xticks(rotation=20, ha="right")
        for bar, count in zip(bars, type_counts.values):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.1,
                    str(count), ha="center", va="bottom", fontweight="bold")
        self._save_fig(fig, "01_anomaly_types.png")

    def _generate_risk_level_chart(self, all_anom):
        if all_anom.empty:
            return
        risk_order = ["高", "中", "低"]
        risk_counts = all_anom.groupby("risk_level").size()
        counts = [risk_counts.get(r, 0) for r in risk_order]
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        colors = {"高": "#e74c3c", "中": "#f39c12", "低": "#2ecc71"}
        color_list = [colors[r] for r in risk_order]
        wedges, texts, autotexts = ax1.pie(counts, labels=risk_order, colors=color_list,
                                            autopct="%1.1f%%", startangle=90)
        for at in autotexts:
            at.set_color("white")
            at.set_fontweight("bold")
        ax1.set_title("风险等级占比", fontsize=13, fontweight="bold")
        bars = ax2.bar(risk_order, counts, color=color_list)
        ax2.set_title("风险等级数量", fontsize=13, fontweight="bold")
        ax2.set_ylabel("异常数")
        for bar, count in zip(bars, counts):
            ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.1,
                     str(count), ha="center", va="bottom", fontweight="bold")
        self._save_fig(fig, "02_risk_levels.png")

    def _generate_pond_anomaly_chart(self, all_anom):
        if all_anom.empty:
            return
        pond_counts = all_anom.groupby("pond_id").size().sort_values(ascending=False).head(15)
        fig, ax = plt.subplots(figsize=(10, 6))
        bars = ax.barh([str(p) for p in pond_counts.index], pond_counts.values, color="#3498db")
        ax.set_title("各养殖池异常数量排行 (Top 15)", fontsize=14, fontweight="bold")
        ax.set_xlabel("异常次数")
        ax.set_ylabel("养殖池编号")
        ax.invert_yaxis()
        for bar, count in zip(bars, pond_counts.values):
            ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height() / 2,
                    str(count), va="center", fontweight="bold")
        self._save_fig(fig, "03_pond_anomalies.png")

    def _generate_feed_trend_chart(self, merged_df):
        if merged_df.empty or "feed_date" not in merged_df.columns:
            return
        df = merged_df.dropna(subset=["feed_date"]).copy()
        if df.empty:
            return
        df["feed_dt"] = pd.to_datetime(df["feed_date"])
        daily = df.groupby("feed_dt").agg(
            plan_total=("plan_amount_kg", "sum"),
            actual_total=("actual_amount_kg", "sum"),
        ).reset_index().sort_values("feed_dt")
        if len(daily) < 2:
            return
        fig, ax = plt.subplots(figsize=(10, 5))
        ax.plot(daily["feed_dt"], daily["plan_total"], marker="o", label="计划投喂量",
                color="#3498db", linewidth=2)
        ax.plot(daily["feed_dt"], daily["actual_total"], marker="s", label="实际投喂量",
                color="#e67e22", linewidth=2)
        ax.fill_between(daily["feed_dt"], daily["plan_total"], daily["actual_total"],
                        alpha=0.2, color="gray")
        ax.set_title("每日投喂量趋势对比", fontsize=14, fontweight="bold")
        ax.set_xlabel("日期")
        ax.set_ylabel("投喂量 (kg)")
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%m-%d"))
        plt.xticks(rotation=30)
        self._save_fig(fig, "04_feed_trend.png")

    def _generate_water_temp_chart(self, merged_df):
        if merged_df.empty or "water_temp" not in merged_df.columns:
            return
        df = merged_df.dropna(subset=["feed_date", "water_temp"]).copy()
        if df.empty:
            return
        df["feed_dt"] = pd.to_datetime(df["feed_date"])
        daily_temp = df.groupby("feed_dt")["water_temp"].mean().reset_index().sort_values("feed_dt")
        if len(daily_temp) < 2:
            return
        fig, ax = plt.subplots(figsize=(10, 5))
        ax.plot(daily_temp["feed_dt"], daily_temp["water_temp"], marker="o",
                color="#e74c3c", linewidth=2, label="平均水温")
        ax.axhline(y=28, color="orange", linestyle="--", alpha=0.7, label="高温阈值 (28℃)")
        ax.axhline(y=18, color="steelblue", linestyle="--", alpha=0.7, label="低温阈值 (18℃)")
        ax.fill_between(daily_temp["feed_dt"], 28, daily_temp["water_temp"],
                        where=daily_temp["water_temp"] > 28, alpha=0.3, color="red", label="超温区域")
        ax.set_title("水温变化趋势", fontsize=14, fontweight="bold")
        ax.set_xlabel("日期")
        ax.set_ylabel("水温 (℃)")
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%m-%d"))
        plt.xticks(rotation=30)
        self._save_fig(fig, "05_water_temp_trend.png")
