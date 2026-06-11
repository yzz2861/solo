from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime

from .crud import (
    get_batch_by_id,
    get_batch_by_number,
    get_vaccinations_for_batch,
    get_abnormal_event_by_id,
    get_all_abnormal_events,
    get_all_batches,
)


def trace_batch_by_number(
    batch_number: str,
    db_path: Optional[Path] = None
) -> Dict[str, Any]:
    batch = get_batch_by_number(batch_number, db_path)
    if not batch:
        raise ValueError(f"疫苗批号不存在: {batch_number}")

    vaccinations = get_vaccinations_for_batch(batch["id"], db_path)

    related_events = []
    all_events = get_all_abnormal_events(db_path=db_path)
    for event in all_events:
        if event["batch_ids"]:
            event_batch_ids = [bid.strip() for bid in event["batch_ids"].split(",")]
            if str(batch["id"]) in event_batch_ids or batch_number in event_batch_ids:
                related_events.append(event)

    return {
        "batch": batch,
        "vaccinations": vaccinations,
        "vaccination_count": len(vaccinations),
        "related_events": related_events,
        "affected_owners": [
            {
                "owner_name": v["owner_name"],
                "owner_phone": v["owner_phone"],
                "pet_name": v["pet_name"],
                "vaccination_date": v["vaccination_date"],
            }
            for v in vaccinations
        ],
    }


def trace_batches_in_event(
    event_id: int,
    db_path: Optional[Path] = None
) -> Dict[str, Any]:
    event = get_abnormal_event_by_id(event_id, db_path)
    if not event:
        raise ValueError(f"异常事件不存在: {event_id}")

    batch_ids_str = event.get("batch_ids", "")
    batch_numbers = []
    batch_ids = []

    if batch_ids_str:
        items = [bid.strip() for bid in batch_ids_str.split(",")]
        for item in items:
            if item.isdigit():
                batch_ids.append(int(item))
            else:
                batch = get_batch_by_number(item, db_path)
                if batch:
                    batch_ids.append(batch["id"])
                    batch_numbers.append(item)

    if not batch_ids:
        all_batches = get_all_batches(db_path=db_path)
        batch_ids = [b["id"] for b in all_batches if b["status"] != "discarded"]

    results = []
    all_affected_owners = []

    for batch_id in batch_ids:
        batch = get_batch_by_id(batch_id, db_path)
        if not batch:
            continue

        vaccinations = get_vaccinations_for_batch(batch_id, db_path)
        affected_owners = [
            {
                "owner_name": v["owner_name"],
                "owner_phone": v["owner_phone"],
                "pet_name": v["pet_name"],
                "vaccination_date": v["vaccination_date"],
                "vaccine_name": v["vaccine_name"],
            }
            for v in vaccinations
        ]

        results.append({
            "batch": batch,
            "vaccinations": vaccinations,
            "vaccination_count": len(vaccinations),
            "affected_owners": affected_owners,
        })
        all_affected_owners.extend(affected_owners)

    return {
        "event": event,
        "batches": results,
        "total_batches": len(results),
        "total_vaccinations": sum(r["vaccination_count"] for r in results),
        "unique_owners": len({o["owner_phone"] for o in all_affected_owners}),
        "all_affected_owners": all_affected_owners,
    }


