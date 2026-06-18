"""目录扫描与文件识别模块"""

import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from .config import Config, EvidenceTypeConfig


TEXT_READABLE_EXTENSIONS = {
    ".txt", ".csv", ".json", ".log", ".xml", ".html", ".md",
    ".pem", ".cer", ".crt", ".p12", ".pfx",
}

MAX_READ_BYTES = 16 * 1024  # 最多读取 16KB 用于识别


@dataclass
class EvidenceFile:
    """证据文件"""
    original_path: str
    file_name: str
    extension: str
    file_size: int
    modified_time: datetime
    evidence_type: Optional[str] = None
    contract_id: Optional[str] = None
    signer_name: Optional[str] = None
    sign_time: Optional[datetime] = None
    timezone: Optional[str] = None
    resign_index: int = 0

    @property
    def file_type_description(self) -> str:
        return self.evidence_type or "未知类型"


@dataclass
class SignerRecord:
    """签署人记录"""
    name: str
    files: Dict[str, List[EvidenceFile]] = field(default_factory=dict)
    sign_times: List[datetime] = field(default_factory=list)

    def add_file(self, evi_type: str, evi_file: EvidenceFile):
        if evi_type not in self.files:
            self.files[evi_type] = []
        self.files[evi_type].append(evi_file)
        if evi_file.sign_time and evi_file.sign_time not in self.sign_times:
            self.sign_times.append(evi_file.sign_time)
            self.sign_times.sort()


@dataclass
class ContractRecord:
    """合同记录"""
    contract_id: str
    signers: Dict[str, SignerRecord] = field(default_factory=dict)
    resign_count: int = 0

    def get_or_create_signer(self, name: str) -> SignerRecord:
        if name not in self.signers:
            self.signers[name] = SignerRecord(name=name)
        return self.signers[name]

    @property
    def all_files(self) -> List[EvidenceFile]:
        files = []
        for signer in self.signers.values():
            for evi_files in signer.files.values():
                files.extend(evi_files)
        return files


@dataclass
class ScanResult:
    """扫描结果"""
    contracts: Dict[str, ContractRecord] = field(default_factory=dict)
    unclassified_files: List[EvidenceFile] = field(default_factory=list)
    total_files: int = 0
    scan_directory: str = ""

    def get_or_create_contract(self, contract_id: str) -> ContractRecord:
        if contract_id not in self.contracts:
            self.contracts[contract_id] = ContractRecord(contract_id=contract_id)
        return self.contracts[contract_id]


