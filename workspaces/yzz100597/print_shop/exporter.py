import os
from datetime import datetime
from typing import List

from .models import Order, OrderItem, ItemStatus, BindingType


def format_item_for_shop(item: OrderItem, index: int) -> str:
    status_icon = {
        ItemStatus.PENDING: "☐",
        ItemStatus.CONFIRMED: "☑",
        ItemStatus.PRODUCED: "✓",
        ItemStatus.DELIVERED: "★",
        ItemStatus.ISSUE: "⚠",
    }.get(item.status, "☐")

    binding_str = item.binding.value if item.binding != BindingType.NONE else "无"

    return (
        f"[{status_icon}] {index:2d}. {item.file_info.filename}\n"
        f"    页数: {item.file_info.page_count} | 份数: {item.copies} | "
        f"{item.color_mode.value} | {item.print_side.value} | "
        f"装订: {binding_str} | 纸张: {item.paper_size}\n"
        f"    状态: {item.status.value}"
        + (f" | 备注: {item.notes}" if item.notes else "")
    )


def format_item_for_customer(item: OrderItem, index: int) -> str:
    if item.status == ItemStatus.ISSUE:
        return f"  ⚠ {index:2d}. {item.file_info.filename} - {item.file_info.error_msg}"

    binding_str = item.binding.value if item.binding != BindingType.NONE else "无装订"

    return (
        f"  ▢ {index:2d}. {item.file_info.filename}\n"
        f"     共 {item.copies} 份 / {item.file_info.page_count} 页 / "
        f"{item.color_mode.value} / {item.print_side.value} / {binding_str}"
    )


def export_shop_list(order: Order, output_path: str = None) -> str:
    lines = []

    lines.append("=" * 60)
    lines.append("         打 印 店 制 作 清 单")
    lines.append("=" * 60)
    lines.append(f"订单号: {order.order_id}")
    lines.append(f"客户: {order.customer_name}")
    lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("-" * 60)

    if order.raw_notes:
        lines.append("客户备注:")
        for note_line in order.raw_notes.strip().split('\n'):
            lines.append(f"  {note_line}")
        lines.append("-" * 60)

    pending_items = [i for i in order.items if i.status != ItemStatus.PRODUCED and i.status != ItemStatus.DELIVERED and i.status != ItemStatus.ISSUE]
    produced_items = [i for i in order.items if i.status == ItemStatus.PRODUCED or i.status == ItemStatus.DELIVERED]
    issue_items = [i for i in order.items if i.status == ItemStatus.ISSUE]

    if issue_items:
        lines.append(f"\n【有问题 ({len(issue_items)} 项)】")
        for idx, item in enumerate(issue_items, 1):
            lines.append(format_item_for_shop(item, idx))
            lines.append("")

    if pending_items:
        lines.append(f"\n【待制作 ({len(pending_items)} 项)】")
        for idx, item in enumerate(pending_items, 1):
            lines.append(format_item_for_shop(item, idx))
            lines.append("")

    if produced_items:
        lines.append(f"\n【已完成 ({len(produced_items)} 项)】")
        for idx, item in enumerate(produced_items, 1):
            lines.append(format_item_for_shop(item, idx))
            lines.append("")

    total_pages = sum(i.file_info.page_count * i.copies for i in order.items if i.file_info.is_valid)
    total_copies = sum(i.copies for i in order.items if i.file_info.is_valid)

    lines.append("-" * 60)
    lines.append(f"总计: {len(order.items)} 个文件 / {total_copies} 份 / 约 {total_pages} 面")
    lines.append(f"问题: {len(order.issues)} 项 | 警告: {len(order.warnings)} 项")
    lines.append("=" * 60)

    if order.issues:
        lines.append("\n⚠  问题列表:")
        for issue in order.issues:
            lines.append(f"  - {issue}")

    if order.warnings:
        lines.append("\n⚠  注意事项:")
        for warning in order.warnings:
            lines.append(f"  - {warning}")

    content = "\n".join(lines)

    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

    return content


