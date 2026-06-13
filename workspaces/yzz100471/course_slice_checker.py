#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
课程视频切片清单脚本
功能：扫描课程目录，检查切片完整性、时间重叠、标题一致性、封面缺失等
"""

import os
import re
import json
import sys
import csv
import argparse
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import difflib


# ==================== 数据模型 ====================

@dataclass
class SliceInfo:
    """切片信息"""
    index: int
    title: str
    start_time: float
    end_time: float
    duration: float
    video_file: str = ""
    subtitle_file: str = ""
    cover_file: str = ""
    handout_page: int = 0
    chapter: str = ""
    notes: List[str] = field(default_factory=list)
    issues: List[Dict] = field(default_factory=list)

    @property
    def time_range_str(self) -> str:
        return f"{format_time(self.start_time)} - {format_time(self.end_time)}"

    def to_dict(self) -> Dict:
        d = asdict(self)
        d['time_range'] = self.time_range_str
        return d


@dataclass
class ChapterInfo:
    """章节信息"""
    name: str
    slices: List[SliceInfo] = field(default_factory=list)
    total_duration: float = 0.0

    def add_slice(self, slice_info: SliceInfo):
        self.slices.append(slice_info)
        self.total_duration += slice_info.duration


@dataclass
class CourseInfo:
    """课程信息"""
    name: str
    path: str
    original_video: str = ""
    original_duration: float = 0.0
    chapters: List[ChapterInfo] = field(default_factory=list)
    title_table_file: str = ""
    subtitle_dir: str = ""
    cover_dir: str = ""
    handout_file: str = ""


@dataclass
class CheckResult:
    """检查结果"""
    check_type: str
    level: str  # error, warning, info
    message: str
    slice_index: Optional[int] = None
    slice_title: str = ""
    details: Dict = field(default_factory=dict)


# ==================== 工具函数 ====================

def format_time(seconds: float) -> str:
    """将秒数格式化为 HH:MM:SS"""
    if seconds < 0:
        return f"-{format_time(-seconds)}"
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 100)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:02d}"


def parse_time(time_str: str) -> float:
    """解析时间字符串为秒数，支持多种格式"""
    time_str = time_str.strip().replace(' ', '')
    
    patterns = [
        r'(\d+):(\d+):(\d+)[.,](\d+)',
        r'(\d+):(\d+):(\d+)',
        r'(\d+):(\d+)[.,](\d+)',
        r'(\d+):(\d+)',
        r'(\d+)[.,](\d+)',
        r'(\d+)',
    ]
    
    for pattern in patterns:
        m = re.match(pattern, time_str)
        if m:
            parts = m.groups()
            if len(parts) == 4:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2]) + int(parts[3]) / 100
            elif len(parts) == 3 and ':' in time_str:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            elif len(parts) == 3:
                return int(parts[0]) * 60 + int(parts[1]) + int(parts[2]) / 100
            elif len(parts) == 2 and ':' in time_str:
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 2:
                return int(parts[0]) + int(parts[1]) / 100
            elif len(parts) == 1:
                return float(parts[0])
    
    raise ValueError(f"无法解析时间: {time_str}")


def clean_filename(filename: str) -> str:
    """清理文件名中的特殊字符，保留中文"""
    filename = filename.strip()
    filename = re.sub(r'[\r\n\t]+', ' ', filename)
    filename = re.sub(r' +', ' ', filename)
    return filename


def has_chinese_spaces(filename: str) -> bool:
    """检查文件名是否包含中文空格（全角空格）"""
    return '\u3000' in filename


def get_video_duration(file_path: str) -> float:
    """获取视频时长（优先使用ffprobe，否则返回0）"""
    try:
        import subprocess
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', file_path],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except Exception:
        pass
    return 0.0


def read_srt_subtitles(srt_file: str) -> List[Dict]:
    """读取SRT字幕文件，返回字幕条目列表"""
    subtitles = []
    if not os.path.exists(srt_file):
        return subtitles
    
    with open(srt_file, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    pattern = r'(\d+)\r?\n(\d+:\d+:\d+,\d+) --> (\d+:\d+:\d+,\d+)\r?\n(.*?)(?:\r?\n\r?\n|\Z)'
    for match in re.finditer(pattern, content, re.DOTALL):
        idx = int(match.group(1))
        start = parse_time(match.group(2).replace(',', '.'))
        end = parse_time(match.group(3).replace(',', '.'))
        text = match.group(4).strip()
        subtitles.append({'index': idx, 'start': start, 'end': end, 'text': text})
    
    return subtitles


def read_vtt_subtitles(vtt_file: str) -> List[Dict]:
    """读取VTT字幕文件"""
    subtitles = []
    if not os.path.exists(vtt_file):
        return subtitles
    
    with open(vtt_file, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    i = 0
    while i < len(lines) and not lines[i].strip():
        i += 1
    if i < len(lines) and 'WEBVTT' in lines[i]:
        i += 1
    
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if '-->' in line:
            times = line.split('-->')
            if len(times) >= 2:
                start = parse_time(times[0].strip().replace(',', '.'))
                end = parse_time(times[1].strip().replace(',', '.'))
                i += 1
                text_parts = []
                while i < len(lines) and lines[i].strip():
                    text_parts.append(lines[i].strip())
                    i += 1
                subtitles.append({'start': start, 'end': end, 'text': '\n'.join(text_parts)})
        i += 1
    
    return subtitles


def read_subtitles(sub_file: str) -> List[Dict]:
    """根据扩展名读取字幕文件"""
    ext = os.path.splitext(sub_file)[1].lower()
    if ext == '.srt':
        return read_srt_subtitles(sub_file)
    elif ext == '.vtt':
        return read_vtt_subtitles(sub_file)
    return []


def read_title_table(csv_file: str) -> List[Dict]:
    """读取标题表CSV文件"""
    titles = []
    if not os.path.exists(csv_file):
        return titles
    
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cleaned = {k.strip(): v.strip() for k, v in row.items() if k.strip()}
            if cleaned:
                titles.append(cleaned)
    return titles


# ==================== 扫描器 ====================

class CourseScanner:
    """课程目录扫描器"""
    
    VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.mkv', '.flv', '.webm']
    SUBTITLE_EXTS = ['.srt', '.vtt']
    IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    HANDOUT_EXTS = ['.pdf', '.doc', '.docx']
    
    def __init__(self, course_path: str):
        self.course_path = os.path.abspath(course_path)
        self.course_name = os.path.basename(self.course_path)
    
    def scan(self) -> CourseInfo:
        """扫描课程目录"""
        course = CourseInfo(name=self.course_name, path=self.course_path)
        
        if not os.path.exists(self.course_path):
            raise FileNotFoundError(f"课程目录不存在: {self.course_path}")
        
        course.original_video = self._find_original_video()
        if course.original_video:
            course.original_duration = get_video_duration(course.original_video)
        
        course.title_table_file = self._find_title_table()
        course.subtitle_dir = self._find_subtitle_dir()
        course.cover_dir = self._find_cover_dir()
        course.handout_file = self._find_handout()
        
        course.chapters = self._scan_chapters()
        
        return course
    
    def _find_original_video(self) -> str:
        """查找原始视频（整节课）"""
        for root, dirs, files in os.walk(self.course_path):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in self.VIDEO_EXTS:
                    if any(key in file.lower() for key in ['完整', '原版', '原片', '整节', 'original', 'full']):
                        return os.path.join(root, file)
                    if root == self.course_path and not dirs:
                        return os.path.join(root, file)
        
        for file in os.listdir(self.course_path):
            ext = os.path.splitext(file)[1].lower()
            if ext in self.VIDEO_EXTS:
                return os.path.join(self.course_path, file)
        
        return ""
    
    def _find_title_table(self) -> str:
        """查找标题表文件"""
        for root, dirs, files in os.walk(self.course_path):
            for file in files:
                lower_file = file.lower()
                if '标题' in file or 'title' in lower_file:
                    if lower_file.endswith('.csv') or lower_file.endswith('.xlsx') or lower_file.endswith('.xls'):
                        return os.path.join(root, file)
        return ""
    
    def _find_subtitle_dir(self) -> str:
        """查找字幕目录"""
        for root, dirs, files in os.walk(self.course_path):
            dir_name = os.path.basename(root)
            if '字幕' in dir_name or 'subtitle' in dir_name.lower():
                return root
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in self.SUBTITLE_EXTS:
                    return root
        return ""
    
    def _find_cover_dir(self) -> str:
        """查找封面目录"""
        for root, dirs, files in os.walk(self.course_path):
            dir_name = os.path.basename(root)
            if '封面' in dir_name or 'cover' in dir_name.lower():
                return root
        return ""
    
    def _find_handout(self) -> str:
        """查找讲义文件"""
        for root, dirs, files in os.walk(self.course_path):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in self.HANDOUT_EXTS:
                    if '讲义' in file or 'handout' in file.lower() or 'slide' in file.lower():
                        return os.path.join(root, file)
        return ""
    
    def _scan_chapters(self) -> List[ChapterInfo]:
        """扫描章节和切片"""
        chapters = {}
        default_chapter = ChapterInfo(name="默认章节")
        all_slices = []
        
        slice_dirs = self._find_slice_directories()
        
        for slice_dir in slice_dirs:
            chapter_name = os.path.basename(slice_dir)
            if chapter_name not in chapters:
                chapters[chapter_name] = ChapterInfo(name=chapter_name)
            
            slices = self._scan_slice_directory(slice_dir, chapter_name)
            for slice_info in slices:
                chapters[chapter_name].add_slice(slice_info)
                all_slices.append(slice_info)
        
        if not chapters:
            default_slices = self._scan_slice_directory(self.course_path, "默认章节")
            for slice_info in default_slices:
                default_chapter.add_slice(slice_info)
                all_slices.append(slice_info)
            if default_chapter.slices:
                chapters["默认章节"] = default_chapter
        
        all_slices.sort(key=lambda s: s.start_time if s.start_time >= 0 else float('inf'))
        for idx, slice_info in enumerate(all_slices, 1):
            slice_info.index = idx
        
        return list(chapters.values())
    
    def _find_slice_directories(self) -> List[str]:
        """查找切片目录"""
        dirs = []
        for entry in os.listdir(self.course_path):
            full_path = os.path.join(self.course_path, entry)
            if os.path.isdir(full_path):
                if any(kw in entry for kw in ['第', '章', '节', 'part', 'section', 'chapter']) or \
                   any(f.endswith(tuple(self.VIDEO_EXTS)) for f in os.listdir(full_path) if os.path.isfile(os.path.join(full_path, f))):
                    dirs.append(full_path)
        return sorted(dirs)
    
    def _scan_slice_directory(self, dir_path: str, chapter_name: str) -> List[SliceInfo]:
        """扫描单个切片目录"""
        slices = []
        files = sorted(os.listdir(dir_path))
        
        video_files = [f for f in files if os.path.splitext(f)[1].lower() in self.VIDEO_EXTS]
        
        for video_file in video_files:
            video_path = os.path.join(dir_path, video_file)
            clean_name = clean_filename(video_file)
            base_name = os.path.splitext(clean_name)[0]
            
            file_idx = self._extract_number_prefix(base_name)
            start_time, end_time, title = self._parse_slice_filename(base_name)
            duration = get_video_duration(video_path)
            if duration <= 0 and start_time >= 0 and end_time > start_time:
                duration = end_time - start_time
            
            slice_info = SliceInfo(
                index=file_idx or 0,
                title=title or base_name,
                start_time=start_time,
                end_time=end_time,
                duration=duration,
                video_file=video_path,
                chapter=chapter_name
            )
            
            if has_chinese_spaces(video_file):
                slice_info.notes.append("文件名包含中文全角空格")
            
            subtitle_file = self._find_matching_subtitle(base_name, dir_path, file_idx)
            if subtitle_file:
                slice_info.subtitle_file = subtitle_file
            
            cover_file = self._find_matching_cover(base_name, dir_path, file_idx)
            if cover_file:
                slice_info.cover_file = cover_file
            
            slice_info.handout_page = self._parse_handout_page(base_name)
            
            slices.append(slice_info)
        
        return slices
    
    def _parse_slice_filename(self, filename: str) -> Tuple[float, float, str]:
        """从文件名解析切片信息"""
        start_time = -1.0
        end_time = -1.0
        title = filename
        
        time_pattern = r'(\d{1,2}[:.]\d{1,2}[:.]\d{1,2}(?:[.,]\d+)?)[_\-\s~至到]*(\d{1,2}[:.]\d{1,2}[:.]\d{1,2}(?:[.,]\d+)?)?'
        m = re.search(time_pattern, filename)
        if m:
            try:
                start_time = parse_time(m.group(1))
                if m.group(2):
                    end_time = parse_time(m.group(2))
            except ValueError:
                pass
        
        title = re.sub(time_pattern, '', filename).strip()
        title = re.sub(r'^[\d\s_\-.]+', '', title)
        title = re.sub(r'[_\-\s]+[Pp]\d+\s*$', '', title)
        title = re.sub(r'[_\-\s]+[页页]\d+\s*$', '', title)
        title = re.sub(r'[\s_\-.]+', ' ', title).strip()
        
        return start_time, end_time, title
    
    def _extract_number_prefix(self, filename: str) -> Optional[int]:
        """从文件名提取数字前缀"""
        m = re.match(r'^(\d{1,3})[_\-\s]', filename)
        if m:
            return int(m.group(1))
        return None
    
    def _find_matching_subtitle(self, base_name: str, dir_path: str, slice_idx: int = None) -> str:
        """查找匹配的字幕文件"""
        subtitle_files = []
        for root, dirs, files in os.walk(self.course_path):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in self.SUBTITLE_EXTS:
                    subtitle_files.append((f, os.path.join(root, f)))
        
        if slice_idx is not None:
            for f, full_path in subtitle_files:
                f_num = self._extract_number_prefix(f)
                if f_num == slice_idx:
                    return full_path
        
        for f, full_path in subtitle_files:
            f_base = os.path.splitext(f)[0]
            if base_name in f_base or f_base in base_name:
                return full_path
        
        for f, full_path in subtitle_files:
            similarity = difflib.SequenceMatcher(None, base_name, os.path.splitext(f)[0]).ratio()
            if similarity > 0.7:
                return full_path
        
        return ""
    
    def _find_matching_cover(self, base_name: str, dir_path: str, slice_idx: int = None) -> str:
        """查找匹配的封面文件"""
        cover_files = []
        for root, dirs, files in os.walk(self.course_path):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in self.IMAGE_EXTS:
                    cover_files.append((f, os.path.join(root, f)))
        
        if slice_idx is not None:
            for f, full_path in cover_files:
                f_num = self._extract_number_prefix(f)
                if f_num == slice_idx:
                    return full_path
        
        for f, full_path in cover_files:
            f_base = os.path.splitext(f)[0]
            if base_name in f_base or f_base in base_name:
                return full_path
        
        for f, full_path in cover_files:
            similarity = difflib.SequenceMatcher(None, base_name, os.path.splitext(f)[0]).ratio()
            if similarity > 0.7:
                return full_path
        
        return ""
    
    def _parse_handout_page(self, filename: str) -> int:
        """从文件名解析讲义页码"""
        patterns = [
            r'[Pp](?:age)?\s*(\d+)',
            r'[页页]\s*(\d+)',
            r'讲义\s*(\d+)',
            r'[Ss]lide\s*(\d+)',
        ]
        
        for pattern in patterns:
            m = re.search(pattern, filename)
            if m:
                return int(m.group(1))
        
        m = re.search(r'[_\-](\d{2,3})[_\-]', filename)
        if m:
            num = int(m.group(1))
            if 1 <= num <= 500:
                return num
        
        return 0


# ==================== 校验器 ====================

class SliceValidator:
    """切片校验器"""
    
    def __init__(self, course: CourseInfo, title_table: List[Dict] = None):
        self.course = course
        self.title_table = title_table or []
        self.results: List[CheckResult] = []
    
    def validate(self) -> List[CheckResult]:
        """执行所有校验"""
        self.results = []
        
        all_slices = self._get_all_slices()
        if not all_slices:
            self.results.append(CheckResult(
                check_type="结构错误",
                level="error",
                message="未找到任何切片视频"
            ))
            return self.results
        
        self._check_missing_segments(all_slices)
        self._check_time_overlaps(all_slices)
        self._check_title_consistency(all_slices)
        self._check_missing_covers(all_slices)
        self._check_subtitle_duration(all_slices)
        self._check_cross_chapter(all_slices)
        self._check_time_gaps(all_slices)
        self._check_original_duration(all_slices)
        self._check_filename_issues(all_slices)
        
        return sorted(self.results, key=lambda r: (r.level == 'error', r.level == 'warning'), reverse=True)
    
    def _get_all_slices(self) -> List[SliceInfo]:
        """获取所有切片"""
        slices = []
        for chapter in self.course.chapters:
            slices.extend(chapter.slices)
        return sorted(slices, key=lambda s: s.start_time if s.start_time >= 0 else s.index)
    
    def _check_missing_segments(self, slices: List[SliceInfo]):
        """检查缺段"""
        numbered_slices = [(s.index, s) for s in slices if s.start_time >= 0]
        numbered_slices.sort(key=lambda x: x[0])
        
        expected_indices = set(range(1, len(numbered_slices) + 1))
        actual_indices = set(idx for idx, _ in numbered_slices)
        missing = expected_indices - actual_indices
        
        for idx in sorted(missing):
            self.results.append(CheckResult(
                check_type="缺段",
                level="error",
                message=f"缺少编号为 {idx} 的切片",
                slice_index=idx
            ))
        
        numbered_slices.sort(key=lambda x: x[1].start_time)
        for i in range(1, len(numbered_slices)):
            prev_idx, prev_slice = numbered_slices[i-1]
            curr_idx, curr_slice = numbered_slices[i]
            
            if curr_slice.start_time > prev_slice.end_time + 0.5:
                gap = curr_slice.start_time - prev_slice.end_time
                self.results.append(CheckResult(
                    check_type="缺段",
                    level="warning",
                    message=f"切片 {prev_idx} 与 {curr_idx} 之间存在 {format_time(gap)} 的时间间隙",
                    slice_index=curr_idx,
                    slice_title=curr_slice.title,
                    details={'gap_seconds': gap, 'prev_end': prev_slice.end_time, 'curr_start': curr_slice.start_time}
                ))
    
    def _check_time_overlaps(self, slices: List[SliceInfo]):
        """检查时间重叠"""
        timed_slices = [s for s in slices if s.start_time >= 0 and s.end_time > s.start_time]
        timed_slices.sort(key=lambda s: s.start_time)
        
        for i in range(1, len(timed_slices)):
            prev = timed_slices[i-1]
            curr = timed_slices[i]
            
            if curr.start_time < prev.end_time - 0.1:
                overlap = prev.end_time - curr.start_time
                self.results.append(CheckResult(
                    check_type="时间重叠",
                    level="error",
                    message=f"切片 {prev.index}({prev.title}) 与 {curr.index}({curr.title}) 重叠 {format_time(overlap)}",
                    slice_index=curr.index,
                    slice_title=curr.title,
                    details={'overlap_seconds': overlap, 'prev_end': prev.end_time, 'curr_start': curr.start_time}
                ))
    
    def _check_title_consistency(self, slices: List[SliceInfo]):
        """检查标题一致性"""
        if not self.title_table:
            return
        
        title_map = {}
        for row in self.title_table:
            idx = None
            for key in ['序号', '编号', 'index', '序号', 'id']:
                if key in row and row[key]:
                    try:
                        idx = int(row[key])
                        break
                    except ValueError:
                        pass
            
            title = ""
            for key in ['标题', 'title', '名称', 'name']:
                if key in row:
                    title = row[key]
                    break
            
            page = 0
            for key in ['页码', '页', 'page', '讲义页']:
                if key in row and row[key]:
                    try:
                        page = int(row[key])
                        break
                    except ValueError:
                        pass
            
            if idx and title:
                title_map[idx] = {'title': title, 'page': page}
        
        for slice_info in slices:
            if slice_info.index in title_map:
                expected = title_map[slice_info.index]
                if slice_info.title != expected['title']:
                    similarity = difflib.SequenceMatcher(None, slice_info.title, expected['title']).ratio()
                    if similarity < 0.95:
                        self.results.append(CheckResult(
                            check_type="标题不一致",
                            level="warning",
                            message=f"切片 {slice_info.index} 标题不一致: 视频='{slice_info.title}' vs 标题表='{expected['title']}'",
                            slice_index=slice_info.index,
                            slice_title=slice_info.title,
                            details={'expected_title': expected['title'], 'actual_title': slice_info.title}
                        ))
                
                if expected['page'] > 0 and slice_info.handout_page > 0 and slice_info.handout_page != expected['page']:
                    self.results.append(CheckResult(
                        check_type="讲义页错误",
                        level="error",
                        message=f"切片 {slice_info.index} 讲义页码错误: 视频={slice_info.handout_page} vs 标题表={expected['page']}",
                        slice_index=slice_info.index,
                        slice_title=slice_info.title,
                        details={'expected_page': expected['page'], 'actual_page': slice_info.handout_page}
                    ))
    
    def _check_missing_covers(self, slices: List[SliceInfo]):
        """检查封面缺失"""
        for slice_info in slices:
            if not slice_info.cover_file:
                self.results.append(CheckResult(
                    check_type="封面缺失",
                    level="warning",
                    message=f"切片 {slice_info.index}({slice_info.title}) 缺少封面图片",
                    slice_index=slice_info.index,
                    slice_title=slice_info.title
                ))
    
    def _check_subtitle_duration(self, slices: List[SliceInfo]):
        """检查字幕时间超出视频长度"""
        for slice_info in slices:
            if not slice_info.subtitle_file:
                continue
            
            subtitles = read_subtitles(slice_info.subtitle_file)
            if not subtitles:
                continue
            
            slice_duration = slice_info.duration
            if slice_duration <= 0 and slice_info.start_time >= 0 and slice_info.end_time > 0:
                slice_duration = slice_info.end_time - slice_info.start_time
            
            if slice_duration <= 0:
                continue
            
            last_sub = subtitles[-1]
            if last_sub['end'] > slice_duration + 0.5:
                overflow = last_sub['end'] - slice_duration
                self.results.append(CheckResult(
                    check_type="字幕超时",
                    level="warning",
                    message=f"切片 {slice_info.index}({slice_info.title}) 字幕超出视频 {format_time(overflow)}",
                    slice_index=slice_info.index,
                    slice_title=slice_info.title,
                    details={'overflow_seconds': overflow, 'subtitle_end': last_sub['end'], 'slice_duration': slice_duration}
                ))
            
            if subtitles[0]['start'] < -0.5:
                self.results.append(CheckResult(
                    check_type="字幕超始",
                    level="info",
                    message=f"切片 {slice_info.index}({slice_info.title}) 字幕从负时间开始",
                    slice_index=slice_info.index,
                    slice_title=slice_info.title
                ))
    
    def _check_cross_chapter(self, slices: List[SliceInfo]):
        """检查跨章节切片"""
        timed_slices = [s for s in slices if s.start_time >= 0]
        timed_slices.sort(key=lambda s: s.start_time)
        
        for i, slice_info in enumerate(timed_slices):
            if i > 0:
                prev = timed_slices[i-1]
                if slice_info.chapter != prev.chapter and slice_info.start_time < prev.end_time:
                    self.results.append(CheckResult(
                        check_type="跨章节重叠",
                        level="info",
                        message=f"切片 {slice_info.index}({slice_info.title}) 属于章节 '{slice_info.chapter}'，与前一章节 '{prev.chapter}' 的切片时间重叠",
                        slice_index=slice_info.index,
                        slice_title=slice_info.title,
                        details={'prev_chapter': prev.chapter, 'curr_chapter': slice_info.chapter}
                    ))
    
    def _check_time_gaps(self, slices: List[SliceInfo]):
        """检查切片之间的时间间隙"""
        timed_slices = [s for s in slices if s.start_time >= 0 and s.end_time > 0]
        timed_slices.sort(key=lambda s: s.start_time)
        
        if len(timed_slices) < 2:
            return
        
        for i in range(1, len(timed_slices)):
            prev = timed_slices[i-1]
            curr = timed_slices[i]
            
            gap = curr.start_time - prev.end_time
            if gap > 1.0:
                self.results.append(CheckResult(
                    check_type="时间间隙",
                    level="info",
                    message=f"切片 {prev.index} 到 {curr.index} 之间有 {format_time(gap)} 的未覆盖内容",
                    slice_index=curr.index,
                    slice_title=curr.title,
                    details={'gap_seconds': gap}
                ))
    
    def _check_original_duration(self, slices: List[SliceInfo]):
        """检查与原视频时长是否匹配"""
        if self.course.original_duration <= 0:
            return
        
        timed_slices = [s for s in slices if s.end_time > 0]
        if not timed_slices:
            return
        
        max_end = max(s.end_time for s in timed_slices)
        if max_end > self.course.original_duration + 1.0:
            overflow = max_end - self.course.original_duration
            self.results.append(CheckResult(
                check_type="时长超限",
                level="error",
                message=f"切片最大结束时间 {format_time(max_end)} 超出原视频时长 {format_time(self.course.original_duration)} 达 {format_time(overflow)}",
                details={'max_slice_end': max_end, 'original_duration': self.course.original_duration}
            ))
    
    def _check_filename_issues(self, slices: List[SliceInfo]):
        """检查文件名问题"""
        for slice_info in slices:
            filename = os.path.basename(slice_info.video_file)
            if has_chinese_spaces(filename):
                self.results.append(CheckResult(
                    check_type="文件名问题",
                    level="info",
                    message=f"切片 {slice_info.index}({slice_info.title}) 文件名包含中文全角空格，建议修复",
                    slice_index=slice_info.index,
                    slice_title=slice_info.title,
                    details={'filename': filename}
                ))
            
            if re.search(r'[\u3000\u2000-\u200a\u202f\u205f]', filename):
                self.results.append(CheckResult(
                    check_type="文件名问题",
                    level="info",
                    message=f"切片 {slice_info.index}({slice_info.title}) 文件名包含特殊空格字符",
                    slice_index=slice_info.index,
                    slice_title=slice_info.title,
                    details={'filename': filename}
                ))


# ==================== 历史记录管理器 ====================

class HistoryManager:
    """历史记录管理器，用于检测新增和替换"""
    
    def __init__(self, history_file: str):
        self.history_file = history_file
        self.history = self._load_history()
    
    def _load_history(self) -> Dict:
        """加载历史记录"""
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        return {'runs': [], 'slices': {}}
    
    def _save_history(self):
        """保存历史记录"""
        os.makedirs(os.path.dirname(self.history_file), exist_ok=True)
        with open(self.history_file, 'w', encoding='utf-8') as f:
            json.dump(self.history, f, ensure_ascii=False, indent=2)
    
    def compare_and_update(self, course: CourseInfo, results: List[CheckResult]) -> Dict:
        """比较并更新历史记录，返回变更信息"""
        current_slices = {}
        all_slices = []
        for chapter in course.chapters:
            all_slices.extend(chapter.slices)
        
        for slice_info in all_slices:
            key = f"{slice_info.chapter}_{slice_info.index}"
            current_slices[key] = {
                'title': slice_info.title,
                'start_time': slice_info.start_time,
                'end_time': slice_info.end_time,
                'handout_page': slice_info.handout_page,
                'video_file': slice_info.video_file,
                'issues_count': len([r for r in results if r.slice_index == slice_info.index])
            }
        
        old_slices = self.history.get('slices', {})
        
        added = []
        modified = []
        unchanged = []
        
        for key, info in current_slices.items():
            if key not in old_slices:
                added.append({'key': key, **info})
            else:
                old_info = old_slices[key]
                changed_fields = {}
                for field in ['title', 'start_time', 'end_time', 'handout_page']:
                    if old_info.get(field) != info.get(field):
                        changed_fields[field] = {'old': old_info.get(field), 'new': info.get(field)}
                if changed_fields:
                    modified.append({'key': key, **info, 'changes': changed_fields})
                else:
                    unchanged.append({'key': key, **info})
        
        removed = []
        for key, info in old_slices.items():
            if key not in current_slices:
                removed.append({'key': key, **info})
        
        run_info = {
            'timestamp': datetime.now().isoformat(),
            'course_name': course.name,
            'total_slices': len(current_slices),
            'issues_count': len(results),
            'added_count': len(added),
            'modified_count': len(modified),
            'removed_count': len(removed)
        }
        
        self.history['slices'] = current_slices
        self.history['runs'].append(run_info)
        if len(self.history['runs']) > 100:
            self.history['runs'] = self.history['runs'][-100:]
        self._save_history()
        
        return {
            'added': added,
            'modified': modified,
            'removed': removed,
            'unchanged': unchanged,
            'run_info': run_info
        }


# ==================== 报告生成器 ====================

class ReportGenerator:
    """报告生成器"""
    
    def __init__(self, course: CourseInfo, results: List[CheckResult], changes: Dict = None):
        self.course = course
        self.results = results
        self.changes = changes or {}
    
    def generate_leader_view(self) -> str:
        """教研负责人视图：仅显示待返工列表"""
        output = []
        output.append("=" * 80)
        output.append("课程视频切片检查报告 - 教研负责人视图")
        output.append("=" * 80)
        output.append(f"课程: {self.course.name}")
        output.append(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        output.append("")
        
        errors = [r for r in self.results if r.level == 'error']
        warnings = [r for r in self.results if r.level == 'warning']
        
        output.append(f"错误总数: {len(errors)} | 警告总数: {len(warnings)}")
        output.append("")
        
        if self.changes:
            run_info = self.changes.get('run_info', {})
            added = self.changes.get('added', [])
            modified = self.changes.get('modified', [])
            removed = self.changes.get('removed', [])
            
            output.append(f"本次变更: 新增 {len(added)} | 修改 {len(modified)} | 删除 {len(removed)}")
            if added:
                output.append("  新增切片:")
                for item in added:
                    output.append(f"    - [{item.get('key')}] {item.get('title')}")
            if modified:
                output.append("  修改切片:")
                for item in modified:
                    changes = item.get('changes', {})
                    change_desc = ", ".join([f"{k}: {v.get('old')} -> {v.get('new')}" for k, v in changes.items()])
                    output.append(f"    - [{item.get('key')}] {item.get('title')} ({change_desc})")
            output.append("")
        
        output.append("-" * 80)
        output.append("待返工列表")
        output.append("-" * 80)
        
        if not errors and not warnings:
            output.append("✅ 所有检查通过，无需返工！")
            return "\n".join(output)
        
        todo_items = errors + warnings
        grouped = {}
        for item in todo_items:
            key = item.slice_index if item.slice_index else 0
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(item)
        
        for idx in sorted(grouped.keys()):
            items = grouped[idx]
            if idx == 0:
                output.append(f"\n【全局问题】")
            else:
                slice_title = items[0].slice_title or f"切片 {idx}"
                output.append(f"\n【切片 {idx}】{slice_title}")
            
            for item in items:
                icon = "❌" if item.level == 'error' else "⚠️"
                output.append(f"  {icon} [{item.check_type}] {item.message}")
        
        return "\n".join(output)
    
    def generate_editor_view(self) -> str:
        """剪辑同事视图：带原视频定位"""
        output = []
        output.append("=" * 100)
        output.append("课程视频切片检查报告 - 剪辑视图")
        output.append("=" * 100)
        output.append(f"课程: {self.course.name}")
        output.append(f"原视频: {self.course.original_video or '未找到'}")
        output.append(f"原视频时长: {format_time(self.course.original_duration)}")
        output.append(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        output.append("")
        
        output.append("-" * 100)
        output.append(f"{'序号':<6}{'标题':<30}{'时间范围':<25}{'章节':<15}{'状态'}")
        output.append("-" * 100)
        
        all_slices = []
        for chapter in self.course.chapters:
            all_slices.extend(chapter.slices)
        all_slices.sort(key=lambda s: s.start_time if s.start_time >= 0 else s.index)
        
        issue_indices = set(r.slice_index for r in self.results if r.level in ['error', 'warning'])
        
        for slice_info in all_slices:
            status = "✅"
            if slice_info.index in issue_indices:
                issues = [r for r in self.results if r.slice_index == slice_info.index]
                if any(r.level == 'error' for r in issues):
                    status = "❌"
                else:
                    status = "⚠️"
            
            time_range = slice_info.time_range_str if slice_info.start_time >= 0 else "未知"
            
            output.append(f"{slice_info.index:<6}{slice_info.title[:28]:<30}{time_range:<25}{slice_info.chapter[:13]:<15}{status}")
        
        output.append("")
        output.append("-" * 100)
        output.append("问题详情 & 原视频定位")
        output.append("-" * 100)
        
        issues_by_slice = {}
        for r in self.results:
            idx = r.slice_index if r.slice_index else 0
            if idx not in issues_by_slice:
                issues_by_slice[idx] = []
            issues_by_slice[idx].append(r)
        
        for idx in sorted(issues_by_slice.keys()):
            issues = issues_by_slice[idx]
            
            if idx == 0:
                output.append(f"\n📍 全局问题")
            else:
                slice_info = next((s for s in all_slices if s.index == idx), None)
                if slice_info:
                    output.append(f"\n📍 切片 {idx}: {slice_info.title}")
                    output.append(f"   📁 视频文件: {slice_info.video_file}")
                    if self.course.original_video and slice_info.start_time >= 0:
                        hours = int(slice_info.start_time // 3600)
                        mins = int((slice_info.start_time % 3600) // 60)
                        secs = int(slice_info.start_time % 60)
                        output.append(f"   🎯 原视频定位: {self.course.original_video}")
                        output.append(f"      跳转到: {hours:02d}:{mins:02d}:{secs:02d}")
                        if self.course.original_duration > 0:
                            progress = (slice_info.start_time / self.course.original_duration) * 100
                            output.append(f"      进度条: {'█' * int(progress/5)}{'░' * (20 - int(progress/5))} {progress:.1f}%")
            
            for issue in issues:
                icon = "❌" if issue.level == 'error' else ("⚠️" if issue.level == 'warning' else "ℹ️")
                output.append(f"   {icon} [{issue.check_type}] {issue.message}")
                if issue.details:
                    for k, v in issue.details.items():
                        if isinstance(v, float) and 'time' not in k and 'page' not in k and 'duration' not in k and 'overflow' not in k:
                            v = format_time(v)
                        output.append(f"      • {k}: {v}")
        
        return "\n".join(output)
    
    def generate_json_report(self) -> Dict:
        """生成JSON格式报告"""
        all_slices = []
        for chapter in self.course.chapters:
            all_slices.extend(chapter.slices)
        
        return {
            'course': {
                'name': self.course.name,
                'path': self.course.path,
                'original_video': self.course.original_video,
                'original_duration': self.course.original_duration,
                'original_duration_str': format_time(self.course.original_duration)
            },
            'summary': {
                'total_slices': len(all_slices),
                'total_chapters': len(self.course.chapters),
                'errors': len([r for r in self.results if r.level == 'error']),
                'warnings': len([r for r in self.results if r.level == 'warning']),
                'infos': len([r for r in self.results if r.level == 'info'])
            },
            'changes': self.changes,
            'chapters': [
                {
                    'name': chapter.name,
                    'total_duration': chapter.total_duration,
                    'total_duration_str': format_time(chapter.total_duration),
                    'slices': [s.to_dict() for s in chapter.slices]
                }
                for chapter in self.course.chapters
            ],
            'issues': [
                {
                    'type': r.check_type,
                    'level': r.level,
                    'message': r.message,
                    'slice_index': r.slice_index,
                    'slice_title': r.slice_title,
                    'details': r.details
                }
                for r in self.results
            ],
            'generated_at': datetime.now().isoformat()
        }


# ==================== 主程序 ====================

def main():
    parser = argparse.ArgumentParser(description='课程视频切片检查工具')
    parser.add_argument('course_path', help='课程目录路径')
    parser.add_argument('--title-table', help='标题表CSV文件路径')
    parser.add_argument('--view', choices=['leader', 'editor', 'both'], default='both',
                        help='输出视图: leader(教研负责人), editor(剪辑), both(全部)')
    parser.add_argument('--history', help='历史记录文件路径', default='.slice_check_history.json')
    parser.add_argument('--output-json', help='输出JSON报告的文件路径')
    parser.add_argument('--fix-spaces', action='store_true', help='自动修复文件名中的中文空格')
    
    args = parser.parse_args()
    
    print(f"🔍 开始扫描课程目录: {args.course_path}")
    print("")
    
    scanner = CourseScanner(args.course_path)
    try:
        course = scanner.scan()
    except FileNotFoundError as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)
    
    all_slices = []
    for chapter in course.chapters:
        all_slices.extend(chapter.slices)
    
    print(f"✅ 扫描完成")
    print(f"   课程名称: {course.name}")
    print(f"   章节数量: {len(course.chapters)}")
    print(f"   切片总数: {len(all_slices)}")
    print(f"   原视频: {course.original_video or '未找到'}")
    print("")
    
    if args.fix_spaces:
        fixed_count = 0
        for slice_info in all_slices:
            if has_chinese_spaces(slice_info.video_file):
                old_path = slice_info.video_file
                new_path = old_path.replace('\u3000', ' ')
                try:
                    os.rename(old_path, new_path)
                    slice_info.video_file = new_path
                    fixed_count += 1
                    print(f"🔧 已修复: {os.path.basename(old_path)} -> {os.path.basename(new_path)}")
                except Exception as e:
                    print(f"⚠️  修复失败: {old_path} - {e}")
        if fixed_count > 0:
            print(f"✅ 已修复 {fixed_count} 个文件名中的中文空格")
            print("")
    
    title_table = []
    title_table_path = args.title_table or course.title_table_file
    if title_table_path and os.path.exists(title_table_path):
        if title_table_path.lower().endswith('.csv'):
            title_table = read_title_table(title_table_path)
            print(f"✅ 已加载标题表: {title_table_path} ({len(title_table)} 条记录)")
        else:
            print(f"ℹ️  标题表格式不支持 (仅支持CSV): {title_table_path}")
    print("")
    
    print("🔍 开始校验...")
    validator = SliceValidator(course, title_table)
    results = validator.validate()
    print(f"✅ 校验完成，发现 {len(results)} 个问题")
    print("")
    
    history_file = os.path.join(args.course_path, args.history) if not os.path.isabs(args.history) else args.history
    history_mgr = HistoryManager(history_file)
    changes = history_mgr.compare_and_update(course, results)
    
    added = changes.get('added', [])
    modified = changes.get('modified', [])
    removed = changes.get('removed', [])
    if added or modified or removed:
        print(f"📊 本次变更: 新增{len(added)} | 修改{len(modified)} | 删除{len(removed)}")
        print("")
    
    reporter = ReportGenerator(course, results, changes)
    
    if args.view in ['leader', 'both']:
        print(reporter.generate_leader_view())
        print("\n")
    
    if args.view in ['editor', 'both']:
        print(reporter.generate_editor_view())
    
    if args.output_json:
        json_report = reporter.generate_json_report()
        with open(args.output_json, 'w', encoding='utf-8') as f:
            json.dump(json_report, f, ensure_ascii=False, indent=2)
        print(f"\n📄 JSON报告已保存到: {args.output_json}")
    
    errors = len([r for r in results if r.level == 'error'])
    sys.exit(0 if errors == 0 else 1)


if __name__ == '__main__':
    main()
