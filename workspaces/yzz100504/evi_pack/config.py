"""配置加载模块"""

import os
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from pathlib import Path

import yaml


@dataclass
class EvidenceTypeConfig:
    name: str
    description: str
    extensions: List[str]
    keywords: List[str]
    required: bool


@dataclass
class Config:
    id_prefix: str = "EVI-"
    id_date_format: str = "%Y%m%d"
    evidence_types: Dict[str, EvidenceTypeConfig] = field(default_factory=dict)
    contract_id_patterns: List[re.Pattern] = field(default_factory=list)
    signer_name_patterns: List[re.Pattern] = field(default_factory=list)
    sign_time_patterns: List[re.Pattern] = field(default_factory=list)
    expected_timezone: str = "Asia/Shanghai"
    allowed_timezones: List[str] = field(default_factory=list)
    certificate_validity_margin_days: int = 7
    max_resign_count: int = 3
    required_screenshot_keywords: List[str] = field(default_factory=list)
    output_directories: List[str] = field(default_factory=list)
    manifest_filename: str = "证据交接清单.xlsx"
    report_filename: str = "证据检查报告.md"
    index_filename: str = "证据包索引.json"


def load_config(config_path: Optional[str] = None) -> Config:
    """加载配置文件"""
    if config_path is None:
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "config.yaml"
        )

    config_path = Path(config_path)
    if not config_path.exists():
        raise FileNotFoundError(f"配置文件不存在: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        raw_config = yaml.safe_load(f)

    cfg = Config()

    pkg_cfg = raw_config.get("evidence_package", {})
    cfg.id_prefix = pkg_cfg.get("id_prefix", "EVI-")
    cfg.id_date_format = pkg_cfg.get("id_date_format", "%Y%m%d")

    evi_types = raw_config.get("evidence_types", {})
    for name, evi_cfg in evi_types.items():
        cfg.evidence_types[name] = EvidenceTypeConfig(
            name=name,
            description=evi_cfg.get("description", ""),
            extensions=evi_cfg.get("extensions", []),
            keywords=evi_cfg.get("keywords", []),
            required=evi_cfg.get("required", False),
        )

    naming = raw_config.get("file_naming", {})
    cfg.contract_id_patterns = [
        re.compile(p, re.IGNORECASE)
        for p in naming.get("contract_id_patterns", [])
    ]
    cfg.signer_name_patterns = [
        re.compile(p, re.IGNORECASE)
        for p in naming.get("signer_name_patterns", [])
    ]
    cfg.sign_time_patterns = [
        re.compile(p, re.IGNORECASE)
        for p in naming.get("sign_time_patterns", [])
    ]

    tz_cfg = raw_config.get("timezone", {})
    cfg.expected_timezone = tz_cfg.get("expected_timezone", "Asia/Shanghai")
    cfg.allowed_timezones = tz_cfg.get("allowed_timezones", [])

    val_cfg = raw_config.get("validation", {})
    cfg.certificate_validity_margin_days = val_cfg.get(
        "certificate_validity_margin_days", 7
    )
    cfg.max_resign_count = val_cfg.get("max_resign_count", 3)
    cfg.required_screenshot_keywords = val_cfg.get(
        "required_screenshot_keywords", []
    )

    out_cfg = raw_config.get("output", {})
    cfg.output_directories = out_cfg.get("directory_structure", [])
    cfg.manifest_filename = out_cfg.get("manifest_filename", "证据交接清单.xlsx")
    cfg.report_filename = out_cfg.get("report_filename", "证据检查报告.md")
    cfg.index_filename = out_cfg.get("index_filename", "证据包索引.json")

    return cfg
