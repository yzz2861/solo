#!/usr/bin/env python3
"""压缩包清单审计器 - Archive Auditor CLI

扫描指定目录中的 zip/tar 压缩包，列出内部文件、检测命名违规、
坏包、中文路径、隐藏文件、同名不同内容、超大文件等问题，
并输出审计清单和需退回修改的原因汇总。
"""

import argparse
import hashlib
import io
import json
import os
import re
import sys
import tarfile
import time
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


CHINESE_RE = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf]")
HIDDEN_RE = re.compile(r"(^|/)\.[^/.]")
TEMP_PATTERNS = [
    re.compile(r"~$"),
    re.compile(r"\.tmp$", re.I),
    re.compile(r"\.temp$", re.I),
    re.compile(r"\.bak$", re.I),
    re.compile(r"\.swp$"),
    re.compile(r"\.DS_Store$"),
    re.compile(r"Thumbs\.db$", re.I),
    re.compile(r"desktop\.ini$", re.I),
    re.compile(r"^__MACOSX/"),
    re.compile(r"(^|/)\.Trash"),
    re.compile(r"(^|/)\.Spotlight-V100/"),
    re.compile(r"(^|/)\.fseventsd/"),
]
NAME_INVALID_RE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


@dataclass
class FileEntry:
    name: str
    size: int
    mtime: float
    is_dir: bool
    md5: Optional[str] = None
    content_preview: str = ""

    @property
    def mtime_str(self) -> str:
        return datetime.fromtimestamp(self.mtime).strftime("%Y-%m-%d %H:%M:%S")

    @property
    def size_str(self) -> str:
        return _fmt_size(self.size)


@dataclass
class Issue:
    level: str
    code: str
    message: str
    file: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = {"level": self.level, "code": self.code, "message": self.message}
        if self.file:
            d["file"] = self.file
        return d


@dataclass
class ArchiveReport:
    path: str
    project: str
    submitter: str
    archive_type: str
    ok: bool = True
    entries: List[FileEntry] = field(default_factory=list)
    issues: List[Issue] = field(default_factory=list)

    @property
    def should_return(self) -> bool:
        return any(i.level in ("ERROR", "WARN") for i in self.issues)


def _fmt_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024.0:
            return f"{n:.1f}{unit}" if unit != "B" else f"{int(n)}{unit}"
        n /= 1024.0
    return f"{n:.1f}PB"


