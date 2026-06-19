from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

from .importers import ImportResult
from .models import (
    Contract,
    CustomerRenewalRecord,
    ForecastRecord,
    Ticket,
    UsageRecord,
)
from .name_matcher import CustomerNameMatcher, MatchResult


@dataclass
class MergeStats:
    total_customers: int = 0
    contracts_matched: int = 0
    contracts_unmatched: int = 0
    usage_matched: int = 0
    usage_unmatched: int = 0
    tickets_matched: int = 0
    tickets_unmatched: int = 0
    forecasts_matched: int = 0
    forecasts_unmatched: int = 0
    renamed_customers: int = 0
    fuzzy_matches: list[dict] = field(default_factory=list)
    new_customers: list[str] = field(default_factory=list)
    low_confidence_matches: list[dict] = field(default_factory=list)


@dataclass
class MergeResult:
    records: dict[str, CustomerRenewalRecord]
    stats: MergeStats
    matcher: CustomerNameMatcher


def _build_rename_details(match: MatchResult, raw_name: str) -> dict:
    alias_obj = match.alias_obj
    return {
        "raw_name": raw_name,
        "canonical_name": match.canonical_name,
        "previous_names": alias_obj.previous_names if alias_obj else [],
        "rename_date": alias_obj.rename_date if alias_obj else None,
        "notes": alias_obj.notes if alias_obj else None,
        "match_type": match.match_type,
    }


def merge_data(
    contracts: list[Contract],
    usage_records: list[UsageRecord],
    tickets: list[Ticket],
    forecasts: list[ForecastRecord],
    matcher: Optional[CustomerNameMatcher] = None,
    match_threshold: int = 70,
    baseline_date: Optional[date] = None,
) -> MergeResult:
    matcher = matcher or CustomerNameMatcher()
    stats = MergeStats()
    baseline = baseline_date or date.today()

    all_raw_names: list[str] = []
    for c in contracts:
        all_raw_names.append(c.customer_name)
    for u in usage_records:
        all_raw_names.append(u.customer_name)
    for t in tickets:
        all_raw_names.append(t.customer_name)
    for f in forecasts:
        all_raw_names.append(f.customer_name)
    matcher.bulk_learn_names(all_raw_names, threshold=match_threshold)

    records: dict[str, CustomerRenewalRecord] = {}

    def _get_record(canonical: str, raw_name: str, match: MatchResult) -> CustomerRenewalRecord:
        if canonical not in records:
            record = CustomerRenewalRecord(
                canonical_customer_name=canonical,
                all_names=[],
            )
            records[canonical] = record
        record = records[canonical]
        if raw_name and raw_name not in record.all_names:
            record.all_names.append(raw_name)
        if match.is_rename and not record.was_renamed:
            record.was_renamed = True
            record.rename_details = _build_rename_details(match, raw_name)
            stats.renamed_customers += 1
        return record

    for contract in contracts:
        canonical, match = matcher.ensure_canonical(contract.customer_name, threshold=match_threshold)
        contract.canonical_customer_name = canonical
        record = _get_record(canonical, contract.customer_name, match)
        record.contracts.append(contract)
        stats.contracts_matched += 1
        if contract.owner_name:
            record.csm_owner = contract.owner_name
        _track_match(match, contract.customer_name, canonical, "contract", stats)

    for usage in usage_records:
        canonical, match = matcher.ensure_canonical(usage.customer_name, threshold=match_threshold)
        usage.canonical_customer_name = canonical
        record = _get_record(canonical, usage.customer_name, match)
        record.usage.append(usage)
        stats.usage_matched += 1
        _track_match(match, usage.customer_name, canonical, "usage", stats)

    for ticket in tickets:
        canonical, match = matcher.ensure_canonical(ticket.customer_name, threshold=match_threshold)
        ticket.canonical_customer_name = canonical
        record = _get_record(canonical, ticket.customer_name, match)
        record.tickets.append(ticket)
        stats.tickets_matched += 1
        _track_match(match, ticket.customer_name, canonical, "ticket", stats)

    for forecast in forecasts:
        canonical, match = matcher.ensure_canonical(forecast.customer_name, threshold=match_threshold)
        forecast.canonical_customer_name = canonical
        record = _get_record(canonical, forecast.customer_name, match)
        record.forecasts.append(forecast)
        stats.forecasts_matched += 1
        if forecast.sales_owner:
            record.sales_owner = forecast.sales_owner
        _track_match(match, forecast.customer_name, canonical, "forecast", stats)

    stats.total_customers = len(records)

    for record in records.values():
        if not record.csm_owner and record.contracts:
            record.csm_owner = record.contracts[0].owner_name
        if not record.sales_owner and record.forecasts:
            record.sales_owner = record.forecasts[0].sales_owner

    return MergeResult(records=records, stats=stats, matcher=matcher)


def _track_match(match: MatchResult, raw_name: str, canonical: str, source: str, stats: MergeStats) -> None:
    if match.match_type == "new_customer":
        if canonical not in stats.new_customers:
            stats.new_customers.append(canonical)
    if match.match_type not in ("explicit_alias", "normalized", "new_customer"):
        entry = {
            "source": source,
            "raw_name": raw_name,
            "canonical_name": canonical,
            "match_type": match.match_type,
            "score": match.score,
        }
        stats.fuzzy_matches.append(entry)
        if match.score < 80:
            stats.low_confidence_matches.append(entry)
