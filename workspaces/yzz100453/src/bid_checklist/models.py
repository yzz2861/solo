"""核心配置模型：附件清单模板schema定义."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import List, Optional


class AttachmentCategory(str, Enum):
    """附件类别枚举."""

    BUSINESS_LICENSE = "business_license"      # 营业执照
    AUTHORIZATION = "authorization"            # 授权书
    PERFORMANCE_CONTRACT = "performance_contract"  # 业绩合同
    PERSONNEL_CERT = "personnel_cert"          # 人员证书
    STAMPED_PDF = "stamped_pdf"                # 盖章版PDF
    OTHER = "other"                            # 其他


class AttachmentStatus(str, Enum):
    """附件状态枚举."""

    PENDING = "pending"            # 未匹配
    MATCHED = "matched"            # 已匹配
    EXPIRED = "expired"            # 已过期
    MISSING = "missing"            # 缺失
    DUPLICATE = "duplicate"        # 重复
    PAGE_ERROR = "page_error"      # 页数异常
    STAMP_MISSING = "stamp_missing"  # 缺盖章
    NAME_MISMATCH = "name_mismatch"  # 姓名不一致


@dataclass
class AttachmentItem:
    """单个附件条目定义（来自招标文件清单）."""

    name: str
    category: AttachmentCategory = AttachmentCategory.OTHER
    keywords: List[str] = field(default_factory=list)
    required: bool = True
    owner: str = ""  # 负责人
    expected_pages: Optional[int] = None
    page_range: Optional[str] = None  # e.g. "5-8", "+10"
    expire_date: Optional[date] = None
    authorized_person: Optional[str] = None  # 授权人姓名
    require_stamp: bool = False
    stamp_keywords: List[str] = field(default_factory=lambda: ["公章", "签章", "盖章", "公司章"])
    cert_number: Optional[str] = None
    description: str = ""
    section: str = ""  # 所属章节（用于分组）

    def has_date_constraint(self) -> bool:
        return self.expire_date is not None

    def has_page_constraint(self) -> bool:
        return self.expected_pages is not None or self.page_range is not None

    def is_personnel_cert(self) -> bool:
        return self.category == AttachmentCategory.PERSONNEL_CERT

    def is_authorization(self) -> bool:
        return self.category == AttachmentCategory.AUTHORIZATION


@dataclass
class BidChecklistConfig:
    """招标文件附件清单配置（YAML加载后的根对象）."""

    project_name: str = ""
    bid_deadline: Optional[date] = None
    scan_dirs: List[str] = field(default_factory=list)
    exclude_patterns: List[str] = field(
        default_factory=lambda: ["~$*", ".DS_Store", "Thumbs.db", "*.tmp", "*.log"]
    )
    final_keywords: List[str] = field(
        default_factory=lambda: ["最终版", "终稿", "final", "定稿", "最终", "封标版"]
    )
    draft_keywords: List[str] = field(
        default_factory=lambda: ["草稿", "draft", "未盖章", "草签", "初稿", "v0"]
    )
    attachments: List[AttachmentItem] = field(default_factory=list)
    default_owner: str = ""

    def attachments_by_owner(self) -> dict:
        result: dict = {}
        for att in self.attachments:
            owner = att.owner or self.default_owner or "未分配"
            if owner not in result:
                result[owner] = []
            result[owner].append(att)
        return result

    def attachments_by_section(self) -> dict:
        result: dict = {}
        for att in self.attachments:
            section = att.section or "未分类"
            if section not in result:
                result[section] = []
            result[section].append(att)
        return result
