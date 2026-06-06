from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional, Any


@dataclass
class FHRRecord:
    record_id: str
    patient_id: str
    patient_name: str
    admission_no: str
    exam_time: str
    fhr_baseline: Optional[float] = None
    fhr_variability: Optional[str] = None
    acceleration_count: Optional[int] = None
    deceleration_count: Optional[int] = None
    late_deceleration: Optional[bool] = None
    variable_deceleration: Optional[bool] = None
    duration_minutes: Optional[float] = None
    exam_doctor: Optional[str] = None
    conclusion: Optional[str] = None
    source_file: str = ""
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SupplementRecord:
    record_id: str
    maternal_age: Optional[int] = None
    gestational_weeks: Optional[float] = None
    gravidity: Optional[int] = None
    parity: Optional[int] = None
    high_risk_factors: List[str] = field(default_factory=list)
    delivery_outcome: Optional[str] = None
    apgar_score: Optional[int] = None
    source_file: str = ""
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationRule:
    rule_id: str
    rule_name: str
    field_name: str
    rule_type: str
    operator: str
    threshold: Any
    risk_level: str
    description: str
    enabled: bool = True


@dataclass
class ValidationResult:
    record_id: str
    rule_id: str
    rule_name: str
    passed: bool
    risk_level: str
    message: str
    field_name: str
    actual_value: Any


@dataclass
class ArchiveSummary:
    total_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    review_required: int = 0
    risk_counts: Dict[str, int] = field(default_factory=dict)
    missing_material_count: int = 0
    over_threshold_count: int = 0
    batch_id: str = ""
    source_identifier: str = ""
    generated_at: str = ""


@dataclass
class DetailRecord:
    record_id: str
    patient_id: str
    patient_name: str
    admission_no: str
    exam_time: str
    risk_tags: List[str] = field(default_factory=list)
    risk_level: str = "normal"
    validation_results: List[ValidationResult] = field(default_factory=list)
    needs_review: bool = False
    review_reason: str = ""
    batch_id: str = ""
    source_identifier: str = ""
    supplement_info: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ReviewItem:
    record_id: str
    patient_name: str
    exam_time: str
    risk_level: str
    review_reason: str
    risk_tags: List[str] = field(default_factory=list)
    batch_id: str = ""
    source_identifier: str = ""


@dataclass
class ProcessBatch:
    batch_id: str
    source_identifier: str
    processed_at: str
    record_count: int
    input_files: List[str] = field(default_factory=list)
    checksum: str = ""