def get_trace_report(
    batch_number: Optional[str] = None,
    event_id: Optional[int] = None,
    db_path: Optional[Path] = None
) -> str:
    lines = []

    if batch_number:
        data = trace_batch_by_number(batch_number, db_path)
        batch = data["batch"]

        lines.append("=" * 70)
        lines.append(f"📋 疫苗批号追溯报告: [{batch_number}]")
        lines.append("=" * 70)
        lines.append(f"  疫苗名称: {batch['vaccine_name']}")
        lines.append(f"  适用动物: {batch['vaccine_species']}")
        lines.append(f"  生产日期: {batch['manufacture_date']}")
        lines.append(f"  有效期至: {batch['expiry_date']}")
        lines.append(f"  当前状态: {batch['status']}")
        lines.append(f"  初始库存: {batch['initial_quantity']} 支")
        lines.append(f"  当前库存: {batch['current_quantity']} 支")
        lines.append(f"  已使用量: {batch['initial_quantity'] - batch['current_quantity']} 支")

        lines.append("")
        lines.append(f"🏥 接种记录 ({data['vaccination_count']} 条):")
        if data["vaccinations"]:
            lines.append(f"  {'宠物名':<10} {'品种':<10} {'接种日期':<12} {'剂次':<6} {'接种人':<10}")
            lines.append("  " + "-" * 55)
            for v in data["vaccinations"]:
                lines.append(
                    f"  {v['pet_name']:<10} {v['pet_species']:<10} {v['vaccination_date']:<12} "
                    f"{v['dose_number']:<6} {v['administrator']:<10}"
                )
        else:
            lines.append("  暂无接种记录")

        lines.append("")
        lines.append(f"👥 需要联系的宠物主人 ({len(data['affected_owners'])} 位):")
        if data["affected_owners"]:
            seen_phones = set()
            for owner in data["affected_owners"]:
                if owner["owner_phone"] not in seen_phones:
                    seen_phones.add(owner["owner_phone"])
                    lines.append(
                        f"  📞 {owner['owner_name']} ({owner['owner_phone']}) - 宠物: {owner['pet_name']}, "
                        f"接种日期: {owner['vaccination_date']}"
                    )
        else:
            lines.append("  无需要联系的主人")

        if data["related_events"]:
            lines.append("")
            lines.append(f"⚠️  相关异常事件 ({len(data['related_events'])} 件):")
            for event in data["related_events"]:
                lines.append(
                    f"  - #{event['id']} [{event['event_type']}] {event['event_start']} - "
                    f"{event['event_end'] or '未结束'}: {event['description']}"
                )

    elif event_id:
        data = trace_batches_in_event(event_id, db_path)
        event = data["event"]

        lines.append("=" * 70)
        lines.append(f"📋 异常事件影响追溯报告: 事件 #{event_id}")
        lines.append("=" * 70)
        lines.append(f"  事件类型: {event['event_type']}")
        lines.append(f"  开始时间: {event['event_start']}")
        lines.append(f"  结束时间: {event['event_end'] or '未结束'}")
        lines.append(f"  事件状态: {event['status']}")
        lines.append(f"  事件描述: {event['description']}")
        if event.get("action_taken"):
            lines.append(f"  处理措施: {event['action_taken']}")

        lines.append("")
        lines.append(f"📦 受影响批次 ({data['total_batches']} 批, {data['total_vaccinations']} 次接种):")
        for result in data["batches"]:
            batch = result["batch"]
            lines.append(f"")
            lines.append(f"  批号 [{batch['batch_number']}] {batch['vaccine_name']}")
            lines.append(f"    状态: {batch['status']}, 库存: {batch['current_quantity']} 支, 已接种: {result['vaccination_count']} 次")
            if result["vaccinations"]:
                lines.append(f"    受影响宠物:")
                for v in result["vaccinations"][:5]:
                    lines.append(f"      - {v['pet_name']} ({v['pet_species']}) - {v['vaccination_date']}")
                if len(result["vaccinations"]) > 5:
                    lines.append(f"      ... 还有 {len(result['vaccinations']) - 5} 条记录")

        lines.append("")
        lines.append(f"👥 需要联系的宠物主人 ({data['unique_owners']} 位):")
        seen_phones = set()
        for owner in data["all_affected_owners"]:
            if owner["owner_phone"] not in seen_phones:
                seen_phones.add(owner["owner_phone"])
                lines.append(
                    f"  📞 {owner['owner_name']} ({owner['owner_phone']}) - "
                    f"宠物: {owner['pet_name']}, 疫苗: {owner['vaccine_name']}, "
                    f"接种日期: {owner['vaccination_date']}"
                )

    lines.append("")
    lines.append("=" * 70)
    return "\n".join(lines)
