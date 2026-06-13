import os
import re
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

    def _is_valid_release_note_content(self, content: str) -> bool:
        if not content or not content.strip():
            return False

        stripped = content.lstrip()
        if stripped.startswith('{') or stripped.startswith('['):
            return False

        if stripped.startswith('<?xml') or stripped.startswith('<'):
            return False

        lines = [l.strip() for l in content.split('\n') if l.strip()]
        if not lines:
            return False

        has_md_heading = any(l.startswith('#') for l in lines[:10])
        has_version_pattern = any(
            config.VERSION_PATTERN.search(l) for l in lines[:20]
        )

        return has_md_heading or has_version_pattern

    def _is_fix_section_heading(self, text: str) -> bool:
        text_lower = text.lower()
        for kw in config.FIX_SECTION_KEYWORDS:
            if kw.lower() in text_lower:
                return True
        return False

    def _is_list_item(self, line: str) -> bool:
        stripped = line.strip()
        if stripped.startswith(('- ', '* ', '• ')):
            return True
        if re.match(r'^\d+\.\s', stripped):
            return True
        return False

    def parse_release_note(self, filepath: Path) -> ReleaseNote:
        stat = filepath.stat()
        filename = filepath.name

        versions = []
        fix_items = []
        has_fix_section = False

        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            if not self._is_valid_release_note_content(content):
                return ReleaseNote(
                    file_path=str(filepath),
                    file_name=filename,
                    modified_time=datetime.fromtimestamp(stat.st_mtime),
                    versions=[],
                    fix_items=[],
                    has_fix_section=False
                )

            lines = content.split('\n')
            in_fix_section = False
            current_section_level = 99

            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue

                is_heading = False
                heading_level = 99
                heading_text = stripped

                if stripped.startswith('#'):
                    is_heading = True
                    heading_level = len(stripped) - len(stripped.lstrip('#'))
                    heading_text = stripped.lstrip('#').strip()
                elif re.match(r'^[=\-~]+$', stripped) and len(stripped) >= 3:
                    is_heading = True
                    heading_level = 1
                    continue

                if is_heading:
                    version_in_heading = self.parse_version(heading_text)
                    if version_in_heading and version_in_heading not in versions:
                        versions.append(version_in_heading)

                    if self._is_fix_section_heading(heading_text):
                        has_fix_section = True
                        in_fix_section = True
                        current_section_level = heading_level
                    else:
                        if heading_level <= current_section_level and in_fix_section:
                            in_fix_section = False

                if in_fix_section and self._is_list_item(line):
                    item_text = re.sub(r'^[\-\*\d\.\•]+\s*', '', stripped).strip()
                    if item_text and item_text not in fix_items:
                        fix_items.append(item_text)

            if not versions:
                for line in lines[:30]:
                    stripped = line.strip()
                    if not stripped:
                        continue
                    version = self.parse_version(stripped)
                    if version and version not in versions:
                        versions.append(version)

            if has_fix_section and not fix_items:
                for line in lines:
                    stripped = line.strip()
                    if not stripped:
                        continue
                    stripped_lower = stripped.lower()
                    if any(kw.lower() in stripped_lower for kw in config.FIX_KEYWORDS):
                        if stripped not in fix_items:
                            fix_items.append(stripped)

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