def export_customer_list(order: Order, output_path: str = None) -> str:
    lines = []

    lines.append("=" * 50)
    lines.append("       打 印 订 单 交 付 清 单")
    lines.append("=" * 50)
    lines.append(f"客户姓名: {order.customer_name}")
    lines.append(f"订单编号: {order.order_id}")
    lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("-" * 50)

    valid_items = [i for i in order.items if i.status != ItemStatus.ISSUE]
    issue_items = [i for i in order.items if i.status == ItemStatus.ISSUE]

    lines.append(f"\n文件列表 (共 {len(valid_items)} 项):\n")

    for idx, item in enumerate(valid_items, 1):
        lines.append(format_item_for_customer(item, idx))
        lines.append("")

    if issue_items:
        lines.append(f"\n⚠  暂无法处理的文件 ({len(issue_items)} 项):\n")
        for idx, item in enumerate(issue_items, 1):
            lines.append(f"  {idx}. {item.file_info.filename}: {item.file_info.error_msg}")
        lines.append("")

    total_pages = sum(i.file_info.page_count * i.copies for i in valid_items)
    total_copies = sum(i.copies for i in valid_items)

    lines.append("-" * 50)
    lines.append(f"合计: {len(valid_items)} 个文件 / {total_copies} 份")
    lines.append(f"      约 {total_pages} 面 (按单面计算)")
    lines.append("-" * 50)

    ready_count = sum(1 for i in valid_items if i.status in (ItemStatus.PRODUCED, ItemStatus.DELIVERED))
    lines.append(f"\n制作进度: {ready_count}/{len(valid_items)} 项已完成")

    if ready_count == len(valid_items):
        lines.append("  ✅ 全部制作完成，可以取件")
    else:
        lines.append(f"  还有 {len(valid_items) - ready_count} 项制作中")

    lines.append("\n" + "=" * 50)
    lines.append("  请核对以上内容，如有问题请及时联系")
    lines.append("=" * 50)

    content = "\n".join(lines)

    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

    return content


def export_markdown_shop(order: Order, output_path: str = None) -> str:
    lines = []

    lines.append(f"# 打印店制作清单 - {order.customer_name}")
    lines.append("")
    lines.append(f"- **订单号**: {order.order_id}")
    lines.append(f"- **生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")

    if order.raw_notes:
        lines.append("## 客户备注")
        lines.append("")
        lines.append("```")
        lines.append(order.raw_notes.strip())
        lines.append("```")
        lines.append("")

    lines.append("## 文件清单")
    lines.append("")
    lines.append("| # | 状态 | 文件名 | 页数 | 份数 | 颜色 | 单面/双面 | 装订 | 纸张 | 备注 |")
    lines.append("|---|------|--------|------|------|------|-----------|------|------|------|")

    for idx, item in enumerate(order.items, 1):
        status_mark = {
            ItemStatus.PENDING: "⬜ 待制作",
            ItemStatus.CONFIRMED: "🔳 已确认",
            ItemStatus.PRODUCED: "✅ 已制作",
            ItemStatus.DELIVERED: "📦 已交付",
            ItemStatus.ISSUE: "⚠️ 有问题",
        }.get(item.status, "⬜")

        binding_str = item.binding.value if item.binding != BindingType.NONE else "无"
        lines.append(
            f"| {idx} | {status_mark} | {item.file_info.filename} | "
            f"{item.file_info.page_count} | {item.copies} | "
            f"{item.color_mode.value} | {item.print_side.value} | "
            f"{binding_str} | {item.paper_size} | {item.notes or '-'} |"
        )

    total_pages = sum(i.file_info.page_count * i.copies for i in order.items if i.file_info.is_valid)
    total_copies = sum(i.copies for i in order.items if i.file_info.is_valid)

    lines.append("")
    lines.append(f"**总计**: {len(order.items)} 个文件 / {total_copies} 份 / 约 {total_pages} 面")
    lines.append("")

    if order.issues or order.warnings:
        lines.append("## 注意事项")
        lines.append("")
        for issue in order.issues:
            lines.append(f"- ❌ {issue}")
        for warning in order.warnings:
            lines.append(f"- ⚠️ {warning}")
        lines.append("")

    content = "\n".join(lines)

    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

    return content
