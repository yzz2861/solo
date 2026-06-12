from typing import List, Dict, Optional, Tuple
from pathlib import Path

from config import config
from models import ReleaseNote, PackageFile, ParsedVersion, Issue, IssueType, IssueSeverity


class ReleaseNoteParser:
    def __init__(self, release_notes: List[ReleaseNote]):
        self.release_notes = release_notes
        self.all_versions: List[ParsedVersion] = []
        self._collect_all_versions()

    def _collect_all_versions(self) -> None:
        for note in self.release_notes:
            for version in note.versions:
                if version not in self.all_versions:
                    self.all_versions.append(version)
        self.all_versions.sort(reverse=True)

    def find_note_for_version(self, version: ParsedVersion) -> Optional[ReleaseNote]:
        for note in self.release_notes:
            if version in note.versions:
                return note
        for note in self.release_notes:
            for note_version in note.versions:
                if (note_version.major == version.major and
                    note_version.minor == version.minor and
                    note_version.patch == version.patch):
                    return note
        return None

    def check_version_in_notes(self, package: PackageFile) -> PackageFile:
        if not package.version:
            return package

        matching_note = self.find_note_for_version(package.version)
        if not matching_note:
            available_versions = [str(v) for v in self.all_versions[:5]]
            package.issues.append(Issue(
                type=IssueType.MISSING_RELEASE_NOTE,
                severity=IssueSeverity.WARNING,
                message=f"发布说明中未找到版本 {package.version_str}",
                details={
                    "package": package.file_name,
                    "version": package.version_str,
                    "available_versions_in_notes": available_versions
                }
            ))
        return package

    def check_fix_items(self, package: PackageFile) -> PackageFile:
        if not package.version:
            return package

        matching_note = self.find_note_for_version(package.version)
        if not matching_note:
            return package

        if config.is_beta_version(str(package.version)):
            return package

        if not matching_note.has_fix_section:
            package.issues.append(Issue(
                type=IssueType.INCOMPLETE_RELEASE_NOTE,
                severity=IssueSeverity.WARNING,
                message=f"发布说明缺少修复项: {package.version_str} 的说明中没有 bug 修复记录",
                details={
                    "package": package.file_name,
                    "version": package.version_str,
                    "release_note": matching_note.file_name,
                    "suggestion": "请在发布说明中添加 '修复' 或 'bug fix' 章节，说明此版本修复的问题"
                }
            ))
        elif len(matching_note.fix_items) == 0:
            package.issues.append(Issue(
                type=IssueType.INCOMPLETE_RELEASE_NOTE,
                severity=IssueSeverity.INFO,
                message=f"发布说明修复项可能不完整: {package.version_str} 的修复章节为空",
                details={
                    "package": package.file_name,
                    "version": package.version_str,
                    "release_note": matching_note.file_name
                }
            ))

        return package

    def validate_package_release_note(self, package: PackageFile) -> PackageFile:
        package = self.check_version_in_notes(package)
        package = self.check_fix_items(package)
        return package

    def validate_all_packages(self, packages: List[PackageFile]) -> List[PackageFile]:
        return [self.validate_package_release_note(pkg) for pkg in packages]

    def get_missing_versions(self, packages: List[PackageFile]) -> List[Tuple[PackageFile, List[str]]]:
        missing = []
        for pkg in packages:
            if not pkg.version:
                continue
            matching = self.find_note_for_version(pkg.version)
            if not matching:
                available = [str(v) for v in self.all_versions]
                missing.append((pkg, available))
        return missing

    def get_summary(self) -> Dict:
        all_fix_items = []
        for note in self.release_notes:
            all_fix_items.extend(note.fix_items)

        return {
            "total_notes": len(self.release_notes),
            "total_versions": len(self.all_versions),
            "versions": [str(v) for v in self.all_versions],
            "total_fix_items": len(all_fix_items),
            "fix_items": all_fix_items,
            "notes_without_fix": [
                note.file_name for note in self.release_notes
                if not note.has_fix_section
            ]
        }
