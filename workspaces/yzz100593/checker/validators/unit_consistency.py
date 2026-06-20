from __future__ import annotations

import re
from collections import defaultdict
from typing import Dict, List, Set, Tuple

from ..types import (
    Issue,
    IssueKind,
    IssueSeverity,
    SimilarDrug,
    UnitRule,
)

_DRUG_UNIT_RE = re.compile(
    r'([\u4e00-\u9fff\w]+)\s*[:：]\s*([\d.]+)\s*([^\s,，;；\n]+)',
)

_INLINE_UNIT_RE = re.compile(
    r'([\d.]+)\s*([^\s,，;；\n{【〔〖《]+)',
)

_VARIANT_MAP: Dict[str, str] = {}


def _build_variant_map(similar_drugs: List[SimilarDrug]) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for drug in similar_drugs:
        mapping[drug.canonical] = drug.canonical
        for v in drug.variants:
            mapping[v] = drug.canonical
    return mapping


def _normalize_drug(name: str, variant_map: Dict[str, str]) -> str:
    return variant_map.get(name, name)


def _build_unit_lookup(unit_rules: Dict[str, UnitRule]) -> Dict[str, UnitRule]:
    lookup: Dict[str, UnitRule] = dict(unit_rules)
    for rule in list(unit_rules.values()):
        for alias in rule.aliases:
            if alias not in lookup:
                lookup[alias] = rule
    return lookup


def _normalize_unit(raw_unit: str, unit_lookup: Dict[str, UnitRule]) -> str:
    u = raw_unit.strip()
    if u in unit_lookup:
        return unit_lookup[u].canonical
    lower = u.lower()
    for key, rule in unit_lookup.items():
        if key.lower() == lower:
            return rule.canonical
    return u


def check_unit_consistency(
    templates_content: List[Tuple[str, str]],
    unit_rules: Dict[str, UnitRule],
    similar_drugs: List[SimilarDrug],
) -> Dict[str, List[Issue]]:
    unit_lookup = _build_unit_lookup(unit_rules)
    variant_map = _build_variant_map(similar_drugs)
    drug_units: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
    template_issues: Dict[str, List[Issue]] = defaultdict(list)

    for tpath, content in templates_content:
        lines = content.splitlines()
        for line_idx, line in enumerate(lines):
            line_num = line_idx + 1
            for m in _DRUG_UNIT_RE.finditer(line):
                drug_raw = m.group(1)
                amount = m.group(2)
                unit_raw = m.group(3)
                drug_norm = _normalize_drug(drug_raw, variant_map)
                unit_norm = _normalize_unit(unit_raw, unit_lookup)
                drug_units[drug_norm][unit_norm].append(tpath)

            for m in _INLINE_UNIT_RE.finditer(line):
                amount = m.group(1)
                unit_raw = m.group(2)
                if len(unit_raw) > 10 or unit_raw in ("{", "【", "〕", "】", "}", "《", "》"):
                    continue
                if re.match(r'^[\u4e00-\u9fff]+$', unit_raw) and len(unit_raw) > 4:
                    continue

    for drug_norm, units_map in drug_units.items():
        if len(units_map) > 1:
            unit_list = list(units_map.keys())
            for tpath in set(p for paths in units_map.values() for p in paths):
                for unit in unit_list:
                    line_info = ""
                    template_issues[tpath].append(
                        Issue(
                            kind=IssueKind.UNIT_INCONSISTENT,
                            severity=IssueSeverity.ERROR,
                            line=0,
                            col=0,
                            message=f"药品 '{drug_norm}' 存在不一致的单位: {', '.join(unit_list)}",
                            context=f"单位: {unit}",
                        )
                    )

    for tpath, content in templates_content:
        lines = content.splitlines()
        for line_idx, line in enumerate(lines):
            line_num = line_idx + 1
            for m in _DRUG_UNIT_RE.finditer(line):
                drug_raw = m.group(1)
                unit_raw = m.group(3)
                drug_norm = _normalize_drug(drug_raw, variant_map)
                unit_norm = _normalize_unit(unit_raw, unit_lookup)
                if drug_norm in drug_units and len(drug_units[drug_norm]) > 1:
                    for issue in template_issues.get(tpath, []):
                        if issue.line == 0 and drug_norm in issue.message:
                            issue.line = line_num
                            issue.col = m.start() + 1
                            issue.context = line.strip()
                            break

    return template_issues


def check_unit_consistency_single(
    content: str, unit_rules: Dict[str, UnitRule]
) -> List[Issue]:
    unit_lookup = _build_unit_lookup(unit_rules)
    issues: List[Issue] = []
    lines = content.splitlines()
    seen: Dict[str, Set[str]] = defaultdict(set)

    for line_idx, line in enumerate(lines):
        line_num = line_idx + 1
        for m in _DRUG_UNIT_RE.finditer(line):
            drug_raw = m.group(1)
            unit_raw = m.group(3)
            unit_norm = _normalize_unit(unit_raw, unit_lookup)
            seen[drug_raw].add(unit_norm)
            if len(seen[drug_raw]) > 1:
                issues.append(
                    Issue(
                        kind=IssueKind.UNIT_INCONSISTENT,
                        severity=IssueSeverity.ERROR,
                        line=line_num,
                        col=m.start() + 1,
                        message=f"同一模板中药品 '{drug_raw}' 单位不一致: {', '.join(seen[drug_raw])}",
                        context=line.strip(),
                    )
                )

    return issues
