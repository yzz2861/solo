"""配置加载器：从YAML文件加载附件清单模板."""
from __future__ import annotations

import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from .models import (
    AttachmentCategory,
    AttachmentItem,
    BidChecklistConfig,
)


def _parse_date(value: Any) -> Optional[date]:
    """解析日期字符串为date对象."""
    if not value:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()

    value = str(value).strip()

    patterns = [
        (r"(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})", lambda m: date(int(m[1]), int(m[2]), int(m[3]))),
        (r"(\d{4})(\d{2})(\d{2})", lambda m: date(int(m[1]), int(m[2]), int(m[3]))),
        (r"(\d{4})[-/](\d{1,2})", lambda m: date(int(m[1]), int(m[2]), 28)),
    ]

    for pattern, builder in patterns:
        m = re.match(pattern, value)
        if m:
            try:
                return builder(m)
            except (ValueError, IndexError):
                continue
    return None


def _parse_category(value: str) -> AttachmentCategory:
    """解析附件类别字符串."""
    mapping = {
        "营业执照": AttachmentCategory.BUSINESS_LICENSE,
        "business_license": AttachmentCategory.BUSINESS_LICENSE,
        "授权书": AttachmentCategory.AUTHORIZATION,
        "authorization": AttachmentCategory.AUTHORIZATION,
        "授权委托书": AttachmentCategory.AUTHORIZATION,
        "业绩合同": AttachmentCategory.PERFORMANCE_CONTRACT,
        "performance_contract": AttachmentCategory.PERFORMANCE_CONTRACT,
        "合同": AttachmentCategory.PERFORMANCE_CONTRACT,
        "人员证书": AttachmentCategory.PERSONNEL_CERT,
        "personnel_cert": AttachmentCategory.PERSONNEL_CERT,
        "资质证书": AttachmentCategory.PERSONNEL_CERT,
        "证书": AttachmentCategory.PERSONNEL_CERT,
        "盖章版": AttachmentCategory.STAMPED_PDF,
        "stamped_pdf": AttachmentCategory.STAMPED_PDF,
        "盖章": AttachmentCategory.STAMPED_PDF,
        "其他": AttachmentCategory.OTHER,
        "other": AttachmentCategory.OTHER,
    }
    return mapping.get(value, AttachmentCategory.OTHER)


def _parse_attachment(data: Dict[str, Any]) -> AttachmentItem:
    """解析单个附件条目."""
    name = str(data.get("name", "")).strip()
    if not name:
        raise ValueError("附件名称不能为空")

    category_raw = data.get("category", "") or data.get("类型", "") or data.get("类别", "")
    category = _parse_category(str(category_raw))

    keywords_raw = data.get("keywords", data.get("关键字", data.get("关键词", [])))
    if isinstance(keywords_raw, str):
        keywords = [k.strip() for k in re.split(r"[,，、;；\s]+", keywords_raw) if k.strip()]
    else:
        keywords = [str(k).strip() for k in keywords_raw if str(k).strip()]

    if not keywords:
        keywords = [name]

    expected_pages = data.get("expected_pages", data.get("页数", data.get("pages")))
    if expected_pages is not None:
        try:
            expected_pages = int(expected_pages)
        except (ValueError, TypeError):
            expected_pages = None

    return AttachmentItem(
        name=name,
        category=category,
        keywords=keywords,
        required=bool(data.get("required", data.get("必须", data.get("is_required", True)))),
        owner=str(data.get("owner", data.get("负责人", ""))).strip(),
        expected_pages=expected_pages,
        page_range=str(data.get("page_range", data.get("页数范围", ""))).strip() or None,
        expire_date=_parse_date(data.get("expire_date", data.get("有效期至", data.get("到期日", data.get("过期日期"))))),
        authorized_person=str(data.get("authorized_person", data.get("授权人", data.get("被授权人", "")))).strip() or None,
        require_stamp=bool(data.get("require_stamp", data.get("需盖章", data.get("要盖章", False)))),
        stamp_keywords=[
            str(k).strip()
            for k in (
                data.get("stamp_keywords", data.get("盖章关键字", ["公章", "签章", "盖章", "公司章"]))
                or []
            )
            if str(k).strip()
        ]
        or ["公章", "签章", "盖章", "公司章"],
        cert_number=str(data.get("cert_number", data.get("证书编号", data.get("证号", "")))).strip() or None,
        description=str(data.get("description", data.get("说明", data.get("描述", "")))).strip(),
        section=str(data.get("section", data.get("章节", data.get("分组", "")))).strip(),
    )


