from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Tuple, Optional
import re

from app.models import (
    DefectType,
    RiskLabel,
    BusinessConclusion,
    NextAction,
    ApplicationRecord,
    EvidenceMaterial,
    ThresholdConfig,
    MasterData,
)


@dataclass
class RiskAssessmentResult:
    risk_label: RiskLabel = RiskLabel.NO_RISK
    risk_score: float = 0.0
    assessment_detail: str = ""
    missing_evidence_types: List[str] = field(default_factory=list)
    is_time_valid: bool = True
    is_id_valid: bool = True
    is_config_complete: bool = True
    errors: List[str] = field(default_factory=list)


def calculate_risk_score(
    application: ApplicationRecord,
    config: ThresholdConfig,
) -> float:
    defect_type = application.defect_type
    score = 0.0

    if defect_type == DefectType.CRACK:
        size = application.defect_size_mm
        if size >= config.crack_size_high_mm:
            score = 90.0
        elif size >= config.crack_size_medium_mm:
            score = 60.0
        elif size > 0:
            score = 30.0
        if application.defect_depth_mm > 5:
            score += 15.0

    elif defect_type == DefectType.DELAMINATION:
        area_pct = application.defect_size_mm
        if area_pct >= config.delamination_area_high_pct:
            score = 85.0
        elif area_pct >= config.delamination_area_medium_pct:
            score = 55.0
        elif area_pct > 0:
            score = 25.0

    elif defect_type == DefectType.CORROSION:
        area_pct = application.defect_size_mm
        if area_pct >= config.corrosion_area_high_pct:
            score = 80.0
        elif area_pct >= config.corrosion_area_medium_pct:
            score = 50.0
        elif area_pct > 0:
            score = 20.0

    elif defect_type == DefectType.SURFACE_DAMAGE:
        size = application.defect_size_mm
        if size >= config.surface_damage_high_mm:
            score = 70.0
        elif size >= config.surface_damage_medium_mm:
            score = 45.0
        elif size > 0:
            score = 20.0

    elif defect_type == DefectType.BOLT_LOOSE:
        score = 40.0 if application.defect_size_mm > 0 else 10.0

    elif defect_type == DefectType.PAINT_PEELING:
        score = 25.0 if application.defect_size_mm > 50 else 10.0

    elif defect_type == DefectType.UNKNOWN:
        score = 50.0

    return min(score, 100.0)


def assess_defect_risk(
    application: ApplicationRecord,
    config: ThresholdConfig,
) -> Tuple[RiskLabel, str]:
    score = calculate_risk_score(application, config)
    defect_type = application.defect_type.value

    if score >= 80:
        label = RiskLabel.HIGH
        detail = f"{defect_type}缺陷严重，风险评分{score:.1f}，达到高风险阈值"
    elif score >= 50:
        label = RiskLabel.MEDIUM
        detail = f"{defect_type}缺陷中等，风险评分{score:.1f}，需持续关注"
    elif score >= 20:
        label = RiskLabel.LOW
        detail = f"{defect_type}缺陷轻微，风险评分{score:.1f}，常规处理即可"
    else:
        label = RiskLabel.NO_RISK
        detail = f"{defect_type}缺陷不明显，风险评分{score:.1f}"

    return label, detail


def check_evidence_completeness(
    evidence_list: List[EvidenceMaterial],
    config: ThresholdConfig,
) -> Tuple[bool, List[str]]:
    if not config.required_evidence_types:
        return True, []

    provided_types = {ev.material_type for ev in evidence_list}
    missing = [t for t in config.required_evidence_types if t not in provided_types]

    return len(missing) == 0, missing


def check_application_time_validity(
    application: ApplicationRecord,
    config: ThresholdConfig,
    reference_time: Optional[str] = None,
) -> Tuple[bool, str]:
    try:
        app_date = datetime.strptime(application.application_date, "%Y-%m-%d")
    except (ValueError, TypeError):
        return False, "申请日期格式错误，应为YYYY-MM-DD格式"

    if reference_time:
        try:
            ref_date = datetime.strptime(reference_time, "%Y-%m-%d")
        except (ValueError, TypeError):
            ref_date = datetime.now()
    else:
        ref_date = datetime.now()

    max_age = timedelta(days=config.max_application_age_days)
    age = ref_date - app_date

    if age > max_age:
        return False, f"申请已超过有效期（{config.max_application_age_days}天），申请日期为{application.application_date}"

    if app_date > ref_date:
        return False, "申请日期晚于当前日期，数据异常"

    return True, ""


