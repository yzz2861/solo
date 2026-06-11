from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict

from .crud import (
    get_all_batches,
    get_vaccination_records,
    get_abnormal_temperatures,
    get_all_abnormal_events,
    get_alerts,
)


def get_monthly_report(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db_path: Optional[Path] = None
) -> Dict[str, Any]:
    now = datetime.now()
    if year is None:
        year = now.year
    if month is None:
        month = now.month

    if month == 12:
        next_year = year + 1
        next_month = 1
    else:
        next_year = year
        next_month = month + 1

    start_date = f"{year}-{month:02d}-01"
    end_date = f"{next_year}-{next_month:02d}-01"

    all_batches = get_all_batches(db_path=db_path)
    vaccinations = get_vaccination_records(
        start_date=start_date,
        end_date=end_date,
        db_path=db_path
    )
    abnormal_temps = get_abnormal_temperatures(
        start_time=start_date + " 00:00:00",
        end_time=end_date + " 00:00:00",
        db_path=db_path
    )
    abnormal_events = get_all_abnormal_events(db_path=db_path)
    relevant_events = [
        e for e in abnormal_events
        if e["event_start"].startswith(f"{year}-{month:02d}")
        or (e.get("event_end") and e["event_end"].startswith(f"{year}-{month:02d}"))
    ]
    alerts = get_alerts(include_resolved=True, db_path=db_path)
    relevant_alerts = [
        a for a in alerts
        if a["created_at"].startswith(f"{year}-{month:02d}")
    ]

    valid_inventory = [b for b in all_batches if b["status"] == "normal" and b["current_quantity"] > 0]
    invalid_inventory = [b for b in all_batches if b["status"] != "normal" and b["current_quantity"] > 0]

    vaccines_summary = defaultdict(lambda: {"total": 0, "used": 0, "invalid": 0})
    for batch in all_batches:
        vname = batch["vaccine_name"]
        vaccines_summary[vname]["total"] += batch["initial_quantity"]
        vaccines_summary[vname]["used"] += batch["initial_quantity"] - batch["current_quantity"]
        if batch["status"] != "normal":
            vaccines_summary[vname]["invalid"] += batch["current_quantity"]

    affected_owners = []
    seen_records = set()
    for v in vaccinations:
        batch_status = next(
            (b["status"] for b in all_batches if b["id"] == v["batch_id"]),
            "normal"
        )
        event_related = any(
            e["batch_ids"] and (str(v["batch_id"]) in e["batch_ids"].split(",") or
                               v["batch_number"] in e["batch_ids"].split(","))
            for e in relevant_events
        )
        if batch_status != "normal" or event_related:
            record_key = (v["owner_phone"], v["pet_name"], v["batch_number"])
            if record_key not in seen_records:
                seen_records.add(record_key)
                affected_owners.append({
                    "owner_name": v["owner_name"],
                    "owner_phone": v["owner_phone"],
                    "pet_name": v["pet_name"],
                    "pet_species": v["pet_species"],
                    "vaccine_name": v["vaccine_name"],
                    "batch_number": v["batch_number"],
                    "vaccination_date": v["vaccination_date"],
                    "reason": "异常批次" if batch_status != "normal" else "事件关联",
                })

    return {
        "report_period": f"{year}年{month}月",
        "start_date": start_date,
        "end_date": end_date,
        "inventory": {
            "valid_batches": valid_inventory,
            "invalid_batches": invalid_inventory,
            "valid_count": sum(b["current_quantity"] for b in valid_inventory),
            "invalid_count": sum(b["current_quantity"] for b in invalid_inventory),
            "by_vaccine": dict(vaccines_summary),
        },
        "temperature_impact": {
            "abnormal_count": len(abnormal_temps),
            "abnormal_records": abnormal_temps,
            "events": relevant_events,
            "affected_batches_count": len([b for b in all_batches if b["status"] in ["suspicious", "quarantined"]]),
        },
        "vaccinations": {
            "total_count": len(vaccinations),
            "records": vaccinations,
            "by_vaccine": defaultdict(int),
        },
        "owners_to_contact": affected_owners,
        "alerts": {
            "total": len(relevant_alerts),
            "unresolved": len([a for a in relevant_alerts if a["is_resolved"] == 0]),
            "by_type": defaultdict(int),
        },
    }


