from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import List, Optional, Dict, Any


class MaterialType(str, Enum):
    TRANSCRIPT = "transcript"
    RECOMMENDATION = "recommendation"
    PASSPORT = "passport"
    ESSAY = "essay"
    CV = "cv"
    PERSONAL_STATEMENT = "personal_statement"
    CERTIFICATE = "certificate"
    OTHER = "other"


class Language(str, Enum):
    EN = "en"
    CN = "cn"
    BOTH = "both"


class IssueSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class IssueCategory(str, Enum):
    MISSING = "missing"
    VERSION = "version"
    FILENAME = "filename"
    SIGNATURE = "signature"
    PASSPORT_EXPIRY = "passport_expiry"
    ESSAY_CONFLICT = "essay_conflict"
    PHOTO_COPY = "photo_copy"
    INTERNAL_NOTE = "internal_note"


@dataclass
class SchoolRequirement:
    school_name: str
    program: str
    deadline: date
    required_materials: List[Dict[str, Any]] = field(default_factory=list)
    essay_prompts: List[str] = field(default_factory=list)
    notes: str = ""
    internal_notes: str = ""


@dataclass
class MaterialFile:
    file_path: str
    file_name: str
    file_size: int
    modified_time: float
    material_type: MaterialType
    language: Optional[Language] = None
    version: Optional[str] = None
    is_final: bool = False
    is_photo: bool = False
    has_signature: Optional[bool] = None
    recommender_name: Optional[str] = None
    expiry_date: Optional[date] = None
    essay_prompt_hint: Optional[str] = None
    school_hint: Optional[str] = None


@dataclass
class Issue:
    category: IssueCategory
    severity: IssueSeverity
    message: str
    material_type: Optional[MaterialType] = None
    school: Optional[str] = None
    file_name: Optional[str] = None
    details: str = ""


@dataclass
class StudentProfile:
    name: str
    directory: str
    schools: List[SchoolRequirement] = field(default_factory=list)
    materials: List[MaterialFile] = field(default_factory=list)
    issues: List[Issue] = field(default_factory=list)
