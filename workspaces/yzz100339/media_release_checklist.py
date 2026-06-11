#!/usr/bin/env python3
"""
社媒素材发版清单扫描脚本

扫描活动目录，按渠道检查素材完整性，生成人类可读的发版清单。

用法:
    python media_release_checklist.py <活动目录> [--snapshot-dir <快照目录>] [--output <输出文件>]

约定:
    目录结构（支持嵌套或扁平）:
        海报/   — 图片素材 (.jpg/.png/.psd/.ai/.webp)
        视频/   — 视频文件 (.mp4/.mov/.avi) 及封面图
        文案/   — 文案文件 (.txt/.md/.doc/.docx)
        落地页/ — 落地页链接 (.url/.txt) 或 manifest 中声明
        审批/   — 审批备注 (.txt/.md/.pdf)

    文件名编码规则:
        {渠道}_{类型}_{版本}.{ext}
        例: 微信_海报_v2_final.png, 抖音_封面（终版）.jpg

    渠道关键词: 微信, 抖音, 小红书, 微博, B站, 快手
    类型关键词: 海报, 视频, 封面, 文案, 落地页, 审批, 审批备注
    版本关键词: v1, v2, final, 终版, 最终版, 定稿
"""

import argparse
import hashlib
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

CHANNELS = ["微信", "抖音", "小红书", "微博", "B站", "快手"]

POSTER_EXTS = {".jpg", ".jpeg", ".png", ".psd", ".ai", ".webp", ".svg", ".gif"}
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".flv", ".wmv"}
COVER_EXTS = POSTER_EXTS
COPY_EXTS = {".txt", ".md", ".doc", ".docx", ".pages"}
LANDING_EXTS = {".url", ".txt", ".html"}
APPROVAL_EXTS = {".txt", ".md", ".pdf", ".doc", ".docx"}

CHANNEL_POSTER_SIZES = {
    "微信": [(1080, 1440), (1080, 1080), (1080, 1920)],
    "抖音": [(1080, 1920), (1080, 1080)],
    "小红书": [(1080, 1440), (1080, 1920)],
    "微博": [(900, 1200), (1080, 1080), (1080, 1920)],
    "B站": [(1146, 717), (1080, 1920)],
    "快手": [(1080, 1920), (1080, 1080)],
}

CHANNEL_COVER_SIZES = {
    "微信": [(900, 500)],
    "抖音": [(1080, 1920)],
    "小红书": [(1080, 1440)],
    "微博": [(900, 500)],
    "B站": [(1146, 717)],
    "快手": [(1080, 1920)],
}

CATEGORY_DIRS = {
    "海报": "海报",
    "视频": "视频",
    "封面": "视频",
    "文案": "文案",
    "落地页": "落地页",
    "审批": "审批",
    "审批备注": "审批",
}

TYPE_KEYWORDS = ["海报", "视频", "封面", "文案", "落地页", "审批", "审批备注"]

VERSION_PATTERNS = [
    (re.compile(r"[vV](\d+)", re.IGNORECASE), "v{n}"),
    (re.compile(r"版本(\d+)", re.IGNORECASE), "版{n}"),
    (re.compile(r"第(\d+)版", re.IGNORECASE), "第{n}版"),
    (re.compile(r"final|终版|最终版|定稿", re.IGNORECASE), "终版"),
]

FINAL_KEYWORDS = {"final", "终版", "最终版", "定稿"}


@dataclass
class FilenameIssue:
    file_path: str
    issue_type: str
    detail: str


@dataclass
class AssetInfo:
    file_path: str
    file_name: str
    channel: Optional[str]
    asset_type: Optional[str]
    version: Optional[str]
    is_final: bool
    size_bytes: int
    md5: str
    issues: list = field(default_factory=list)
    width: int = 0
    height: int = 0
    is_valid_image: bool = False


@dataclass
class ChannelCheckResult:
    channel: str
    has_poster: bool = False
    poster_count: int = 0
    valid_poster_count: int = 0
    poster_details: list = field(default_factory=list)
    poster_size_issues: list = field(default_factory=list)
    has_video_cover: bool = False
    video_cover_count: int = 0
    valid_cover_count: int = 0
    video_cover_details: list = field(default_factory=list)
    cover_size_issues: list = field(default_factory=list)
    has_copy: bool = False
    copy_count: int = 0
    copy_details: list = field(default_factory=list)
    has_landing_page: bool = False
    landing_page_count: int = 0
    landing_page_details: list = field(default_factory=list)
    has_approval: bool = False
    approval_count: int = 0
    approval_details: list = field(default_factory=list)
    multiple_finals: list = field(default_factory=list)
    missing_items: list = field(default_factory=list)


