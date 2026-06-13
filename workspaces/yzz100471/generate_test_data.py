#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成测试用的课程视频切片数据
包含各种问题场景：缺段、重叠、标题不一致、封面缺失、中文空格等
"""

import os
import csv
import json
import subprocess
from pathlib import Path


def create_dummy_video(output_path: str, duration: float = 10.0):
    """创建一个虚拟的MP4视频文件"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    try:
        subprocess.run([
            'ffmpeg', '-y', '-f', 'lavfi',
            '-i', f'testsrc=duration={duration}:size=320x240:rate=1',
            '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
            '-shortest', '-c:v', 'libx264', '-preset', 'ultrafast',
            '-c:a', 'aac', output_path
        ], capture_output=True, check=True, timeout=30)
        return True
    except Exception:
        with open(output_path, 'wb') as f:
            f.write(b'\x00' * 1024)
        return False


def create_dummy_image(output_path: str):
    """创建一个虚拟的图片文件"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    try:
        subprocess.run([
            'ffmpeg', '-y', '-f', 'lavfi',
            '-i', 'color=c=blue:s=400x300:d=1',
            '-frames:v', '1', output_path
        ], capture_output=True, check=True, timeout=10)
    except Exception:
        with open(output_path, 'wb') as f:
            f.write(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100)


def create_srt_file(output_path: str, entries: list):
    """创建SRT字幕文件"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, (start, end, text) in enumerate(entries, 1):
            f.write(f"{i}\n")
            f.write(f"{format_srt_time(start)} --> {format_srt_time(end)}\n")
            f.write(f"{text}\n\n")


