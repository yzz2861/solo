from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
import uuid


class DefectType(str, Enum):
    CRACK = "crack"
    DELAMINATION = "delamination"
    CORROSION = "corrosion"
    SURFACE_DAMAGE = "surface_damage"
    BOLT_LOOSE = "bolt_loose"
    PAINT_PEELING = "paint_peeling"
    UNKNOWN = "unknown"


class RiskLabel(str, Enum):
    HIGH = "high_risk"
    MEDIUM = "medium_risk"
    LOW = "low_risk"
    NO_RISK = "no_risk"
    MISSING_MATERIAL = "missing_material"


class BusinessConclusion(str, Enum):
    PASS = "pass"
    REJECT = "reject"
    REVIEW_REQUIRED = "review_required"
    PENDING = "pending"


class NextAction(str, Enum):
    DIRECT_PASS = "direct_pass"
    ENTER_REVIEW = "enter_review"
    SUPPLEMENT_MATERIAL = "supplement_material"
    SCHEDULE_REPAIR = "schedule_repair"
    ROUTINE_INSPECTION = "routine_inspection"
    REJECT_AND_ARCHIVE = "reject_and_archive"


class InspectionStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    AUTO_INSPECTION = "auto_inspection"
    PENDING_REVIEW = "pending_review"
    REVIEW_PASSED = "review_passed"
    REVIEW_REJECTED = "review_rejected"
    COMPLETED = "completed"


@dataclass
class MasterData:
    blade_id: str
    turbine_id: str
    wind_farm_id: str
    blade_model: str
    manufacture_date: str
    install_date: str
    design_life_years: int = 20
    length_meters: float = 0.0
    manufacturer: str = ""


@dataclass
class ApplicationRecord:
    application_id: str
    blade_id: str
    applicant: str
    application_date: str
    inspection_type: str
    defect_type: DefectType
    defect_description: str
    defect_location: str = ""
    defect_size_mm: float = 0.0
    defect_depth_mm: float = 0.0


@dataclass
class EvidenceMaterial:
    evidence_id: str
    application_id: str
    material_type: str
    file_path: str
    upload_time: str
    file_size_bytes: int = 0
    description: str = ""


@dataclass
class HistoricalStatus:
    record_id: str
    blade_id: str
    status: InspectionStatus
    status_time: str
    operator: str
    remark: str = ""


@dataclass
class ThresholdConfig:
    config_id: str = "default"
    crack_size_high_mm: float = 50.0
    crack_size_medium_mm: float = 20.0
    delamination_area_high_pct: float = 5.0
    delamination_area_medium_pct: float = 2.0
    corrosion_area_high_pct: float = 10.0
    corrosion_area_medium_pct: float = 3.0
    surface_damage_high_mm: float = 100.0
    surface_damage_medium_mm: float = 50.0
    max_application_age_days: int = 30
    required_evidence_types: List[str] = field(default_factory=lambda: ["photo", "report"])
    review_required_risk_levels: List[str] = field(default_factory=lambda: ["high_risk", "missing_material"])


@dataclass
class InspectionInput:
    master_data: MasterData
    application: ApplicationRecord
    evidence_list: List[EvidenceMaterial]
    history_list: List[HistoricalStatus]
    threshold_config: ThresholdConfig
    row_number: int = 0
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class InspectionOutput:
    audit_number: str
    blade_id: str
    application_id: str
    business_conclusion: BusinessConclusion
    risk_label: RiskLabel
    next_action: NextAction
    risk_score: float = 0.0
    review_required: bool = False
    missing_evidence_types: List[str] = field(default_factory=list)
    defect_assessment: str = ""
    process_time: str = ""
    row_number: int = 0
    error_message: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "audit_number": self.audit_number,
            "blade_id": self.blade_id,
            "application_id": self.application_id,
            "business_conclusion": self.business_conclusion.value,
            "risk_label": self.risk_label.value,
            "next_action": self.next_action.value,
            "risk_score": self.risk_score,
            "review_required": self.review_required,
            "missing_evidence_types": self.missing_evidence_types,
            "defect_assessment": self.defect_assessment,
            "process_time": self.process_time,
            "row_number": self.row_number,
            "error_message": self.error_message,
        }


def generate_audit_number() -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    unique = uuid.uuid4().hex[:8].upper()
    return f"INS-{timestamp}-{unique}"
