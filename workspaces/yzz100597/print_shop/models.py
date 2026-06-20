from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import List, Optional
from datetime import datetime


class FileType(str, Enum):
    PDF = "pdf"
    PPT = "ppt"
    IMAGE = "image"
    UNKNOWN = "unknown"


class BindingType(str, Enum):
    NONE = "无装订"
    STAPLE = "骑马钉"
    PERFECT = "胶装"
    RING = "圈装"
    SADDLE = "骑马钉"


class ColorMode(str, Enum):
    COLOR = "彩打"
    BLACK = "黑白"


class PrintSide(str, Enum):
    SINGLE = "单面"
    DOUBLE = "双面"


class ItemStatus(str, Enum):
    PENDING = "待制作"
    CONFIRMED = "已确认"
    PRODUCED = "已制作"
    DELIVERED = "已交付"
    ISSUE = "有问题"


@dataclass
class FileInfo:
    filename: str
    file_path: str
    file_type: FileType
    page_count: int = 0
    size_kb: float = 0.0
    is_valid: bool = True
    error_msg: str = ""
    version_tag: str = ""

    def to_dict(self):
        d = asdict(self)
        d["file_type"] = self.file_type.value
        return d


@dataclass
class OrderItem:
    id: str
    file_info: FileInfo
    copies: int = 1
    color_mode: ColorMode = ColorMode.BLACK
    print_side: PrintSide = PrintSide.SINGLE
    binding: BindingType = BindingType.NONE
    paper_size: str = "A4"
    status: ItemStatus = ItemStatus.PENDING
    notes: str = ""
    confirmed: bool = False

    def to_dict(self):
        d = {
            "id": self.id,
            "file_info": self.file_info.to_dict(),
            "copies": self.copies,
            "color_mode": self.color_mode.value,
            "print_side": self.print_side.value,
            "binding": self.binding.value,
            "paper_size": self.paper_size,
            "status": self.status.value,
            "notes": self.notes,
            "confirmed": self.confirmed,
        }
        return d


@dataclass
class Order:
    order_id: str
    customer_name: str
    items: List[OrderItem] = field(default_factory=list)
    raw_notes: str = ""
    issues: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self):
        return {
            "order_id": self.order_id,
            "customer_name": self.customer_name,
            "items": [item.to_dict() for item in self.items],
            "raw_notes": self.raw_notes,
            "issues": self.issues,
            "warnings": self.warnings,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