@dataclass
class DiffResult:
    added: list = field(default_factory=list)
    deleted: list = field(default_factory=list)
    replaced: list = field(default_factory=list)


def compute_md5(file_path: str) -> str:
    h = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def get_image_dimensions(file_path: str) -> tuple:
    width, height = 0, 0
    is_valid = False
    
    if not PIL_AVAILABLE:
        return width, height, is_valid
    
    ext = Path(file_path).suffix.lower()
    if ext in {".psd", ".ai"}:
        return width, height, False
    
    try:
        with Image.open(file_path) as img:
            width, height = img.size
            is_valid = True
    except Exception:
        pass
    
    return width, height, is_valid


def parse_channel(filename: str) -> Optional[str]:
    for ch in CHANNELS:
        if ch in filename:
            return ch
    return None


def parse_asset_type(filename: str, parent_dir: Optional[str] = None) -> Optional[str]:
    if parent_dir:
        for cat_dir, cat_name in CATEGORY_DIRS.items():
            if cat_dir in parent_dir:
                return cat_dir
    for kw in TYPE_KEYWORDS:
        if kw in filename:
            return kw
    ext = Path(filename).suffix.lower()
    if ext in POSTER_EXTS:
        return "海报"
    if ext in VIDEO_EXTS:
        return "视频"
    if ext in COPY_EXTS:
        return "文案"
    if ext in LANDING_EXTS:
        return "落地页"
    return None


def parse_version(filename: str) -> Optional[str]:
    for pattern, fmt in VERSION_PATTERNS:
        m = pattern.search(filename)
        if m:
            if "{n}" in fmt:
                return fmt.format(n=m.group(1))
            return fmt
    return None


def is_final_version(filename: str) -> bool:
    lower = filename.lower()
    return any(kw in lower for kw in FINAL_KEYWORDS)


def check_filename_issues(filename: str) -> list:
    issues = []
    if " " in filename:
        issues.append(FilenameIssue(
            file_path=filename,
            issue_type="空格",
            detail="文件名含空格，建议用下划线替代",
        ))
    if "（" in filename or "）" in filename:
        issues.append(FilenameIssue(
            file_path=filename,
            issue_type="中文括号",
            detail="文件名含中文括号（），建议替换为英文括号()",
        ))
    if re.search(r"[vV]\d+", filename) and re.search(r"终版|最终版|定稿|final", filename, re.IGNORECASE):
        issues.append(FilenameIssue(
            file_path=filename,
            issue_type="版本标记冲突",
            detail="文件名同时包含版本号和终版标记，请明确是终版还是迭代版",
        ))
    version_nums = re.findall(r"[vV](\d+)", filename)
    if len(version_nums) >= 1:
        nums = [int(n) for n in version_nums]
        for i in range(len(nums) - 1):
            if nums[i + 1] != nums[i] + 1 and nums[i + 1] != nums[i]:
                issues.append(FilenameIssue(
                    file_path=filename,
                    issue_type="版本号跳跃",
                    detail=f"版本号从 v{nums[i]} 跳到 v{nums[i + 1]}，中间版本缺失",
                ))
    return issues


SKIP_DIRS = {".release_check", ".git", "__pycache__", "node_modules", ".DS_Store"}


