"""命名规则引擎 - 根据位置信息和元数据生成新文件名"""

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .location_mapper import LocationInfo
from .metadata_reader import PhotoMetadata


@dataclass
class NameGenerationResult:
    """文件名生成结果"""
    original_path: str
    new_filename: str
    new_directory: str
    new_full_path: str
    location_info: Optional[LocationInfo]
    metadata: PhotoMetadata
    issues: list = field(default_factory=list)
    needs_confirmation: bool = False

    @property
    def original_name(self) -> str:
        return os.path.basename(self.original_path)

    @property
    def is_success(self) -> bool:
        return not self.needs_confirmation and not self.issues


class NamingEngine:
    """命名规则引擎"""

    ISSUE_NO_LOCATION = "未找到位置信息"
    ISSUE_INCOMPLETE_LOCATION = "位置信息不完整"
    ISSUE_NO_EXIF = "EXIF 拍摄时间缺失"
    ISSUE_TOO_SMALL = "照片太小"
    ISSUE_NAME_CONFLICT = "文件名冲突"
    ISSUE_INVALID_CHARS = "包含非法字符"

    def __init__(self, output_dir: str, name_template: str = None):
        self.output_dir = Path(output_dir)
        self.name_template = name_template or "{project}_{building}_{floor}_{position}_{shoot_time}"
        self.pending_dir = self.output_dir / "_待确认"
        self.unrecognized_dir = self.output_dir / "_未识别位置"

    def generate_name(
        self,
        original_path: str,
        location_info: Optional[LocationInfo],
        metadata: PhotoMetadata,
        existing_names: Optional[set] = None,
    ) -> NameGenerationResult:
        """生成新文件名"""
        issues = []
        needs_confirmation = False

        if location_info is None:
            issues.append(self.ISSUE_NO_LOCATION)
            needs_confirmation = True
            target_dir = str(self.pending_dir)
        elif not location_info.is_complete():
            issues.append(f"{self.ISSUE_INCOMPLETE_LOCATION}: {self._format_missing_fields(location_info)}")
            needs_confirmation = True
            target_dir = str(self.pending_dir)
        else:
            target_dir = str(self._build_target_dir(location_info))

        if not metadata.exif_available:
            issues.append(self.ISSUE_NO_EXIF)
            needs_confirmation = True

        if metadata.is_too_small:
            issues.append(f"{self.ISSUE_TOO_SMALL}: {metadata.file_size_str}")
            needs_confirmation = True

        if needs_confirmation and location_info is None:
            new_filename = self._generate_pending_name(original_path, metadata, location_info)
            target_dir = str(self.unrecognized_dir)
        elif needs_confirmation:
            new_filename = self._generate_pending_name(original_path, metadata, location_info)
            target_dir = str(self.pending_dir)
        else:
            new_filename = self._generate_normal_name(location_info, metadata)

        new_filename = self._sanitize_filename(new_filename)
        new_full_path = str(Path(target_dir) / (new_filename + Path(original_path).suffix.lower()))

        if existing_names and new_full_path in existing_names:
            issues.append(self.ISSUE_NAME_CONFLICT)
            needs_confirmation = True
            new_filename = self._resolve_conflict(new_filename, existing_names)
            new_full_path = str(Path(target_dir) / (new_filename + Path(original_path).suffix.lower()))

        if not needs_confirmation and location_info is not None:
            if self._has_invalid_chars(location_info):
                issues.append(self.ISSUE_INVALID_CHARS)
                needs_confirmation = True

        return NameGenerationResult(
            original_path=original_path,
            new_filename=new_filename + Path(original_path).suffix.lower(),
            new_directory=target_dir,
            new_full_path=new_full_path,
            location_info=location_info,
            metadata=metadata,
            issues=issues,
            needs_confirmation=needs_confirmation,
        )

    def _generate_normal_name(self, location_info: LocationInfo, metadata: PhotoMetadata) -> str:
        """生成正常的文件名"""
        return self.name_template.format(
            project=self._clean_field(location_info.project),
            building=self._clean_field(location_info.building),
            floor=self._clean_field(location_info.floor),
            position=self._clean_field(location_info.position),
            shoot_time=metadata.shoot_time_str,
        )

    def _generate_pending_name(
        self,
        original_path: str,
        metadata: PhotoMetadata,
        location_info: Optional[LocationInfo],
    ) -> str:
        """生成待确认的文件名"""
        original_name = Path(original_path).stem

        if location_info and location_info.is_partial():
            parts = []
            if location_info.project:
                parts.append(self._clean_field(location_info.project))
            if location_info.building:
                parts.append(self._clean_field(location_info.building))
            if location_info.floor:
                parts.append(self._clean_field(location_info.floor))
            if location_info.position:
                parts.append(self._clean_field(location_info.position))
            parts.append(metadata.shoot_time_str)
            parts.append(f"[{original_name}]")
            return "_".join(parts)

        return f"{metadata.shoot_time_str}_[{original_name}]"

    def _build_target_dir(self, location_info: LocationInfo) -> Path:
        """构建目标目录路径"""
        return (
            self.output_dir
            / self._clean_field(location_info.project)
            / self._clean_field(location_info.building)
            / self._clean_field(location_info.floor)
            / self._clean_field(location_info.position)
        )

    @staticmethod
    def _clean_field(field: str) -> str:
        """清理字段中的空格和特殊字符"""
        field = field.strip()
        field = re.sub(r'[\s\\/:*?"<>|]+', '_', field)
        return field

    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        """清理文件名中的非法字符"""
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            filename = filename.replace(char, '_')
        return filename.strip().strip('.')

    @staticmethod
    def _resolve_conflict(filename: str, existing_names: set) -> str:
        """解决文件名冲突，添加序号"""
        base_name = filename
        counter = 1
        while f"{base_name}_{counter}" in existing_names:
            counter += 1
        return f"{base_name}_{counter}"

    @staticmethod
    def _format_missing_fields(location_info: LocationInfo) -> str:
        """格式化缺失的字段信息"""
        missing = []
        if not location_info.project:
            missing.append("项目")
        if not location_info.building:
            missing.append("楼栋")
        if not location_info.floor:
            missing.append("楼层")
        if not location_info.position:
            missing.append("部位")
        return ", ".join(missing)

    @staticmethod
    def _has_invalid_chars(location_info: LocationInfo) -> bool:
        """检查位置信息是否包含非法字符"""
        pattern = re.compile(r'[<>:"/\\|?*]')
        return any(
            pattern.search(field)
            for field in [
                location_info.project,
                location_info.building,
                location_info.floor,
                location_info.position,
            ]
        )

    @property
    def unresolved_dir(self) -> Path:
        """获取待确认目录"""
        return self.pending_dir
