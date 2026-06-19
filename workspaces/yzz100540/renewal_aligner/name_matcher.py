from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

try:
    from thefuzz import fuzz, process
    HAS_FUZZ = True
except ImportError:
    HAS_FUZZ = False

from .models import CustomerAlias


KNOWN_NAME_VARIANTS: list[list[str]] = [
    ["阿里巴巴", "阿里巴巴集团控股有限公司", "阿里巴巴集团", "阿里", "Alibaba", "Alibaba Group", "alibaba"],
    ["腾讯", "腾讯科技（深圳）有限公司", "腾讯科技", "Tencent", "tencent", "騰訊"],
    ["百度", "百度在线网络技术（北京）有限公司", "百度在线", "Baidu", "baidu"],
    ["字节跳动", "字节跳动有限公司", "字节", "ByteDance", "bytedance", "Byte Dance"],
    ["美团", "美团点评科技有限公司", "美团点评", "Meituan", "meituan", "Meituan-Dianping"],
    ["京东", "京东集团股份有限公司", "京东集团", "JD", "jd.com", "Jingdong", "jingdong"],
    ["拼多多", "拼多多信息技术有限公司", "拼多多信息", "PDD", "pdd", "Pinduoduo", "pinduoduo"],
    ["小米", "小米科技有限责任公司", "小米科技", "Xiaomi", "xiaomi", "Mi"],
    ["华为", "华为技术有限公司", "华为技术", "Huawei", "huawei"],
    ["网易", "网易（杭州）网络有限公司", "网易网络", "NetEase", "netease", "Netease"],
    ["滴滴", "滴滴出行科技有限公司", "滴滴出行", "Didi", "didi", "Didi Chuxing", "DiDi"],
    ["顺丰", "顺丰速运有限公司", "顺丰速运", "SF", "SF Express", "sf", "Shunfeng"],
]


COMPANY_SUFFIXES = {
    "有限公司", "股份有限公司", "科技有限公司", "信息有限公司",
    "网络有限公司", "软件有限公司", "集团有限公司", "集团",
    "有限责任公司", "股份公司", "技术有限公司", "咨询有限公司",
    "有限公司", "Co., Ltd.", "Co.,Ltd.", "Ltd.", "Inc.", "Corp.",
    "Corporation", "Limited", "LLC", "GmbH", "AG", "SA", "BV",
    "有限公司", "株式会社", "有限会社", "（北京）", "（上海）",
    "（深圳）", "（广州）", "（杭州）", "（成都）",
    "(北京)", "(上海)", "(深圳)", "(广州)", "(杭州)", "(成都)",
}

GENERIC_TOKENS = {
    "科技", "信息", "网络", "软件", "技术", "咨询", "服务",
    "解决方案", "数据", "智能", "数字", "云计算", "云",
    "technology", "tech", "information", "info", "network", "net",
    "software", "solutions", "data", "cloud", "digital", "services",
    "group", "holdings", "international", "china", "中国",
}


