from typing import Optional, List
from dataclasses import dataclass, field
from datetime import datetime
from .enums import AuthStatus, RiskLevel, ActionType
from .luxury import LuxuryItem
from .channel import SourceChannel


@dataclass
class AuthItem:
    item_no: str
    luxury: LuxuryItem
    source_channel: SourceChannel
    status: AuthStatus = AuthStatus.PENDING
    risk_level: Optional[RiskLevel] = None
    risk_score: Optional[float] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        if isinstance(self.status, str):
            self.status = AuthStatus(self.status)
        if isinstance(self.risk_level, str):
            self.risk_level = RiskLevel(self.risk_level)
        if isinstance(self.luxury, dict):
            self.luxury = LuxuryItem(**self.luxury)
        if isinstance(self.source_channel, dict):
            self.source_channel = SourceChannel(**self.source_channel)


@dataclass
class AuthItemResult:
    item_no: str
    status: AuthStatus
    risk_level: RiskLevel
    risk_score: float
    passed: bool
    reasons: List[str] = field(default_factory=list)
    missing_materials: List[str] = field(default_factory=list)
    triggered_rules: List[str] = field(default_factory=list)
    reviewed: bool = False
    review_opinion: Optional[str] = None
    review_by: Optional[str] = None
    review_at: Optional[datetime] = None
    trace_id: Optional[str] = None

    def __post_init__(self):
        if isinstance(self.status, str):
            self.status = AuthStatus(self.status)
        if isinstance(self.risk_level, str):
            self.risk_level = RiskLevel(self.risk_level)
