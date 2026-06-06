from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional


class CalibrationStatus(str, Enum):
    COMPLIANT = "compliant"
    OVER_THRESHOLD = "over_threshold"
    MISSING_MATERIAL = "missing_material"
    PENDING_REVIEW = "pending_review"
    CLOSED_LOOP = "closed_loop"


class ThresholdType(str, Enum):
    PM25 = "pm25"
    PM10 = "pm10"
    NO2 = "no2"
    SO2 = "so2"
    CO = "co"
    O3 = "o3"
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"


class MaterialType(str, Enum):
    CALIBRATION_CERTIFICATE = "calibration_certificate"
    MAINTENANCE_LOG = "maintenance_log"
    FLOW_RATE_RECORD = "flow_rate_record"
    STANDARD_GAS_RECORD = "standard_gas_record"
    ZERO_SPAN_RECORD = "zero_span_record"


class GroupDimension(str, Enum):
    STATION = "station"
    REGION = "region"
    DEPARTMENT = "department"
    CALIBRATION_TYPE = "calibration_type"
    STATUS = "status"


@dataclass
class ThresholdHit:
    parameter: str
    measured_value: float
    threshold_value: float
    unit: str
    exceed_ratio: float
    is_upper: bool = True


@dataclass
class CalibrationRecord:
    record_id: str
    station_id: str
    station_name: str
    region: str
    department: str
    calibration_type: str
    calibration_date: datetime
    operator: str
    parameters: Dict[str, float]
    materials: Dict[str, bool]
    raw_data: Dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class ResponsibilityMapping:
    station_id: str
    station_name: str
    region: str
    department: str
    responsible_person: str
    phone: str
    calibration_cycle_days: int
    last_calibration_date: Optional[datetime] = None
    next_calibration_date: Optional[datetime] = None


@dataclass
class ValidationResult:
    record_id: str
    station_id: str
    is_valid: bool
    status: CalibrationStatus
    threshold_hits: List[ThresholdHit] = field(default_factory=list)
    missing_materials: List[str] = field(default_factory=list)
    reasons: List[str] = field(default_factory=list)
    time_window_explanation: str = ""
    dimension_explanation: str = ""


@dataclass
class TrendPoint:
    time_label: str
    total_count: int
    compliant_count: int
    over_threshold_count: int
    missing_material_count: int
    pending_count: int


@dataclass
class StatisticsResult:
    total_records: int
    compliant_count: int
    over_threshold_count: int
    missing_material_count: int
    pending_count: int
    closed_loop_count: int
    compliance_rate: float
    group_stats: Dict[str, Dict[str, int]]
    trend_points: List[TrendPoint]
    top_abnormal_stations: List[Dict]


@dataclass
class ExportFile:
    file_name: str
    file_type: str
    content_type: str
    rows: List[Dict]
    summary: Dict
