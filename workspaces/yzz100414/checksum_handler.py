import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, List, Tuple

from config import config
from models import PackageFile, ChecksumFile, Issue, IssueType, IssueSeverity


class ChecksumHandler:
    def __init__(self, scan_time: datetime):
        self.scan_time = scan_time

    def calculate_checksum(self, file_path: str, algorithm: str = "sha256") -> Optional[str]:
        hash_func = {
            "md5": hashlib.md5,
            "sha1": hashlib.sha1,
            "sha256": hashlib.sha256,
        }.get(algorithm.lower())

        if not hash_func:
            return None

        try:
            h = hash_func()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    h.update(chunk)
            return h.hexdigest()
        except Exception:
            return None

    def is_checksum_expired(self, checksum_file: ChecksumFile, package_file: PackageFile) -> bool:
        if checksum_file.modified_time < package_file.modified_time:
            return True

        age = self.scan_time - checksum_file.modified_time
        return age > timedelta(hours=config.CHECKSUM_EXPIRE_HOURS)

    def find_matching_checksum(
        self,
        package: PackageFile,
        checksum_files: List[ChecksumFile]
    ) -> Tuple[Optional[ChecksumFile], Optional[str]]:
        package_name = package.file_name
        package_base = Path(package_name).stem

        for checksum_file in checksum_files:
            for name, checksum in checksum_file.checksums.items():
                if name == package_name or Path(name).stem == package_base:
                    return checksum_file, checksum

            checksum_base = Path(checksum_file.file_name).stem
            if checksum_base == package_name or checksum_base == package_base:
                if checksum_file.checksums:
                    first_key = list(checksum_file.checksums.keys())[0]
                    return checksum_file, checksum_file.checksums[first_key]

        return None, None

    def validate_package_checksum(
        self,
        package: PackageFile,
        checksum_files: List[ChecksumFile],
        verify_actual: bool = True
    ) -> PackageFile:
        checksum_file, stored_checksum = self.find_matching_checksum(package, checksum_files)

        if not checksum_file or not stored_checksum:
            package.issues.append(Issue(
                type=IssueType.MISSING_CHECKSUM,
                severity=IssueSeverity.BLOCKER,
                message=f"缺少校验和文件: {package.file_name}",
                details={
                    "package": package.file_name,
                    "expected_checksum_file": f"{package.file_name}.sha256"
                }
            ))
            return package

        package.checksum_file = checksum_file.file_path
        package.checksum = stored_checksum

        if self.is_checksum_expired(checksum_file, package):
            checksum_age = self.scan_time - checksum_file.modified_time
            package_newer = checksum_file.modified_time < package.modified_time

            if package_newer:
                message = (f"校验和文件过期：安装包 {package.file_name} 比校验和文件新 "
                          f"(包修改时间: {package.modified_time:%Y-%m-%d %H:%M}, "
                          f"校验和修改时间: {checksum_file.modified_time:%Y-%m-%d %H:%M})")
            else:
                message = (f"校验和文件过期：已超过 {config.CHECKSUM_EXPIRE_HOURS} 小时 "
                          f"(校验和创建于: {checksum_file.modified_time:%Y-%m-%d %H:%M}, "
                          f"已过期 {checksum_age.total_seconds()/3600:.1f} 小时)")

            package.issues.append(Issue(
                type=IssueType.CHECKSUM_EXPIRED,
                severity=IssueSeverity.BLOCKER,
                message=message,
                details={
                    "package": package.file_name,
                    "checksum_file": checksum_file.file_name,
                    "package_modified": package.modified_time.isoformat(),
                    "checksum_modified": checksum_file.modified_time.isoformat(),
                    "age_hours": checksum_age.total_seconds() / 3600,
                    "package_newer": package_newer
                }
            ))

        if verify_actual:
            actual_checksum = self.calculate_checksum(package.file_path, checksum_file.algorithm)
            if actual_checksum and actual_checksum.lower() != stored_checksum.lower():
                package.issues.append(Issue(
                    type=IssueType.INVALID_CHECKSUM,
                    severity=IssueSeverity.BLOCKER,
                    message=f"校验和不匹配: {package.file_name}",
                    details={
                        "package": package.file_name,
                        "algorithm": checksum_file.algorithm,
                        "expected": stored_checksum.lower(),
                        "actual": actual_checksum.lower()
                    }
                ))

        return package

    def validate_all_packages(
        self,
        packages: List[PackageFile],
        checksum_files: List[ChecksumFile],
        verify_actual: bool = True
    ) -> List[PackageFile]:
        return [
            self.validate_package_checksum(pkg, checksum_files, verify_actual)
            for pkg in packages
        ]
