from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import yaml

from .types import (
    ForbiddenRule,
    SimilarDrug,
    Template,
    TemplateStatus,
    UnitRule,
    VariableRule,
)


def _load_yaml(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_variable_rules(rules_dir: str) -> Dict[str, VariableRule]:
    p = os.path.join(rules_dir, "variables.yaml")
    if not os.path.isfile(p):
        return {}
    data = _load_yaml(p)
    rules: Dict[str, VariableRule] = {}
    for item in data.get("variables", []):
        name = item.get("name", "")
        if not name:
            continue
        rules[name] = VariableRule(
            name=name,
            required=item.get("required", True),
            default=item.get("default"),
            allowed_units=item.get("allowed_units", []),
            description=item.get("description", ""),
        )
    return rules


def load_unit_rules(rules_dir: str) -> Dict[str, UnitRule]:
    p = os.path.join(rules_dir, "units.yaml")
    if not os.path.isfile(p):
        return {}
    data = _load_yaml(p)
    rules: Dict[str, UnitRule] = {}
    for item in data.get("units", []):
        canonical = item.get("canonical", "")
        if not canonical:
            continue
        aliases = item.get("aliases", [])
        rule = UnitRule(
            canonical=canonical,
            aliases=aliases,
            category=item.get("category", ""),
        )
        rules[canonical] = rule
        for alias in aliases:
            rules[alias] = rule
    return rules


def load_forbidden_rules(rules_dir: str) -> List[ForbiddenRule]:
    p = os.path.join(rules_dir, "forbidden.yaml")
    if not os.path.isfile(p):
        return []
    data = _load_yaml(p)
    result: List[ForbiddenRule] = []
    for item in data.get("forbidden", []):
        pattern = item.get("pattern", "")
        if not pattern:
            continue
        result.append(
            ForbiddenRule(
                pattern=pattern,
                reason=item.get("reason", ""),
                is_regex=item.get("is_regex", False),
            )
        )
    return result


def load_similar_drugs(rules_dir: str) -> List[SimilarDrug]:
    p = os.path.join(rules_dir, "variables.yaml")
    if not os.path.isfile(p):
        return []
    data = _load_yaml(p)
    result: List[SimilarDrug] = []
    for item in data.get("similar_drugs", []):
        canonical = item.get("canonical", "")
        if not canonical:
            continue
        result.append(
            SimilarDrug(
                canonical=canonical,
                variants=item.get("variants", []),
            )
        )
    return result


def load_discontinued_list(rules_dir: str) -> set:
    p = os.path.join(rules_dir, "discontinued.yaml")
    if not os.path.isfile(p):
        return set()
    data = _load_yaml(p)
    return set(data.get("templates", []))


def _parse_template_meta(filepath: str, content: str) -> dict:
    meta: dict = {"name": Path(filepath).stem, "department": "", "status": TemplateStatus.ACTIVE}
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("# @"):
            tag = stripped[3:].strip()
            if tag.lower().startswith("name:"):
                meta["name"] = tag[5:].strip()
            elif tag.lower().startswith("department:"):
                meta["department"] = tag[11:].strip()
            elif tag.lower().startswith("status:"):
                status_val = tag[7:].strip().lower()
                if status_val in ("discontinued", "停用", "废弃"):
                    meta["status"] = TemplateStatus.DISCONTINUED
        if not stripped.startswith("#"):
            break
    return meta


def load_templates(template_dir: str, rules_dir: str) -> List[Template]:
    discontinued_set = load_discontinued_list(rules_dir)
    templates: List[Template] = []
    dir_path = Path(template_dir)
    if not dir_path.is_dir():
        return templates

    extensions = {".txt", ".md", ".order", ".tpl", ".yaml", ".yml"}
    for root, _dirs, files in os.walk(template_dir):
        for fname in sorted(files):
            fpath = os.path.join(root, fname)
            ext = os.path.splitext(fname)[1].lower()
            if ext not in extensions:
                continue
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            meta = _parse_template_meta(fpath, content)
            rel_path = os.path.relpath(fpath, template_dir)
            if rel_path in discontinued_set or fname in discontinued_set:
                meta["status"] = TemplateStatus.DISCONTINUED
            templates.append(
                Template(
                    path=rel_path,
                    name=meta["name"],
                    department=meta["department"],
                    status=meta["status"],
                    content=content,
                )
            )
    return templates


class RulesBundle:
    def __init__(self, rules_dir: str):
        self.variable_rules = load_variable_rules(rules_dir)
        self.unit_rules = load_unit_rules(rules_dir)
        self.forbidden_rules = load_forbidden_rules(rules_dir)
        self.similar_drugs = load_similar_drugs(rules_dir)


def load_all(rules_dir: str, template_dir: str) -> tuple:
    bundle = RulesBundle(rules_dir)
    templates = load_templates(template_dir, rules_dir)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return bundle, templates, timestamp
