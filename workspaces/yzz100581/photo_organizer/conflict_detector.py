"""冲突检测器和待确认逻辑 - 批量处理照片，检测冲突，分组结果"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from collections import defaultdict
from pathlib import Path

from .location_mapper import LocationMap, LocationMapper
from .metadata_reader import MetadataReader, PhotoMetadata
from .naming_engine import NamingEngine, NameGenerationResult


@dataclass
class ProcessingResult:
    """批量处理结果"""
    success_results: List[NameGenerationResult] = field(default_factory=list)
    pending_results: List[NameGenerationResult] = field(default_factory=list)
    unrecognized_results: List[NameGenerationResult] = field(default_factory=list)
    conflicts: List[NameGenerationResult] = field(default_factory=list)

    @property
    def total_count(self) -> int:
        return len(self.success_results) + len(self.pending_results) + len(self.unrecognized_results)

    @property
    def success_count(self) -> int:
        return len(self.success_results)

    @property
    def pending_count(self) -> int:
        return len(self.pending_results) + len(self.conflicts)

    @property
    def unrecognized_count(self) -> int:
        return len(self.unrecognized_results)

    def get_all_results(self) -> List[NameGenerationResult]:
        """获取所有结果"""
        return self.success_results + self.pending_results + self.unrecognized_results + self.conflicts


class ConflictDetector:
    """冲突检测器"""

    def __init__(
        self,
        photo_dir: str,
        map_file: str,
        output_dir: str,
        min_size_kb: int = 100,
        name_template: str = None,
        building_filter: Optional[str] = None,
    ):
        self.photo_dir = Path(photo_dir)
        self.map_file = Path(map_file)
        self.output_dir = Path(output_dir)
        self.min_size_kb = min_size_kb
        self.name_template = name_template
        self.building_filter = building_filter

        self.location_mapper = LocationMapper(str(self.map_file))
        self.metadata_reader = MetadataReader(min_size_kb=min_size_kb)

    def process(self) -> ProcessingResult:
        """处理所有照片，检测冲突"""
        location_map = self.location_mapper.parse()

        if self.building_filter:
            location_map = location_map.filter_by_building(self.building_filter)

        photo_files = self.metadata_reader.scan_directory(str(self.photo_dir))

        if not photo_files:
            return ProcessingResult()

        pre_results = []
        for photo_path in photo_files:
            location_info = location_map.lookup(Path(photo_path).name)
            metadata = self.metadata_reader.read(photo_path)
            pre_results.append((photo_path, location_info, metadata))

        naming_engine = NamingEngine(str(self.output_dir), self.name_template)

        existing_names = set()
        for target_dir in self._collect_existing_target_dirs(pre_results, naming_engine):
            if target_dir.exists():
                for f in target_dir.iterdir():
                    if f.is_file():
                        existing_names.add(str(f))

        results = []
        generated_paths = set()

        for photo_path, location_info, metadata in pre_results:
            result = naming_engine.generate_name(
                photo_path,
                location_info,
                metadata,
                existing_names | generated_paths,
            )
            generated_paths.add(result.new_full_path)
            results.append(result)

        return self._group_results(results)

    def _collect_existing_target_dirs(self, pre_results, naming_engine: NamingEngine) -> set:
        """收集所有可能的目标目录"""
        dirs = set()
        dirs.add(naming_engine.pending_dir)
        dirs.add(naming_engine.unrecognized_dir)

        for _, location_info, _ in pre_results:
            if location_info and location_info.is_complete():
                dirs.add(naming_engine._build_target_dir(location_info))

        return dirs

    @staticmethod
    def _group_results(results: List[NameGenerationResult]) -> ProcessingResult:
        """将结果分组"""
        grouped = ProcessingResult()

        path_counts = defaultdict(int)
        for result in results:
            path_counts[result.new_full_path] += 1

        for result in results:
            if path_counts[result.new_full_path] > 1:
                if NamingEngine.ISSUE_NO_LOCATION in result.issues:
                    grouped.unrecognized_results.append(result)
                else:
                    grouped.conflicts.append(result)
                continue

            if NamingEngine.ISSUE_NO_LOCATION in result.issues:
                grouped.unrecognized_results.append(result)
            elif result.needs_confirmation:
                grouped.pending_results.append(result)
            else:
                grouped.success_results.append(result)

        return grouped
