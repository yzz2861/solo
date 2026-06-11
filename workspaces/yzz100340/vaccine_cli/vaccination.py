from typing import Optional, Dict, Any
from pathlib import Path
from datetime import datetime

from .crud import (
    create_or_get_pet,
    create_vaccination_record,
    check_duplicate_vaccination,
    get_batch_by_id,
    get_batch_by_number,
    update_batch_quantity,
    create_alert,
)


def record_vaccination(
    pet_name: str,
    pet_species: str,
    owner_name: str,
    owner_phone: str,
    batch_number: str,
    vaccination_date: str,
    dose_number: int,
    administrator: str,
    pet_breed: Optional[str] = None,
    pet_age: Optional[int] = None,
    notes: Optional[str] = None,
    db_path: Optional[Path] = None,
    force: bool = False
) -> Dict[str, Any]:
    batch = get_batch_by_number(batch_number, db_path)
    if not batch:
        raise ValueError(f"疫苗批号不存在: {batch_number}")

    if batch["status"] != "normal":
        message = (
            f"疫苗批号 [{batch_number}] 状态为 '{batch['status']}'，"
            f"不建议使用。如需强制记录请使用 --force 参数"
        )
        if not force:
            raise ValueError(message)
        create_alert(
            alert_type="abnormal_batch_used",
            severity="high",
            message=f"已使用异常状态疫苗批号 [{batch_number}] 为宠物 {pet_name} 接种",
            related_batch_id=batch["id"],
            db_path=db_path
        )

    if check_duplicate_vaccination(
        pet_id=None,
        batch_id=batch["id"],
        dose_number=dose_number,
        db_path=db_path
    ):
        pet_id = create_or_get_pet(pet_name, pet_species, owner_name, owner_phone, pet_breed, pet_age, db_path)
        if check_duplicate_vaccination(pet_id, batch["id"], dose_number, db_path):
            message = (
                f"宠物 {pet_name} 已使用批号 [{batch_number}] 接种过第 {dose_number} 剂，"
                f"可能是重复录入。如需强制记录请使用 --force 参数"
            )
            if not force:
                raise ValueError(message)
            create_alert(
                alert_type="duplicate_vaccination",
                severity="warning",
                message=message,
                related_batch_id=batch["id"],
                related_pet_id=pet_id,
                db_path=db_path
            )

    if batch["current_quantity"] <= 0:
        message = f"疫苗批号 [{batch_number}] 库存不足（当前: {batch['current_quantity']}）"
        if not force:
            raise ValueError(message)

    pet_id = create_or_get_pet(pet_name, pet_species, owner_name, owner_phone, pet_breed, pet_age, db_path)

    if check_duplicate_vaccination(pet_id, batch["id"], dose_number, db_path) and not force:
        message = (
            f"宠物 {pet_name} 已使用批号 [{batch_number}] 接种过第 {dose_number} 剂，"
            f"可能是重复录入。如需强制记录请使用 --force 参数"
        )
        raise ValueError(message)

    record_id = create_vaccination_record(
        pet_id=pet_id,
        batch_id=batch["id"],
        vaccination_date=vaccination_date,
        dose_number=dose_number,
        administrator=administrator,
        notes=notes,
        db_path=db_path
    )

    update_batch_quantity(batch["id"], -1, db_path)

    new_quantity = batch["current_quantity"] - 1
    if new_quantity < 0:
        create_alert(
            alert_type="negative_inventory",
            severity="high",
            message=f"疫苗批号 [{batch_number}] 库存扣减后为负数: {new_quantity} 支",
            related_batch_id=batch["id"],
            db_path=db_path
        )

    return {
        "record_id": record_id,
        "pet_id": pet_id,
        "batch_id": batch["id"],
        "batch_number": batch_number,
        "vaccine_name": batch["vaccine_name"],
        "new_quantity": new_quantity,
    }
