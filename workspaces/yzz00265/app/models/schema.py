from datetime import date, datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator


class CertStatus(str, Enum):
    PASS = "pass"
    BLOCK = "block"
    REVIEW = "review"


class RiskLevel(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RuleCategory(str, Enum):
    SURVIVAL = "survival"
    TREATMENT = "treatment"
    DUPLICATE = "duplicate"
    MATERIAL = "material"
    MANUAL = "manual"
    DATA_QUALITY = "data_quality"


class EvidenceType(str, Enum):
    ID_CARD = "id_card"
    FACE_RECOGNITION = "face_recognition"
    BANK_STATEMENT = "bank_statement"
    MEDICAL_RECORD = "medical_record"
    RESIDENCE_PROOF = "residence_proof"
    WORK_CERT = "work_cert"
    OTHER = "other"


class PersonMasterData(BaseModel):
    person_id: str = Field(..., description="参保人唯一标识")
    name: str = Field(..., description="姓名")
    id_card_no: Optional[str] = Field(None, description="身份证号")
    gender: Optional[str] = Field(None, description="性别")
    birth_date: Optional[date] = Field(None, description="出生日期")
    retirement_date: Optional[date] = Field(None, description="退休日期")
    social_insurance_no: Optional[str] = Field(None, description="社保编号")
    residential_address: Optional[str] = Field(None, description="居住地址")
    registered_address: Optional[str] = Field(None, description="户籍地址")
    phone: Optional[str] = Field(None, description="联系电话")
    bank_account: Optional[str] = Field(None, description="银行账号")
    treatment_type: Optional[str] = Field(None, description="待遇类型：养老/医疗/失业/工伤/生育")
    treatment_status: Optional[str] = Field(None, description="待遇状态：正常/暂停/终止")
    survival_status: Optional[str] = Field(None, description="生存状态：在世/离世/下落不明")
    death_date: Optional[date] = Field(None, description="死亡日期")
    missing_date: Optional[date] = Field(None, description="下落不明日期")


class ApplicationRecord(BaseModel):
    application_id: str = Field(..., description="申请单号")
    person_id: str = Field(..., description="参保人标识")
    apply_date: date = Field(..., description="申请日期")
    apply_type: str = Field(..., description="申请类型：首次认证/周期认证/异议申诉/恢复认证")
    apply_channel: Optional[str] = Field(None, description="申请渠道：窗口/APP/小程序/自助机/单位代办")
    operator: Optional[str] = Field(None, description="经办人")
    remark: Optional[str] = Field(None, description="申请备注")


class EvidenceMaterial(BaseModel):
    material_id: str = Field(..., description="材料标识")
    material_type: EvidenceType = Field(..., description="材料类型")
    material_name: str = Field(..., description="材料名称")
    upload_time: Optional[datetime] = Field(None, description="上传时间")
    verify_status: Optional[str] = Field(None, description="材料核验状态")
    verify_score: Optional[float] = Field(None, description="材料核验得分 0-100")
    ocr_result: Optional[Dict[str, Any]] = Field(None, description="OCR识别结果")
    face_similarity: Optional[float] = Field(None, description="人脸相似度 0-1")


class HistoryStatusRecord(BaseModel):
    record_id: str = Field(..., description="记录标识")
    person_id: str = Field(..., description="参保人标识")
    cert_date: date = Field(..., description="认证日期")
    cert_result: str = Field(..., description="认证结果")
    cert_method: Optional[str] = Field(None, description="认证方式")
    operator: Optional[str] = Field(None, description="经办人")
    failure_reason: Optional[str] = Field(None, description="失败原因")
    review_suggestion: Optional[str] = Field(None, description="复核意见")


class ThresholdConfig(BaseModel):
    face_recognition_pass_score: float = Field(0.8, description="人脸认证通过阈值")
    face_recognition_review_score: float = Field(0.6, description="人脸认证待复核阈值")
    material_verify_pass_score: float = Field(80.0, description="材料核验通过分数")
    duplicate_apply_days: int = Field(30, description="重复申请判定天数")
    survival_verify_cycle_months: int = Field(12, description="生存认证周期（月）")
    max_continuous_fail_count: int = Field(3, description="最大连续失败次数")
    allow_treatment_status: List[str] = Field(
        default_factory=lambda: ["正常"],
        description="允许认证的待遇状态列表"
    )
    high_risk_regions: List[str] = Field(
        default_factory=list,
        description="高风险地区列表"
    )
