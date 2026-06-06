from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

from app.models import (
    InspectionInput,
    InspectionOutput,
    RiskLabel,
    BusinessConclusion,
    NextAction,
    ThresholdConfig,
    generate_audit_number,
    MasterData,
    ApplicationRecord,
    EvidenceMaterial,
    DefectType,
)
from app.rules import (
    assess_defect_risk,
    check_evidence_completeness,
    check_application_time_validity,
    check_id_validity,
    check_config_completeness,
    determine_review_requirement,
    determine_business_conclusion,
    determine_next_action,
    calculate_risk_score,
)
from app.states import InspectionStateMachine
from app.models import InspectionStatus
from app.records import (
    AuditRecordManager,
    BadRowRecord,
    save_result_to_file,
    save_bad_rows_to_file,
    save_audit_summary,
)
from app.utils import get_logger


def load_default_config() -> ThresholdConfig:
    return ThresholdConfig()


class InspectionService:
    def __init__(self, config: Optional[ThresholdConfig] = None):
        self.config = config or load_default_config()
        self.logger = get_logger("inspection-service")
        self.record_manager = AuditRecordManager()

    def _create_state_machine_for_record(self, blade_id: str, applicant: str = "system") -> InspectionStateMachine:
        sm = InspectionStateMachine()
        sm.transition_to(
            InspectionStatus.SUBMITTED,
            operator=applicant,
            remark="申请提交",
            blade_id=blade_id,
        )
        sm.transition_to(
            InspectionStatus.AUTO_INSPECTION,
            operator="system",
            remark="进入自动巡检",
            blade_id=blade_id,
        )
        return sm

    def process_single(self, input_data: InspectionInput) -> InspectionOutput:
        self.logger.info(f"开始处理巡检申请: 行号={input_data.row_number}, 申请={input_data.application.application_id}")

        audit_number = generate_audit_number()
        process_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        blade_id = input_data.master_data.blade_id
        app_id = input_data.application.application_id
        applicant = input_data.application.applicant

        state_machine = self._create_state_machine_for_record(blade_id, applicant)
        self.logger.debug(f"  状态机初始化完成，当前状态: {state_machine.current_status.value}")

        try:
            is_config_ok, config_errors = check_config_completeness(self.config)
            if not is_config_ok:
                self.logger.error(f"配置校验失败: {config_errors}")

            is_id_ok, id_errors = check_id_validity(
                input_data.master_data, input_data.application
            )
            if not is_id_ok:
                self.logger.warn(f"编号校验失败: {id_errors}")

            is_time_ok, time_error = check_application_time_validity(
                input_data.application, self.config
            )
            if not is_time_ok:
                self.logger.warn(f"时间校验失败: {time_error}")

            evidence_ok, missing_evidence = check_evidence_completeness(
                input_data.evidence_list, self.config
            )
            if not evidence_ok:
                self.logger.warn(f"佐证材料不完整，缺少: {missing_evidence}")

            if is_id_ok and is_time_ok:
                risk_label, assessment_detail = assess_defect_risk(
                    input_data.application, self.config
                )
                risk_score = calculate_risk_score(
                    input_data.application, self.config
                )
            else:
                if not is_id_ok:
                    risk_label = RiskLabel.NO_RISK
                elif not evidence_ok:
                    risk_label = RiskLabel.MISSING_MATERIAL
                else:
                    risk_label = RiskLabel.NO_RISK
                assessment_detail = "数据校验不通过，未进行风险评估"
                risk_score = 0.0

            if not evidence_ok:
                effective_risk = RiskLabel.MISSING_MATERIAL
            else:
                effective_risk = risk_label

            review_required = determine_review_requirement(
                effective_risk, evidence_ok, self.config
            )

            conclusion = determine_business_conclusion(
                effective_risk,
                review_required,
                evidence_ok,
                is_id_ok,
                is_time_ok,
                is_config_ok,
            )

            next_action = determine_next_action(
                conclusion, effective_risk, missing_evidence
            )

            if conclusion == BusinessConclusion.REVIEW_REQUIRED:
                self.logger.info(f"  -> 判定为需复核，进入人工复核流程")
                if state_machine.can_enter_review():
                    state_machine.transition_to(
                        InspectionStatus.PENDING_REVIEW,
                        operator="system",
                        remark="自动巡检判定需复核",
                        blade_id=blade_id,
                    )
                    self.logger.debug(f"  状态流转: AUTO_INSPECTION -> PENDING_REVIEW")
                else:
                    self.logger.warn(f"  当前状态 {state_machine.current_status.value} 无法进入复核")
            elif conclusion == BusinessConclusion.PASS:
                self.logger.info(f"  -> 判定为通过")
                if state_machine.can_pass_directly():
                    state_machine.transition_to(
                        InspectionStatus.COMPLETED,
                        operator="system",
                        remark="自动巡检通过",
                        blade_id=blade_id,
                    )
                    self.logger.debug(f"  状态流转: AUTO_INSPECTION -> COMPLETED")
            elif conclusion == BusinessConclusion.REJECT:
                self.logger.info(f"  -> 判定为拒绝")
                state_machine.transition_to(
                    InspectionStatus.COMPLETED,
                    operator="system",
                    remark="自动巡检拒绝",
                    blade_id=blade_id,
                )
                self.logger.debug(f"  状态流转: AUTO_INSPECTION -> COMPLETED (rejected)")

            final_status = state_machine.current_status.value
            self.logger.debug(f"  最终状态: {final_status}")

            error_msg = ""
            all_errors = []
            if not is_config_ok:
                all_errors.extend(config_errors)
            if not is_id_ok:
                all_errors.extend(id_errors)
            if not is_time_ok and time_error:
                all_errors.append(time_error)
            if all_errors:
                error_msg = "; ".join(all_errors)

            output = InspectionOutput(
                audit_number=audit_number,
                blade_id=blade_id,
                application_id=app_id,
                business_conclusion=conclusion,
                risk_label=effective_risk if evidence_ok else RiskLabel.MISSING_MATERIAL,
                next_action=next_action,
                risk_score=risk_score,
                review_required=review_required,
                missing_evidence_types=missing_evidence,
                defect_assessment=assessment_detail,
                process_time=process_time,
                row_number=input_data.row_number,
                error_message=error_msg,
            )

            self.logger.success(
                f"  -> 处理完成: 结论={conclusion.value}, 风险={effective_risk.value}, "
                f"下一步={next_action.value}, 审计号={audit_number}"
            )

            return output

        except Exception as e:
            self.logger.error(f"处理异常: {str(e)}")
            return InspectionOutput(
                audit_number=audit_number,
                blade_id=blade_id,
                application_id=app_id,
                business_conclusion=BusinessConclusion.PENDING,
                risk_label=RiskLabel.NO_RISK,
                next_action=NextAction.ENTER_REVIEW,
                risk_score=0.0,
                review_required=True,
                missing_evidence_types=[],
                defect_assessment="",
                process_time=process_time,
                row_number=input_data.row_number,
                error_message=f"处理异常: {str(e)}",
            )

    def process_batch(
        self, inputs: List[InspectionInput]
    ) -> Tuple[List[InspectionOutput], List[BadRowRecord]]:
        self.logger.print_banner(f"风机叶片缺陷巡检批量处理 - 共{len(inputs)}条记录")

        results: List[InspectionOutput] = []
        bad_rows: List[BadRowRecord] = []

        for idx, input_data in enumerate(inputs, start=1):
            try:
                output = self.process_single(input_data)
                results.append(output)
                self.record_manager.add_result(output)
            except Exception as e:
                bad_row = BadRowRecord(
                    row_number=input_data.row_number or idx,
                    raw_data=input_data.raw_data,
                    error_type="processing_error",
                    error_message=str(e),
                    process_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                )
                bad_rows.append(bad_row)
                self.record_manager.add_bad_row(bad_row)
                self.logger.error(
                    f"行{input_data.row_number or idx}处理失败，已隔离: {str(e)}"
                )

        summary = self.record_manager.get_summary()
        self.logger.print_summary(summary)

        return results, bad_rows

    def save_results(self, results: List[InspectionOutput], bad_rows: List[BadRowRecord]):
        batch_id = self.record_manager.batch_id

        result_file = save_result_to_file(results, batch_id=batch_id)
        self.logger.info(f"结果文件已保存: {result_file}")

        if bad_rows:
            bad_file = save_bad_rows_to_file(bad_rows, batch_id=batch_id)
            self.logger.info(f"坏行文件已保存: {bad_file}")

        summary = self.record_manager.get_summary()
        summary_file = save_audit_summary(summary, batch_id=batch_id)
        self.logger.info(f"审计摘要已保存: {summary_file}")

        return result_file

    def get_review_entry_info(self) -> Dict[str, Any]:
        temp_sm = InspectionStateMachine()
        return temp_sm.get_review_entry_point()


def process_single_inspection(
    input_data: InspectionInput,
    config: Optional[ThresholdConfig] = None,
) -> InspectionOutput:
    service = InspectionService(config=config)
    return service.process_single(input_data)


def process_batch_inspection(
    inputs: List[InspectionInput],
    config: Optional[ThresholdConfig] = None,
    save_files: bool = True,
) -> Tuple[List[InspectionOutput], List[BadRowRecord], Dict[str, Any]]:
    service = InspectionService(config=config)
    results, bad_rows = service.process_batch(inputs)
    if save_files:
        service.save_results(results, bad_rows)
    summary = service.record_manager.get_summary()
    return results, bad_rows, summary
