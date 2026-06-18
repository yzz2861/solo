import re
from typing import List, Tuple, Optional
from .models import TermEntry, TermStatus, Document, DocumentSegment, Match


EN_PLURAL_SUFFIXES = [
    ("ies", "y"),
    ("es", ""),
    ("s", ""),
]


def _plural_variants(word: str) -> List[str]:
    variants = [word]
    if len(word) < 2:
        return variants
    if word.endswith("y") and len(word) > 2 and word[-2] not in "aeiou":
        variants.append(word[:-1] + "ies")
    if word.endswith(("s", "x", "z", "ch", "sh")):
        variants.append(word + "es")
    else:
        variants.append(word + "s")
    seen = []
    for v in variants:
        if v not in seen:
            seen.append(v)
    return seen


def _capitalization_variants(s: str) -> List[str]:
    if not s:
        return [s]
    variants = {s}
    variants.add(s.lower())
    variants.add(s.upper())
    variants.add(s[0].upper() + s[1:].lower())
    if " " in s or "-" in s:
        parts = re.split(r'(\s|-)', s)
        titled = "".join(p[0].upper() + p[1:] if p and not p.isspace() and not p == "-" else p for p in parts)
        variants.add(titled)
    return list(variants)


def _has_cjk(s: str) -> bool:
    return bool(re.search(r'[\u4e00-\u9fff]', s))


def _build_pattern(term: TermEntry, variant: str) -> re.Pattern:
    flags = 0 if term.case_sensitive else re.IGNORECASE
    escaped = re.escape(variant)
    variant_has_cjk = _has_cjk(variant)

    variant_is_embedded_substring = False
    if variant_has_cjk and _has_cjk(term.preferred or ""):
        v = variant
        pref = term.preferred
        if len(v) < len(pref) and (v in pref):
            variant_is_embedded_substring = True
        for cand in list(term.alternatives) + list(term.forbidden_variants):
            if _has_cjk(cand) and len(v) < len(cand) and v in cand:
                variant_is_embedded_substring = True
                break

    def _cjk_boundary(esc: str) -> str:
        pat = esc
        if re.search(r'[\u4e00-\u9fff]$', variant):
            pat = pat + r'(?![\u4e00-\u9fff])'
        return pat

    def _full_boundary(esc: str) -> str:
        pat = esc
        if re.match(r'^[\w\u4e00-\u9fff]', variant):
            pat = r'(?<![\w\u4e00-\u9fff])' + pat
        if re.search(r'[\w\u4e00-\u9fff]$', variant):
            pat = pat + r'(?![\w\u4e00-\u9fff])'
        return pat

    if term.word_boundary:
        pattern = _full_boundary(escaped)
    else:
        if variant_has_cjk and variant_is_embedded_substring:
            pattern = _cjk_boundary(escaped)
        else:
            pattern = escaped
    return re.compile(pattern, flags=flags)


def _get_variants_to_check(term: TermEntry) -> List[Tuple[str, str, TermStatus, str]]:
    variants = []
    standard_variants = [term.source]
    if not term.case_sensitive:
        expanded = []
        for v in standard_variants:
            expanded.extend(_capitalization_variants(v))
        standard_variants = list(dict.fromkeys(expanded))
    if term.match_plural:
        expanded = []
        for v in standard_variants:
            if re.search(r'[a-zA-Z]', v):
                expanded.extend(_plural_variants(v))
            else:
                expanded.append(v)
        standard_variants = list(dict.fromkeys(expanded))
    for v in standard_variants:
        variants.append((v, term.preferred, TermStatus.STANDARD, f"标准译名（{term.source}）"))
    for alt in term.alternatives:
        alt_variants = [alt]
        if not term.case_sensitive:
            expanded = []
            for v in alt_variants:
                expanded.extend(_capitalization_variants(v))
            alt_variants = list(dict.fromkeys(expanded))
        if term.match_plural:
            expanded = []
            for v in alt_variants:
                if re.search(r'[a-zA-Z]', v):
                    expanded.extend(_plural_variants(v))
                else:
                    expanded.append(v)
            alt_variants = list(dict.fromkeys(expanded))
        for v in alt_variants:
            if term.status == TermStatus.NEEDS_REVIEW:
                variants.append((v, term.preferred, TermStatus.NEEDS_REVIEW, f"需确认：{term.notes or term.context_hint or '上下文敏感'}"))
            else:
                variants.append((v, term.preferred, TermStatus.STANDARD, f"可接受译名统一为标准（原词:{alt}）"))
    for forb in term.forbidden_variants:
        forb_variants = [forb]
        if not term.case_sensitive:
            expanded = []
            for v in forb_variants:
                expanded.extend(_capitalization_variants(v))
            forb_variants = list(dict.fromkeys(expanded))
        if term.match_plural:
            expanded = []
            for v in forb_variants:
                if re.search(r'[a-zA-Z]', v):
                    expanded.extend(_plural_variants(v))
                else:
                    expanded.append(v)
            forb_variants = list(dict.fromkeys(expanded))
        for v in forb_variants:
            variants.append((v, term.preferred, TermStatus.FORBIDDEN, f"禁用译名（{forb}，请用「{term.preferred}」）"))
    return variants


