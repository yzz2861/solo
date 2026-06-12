from enum import Enum
from .scanner import ScanResult


class RiskLevel(Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    OK = "OK"


RISK_EMOJI = {
    RiskLevel.CRITICAL: "🔴",
    RiskLevel.HIGH: "🟠",
    RiskLevel.MEDIUM: "🟡",
    RiskLevel.LOW: "🔵",
    RiskLevel.OK: "🟢",
}

RISK_COLOR = {
    RiskLevel.CRITICAL: "\033[91m",
    RiskLevel.HIGH: "\033[93m",
    RiskLevel.MEDIUM: "\033[33m",
    RiskLevel.LOW: "\033[34m",
    RiskLevel.OK: "\033[32m",
}

RESET = "\033[0m"


def classify_risk(result: ScanResult) -> RiskLevel:
    if not result.dns_resolved:
        return RiskLevel.HIGH

    if not result.connectable:
        return RiskLevel.MEDIUM

    if result.is_expired:
        return RiskLevel.CRITICAL

    if not result.cert_verified:
        return RiskLevel.HIGH

    if not result.cert_chain_complete:
        return RiskLevel.HIGH

    days = result.days_until_expiry
    if days is None:
        return RiskLevel.MEDIUM

    if days < 7:
        return RiskLevel.CRITICAL
    if days < 30:
        return RiskLevel.HIGH
    if days < 60:
        return RiskLevel.MEDIUM
    if days < 90:
        return RiskLevel.LOW

    return RiskLevel.OK


def risk_label(result: ScanResult) -> str:
    level = classify_risk(result)
    color = RISK_COLOR.get(level, "")
    emoji = RISK_EMOJI.get(level, "")
    return f"{emoji} {color}{level.value}{RESET}"