def scan_directory(activity_dir: str, snapshot_dir_name: str = ".release_check") -> list:
    assets = []
    root = Path(activity_dir)
    if not root.exists():
        print(f"❌ 目录不存在: {activity_dir}")
        sys.exit(1)

    for file_path in root.rglob("*"):
        if file_path.is_dir():
            continue
        if file_path.name.startswith(".") or file_path.name.startswith("~"):
            continue
        if file_path.suffix.lower() in {".tmp", ".bak", ".swp"}:
            continue
        parts = file_path.relative_to(root).parts
        if any(p in SKIP_DIRS for p in parts):
            continue

        fname = file_path.name
        parent = file_path.parent.name

        channel = parse_channel(fname)
        asset_type = parse_asset_type(fname, parent)
        version = parse_version(fname)
        final = is_final_version(fname)
        issues = check_filename_issues(fname)

        try:
            size = file_path.stat().st_size
            md5 = compute_md5(str(file_path))
        except OSError:
            size = 0
            md5 = ""

        width, height = 0, 0
        is_valid_image = False
        
        ext = file_path.suffix.lower()
        if ext in POSTER_EXTS or ext in COVER_EXTS:
            width, height, is_valid_image = get_image_dimensions(str(file_path))
            
            if size == 0:
                issues.append(FilenameIssue(
                    file_path=fname,
                    issue_type="文件为空",
                    detail="文件大小为0字节，可能是损坏或未完成的文件",
                ))
            elif not is_valid_image and ext not in {".psd", ".ai", ".svg"}:
                issues.append(FilenameIssue(
                    file_path=fname,
                    issue_type="图片无法解析",
                    detail="图片文件损坏或格式不支持，无法读取尺寸",
                ))

        rel_path = str(file_path.relative_to(root))

        assets.append(AssetInfo(
            file_path=rel_path,
            file_name=fname,
            channel=channel,
            asset_type=asset_type,
            version=version,
            is_final=final,
            size_bytes=size,
            md5=md5,
            issues=[asdict(i) for i in issues],
            width=width,
            height=height,
            is_valid_image=is_valid_image,
        ))

    return assets


def group_by_channel(assets: list) -> dict:
    groups = defaultdict(list)
    no_channel = []
    for a in assets:
        if a.channel:
            groups[a.channel].append(a)
        else:
            no_channel.append(a)
    return dict(groups), no_channel


def is_valid_poster_for_channel(channel: str, width: int, height: int, is_valid_image: bool, size_bytes: int) -> tuple:
    if size_bytes == 0:
        return False, "文件为空"
    if not is_valid_image:
        return False, "图片无法解析"
    
    if channel not in CHANNEL_POSTER_SIZES:
        return True, None
    
    valid_sizes = CHANNEL_POSTER_SIZES[channel]
    for w, h in valid_sizes:
        if width == w and height == h:
            return True, None
    
    expected_sizes = ", ".join([f"{w}x{h}" for w, h in valid_sizes])
    return False, f"尺寸 {width}x{height} 不符合要求，期望: {expected_sizes}"


def is_valid_cover_for_channel(channel: str, width: int, height: int, is_valid_image: bool, size_bytes: int) -> tuple:
    if size_bytes == 0:
        return False, "文件为空"
    if not is_valid_image:
        return False, "图片无法解析"
    
    if channel not in CHANNEL_COVER_SIZES:
        return True, None
    
    valid_sizes = CHANNEL_COVER_SIZES[channel]
    for w, h in valid_sizes:
        if width == w and height == h:
            return True, None
    
    expected_sizes = ", ".join([f"{w}x{h}" for w, h in valid_sizes])
    return False, f"尺寸 {width}x{height} 不符合要求，期望: {expected_sizes}"


