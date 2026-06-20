"""照片元数据读取器 - 读取 EXIF 拍摄时间和检测文件大小"""

import os
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Tuple
from pathlib import Path

try:
    from PIL import Image
    from PIL.ExifTags import TAGS
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


@dataclass
class PhotoMetadata:
    """照片元数据"""
    file_path: str
    file_size: int
    file_size_mb: float
    shoot_time: Optional[datetime]
    exif_available: bool
    is_too_small: bool
    dimensions: Optional[Tuple[int, int]] = None

    @property
    def shoot_time_str(self) -> str:
        """获取拍摄时间字符串"""
        if self.shoot_time:
            return self.shoot_time.strftime("%Y%m%d_%H%M%S")
        return "未知时间"

    @property
    def file_size_str(self) -> str:
        """获取文件大小字符串"""
        return f"{self.file_size_mb:.2f} MB"


class MetadataReader:
    """照片元数据读取器"""

    EXIF_DATE_TAGS = [
        'DateTimeOriginal',
        'DateTimeDigitized',
        'DateTime',
    ]

    def __init__(self, min_size_kb: int = 100):
        self.min_size_bytes = min_size_kb * 1024
        if not HAS_PIL:
            raise ImportError("请安装 Pillow: pip install Pillow")

    def read(self, file_path: str) -> PhotoMetadata:
        """读取照片元数据"""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        file_size = path.stat().st_size
        file_size_mb = file_size / (1024 * 1024)
        is_too_small = file_size < self.min_size_bytes

        shoot_time = None
        exif_available = False
        dimensions = None

        try:
            with Image.open(path) as img:
                dimensions = img.size

                exif_data = img._getexif()
                if exif_data:
                    exif_available = True
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        if tag in self.EXIF_DATE_TAGS:
                            shoot_time = self._parse_exif_datetime(value)
                            if shoot_time:
                                break
        except Exception:
            pass

        if not shoot_time:
            shoot_time = self._get_file_modification_time(path)

        return PhotoMetadata(
            file_path=str(path),
            file_size=file_size,
            file_size_mb=file_size_mb,
            shoot_time=shoot_time,
            exif_available=exif_available,
            is_too_small=is_too_small,
            dimensions=dimensions,
        )

    @staticmethod
    def _parse_exif_datetime(value: str) -> Optional[datetime]:
        """解析 EXIF 日期时间格式"""
        formats = [
            "%Y:%m:%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y:%m:%d %H:%M:%S.%f",
        ]

        if isinstance(value, bytes):
            try:
                value = value.decode('utf-8', errors='ignore')
            except Exception:
                return None

        value = str(value).strip()

        for fmt in formats:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue

        return None

    @staticmethod
    def _get_file_modification_time(path: Path) -> datetime:
        """获取文件修改时间作为备选"""
        return datetime.fromtimestamp(path.stat().st_mtime)

    @staticmethod
    def is_image_file(file_path: str) -> bool:
        """检查是否为图片文件"""
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.heic', '.webp'}
        ext = Path(file_path).suffix.lower()
        return ext in image_extensions

    @staticmethod
    def scan_directory(directory: str, prefix: str = "IMG") -> list:
        """扫描目录中以指定前缀开头的图片文件"""
        path = Path(directory)
        if not path.exists():
            raise FileNotFoundError(f"目录不存在: {directory}")
        if not path.is_dir():
            raise NotADirectoryError(f"不是目录: {directory}")

        photo_files = []
        prefix_upper = prefix.upper()

        for file_path in path.iterdir():
            if file_path.is_file() and MetadataReader.is_image_file(str(file_path)):
                name = file_path.stem.upper()
                if name.startswith(prefix_upper):
                    photo_files.append(str(file_path))

        return sorted(photo_files)