def format_monthly_report(data: Dict[str, Any]) -> str:
    lines = []

    lines.append("=" * 80)
    lines.append(f"📊 兽医院疫苗管理月报 - {data['report_period']}")
    lines.append("=" * 80)

    lines.append("")
    lines.append("📦 一、有效库存统计")
    lines.append("-" * 80)
    lines.append(f"  有效批次数量: {len(data['inventory']['valid_batches'])} 批")
    lines.append(f"  有效库存总量: {data['inventory']['valid_count']} 支")
    lines.append(f"  异常库存总量: {data['inventory']['invalid_count']} 支")

    if data["inventory"]["by_vaccine"]:
        lines.append("")
        lines.append(f"  {'疫苗名称':<20} {'入库总数':<10} {'已使用':<10} {'异常库存':<10}")
        lines.append("  " + "-" * 55)
        for vname, stats in data["inventory"]["by_vaccine"].items():
            lines.append(f"  {vname:<20} {stats['total']:<10} {stats['used']:<10} {stats['invalid']:<10}")

    if data["inventory"]["valid_batches"]:
        lines.append("")
        lines.append("  有效批次明细:")
        lines.append(f"  {'批号':<15} {'疫苗':<15} {'有效期':<12} {'库存':<8} {'状态':<10}")
        lines.append("  " + "-" * 65)
        for batch in data["inventory"]["valid_batches"]:
            lines.append(
                f"  {batch['batch_number']:<15} {batch['vaccine_name']:<15} "
                f"{batch['expiry_date']:<12} {batch['current_quantity']:<8} {batch['status']:<10}"
            )

    lines.append("")
    lines.append("🌡️ 二、超温影响分析")
    lines.append("-" * 80)
    lines.append(f"  本月超温记录: {data['temperature_impact']['abnormal_count']} 条")
    lines.append(f"  本月异常事件: {len(data['temperature_impact']['events'])} 件")
    lines.append(f"  受影响批次: {data['temperature_impact']['affected_batches_count']} 批")

    if data["temperature_impact"]["events"]:
        lines.append("")
        lines.append("  异常事件明细:")
        for event in data["temperature_impact"]["events"]:
            lines.append(
                f"  - #{event['id']} [{event['event_type']}] {event['event_start']} ~ "
                f"{event['event_end'] or '进行中'} | 状态: {event['status']}"
            )
            lines.append(f"    描述: {event['description']}")
            if event.get("action_taken"):
                lines.append(f"    处置: {event['action_taken']}")

    lines.append("")
    lines.append("💉 三、本月接种明细")
    lines.append("-" * 80)
    lines.append(f"  总接种次数: {data['vaccinations']['total_count']} 次")

    if data["vaccinations"]["records"]:
        vcount = defaultdict(int)
        for v in data["vaccinations"]["records"]:
            vcount[v["vaccine_name"]] += 1

        lines.append("")
        lines.append("  按疫苗统计:")
        for vname, count in vcount.items():
            lines.append(f"    - {vname}: {count} 次")

        lines.append("")
        lines.append("  接种明细:")
        lines.append(
            f"  {'日期':<12} {'宠物名':<10} {'品种':<8} {'疫苗':<15} "
            f"{'批号':<15} {'剂次':<6} {'接种人':<10}"
        )
        lines.append("  " + "-" * 80)
        for v in data["vaccinations"]["records"][:30]:
            lines.append(
                f"  {v['vaccination_date']:<12} {v['pet_name']:<10} {v['pet_species']:<8} "
                f"{v['vaccine_name']:<15} {v['batch_number']:<15} "
                f"{v['dose_number']:<6} {v['administrator']:<10}"
            )
        if len(data["vaccinations"]["records"]) > 30:
            lines.append(f"  ... 还有 {len(data['vaccinations']['records']) - 30} 条记录")

    lines.append("")
    lines.append("👥 四、需要联系的宠物主人")
    lines.append("-" * 80)
    lines.append(f"  需要联系: {len(data['owners_to_contact'])} 位")

    if data["owners_to_contact"]:
        lines.append("")
        lines.append(
            f"  {'主人姓名':<10} {'联系电话':<15} {'宠物名':<10} "
            f"{'疫苗':<15} {'批号':<15} {'原因':<12}"
        )
        lines.append("  " + "-" * 80)
        for owner in data["owners_to_contact"]:
            lines.append(
                f"  {owner['owner_name']:<10} {owner['owner_phone']:<15} "
                f"{owner['pet_name']:<10} {owner['vaccine_name']:<15} "
                f"{owner['batch_number']:<15} {owner['reason']:<12}"
            )
    else:
        lines.append("  ✅ 本月无需要联系的主人")

    lines.append("")
    lines.append("⚠️ 五、异常提醒统计")
    lines.append("-" * 80)
    lines.append(f"  本月提醒总数: {data['alerts']['total']}")
    lines.append(f"  未解决提醒: {data['alerts']['unresolved']}")

    lines.append("")
    lines.append("=" * 80)
    lines.append(f"📅 报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 80)

    return "\n".join(lines)
