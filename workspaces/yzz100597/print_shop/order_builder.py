import os
from typing import List, Optional

from .scanner import scan_directory, FileInfo
from .notes_parser import parse_notes
from .state_manager import (
    load_order,
    save_order_state,
    merge_order_with_state,
    generate_item_id,
)
from .validator import validate_order
from .models import (
    Order,
    OrderItem,
    ColorMode,
    PrintSide,
    BindingType,
    ItemStatus,
)


def build_order_items(
    files: List[FileInfo],
    parsed_notes: dict,
) -> List[OrderItem]:
    items = []

    per_file_specs = parsed_notes.get("per_file_specs", [])

    for idx, file_info in enumerate(files):
        item_id = generate_item_id(file_info.file_path)

        copies = parsed_notes.get("copies", 1)
        color_mode = parsed_notes.get("color_mode") or ColorMode.BLACK
        print_side = parsed_notes.get("print_side") or PrintSide.SINGLE
        binding = parsed_notes.get("binding") or BindingType.NONE
        paper_size = parsed_notes.get("paper_size") or "A4"

        if idx < len(per_file_specs):
            spec = per_file_specs[idx]
            if "copies" in spec:
                copies = spec["copies"]
            if "color_mode" in spec:
                color_mode = spec["color_mode"]
            if "print_side" in spec:
                print_side = spec["print_side"]
            if "binding" in spec:
                binding = spec["binding"]

        item = OrderItem(
            id=item_id,
            file_info=file_info,
            copies=copies,
            color_mode=color_mode,
            print_side=print_side,
            binding=binding,
            paper_size=paper_size,
            status=ItemStatus.PENDING,
            notes="",
            confirmed=False,
        )
        items.append(item)

    return items


def scan_and_build_order(
    dir_path: str,
    notes_text: str = "",
    customer_name: str = "",
    recursive: bool = True,
) -> Order:
    dir_path = os.path.abspath(dir_path)

    files = scan_directory(dir_path, recursive=recursive)
    files.sort(key=lambda f: f.filename.lower())

    parsed = parse_notes(notes_text or "", len(files))

    if customer_name:
        parsed["customer_name"] = customer_name

    new_items = build_order_items(files, parsed)

    existing_order = load_order(dir_path)

    order = merge_order_with_state(
        new_items=new_items,
        existing_order=existing_order,
        customer_name=parsed["customer_name"],
        raw_notes=notes_text or "",
        order_dir=dir_path,
    )

    order = validate_order(order, parsed.get("expected_file_count"))

    return order


def confirm_item(order: Order, item_id: str) -> bool:
    for item in order.items:
        if item.id == item_id:
            item.confirmed = True
            if item.status == ItemStatus.PENDING:
                item.status = ItemStatus.CONFIRMED
            return True
    return False


def mark_produced(order: Order, item_id: str) -> bool:
    for item in order.items:
        if item.id == item_id:
            item.status = ItemStatus.PRODUCED
            return True
    return False


def mark_delivered(order: Order, item_id: str) -> bool:
    for item in order.items:
        if item.id == item_id:
            item.status = ItemStatus.DELIVERED
            return True
    return False


def update_item_spec(
    order: Order,
    item_id: str,
    copies: int = None,
    color_mode: ColorMode = None,
    print_side: PrintSide = None,
    binding: BindingType = None,
    paper_size: str = None,
) -> bool:
    for item in order.items:
        if item.id == item_id:
            if copies is not None:
                item.copies = copies
            if color_mode is not None:
                item.color_mode = color_mode
            if print_side is not None:
                item.print_side = print_side
            if binding is not None:
                item.binding = binding
            if paper_size is not None:
                item.paper_size = paper_size
            return True
    return False