def _normalize(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    text = text.strip().lower()
    text = re.sub(r"[\s\-_·•\.・,，()（）\[\]【】]", "", text)
    return text


def _strip_suffixes(name: str) -> str:
    result = name
    changed = True
    while changed:
        changed = False
        for suffix in sorted(COMPANY_SUFFIXES, key=len, reverse=True):
            suffix_norm = _normalize(suffix)
            if result.endswith(suffix_norm) and len(result) > len(suffix_norm):
                result = result[: -len(suffix_norm)]
                changed = True
    return result


def _core_tokens(name: str) -> set[str]:
    norm = _normalize(name)
    stripped = _strip_suffixes(norm)
    tokens = set()
    for generic in sorted(GENERIC_TOKENS, key=len, reverse=True):
        tokens.add(_normalize(generic))
    for t in tokens:
        stripped = stripped.replace(t, "")
    if len(stripped) >= 2:
        result = {stripped}
        if len(stripped) >= 4:
            result.add(stripped[:2])
            result.add(stripped[:4])
        for i in range(len(stripped)):
            for j in range(i + 2, min(i + 5, len(stripped) + 1)):
                result.add(stripped[i:j])
        return result
    return {stripped} if stripped else {norm}


@dataclass
class MatchResult:
    canonical_name: str
    score: int
    match_type: str
    alias_obj: Optional[CustomerAlias] = None
    details: dict[str, Any] = field(default_factory=dict)
    is_rename: bool = False


class CustomerNameMatcher:
    def __init__(self, alias_file: Optional[Path] = None):
        self._aliases: dict[str, CustomerAlias] = {}
        self._name_to_canonical: dict[str, str] = {}
        self._normalized_index: dict[str, str] = {}
        self._token_index: dict[str, set[str]] = {}
        self._alias_file = alias_file
        self._changes_since_save = False
        self._load_known_variants()
        if alias_file and alias_file.exists():
            self.load_aliases(alias_file)

    def _load_known_variants(self) -> None:
        for group in KNOWN_NAME_VARIANTS:
            if not group:
                continue
            canonical = group[0]
            alias_obj = CustomerAlias(
                canonical_name=canonical,
                aliases=[g for g in group[1:] if g != canonical],
                previous_names=[],
            )
            self.register_alias(alias_obj, persist=False)

    def load_aliases(self, path: Path) -> None:
        if not path.exists():
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for item in data.get("aliases", []):
                alias = CustomerAlias(
                    canonical_name=item["canonical_name"],
                    aliases=item.get("aliases", []),
                    previous_names=item.get("previous_names", []),
                    rename_date=item.get("rename_date"),
                    notes=item.get("notes"),
                )
                self.register_alias(alias, persist=False)
        except Exception:
            pass

    def save_aliases(self, path: Optional[Path] = None) -> None:
        target = path or self._alias_file
        if not target:
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "aliases": [
                {
                    "canonical_name": a.canonical_name,
                    "aliases": a.aliases,
                    "previous_names": a.previous_names,
                    "rename_date": a.rename_date,
                    "notes": a.notes,
                }
                for a in self._aliases.values()
            ],
        }
        with open(target, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        self._changes_since_save = False

    def register_alias(self, alias: CustomerAlias, persist: bool = True) -> None:
        canonical = alias.canonical_name
        self._aliases[canonical] = alias

        all_names = [canonical] + alias.aliases + alias.previous_names
        for name in all_names:
            if not name:
                continue
            self._name_to_canonical[name.strip()] = canonical
            norm = _normalize(name)
            if norm and norm not in self._normalized_index:
                self._normalized_index[norm] = canonical
            tokens = _core_tokens(name)
            for tok in tokens:
                if len(tok) < 2:
                    continue
                if tok not in self._token_index:
                    self._token_index[tok] = set()
                self._token_index[tok].add(canonical)

        if persist:
            self._changes_since_save = True

    def add_alias(self, canonical_name: str, alias: str) -> None:
        alias_obj = self._aliases.get(canonical_name)
        if not alias_obj:
            alias_obj = CustomerAlias(canonical_name=canonical_name)
        if alias not in alias_obj.aliases and alias != canonical_name:
            alias_obj.aliases.append(alias)
        self.register_alias(alias_obj)

    def record_rename(self, old_name: str, new_name: str, rename_date: Optional[str] = None) -> None:
        old_name = old_name.strip()
        new_name = new_name.strip()
        if old_name == new_name:
            return
        old_obj = self._aliases.get(old_name)
        alias_obj = self._aliases.get(new_name)
        if not alias_obj:
            alias_obj = CustomerAlias(canonical_name=new_name)
        if old_obj:
            for a in old_obj.aliases:
                if a not in alias_obj.aliases and a != new_name:
                    alias_obj.aliases.append(a)
            if old_name not in alias_obj.previous_names:
                alias_obj.previous_names.append(old_name)
            for p in old_obj.previous_names:
                if p not in alias_obj.previous_names and p != new_name:
                    alias_obj.previous_names.append(p)
            if not alias_obj.notes and old_obj.notes:
                alias_obj.notes = old_obj.notes
            del self._aliases[old_name]
        else:
            if old_name not in alias_obj.previous_names:
                alias_obj.previous_names.append(old_name)
        if rename_date:
            alias_obj.rename_date = rename_date
        self._rebuild_index = True
        self._full_rebuild()
        self.register_alias(alias_obj)

    def _full_rebuild(self) -> None:
        self._name_to_canonical.clear()
        self._normalized_index.clear()
        self._token_index.clear()
        aliases_snapshot = list(self._aliases.values())
        self._aliases.clear()
        for a in aliases_snapshot:
            self.register_alias(a, persist=False)

    def resolve(self, name: str, threshold: int = 70) -> MatchResult:
        if not name:
            return MatchResult(canonical_name="", score=0, match_type="empty")

        name_stripped = name.strip()

        if name_stripped in self._name_to_canonical:
            canonical = self._name_to_canonical[name_stripped]
            alias_obj = self._aliases.get(canonical)
            is_rename = (
                alias_obj is not None
                and name_stripped in alias_obj.previous_names
            )
            return MatchResult(
                canonical_name=canonical,
                score=100,
                match_type="explicit_alias",
                alias_obj=alias_obj,
                is_rename=is_rename,
                details={"matched_name": name_stripped},
            )

        norm = _normalize(name_stripped)
        if norm in self._normalized_index:
            canonical = self._normalized_index[norm]
            alias_obj = self._aliases.get(canonical)
            is_rename = (
                alias_obj is not None
                and any(norm == _normalize(pn) for pn in alias_obj.previous_names)
            )
            return MatchResult(
                canonical_name=canonical,
                score=98,
                match_type="normalized",
                alias_obj=alias_obj,
                is_rename=is_rename,
                details={"normalized": norm},
            )

        candidates = set()
        tokens = _core_tokens(name_stripped)
        for tok in tokens:
            if tok in self._token_index:
                candidates.update(self._token_index[tok])

        if HAS_FUZZ and candidates:
            best_score = 0
            best_candidate: Optional[str] = None
            best_match_type = "token_fuzzy"
            alias_obj_best: Optional[CustomerAlias] = None
            is_rename_best = False

            for cand in candidates:
                cand_obj = self._aliases.get(cand)
                cand_names = [cand]
                if cand_obj:
                    cand_names.extend(cand_obj.aliases)
                    cand_names.extend(cand_obj.previous_names)
                for cn in cand_names:
                    score = fuzz.token_set_ratio(norm, _normalize(cn))
                    if score > best_score:
                        best_score = score
                        best_candidate = cand
                        alias_obj_best = cand_obj
                        is_rename_best = cand_obj is not None and cn in cand_obj.previous_names
                        if cn == cand:
                            best_match_type = "fuzzy_canonical"
                        elif cand_obj and cn in cand_obj.previous_names:
                            best_match_type = "fuzzy_prev_name"
                        else:
                            best_match_type = "fuzzy_alias"

            if best_candidate and best_score >= threshold:
                return MatchResult(
                    canonical_name=best_candidate,
                    score=best_score,
                    match_type=best_match_type,
                    alias_obj=alias_obj_best,
                    is_rename=is_rename_best,
                    details={"score": best_score},
                )

        if HAS_FUZZ and not candidates and self._aliases:
            all_canonical = list(self._aliases.keys())
            normed_candidates = [_normalize(c) for c in all_canonical]
            alias_all_names = []
            for c in all_canonical:
                obj = self._aliases.get(c)
                names = [c]
                if obj:
                    names.extend(obj.aliases)
                    names.extend(obj.previous_names)
                alias_all_names.append(names)
            flat_names = []
            flat_to_canonical = []
            for c_idx, names in enumerate(alias_all_names):
                for n in names:
                    flat_names.append(_normalize(n))
                    flat_to_canonical.append(all_canonical[c_idx])
            best_global_score = 0
            best_global_canonical: Optional[str] = None
            for i, fn in enumerate(flat_names):
                if not fn:
                    continue
                score = fuzz.token_set_ratio(norm, fn)
                if score > best_global_score:
                    best_global_score = score
                    best_global_canonical = flat_to_canonical[i]
            strict_threshold = max(threshold + 15, 85)
            if best_global_canonical and best_global_score >= strict_threshold:
                alias_obj = self._aliases.get(best_global_canonical)
                return MatchResult(
                    canonical_name=best_global_canonical,
                    score=best_global_score,
                    match_type="global_fuzzy",
                    alias_obj=alias_obj,
                    is_rename=False,
                    details={"score": best_global_score, "strict_threshold": strict_threshold},
                )

        return MatchResult(
            canonical_name=name_stripped,
            score=0,
            match_type="new_customer",
            details={"created_new": True},
        )

    def ensure_canonical(self, name: str, threshold: int = 70) -> tuple[str, MatchResult]:
        result = self.resolve(name, threshold=threshold)
        if result.match_type == "new_customer" and self._aliases:
            lowered_threshold = max(50, threshold - 15)
            retry = self.resolve(name, threshold=lowered_threshold)
            if retry.match_type != "new_customer":
                result = retry
        canonical = result.canonical_name or name.strip()
        if result.match_type == "new_customer":
            alias_obj = CustomerAlias(canonical_name=canonical)
            self.register_alias(alias_obj)
        else:
            raw = name.strip()
            if raw and raw != canonical:
                self.add_alias(canonical, raw)
        return canonical, result

    def bulk_learn_names(self, names: list[str], threshold: int = 65) -> dict[str, str]:
        name_to_canonical: dict[str, str] = {}
        for raw in sorted(set(names), key=len, reverse=True):
            if not raw:
                continue
            canonical, result = self.ensure_canonical(raw, threshold=threshold)
            name_to_canonical[raw] = canonical
        return name_to_canonical

    def all_canonical_names(self) -> list[str]:
        return sorted(self._aliases.keys())

    def get_alias(self, canonical_name: str) -> Optional[CustomerAlias]:
        return self._aliases.get(canonical_name)