def _md5_bytes(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


def _infer_project_and_submitter(archive_path: Path) -> Tuple[str, str]:
    stem = archive_path.stem
    if archive_path.suffix.lower() in (".gz", ".bz2", ".xz"):
        p = Path(stem)
        if p.suffix.lower() == ".tar":
            stem = p.stem
    parts = re.split(r"[-_ ]+", stem, maxsplit=2)
    if len(parts) >= 3:
        return parts[0], parts[1]
    if len(parts) == 2:
        return parts[0], parts[1]
    return stem, "未知"


def _check_name_violations(name: str) -> List[Issue]:
    issues: List[Issue] = []
    norm = name.replace("\\", "/")
    base = os.path.basename(norm.rstrip("/")) or norm

    if CHINESE_RE.search(name):
        issues.append(Issue("WARN", "CHINESE_PATH",
                            f"路径/文件名包含中文: {name}", name))

    if HIDDEN_RE.search("/" + norm):
        issues.append(Issue("WARN", "HIDDEN_FILE",
                            f"检测到隐藏文件/目录: {name}", name))

    for pat in TEMP_PATTERNS:
        if pat.search(base) or pat.search(norm):
            issues.append(Issue("WARN", "TEMP_FILE",
                                f"检测到临时/系统文件: {name}", name))
            break

    if NAME_INVALID_RE.search(base):
        issues.append(Issue("ERROR", "INVALID_NAME",
                            f"文件名包含非法字符: {name}", name))

    if len(name.encode("utf-8")) > 255:
        issues.append(Issue("WARN", "PATH_TOO_LONG",
                            f"路径过长 (>255 bytes UTF-8): {name}", name))

    return issues


def _scan_zip(archive_path: Path, max_file_size: int,
              compute_hash: bool) -> Tuple[List[FileEntry], List[Issue], bool]:
    entries: List[FileEntry] = []
    issues: List[Issue] = []
    ok = True

    try:
        with zipfile.ZipFile(archive_path, "r") as zf:
            bad = zf.testzip()
            if bad is not None:
                issues.append(Issue("ERROR", "CORRUPTED_ENTRY",
                                    f"压缩包内损坏的文件: {bad}", bad))
                ok = False

            for info in zf.infolist():
                name = info.filename
                is_dir = name.endswith("/") or info.is_dir()
                size = info.file_size
                try:
                    dt = info.date_time
                    mtime = time.mktime(dt + (0, 0, -1))
                except Exception:
                    mtime = archive_path.stat().st_mtime

                issues.extend(_check_name_violations(name))

                if is_dir and size == 0:
                    entries.append(FileEntry(name, size, mtime, True))
                    continue

                if size > max_file_size:
                    issues.append(Issue("ERROR", "FILE_TOO_LARGE",
                                        f"文件超过大小限制 {_fmt_size(size)} > {_fmt_size(max_file_size)}: {name}",
                                        name))

                md5 = None
                if compute_hash and not is_dir and size <= 100 * 1024 * 1024:
                    try:
                        with zf.open(info) as f:
                            data = f.read()
                            md5 = _md5_bytes(data)
                    except Exception as e:
                        issues.append(Issue("ERROR", "READ_FAILED",
                                            f"读取文件失败 {name}: {e}", name))
                        ok = False

                entries.append(FileEntry(name, size, mtime, is_dir, md5))

    except zipfile.BadZipFile as e:
        issues.insert(0, Issue("ERROR", "BAD_ARCHIVE", f"损坏的 ZIP 文件: {e}"))
        ok = False
    except Exception as e:
        issues.insert(0, Issue("ERROR", "SCAN_FAILED", f"扫描 ZIP 失败: {e}"))
        ok = False

    return entries, issues, ok


def _scan_tar(archive_path: Path, max_file_size: int,
              compute_hash: bool) -> Tuple[List[FileEntry], List[Issue], bool]:
    entries: List[FileEntry] = []
    issues: List[Issue] = []
    ok = True

    try:
        mode = "r:*"
        with tarfile.open(archive_path, mode) as tf:
            for member in tf.getmembers():
                name = member.name
                is_dir = member.isdir()
                size = member.size
                mtime = float(member.mtime) if member.mtime else archive_path.stat().st_mtime

                if member.issym() or member.islnk():
                    issues.append(Issue("WARN", "SYMLINK",
                                        f"检测到符号链接/硬链接: {name}", name))

                issues.extend(_check_name_violations(name))

                if is_dir:
                    entries.append(FileEntry(name, size, mtime, True))
                    continue

                if size > max_file_size:
                    issues.append(Issue("ERROR", "FILE_TOO_LARGE",
                                        f"文件超过大小限制 {_fmt_size(size)} > {_fmt_size(max_file_size)}: {name}",
                                        name))

                md5 = None
                if compute_hash and size <= 100 * 1024 * 1024:
                    try:
                        f = tf.extractfile(member)
                        if f is not None:
                            data = f.read()
                            md5 = _md5_bytes(data)
                            f.close()
                    except Exception as e:
                        issues.append(Issue("ERROR", "READ_FAILED",
                                            f"读取文件失败 {name}: {e}", name))
                        ok = False

                entries.append(FileEntry(name, size, mtime, False, md5))

    except tarfile.TarError as e:
        issues.insert(0, Issue("ERROR", "BAD_ARCHIVE", f"损坏的 TAR 文件: {e}"))
        ok = False
    except Exception as e:
        issues.insert(0, Issue("ERROR", "SCAN_FAILED", f"扫描 TAR 失败: {e}"))
        ok = False

    return entries, issues, ok


def scan_archive(archive_path: Path, max_file_size: int,
                 compute_hash: bool) -> ArchiveReport:
    project, submitter = _infer_project_and_submitter(archive_path)
    suffix = archive_path.suffix.lower()
    stem_suffix = Path(archive_path.stem).suffix.lower()
    if suffix in (".zip",):
        atype = "zip"
    elif suffix in (".tar", ".gz", ".bz2", ".xz", ".tgz", ".tbz2", ".txz") or stem_suffix == ".tar":
        atype = "tar"
    else:
        atype = "unknown"

    report = ArchiveReport(
        path=str(archive_path),
        project=project,
        submitter=submitter,
        archive_type=atype,
    )

    if atype == "unknown":
        report.issues.append(Issue("ERROR", "UNKNOWN_TYPE",
                                   f"不支持的压缩包格式: {archive_path.suffix}"))
        report.ok = False
        return report

    if atype == "zip":
        entries, issues, ok = _scan_zip(archive_path, max_file_size, compute_hash)
    else:
        entries, issues, ok = _scan_tar(archive_path, max_file_size, compute_hash)

    report.entries = entries
    report.issues = issues
    report.ok = ok

    dirs = [e for e in entries if e.is_dir]
    non_dirs = [e for e in entries if not e.is_dir]
    empty_dirs = []
    for d in dirs:
        dname = d.name.rstrip("/") + "/"
        has_child = any(e.name.startswith(dname) and e.name != d.name for e in entries)
        if not has_child:
            empty_dirs.append(d.name)
    for ed in empty_dirs:
        report.issues.append(Issue("WARN", "EMPTY_DIR",
                                   f"检测到空目录: {ed}", ed))

    if not non_dirs:
        report.issues.append(Issue("WARN", "NO_FILES", "压缩包内没有任何文件"))

    return report


def detect_duplicates_across(reports: List[ArchiveReport]) -> List[Issue]:
    extra: List[Issue] = []
    name_map: Dict[str, List[Tuple[ArchiveReport, FileEntry]]] = {}
    for r in reports:
        for e in r.entries:
            if e.is_dir or not e.md5:
                continue
            name_map.setdefault(os.path.basename(e.name), []).append((r, e))

    for basename, occs in name_map.items():
        if len(occs) < 2:
            continue
        md5_set = {o[1].md5 for o in occs}
        if len(md5_set) > 1:
            desc = "; ".join(
                f"{os.path.basename(r.path)}/{e.name}({_fmt_size(e.size)})"
                for r, e in occs
            )
            for r, e in occs:
                r.issues.append(Issue(
                    "WARN", "SAME_NAME_DIFF_CONTENT",
                    f"同名但内容不同的文件 '{basename}'，涉及: {desc}", e.name
                ))
    return extra


ARCHIVE_EXTS = {".zip", ".tar", ".tar.gz", ".tgz", ".tar.bz2", ".tbz2",
                ".tar.xz", ".txz", ".gz", ".bz2", ".xz"}


def iter_archives(root: Path) -> List[Path]:
    result: List[Path] = []
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        name = p.name.lower()
        if any(name.endswith(ext) for ext in ARCHIVE_EXTS):
            result.append(p)
    return result


def _print_sep(title: str = "", width: int = 80) -> None:
    if title:
        pad = width - len(title) - 4
        left = pad // 2
        right = pad - left
        print("\n" + "=" * left + f"  {title}  " + "=" * right)
    else:
        print("\n" + "=" * width)


def print_text_report(reports: List[ArchiveReport], root: Path) -> None:
    _print_sep("压缩包清单审计报告")
    print(f"扫描目录: {root.resolve()}")
    print(f"扫描时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"压缩包总数: {len(reports)}")
    returned = [r for r in reports if r.should_return]
    print(f"需退回修改: {len(returned)}")
    print(f"正常通过:   {len(reports) - len(returned)}")

    for r in reports:
        _print_sep(os.path.basename(r.path))
        print(f"项目:     {r.project}")
        print(f"提交人:   {r.submitter}")
        print(f"类型:     {r.archive_type}")
        print(f"状态:     {'⚠️ 需退回' if r.should_return else ('✅ 正常' if r.ok else '❌ 坏包')}")
        print(f"条目总数: {len(r.entries)}")
        total_size = sum(e.size for e in r.entries if not e.is_dir)
        print(f"文件总大小: {_fmt_size(total_size)}")

        print("\n-- 文件清单 --")
        if not r.entries:
            print("  (无)")
        for e in r.entries:
            kind = "D" if e.is_dir else "F"
            print(f"  [{kind}] {e.name}")
            print(f"         大小: {e.size_str}  修改时间: {e.mtime_str}" +
                  (f"  MD5: {e.md5}" if e.md5 else ""))

        print("\n-- 问题与退回原因 --")
        if not r.issues:
            print("  ✅ 无问题")
        for i in r.issues:
            tag = "ERROR" if i.level == "ERROR" else "WARN "
            print(f"  [{tag}] [{i.code}] {i.message}")

    _print_sep("按项目退回汇总")
    project_map: Dict[str, List[ArchiveReport]] = {}
    for r in reports:
        if r.should_return:
            project_map.setdefault(r.project, []).append(r)

    if not project_map:
        print("🎉 所有压缩包均无需要退回修改的问题！")
        return

    for project in sorted(project_map):
        rs = project_map[project]
        print(f"\n【项目: {project}】")
        sub_map: Dict[str, List[ArchiveReport]] = {}
        for r in rs:
            sub_map.setdefault(r.submitter, []).append(r)
        for submitter in sorted(sub_map):
            srs = sub_map[submitter]
            print(f"  → 退回给: {submitter}")
            for r in srs:
                print(f"      压缩包: {os.path.basename(r.path)}")
                reasons = {i.code: i.message for i in r.issues if i.level in ("ERROR", "WARN")}
                for code, msg in reasons.items():
                    print(f"        - [{code}] {msg}")


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="archive_auditor",
        description="压缩包清单审计器: 扫描目录内的 zip/tar 包，输出清单与违规报告",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s ./projects
  %(prog)s ./projects --max-size 50MB
  %(prog)s ./projects --no-hash
  %(prog)s ./projects --json report.json
  %(prog)s ./projects --json report.json --text report.txt
""",
    )
    parser.add_argument("directory", type=Path,
                        help="包含压缩包的目录(递归扫描)")
    parser.add_argument("--max-size", dest="max_size", default="100MB",
                        help="单个文件大小限制，默认 100MB (支持 B/KB/MB/GB)")
    parser.add_argument("--no-hash", dest="no_hash", action="store_true",
                        help="不计算 MD5，跳过跨包同名不同内容检测(速度更快)")
    parser.add_argument("--json", dest="json_out", type=Path, default=None,
                        help="将完整报告输出为 JSON 文件")
    parser.add_argument("--text", dest="text_out", type=Path, default=None,
                        help="将文本报告输出到文件(默认只打印到终端)")
    args = parser.parse_args()

    root: Path = args.directory
    if not root.exists() or not root.is_dir():
        print(f"错误: 目录不存在或不是目录: {root}", file=sys.stderr)
        return 2

    m = re.match(r"^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$", args.max_size.strip(), re.I)
    if not m:
        print(f"错误: 无法解析大小: {args.max_size}", file=sys.stderr)
        return 2
    num = float(m.group(1))
    unit = (m.group(2) or "MB").upper()
    multiplier = {"B": 1, "KB": 1024, "MB": 1024 ** 2, "GB": 1024 ** 3, "TB": 1024 ** 4}[unit]
    max_file_size = int(num * multiplier)

    archives = iter_archives(root)
    if not archives:
        print(f"在 {root} 下未找到任何压缩包文件", file=sys.stderr)
        return 1

    print(f"找到 {len(archives)} 个压缩包，开始扫描...", file=sys.stderr)

    reports: List[ArchiveReport] = []
    for i, ap in enumerate(archives, 1):
        print(f"  [{i}/{len(archives)}] 扫描: {ap.name}", file=sys.stderr)
        try:
            reports.append(scan_archive(ap, max_file_size, compute_hash=not args.no_hash))
        except Exception as e:
            proj, sub = _infer_project_and_submitter(ap)
            r = ArchiveReport(path=str(ap), project=proj, submitter=sub,
                              archive_type="?", ok=False)
            r.issues.append(Issue("ERROR", "FATAL", f"扫描时发生未预期错误: {e}"))
            reports.append(r)

    if not args.no_hash:
        detect_duplicates_across(reports)

    output = io.StringIO()
    real_stdout = sys.stdout
    sys.stdout = output
    try:
        print_text_report(reports, root)
    finally:
        sys.stdout = real_stdout
    text = output.getvalue()

    print(text)

    if args.text_out:
        args.text_out.write_text(text, encoding="utf-8")
        print(f"\n文本报告已保存到: {args.text_out.resolve()}", file=sys.stderr)

    if args.json_out:
        data = {
            "scanned_at": datetime.now().isoformat(timespec="seconds"),
            "root": str(root.resolve()),
            "max_file_size": max_file_size,
            "total": len(reports),
            "return_required": sum(1 for r in reports if r.should_return),
            "reports": [
                {
                    "path": r.path,
                    "project": r.project,
                    "submitter": r.submitter,
                    "archive_type": r.archive_type,
                    "ok": r.ok,
                    "should_return": r.should_return,
                    "entries": [
                        {
                            "name": e.name,
                            "size": e.size,
                            "size_h": e.size_str,
                            "mtime": datetime.fromtimestamp(e.mtime).isoformat(timespec="seconds"),
                            "is_dir": e.is_dir,
                            "md5": e.md5,
                        }
                        for e in r.entries
                    ],
                    "issues": [i.to_dict() for i in r.issues],
                }
                for r in reports
            ],
            "by_project": {
                proj: {
                    sub: [
                        {
                            "archive": os.path.basename(r.path),
                            "issues": [i.to_dict() for i in r.issues],
                        }
                        for r in rs
                    ]
                    for sub, rs in {
                        s: [x for x in rs if x.submitter == s]
                        for s in sorted({x.submitter for x in rs})
                    }.items()
                }
                for proj, rs in sorted({
                    p: [x for x in reports if x.project == p and x.should_return]
                    for p in sorted({x.project for x in reports})
                }.items()) if rs
            },
        }
        args.json_out.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"JSON 报告已保存到: {args.json_out.resolve()}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
