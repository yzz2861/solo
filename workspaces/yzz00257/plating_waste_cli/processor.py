import os
from datetime import datetime
from typing import List, Dict, Tuple
from .models import (
    PlatingRecord, RecordStatus, ExceptionType, ProcessingSummary
)
from .rules import RuleEngine
from .csv_io import (
    read_plating_csv, read_history_snapshot, _make_unique_key,
    write_pass_csv, write_exception_csv, write_bad_row_csv,
    write_summary_json, write_summary_csv,
)
from .validator import validate_csv_structure
from .utils import generate_batch_id, ensure_dir


class PlatingProcessor:
    def __init__(
        self,
        input_csv: str,
        rule_config: str,
        history_snapshot: str = "",
        output_dir: str = "./output",
        dry_run: bool = False,
        batch_id: str = "",
    ):
        self.input_csv = input_csv
        self.rule_config = rule_config
        self.history_snapshot = history_snapshot
        self.output_dir = output_dir
        self.dry_run = dry_run
        self.batch_id = batch_id or generate_batch_id()
        self.source_file = os.path.basename(input_csv)

        self.records: List[PlatingRecord] = []
        self.bad_rows: List[Dict] = []
        self.fieldnames: List[str] = []
        self.rule_engine: RuleEngine = None
        self.history: Dict[str, PlatingRecord] = {}
        self.summary: ProcessingSummary = None

    def load(self) -> Tuple[List[str], List[str]]:
        """加载所有输入数据，返回(结构校验错误, 规则校验错误)"""
        self.records, self.fieldnames, self.bad_rows = read_plating_csv(self.input_csv)

        from .validator import validate_rule_config
        valid, rule_errors, engine = validate_rule_config(self.rule_config)
        if valid and engine:
            self.rule_engine = engine

        required_names = [rf.name for rf in engine.required_fields] if engine else []
        struct_errors = validate_csv_structure(self.fieldnames, required_names)

        if self.history_snapshot:
            self.history = read_history_snapshot(self.history_snapshot)

        return struct_errors, rule_errors

    def process(self) -> ProcessingSummary:
        """执行主处理流程"""
        self.summary = ProcessingSummary(
            batch_id=self.batch_id,
            source_file=self.source_file,
            total_input=len(self.records) + len(self.bad_rows),
            bad_row_count=len(self.bad_rows),
            dry_run=self.dry_run,
        )

        seen_keys = set()

        for record in self.records:
            record.batch_id = self.batch_id
            record.source_file = self.source_file

            missing = self.rule_engine.check_required_fields(record)
            if missing:
                record.status = RecordStatus.EXCEPTION
                record.exception_types.append(ExceptionType.MISSING_FIELD)
                record.exception_messages.extend(missing)
                self.summary.missing_field_count += 1

            matched_rules = self.rule_engine.check_rules(record)
            if matched_rules:
                record.rule_matches = [r.id for r in matched_rules]
                conflicting = [r for r in matched_rules if r.severity == "error" or r.action == "reject"]
                if conflicting and record.status != RecordStatus.EXCEPTION:
                    record.status = RecordStatus.EXCEPTION
                    record.exception_types.append(ExceptionType.RULE_CONFLICT)
                if conflicting:
                    for r in conflicting:
                        msg = r.message or f"规则冲突: {r.name}({r.id})"
                        record.exception_messages.append(msg)
                    self.summary.rule_conflict_count += 1

            key = _make_unique_key(record)
            if key:
                is_dup = False
                if key in self.history:
                    is_dup = True
                    dup_source = "历史快照"
                if key in seen_keys:
                    is_dup = True
                    dup_source = "本批次"
                if is_dup:
                    if record.status != RecordStatus.EXCEPTION:
                        record.status = RecordStatus.EXCEPTION
                    record.exception_types.append(ExceptionType.DUPLICATE)
                    record.exception_messages.append(f"重复记录（来源: {dup_source}）")
                    self.summary.duplicate_count += 1
                seen_keys.add(key)

            if record.status == RecordStatus.PASS:
                self.summary.pass_count += 1
            else:
                self.summary.exception_count += 1

        self.summary.finished_at = datetime.now()
        return self.summary

    def export(self) -> Dict[str, str]:
        """导出结果文件"""
        if self.dry_run:
            return {}

        ensure_dir(self.output_dir)

        base = os.path.splitext(self.source_file)[0]
        pass_file = os.path.join(self.output_dir, f"{base}_pass_{self.batch_id}.csv")
        exception_file = os.path.join(self.output_dir, f"{base}_exception_{self.batch_id}.csv")
        bad_row_file = os.path.join(self.output_dir, f"{base}_badrows_{self.batch_id}.csv")
        summary_json = os.path.join(self.output_dir, f"{base}_summary_{self.batch_id}.json")
        summary_csv = os.path.join(self.output_dir, f"{base}_summary_{self.batch_id}.csv")

        self.summary.output_pass_file = pass_file
        self.summary.output_exception_file = exception_file
        self.summary.output_summary_file = summary_json
        self.summary.bad_row_file = bad_row_file

        pass_records = [r for r in self.records if r.status == RecordStatus.PASS]
        exception_records = [r for r in self.records if r.status == RecordStatus.EXCEPTION]

        write_pass_csv(pass_file, pass_records, self.fieldnames, self.batch_id)
        write_exception_csv(exception_file, exception_records, self.fieldnames, self.batch_id)
        write_bad_row_csv(bad_row_file, self.bad_rows, self.batch_id, self.source_file)
        write_summary_json(summary_json, self.summary.to_dict())
        write_summary_csv(summary_csv, self.summary.to_dict())

        return {
            "pass": pass_file,
            "exception": exception_file,
            "bad_rows": bad_row_file,
            "summary_json": summary_json,
            "summary_csv": summary_csv,
        }

    def get_exit_code(self) -> int:
        """根据处理结果返回退出码"""
        if not self.summary:
            return 2
        if self.summary.exception_count > 0 or self.summary.bad_row_count > 0:
            return 1
        return 0
