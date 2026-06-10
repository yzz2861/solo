
import os
import pandas as pd
from pathlib import Path
from datetime import datetime
from .charts import ChartGenerator


class ReportGenerator:
    def __init__(self, config):
        self.config = config
        self.output_dir = Path(config["paths"]["output_dir"])
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.chart_gen = ChartGenerator(self.output_dir)

    def generate_all(self, merged_df, anomalies_result, linker_summary):
        charts = self.chart_gen.generate_all(merged_df, anomalies_result)

        csv_paths = self._export_csv(anomalies_result)

        report_path = self._generate_markdown_report(
            merged_df, anomalies_result, linker_summary, charts, csv_paths
        )

        return {
            "report": str(report_path),
            "csv_files": {k: str(v) for k, v in csv_paths.items()},
            "charts": charts,
        }

    def _export_csv(self, anomalies_result):
        csv_dir = self.output_dir / "csv"
        csv_dir.mkdir(parents=True, exist_ok=True)

        paths = {}

        if not anomalies_result["all_anomalies"].empty:
            all_path = csv_dir / "risk_all_anomalies.csv"
            anomalies_result["all_anomalies"].to_csv(all_path, index=False, encoding="utf-8-sig")
            paths["all_anomalies"] = all_path

        if not anomalies_result["feed_deviation"].empty:
            path = csv_dir / "risk_feed_deviation.csv"
            anomalies_result["feed_deviation"].to_csv(path, index=False, encoding="utf-8-sig")
            paths["feed_deviation"] = path

        if not anomalies_result["water_threshold"].empty:
            path = csv_dir / "risk_water_threshold.csv"
            anomalies_result["water_threshold"].to_csv(path, index=False, encoding="utf-8-sig")
            paths["water_threshold"] = path

        if not anomalies_result["late_supplement"].empty:
            path = csv_dir / "risk_late_supplement.csv"
            anomalies_result["late_supplement"].to_csv(path, index=False, encoding="utf-8-sig")
            paths["late_supplement"] = path

        return paths

    def _generate_markdown_report(self, merged_df, anomalies, summary, charts, csv_paths):
        report_path = self.output_dir / "投喂异常分析报告.md"
        report_time = datetime.now().strftime("%Y年%m月%d日 %H:%M")
        s = anomalies["summary"]

        sections = []

        sections.append(f"# {self.config['report'].get('title', '养殖场投喂异常分析报告')}")
        sections.append("")
        sections.append(f"**报告生成时间：** {report_time}")
        sections.append("")

        sections.append("---")
        sections.append("")

        sections.append("## 一、总体概览")
        sections.append("")
        sections.append(f"本次分析覆盖养殖池 **{summary.get('pond_count', 0)}** 个，")
        if summary.get("date_range"):
            sections.append(f"分析时段 **{summary['date_range']}**，")
        sections.append(f"共关联投喂记录 **{summary.get('total_records', 0)}** 条。")
        sections.append("")

        total_anom = s.get("total_anomalies", 0)
        high = s.get("high_risk_count", 0)
        medium = s.get("medium_risk_count", 0)
        low = s.get("low_risk_count", 0)

        if total_anom == 0:
            sections.append("### 结论：未发现异常")
            sections.append("")
            sections.append("本期所有投喂计划执行正常，水质指标均在合理范围内，未发现异常情况。")
            sections.append("")
        else:
            sections.append("### 异常汇总")
            sections.append("")
            sections.append(f"- **异常总数：** {total_anom} 条")
            sections.append(f"  - 🔴 高风险：{high} 条")
            sections.append(f"  - 🟠 中风险：{medium} 条")
            sections.append(f"  - 🟢 低风险：{low} 条")
            sections.append(f"- **涉及养殖池：** {s.get('affected_ponds', 0)} 个")
            sections.append("")

            if high > 0:
                sections.append("⚠️ **重点提示：** 存在高风险异常，请场长优先关注并安排复核。")
                sections.append("")

        sections.append("---")
        sections.append("")

        sections.append("## 二、图表摘要")
        sections.append("")
        if charts:
            for chart_path in charts:
                chart_name = Path(chart_path).name
                sections.append(f"![{chart_name}]({chart_name})")
                sections.append("")
        else:
            sections.append("（数据量不足，暂无法生成图表）")
            sections.append("")

        sections.append("---")
        sections.append("")

        sections.append("## 三、异常类型明细")
        sections.append("")

        sections.append("### 1. 投喂量偏差")
        sections.append("")
        feed_dev_count = s.get("feed_deviation_count", 0)
        sections.append(f"共发现 **{feed_dev_count}** 条投喂量偏差记录，偏差阈值：±{self.config['thresholds']['feed_deviation_pct']}%")
        sections.append("")
        if not anomalies["feed_deviation"].empty:
            top_feed = anomalies["feed_deviation"].head(10)
            sections.append("| 序号 | 养殖池 | 日期 | 计划量(kg) | 实际量(kg) | 偏差 | 风险等级 |")
            sections.append("|------|--------|------|------------|------------|------|----------|")
            for i, (_, row) in enumerate(top_feed.iterrows(), 1):
                dev_pct = row.get("deviation_pct", 0)
                dev_str = f"{dev_pct:+.1f}%"
                risk = row.get("risk_level", "-")
                sections.append(
                    f"| {i} | {row.get('pond_id', '-')} | {row.get('feed_date', '-')} "
                    f"| {row.get('plan_amount_kg', '-'):.1f} | {row.get('actual_amount_kg', '-'):.1f} "
                    f"| {dev_str} | {risk} |"
                )
            sections.append("")
            if feed_dev_count > 10:
                sections.append(f"> 仅展示前 10 条，完整数据请查看 [风险明细CSV](csv/risk_feed_deviation.csv)")
                sections.append("")
        else:
            sections.append("✅ 未发现投喂量偏差异常。")
            sections.append("")

        sections.append("### 2. 水质超阈值")
        sections.append("")
        water_count = s.get("water_threshold_count", 0)
        sections.append(f"共发现 **{water_count}** 条水质指标超阈值记录。")
        sections.append("")
        if not anomalies["water_threshold"].empty:
            top_water = anomalies["water_threshold"].head(10)
            sections.append("| 序号 | 养殖池 | 日期 | 异常类型 | 详情 | 风险等级 |")
            sections.append("|------|--------|------|----------|------|----------|")
            for i, (_, row) in enumerate(top_water.iterrows(), 1):
                sections.append(
                    f"| {i} | {row.get('pond_id', '-')} | {row.get('feed_date', '-')} "
                    f"| {row.get('anomaly_type', '-')} | {row.get('anomaly_detail', '-')} "
                    f"| {row.get('risk_level', '-')} |"
                )
            sections.append("")
            if water_count > 10:
                sections.append(f"> 仅展示前 10 条，完整数据请查看 [风险明细CSV](csv/risk_water_threshold.csv)")
                sections.append("")
        else:
            sections.append("✅ 水质指标均在正常范围内。")
            sections.append("")

        sections.append("### 3. 补录时间异常")
        sections.append("")
        late_count = s.get("late_supplement_count", 0)
        sections.append(f"共发现 **{late_count}** 条水质补录时间晚于投喂时间的记录。")
        sections.append("")
        if not anomalies["late_supplement"].empty:
            top_late = anomalies["late_supplement"].head(10)
            sections.append("| 序号 | 养殖池 | 日期 | 补录时间 | 风险等级 |")
            sections.append("|------|--------|------|----------|----------|")
            for i, (_, row) in enumerate(top_late.iterrows(), 1):
                sections.append(
                    f"| {i} | {row.get('pond_id', '-')} | {row.get('feed_date', '-')} "
                    f"| {row.get('supplement_time', '-')} | {row.get('risk_level', '-')} |"
                )
            sections.append("")
            if late_count > 10:
                sections.append(f"> 仅展示前 10 条，完整数据请查看 [风险明细CSV](csv/risk_late_supplement.csv)")
                sections.append("")
        else:
            sections.append("✅ 未发现补录时间异常。")
            sections.append("")

        sections.append("---")
        sections.append("")

        sections.append("## 四、高风险池重点关注")
        sections.append("")
        if not anomalies["all_anomalies"].empty:
            high_risk_df = anomalies["all_anomalies"][anomalies["all_anomalies"]["risk_level"] == "高"]
            if not high_risk_df.empty:
                high_ponds = high_risk_df.groupby("pond_id").agg(
                    高风险次数=("anomaly_type", "count"),
                    异常类型=("anomaly_type", lambda x: "、".join(sorted(set(x)))),
                ).sort_values("高风险次数", ascending=False)
                sections.append("| 养殖池 | 高风险次数 | 主要异常类型 |")
                sections.append("|--------|------------|--------------|")
                for pond_id, row in high_ponds.iterrows():
                    sections.append(f"| {pond_id} | {row['高风险次数']} | {row['异常类型']} |")
                sections.append("")
                sections.append("> 建议场长对以上养殖池进行现场检查，确认投喂操作规范性及水质变化原因。")
                sections.append("")
            else:
                sections.append("✅ 本期无高风险养殖池。")
                sections.append("")
        else:
            sections.append("✅ 本期无高风险养殖池。")
            sections.append("")

        sections.append("---")
        sections.append("")

        sections.append("## 五、复核与操作建议")
        sections.append("")
        sections.append("### 操作建议")
        sections.append("")
        suggestions = []
        if s.get("feed_deviation_count", 0) > 0:
            suggestions.append("1. **投喂量偏差**：检查投喂设备是否校准，操作人员是否严格按计划执行，记录是否存在漏记错记。")
        if s.get("water_threshold_count", 0) > 0:
            suggestions.append("2. **水质超阈值**：加强水质监测频次，分析水温突变原因，必要时调整投喂量和换水方案。")
        if s.get("late_supplement_count", 0) > 0:
            suggestions.append("3. **补录时间异常**：规范数据录入流程，要求检测后及时录入系统，减少事后补录。")
        if not suggestions:
            suggestions.append("1. 继续保持现有操作规范，定期复核数据质量。")

        for s_text in suggestions:
            sections.append(s_text)
        sections.append("")

        sections.append("### 复核建议")
        sections.append("")
        sections.append("请场长根据风险等级安排复核：")
        sections.append("- 🔴 **高风险**：24 小时内完成现场复核")
        sections.append("- 🟠 **中风险**：3 个工作日内完成复核")
        sections.append("- 🟢 **低风险**：纳入每周例行检查")
        sections.append("")

        sections.append("---")
        sections.append("")

        sections.append("## 六、数据文件清单")
        sections.append("")
        sections.append("### 风险明细 CSV")
        sections.append("")
        if csv_paths:
            for name, path in csv_paths.items():
                name_cn = {
                    "all_anomalies": "全部异常汇总",
                    "feed_deviation": "投喂量偏差",
                    "water_threshold": "水质超阈值",
                    "late_supplement": "补录时间异常",
                }.get(name, name)
                sections.append(f"- [{name_cn}](csv/{Path(path).name})")
        else:
            sections.append("（无异常数据，未生成风险明细文件）")
        sections.append("")

        sections.append("---")
        sections.append("")
        sections.append("> 本报告由投喂异常分析工具自动生成，如有疑问请联系系统管理员。")

        report_text = "\n".join(sections)
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report_text)

        return report_path
