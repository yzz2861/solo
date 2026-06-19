from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Any, Optional


class ContractStatus(str, Enum):
    ACTIVE = "active"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    RENEWAL_IN_PROGRESS = "renewal_in_progress"
    RENEWED = "renewed"


class RiskLevel(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskType(str, Enum):
    LOW_USAGE = "low_usage"
    HIGH_TICKETS = "high_tickets"
    EXPIRING_SOON = "expiring_soon"
    FORECAST_MISMATCH = "forecast_mismatch"
    ZERO_USAGE_WITH_PILOT = "zero_usage_with_pilot"
    TICKET_REOPENED = "ticket_reopened"
    CONTRACT_RENEWAL_PENDING = "contract_renewal_pending"
    CUSTOMER_RENAMED = "customer_renamed"
    FORECAST_MISSING = "forecast_missing"
    USAGE_MISSING = "usage_missing"


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING_CUSTOMER = "pending_customer"
    CLOSED = "closed"
    REOPENED = "reopened"


class ForecastCategory(str, Enum):
    WON = "won"
    COMMITTED = "committed"
    BEST_CASE = "best_case"
    PIPELINE = "pipeline"
    OMITTED = "omitted"
    LOST = "lost"


@dataclass
class CustomerAlias:
    canonical_name: str
    aliases: list[str] = field(default_factory=list)
    previous_names: list[str] = field(default_factory=list)
    rename_date: Optional[date] = None
    notes: Optional[str] = None


@dataclass
class Contract:
    contract_id: str
    customer_name: str
    canonical_customer_name: str = ""
    contract_value: float = 0.0
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: ContractStatus = ContractStatus.ACTIVE
    owner_name: str = ""
    owner_email: str = ""
    product: str = ""
    auto_renewal: bool = False
    renewal_notes: str = ""
    is_renewal_in_progress: bool = False
    raw_data: dict[str, Any] = field(default_factory=dict)


@dataclass
class UsageRecord:
    customer_name: str
    canonical_customer_name: str = ""
    period: str = ""
    period_end: Optional[date] = None
    active_users: int = 0
    total_licenses: int = 0
    utilization_rate: float = 0.0
    core_features_used: int = 0
    total_core_features: int = 0
    login_last_30_days: int = 0
    has_pilot: bool = False
    pilot_features: str = ""
    raw_data: dict[str, Any] = field(default_factory=dict)

    @property
    def is_zero_usage(self) -> bool:
        return self.active_users == 0 and self.login_last_30_days == 0


@dataclass
class Ticket:
    ticket_id: str
    customer_name: str
    canonical_customer_name: str = ""
    subject: str = ""
    status: TicketStatus = TicketStatus.OPEN
    priority: str = "medium"
    created_at: Optional[date] = None
    closed_at: Optional[date] = None
    reopened_count: int = 0
    is_reopened: bool = False
    category: str = ""
    assigned_to: str = ""
    raw_data: dict[str, Any] = field(default_factory=dict)


@dataclass
class ForecastRecord:
    opportunity_id: str
    customer_name: str
    canonical_customer_name: str = ""
    amount: float = 0.0
    category: ForecastCategory = ForecastCategory.PIPELINE
    close_date: Optional[date] = None
    stage: str = ""
    probability: float = 0.0
    sales_owner: str = ""
    contract_link: str = ""
    notes: str = ""
    raw_data: dict[str, Any] = field(default_factory=dict)


@dataclass
class RiskFlag:
    risk_type: RiskType
    risk_level: RiskLevel
    message: str
    details: dict[str, Any] = field(default_factory=dict)
    previously_reported: bool = False
    change_since_last: Optional[str] = None


@dataclass
class CustomerRenewalRecord:
    canonical_customer_name: str
    all_names: list[str] = field(default_factory=list)
    contracts: list[Contract] = field(default_factory=list)
    usage: list[UsageRecord] = field(default_factory=list)
    tickets: list[Ticket] = field(default_factory=list)
    forecasts: list[ForecastRecord] = field(default_factory=list)
    risks: list[RiskFlag] = field(default_factory=list)
    csm_owner: str = ""
    sales_owner: str = ""
    highest_risk_level: RiskLevel = RiskLevel.NONE
    was_renamed: bool = False
    rename_details: Optional[dict[str, Any]] = None
    next_action: str = ""
    follow_up_date: Optional[date] = None
    raw_merged: dict[str, Any] = field(default_factory=dict)

    @property
    def primary_contract(self) -> Optional[Contract]:
        if not self.contracts:
            return None
        active = [c for c in self.contracts if c.status in (
            ContractStatus.ACTIVE,
            ContractStatus.EXPIRING_SOON,
            ContractStatus.RENEWAL_IN_PROGRESS,
        )]
        if active:
            return min(active, key=lambda c: c.end_date or date.max)
        return self.contracts[0]

    @property
    def latest_usage(self) -> Optional[UsageRecord]:
        if not self.usage:
            return None
        return max(
            self.usage,
            key=lambda u: u.period_end or date.min,
        )

    @property
    def upcoming_end_date(self) -> Optional[date]:
        c = self.primary_contract
        return c.end_date if c else None

    @property
    def open_ticket_count(self) -> int:
        return sum(
            1 for t in self.tickets
            if t.status in (TicketStatus.OPEN, TicketStatus.IN_PROGRESS,
                           TicketStatus.REOPENED, TicketStatus.PENDING_CUSTOMER)
        )

    @property
    def reopened_ticket_count(self) -> int:
        return sum(1 for t in self.tickets if t.is_reopened or t.reopened_count > 0)

    @property
    def contract_value(self) -> float:
        return sum(c.contract_value for c in self.contracts)

    @property
    def has_forecast(self) -> bool:
        return len(self.forecasts) > 0

    @property
    def committed_forecast_amount(self) -> float:
        return sum(
            f.amount for f in self.forecasts
            if f.category in (ForecastCategory.COMMITTED, ForecastCategory.WON)
        )


@dataclass
class Snapshot:
    run_id: str
    run_time: datetime
    baseline_date: date
    records: dict[str, CustomerRenewalRecord] = field(default_factory=dict)
    risk_summary: dict[str, int] = field(default_factory=dict)
    previous_run_id: Optional[str] = None