class DirectoryScanner:
    """目录扫描器"""

    def __init__(self, config: Config):
        self.config = config
        self._file_type_cache: Dict[Tuple[str, str], Optional[str]] = {}

    def scan(self, directory: str, exclude_dirs: Optional[Set[str]] = None) -> ScanResult:
        """扫描指定目录

        Args:
            directory: 要扫描的目录路径
            exclude_dirs: 需要排除的目录绝对路径集合（用于跳过输出目录等）
        """
        directory = os.path.abspath(directory)
        if not os.path.isdir(directory):
            raise ValueError(f"目录不存在: {directory}")

        if exclude_dirs is None:
            exclude_dirs = set()
        else:
            exclude_dirs = {os.path.abspath(d) for d in exclude_dirs}

        result = ScanResult(scan_directory=directory)

        for root, dirs, files in os.walk(directory):
            root_abs = os.path.abspath(root)
            dirs[:] = [
                d for d in dirs
                if not d.startswith(".")
                and os.path.abspath(os.path.join(root_abs, d)) not in exclude_dirs
            ]

            for filename in files:
                if filename.startswith("."):
                    continue
                filepath = os.path.join(root, filename)
                evi_file = self._process_file(filepath)
                result.total_files += 1
                self._classify_file(evi_file, result)

        self._detect_resigns(result)
        return result

    def _process_file(self, filepath: str) -> EvidenceFile:
        """处理单个文件，提取元数据

        识别优先级：
        1. 文件名 / 路径
        2. 文件内容（文本类、证书类、PDF 文本等）
        """
        path = Path(filepath)
        stat = path.stat()

        ext = path.suffix.lower()
        filename_no_ext = path.stem

        evi_file = EvidenceFile(
            original_path=filepath,
            file_name=path.name,
            extension=ext,
            file_size=stat.st_size,
            modified_time=datetime.fromtimestamp(stat.st_mtime),
        )

        evi_file.evidence_type = self._detect_evidence_type(filename_no_ext, ext)
        evi_file.contract_id = self._extract_contract_id(filename_no_ext, filepath)
        evi_file.signer_name = self._extract_signer_name(filename_no_ext, filepath)
        evi_file.sign_time, evi_file.timezone = self._extract_sign_time(filename_no_ext, filepath)

        if not evi_file.contract_id or not evi_file.signer_name:
            self._enrich_from_content(evi_file)

        return evi_file

    def _detect_evidence_type(self, filename: str, extension: str) -> Optional[str]:
        """检测证据类型"""
        cache_key = (filename.lower(), extension)
        if cache_key in self._file_type_cache:
            return self._file_type_cache[cache_key]

        filename_lower = filename.lower()
        detected_type = None

        for type_name, type_cfg in self.config.evidence_types.items():
            if extension not in type_cfg.extensions:
                continue
            for keyword in type_cfg.keywords:
                if keyword.lower() in filename_lower:
                    detected_type = type_name
                    break
            if detected_type:
                break

        if not detected_type and extension == ".pdf":
            detected_type = "contract_pdf"
        elif not detected_type and extension in [".png", ".jpg", ".jpeg", ".webp"]:
            detected_type = "page_screenshot"

        self._file_type_cache[cache_key] = detected_type
        return detected_type

    def _extract_contract_id(self, filename: str, filepath: str) -> Optional[str]:
        """从文件名或路径中提取合同编号"""
        search_text = f"{filename} {filepath}"
        for pattern in self.config.contract_id_patterns:
            match = pattern.search(search_text)
            if match:
                return match.group(0)

        path_parts = Path(filepath).parts
        for part in path_parts:
            for pattern in self.config.contract_id_patterns:
                match = pattern.search(part)
                if match:
                    return match.group(0)

        return None

    def _extract_signer_name(self, filename: str, filepath: str) -> Optional[str]:
        """从文件名或路径中提取签署人姓名"""
        search_text = f"{filename} {filepath}"
        for pattern in self.config.signer_name_patterns:
            match = pattern.search(search_text)
            if match and match.groups():
                return match.group(1).strip()

        chinese_name_pattern = re.compile(r"[_\-/]([\u4e00-\u9fa5]{2,4})[_\-/]")
        for match in chinese_name_pattern.finditer(search_text):
            name = match.group(1)
            skip_keywords = ["合同", "签署", "日志", "短信", "验证", "证书", "截图",
                             "附件", "记录", "用户", "页面", "完成", "成功"]
            if not any(kw in name for kw in skip_keywords):
                return name

        path_parts = Path(filepath).parts
        for part in path_parts:
            for pattern in self.config.signer_name_patterns:
                match = pattern.search(part)
                if match and match.groups():
                    return match.group(1).strip()

        return None

    def _extract_sign_time(
        self, filename: str, filepath: str
    ) -> Tuple[Optional[datetime], Optional[str]]:
        """从文件名或路径中提取签署时间和时区"""
        search_text = f"{filename} {filepath}"

        for pattern in self.config.sign_time_patterns:
            match = pattern.search(search_text)
            if match:
                time_str = match.group(1)
                parsed_time, tz = self._parse_datetime_with_tz(time_str)
                if parsed_time:
                    return parsed_time, tz

        return None, None

    def _parse_datetime_with_tz(self, time_str: str) -> Tuple[Optional[datetime], Optional[str]]:
        """解析日期时间字符串，尝试识别时区"""
        time_str_clean = time_str.replace("_", "-").replace("T", " ").strip()

        tz = None
        for allowed_tz in self.config.allowed_timezones:
            if allowed_tz.lower() in time_str.lower():
                tz = allowed_tz
                time_str_clean = time_str_clean.lower().replace(allowed_tz.lower(), "").strip()

        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d %H:%M",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(time_str_clean, fmt), tz
            except ValueError:
                continue

        return None, tz

    def _classify_file(self, evi_file: EvidenceFile, result: ScanResult):
        """将文件分类到对应的合同和签署人"""
        if evi_file.contract_id:
            contract = result.get_or_create_contract(evi_file.contract_id)
            signer_name = evi_file.signer_name or "未识别签署人"
            signer = contract.get_or_create_signer(signer_name)
            if evi_file.evidence_type:
                signer.add_file(evi_file.evidence_type, evi_file)
            else:
                signer.add_file("unknown", evi_file)
        else:
            result.unclassified_files.append(evi_file)

    def _detect_resigns(self, result: ScanResult):
        """检测同一合同的多次重签"""
        for contract in result.contracts.values():
            all_sign_times = set()
            for signer in contract.signers.values():
                all_sign_times.update(signer.sign_times)

            sorted_times = sorted(all_sign_times)
            contract.resign_count = max(0, len(sorted_times) - 1)

            for signer in contract.signers.values():
                for evi_type, files in signer.files.items():
                    sorted_files = sorted(files, key=lambda f: f.sign_time or f.modified_time)
                    for idx, f in enumerate(sorted_files):
                        f.resign_index = idx

    def _enrich_from_content(self, evi_file: EvidenceFile):
        """从文件内容中补充识别缺失的元数据（合同号、签署人、签署时间）

        仅在文件名/路径识别失败时调用，避免不必要的文件读取。
        """
        content = self._read_text_content(evi_file.original_path, evi_file.extension)
        if not content:
            return

        if not evi_file.contract_id:
            for pattern in self.config.contract_id_patterns:
                match = pattern.search(content)
                if match:
                    evi_file.contract_id = match.group(0)
                    break

        if not evi_file.signer_name:
            for pattern in self.config.signer_name_patterns:
                match = pattern.search(content)
                if match and match.groups():
                    evi_file.signer_name = match.group(1).strip()
                    break

            if not evi_file.signer_name:
                label_patterns = [
                    r"签署人[：:]\s*([\u4e00-\u9fa5]{2,10})",
                    r"甲方[：:]\s*([\u4e00-\u9fa5]{2,10})",
                    r"乙方[：:]\s*([\u4e00-\u9fa5]{2,10})",
                    r"签约方[：:]\s*([\u4e00-\u9fa5]{2,10})",
                    r"CN\s*[=:]\s*([a-zA-Z\u4e00-\u9fa5 ]{2,40})",
                    r"Subject.*?CN\s*[=:]\s*([a-zA-Z\u4e00-\u9fa5 ._-]{2,80})",
                ]
                for pat in label_patterns:
                    match = re.search(pat, content, re.IGNORECASE)
                    if match and match.groups():
                        name = match.group(1).strip()
                        if 2 <= len(name) <= 20:
                            evi_file.signer_name = name
                            break

        if not evi_file.sign_time:
            for pattern in self.config.sign_time_patterns:
                match = pattern.search(content)
                if match:
                    time_str = match.group(1)
                    parsed_time, tz = self._parse_datetime_with_tz(time_str)
                    if parsed_time:
                        evi_file.sign_time = parsed_time
                        if tz:
                            evi_file.timezone = tz
                        break

            if not evi_file.sign_time:
                extra_time_patterns = [
                    r"签署时间[：:]\s*([0-9]{4}[-_/年][0-9]{1,2}[-_/月][0-9]{1,2}[ 日]*[0-9]{1,2}[：:][0-9]{2}([：:][0-9]{2})?)",
                    r"签约时间[：:]\s*([0-9]{4}[-_/年][0-9]{1,2}[-_/月][0-9]{1,2})",
                    r"有效期[从起][始]*[：:]\s*([0-9]{4}[-_/][0-9]{1,2}[-_/][0-9]{1,2})",
                ]
                for pat in extra_time_patterns:
                    match = re.search(pat, content)
                    if match:
                        time_str = match.group(1)
                        time_clean = (
                            time_str.replace("年", "-")
                            .replace("月", "-")
                            .replace("日", "")
                            .replace("_", "-")
                        )
                        try:
                            if " " in time_clean or ":" in time_clean:
                                evi_file.sign_time = datetime.strptime(time_clean, "%Y-%m-%d %H:%M:%S")
                            else:
                                evi_file.sign_time = datetime.strptime(time_clean, "%Y-%m-%d")
                            break
                        except ValueError:
                            continue

    def _read_text_content(self, filepath: str, extension: str) -> Optional[str]:
        """读取文件的文本内容用于识别

        - 纯文本类：直接读取前 MAX_READ_BYTES
        - PEM/证书类：读取并解析文本
        - PDF/图片等二进制：返回 None（避免误读）
        """
        ext = extension.lower()

        if ext in TEXT_READABLE_EXTENSIONS:
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read(MAX_READ_BYTES)
            except (OSError, IOError, UnicodeDecodeError):
                pass

        if ext in (".csv", ".tsv"):
            try:
                with open(filepath, "r", encoding="utf-8-sig", errors="ignore") as f:
                    return f.read(MAX_READ_BYTES)
            except (OSError, IOError):
                pass

        if ext == ".pdf":
            try:
                return self._read_pdf_text(filepath)
            except Exception:
                return None

        return None

    def _read_pdf_text(self, filepath: str) -> Optional[str]:
        """尝试读取 PDF 文本内容（轻量实现）

        使用基础的字符串提取方式，不依赖外部库；
        若环境中有 PyPDF2/pdfplumber 可后续扩展。
        """
        try:
            with open(filepath, "rb") as f:
                raw = f.read(MAX_READ_BYTES * 8)

            text_parts = []
            for match in re.finditer(rb"\(([^)]{2,80})\)", raw):
                try:
                    text_parts.append(match.group(1).decode("utf-8", errors="ignore"))
                except UnicodeDecodeError:
                    continue

            if text_parts:
                return "\n".join(text_parts)
            return None
        except (OSError, IOError):
            return None
