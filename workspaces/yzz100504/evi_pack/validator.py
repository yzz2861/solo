"""证据检查模块"""

import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .config import Config
from .scanner import ContractRecord, EvidenceFile, ScanResult, SignerRecord


class Severity(str, Enum):
    """问题严重级别"""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationIssue:
    """验证问题"""
    severity: Severity
    category: str
    message: str
    contract_id: Optional[str] = None
    signer_name: Optional[str] = None
    evidence_type: Optional[str] = None
    file_name: Optional[str] = None
    details: Dict = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "severity": self.severity.value,
            "category": self.category,
            "message": self.message,
            "contract_id": self.contract_id,
            "signer_name": self.signer_name,
            "evidence_type": self.evidence_type,
            "file_name": self.file_name,
            "details": self.details,
        }


@dataclass
class ValidationResult:
    """验证结果"""
    issues: List[ValidationIssue] = field(default_factory=list)
    summary: Dict = field(default_factory=dict)

    def add_issue(self, issue: ValidationIssue):
        self.issues.append(issue)

    @property
    def errors(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == Severity.ERROR]

    @property
    def warnings(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == Severity.WARNING]

    @property
    def infos(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == Severity.INFO]

    def build_summary(self) -> Dict:
        """构建摘要"""
        self.summary = {
            "total_issues": len(self.issues),
            "errors": len(self.errors),
            "warnings": len(self.warnings),
            "infos": len(self.infos),
            "by_category": {},
            "by_contract": {},
        }
        for issue in self.issues:
            cat = issue.category
            self.summary["by_category"][cat] = self.summary["by_category"].get(cat, 0) + 1
            if issue.contract_id:
                cid = issue.contract_id
                self.summary["by_contract"][cid] = self.summary["by_contract"].get(cid, 0) + 1
        return self.summary


