import os
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from .models import (
    ValveRecord,
    ProcessConfig,
    ProcessSummary,
    FieldMapping,
    RecordStatus,
    EXIT_OK,
    EXIT_WITH_EXCEPTIONS,
    EXIT_WITH_ERROR,
)
from .reader import read_all_files, read_field_mapping, read_single_file
from .validator import validate_records, mark_bad_records, build_exception_breakdown, detect_history_replay
from .exporter import export_results, preview_results, update_summary_output


class ValveProcessor:
    def __init__(self, config: ProcessConfig):
        self.config = config
        self.summary = ProcessSummary(
            batch_id=config.batch_id,
            dry_run=config.dry_run,
            source_files=[os.path.basename(f) for f in config.input_files],
        )
        self.passed_records: List[ValveRecord] = []
        self.exception_records: List[ValveRecord] = []
        self.bad_rows: List[Dict] = []

    def run(self) -> Tuple[int, ProcessSummary]:
        try:
            self._read_files()
            self._validate()
            self._build_summary()
            
            if self.config.dry_run:
                self._do_dry_run()
            else:
                self._export()
            
            self.summary.end_time = datetime.now()
            
            if not self.config.dry_run:
                self._update_summary_file()
            
            exit_code = self._determine_exit_code()
            return exit_code, self.summary
            
        except Exception as e:
            self.summary.end_time = datetime.now()
            raise e

    def _read_files(self):
        records, bad_rows = read_all_files(
            self.config.input_files,
            self.config.field_mapping,
            self.config.batch_id,
        )
        self.raw_records = records
        self.bad_rows = mark_bad_records(bad_rows)
        self.summary.total_records = len(records) + len(bad_rows)
        self.summary.bad_count = len(bad_rows)
        
        self.history_records = []
        if self.config.history_files:
            for hf in self.config.history_files:
                h_records, _ = read_single_file(hf, self.config.field_mapping, "HISTORY")
                self.history_records.extend(h_records)

    def _validate(self):
        passed, exceptions = validate_records(self.raw_records, self.config)
        
        if self.history_records:
            replay_in_passed = detect_history_replay(passed, self.history_records)
            replay_in_exceptions = detect_history_replay(exceptions, self.history_records)
            replay_ids = {r.valve_id + str(r.row_number) for r in replay_in_passed + replay_in_exceptions}
            passed = [r for r in passed if (r.valve_id + str(r.row_number)) not in replay_ids]
            exceptions = exceptions + replay_in_passed
        
        self.passed_records = passed
        self.exception_records = exceptions
        self.summary.passed_count = len(passed)
        self.summary.exception_count = len(exceptions)
        self.summary.exception_breakdown = build_exception_breakdown(exceptions, self.bad_rows)

    def _build_summary(self):
        pass

    def _update_summary_file(self):
        update_summary_output(self.summary, self.config)

    def _export(self):
        output_files = export_results(
            self.passed_records,
            self.exception_records,
            self.bad_rows,
            self.summary,
            self.config,
        )
        self.summary.output_files = output_files

    def _do_dry_run(self):
        preview_text = preview_results(
            self.passed_records,
            self.exception_records,
            self.bad_rows,
            self.summary,
        )
        print(preview_text)

    def _determine_exit_code(self) -> int:
        if self.summary.bad_count > 0 or self.summary.exception_count > 0:
            return EXIT_WITH_EXCEPTIONS
        return EXIT_OK


def build_config(
    input_files: List[str],
    output_dir: str,
    mapping_file: Optional[str] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    export_format: str = "csv",
    dry_run: bool = False,
    pressure_threshold: float = 0.5,
    require_material: bool = True,
    batch_id: str = "",
    history_files: Optional[List[str]] = None,
) -> ProcessConfig:
    from .models import ExportFormat

    mapping = read_field_mapping(mapping_file) if mapping_file else FieldMapping()
    
    ds = _parse_date_arg(date_start) if date_start else None
    de = _parse_date_arg(date_end, end_of_day=True) if date_end else None
    
    fmt = ExportFormat(export_format.lower()) if export_format.lower() in [e.value for e in ExportFormat] else ExportFormat.CSV
    
    return ProcessConfig(
        input_files=input_files,
        output_dir=output_dir,
        field_mapping=mapping,
        date_start=ds,
        date_end=de,
        export_format=fmt,
        dry_run=dry_run,
        pressure_threshold=pressure_threshold,
        require_material=require_material,
        batch_id=batch_id,
        history_files=history_files or [],
    )


def _parse_date_arg(date_str: str, end_of_day: bool = False) -> datetime:
    formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y%m%d",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            if end_of_day:
                dt = dt.replace(hour=23, minute=59, second=59)
            return dt
        except ValueError:
            continue
    raise ValueError(f"无法解析日期参数: {date_str}")
