from typing import List, Dict, Any, Optional
from pathlib import Path

from .crud import (
    search_pets_by_name,
    get_vaccinations_for_pet,
    get_batch_by_number,
    get_vaccinations_for_batch,
    get_all_pets,
    get_all_batches,
)


def search_by_pet_name(
    name_pattern: str,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    pets = search_pets_by_name(name_pattern, db_path)
    results = []

    for pet in pets:
        vaccinations = get_vaccinations_for_pet(pet["id"], db_path)
        results.append({
            "pet": pet,
            "vaccinations": vaccinations,
            "vaccination_count": len(vaccinations),
        })

    return results


def search_by_batch_number(
    batch_number: str,
    db_path: Optional[Path] = None
) -> Optional[Dict[str, Any]]:
    batch = get_batch_by_number(batch_number, db_path)
    if not batch:
        return None

    vaccinations = get_vaccinations_for_batch(batch["id"], db_path)
    return {
        "batch": batch,
        "vaccinations": vaccinations,
        "vaccination_count": len(vaccinations),
    }


def format_pet_search_results(results: List[Dict[str, Any]]) -> str:
    if not results:
        return "❌ 未找到匹配的宠物"

    lines = []
    lines.append("=" * 80)
    lines.append(f"🔍 宠物查询结果 ({len(results)} 条)")
    lines.append("=" * 80)

    for result in results:
        pet = result["pet"]
        lines.append("")
        lines.append(f"🐾 宠物: {pet['name']}")
        lines.append(f"   品种: {pet['species']} {pet.get('breed', '') or ''}")
        lines.append(f"   年龄: {pet.get('age', '未知') or '未知'} 岁")
        lines.append(f"   主人: {pet['owner_name']} ({pet['owner_phone']})")

        if result["vaccinations"]:
            lines.append(f"   接种记录 ({result['vaccination_count']} 条):")
            lines.append(
                f"   {'日期':<12} {'疫苗':<15} {'批号':<15} "
                f"{'剂次':<6} {'有效期':<12} {'接种人':<10}"
            )
            lines.append("   " + "-" * 75)
            for v in result["vaccinations"]:
                lines.append(
                    f"   {v['vaccination_date']:<12} {v['vaccine_name']:<15} "
                    f"{v['batch_number']:<15} {v['dose_number']:<6} "
                    f"{v['expiry_date']:<12} {v['administrator']:<10}"
                )
        else:
            lines.append("   暂无接种记录")

    lines.append("")
    lines.append("=" * 80)
    return "\n".join(lines)


def format_batch_search_result(result: Optional[Dict[str, Any]]) -> str:
    if not result:
        return "❌ 未找到匹配的疫苗批号"

    batch = result["batch"]
    lines = []
    lines.append("=" * 80)
    lines.append(f"🔍 批号查询结果: [{batch['batch_number']}]")
    lines.append("=" * 80)
    lines.append(f"  疫苗名称: {batch['vaccine_name']}")
    lines.append(f"  适用动物: {batch['vaccine_species']}")
    lines.append(f"  生产日期: {batch['manufacture_date']}")
    lines.append(f"  有效期至: {batch['expiry_date']}")
    lines.append(f"  当前状态: {batch['status']}")
    lines.append(f"  初始库存: {batch['initial_quantity']} 支")
    lines.append(f"  当前库存: {batch['current_quantity']} 支")
    lines.append(f"  已使用量: {batch['initial_quantity'] - batch['current_quantity']} 支")
    if batch.get("notes"):
        lines.append(f"  备注: {batch['notes']}")

    if result["vaccinations"]:
        lines.append("")
        lines.append(f"💉 接种记录 ({result['vaccination_count']} 条):")
        lines.append(
            f"  {'日期':<12} {'宠物名':<10} {'品种':<8} {'主人':<12} "
            f"{'联系电话':<15} {'剂次':<6} {'接种人':<10}"
        )
        lines.append("  " + "-" * 78)
        for v in result["vaccinations"]:
            lines.append(
                f"  {v['vaccination_date']:<12} {v['pet_name']:<10} {v['pet_species']:<8} "
                f"{v['owner_name']:<12} {v['owner_phone']:<15} "
                f"{v['dose_number']:<6} {v['administrator']:<10}"
            )
    else:
        lines.append("")
        lines.append("  暂无接种记录")

    lines.append("")
    lines.append("=" * 80)
    return "\n".join(lines)