class EvidenceValidator:
    """证据验证器"""

    def __init__(self, config: Config):
        self.config = config

    def validate(self, scan_result: ScanResult) -> ValidationResult:
        """执行完整验证"""
        result = ValidationResult()

        for contract in scan_result.contracts.values():
            self._validate_contract(contract, result)

        if scan_result.unclassified_files:
            self._validate_unclassified(scan_result.unclassified_files, result)

        result.build_summary()
        return result

    def _validate_contract(self, contract: ContractRecord, result: ValidationResult):
        """验证单个合同"""
        for signer_name, signer in contract.signers.items():
            self._validate_signer_evidence(contract.contract_id, signer, result)

        self._validate_sign_timeline(contract, result)
        self._validate_resign_count(contract, result)
        self._validate_timezone_consistency(contract, result)

    def _validate_signer_evidence(
        self, contract_id: str, signer: SignerRecord, result: ValidationResult
    ):
        """验证签署人的证据完整性"""
        for type_name, type_cfg in self.config.evidence_types.items():
            has_evidence = type_name in signer.files and len(signer.files[type_name]) > 0

            if type_cfg.required and not has_evidence:
                result.add_issue(ValidationIssue(
                    severity=Severity.ERROR,
                    category="missing_evidence",
                    message=f"缺少必要证据: {type_cfg.description}",
                    contract_id=contract_id,
                    signer_name=signer.name,
                    evidence_type=type_name,
                ))
            elif has_evidence:
                files = signer.files[type_name]
                if type_name == "cert_chain":
                    self._validate_certificate_chain(
                        contract_id, signer.name, files, result
                    )
                elif type_name == "page_screenshot":
                    self._validate_screenshots(
                        contract_id, signer.name, files, result
                    )

    def _validate_certificate_chain(
        self,
        contract_id: str,
        signer_name: str,
        files: List[EvidenceFile],
        result: ValidationResult,
    ):
        """检查证书链完整性"""
        cert_count = len(files)
        cert_names = [f.file_name.lower() for f in files]

        has_root = any("root" in n or "根" in n for n in cert_names)
        has_intermediate = any("intermediate" in n or "中间" in n or "ca" in n for n in cert_names)
        has_user = any(not ("root" in n or "intermediate" in n or "ca" in n or "根" in n or "中间" in n) for n in cert_names)

        if cert_count < 2:
            result.add_issue(ValidationIssue(
                severity=Severity.WARNING,
                category="certificate_chain",
                message=f"证书链文件数量不足({cert_count}个)，可能缺少完整证书链",
                contract_id=contract_id,
                signer_name=signer_name,
                evidence_type="cert_chain",
                details={"cert_count": cert_count},
            ))

        missing_parts = []
        if not has_root:
            missing_parts.append("根证书")
        if not has_intermediate and cert_count >= 2:
            missing_parts.append("中间证书")
        if not has_user:
            missing_parts.append("用户证书")

        if missing_parts:
            result.add_issue(ValidationIssue(
                severity=Severity.ERROR,
                category="certificate_chain",
                message=f"证书链缺段: 缺少{'、'.join(missing_parts)}",
                contract_id=contract_id,
                signer_name=signer_name,
                evidence_type="cert_chain",
                details={"missing_parts": missing_parts},
            ))

        self._check_certificate_validity(contract_id, signer_name, files, result)

    def _check_certificate_validity(
        self,
        contract_id: str,
        signer_name: str,
        files: List[EvidenceFile],
        result: ValidationResult,
    ):
        """检查证书有效期（通过文件名和修改时间推断）"""
        now = datetime.now()
        margin = timedelta(days=self.config.certificate_validity_margin_days)

        for evi_file in files:
            text_to_check = f"{evi_file.file_name} {evi_file.original_path}"

            date_pattern = r"([0-9]{4}[-_/.][0-9]{2}[-_/.][0-9]{2})"
            dates_found = re.findall(date_pattern, text_to_check)

            for date_str in dates_found:
                try:
                    date_clean = date_str.replace("_", "-").replace("/", "-").replace(".", "-")
                    cert_date = datetime.strptime(date_clean, "%Y-%m-%d")

                    if "过期" in text_to_check or "expire" in text_to_check.lower() or "not after" in text_to_check.lower() or "有效期至" in text_to_check:
                        if cert_date < now:
                            result.add_issue(ValidationIssue(
                                severity=Severity.ERROR,
                                category="certificate_validity",
                                message=f"证书已过期: {date_str}",
                                contract_id=contract_id,
                                signer_name=signer_name,
                                evidence_type="cert_chain",
                                file_name=evi_file.file_name,
                                details={"expiry_date": date_str},
                            ))
                        elif cert_date < now + margin:
                            result.add_issue(ValidationIssue(
                                severity=Severity.WARNING,
                                category="certificate_validity",
                                message=f"证书即将过期(有效期至: {date_str})",
                                contract_id=contract_id,
                                signer_name=signer_name,
                                evidence_type="cert_chain",
                                file_name=evi_file.file_name,
                                details={"expiry_date": date_str},
                            ))
                except ValueError:
                    continue

    def _validate_screenshots(
        self,
        contract_id: str,
        signer_name: str,
        files: List[EvidenceFile],
        result: ValidationResult,
    ):
        """检查截图是否包含关键页面"""
        file_names = [f.file_name.lower() for f in files]
        combined_names = " ".join(file_names)

        missing_keywords = []
        for keyword in self.config.required_screenshot_keywords:
            if keyword.lower() not in combined_names:
                missing_keywords.append(keyword)

        if missing_keywords:
            result.add_issue(ValidationIssue(
                severity=Severity.WARNING,
                category="screenshot_missing",
                message=f"截图可能缺少关键页面（文件名未包含: {'、'.join(missing_keywords)}）",
                contract_id=contract_id,
                signer_name=signer_name,
                evidence_type="page_screenshot",
                details={"missing_keywords": missing_keywords},
            ))

    def _validate_sign_timeline(self, contract: ContractRecord, result: ValidationResult):
        """检查签署时间线的合理性"""
        all_sign_times: List[Tuple[str, datetime]] = []

        for signer_name, signer in contract.signers.items():
            for sign_time in signer.sign_times:
                all_sign_times.append((signer_name, sign_time))

        all_sign_times.sort(key=lambda x: x[1])

        for i in range(len(all_sign_times) - 1):
            signer1, time1 = all_sign_times[i]
            signer2, time2 = all_sign_times[i + 1]
            if time1 > time2:
                result.add_issue(ValidationIssue(
                    severity=Severity.ERROR,
                    category="timeline_order",
                    message=f"签署时间线异常: {signer1}({time1}) 晚于 {signer2}({time2})",
                    contract_id=contract.contract_id,
                ))

    def _validate_resign_count(self, contract: ContractRecord, result: ValidationResult):
        """检查重签次数"""
        if contract.resign_count > self.config.max_resign_count:
            result.add_issue(ValidationIssue(
                severity=Severity.WARNING,
                category="excessive_resigns",
                message=f"合同存在多次重签({contract.resign_count}次)，超过建议阈值({self.config.max_resign_count}次)",
                contract_id=contract.contract_id,
                details={"resign_count": contract.resign_count, "threshold": self.config.max_resign_count},
            ))
        elif contract.resign_count > 0:
            result.add_issue(ValidationIssue(
                severity=Severity.INFO,
                category="resign_detected",
                message=f"合同存在{contract.resign_count}次重签记录",
                contract_id=contract.contract_id,
                details={"resign_count": contract.resign_count},
            ))

    def _validate_timezone_consistency(self, contract: ContractRecord, result: ValidationResult):
        """检查时区一致性"""
        timezones = set()
        timezone_sources: Dict[str, List[str]] = {}

        for signer_name, signer in contract.signers.items():
            for evi_files in signer.files.values():
                for evi_file in evi_files:
                    if evi_file.timezone:
                        timezones.add(evi_file.timezone)
                        if evi_file.timezone not in timezone_sources:
                            timezone_sources[evi_file.timezone] = []
                        timezone_sources[evi_file.timezone].append(
                            f"{signer_name}/{evi_file.file_name}"
                        )

        if len(timezones) > 1:
            result.add_issue(ValidationIssue(
                severity=Severity.WARNING,
                category="timezone_mismatch",
                message=f"时间戳时区不一致: 检测到 {', '.join(timezones)} 多种时区",
                contract_id=contract.contract_id,
                details={"timezones": list(timezones), "sources": timezone_sources},
            ))
        elif timezones:
            tz = list(timezones)[0]
            if tz != self.config.expected_timezone and "UTC" not in tz:
                result.add_issue(ValidationIssue(
                    severity=Severity.INFO,
                    category="timezone_note",
                    message=f"时区为 {tz}（预期 {self.config.expected_timezone}），请确认时间转换正确",
                    contract_id=contract.contract_id,
                    details={"detected_timezone": tz, "expected_timezone": self.config.expected_timezone},
                ))

    def _validate_unclassified(
        self, files: List[EvidenceFile], result: ValidationResult
    ):
        """检查未分类文件"""
        for evi_file in files:
            result.add_issue(ValidationIssue(
                severity=Severity.WARNING,
                category="unclassified_file",
                message=f"无法识别合同编号: {evi_file.file_name}",
                file_name=evi_file.file_name,
                evidence_type=evi_file.evidence_type,
                details={"original_path": evi_file.original_path},
            ))
