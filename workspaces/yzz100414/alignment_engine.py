from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from datetime import datetime

from config import config
from models import (
    PackageFile, ChecksumFile, ReleaseNote, ScanResult,
    Issue, IssueType, IssueSeverity, ParsedVersion
)
from checksum_handler import ChecksumHandler
from release_note_parser import ReleaseNoteParser


class AlignmentEngine:
    def __init__(self, scan_result: ScanResult, verify_checksums: bool = True):
        self.scan_result = scan_result
        self.verify_checksums = verify_checksums
        self.checksum_handler = ChecksumHandler(scan_result.scan_time)
        self.release_note_parser = ReleaseNoteParser(scan_result.release_notes)
        self.all_issues: List[Issue] = []

    def check_beta_versions(self, packages: List[PackageFile]) -> List[PackageFile]:
        for pkg in packages:
            if not pkg.version:
                continue

            if config.is_beta_version(str(pkg.version)):
                prerelease = pkg.version.prerelease or ""
                pkg.issues.append(Issue(
                    type=IssueType.BETA_VERSION,
                    severity=IssueSeverity.WARNING,
                    message=f"Beta 版本: {pkg.file_name} 是 {prerelease.upper()} 版本，非正式发布版",
                    details={
                        "package": pkg.file_name,
                        "version": pkg.version_str,
                        "prerelease_type": prerelease,
                        "suggestion": "确认是否要发布此测试版本，或要求打包同事提供正式版"
                    },
                    actionable=True
                ))
        return packages

    def check_duplicate_packages(self, packages: List[PackageFile]) -> List[PackageFile]:
        platform_version_groups: Dict[Tuple[str, str], List[PackageFile]] = defaultdict(list)

        for pkg in packages:
            if not pkg.platform or not pkg.version:
                continue
            key = (pkg.platform, str(pkg.version))
            platform_version_groups[key].append(pkg)

        for (platform, version), group in platform_version_groups.items():
            if len(group) > 1:
                file_names = [p.file_name for p in group]
                sizes = [p.file_size for p in group]
                mtimes = [p.modified_time.isoformat() for p in group]

                for pkg in group:
                    pkg.issues.append(Issue(
                        type=IssueType.DUPLICATE_PACKAGE,
                        severity=IssueSeverity.WARNING,
                        message=f"同平台重复包: {platform} {version} 存在 {len(group)} 个安装包",
                        details={
                            "platform": platform,
                            "version": version,
                            "duplicate_files": file_names,
                            "file_sizes": sizes,
                            "modified_times": mtimes,
                            "suggestion": "请确认哪个是正确的发布包，删除重复或过时的文件"
                        },
                        actionable=True
                    ))
        return packages

    def check_version_consistency(self, packages: List[PackageFile]) -> List[PackageFile]:
        all_versions = set()
        for pkg in packages:
            if pkg.version:
                all_versions.add(str(pkg.version))

        if len(all_versions) <= 1:
            return packages

        latest_version = max(
            [pkg.version for pkg in packages if pkg.version],
            default=None
        )

        if latest_version:
            for pkg in packages:
                if pkg.version and pkg.version < latest_version:
                    diff = self._version_diff(pkg.version, latest_version)
                    pkg.issues.append(Issue(
                        type=IssueType.VERSION_MISMATCH,
                        severity=IssueSeverity.INFO,
                        message=f"版本不一致: {pkg.version_str} 不是最新版本 (最新: {latest_version})",
                        details={
                            "package": pkg.file_name,
                            "current_version": pkg.version_str,
                            "latest_version": str(latest_version),
                            "version_difference": diff
                        },
                        actionable=False
                    ))

        return packages

    def _version_diff(self, v1: ParsedVersion, v2: ParsedVersion) -> str:
        if v1.major != v2.major:
            return f"主版本落后 {v2.major - v1.major} 个大版本"
        if v1.minor != v2.minor:
            return f"次版本落后 {v2.minor - v1.minor} 个小版本"
        if v1.patch != v2.patch:
            return f"补丁版本落后 {v2.patch - v1.patch} 个补丁"
        return "版本号相同但预发布标签不同"

    def check_cross_file_alignment(
        self,
        packages: List[PackageFile],
        checksums: List[ChecksumFile],
        release_notes: List[ReleaseNote]
    ) -> List[PackageFile]:
        packages = self.checksum_handler.validate_all_packages(
            packages, checksums, verify_actual=self.verify_checksums
        )
        packages = self.release_note_parser.validate_all_packages(packages)
        return packages

    def collect_all_issues(self, scan_result: ScanResult) -> List[Issue]:
        issues = []
        for pkg in scan_result.packages:
            issues.extend(pkg.issues)
        for cs in scan_result.checksums:
            issues.extend(cs.issues)
        for rn in scan_result.release_notes:
            issues.extend(rn.issues)
        return issues

    def run_alignment_checks(self) -> ScanResult:
        packages = self.scan_result.packages
        checksums = self.scan_result.checksums
        release_notes = self.scan_result.release_notes

        packages = self.check_beta_versions(packages)
        packages = self.check_duplicate_packages(packages)
        packages = self.check_version_consistency(packages)
        packages = self.check_cross_file_alignment(packages, checksums, release_notes)

        self.scan_result.packages = packages
        self.scan_result.all_issues = self.collect_all_issues(self.scan_result)

        return self.scan_result

    def get_statistics(self) -> Dict:
        packages = self.scan_result.packages
        issues = self.scan_result.all_issues

        by_severity = defaultdict(int)
        by_type = defaultdict(int)
        for issue in issues:
            by_severity[issue.severity.value] += 1
            by_type[issue.type.value] += 1

        blocker_packages = [
            pkg for pkg in packages
            if any(i.severity == IssueSeverity.BLOCKER for i in pkg.issues)
        ]
        warning_packages = [
            pkg for pkg in packages
            if any(i.severity == IssueSeverity.WARNING for i in pkg.issues)
            and not any(i.severity == IssueSeverity.BLOCKER for i in pkg.issues)
        ]
        clean_packages = [
            pkg for pkg in packages
            if not pkg.issues
        ]

        platforms = defaultdict(list)
        for pkg in packages:
            if pkg.platform:
                platforms[pkg.platform].append(pkg)

        versions = set()
        for pkg in packages:
            if pkg.version:
                versions.add(str(pkg.version))

        return {
            "total_packages": len(packages),
            "total_checksums": len(self.scan_result.checksums),
            "total_release_notes": len(self.scan_result.release_notes),
            "total_issues": len(issues),
            "issues_by_severity": dict(by_severity),
            "issues_by_type": dict(by_type),
            "blocker_packages": len(blocker_packages),
            "warning_packages": len(warning_packages),
            "clean_packages": len(clean_packages),
            "platforms": {p: [pkg.file_name for pkg in pkgs] for p, pkgs in platforms.items()},
            "versions_found": sorted(list(versions)),
            "can_publish_count": len(clean_packages),
            "needs_review_count": len(warning_packages),
            "must_reject_count": len(blocker_packages),
        }