def load_config(config_path: str | Path) -> BidChecklistConfig:
    """从YAML文件加载配置."""
    path = Path(config_path)
    if not path.exists():
        raise FileNotFoundError(f"配置文件不存在: {path}")

    with path.open("r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    project_name = str(raw.get("project_name", raw.get("项目名称", ""))).strip() or path.stem
    bid_deadline = _parse_date(raw.get("bid_deadline", raw.get("投标截止日", raw.get("封标日期"))))

    scan_dirs_raw = raw.get("scan_dirs", raw.get("扫描目录", raw.get("资料目录", [])))
    if isinstance(scan_dirs_raw, str):
        scan_dirs = [d.strip() for d in re.split(r"[,，;；\s]+", scan_dirs_raw) if d.strip()]
    else:
        scan_dirs = [str(d).strip() for d in scan_dirs_raw if str(d).strip()]

    exclude_patterns_raw = raw.get("exclude_patterns", raw.get("排除模式", None))
    if exclude_patterns_raw is None:
        exclude_patterns = BidChecklistConfig().exclude_patterns
    elif isinstance(exclude_patterns_raw, str):
        exclude_patterns = [p.strip() for p in re.split(r"[,，;；\s]+", exclude_patterns_raw) if p.strip()]
    else:
        exclude_patterns = [str(p).strip() for p in exclude_patterns_raw if str(p).strip()]

    final_keywords_raw = raw.get("final_keywords", raw.get("最终版关键字", None))
    if final_keywords_raw is None:
        final_keywords = BidChecklistConfig().final_keywords
    elif isinstance(final_keywords_raw, str):
        final_keywords = [k.strip() for k in re.split(r"[,，;；\s]+", final_keywords_raw) if k.strip()]
    else:
        final_keywords = [str(k).strip() for k in final_keywords_raw if str(k).strip()]

    draft_keywords_raw = raw.get("draft_keywords", raw.get("草稿关键字", None))
    if draft_keywords_raw is None:
        draft_keywords = BidChecklistConfig().draft_keywords
    elif isinstance(draft_keywords_raw, str):
        draft_keywords = [k.strip() for k in re.split(r"[,，;；\s]+", draft_keywords_raw) if k.strip()]
    else:
        draft_keywords = [str(k).strip() for k in draft_keywords_raw if str(k).strip()]

    attachments_raw = raw.get("attachments", raw.get("附件清单", raw.get("附件", [])))
    attachments: List[AttachmentItem] = []
    default_section = ""
    for item in attachments_raw:
        if not isinstance(item, dict):
            continue
        section_key = item.get("section", item.get("章节", item.get("分组")))
        if section_key and len(item) <= 2 and (
            "name" not in item and "附件" not in item and "items" not in item
        ):
            default_section = str(section_key)
            continue
        att = _parse_attachment(item)
        if not att.section:
            att.section = default_section
        attachments.append(att)

    return BidChecklistConfig(
        project_name=project_name,
        bid_deadline=bid_deadline,
        scan_dirs=scan_dirs,
        exclude_patterns=exclude_patterns,
        final_keywords=final_keywords,
        draft_keywords=draft_keywords,
        attachments=attachments,
        default_owner=str(raw.get("default_owner", raw.get("默认负责人", ""))).strip(),
    )