def format_srt_time(seconds: float) -> str:
    """格式化SRT时间"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def generate_test_course(base_path: str):
    """生成测试课程数据"""
    
    course_path = os.path.join(base_path, "示例课程_微积分基础")
    os.makedirs(course_path, exist_ok=True)
    
    # 1. 创建原视频（模拟30分钟的课程）
    original_video = os.path.join(course_path, "完整课程_微积分基础.mp4")
    create_dummy_video(original_video, duration=1800)
    
    # 2. 创建标题表CSV
    title_table_path = os.path.join(course_path, "标题表.csv")
    with open(title_table_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['序号', '标题', '页码', '开始时间', '结束时间'])
        writer.writerow(['1', '函数与极限介绍', '5', '00:00:00', '00:05:00'])
        writer.writerow(['2', '极限的定义', '12', '00:05:00', '00:10:00'])
        writer.writerow(['3', '极限的计算方法', '18', '00:10:00', '00:15:00'])
        writer.writerow(['4', '连续性与间断点', '25', '00:15:00', '00:20:00'])
        writer.writerow(['5', '导数的概念', '30', '00:20:00', '00:25:00'])
        writer.writerow(['6', '导数的几何意义', '38', '00:25:00', '00:30:00'])
    
    # 3. 创建讲义文件
    handout_path = os.path.join(course_path, "微积分讲义.pdf")
    with open(handout_path, 'wb') as f:
        f.write(b'%PDF-1.4\n%EOF')
    
    # 4. 创建章节目录
    chapter1_path = os.path.join(course_path, "第一章 极限")
    chapter2_path = os.path.join(course_path, "第二章 导数")
    os.makedirs(chapter1_path, exist_ok=True)
    os.makedirs(chapter2_path, exist_ok=True)
    
    # 5. 创建切片视频（包含各种问题）
    
    # 切片1：正常，有封面，有字幕
    slice1_path = os.path.join(chapter1_path, "01_00:00:00_00:05:00_函数与极限介绍_P5.mp4")
    create_dummy_video(slice1_path, duration=300)
    
    # 切片2：讲义页错误（标题表是12，但文件名写的是15）
    slice2_path = os.path.join(chapter1_path, "02_00:05:00_00:10:00_极限的定义_P15.mp4")
    create_dummy_video(slice2_path, duration=300)
    
    # 切片3：时间重叠（应该10:00开始，但是9:50就开始了，和切片2重叠）
    slice3_path = os.path.join(chapter1_path, "03_00:09:50_00:15:00_极限的计算方法_P18.mp4")
    create_dummy_video(slice3_path, duration=310)
    
    # 切片4：标题不一致
    slice4_path = os.path.join(chapter1_path, "04_00:15:00_00:20:00_连续性问题_P25.mp4")
    create_dummy_video(slice4_path, duration=300)
    
    # 切片5：有中文全角空格的文件名
    slice5_path = os.path.join(chapter2_path, "05_00:20:00_00:25:00_导数的概念\u3000_P30.mp4")
    create_dummy_video(slice5_path, duration=300)
    
    # 切片6：跨章节（属于第二章，但时间和前一章重叠）
    slice6_path = os.path.join(chapter2_path, "06_00:24:30_00:30:00_导数的几何意义_P38.mp4")
    create_dummy_video(slice6_path, duration=330)
    
    # 6. 创建封面（故意缺少一些切片的封面）
    covers_path = os.path.join(course_path, "封面")
    create_dummy_image(os.path.join(covers_path, "01_函数与极限介绍.jpg"))
    create_dummy_image(os.path.join(covers_path, "02_极限的定义.jpg"))
    # 缺少切片3的封面
    create_dummy_image(os.path.join(covers_path, "04_连续性与间断点.jpg"))
    # 缺少切片5的封面
    create_dummy_image(os.path.join(covers_path, "06_导数的几何意义.jpg"))
    
    # 7. 创建字幕文件
    subtitles_path = os.path.join(course_path, "字幕")
    
    # 切片1字幕：正常
    create_srt_file(
        os.path.join(subtitles_path, "01_函数与极限介绍.srt"),
        [
            (0, 5, "大家好，今天我们开始学习微积分。"),
            (5, 10, "首先介绍函数与极限的基本概念。"),
            (10, 15, "函数是描述变量之间关系的重要工具。"),
            (295, 300, "这部分内容就讲到这里。"),
        ]
    )
    
    # 切片2字幕：正常
    create_srt_file(
        os.path.join(subtitles_path, "02_极限的定义.srt"),
        [
            (0, 5, "接下来我们学习极限的严格定义。"),
            (295, 300, "希望大家理解这个重要概念。"),
        ]
    )
    
    # 切片3字幕：字幕时间超出视频长度（310秒结束，但字幕到320秒）
    create_srt_file(
        os.path.join(subtitles_path, "03_极限的计算方法.srt"),
        [
            (0, 5, "现在我们来看极限的计算方法。"),
            (305, 320, "这部分内容需要多做练习。"),
        ]
    )
    
    # 切片4字幕：正常
    create_srt_file(
        os.path.join(subtitles_path, "04_连续性与间断点.srt"),
        [
            (0, 5, "连续性是函数的重要性质。"),
            (295, 300, "下节课我们继续讨论。"),
        ]
    )
    
    # 切片5字幕：正常
    create_srt_file(
        os.path.join(subtitles_path, "05_导数的概念.srt"),
        [
            (0, 5, "导数是微积分的核心概念之一。"),
            (295, 300, "理解导数的几何意义很重要。"),
        ]
    )
    
    # 切片6字幕：正常
    create_srt_file(
        os.path.join(subtitles_path, "06_导数的几何意义.srt"),
        [
            (0, 5, "导数有明确的几何意义。"),
            (325, 330, "这节课就到这里，谢谢大家。"),
        ]
    )
    
    print(f"✅ 测试课程数据已生成到: {course_path}")
    print("")
    print("📋 生成的问题场景:")
    print("  ❌ 切片2: 讲义页错误 (标题表P12 vs 文件名P15)")
    print("  ❌ 切片3: 时间重叠 (与切片2重叠10秒)")
    print("  ⚠️  切片3: 缺少封面")
    print("  ⚠️  切片3: 字幕超时 (310秒视频, 字幕到320秒)")
    print("  ⚠️  切片4: 标题不一致 (标题表'连续性与间断点' vs 视频'连续性问题')")
    print("  ℹ️  切片5: 文件名包含中文全角空格")
    print("  ⚠️  切片5: 缺少封面")
    print("  ℹ️  切片6: 跨章节重叠 (与切片5重叠30秒)")
    print("")
    
    return course_path


if __name__ == '__main__':
    base_path = os.path.dirname(os.path.abspath(__file__))
    course_path = generate_test_course(base_path)
    print(f"💡 运行命令测试:")
    print(f"   python3 course_slice_checker.py \"{course_path}\"")
