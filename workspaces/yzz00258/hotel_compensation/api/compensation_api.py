from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import copy

from ..models import (
    CompensationObject,
    CompensationResult,
    CompensationRecord,
    RuleSet,
    Conclusion,
    NextAction,
    ObjectStatus,
    RiskLevel
)
from ..engine import RuleEngine, RiskEngine, ReviewEngine
from ..utils import ConsoleOutput, FileHandler


class CompensationAPI:
    def __init__(self, rule_set: RuleSet, output_dir: str = "./output",
                 use_console: bool = True):
        self.rule_set = rule_set
        self.rule_engine = RuleEngine(rule_set)
        self.risk_engine = RiskEngine()
        self.review_engine = ReviewEngine()
        self.console = ConsoleOutput(use_color=use_console)
        self.file_handler = FileHandler(output_dir=output_dir)
        self.records: Dict[str, CompensationRecord] = {}
        self.use_console = use_console

    def _get_or_create_record(self, business_no: str) -> CompensationRecord:
        if business_no not in self.records:
            self.records[business_no] = CompensationRecord(business_no=business_no)
        return self.records[business_no]

    def _is_duplicate(self, obj: CompensationObject) -> bool:
        record = self.records.get(obj.business_no)
        if not record:
            return False
        return record.is_duplicate_submission(obj.rule_version)

    def submit_single(self,
                     business_no: str,
                     object_status: str,
                     time_window: str,
                     rule_version: str,
                     operator: str,
                     **kwargs) -> CompensationResult:
        if self.use_console:
            self.console.title(f"处理客诉补偿 - {business_no}")
            self.console.info(f"操作人: {operator} | 规则版本: {rule_version}")

        obj = CompensationObject(
            business_no=business_no,
            object_status=object_status,
            time_window=time_window,
            rule_version=rule_version,
            operator=operator,
            **kwargs
        )

        record = self._get_or_create_record(business_no)

        is_dup = self._is_duplicate(obj)

        if is_dup:
            latest = record.latest_result()
            result = CompensationResult(
                business_no=business_no,
                conclusion=latest.conclusion if latest else Conclusion.REVIEW,
                risk_label=latest.risk_label if latest else RiskLevel.MEDIUM,
                next_action=NextAction.MANUAL_REVIEW,
                audit_id=latest.audit_id if latest else "",
                matched_rule_id=latest.matched_rule_id if latest else None,
                rule_version=rule_version,
                review_required=True,
                review_reason="重复提交，需人工确认",
                is_duplicate=True,
                success=True
            )
        else:
            result = self.rule_engine.execute(obj)

        record.add_result(result)

        if result.success and not is_dup:
            if result.review_required:
                self.review_engine.update_record_status(
                    record, record.current_status, ObjectStatus.REVIEWING,
                    operator, result.review_reason or "进入复核流程"
                )
            elif result.conclusion == Conclusion.APPROVE:
                self.review_engine.update_record_status(
                    record, record.current_status, ObjectStatus.APPROVED,
                    operator, "自动审批通过"
                )
            elif result.conclusion == Conclusion.REJECT:
                self.review_engine.update_record_status(
                    record, record.current_status, ObjectStatus.REJECTED,
                    operator, "自动拒绝"
                )

        if self.use_console:
            self.console.print_result(result)

        return result

    def submit_batch(self, objects: List[Dict[str, Any]]) -> Tuple[List[CompensationResult], List[Dict[str, Any]]]:
        if self.use_console:
            self.console.title(f"批量处理客诉补偿 - 共{len(objects)}条")

        results = []
        bad_rows = []

        for idx, obj_data in enumerate(objects):
            try:
                required = ["business_no", "object_status", "time_window", "rule_version", "operator"]
                missing = [f for f in required if f not in obj_data or not obj_data[f]]

                if missing:
                    bad_rows.append({
                        "index": idx,
                        "data": obj_data,
                        "errors": [f"缺少必需字段: {f}" for f in missing]
                    })
                    continue

                result = self.submit_single(**obj_data)
                results.append(result)

            except Exception as e:
                bad_rows.append({
                    "index": idx,
                    "data": obj_data,
                    "errors": [f"处理异常: {str(e)}"]
                })

        if self.use_console:
            self.console.print_batch_summary(results, bad_rows)

        if bad_rows:
            bad_file = self.file_handler.save_bad_rows(
                bad_rows, reason="批量处理坏行隔离"
            )
            if self.use_console:
                self.console.info(f"坏行已隔离至: {bad_file}")

        report_file = self.file_handler.save_batch_report(results, bad_rows)
        if self.use_console:
            self.console.info(f"批量报告已保存至: {report_file}")

        return results, bad_rows

    def review_approval(self,
                       business_no: str,
                       audit_id: str,
                       reviewer: str,
                       approve: bool,
                       review_comment: str = "") -> Optional[CompensationResult]:
        record = self.records.get(business_no)
        if not record:
            if self.use_console:
                self.console.error(f"未找到业务记录: {business_no}")
            return None

        latest = record.latest_result()
        if not latest:
            if self.use_console:
                self.console.error(f"业务记录无处理结果: {business_no}")
            return None

        if not latest.review_required:
            if self.use_console:
                self.console.warning(f"该业务无需复核: {business_no}")

        success, msg = self.review_engine.review(
            business_no, audit_id, reviewer, approve, review_comment
        )

        if not success:
            if self.use_console:
                self.console.error(f"复核操作失败: {msg}")
            return None

        new_result = self.review_engine.create_review_result(
            latest, reviewer, approve, review_comment
        )

        record.add_result(new_result)

        if approve:
            self.review_engine.update_record_status(
                record, record.current_status, ObjectStatus.APPROVED,
                reviewer, f"复核通过: {review_comment}"
            )
        else:
            self.review_engine.update_record_status(
                record, record.current_status, ObjectStatus.REJECTED,
                reviewer, f"复核拒绝: {review_comment}"
            )

        if self.use_console:
            self.console.title(f"复核完成 - {business_no}")
            self.console.success(f"复核人: {reviewer} | 结果: {'通过' if approve else '拒绝'}")
            if review_comment:
                self.console.info(f"复核意见: {review_comment}")
            self.console.print_result(new_result)

        return new_result

    def get_review_entries(self) -> List[CompensationRecord]:
        review_records = []
        for record in self.records.values():
            if record.requires_review():
                review_records.append(record)

        if self.use_console:
            self.console.title(f"待复核列表 - 共{len(review_records)}条")
            for record in review_records:
                self.console.print_review_entry(record)

        return review_records

    def get_record(self, business_no: str) -> Optional[CompensationRecord]:
        return self.records.get(business_no)

    def get_all_records(self) -> Dict[str, CompensationRecord]:
        return copy.deepcopy(self.records)

    def export_results(self, results: List[CompensationResult],
                       format: str = "json") -> str:
        if format == "csv":
            return self.file_handler.save_results_csv(results)
        else:
            return self.file_handler.save_results_json(results)
