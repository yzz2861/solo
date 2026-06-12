import re
from dataclasses import dataclass, field
from typing import List, Pattern, Dict, Optional


@dataclass
class PlatformConfig:
    name: str
    aliases: List[str]
    package_extensions: List[str]
    checksum_extensions: List[str] = field(default_factory=lambda: [".sha256", ".md5", ".sha1"])


@dataclass
class Config:
    PLATFORMS: List[PlatformConfig] = field(default_factory=lambda: [
        PlatformConfig(
            name="windows",
            aliases=["win", "windows", "x64", "x86_64", "amd64"],
            package_extensions=[".exe", ".msi", ".zip"]
        ),
        PlatformConfig(
            name="macos",
            aliases=["mac", "macos", "osx", "darwin", "arm64", "x64"],
            package_extensions=[".dmg", ".pkg", ".zip", ".tar.gz"]
        ),
        PlatformConfig(
            name="linux",
            aliases=["linux", "ubuntu", "centos", "x86_64", "amd64", "arm64"],
            package_extensions=[".deb", ".rpm", ".AppImage", ".tar.gz", ".zip"]
        ),
        PlatformConfig(
            name="android",
            aliases=["android", "apk", "arm64-v8a", "armeabi-v7a"],
            package_extensions=[".apk", ".aab"]
        ),
        PlatformConfig(
            name="ios",
            aliases=["ios", "iphone", "ipad"],
            package_extensions=[".ipa"]
        ),
    ])

    VERSION_PATTERN: Pattern = re.compile(
        r'v?(\d+\.\d+\.\d+)'
        r'(?:[-_]?(alpha|beta|rc|pre|release|stable|hotfix))?'
        r'(?:[-_]?(\d+))?'
        r'(?:[-_]?(build|b)?(\d+))?',
        re.IGNORECASE
    )

    BETA_TAGS: List[str] = field(default_factory=lambda: ["alpha", "beta", "rc", "pre", "hotfix"])

    RELEASE_NOTE_PATTERNS: List[Pattern] = field(default_factory=lambda: [
        re.compile(r'RELEASE_NOTE[S]?', re.IGNORECASE),
        re.compile(r'README', re.IGNORECASE),
        re.compile(r'CHANGELOG', re.IGNORECASE),
        re.compile(r'VERSION', re.IGNORECASE),
    ])

    RELEASE_NOTE_EXTENSIONS: List[str] = field(default_factory=lambda: [".md", ".txt", ".rst", ".adoc"])

    FIX_KEYWORDS: List[str] = field(default_factory=lambda: [
        "fix", "修复", "bug", "问题", "解决", "resolved", "closed",
        "patch", "修补", "修正", "更正"
    ])

    CHECKSUM_EXPIRE_HOURS: int = 24

    DIRECTORY_SCAN_DEPTH: int = 5

    HISTORY_FILE: str = ".version_align_history.json"

    def get_platform_by_name(self, name: str) -> Optional[PlatformConfig]:
        name_lower = name.lower()
        for platform in self.PLATFORMS:
            if name_lower == platform.name or name_lower in [a.lower() for a in platform.aliases]:
                return platform
        return None

    def detect_platform(self, filename: str) -> Optional[PlatformConfig]:
        filename_lower = filename.lower()

        explicit_platform_names = ["android", "ios", "windows", "macos", "linux", "win", "mac", "osx", "iphone", "ipad", "ubuntu", "centos", "darwin"]
        for name in explicit_platform_names:
            if name in filename_lower:
                return self.get_platform_by_name(name)

        specific_exts = [
            (".apk", "android"),
            (".aab", "android"),
            (".ipa", "ios"),
            (".exe", "windows"),
            (".msi", "windows"),
            (".dmg", "macos"),
            (".pkg", "macos"),
            (".deb", "linux"),
            (".rpm", "linux"),
            (".AppImage", "linux"),
        ]
        for ext, platform_name in specific_exts:
            if filename_lower.endswith(ext):
                return self.get_platform_by_name(platform_name)

        return None

    def is_package_file(self, filename: str) -> bool:
        filename_lower = filename.lower()
        for platform in self.PLATFORMS:
            for ext in platform.package_extensions:
                if filename_lower.endswith(ext) and not any(
                    filename_lower.endswith(c_ext) for c_ext in [".sha256", ".md5", ".sha1"]
                ):
                    return True
        return False

    def is_checksum_file(self, filename: str) -> bool:
        filename_lower = filename.lower()
        return any(filename_lower.endswith(ext) for ext in [".sha256", ".md5", ".sha1"])

    def is_release_note(self, filename: str) -> bool:
        filename_lower = filename.lower()
        for pattern in self.RELEASE_NOTE_PATTERNS:
            if pattern.search(filename):
                return True
        for ext in self.RELEASE_NOTE_EXTENSIONS:
            if filename_lower.endswith(ext):
                for pattern in self.RELEASE_NOTE_PATTERNS:
                    base = filename_lower.replace(ext, "")
                    if pattern.search(base):
                        return True
        return False

    def is_beta_version(self, version_str: str) -> bool:
        match = self.VERSION_PATTERN.search(version_str)
        if match and match.group(2):
            return match.group(2).lower() in [t.lower() for t in self.BETA_TAGS]
        return False


config = Config()
