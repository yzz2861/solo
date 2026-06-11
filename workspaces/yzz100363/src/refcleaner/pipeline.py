"""主处理管道 - 协调整个参考文献处理流程"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

from .doi_normalizer import process_entry_doi
from .duplicate_detector import detect_duplicates
from .formatter import OutputFormat, OutputFormatter
from .models import (
    ProcessingReport,
    ProcessingStatus,
    ProcessedResult,
    ReferenceEntry,
)
from .validator import validate_entries


class ReferencePipeline:
    def __init__(
        self,
        output_format: str = OutputFormat.GB7714,
        similarity_threshold: float = 75.0,
        preserve_original_order: bool = True,
        include_original_position: bool = False,
    ) -> None:
        self.output_format = output_format
        self.similarity_threshold = similarity_threshold
        self.preserve_original_order = preserve_original_order
        self.include_original_position = include_original_position

    def process(self, entries: list[ReferenceEntry]) -> ProcessedResult:
        start_time = time.time()

        report = ProcessingReport(total_entries=len(entries))

        for entry in entries:
            process_entry_doi(entry)

        duplicate_groups = detect_duplicates(entries, self.similarity_threshold)
        report.duplicate_groups = duplicate_groups
        report.duplicate_entries = sum(
            1 for e in entries if e.status == ProcessingStatus.DUPLICATE
        )

        validate_entries(entries)

        for entry in entries:
            if entry.status == ProcessingStatus.PENDING:
                entry.status = ProcessingStatus.PROCESSED
            if entry.auto_fixes:
                report.auto_fixes_count += len(entry.auto_fixes)
                report.auto_fixed_entries += 1
            if entry.confirmation_items:
                report.confirmation_items_count += len(entry.confirmation_items)
                if entry.needs_confirmation():
                    report.consult_advisor_count += 1
                report.needs_confirmation_entries += 1

        self._assign_output_positions(entries)

        report.processed_entries = sum(
            1 for e in entries if e.status == ProcessingStatus.PROCESSED
        )
        report.error_entries = sum(
            1 for e in entries if e.status == ProcessingStatus.ERROR
        )
        report.processing_time = time.time() - start_time

        return ProcessedResult(entries=entries, report=report)

    def _assign_output_positions(self, entries: list[ReferenceEntry]) -> None:
        if self.preserve_original_order:
            output_pos = 0
            for entry in sorted(entries, key=lambda e: e.original_position):
                if entry.status != ProcessingStatus.DUPLICATE:
                    entry.output_position = output_pos
                    output_pos += 1
                else:
                    entry.output_position = -1
        else:
            output_pos = 0
            for entry in entries:
                if entry.status != ProcessingStatus.DUPLICATE:
                    entry.output_position = output_pos
                    output_pos += 1
                else:
                    entry.output_position = -1

    def format_output(
        self,
        result: ProcessedResult,
        output_format: Optional[str] = None,
        include_original_position: Optional[bool] = None,
    ) -> str:
        fmt = output_format or self.output_format
        include_orig = (
            include_original_position
            if include_original_position is not None
            else self.include_original_position
        )

        formatter = OutputFormatter(
            format_name=fmt,
            numbering=True,
            include_original_position=include_orig,
        )

        return formatter.format_entries(result.get_output_order_entries())

    def format_bibtex(self, result: ProcessedResult) -> str:
        formatter = OutputFormatter(format_name=self.output_format)
        return formatter.format_bibtex(result.get_output_order_entries())


def process_references(
    entries: list[ReferenceEntry],
    output_format: str = OutputFormat.GB7714,
    similarity_threshold: float = 75.0,
    preserve_original_order: bool = True,
    include_original_position: bool = False,
) -> ProcessedResult:
    pipeline = ReferencePipeline(
        output_format=output_format,
        similarity_threshold=similarity_threshold,
        preserve_original_order=preserve_original_order,
        include_original_position=include_original_position,
    )
    return pipeline.process(entries)
