
import os
import sys
import yaml
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from analyzer.importer import DataImporter
from analyzer.linker import DataLinker
from analyzer.detector import AnomalyDetector
from analyzer.reporter import ReportGenerator


def load_config(config_path=None):
    if config_path is None:
        config_path = Path(__file__).parent.parent / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def main():
    parser = argparse.ArgumentParser(
        description="海洋养殖场投喂异常分析工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python -m analyzer.cli run          # 运行分析
  python -m analyzer.cli run --reset  # 重置导入状态后重新分析
  python -m analyzer.cli sample       # 生成示例数据
  python -m analyzer.cli info         # 查看当前数据状态
        """
    )
    parser.add_argument("command", choices=["run", "sample", "info", "reset"],
                        help="执行的命令")
    parser.add_argument("--config", "-c", help="配置文件路径", default=None)
    parser.add_argument("--reset", action="store_true",
                        help="重置导入状态后再运行")

    args = parser.parse_args()
    config = load_config(args.config)

    base_dir = Path.cwd()
    os.chdir(base_dir / Path(config["paths"]["plans_dir"]).parent.parent if False else base_dir)

    if args.command == "sample":
        _generate_sample_data(config)
    elif args.command == "reset":
        importer = DataImporter(config)
        importer.reset_state()
    elif args.command == "info":
        _show_info(config)
    elif args.command == "run":
        if args.reset:
            importer = DataImporter(config)
            importer.reset_state()
        _run_analysis(config)


def _generate_sample_data(config):
    import csv
    import json
    from datetime import date, timedelta, datetime as dt
    import random

    base_dir = Path.cwd()

    plans_dir = base_dir / config["paths"]["plans_dir"]
    records_dir = base_dir / config["paths"]["records_dir"]
    water_dir = base_dir / config["paths"]["water_dir"]

    for d in [plans_dir, records_dir, water_dir]:
        d.mkdir(parents=True, exist_ok=True)

    pond_ids = [f"P{str(i).zfill(3)}" for i in range(1, 11)]
    start_date = date.today() - timedelta(days=14)
    feed_types = ["配合饲料A", "配合饲料B", "生鲜饵料"]

    plans = []
    plan_id = 1
    for i in range(14):
        d = start_date + timedelta(days=i)
        for pond in pond_ids:
            amount = round(random.uniform(20, 80), 1)
            plans.append({
                "计划编号": f"PL{plan_id:06d}",
                "养殖池编号": pond,
                "计划日期": d.strftime("%Y-%m-%d"),
                "投喂时间": "08:00:00",
                "饲料类型": random.choice(feed_types),
                "计划投喂量": amount,
                "备注": "",
            })
            plan_id += 1

    plans_file = plans_dir / "feed_plans_june.csv"
    with open(plans_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(plans[0].keys()))
        writer.writeheader()
        writer.writerows(plans)
    print(f"✅ 已生成投喂计划: {plans_file} ({len(plans)} 条)")

    records = []
    rec_id = 1
    for plan in plans:
        pond = plan["养殖池编号"]
        p_date = plan["计划日期"]
        plan_amt = plan["计划投喂量"]

        deviation = random.uniform(-0.15, 0.15)
        if random.random() < 0.15:
            deviation = random.uniform(-0.35, 0.35)

        actual_amt = round(plan_amt * (1 + deviation), 1)
        review_status = random.choice(["已复核", "已复核", "已复核", "未复核"])
        reviewer = "李场长" if review_status == "已复核" else ""
        review_time = dt.strptime(p_date, "%Y-%m-%d").strftime("%Y-%m-%d 17:30:00") if review_status == "已复核" else ""

        records.append({
            "record_id": f"REC{rec_id:06d}",
            "养殖池编号": pond,
            "投喂日期": p_date,
            "投喂时间": "08:15:00",
            "饲料类型": plan["饲料类型"],
            "实际投喂量": actual_amt,
            "操作人员": random.choice(["张三", "李四", "王五", "赵六"]),
            "复核状态": review_status,
            "复核人": reviewer,
            "复核时间": review_time,
            "备注": "",
        })
        rec_id += 1

    rec_file = records_dir / "feed_records_june.json"
    with open(rec_file, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"✅ 已生成实际投喂记录: {rec_file} ({len(records)} 条)")

    water_records = []
    w_id = 1
    for i in range(14):
        d = start_date + timedelta(days=i)
        for pond in pond_ids:
            base_temp = 24 + random.uniform(-2, 2)
            if i in [5, 6]:
                base_temp += random.uniform(3, 6)
            if i in [10, 11]:
                base_temp -= random.uniform(4, 7)

            is_sup = random.random() < 0.1
            sup_time = ""
            if is_sup:
                sup_time = (dt.strptime(d.strftime("%Y-%m-%d") + " 18:00:00", "%Y-%m-%d %H:%M:%S")
                           + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")

            water_records.append({
                "记录编号": f"W{w_id:06d}",
                "养殖池编号": pond,
                "检测日期": d.strftime("%Y-%m-%d"),
                "检测时间": "07:30:00",
                "水温": round(base_temp, 1),
                "溶解氧": round(random.uniform(4.5, 8.5), 1),
                "pH值": round(random.uniform(7.2, 8.8), 1),
                "盐度": round(random.uniform(22, 32), 1),
                "氨氮": round(random.uniform(0.1, 0.8), 2),
                "亚硝酸盐": round(random.uniform(0.01, 0.15), 3),
                "是否补录": "是" if is_sup else "否",
                "补录时间": sup_time,
                "检测人": random.choice(["王检验", "陈技术员"]),
            })
            w_id += 1

    water_file = water_dir / "water_quality_june.csv"
    with open(water_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(water_records[0].keys()))
        writer.writeheader()
        writer.writerows(water_records)
    print(f"✅ 已生成水质补录表: {water_file} ({len(water_records)} 条)")

    print("\n🎉 示例数据生成完毕！可运行 `python -m analyzer.cli run` 进行分析。")


def _show_info(config):
    importer = DataImporter(config)
    base_dir = Path.cwd()

    for label, dir_key in [("投喂计划", "plans_dir"), ("投喂记录", "records_dir"), ("水质数据", "water_dir")]:
        d = base_dir / config["paths"][dir_key]
        count = len(list(d.glob("*.csv"))) + len(list(d.glob("*.json"))) if d.exists() else 0
        print(f"📁 {label}目录 ({d}): {count} 个文件")

    state = importer._state
    print(f"\n📊 已导入记录数:")
    print(f"  - 计划: {len(state.get('plans', {}).get('record_ids', []))} 条")
    print(f"  - 投喂记录: {len(state.get('records', {}).get('record_ids', []))} 条")
    print(f"  - 水质记录: {len(state.get('water', {}).get('record_ids', []))} 条")


def _run_analysis(config):
    print("🚀 开始投喂异常分析...\n")

    print("📥 步骤 1/4: 导入数据...")
    importer = DataImporter(config)
    data = importer.import_all()

    plans_count = len(data["plans"]) if not data["plans"].empty else 0
    records_count = len(data["records"]) if not data["records"].empty else 0
    water_count = len(data["water"]) if not data["water"].empty else 0
    print(f"   新增计划: {plans_count} 条")
    print(f"   新增记录: {records_count} 条")
    print(f"   新增水质: {water_count} 条")

    if plans_count == 0 and records_count == 0 and water_count == 0:
        print("\nℹ️ 没有新数据可处理。使用 --reset 参数可重置状态重新分析。")
        return

    print("\n🔗 步骤 2/4: 数据关联...")
    linker = DataLinker(data["plans"], data["records"], data["water"])
    merged = linker.link_all()
    summary = linker.summary(merged)
    print(f"   关联后总记录: {summary.get('total_records', 0)} 条")
    print(f"   涉及养殖池: {summary.get('pond_count', 0)} 个")
    if summary.get("date_range"):
        print(f"   日期范围: {summary['date_range']}")

    print("\n🔍 步骤 3/4: 异常检测...")
    detector = AnomalyDetector(config)
    anomalies = detector.detect_all(merged)
    s = anomalies["summary"]
    print(f"   异常总数: {s['total_anomalies']} 条")
    print(f"   - 投喂量偏差: {s['feed_deviation_count']} 条")
    print(f"   - 水质超阈值: {s['water_threshold_count']} 条")
    print(f"   - 补录时间异常: {s['late_supplement_count']} 条")
    print(f"   高风险: {s['high_risk_count']} 条 | 中风险: {s['medium_risk_count']} 条 | 低风险: {s['low_risk_count']} 条")

    print("\n📝 步骤 4/4: 生成报告...")
    reporter = ReportGenerator(config)
    result = reporter.generate_all(merged, anomalies, summary)

    print(f"\n✅ 分析完成！输出目录: {config['paths']['output_dir']}/")
    print(f"   📄 分析报告: {result['report']}")
    if result["csv_files"]:
        print(f"   📊 风险明细CSV:")
        for name, path in result["csv_files"].items():
            print(f"      - {name}: {path}")
    if result["charts"]:
        print(f"   📈 图表: {len(result['charts'])} 张")


if __name__ == "__main__":
    main()
