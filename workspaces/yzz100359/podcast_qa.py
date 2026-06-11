#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
播客发布包巡检脚本
扫描节目目录，检查音频、封面、shownotes、口播标记和平台字段是否齐全。
"""

import os
import sys
import re
import json
import hashlib
import subprocess
from pathlib import Path
from datetime import datetime
from collections import defaultdict

try:
    import yaml
except ImportError:
    print("⚠️  未安装 PyYAML，请运行: pip3 install pyyaml")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("⚠️  未安装 Pillow，请运行: pip3 install pillow")
    sys.exit(1)


# ========== 配置 ==========
AUDIO_EXTS = {'.mp3', '.m4a', '.wav', '.aac', '.flac'}
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp'}
REQUIRED_PLATFORMS = ['xiaoyuzhou', 'bilibili', 'youtube', 'apple_podcast', 'ximalaya']
MIN_AUDIO_SECONDS = 60
MAX_AUDIO_SECONDS = 7200
EXPECTED_COVER_SIZES = [(3000, 3000), (1400, 1400)]
HASH_FILE = ".qa_hashes.json"
REPORT_FILE = "巡检报告.md"


# ========== 工具函数 ==========
def get_file_hash(filepath):
    """计算文件 SHA256 哈希"""
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def parse_timecode(time_str):
    """解析时间戳 HH:MM:SS 或 MM:SS 为秒数"""
    time_str = str(time_str).strip()
    if not time_str:
        return None
    parts = time_str.split(':')
    try:
        if len(parts) == 3:
            h, m, s = int(parts[0]), int(parts[1]), float(parts[2])
            return h * 3600 + m * 60 + s
        elif len(parts) == 2:
            m, s = int(parts[0]), float(parts[1])
            return m * 60 + s
        else:
            return float(parts[0])
    except (ValueError, IndexError):
        return None


def format_duration(seconds):
    """秒数格式化为 HH:MM:SS"""
    if seconds is None:
        return "未知"
    seconds = int(seconds)
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def get_audio_duration(filepath):
    """使用 ffprobe 获取音频时长（秒）"""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', str(filepath)],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except (subprocess.SubprocessError, ValueError):
        pass
    return None


def get_image_size(filepath):
    """获取图片尺寸 (width, height)"""
    try:
        with Image.open(filepath) as img:
            return img.size
    except Exception:
        return None


# ========== 巡检类 ==========
class PodcastQA:
    def __init__(self, root_dir):
        self.root_dir = Path(root_dir).resolve()
        self.issues = []
        self.file_infos = {}
        self.hash_store = self._load_hashes()
        self.new_hash_store = {}
        self.audio_dir = None
        self.cover_dir = None
        self.shownotes_dir = None
        self.ad_dir = None
        self.platform_dir = None
        self.max_audio_duration = None

    def _load_hashes(self):
        """加载上次的文件哈希记录"""
        hash_path = self.root_dir / HASH_FILE
        if hash_path.exists():
            try:
                with open(hash_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return {}
        return {}

    def _save_hashes(self):
        """保存本次的文件哈希记录"""
        hash_path = self.root_dir / HASH_FILE
        try:
            with open(hash_path, 'w', encoding='utf-8') as f:
                json.dump(self.new_hash_store, f, ensure_ascii=False, indent=2)
        except IOError:
            pass

    def add_issue(self, severity, category, file_path, message, needs_rework=True):
        """
        添加问题
        severity: error / warning / info
        category: 音频 / 封面 / shownotes / 口播 / 平台 / 文件名 / 变更
        """
        rel_path = str(Path(file_path).relative_to(self.root_dir)) if file_path else "-"
        file_hash = self.file_infos.get(rel_path, {}).get('hash', '') if rel_path != "-" else ''
        self.issues.append({
            'severity': severity,
            'category': category,
            'file_path': rel_path,
            'abs_path': str(file_path) if file_path else "",
            'message': message,
            'needs_rework': needs_rework,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'hash': file_hash
        })

    def scan_directories(self):
        """扫描目录结构"""
        dirs = {
            '音频': ['audio', '音频', 'audios'],
            '封面': ['cover', '封面', 'covers', 'artwork'],
            'shownotes': ['shownotes', 'show_notes', 'shownote', '备注'],
            '口播': ['口播', 'sponsor', 'ads', '广告', 'ad'],
            '平台': ['平台文案', 'platform', 'platforms', '标题', 'titles'],
        }

        for sub in self.root_dir.iterdir():
            if sub.is_dir():
                name = sub.name.lower()
                for key, keywords in dirs.items():
                    if any(kw in name for kw in keywords):
                        if key == '音频':
                            self.audio_dir = sub
                        elif key == '封面':
                            self.cover_dir = sub
                        elif key == 'shownotes':
                            self.shownotes_dir = sub
                        elif key == '口播':
                            self.ad_dir = sub
                        elif key == '平台':
                            self.platform_dir = sub
                        break

        if not self.audio_dir:
            self.add_issue('error', '音频', None, "未找到音频目录（应命名为：音频/audio/audios）", True)
        if not self.cover_dir:
            self.add_issue('error', '封面', None, "未找到封面目录（应命名为：封面/cover/artwork）", True)
        if not self.shownotes_dir:
            self.add_issue('error', 'shownotes', None, "未找到 shownotes 目录（应命名为：shownotes/show_notes）", True)
        if not self.ad_dir:
            self.add_issue('warning', '口播', None, "未找到口播/赞助标记目录（应命名为：口播/sponsor/ads）", True)
        if not self.platform_dir:
            self.add_issue('warning', '平台', None, "未找到平台文案目录（应命名为：平台文案/platforms）", True)

    def collect_files(self, directory):
        """收集目录中所有文件的信息"""
        if not directory or not directory.exists():
            return {}
        files = {}
        for f in directory.rglob('*'):
            if f.is_file() and not f.name.startswith('.'):
                rel = str(f.relative_to(self.root_dir))
                fhash = get_file_hash(f)
                old_hash = self.hash_store.get(rel, '')
                changed = old_hash != '' and old_hash != fhash
                is_new = old_hash == ''
                files[rel] = {
                    'path': f,
                    'hash': fhash,
                    'changed': changed,
                    'is_new': is_new,
                    'size': f.stat().st_size,
                    'mtime': datetime.fromtimestamp(f.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                }
                self.new_hash_store[rel] = fhash
                self.file_infos[rel] = files[rel]
        return files

    # ---------- 文件名检查 ----------
    def check_filename_spaces(self, files_dict):
        """检查文件名中的空格"""
        for rel, info in files_dict.items():
            basename = info['path'].name
            if ' ' in basename:
                self.add_issue(
                    'warning', '文件名', info['path'],
                    f"文件名包含空格：「{basename}」，建议改为下划线或连字符",
                    needs_rework=True
                )

    # ---------- 音频检查 ----------
    def check_audio(self):
        """检查音频文件"""
        if not self.audio_dir:
            return
        audio_files = self.collect_files(self.audio_dir)
        self.check_filename_spaces(audio_files)

        # 筛选出音频文件
        actual_audio = {k: v for k, v in audio_files.items() if v['path'].suffix.lower() in AUDIO_EXTS}

        if len(actual_audio) == 0:
            self.add_issue('error', '音频', None, "未找到任何音频文件", True)
            return

        # 检查是否有多个"最终版"音频
        final_keywords = ['final', '最终', '发布', 'release', 'v2', '定稿']
        final_audios = []
        for rel, info in actual_audio.items():
            name_lower = rel.lower()
            if any(kw in name_lower for kw in final_keywords):
                final_audios.append((rel, info))

        if len(final_audios) > 1:
            names = '、'.join(f"「{Path(r).name}」" for r, _ in final_audios)
            self.add_issue(
                'error', '音频', final_audios[0][1]['path'],
                f"存在 {len(final_audios)} 个最终版音频：{names}，请确认哪个是发布版本",
                needs_rework=True
            )

        # 检查每个音频的时长
        durations = []
        for rel, info in actual_audio.items():
            duration = get_audio_duration(info['path'])
            info['duration'] = duration
            durations.append(duration)
            dur_str = format_duration(duration)

            if duration is None:
                self.add_issue('error', '音频', info['path'],
                               f"无法读取音频时长：{Path(rel).name}", needs_rework=True)
                continue

            # 检查变更
            if info.get('changed'):
                self.add_issue('info', '变更', info['path'],
                               f"音频文件已被替换：{Path(rel).name}（时长 {dur_str}）",
                               needs_rework=False)
            elif info.get('is_new'):
                self.add_issue('info', '变更', info['path'],
                               f"新增音频文件：{Path(rel).name}（时长 {dur_str}）",
                               needs_rework=False)

            if duration < MIN_AUDIO_SECONDS:
                self.add_issue('warning', '音频', info['path'],
                               f"音频时长过短：{dur_str}（最短要求 {format_duration(MIN_AUDIO_SECONDS)}）",
                               needs_rework=True)
            elif duration > MAX_AUDIO_SECONDS:
                self.add_issue('warning', '音频', info['path'],
                               f"音频时长过长：{dur_str}（最长建议 {format_duration(MAX_AUDIO_SECONDS)}）",
                               needs_rework=False)
            else:
                self.add_issue('info', '音频', info['path'],
                               f"音频时长正常：{dur_str}", needs_rework=False)

        # 取最长的音频作为参考时长（用于口播检查）
        valid_durations = [d for d in durations if d is not None]
        if valid_durations:
            self.max_audio_duration = max(valid_durations)

    # ---------- 封面检查 ----------
    def check_cover(self):
        """检查封面图片"""
        if not self.cover_dir:
            return
        cover_files = self.collect_files(self.cover_dir)
        self.check_filename_spaces(cover_files)

        actual_images = {k: v for k, v in cover_files.items() if v['path'].suffix.lower() in IMAGE_EXTS}

        if len(actual_images) == 0:
            self.add_issue('error', '封面', None, "未找到任何封面图片文件", True)
            return

        for rel, info in actual_images.items():
            image_size = get_image_size(info['path'])
            info['image_size'] = image_size
            size = image_size

            if size is None:
                self.add_issue('error', '封面', info['path'],
                               f"无法读取图片尺寸：{Path(rel).name}", needs_rework=True)
                continue

            w, h = size

            # 检查变更
            if info.get('changed'):
                self.add_issue('info', '变更', info['path'],
                               f"封面已被替换：{Path(rel).name}（{w}x{h}）",
                               needs_rework=False)
            elif info.get('is_new'):
                self.add_issue('info', '变更', info['path'],
                               f"新增封面：{Path(rel).name}（{w}x{h}）",
                               needs_rework=False)

            # 正方形检查
            if w != h:
                self.add_issue('warning', '封面', info['path'],
                               f"封面非正方形：{w}x{h}，平台通常要求 1:1",
                               needs_rework=True)
                continue

            # 标准尺寸检查
            is_standard = any(
                abs(w - ew) < 50 and abs(h - eh) < 50
                for ew, eh in EXPECTED_COVER_SIZES
            )

            if w < 1400:
                self.add_issue('error', '封面', info['path'],
                               f"封面尺寸过小：{w}x{h}（最小要求 1400x1400）",
                               needs_rework=True)
            elif not is_standard:
                self.add_issue('warning', '封面', info['path'],
                               f"封面非标准尺寸：{w}x{h}（建议 1400x1400 或 3000x3000）",
                               needs_rework=True)
            else:
                self.add_issue('info', '封面', info['path'],
                               f"封面尺寸正常：{w}x{h}", needs_rework=False)

    # ---------- Shownotes 检查 ----------
    def check_shownotes(self):
        """检查 shownotes 中的链接"""
        if not self.shownotes_dir:
            return
        note_files = self.collect_files(self.shownotes_dir)
        self.check_filename_spaces(note_files)

        md_files = {k: v for k, v in note_files.items() if v['path'].suffix.lower() in {'.md', '.markdown', '.txt'}}

        if len(md_files) == 0:
            self.add_issue('error', 'shownotes', None, "未找到 shownotes 文档（.md/.txt）", True)
            return

        # markdown 链接正则: [text](url)
        link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
        # 裸链接检测
        bare_link_pattern = re.compile(r'(?<![\(\)\w])((?:https?://)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s<]*)?)')

        for rel, info in md_files.items():
            try:
                with open(info['path'], 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                self.add_issue('error', 'shownotes', info['path'],
                               f"文件编码无法读取，请使用 UTF-8：{Path(rel).name}", needs_rework=True)
                continue

            # 检查变更
            if info.get('changed'):
                self.add_issue('info', '变更', info['path'],
                               f"Shownotes 已修改：{Path(rel).name}", needs_rework=False)
            elif info.get('is_new'):
                self.add_issue('info', '变更', info['path'],
                               f"新增 Shownotes：{Path(rel).name}", needs_rework=False)

            # 提取 markdown 链接
            links = link_pattern.findall(content)
            if not links:
                self.add_issue('warning', 'shownotes', info['path'],
                               "未找到任何 Markdown 链接", needs_rework=False)

            for text, url in links:
                url = url.strip()
                if not url:
                    self.add_issue('warning', 'shownotes', info['path'],
                                   f"链接「{text}」URL 为空", needs_rework=True)
                    continue

                # 检查协议头
                if not re.match(r'^https?://', url, re.IGNORECASE):
                    if url.startswith('mailto:') or url.startswith('#') or url.startswith('/'):
                        continue
                    self.add_issue(
                        'error', 'shownotes', info['path'],
                        f"链接缺少协议头：「{text}」→ ({url})，请补充 https:// 或 http://",
                        needs_rework=True
                    )

            # 检查时间线
            timeline_pattern = re.compile(r'^[-*]\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$', re.MULTILINE)
            timelines = timeline_pattern.findall(content)
            if timelines:
                self.add_issue('info', 'shownotes', info['path'],
                               f"检测到 {len(timelines)} 条时间线标记", needs_rework=False)
            else:
                self.add_issue('warning', 'shownotes', info['path'],
                               "未检测到时间线标记（格式如：- 03:25 章节名）",
                               needs_rework=False)

    # ---------- 口播时间点检查 ----------
    def check_ads(self):
        """检查口播赞助标记"""
        if not self.ad_dir:
            return
        ad_files = self.collect_files(self.ad_dir)
        self.check_filename_spaces(ad_files)

        json_files = {k: v for k, v in ad_files.items() if v['path'].suffix.lower() == '.json'}
        yaml_files = {k: v for k, v in ad_files.items() if v['path'].suffix.lower() in {'.yaml', '.yml'}}
        all_configs = {**json_files, **yaml_files}

        if len(all_configs) == 0:
            self.add_issue('warning', '口播', None,
                           "未找到口播时间点配置文件（.json/.yaml）", needs_rework=True)
            return

        for rel, info in all_configs.items():
            # 检查变更
            if info.get('changed'):
                self.add_issue('info', '变更', info['path'],
                               f"口播配置已修改：{Path(rel).name}", needs_rework=False)
            elif info.get('is_new'):
                self.add_issue('info', '变更', info['path'],
                               f"新增口播配置：{Path(rel).name}", needs_rework=False)

            try:
                with open(info['path'], 'r', encoding='utf-8') as f:
                    if info['path'].suffix.lower() == '.json':
                        data = json.load(f)
                    else:
                        data = yaml.safe_load(f)
            except (json.JSONDecodeError, yaml.YAMLError, UnicodeDecodeError) as e:
                self.add_issue('error', '口播', info['path'],
                               f"配置文件解析失败：{str(e)}", needs_rework=True)
                continue

            # 提取赞助口播片段
            segments = []
            if isinstance(data, dict):
                if 'sponsor_segments' in data and isinstance(data['sponsor_segments'], list):
                    segments = data['sponsor_segments']
                elif 'ads' in data and isinstance(data['ads'], list):
                    segments = data['ads']
                # 也检查 intro/outro
                for key in ['intro', 'outro']:
                    if key in data and isinstance(data[key], str) and '-' in data[key]:
                        s, e = data[key].split('-', 1)
                        segments.append({'brand': f'[{key}]', 'start': s, 'end': e})

            if not segments:
                self.add_issue('warning', '口播', info['path'],
                               "未检测到赞助口播时间段（sponsor_segments/ads）",
                               needs_rework=False)
                continue

            # 检查每个片段
            for i, seg in enumerate(segments):
                brand = seg.get('brand', f'片段{i+1}')
                start_str = seg.get('start', '')
                end_str = seg.get('end', '')

                if not start_str or not end_str:
                    self.add_issue('error', '口播', info['path'],
                                   f"赞助「{brand}」缺少 start 或 end 时间",
                                   needs_rework=True)
                    continue

                start_sec = parse_timecode(start_str)
                end_sec = parse_timecode(end_str)

                if start_sec is None or end_sec is None:
                    self.add_issue('error', '口播', info['path'],
                                   f"赞助「{brand}」时间格式错误：{start_str}-{end_str}",
                                   needs_rework=True)
                    continue

                if start_sec >= end_sec:
                    self.add_issue('error', '口播', info['path'],
                                   f"赞助「{brand}」开始时间晚于结束时间：{start_str}-{end_str}",
                                   needs_rework=True)
                    continue

                # 检查是否超出音频长度
                if self.max_audio_duration is not None:
                    if end_sec > self.max_audio_duration:
                        over = format_duration(end_sec - self.max_audio_duration)
                        self.add_issue(
                            'error', '口播', info['path'],
                            f"赞助「{brand}」结束时间 {end_str} 超出音频长度 "
                            f"（{format_duration(self.max_audio_duration)}），超出 {over}",
                            needs_rework=True
                        )
                    elif start_sec > self.max_audio_duration:
                        self.add_issue(
                            'error', '口播', info['path'],
                            f"赞助「{brand}」开始时间 {start_str} 已超出音频长度",
                            needs_rework=True
                        )
                    else:
                        self.add_issue(
                            'info', '口播', info['path'],
                            f"赞助「{brand}」时间正常：{start_str}-{end_str} "
                            f"（时长 {format_duration(end_sec - start_sec)}）",
                            needs_rework=False
                        )
                else:
                    self.add_issue('info', '口播', info['path'],
                                   f"赞助「{brand}」：{start_str}-{end_str}",
                                   needs_rework=False)

    # ---------- 平台文案检查 ----------
    def check_platforms(self):
        """检查各平台文案字段"""
        if not self.platform_dir:
            return
        plat_files = self.collect_files(self.platform_dir)
        self.check_filename_spaces(plat_files)

        yaml_files = {k: v for k, v in plat_files.items() if v['path'].suffix.lower() in {'.yaml', '.yml'}}
        json_files = {k: v for k, v in plat_files.items() if v['path'].suffix.lower() == '.json'}
        all_configs = {**yaml_files, **json_files}

        if len(all_configs) == 0:
            self.add_issue('error', '平台', None,
                           "未找到平台文案配置文件（.yaml/.json）", needs_rework=True)
            return

        for rel, info in all_configs.items():
            # 检查变更
            if info.get('changed'):
                self.add_issue('info', '变更', info['path'],
                               f"平台文案已修改：{Path(rel).name}", needs_rework=False)
            elif info.get('is_new'):
                self.add_issue('info', '变更', info['path'],
                               f"新增平台文案：{Path(rel).name}", needs_rework=False)

            try:
                with open(info['path'], 'r', encoding='utf-8') as f:
                    if info['path'].suffix.lower() == '.json':
                        data = json.load(f)
                    else:
                        data = yaml.safe_load(f)
            except (json.JSONDecodeError, yaml.YAMLError, UnicodeDecodeError) as e:
                self.add_issue('error', '平台', info['path'],
                               f"配置文件解析失败：{str(e)}", needs_rework=True)
                continue

            if not isinstance(data, dict):
                self.add_issue('error', '平台', info['path'],
                               "配置文件格式错误，顶层应为对象", needs_rework=True)
                continue

            found_platforms = set(data.keys())
            platform_required_fields = {
                'xiaoyuzhou': ['title', 'description'],
                'bilibili': ['title'],
                'youtube': ['title', 'description'],
                'apple_podcast': ['title', 'description'],
                'ximalaya': ['title'],
            }

            # 检查必需平台是否缺失
            for pf in REQUIRED_PLATFORMS:
                if pf not in found_platforms:
                    self.add_issue(
                        'error', '平台', info['path'],
                        f"缺少「{pf}」平台文案",
                        needs_rework=True
                    )

            # 检查每个平台的必需字段
            for pf, pf_data in data.items():
                if not isinstance(pf_data, dict):
                    self.add_issue('warning', '平台', info['path'],
                                   f"「{pf}」平台配置格式错误，应为对象", needs_rework=True)
                    continue

                required = platform_required_fields.get(pf, ['title'])
                missing = [f for f in required if not pf_data.get(f)]
                if missing:
                    self.add_issue(
                        'error', '平台', info['path'],
                        f"「{pf}」缺少字段：{', '.join(missing)}",
                        needs_rework=True
                    )
                else:
                    fields_count = len([v for v in pf_data.values() if v])
                    self.add_issue(
                        'info', '平台', info['path'],
                        f"「{pf}」文案字段齐全（{fields_count} 项）",
                        needs_rework=False
                    )

                # 检查标题长度
                title = pf_data.get('title', '')
                if title:
                    title_len = len(str(title))
                    if pf == 'bilibili' and title_len > 80:
                        self.add_issue('warning', '平台', info['path'],
                                       f"「{pf}」标题过长（{title_len}字，建议≤80）",
                                       needs_rework=True)
                    elif pf == 'xiaoyuzhou' and title_len > 60:
                        self.add_issue('warning', '平台', info['path'],
                                       f"「{pf}」标题过长（{title_len}字，建议≤60）",
                                       needs_rework=True)

    # ---------- 生成报告 ----------
    def generate_report(self):
        """生成巡检报告"""
        # 统计
        total = len(self.issues)
        errors = [i for i in self.issues if i['severity'] == 'error']
        warnings = [i for i in self.issues if i['severity'] == 'warning']
        infos = [i for i in self.issues if i['severity'] == 'info']
        rework_issues = [i for i in self.issues if i['needs_rework']]

        # 排序：返工优先 → 严重程度 → 类别 → 文件
        severity_rank = {'error': 0, 'warning': 1, 'info': 2}
        category_order = {'音频': 0, '封面': 1, '平台': 2, '口播': 3, 'shownotes': 4, '文件名': 5, '变更': 6}

        sorted_issues = sorted(
            self.issues,
            key=lambda x: (
                0 if x['needs_rework'] else 1,
                severity_rank.get(x['severity'], 9),
                category_order.get(x['category'], 99),
                x['file_path']
            )
        )

        lines = []
        lines.append(f"# 🎙️ 播客发布包巡检报告")
        lines.append("")
        lines.append(f"**巡检时间**：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"**巡检目录**：`{self.root_dir}`")
        lines.append("")

        # ===== 主理人视图（只看待补） =====
        lines.append("---")
        lines.append("")
        lines.append("## 🚨 主理人视图：待补事项（只看需要返工的）")
        lines.append("")
        if rework_issues:
            lines.append(f"> 共 **{len(rework_issues)}** 项需要处理")
            lines.append("")
            current_cat = None
            for issue in rework_issues:
                cat = issue['category']
                if cat != current_cat:
                    lines.append(f"### 📂 {cat}")
                    lines.append("")
                    current_cat = cat
                sev_icon = {'error': '🔴', 'warning': '🟡'}.get(issue['severity'], '⚪')
                fp = f"`{issue['file_path']}`" if issue['file_path'] != "-" else "—"
                lines.append(f"- {sev_icon} **{issue['message']}**（{fp}）")
            lines.append("")
        else:
            lines.append("✅ **全部通过，无需返工！**")
            lines.append("")

        # ===== 剪辑师视图（完整报告，返工在前） =====
        lines.append("---")
        lines.append("")
        lines.append("## 📋 剪辑师视图：完整报告（返工文件已前置）")
        lines.append("")

        # 概览统计
        lines.append("### 概览")
        lines.append("")
        lines.append(f"| 指标 | 数量 |")
        lines.append(f"|------|------|")
        lines.append(f"| 🔴 错误 | {len(errors)} |")
        lines.append(f"| 🟡 警告 | {len(warnings)} |")
        lines.append(f"| ℹ️  信息 | {len(infos)} |")
        lines.append(f"| 🛠️  **需返工** | **{len(rework_issues)}** |")
        lines.append(f"| **总计** | **{total}** |")
        lines.append("")

        # 按返工/已通过分组
        lines.append("### 🛠️ 需要返工 / 修正")
        lines.append("")
        if rework_issues:
            lines.append("| 级别 | 类别 | 文件 | 问题说明 |")
            lines.append("|------|------|------|----------|")
            for issue in rework_issues:
                sev = {'error': '🔴 错误', 'warning': '🟡 警告'}.get(issue['severity'], issue['severity'])
                fp = f"`{issue['file_path']}`" if issue['file_path'] != "-" else "—"
                lines.append(f"| {sev} | {issue['category']} | {fp} | {issue['message']} |")
            lines.append("")
        else:
            lines.append("✅ **没有需要返工的项目，做得好！**")
            lines.append("")

        # 信息类（不需要返工，包括变更通知、正常项）
        ok_issues = [i for i in sorted_issues if not i['needs_rework']]
        lines.append("### ✅ 正常 / 变更记录")
        lines.append("")
        if ok_issues:
            lines.append("| 级别 | 类别 | 文件 | 说明 |")
            lines.append("|------|------|------|------|")
            for issue in ok_issues:
                sev = {'info': 'ℹ️  信息', 'warning': '🟡 警告'}.get(issue['severity'], issue['severity'])
                fp = f"`{issue['file_path']}`" if issue['file_path'] != "-" else "—"
                lines.append(f"| {sev} | {issue['category']} | {fp} | {issue['message']} |")
            lines.append("")
        else:
            lines.append("（无）")
            lines.append("")

        # 文件变更追踪
        changed_files = [(rel, info) for rel, info in self.file_infos.items() if info.get('changed')]
        new_files = [(rel, info) for rel, info in self.file_infos.items() if info.get('is_new') and not info.get('changed')]

        if changed_files or new_files:
            lines.append("---")
            lines.append("")
            lines.append("## 🔄 文件变更追踪")
            lines.append("")
            if new_files:
                lines.append(f"### 🆕 新增文件（{len(new_files)}）")
                lines.append("")
                lines.append("| 文件 | 大小 | 修改时间 |")
                lines.append("|------|------|----------|")
                for rel, info in new_files:
                    sz = f"{info['size']/1024/1024:.1f} MB" if info['size'] > 1024*1024 else f"{info['size']/1024:.1f} KB"
                    lines.append(f"| `{rel}` | {sz} | {info['mtime']} |")
                lines.append("")
            if changed_files:
                lines.append(f"### ♻️ 已替换文件（{len(changed_files)}）")
                lines.append("")
                lines.append("| 文件 | 大小 | 修改时间 |")
                lines.append("|------|------|----------|")
                for rel, info in changed_files:
                    sz = f"{info['size']/1024/1024:.1f} MB" if info['size'] > 1024*1024 else f"{info['size']/1024:.1f} KB"
                    lines.append(f"| `{rel}` | {sz} | {info['mtime']} |")
                lines.append("")

        # 参考标准
        lines.append("---")
        lines.append("")
        lines.append("## 📖 参考规范")
        lines.append("")
        lines.append("| 项目 | 要求 |")
        lines.append("|------|------|")
        lines.append(f"| 音频时长 | {format_duration(MIN_AUDIO_SECONDS)} ~ {format_duration(MAX_AUDIO_SECONDS)} |")
        lines.append(f"| 封面尺寸 | 1:1 正方形，最小 1400x1400，推荐 3000x3000 |")
        lines.append(f"| 链接协议 | 必须含 https:// 或 http:// |")
        lines.append(f"| 必填平台 | {', '.join(REQUIRED_PLATFORMS)} |")
        lines.append(f"| 文件名 | 避免使用空格 |")
        lines.append("")

        report_content = '\n'.join(lines)

        # 写入报告文件
        report_path = self.root_dir / REPORT_FILE
        try:
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(report_content)
            print(f"✅ 报告已写入：{report_path}")
        except IOError as e:
            print(f"⚠️  无法写入报告文件：{e}")

        # 保存 hash
        self._save_hashes()

        return report_content, len(rework_issues), len(errors)

    def run(self):
        """执行完整巡检"""
        print(f"🚀 开始巡检目录：{self.root_dir}")
        print()

        print("📁 扫描目录结构...")
        self.scan_directories()

        print("🎵 检查音频文件...")
        self.check_audio()

        print("🖼️  检查封面图片...")
        self.check_cover()

        print("📝 检查 Shownotes...")
        self.check_shownotes()

        print("📢 检查口播时间点...")
        self.check_ads()

        print("📱 检查平台文案...")
        self.check_platforms()

        print()
        print("📊 生成巡检报告...")
        report, rework_count, error_count = self.generate_report()

        print()
        print("=" * 50)
        if error_count > 0 or rework_count > 0:
            print(f"⚠️  发现 {error_count} 个错误，{rework_count} 项需要返工")
        else:
            print("🎉 全部检查通过！")
        print("=" * 50)

        return error_count == 0 and rework_count == 0


# ========== 命令行入口 ==========
def main():
    if len(sys.argv) < 2:
        # 默认使用当前目录下的 节目 文件夹
        script_dir = Path(__file__).parent
        programs_dir = script_dir / '节目'
        if programs_dir.exists():
            # 找最新的一期
            episodes = sorted([d for d in programs_dir.iterdir() if d.is_dir()],
                              key=lambda x: x.stat().st_mtime, reverse=True)
            if episodes:
                target = episodes[0]
                print(f"🔍 自动选择最新一期：{target.name}")
            else:
                print("用法: python3 podcast_qa.py <节目目录路径>")
                print(f"示例: python3 podcast_qa.py \"{programs_dir}/EP056_AI时代的创造力\"")
                sys.exit(1)
        else:
            print("用法: python3 podcast_qa.py <节目目录路径>")
            sys.exit(1)
    else:
        target = Path(sys.argv[1]).resolve()
        if not target.exists():
            print(f"❌ 目录不存在：{target}")
            sys.exit(1)
        if not target.is_dir():
            print(f"❌ 路径不是目录：{target}")
            sys.exit(1)

    qa = PodcastQA(target)
    passed = qa.run()

    sys.exit(0 if passed else 2)


if __name__ == '__main__':
    main()
