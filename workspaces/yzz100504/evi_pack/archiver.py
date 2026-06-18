"""归档目录生成和证据包编号模块"""

import json
import os
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .config import Config
from .scanner import ContractRecord, EvidenceFile, ScanResult, SignerRecord


EVIDENCE_TYPE_TO_DIR = {
    "contract_pdf": "01_合同原件",
    "sign_log": "02_签署日志",
    "sms_verify": "03_短信验证",
    "cert_chain": "04_证书链",
    "page_screenshot": "05_页面截图",
    "attachment": "06_合同附件",
    "unknown": "07_其他文件",
}


@dataclass
class EvidencePackage:
    """证据包"""
    package_id: str
    contract_id: str
    package_path: str
    created_at: datetime
    signer_packages: Dict[str, "SignerPackage"] = field(default_factory=dict)
    original_file_count: int = 0

    def to_dict(self) -> Dict:
        return {
            "package_id": self.package_id,
            "contract_id": self.contract_id,
            "package_path": self.package_path,
            "created_at": self.created_at.isoformat(),
            "signer_packages": {
                name: sp.to_dict() for name, sp in self.signer_packages.items()
            },
            "original_file_count": self.original_file_count,
        }


@dataclass
class SignerPackage:
    """签署人证据包"""
    signer_name: str
    files: List[Dict] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "signer_name": self.signer_name,
            "files": self.files,
        }


@dataclass
class ArchiveResult:
    """归档结果"""
    output_directory: str
    packages: List[EvidencePackage] = field(default_factory=list)
    index_path: Optional[str] = None
    total_packages: int = 0
    total_files_archived: int = 0

    def to_dict(self) -> Dict:
        return {
            "output_directory": self.output_directory,
            "packages": [p.to_dict() for p in self.packages],
            "index_path": self.index_path,
            "total_packages": self.total_packages,
            "total_files_archived": self.total_files_archived,
            "created_at": datetime.now().isoformat(),
        }


