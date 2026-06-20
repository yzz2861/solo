import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, List
import hashlib

from .models import (
    Order,
    OrderItem,
    FileInfo,
    FileType,
    ColorMode,
    PrintSide,
    BindingType,
    ItemStatus,
)


def generate_item_id(file_path: str) -> str:
    file_path = os.path.abspath(file_path)
    return hashlib.md5(file_path.encode('utf-8')).hexdigest()[:12]


def generate_order_id(customer_name: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d")
    clean_name = customer_name.replace(" ", "_")[:10]
    return f"{timestamp}_{clean_name}"


def get_state_file_path(order_dir: str) -> str:
    return os.path.join(order_dir, ".print_order_state.json")


def load_order_state(order_dir: str) -> Optional[dict]:
    state_file = get_state_file_path(order_dir)
    if os.path.exists(state_file):
        try:
            with open(state_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return None
    return None


def save_order_state(order_dir: str, order: Order) -> None:
    state_file = get_state_file_path(order_dir)
    order.updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(state_file, 'w', encoding='utf-8') as f:
        json.dump(order.to_dict(), f, ensure_ascii=False, indent=2)


def dict_to_file_info(d: dict) -> FileInfo:
    return FileInfo(
        filename=d["filename"],
        file_path=d["file_path"],
        file_type=FileType(d["file_type"]),
        page_count=d.get("page_count", 0),
        size_kb=d.get("size_kb", 0.0),
        is_valid=d.get("is_valid", True),
        error_msg=d.get("error_msg", ""),
        version_tag=d.get("version_tag", ""),
    )


def dict_to_order_item(d: dict) -> OrderItem:
    return OrderItem(
        id=d["id"],
        file_info=dict_to_file_info(d["file_info"]),
        copies=d.get("copies", 1),
        color_mode=ColorMode(d.get("color_mode", ColorMode.BLACK.value)),
        print_side=PrintSide(d.get("print_side", PrintSide.SINGLE.value)),
        binding=BindingType(d.get("binding", BindingType.NONE.value)),
        paper_size=d.get("paper_size", "A4"),
        status=ItemStatus(d.get("status", ItemStatus.PENDING.value)),
        notes=d.get("notes", ""),
        confirmed=d.get("confirmed", False),
    )


def dict_to_order(d: dict) -> Order:
    return Order(
        order_id=d["order_id"],
        customer_name=d["customer_name"],
        items=[dict_to_order_item(item) for item in d.get("items", [])],
        raw_notes=d.get("raw_notes", ""),
        issues=d.get("issues", []),
        warnings=d.get("warnings", []),
        created_at=d.get("created_at", ""),
        updated_at=d.get("updated_at", ""),
    )


def load_order(order_dir: str) -> Optional[Order]:
    state = load_order_state(order_dir)
    if state:
        return dict_to_order(state)
    return None


def merge_order_with_state(
    new_items: List[OrderItem],
    existing_order: Optional[Order],
    customer_name: str,
    raw_notes: str,
    order_dir: str,
) -> Order:
    if existing_order is None:
        order = Order(
            order_id=generate_order_id(customer_name),
            customer_name=customer_name,
            items=new_items,
            raw_notes=raw_notes,
            issues=[],
            warnings=[],
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            updated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
        return order

    existing_map = {item.id: item for item in existing_order.items}
    new_map = {item.id: item for item in new_items}

    merged_items = []
    all_ids = set(existing_map.keys()) | set(new_map.keys())

    for item_id in all_ids:
        if item_id in existing_map and item_id in new_map:
            existing = existing_map[item_id]
            new_item = new_map[item_id]

            if existing.confirmed:
                merged_item = existing
                merged_item.file_info = new_item.file_info
            else:
                merged_item = new_item
                merged_item.status = existing.status
                merged_item.confirmed = existing.confirmed
                if existing.status == ItemStatus.PRODUCED:
                    merged_item.status = ItemStatus.PRODUCED

            merged_items.append(merged_item)
        elif item_id in existing_map:
            existing = existing_map[item_id]
            existing.status = ItemStatus.ISSUE
            existing.notes = (existing.notes + " 文件已丢失").strip()
            merged_items.append(existing)
        else:
            merged_items.append(new_map[item_id])

    existing_order.items = merged_items
    existing_order.raw_notes = raw_notes
    existing_order.customer_name = customer_name
    existing_order.updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return existing_order