def _context_snippet(text: str, start: int, end: int, radius: int = 25) -> Tuple[str, str]:
    before = text[max(0, start - radius):start]
    after = text[end:min(len(text), end + radius)]
    return before, after


def find_matches(doc: Document, terms: List[TermEntry]) -> List[Match]:
    all_matches: List[Match] = []
    for seg_idx, segment in enumerate(doc.segments):
        segment_matches = _find_matches_in_segment(segment, terms, seg_idx)
        segment_matches = _resolve_overlaps(segment_matches)
        all_matches.extend(segment_matches)
    return all_matches


def _find_matches_in_segment(segment: DocumentSegment, terms: List[TermEntry], seg_idx: int) -> List[Match]:
    results: List[Match] = []
    text = segment.content
    if not text:
        return results
    for term in terms:
        preferred_for_segment = term.preferred
        if segment.chapter and term.chapter_exceptions:
            for ch_key, ch_val in term.chapter_exceptions.items():
                if ch_key and ch_key in (segment.chapter or ""):
                    preferred_for_segment = ch_val
                    break
        variants = _get_variants_to_check(term)
        seen_ranges = set()
        for variant, suggested, status, reason in variants:
            if not variant:
                continue
            effective_suggested = preferred_for_segment
            effective_reason = reason
            if preferred_for_segment != term.preferred:
                effective_reason = (reason or "").replace(
                    f"「{term.preferred}」", f"「{preferred_for_segment}」"
                )
            pattern = _build_pattern(term, variant)
            for m in pattern.finditer(text):
                s, e = m.start(), m.end()
                key = (s, e)
                if key in seen_ranges:
                    continue
                seen_ranges.add(key)
                original = text[s:e]
                final_suggested = _match_case(original, effective_suggested) if not term.case_sensitive else effective_suggested
                before, after = _context_snippet(text, s, e)
                needs_review = False
                final_status = status
                final_reason = effective_reason
                if term.context_hint and term.context_hint not in (before + after):
                    if status != TermStatus.FORBIDDEN:
                        needs_review = True
                        final_status = TermStatus.NEEDS_REVIEW
                        final_reason = f"上下文未包含提示词「{term.context_hint}」，请确认；{reason}"
                if segment.chapter and term.chapter_exceptions:
                    for ch_key in term.chapter_exceptions:
                        if ch_key in (segment.chapter or ""):
                            final_reason += f"（章节「{segment.chapter}」应用例外：{term.chapter_exceptions[ch_key]}）"
                results.append(Match(
                    segment_index=seg_idx,
                    start=s,
                    end=e,
                    original=original,
                    term_source=term.source,
                    suggested=final_suggested,
                    status=final_status,
                    reason=final_reason,
                    context_before=before,
                    context_after=after,
                    needs_manual_review=needs_review,
                ))
    results.sort(key=lambda m: (m.start, -len(m.original)))
    return results


def _resolve_overlaps(matches: List[Match]) -> List[Match]:
    if not matches:
        return []
    sorted_matches = sorted(matches, key=lambda m: (m.start, -len(m.original)))
    result = []
    last_end = -1
    for m in sorted_matches:
        if m.start >= last_end:
            result.append(m)
            last_end = m.end
    return result


def _match_case(original: str, target: str) -> str:
    if not original or not target:
        return target
    if original.isupper():
        return target.upper()
    if original[:1].isupper() and original[1:].islower():
        return target[:1].upper() + target[1:] if target else target
    if original.islower():
        return target.lower()
    return target
