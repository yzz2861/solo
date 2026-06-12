#!/usr/bin/env python3
import os
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
import random


def generate_test_data(base_dir: str = "test_release"):
    base_path = Path(base_dir).resolve()
    base_path.mkdir(parents=True, exist_ok=True)

    packages_dir = base_path / "packages"
    checksums_dir = base_path / "checksums"
    notes_dir = base_path / "release_notes"
    packages_dir.mkdir(exist_ok=True)
    checksums_dir.mkdir(exist_ok=True)
    notes_dir.mkdir(exist_ok=True)

    print(f"生成测试数据到: {base_path}")
    print()

    test_packages = [
        {
            "name": "MyApp-2.1.0-win-x64.exe",
            "platform": "windows",
            "version": "2.1.0",
            "has_checksum": True,
            "checksum_valid": True,
            "checksum_expired": False,
            "content": "valid windows package 2.1.0",
            "mtime_offset_hours": -1
        },
        {
            "name": "MyApp-2.1.0-macos-arm64.dmg",
            "platform": "macos",
            "version": "2.1.0",
            "has_checksum": True,
            "checksum_valid": True,
            "checksum_expired": False,
            "content": "valid macos package 2.1.0",
            "mtime_offset_hours": -1
        },
        {
            "name": "MyApp-2.1.0-beta.1-win-x64.exe",
            "platform": "windows",
            "version": "2.1.0-beta.1",
            "has_checksum": True,
            "checksum_valid": True,
            "checksum_expired": False,
            "content": "beta windows package",
            "mtime_offset_hours": -2,
            "is_beta": True
        },
        {
            "name": "MyApp-2.0.9-win-x64.exe",
            "platform": "windows",
            "version": "2.0.9",
            "has_checksum": True,
            "checksum_valid": True,
            "checksum_expired": False,
            "content": "old windows package 2.0.9",
            "mtime_offset_hours": -48,
            "is_duplicate": True
        },
        {
            "name": "MyApp-2.1.0-win-x64-duplicate.exe",
            "platform": "windows",
            "version": "2.1.0",
            "has_checksum": False,
            "checksum_valid": False,
            "checksum_expired": False,
            "content": "duplicate windows package different content",
            "mtime_offset_hours": -3,
            "is_duplicate": True,
            "duplicate_of": "MyApp-2.1.0-win-x64.exe"
        },
        {
            "name": "MyApp-2.1.0-linux-x64.tar.gz",
            "platform": "linux",
            "version": "2.1.0",
            "has_checksum": True,
            "checksum_valid": True,
            "checksum_expired": True,
            "content": "linux package with expired checksum",
            "mtime_offset_hours": -1
        },
        {
            "name": "MyApp-2.1.0-android-arm64.apk",
            "platform": "android",
            "version": "2.1.0",
            "has_checksum": False,
            "checksum_valid": False,
            "checksum_expired": False,
            "content": "android package missing checksum",
            "mtime_offset_hours": -2
        },
        {
            "name": "MyApp-2.0.8-macos-arm64.dmg",
            "platform": "macos",
            "version": "2.0.8",
            "has_checksum": True,
            "checksum_valid": False,
            "checksum_expired": False,
            "content": "old macos package with wrong checksum",
            "mtime_offset_hours": -72
        },
        {
            "name": "MyApp-2.1.0-noplatform.zip",
            "platform": None,
            "version": "2.1.0",
            "has_checksum": True,
            "checksum_valid": True,
            "checksum_expired": False,
            "content": "package without platform info",
            "mtime_offset_hours": -5
        },
        {
            "name": "MyApp-2.1.0-ios.ipa",
            "platform": "ios",
            "version": "2.1.0",
            "has_checksum": True,
            "checksum_valid": True,
            "checksum_expired": False,
            "content": "ios package - version not in release notes",
            "mtime_offset_hours": -1,
            "missing_in_notes": True
        },
    ]

    checksums_content = {}
    for pkg in test_packages:
        pkg_path = packages_dir / pkg["name"]
        pkg_path.write_text(pkg["content"], encoding="utf-8")

        mtime = datetime.now() + timedelta(hours=pkg["mtime_offset_hours"])
        os.utime(pkg_path, (mtime.timestamp(), mtime.timestamp()))

        if pkg["has_checksum"]:
            checksum = hashlib.sha256(pkg["content"].encode()).hexdigest()
            if not pkg["checksum_valid"]:
                checksum = "0" * 64

            checksum_file_name = pkg["name"] + ".sha256"
            checksum_path = checksums_dir / checksum_file_name

            checksum_mtime = mtime
            if pkg["checksum_expired"]:
                checksum_mtime = mtime - timedelta(hours=25)

            checksum_line = f"{checksum} *{pkg['name']}\n"
            checksum_path.write_text(checksum_line, encoding="utf-8")
            os.utime(checksum_path, (checksum_mtime.timestamp(), checksum_mtime.timestamp()))

            checksums_content[pkg["name"]] = checksum

    release_note_v210 = """# MyApp 版本 2.1.0 发布说明

**发布日期**: 2026-06-12
**版本号**: 2.1.0

## 新功能
- 支持深色模式
- 新增数据导出功能
- 性能优化，启动速度提升 30%

## 改进
- 用户界面重新设计
- 登录流程简化

## Bug 修复
- 修复了在 Windows 上偶发崩溃的问题
- 修复了大数据量导出时内存溢出问题
- 修复了网络不稳定时上传失败的问题
- 修复了 macOS 上菜单栏显示异常

## 已知问题
- Linux 版本可能存在字体渲染问题
"""

    release_note_v209 = """# MyApp 版本 2.0.9 发布说明

**发布日期**: 2026-06-08
**版本号**: 2.0.9

## 修复
- 修复了登录超时的问题
- 修复了文件上传进度条不更新的 bug
- 解决了部分用户反馈的闪退问题

## 优化
- 降低了 CPU 占用率
"""

    release_note_v208_missing_fix = """# MyApp 版本 2.0.8 发布说明

**发布日期**: 2026-06-01
**版本号**: 2.0.8

## 新功能
- 添加了多语言支持
- 新增主题切换功能

## 改进
- 优化了搜索算法
- 改进了移动端适配
"""

    notes_dir.joinpath("RELEASE_NOTES_v2.1.0.md").write_text(release_note_v210, encoding="utf-8")
    notes_dir.joinpath("RELEASE_NOTES_v2.0.9.md").write_text(release_note_v209, encoding="utf-8")
    notes_dir.joinpath("RELEASE_NOTES_v2.0.8.md").write_text(release_note_v208_missing_fix, encoding="utf-8")

    print("生成的测试文件:")
    print("-" * 80)
    print()
    print("【安装包】")
    for pkg in test_packages:
        status = []
        if pkg.get("is_beta"):
            status.append("BETA版本")
        if pkg.get("is_duplicate"):
            status.append("同平台重复包")
        if not pkg["has_checksum"]:
            status.append("缺少校验和")
        elif not pkg["checksum_valid"]:
            status.append("校验和错误")
        elif pkg["checksum_expired"]:
            status.append("校验和过期")
        if pkg.get("missing_in_notes"):
            status.append("版本不在说明中")
        if pkg["platform"] is None:
            status.append("无法识别平台")

        status_str = f" ({', '.join(status)})" if status else ""
        print(f"  ✓ {pkg['name']}{status_str}")

    print()
    print("【校验和文件】")
    for f in sorted(checksums_dir.glob("*.sha256")):
        print(f"  ✓ {f.name}")

    print()
    print("【发布说明】")
    for f in sorted(notes_dir.glob("*.md")):
        if "2.0.8" in f.name:
            note = " (缺少修复项)"
        else:
            note = ""
        print(f"  ✓ {f.name}{note}")

    print()
    print("=" * 80)
    print("测试场景说明:")
    print("  1. MyApp-2.1.0-win-x64.exe      - 正常包，可发布")
    print("  2. MyApp-2.1.0-macos-arm64.dmg  - 正常包，可发布")
    print("  3. MyApp-2.1.0-beta.1-win-x64.exe - BETA版本警告")
    print("  4. MyApp-2.0.9-win-x64.exe      - 与2.1.0构成同平台多版本")
    print("  5. MyApp-2.1.0-win-x64-duplicate.exe - 同版本重复包 + 缺少校验和")
    print("  6. MyApp-2.1.0-linux-x64.tar.gz - 校验和过期")
    print("  7. MyApp-2.1.0-android-arm64.apk - 缺少校验和文件")
    print("  8. MyApp-2.0.8-macos-arm64.dmg - 校验和不匹配 + 说明缺修复项")
    print("  9. MyApp-2.1.0-noplatform.zip  - 无法识别平台")
    print("  10. MyApp-2.1.0-ios.ipa         - 版本未在发布说明中")
    print()
    print("运行检查命令:")
    print(f"  python main.py {base_path} --no-verify-checksum")
    print()

    return base_path


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="生成测试数据")
    parser.add_argument("--dir", default="test_release", help="测试数据目录")
    args = parser.parse_args()
    generate_test_data(args.dir)
