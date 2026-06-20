#!/usr/bin/env python3
"""自测脚本 - 构造各种有问题的测试压缩包并运行审计器验证"""
import io
import os
import shutil
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path

TEST_DIR = Path(__file__).parent / "_test_archives"


def make_zip_good():
    """正常的项目提交包"""
    p = TEST_DIR / "ProjectA-zhangsan-v1.zip"
    with zipfile.ZipFile(p, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("README.md", "# Project A\n提交版本 v1")
        zf.writestr("src/main.py", "print('hello')\n")
        zf.writestr("src/utils.py", "def add(a,b): return a+b\n")
        zf.writestr("docs/spec.pdf", "%PDF-1.4 fake pdf content")
    return p


def make_zip_chinese_path():
    """包含中文路径"""
    p = TEST_DIR / "ProjectB-lisi-v2.zip"
    with zipfile.ZipFile(p, "w") as zf:
        zf.writestr("说明文档/需求.txt", "项目需求文档")
        zf.writestr("data.xlsx", "fake xlsx")
    return p


def make_zip_hidden_and_temp():
    """包含隐藏文件和临时文件"""
    p = TEST_DIR / "ProjectC-wangwu-v1.zip"
    with zipfile.ZipFile(p, "w") as zf:
        zf.writestr("code.py", "x = 1")
        zf.writestr(".DS_Store", "mac garbage")
        zf.writestr("__MACOSX/code.py._", "mac resource fork")
        zf.writestr("Thumbs.db", "win thumbnail")
        zf.writestr("code.bak", "backup file")
        zf.writestr("code.tmp", "temp file")
        zf.writestr(".env", "SECRET=xxx")
        zf.writestr("~$report.xlsx", "office lock file")
    return p


def make_zip_empty_dirs():
    """包含空目录"""
    p = TEST_DIR / "ProjectA-zhaoliu-v2.zip"
    with zipfile.ZipFile(p, "w") as zf:
        zf.writestr("README.md", "hello")
        empty_dir = zipfile.ZipInfo("empty_folder/")
        zf.writestr(empty_dir, b"")
        empty_dir2 = zipfile.ZipInfo("assets/images/")
        zf.writestr(empty_dir2, b"")
    return p


def make_zip_too_large():
    """包含超过大小限制的文件"""
    p = TEST_DIR / "ProjectD-chenqi-v1.zip"
    with zipfile.ZipFile(p, "w") as zf:
        zf.writestr("huge.bin", b"0" * (2 * 1024 * 1024))
        zf.writestr("small.txt", "small file")
    return p


def make_zip_bad():
    """损坏的压缩包"""
    p = TEST_DIR / "ProjectE-sunba-v1.zip"
    p.write_bytes(b"this is not a real zip file at all just garbage")
    return p


def make_zip_same_name_diff_content_1():
    """和另一个包同名不同内容 - 版本1"""
    p = TEST_DIR / "ProjectA-zhangsan-v2.zip"
    with zipfile.ZipFile(p, "w") as zf:
        zf.writestr("contract.pdf", "this is contract version by zhangsan")
        zf.writestr("notes.txt", "zhangsan notes")
    return p


def make_zip_same_name_diff_content_2():
    """和另一个包同名不同内容 - 版本2"""
    p = TEST_DIR / "ProjectB-lisi-v3.zip"
    with zipfile.ZipFile(p, "w") as zf:
        zf.writestr("contract.pdf", "this is contract version by lisi - DIFFERENT CONTENT")
        zf.writestr("notes.txt", "lisi notes, different!")
    return p


def make_tar_good():
    """正常的 tar.gz"""
    p = TEST_DIR / "ProjectF-zhoujiu-v1.tar.gz"
    data = {
        "app.py": "print('tar app')",
        "lib/helper.js": "function h(){return 1}",
    }
    with tarfile.open(p, "w:gz") as tf:
        for name, content in data.items():
            b = content.encode()
            info = tarfile.TarInfo(name=name)
            info.size = len(b)
            tf.addfile(info, io.BytesIO(b))
    return p


def make_tar_symlinks():
    """包含符号链接的 tar"""
    p = TEST_DIR / "ProjectG-wushi-v1.tar"
    with tarfile.open(p, "w") as tf:
        info = tarfile.TarInfo(name="real.txt")
        info.size = 8
        tf.addfile(info, io.BytesIO(b"content!"))
        sym = tarfile.TarInfo(name="link.txt")
        sym.type = tarfile.SYMTYPE
        sym.linkname = "real.txt"
        tf.addfile(sym)
    return p


def make_zip_no_files():
    """只有空目录没有任何文件"""
    p = TEST_DIR / "ProjectH-wuwei-v1.zip"
    with zipfile.ZipFile(p, "w") as zf:
        d1 = zipfile.ZipInfo("only_dir/")
        zf.writestr(d1, b"")
    return p


def main():
    TEST_DIR.mkdir(exist_ok=True)
    for f in TEST_DIR.iterdir():
        if f.is_file():
            f.unlink()

    makers = [
        make_zip_good, make_zip_chinese_path, make_zip_hidden_and_temp,
        make_zip_empty_dirs, make_zip_too_large, make_zip_bad,
        make_zip_same_name_diff_content_1, make_zip_same_name_diff_content_2,
        make_tar_good, make_tar_symlinks, make_zip_no_files,
    ]
    print("==> 生成测试压缩包...")
    for m in makers:
        p = m()
        print(f"  生成: {p.name} ({p.stat().st_size} bytes)")

    print(f"\n==> 扫描目录: {TEST_DIR}")
    print(f"    (单个文件大小限制设为 1MB，方便触发 FILE_TOO_LARGE)\n")

    auditor = Path(__file__).parent / "archive_auditor.py"
    json_out = TEST_DIR / "report.json"
    text_out = TEST_DIR / "report.txt"
    cmd = [
        sys.executable, str(auditor),
        str(TEST_DIR),
        "--max-size", "1MB",
        "--json", str(json_out),
        "--text", str(text_out),
    ]
    import subprocess
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("--- STDERR ---", file=sys.stderr)
        print(result.stderr, file=sys.stderr)

    print(f"\n==> 检查输出文件:")
    for f in [json_out, text_out]:
        if f.exists():
            print(f"  ✅ {f}  ({f.stat().st_size} bytes)")
        else:
            print(f"  ❌ {f} 缺失!")

    print("\n==> 自检关键检测项是否生效:")
    checks = [
        ("CHINESE_PATH 检测中文路径", "CHINESE_PATH"),
        ("HIDDEN_FILE 检测隐藏文件", "HIDDEN_FILE"),
        ("TEMP_FILE 检测临时文件", "TEMP_FILE"),
        ("EMPTY_DIR 检测空目录", "EMPTY_DIR"),
        ("FILE_TOO_LARGE 检测超大文件", "FILE_TOO_LARGE"),
        ("BAD_ARCHIVE 检测坏包", "BAD_ARCHIVE"),
        ("SAME_NAME_DIFF_CONTENT 跨包同名不同内容", "SAME_NAME_DIFF_CONTENT"),
        ("SYMLINK 检测符号链接", "SYMLINK"),
        ("NO_FILES 检测无文件", "NO_FILES"),
    ]
    report_text = text_out.read_text(encoding="utf-8") if text_out.exists() else result.stdout
    all_ok = True
    for label, code in checks:
        ok = code in report_text
        all_ok = all_ok and ok
        print(f"  {'✅' if ok else '❌'} {label} -> {'检测到' if ok else '未检测到!'}")

    print("\n" + ("🎉 所有关键检测项均生效!" if all_ok else "⚠️ 有检测项未生效，请检查代码!"))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