def check_channel_completeness(channel: str, assets: list) -> ChannelCheckResult:
    result = ChannelCheckResult(channel=channel)

    for a in assets:
        atype = a.asset_type or ""
        ext = Path(a.file_name).suffix.lower()

        if atype == "海报" or (not atype and ext in POSTER_EXTS):
            result.poster_count += 1
            
            size_info = f" ({a.width}x{a.height})" if a.width > 0 else ""
            detail = {
                "name": a.file_name,
                "width": a.width,
                "height": a.height,
                "is_valid": a.is_valid_image and a.size_bytes > 0,
                "size": a.size_bytes,
            }
            result.poster_details.append(detail)
            
            if a.size_bytes == 0 or not a.is_valid_image:
                result.poster_size_issues.append({
                    "file": a.file_name,
                    "issue": "文件为空" if a.size_bytes == 0 else "图片无法解析",
                    "expected": None,
                })
            else:
                is_valid, reason = is_valid_poster_for_channel(channel, a.width, a.height, a.is_valid_image, a.size_bytes)
                if is_valid:
                    result.valid_poster_count += 1
                else:
                    result.poster_size_issues.append({
                        "file": a.file_name,
                        "issue": reason,
                        "expected": ", ".join([f"{w}x{h}" for w, h in CHANNEL_POSTER_SIZES.get(channel, [])]),
                    })
            
            result.has_poster = result.valid_poster_count > 0

        elif atype == "封面" or (atype == "视频" and ext in COVER_EXTS):
            result.video_cover_count += 1
            
            detail = {
                "name": a.file_name,
                "width": a.width,
                "height": a.height,
                "is_valid": a.is_valid_image and a.size_bytes > 0,
                "size": a.size_bytes,
            }
            result.video_cover_details.append(detail)
            
            if a.size_bytes == 0 or not a.is_valid_image:
                result.cover_size_issues.append({
                    "file": a.file_name,
                    "issue": "文件为空" if a.size_bytes == 0 else "图片无法解析",
                    "expected": None,
                })
            else:
                is_valid, reason = is_valid_cover_for_channel(channel, a.width, a.height, a.is_valid_image, a.size_bytes)
                if is_valid:
                    result.valid_cover_count += 1
                else:
                    result.cover_size_issues.append({
                        "file": a.file_name,
                        "issue": reason,
                        "expected": ", ".join([f"{w}x{h}" for w, h in CHANNEL_COVER_SIZES.get(channel, [])]),
                    })
            
            result.has_video_cover = result.valid_cover_count > 0

        elif atype == "视频":
            pass

        elif atype == "文案" or (not atype and ext in COPY_EXTS):
            result.copy_count += 1
            result.copy_details.append(a.file_name)
            result.has_copy = True

        elif atype == "落地页" or (not atype and ext in LANDING_EXTS):
            result.landing_page_count += 1
            result.landing_page_details.append(a.file_name)
            result.has_landing_page = True

        elif atype in ("审批", "审批备注"):
            result.approval_count += 1
            result.approval_details.append(a.file_name)
            result.has_approval = True

    finals = [a for a in assets if a.is_final]
    if len(finals) > 1:
        type_finals = defaultdict(list)
        for f in finals:
            key = f.asset_type or "未分类"
            type_finals[key].append(f.file_name)
        for atype, fnames in type_finals.items():
            if len(fnames) > 1:
                result.multiple_finals.append({
                    "type": atype,
                    "files": fnames,
                })

    missing = []
    if result.poster_count == 0:
        missing.append("海报（需要 jpg/png/psd/ai 格式）")
    elif result.valid_poster_count == 0:
        missing.append("海报（所有海报文件无效或尺寸不匹配）")
    
    if result.video_cover_count == 0:
        missing.append("视频封面（需要与视频配套的封面图）")
    elif result.valid_cover_count == 0:
        missing.append("视频封面（所有封面文件无效或尺寸不匹配）")
    
    if not result.has_copy:
        missing.append("文案（需要 txt/md/doc 格式）")
    if not result.has_landing_page:
        missing.append("落地页链接（需要 url/txt 格式或在 manifest 中声明）")
    if not result.has_approval:
        missing.append("审批备注（需要 txt/md/pdf 格式）")
    result.missing_items = missing

    return result


def load_snapshot(snapshot_path: str) -> Optional[dict]:
    if not os.path.exists(snapshot_path):
        return None
    try:
        with open(snapshot_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def save_snapshot(snapshot_path: str, assets: list):
    data = {
        "timestamp": datetime.now().isoformat(),
        "assets": {a.file_path: {"md5": a.md5, "size": a.size_bytes} for a in assets},
    }
    os.makedirs(os.path.dirname(snapshot_path) or ".", exist_ok=True)
    with open(snapshot_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _is_internal_path(path: str) -> bool:
    parts = Path(path).parts
    return any(p in SKIP_DIRS for p in parts)


def compute_diff(current_assets: list, prev_snapshot: dict) -> DiffResult:
    diff = DiffResult()
    current_map = {a.file_path: a for a in current_assets}
    prev_map = prev_snapshot.get("assets", {})

    for path, info in current_map.items():
        if _is_internal_path(path):
            continue
        if path not in prev_map:
            diff.added.append(path)
        elif info.md5 != prev_map[path].get("md5", ""):
            diff.replaced.append(path)

    for path in prev_map:
        if _is_internal_path(path):
            continue
        if path not in current_map:
            diff.deleted.append(path)

    return diff


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes}B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f}KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f}MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f}GB"


