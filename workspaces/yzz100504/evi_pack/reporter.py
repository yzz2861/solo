"""交接清单和检查报告生成模块"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .config import Config
from .archiver import ArchiveResult, EvidencePackage
from .scanner import ScanResult
from .validator import Severity, ValidationResult, ValidationIssue


class ReportGenerator:
    """报告生成器"""

    def __init__(self, config: Config):
        self.config = config

    def generate_all(
        self,
        output_directory: str,
        scan_result: ScanResult,
        validation_result: ValidationResult,
        archive_result: Optional[ArchiveResult] = None,
        case_reference: Optional[str] = None,
    ) -> Dict[str, str]:
        """生成所有报告文件"""
        output_directory = os.path.abspath(output_directory)
        os.makedirs(output_directory, exist_ok=True)

        outputs = {}

        report_path = os.path.join(output_directory, self.config.report_filename)
        self._generate_markdown_report(
            report_path, scan_result, validation_result, archive_result, case_reference
        )
        outputs["report"] = report_path

        manifest_path = os.path.join(output_directory, self.config.manifest_filename)
        manifest_csv = manifest_path.replace(".xlsx", ".csv")
        self._generate_manifest_csv(
            manifest_csv, scan_result, archive_result, case_reference
        )
        outputs["manifest"] = manifest_csv

        return outputs

    def _generate_markdown_report(
        self,
        report_path: str,
        scan_result: ScanResult,
        validation_result: ValidationResult,
        archive_result: Optional[ArchiveResult],
        case_reference: Optional[str],
    ):
        """生成 Markdown 格式的证据检查报告"""
        lines = []
        now = datetime.now()

        lines.append("# 电子签名证据检查报告")
        lines.append("")
        lines.append(f"**生成时间**: {now.strftime('%Y年%m月%d日 %H:%M:%S')}")
        lines.append("")
        if case_reference:
            lines.append(f"**案件编号**: {case_reference}")
            lines.append("")
        if archive_result:
            lines.append(f"**归档目录**: {archive_result.output_directory}")
            lines.append("")
        lines.append("---")
        lines.append("")

        lines.append("## 一、总体概览")
        lines.append("")
        lines.append(f"- 扫描目录: `{scan_result.scan_directory}`")
        lines.append(f"- 扫描文件总数: {scan_result.total_files}")
        lines.append(f"- 识别合同数: {len(scan_result.contracts)}")
        lines.append(f"- 未分类文件数: {len(scan_result.unclassified_files)}")
        if archive_result:
            lines.append(f"- 生成证据包数: {archive_result.total_packages}")
            lines.append(f"- 归档文件数: {archive_result.total_files_archived}")
        lines.append("")

        lines.append(f"- 问题总数: **{validation_result.summary.get('total_issues', 0)}**")
        lines.append(f"  - 🔴 严重错误: {validation_result.summary.get('errors', 0)}")
        lines.append(f"  - 🟡 警告: {validation_result.summary.get('warnings', 0)}")
        lines.append(f"  - 🔵 提示: {validation_result.summary.get('infos', 0)}")
        lines.append("")

        lines.append("## 二、合同明细")
        lines.append("")
        for contract_id, contract in sorted(scan_result.contracts.items()):
            lines.append(f"### 合同: `{contract_id}`")
            lines.append("")

            package_id = ""
            if archive_result:
                for pkg in archive_result.packages:
                    if pkg.contract_id == contract_id:
                        package_id = pkg.package_id
                        break
            if package_id:
                lines.append(f"- 证据包编号: **{package_id}**")

            lines.append(f"- 签署人数: {len(contract.signers)}")
            lines.append(f"- 重签次数: {contract.resign_count}")

            contract_issues = [
                i for i in validation_result.issues
                if i.contract_id == contract_id
            ]
            lines.append(f"- 相关问题数: {len(contract_issues)}")
            lines.append("")

            lines.append("| 签署人 | 证据类型 | 文件数 | 签署时间 |")
            lines.append("|--------|----------|--------|----------|")
            for signer_name, signer in sorted(contract.signers.items()):
                first = True
                for evi_type, files in sorted(signer.files.items()):
                    type_desc = self.config.evidence_types.get(evi_type, None)
                    type_name = type_desc.description if type_desc else evi_type
                    sign_times_str = ", ".join(
                        t.strftime("%Y-%m-%d %H:%M")
                        for t in sorted(signer.sign_times)
                    ) or "未识别"
                    if first:
                        lines.append(
                            f"| {signer_name} | {type_name} | {len(files)} | {sign_times_str if first else ''} |"
                        )
                        first = False
                    else:
                        lines.append(f"|  | {type_name} | {len(files)} |  |")
            lines.append("")

        lines.append("## 三、问题详情")
        lines.append("")

        if validation_result.errors:
            lines.append("### 🔴 严重错误")
            lines.append("")
            lines.append("| 类别 | 合同 | 签署人 | 描述 |")
            lines.append("|------|------|--------|------|")
            for issue in validation_result.errors:
                lines.append(
                    f"| {issue.category} | {issue.contract_id or '-'} | "
                    f"{issue.signer_name or '-'} | {issue.message} |"
                )
            lines.append("")

        if validation_result.warnings:
            lines.append("### 🟡 警告")
            lines.append("")
            lines.append("| 类别 | 合同 | 签署人 | 描述 |")
            lines.append("|------|------|--------|------|")
            for issue in validation_result.warnings:
                lines.append(
                    f"| {issue.category} | {issue.contract_id or '-'} | "
                    f"{issue.signer_name or '-'} | {issue.message} |"
                )
            lines.append("")

        if validation_result.infos:
            lines.append("### 🔵 提示信息")
            lines.append("")
            lines.append("| 类别 | 合同 | 签署人 | 描述 |")
            lines.append("|------|------|--------|------|")
            for issue in validation_result.infos:
                lines.append(
                    f"| {issue.category} | {issue.contract_id or '-'} | "
                    f"{issue.signer_name or '-'} | {issue.message} |"
                )
            lines.append("")

        if scan_result.unclassified_files:
            lines.append("## 四、未分类文件清单")
            lines.append("")
            lines.append("| 文件名 | 原始路径 | 识别类型 |")
            lines.append("|--------|----------|----------|")
            for f in scan_result.unclassified_files:
                lines.append(
                    f"| {f.file_name} | `{f.original_path}` | {f.evidence_type or '未识别'} |"
                )
            lines.append("")

        if archive_result:
            lines.append("## 五、证据包索引")
            lines.append("")
            lines.append(f"完整索引文件: `{archive_result.index_path}`")
            lines.append("")
            lines.append("| 证据包编号 | 合同 | 签署人 | 文件数 |")
            lines.append("|------------|------|--------|--------|")
            for pkg in archive_result.packages:
                first = True
                for signer_name, sp in sorted(pkg.signer_packages.items()):
                    if first:
                        lines.append(
                            f"| **{pkg.package_id}** | {pkg.contract_id} | "
                            f"{signer_name} | {len(sp.files)} |"
                        )
                        first = False
                    else:
                        lines.append(f"|  |  | {signer_name} | {len(sp.files)} |")
            lines.append("")

        lines.append("---")
        lines.append("")
        lines.append(f"*报告由电子签名证据包工具 v1.0.0 生成*")

        with open(report_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

    def _generate_manifest_csv(
        self,
        manifest_path: str,
        scan_result: ScanResult,
        archive_result: Optional[ArchiveResult],
        case_reference: Optional[str],
    ):
        """生成 CSV 格式的证据交接清单"""
        import csv

        with open(manifest_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)

            writer.writerow([
                "案件编号(由法务填写)",
                "证据包编号",
                "合同编号",
                "签署人",
                "序号",
                "证据类型",
                "归档文件名",
                "原始文件名",
                "原始路径",
                "文件大小(字节)",
                "签署时间",
                "重签序号",
                "备注",
            ])

            seq = 0
            for contract_id, contract in sorted(scan_result.contracts.items()):
                package_id = ""
                if archive_result:
                    for pkg in archive_result.packages:
                        if pkg.contract_id == contract_id:
                            package_id = pkg.package_id
                            break

                for signer_name, signer in sorted(contract.signers.items()):
                    archived_files = {}
                    if archive_result:
                        for pkg in archive_result.packages:
                            if pkg.package_id == package_id and signer_name in pkg.signer_packages:
                                for af in pkg.signer_packages[signer_name].files:
                                    archived_files[af.get("original_path", "")] = af
                                break

                    for evi_type, files in sorted(signer.files.items()):
                        type_desc = self.config.evidence_types.get(evi_type, None)
                        type_name = type_desc.description if type_desc else evi_type

                        for evi_file in sorted(files, key=lambda x: x.sign_time or x.modified_time):
                            seq += 1
                            archived = archived_files.get(evi_file.original_path, {})

                            writer.writerow([
                                case_reference or "",
                                package_id,
                                contract_id,
                                signer_name,
                                seq,
                                type_name,
                                archived.get("archived_name", ""),
                                evi_file.file_name,
                                evi_file.original_path,
                                evi_file.file_size,
                                evi_file.sign_time.strftime("%Y-%m-%d %H:%M:%S") if evi_file.sign_time else "",
                                evi_file.resign_index,
                                "",
                            ])

            if scan_result.unclassified_files:
                for evi_file in scan_result.unclassified_files:
                    seq += 1
                    type_desc = self.config.evidence_types.get(
                        evi_file.evidence_type, None
                    ) if evi_file.evidence_type else None
                    type_name = type_desc.description if type_desc else (
                        evi_file.evidence_type or "未识别"
                    )
                    writer.writerow([
                        case_reference or "",
                        "",
                        "未分类",
                        "",
                        seq,
                        type_name,
                        "",
                        evi_file.file_name,
                        evi_file.original_path,
                        evi_file.file_size,
                        "",
                        0,
                        "未识别合同编号",
                    ])