class PackageArchiver:
    """证据包归档器

    幂等性保证：
    - 重复执行时，先读取已有索引文件，复用原证据包编号
    - 已归档的原始文件不再重复归档
    - 新增文件追加到对应证据包中，不影响原编号和时间线
    """

    def __init__(self, config: Config):
        self.config = config
        self._sequence_counters: Dict[str, int] = {}
        self._existing_packages: Dict[str, Dict] = {}
        self._existing_original_paths: Dict[str, str] = {}  # original_path -> archived_path

    def generate_package_id(self, contract_id: str) -> str:
        """生成证据包编号"""
        today_str = datetime.now().strftime(self.config.id_date_format)
        prefix = self.config.id_prefix

        counter_key = f"{today_str}_{contract_id}"
        if counter_key not in self._sequence_counters:
            self._sequence_counters[counter_key] = 0
        self._sequence_counters[counter_key] += 1

        seq = self._sequence_counters[counter_key]
        return f"{prefix}{today_str}-{contract_id}-{seq:03d}"

    def archive(
        self,
        scan_result: ScanResult,
        output_directory: str,
        copy_files: bool = True,
    ) -> ArchiveResult:
        """执行归档

        幂等归档：若输出目录已有索引，则复用证据包编号和已归档文件。
        """
        output_directory = os.path.abspath(output_directory)
        os.makedirs(output_directory, exist_ok=True)

        index_path = os.path.join(output_directory, self.config.index_filename)
        self._load_existing_index(index_path)

        result = ArchiveResult(output_directory=output_directory)

        for contract in scan_result.contracts.values():
            package = self._archive_contract(
                contract, output_directory, copy_files
            )
            result.packages.append(package)
            result.total_packages += 1
            result.total_files_archived += package.original_file_count

        if scan_result.unclassified_files:
            self._archive_unclassified(
                scan_result.unclassified_files, output_directory, copy_files, result
            )

        self._write_index(result, index_path)
        result.index_path = index_path

        return result

    def _load_existing_index(self, index_path: str):
        """加载已有索引，用于幂等归档

        读取之前生成的索引文件，记录：
        - 每个 contract_id 对应的 package_id
        - 每个原始文件路径对应的归档路径（避免重复归档）
        """
        if not os.path.exists(index_path):
            return

        try:
            with open(index_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            packages = data.get("packages", [])
            for pkg in packages:
                contract_id = pkg.get("contract_id")
                package_id = pkg.get("package_id")
                if contract_id and package_id:
                    self._existing_packages[contract_id] = pkg

                signer_packages = pkg.get("signer_packages", {})
                for sp in signer_packages.values():
                    for file_info in sp.get("files", []):
                        original_path = file_info.get("original_path")
                        archived_path = file_info.get("archived_path")
                        if original_path and archived_path:
                            self._existing_original_paths[original_path] = archived_path
        except (json.JSONDecodeError, OSError, IOError):
            pass

    def _archive_contract(
        self,
        contract: ContractRecord,
        output_directory: str,
        copy_files: bool,
    ) -> EvidencePackage:
        """归档单个合同

        若合同已有归档记录，则复用原证据包编号，仅追加新文件。
        """
        existing = self._existing_packages.get(contract.contract_id)
        if existing and existing.get("package_id"):
            package_id = existing["package_id"]
            package_dir = os.path.join(output_directory, package_id)
            created_at = datetime.fromisoformat(existing["created_at"]) if existing.get("created_at") else datetime.now()
        else:
            package_id = self.generate_package_id(contract.contract_id)
            package_dir = os.path.join(output_directory, package_id)
            created_at = datetime.now()

        os.makedirs(package_dir, exist_ok=True)

        package = EvidencePackage(
            package_id=package_id,
            contract_id=contract.contract_id,
            package_path=package_dir,
            created_at=created_at,
        )

        for signer_name, signer in contract.signers.items():
            signer_pkg = self._archive_signer(
                signer, package_dir, copy_files, package_id
            )
            package.signer_packages[signer_name] = signer_pkg
            package.original_file_count += len(signer_pkg.files)

        return package

    def _archive_signer(
        self,
        signer: SignerRecord,
        package_dir: str,
        copy_files: bool,
        package_id: str,
    ) -> SignerPackage:
        """归档单个签署人的证据"""
        signer_pkg = SignerPackage(signer_name=signer.name)

        safe_signer_name = self._sanitize_filename(signer.name)

        for evi_type, files in signer.files.items():
            dir_name = EVIDENCE_TYPE_TO_DIR.get(evi_type, f"07_{evi_type}")
            target_dir = os.path.join(package_dir, safe_signer_name, dir_name)
            os.makedirs(target_dir, exist_ok=True)

            for evi_file in files:
                archived = self._archive_file(
                    evi_file, target_dir, copy_files, package_id, signer.name, evi_type
                )
                if archived:
                    signer_pkg.files.append(archived)

        return signer_pkg

    def _archive_file(
        self,
        evi_file: EvidenceFile,
        target_dir: str,
        copy_files: bool,
        package_id: str,
        signer_name: str,
        evidence_type: str,
    ) -> Optional[Dict]:
        """归档单个文件（不修改原件，使用复制或软链接）

        幂等性：若原始文件路径已在索引中存在，则直接返回已有归档信息，
        不重复创建文件，保证补证时时间线稳定。
        """
        src_path = evi_file.original_path
        if not os.path.exists(src_path):
            return None

        if src_path in self._existing_original_paths:
            archived_path = self._existing_original_paths[src_path]
            return {
                "original_path": src_path,
                "original_name": evi_file.file_name,
                "archived_path": archived_path,
                "archived_name": os.path.basename(archived_path),
                "file_size": evi_file.file_size,
                "sign_time": evi_file.sign_time.isoformat() if evi_file.sign_time else None,
                "resign_index": evi_file.resign_index,
            }

        new_filename = self._generate_archive_filename(
            evi_file, package_id, signer_name, evidence_type
        )
        dst_path = os.path.join(target_dir, new_filename)

        if os.path.exists(dst_path):
            base, ext = os.path.splitext(new_filename)
            counter = 1
            while os.path.exists(dst_path):
                new_filename = f"{base}_{counter}{ext}"
                dst_path = os.path.join(target_dir, new_filename)
                counter += 1

        try:
            if copy_files:
                shutil.copy2(src_path, dst_path)
            else:
                os.symlink(os.path.abspath(src_path), dst_path)
        except (OSError, shutil.Error) as e:
            return None

        self._existing_original_paths[src_path] = dst_path

        return {
            "original_path": evi_file.original_path,
            "original_name": evi_file.file_name,
            "archived_path": dst_path,
            "archived_name": new_filename,
            "file_size": evi_file.file_size,
            "sign_time": evi_file.sign_time.isoformat() if evi_file.sign_time else None,
            "resign_index": evi_file.resign_index,
        }

    def _generate_archive_filename(
        self,
        evi_file: EvidenceFile,
        package_id: str,
        signer_name: str,
        evidence_type: str,
    ) -> str:
        """生成归档后的文件名，命名规范友好"""
        safe_signer = self._sanitize_filename(signer_name)
        ext = evi_file.extension

        parts = [package_id, safe_signer]

        type_suffix_map = {
            "contract_pdf": "合同",
            "sign_log": "签署日志",
            "sms_verify": "短信验证",
            "cert_chain": "证书链",
            "page_screenshot": "截图",
            "attachment": "附件",
        }
        type_suffix = type_suffix_map.get(evidence_type, evidence_type)
        parts.append(type_suffix)

        if evi_file.resign_index > 0:
            parts.append(f"重签{evi_file.resign_index}")

        if evi_file.sign_time:
            parts.append(evi_file.sign_time.strftime("%Y%m%d%H%M%S"))

        filename = "_".join(parts) + ext
        return self._sanitize_filename(filename)

    def _sanitize_filename(self, filename: str) -> str:
        """清理文件名，移除非法字符"""
        invalid_chars = '<>:"/\\|?*'
        for ch in invalid_chars:
            filename = filename.replace(ch, "_")
        filename = filename.replace(" ", "_")
        return filename.strip("._")

    def _archive_unclassified(
        self,
        files: List[EvidenceFile],
        output_directory: str,
        copy_files: bool,
        result: ArchiveResult,
    ):
        """归档未分类文件（幂等）"""
        unclassified_dir = os.path.join(output_directory, "_未分类")
        os.makedirs(unclassified_dir, exist_ok=True)

        for evi_file in files:
            src_path = evi_file.original_path
            if not os.path.exists(src_path):
                continue

            if src_path in self._existing_original_paths:
                result.total_files_archived += 1
                continue

            dst_path = os.path.join(unclassified_dir, evi_file.file_name)
            if os.path.exists(dst_path):
                self._existing_original_paths[src_path] = dst_path
                result.total_files_archived += 1
                continue

            try:
                if copy_files:
                    shutil.copy2(src_path, dst_path)
                else:
                    os.symlink(os.path.abspath(src_path), dst_path)
                self._existing_original_paths[src_path] = dst_path
                result.total_files_archived += 1
            except (OSError, shutil.Error):
                continue

    def _write_index(self, result: ArchiveResult, index_path: str):
        """写入证据包索引文件"""
        index_data = result.to_dict()
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)