def generate_report(
    channel_results: dict,
    no_channel_assets: list,
    all_issues: list,
    diff: Optional[DiffResult],
    prev_timestamp: Optional[str],
    activity_dir: str,
) -> str:
    lines = []
    sep = "─" * 56
    double_sep = "═" * 56

    lines.append(double_sep)
    lines.append("  📋 社媒素材发版清单")
    lines.append(double_sep)
    lines.append(f"  活动目录: {activity_dir}")
    lines.append(f"  扫描时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(sep)

    if diff and (diff.added or diff.deleted or diff.replaced):
        lines.append("")
        lines.append("  🔄 与上次扫描对比")
        lines.append(sep)
        if prev_timestamp:
            lines.append(f"  上次扫描: {prev_timestamp}")
        if diff.added:
            lines.append(f"  ✅ 新增素材 ({len(diff.added)}):")
            for p in diff.added:
                lines.append(f"     + {p}")
        if diff.deleted:
            lines.append(f"  ❌ 已删除素材 ({len(diff.deleted)}):")
            for p in diff.deleted:
                lines.append(f"     - {p}")
        if diff.replaced:
            lines.append(f"  🔄 已替换素材 ({len(diff.replaced)}):")
            for p in diff.replaced:
                lines.append(f"     ↻ {p}")
        lines.append(sep)

    total_missing = 0
    total_issues = len(all_issues)
    channels_ok = 0

    for ch in CHANNELS:
        if ch not in channel_results:
            continue
        r = channel_results[ch]
        lines.append("")
        lines.append(f"  📢 {ch}")
        lines.append(sep)

        lines.append(f"  {'✅' if r.has_poster else '❌ 缺失'} 海报: {r.valid_poster_count}/{r.poster_count} 份")
        for d in r.poster_details:
            size_info = f" [{d['width']}x{d['height']}]" if d['width'] > 0 else ""
            status_icon = "✅" if d['is_valid'] else "❌"
            lines.append(f"     {status_icon} {d['name']}{size_info}")
        
        if r.poster_size_issues:
            lines.append("")
            lines.append("  📐 海报尺寸问题:")
            for issue in r.poster_size_issues:
                lines.append(f"     ❌ {issue['file']}")
                lines.append(f"        → {issue['issue']}")
                if issue['expected']:
                    lines.append(f"        期望尺寸: {issue['expected']}")

        lines.append(f"  {'✅' if r.has_video_cover else '❌ 缺失'} 视频封面: {r.valid_cover_count}/{r.video_cover_count} 份")
        for d in r.video_cover_details:
            size_info = f" [{d['width']}x{d['height']}]" if d['width'] > 0 else ""
            status_icon = "✅" if d['is_valid'] else "❌"
            lines.append(f"     {status_icon} {d['name']}{size_info}")
        
        if r.cover_size_issues:
            lines.append("")
            lines.append("  📐 封面尺寸问题:")
            for issue in r.cover_size_issues:
                lines.append(f"     ❌ {issue['file']}")
                lines.append(f"        → {issue['issue']}")
                if issue['expected']:
                    lines.append(f"        期望尺寸: {issue['expected']}")

        lines.append(f"  {'✅' if r.has_copy else '❌ 缺失'} 文案: {r.copy_count} 份")
        for d in r.copy_details:
            lines.append(f"     · {d}")

        lines.append(f"  {'✅' if r.has_landing_page else '❌ 缺失'} 落地页链接: {r.landing_page_count} 份")
        for d in r.landing_page_details:
            lines.append(f"     · {d}")

        lines.append(f"  {'✅' if r.has_approval else '❌ 缺失'} 审批备注: {r.approval_count} 份")
        for d in r.approval_details:
            lines.append(f"     · {d}")

        if r.multiple_finals:
            lines.append("")
            lines.append("  ⚠️ 同渠道存在多个终版:")
            for mf in r.multiple_finals:
                lines.append(f"     类型 [{mf['type']}]:")
                for fn in mf["files"]:
                    lines.append(f"     · {fn}")

        if r.missing_items:
            total_missing += len(r.missing_items)
            lines.append("")
            lines.append("  📝 待补充:")
            for i, item in enumerate(r.missing_items, 1):
                lines.append(f"     {i}. {item}")
        else:
            channels_ok += 1

        lines.append(sep)

    if no_channel_assets:
        lines.append("")
        lines.append("  ⚠️ 未识别渠道的素材")
        lines.append(sep)
        for a in no_channel_assets:
            lines.append(f"     · {a.file_name}")
            lines.append(f"       路径: {a.file_path}")
            hint = "请按「{渠道}_{类型}_{版本}」格式重命名"
            lines.append(f"       建议: {hint}")
        lines.append(sep)

    if all_issues:
        lines.append("")
        lines.append("  🐛 文件名问题汇总")
        lines.append(sep)
        for issue in all_issues:
            icon = {"空格": "🔧", "中文括号": "🔧", "版本标记冲突": "⚠️", "版本号跳跃": "⚠️"}.get(
                issue["issue_type"], "⚠️"
            )
            lines.append(f"  {icon} [{issue['issue_type']}] {issue['file_path']}")
            lines.append(f"     → {issue['detail']}")
        lines.append(sep)

    lines.append("")
    lines.append(double_sep)
    lines.append("  📊 总览")
    lines.append(double_sep)
    scanned_channels = len(channel_results)
    lines.append(f"  已扫描渠道: {scanned_channels}")
    lines.append(f"  完整渠道:   {channels_ok}/{scanned_channels}")
    lines.append(f"  缺失项合计: {total_missing}")
    lines.append(f"  文件名问题: {total_issues}")
    if diff:
        lines.append(f"  本次新增:   {len(diff.added)}")
        lines.append(f"  本次删除:   {len(diff.deleted)}")
        lines.append(f"  本次替换:   {len(diff.replaced)}")

    if total_missing == 0 and total_issues == 0 and not no_channel_assets:
        lines.append("")
        lines.append("  🎉 所有渠道素材齐全，无文件名问题，可以发版！")
    elif total_missing > 0:
        lines.append("")
        lines.append("  🔴 尚有素材缺失，暂不可发版，请相关人员尽快补充。")
    elif total_issues > 0:
        lines.append("")
        lines.append("  🟡 素材基本齐全，但文件名存在问题，建议修正后发版。")

    lines.append(double_sep)

    return "\n".join(lines)


def collect_all_issues(assets: list) -> list:
    issues = []
    for a in assets:
        for i in a.issues:
            issues.append(i)
    return issues


def main():
    parser = argparse.ArgumentParser(
        description="社媒素材发版清单扫描脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("activity_dir", help="活动目录路径")
    parser.add_argument(
        "--snapshot-dir",
        default=None,
        help="快照存储目录（默认为活动目录下的 .release_check）",
    )
    parser.add_argument(
        "--output",
        "-o",
        default=None,
        help="报告输出文件路径（默认输出到终端）",
    )
    parser.add_argument(
        "--no-snapshot",
        action="store_true",
        help="不保存快照（跳过差异对比）",
    )
    args = parser.parse_args()

    activity_dir = os.path.abspath(args.activity_dir)
    snapshot_dir = args.snapshot_dir or os.path.join(activity_dir, ".release_check")
    snapshot_path = os.path.join(snapshot_dir, "snapshot.json")

    assets = scan_directory(activity_dir)
    if not assets:
        print("⚠️ 目录下未找到任何素材文件。")
        sys.exit(0)

    channel_groups, no_channel_assets = group_by_channel(assets)

    channel_results = {}
    for ch, ch_assets in channel_groups.items():
        channel_results[ch] = check_channel_completeness(ch, ch_assets)

    all_issues = collect_all_issues(assets)

    diff = None
    prev_timestamp = None
    if not args.no_snapshot:
        prev = load_snapshot(snapshot_path)
        if prev:
            prev_timestamp = prev.get("timestamp", "")
            diff = compute_diff(assets, prev)
        save_snapshot(snapshot_path, assets)

    report = generate_report(
        channel_results=channel_results,
        no_channel_assets=no_channel_assets,
        all_issues=all_issues,
        diff=diff,
        prev_timestamp=prev_timestamp,
        activity_dir=activity_dir,
    )

    if args.output:
        os.makedirs(os.path.dirname(os.path.abspath(args.output)) or ".", exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"✅ 报告已输出到: {args.output}")
    else:
        print(report)


if __name__ == "__main__":
    main()
