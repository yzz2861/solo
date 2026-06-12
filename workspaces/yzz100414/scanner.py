import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

from config import config
from models import PackageFile, ChecksumFile, ReleaseNote, ParsedVersion, ScanResult, Issue, IssueType, IssueSeverity


class VersionScanner:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir).resolve()
        self.all_files: List[Path] = []

    def parse_version(self, version_str: str) -> Optional[ParsedVersion]:
        if not version_str:
            return None
        match = config.VERSION_PATTERN.search(version_str)
        if not match:
            return None

        major, minor, patch = map(int, match.group(1).split('.'))
        prerelease = match.group(2)
        prerelease_num = int(match.group(3)) if match.group(3) else None
        build_num = int(match.group(5)) if match.group(5) else None

        return ParsedVersion(
            major=major,
            minor=minor,
            patch=patch,
            prerelease=prerelease,
            prerelease_num=prerelease_num,
            build_num=build_num,
            raw=match.group(0)
        )

    def extract_version_from_filename(self, filename: str) -> Tuple[Optional[ParsedVersion], str]:
        version_str = filename
        match = config.VERSION_PATTERN.search(filename)
        if match:
            version = self.parse_version(match.group(0))
            return version, match.group(0)
        return None, ""

    def scan_directory(self) -> List[Path]:
        files = []
        for root, dirs, filenames in os.walk(self.root_dir):
            depth = len(Path(root).relative_to(self.root_dir).parts)
            if depth > config.DIRECTORY_SCAN_DEPTH:
                continue

            for filename in filenames:
                filepath = Path(root) / filename
                files.append(filepath)

        self.all_files = files
        return files

    def categorize_files(self) -> Tuple[List[Path], List[Path], List[Path]]:
        if not self.all_files:
            self.scan_directory()

        package_files = []
        checksum_files = []
        release_note_files = []

        for filepath in self.all_files:
            filename = filepath.name

            if config.is_checksum_file(filename):
                checksum_files.append(filepath)
            elif config.is_release_note(filename):
                release_note_files.append(filepath)
            elif config.is_package_file(filename):
                package_files.append(filepath)

        return package_files, checksum_files, release_note_files

    def parse_package_file(self, filepath: Path) -> PackageFile:
        stat = filepath.stat()
        filename = filepath.name

        platform_config = config.detect_platform(filename)
        platform = platform_config.name if platform_config else None

        version, version_str = self.extract_version_from_filename(filename)

        package = PackageFile(
            file_path=str(filepath),
            file_name=filename,
            file_size=stat.st_size,
            modified_time=datetime.fromtimestamp(stat.st_mtime),
            platform=platform,
            version=version,
            version_str=version_str
        )

        if not platform:
            package.issues.append(Issue(
                type=IssueType.UNKNOWN_PLATFORM,
                severity=IssueSeverity.WARNING,
                message=f"无法识别平台: {filename}",
                details={"filename": filename}
            ))

        if not version:
            package.issues.append(Issue(
                type=IssueType.VERSION_MISMATCH,
                severity=IssueSeverity.BLOCKER,
                message=f"无法提取版本号: {filename}",
                details={"filename": filename}
            ))

        return package

    def parse_checksum_file(self, filepath: Path) -> ChecksumFile:
        stat = filepath.stat()
        filename = filepath.name

        algorithm = "sha256"
        if filename.endswith(".md5"):
            algorithm = "md5"
        elif filename.endswith(".sha1"):
            algorithm = "sha1"

        checksums = {}
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    parts = line.split(None, 1)
                    if len(parts) >= 2:
                        checksum = parts[0].strip()
                        name = parts[1].strip().lstrip('*').strip()
                        checksums[name] = checksum
        except Exception as e:
            pass

        return ChecksumFile(
            file_path=str(filepath),
            file_name=filename,
            modified_time=datetime.fromtimestamp(stat.st_mtime),
            algorithm=algorithm,
            checksums=checksums
        )

    def parse_release_note(self, filepath: Path) -> ReleaseNote:
        stat = filepath.stat()
        filename = filepath.name

        versions = []
        fix_items = []
        has_fix_section = False

        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            for line in content.split('\n'):
                line = line.strip()
                if not line:
                    continue

                version = self.parse_version(line)
                if version and version not in versions:
                    versions.append(version)

                line_lower = line.lower()
                for keyword in config.FIX_KEYWORDS:
                    if keyword.lower() in line_lower:
                        if line not in fix_items:
                            fix_items.append(line)
                        has_fix_section = True
                        break

        except Exception as e:
            pass

        versions.sort(reverse=True)

        return ReleaseNote(
            file_path=str(filepath),
            file_name=filename,
            modified_time=datetime.fromtimestamp(stat.st_mtime),
            versions=versions,
            fix_items=fix_items,
            has_fix_section=has_fix_section
        )

    def scan(self) -> ScanResult:
        self.scan_directory()
        package_paths, checksum_paths, release_note_paths = self.categorize_files()

        packages = [self.parse_package_file(p) for p in package_paths]
        checksums = [self.parse_checksum_file(c) for c in checksum_paths]
        release_notes = [self.parse_release_note(r) for r in release_note_paths]

        return ScanResult(
            scan_time=datetime.now(),
            packages=packages,
            checksums=checksums,
            release_notes=release_notes
        )