def check_id_validity(
    master_data: MasterData,
    application: ApplicationRecord,
) -> Tuple[bool, List[str]]:
    errors = []

    if not master_data.blade_id:
        errors.append("叶片编号为空")
    elif not re.match(r'^BLD-[A-Z0-9]{6,}$', master_data.blade_id):
        errors.append(f"叶片编号格式错误: {master_data.blade_id}，应为BLD-开头加6位以上大写字母数字")

    if not application.application_id:
        errors.append("申请编号为空")
    elif not re.match(r'^APP-\d{8}-[A-Z0-9]{4,}$', application.application_id):
        errors.append(f"申请编号格式错误: {application.application_id}，应为APP-YYYYMMDD-序号格式")

    if master_data.blade_id and application.blade_id and master_data.blade_id != application.blade_id:
        errors.append(f"主数据叶片编号({master_data.blade_id})与申请单叶片编号({application.blade_id})不一致")

    return len(errors) == 0, errors


def check_config_completeness(config: ThresholdConfig) -> Tuple[bool, List[str]]:
    errors = []

    if config.crack_size_high_mm <= 0:
        errors.append("裂纹高风险阈值配置缺失或无效")
    if config.crack_size_medium_mm <= 0:
        errors.append("裂纹中风险阈值配置缺失或无效")
    if config.max_application_age_days <= 0:
        errors.append("申请有效期配置缺失或无效")

    if not config.required_evidence_types:
        errors.append("必需佐证材料类型配置缺失")

    if not config.review_required_risk_levels:
        errors.append("复核风险等级配置缺失")

    if config.crack_size_high_mm > 0 and config.crack_size_medium_mm > 0:
        if config.crack_size_high_mm <= config.crack_size_medium_mm:
            errors.append("裂纹高风险阈值必须大于中风险阈值")

    return len(errors) == 0, errors


def determine_review_requirement(
    risk_label: RiskLabel,
    evidence_complete: bool,
    config: ThresholdConfig,
) -> bool:
    if not evidence_complete and "missing_material" in config.review_required_risk_levels:
        return True

    if risk_label.value in config.review_required_risk_levels:
        return True

    return False


def determine_business_conclusion(
    risk_label: RiskLabel,
    review_required: bool,
    evidence_complete: bool,
    is_id_valid: bool,
    is_time_valid: bool,
    is_config_complete: bool,
) -> BusinessConclusion:
    if not is_config_complete:
        return BusinessConclusion.PENDING

    if not is_id_valid:
        return BusinessConclusion.REJECT

    if not is_time_valid:
        return BusinessConclusion.REJECT

    if review_required:
        return BusinessConclusion.REVIEW_REQUIRED

    if risk_label in (RiskLabel.HIGH, RiskLabel.MEDIUM):
        return BusinessConclusion.REVIEW_REQUIRED

    if risk_label == RiskLabel.MISSING_MATERIAL:
        return BusinessConclusion.REVIEW_REQUIRED

    if risk_label in (RiskLabel.LOW, RiskLabel.NO_RISK):
        if evidence_complete:
            return BusinessConclusion.PASS
        else:
            return BusinessConclusion.REVIEW_REQUIRED

    return BusinessConclusion.PENDING


def determine_next_action(
    conclusion: BusinessConclusion,
    risk_label: RiskLabel,
    missing_evidence: List[str],
) -> NextAction:
    if conclusion == BusinessConclusion.PASS:
        if risk_label == RiskLabel.NO_RISK:
            return NextAction.ROUTINE_INSPECTION
        else:
            return NextAction.DIRECT_PASS

    if conclusion == BusinessConclusion.REJECT:
        return NextAction.REJECT_AND_ARCHIVE

    if conclusion == BusinessConclusion.REVIEW_REQUIRED:
        if missing_evidence:
            return NextAction.SUPPLEMENT_MATERIAL
        if risk_label == RiskLabel.HIGH:
            return NextAction.SCHEDULE_REPAIR
        return NextAction.ENTER_REVIEW

    if conclusion == BusinessConclusion.PENDING:
        return NextAction.ENTER_REVIEW

    return NextAction.ENTER_REVIEW
