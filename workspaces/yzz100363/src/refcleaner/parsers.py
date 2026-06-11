"""输入解析器：纯文本和 BibTeX 解析"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Optional, Tuple, List

from .models import ReferenceEntry, ReferenceType


DOI_PATTERN = re.compile(
    r'(?:https?://(?:dx\.)?doi\.org/|doi:\s*)?(10\.\d{4,9}/[\-._;()/:A-Za-z0-9]+)',
    re.IGNORECASE,
)

YEAR_PATTERN = re.compile(r'\b(19|20)\d{2}\b')
PAGE_PATTERN = re.compile(r'(\d{1,5})\s*[-–—]\s*(\d{1,5})')


class TextParser:
    def __init__(self) -> None:
        self._numbered_pattern = re.compile(r'^\s*\[?(\d+)\]?[\.\)]?\s*')

    def parse(self, text: str) -> list[ReferenceEntry]:
        entries = []
        raw_entries = self._split_entries(text)

        for pos, raw_entry in enumerate(raw_entries):
            raw_entry = raw_entry.strip()
            if not raw_entry:
                continue

            entry = self._parse_single_entry(raw_entry, pos)
            entries.append(entry)

        return entries

    def _split_entries(self, text: str) -> list[str]:
        lines = text.split('\n')
        entries: list[str] = []
        current_entry: list[str] = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                if current_entry:
                    entries.append(' '.join(current_entry))
                    current_entry = []
            elif self._numbered_pattern.match(stripped) and current_entry:
                entries.append(' '.join(current_entry))
                current_entry = [stripped]
            else:
                current_entry.append(stripped)

        if current_entry:
            entries.append(' '.join(current_entry))

        return entries

    def _parse_single_entry(self, text: str, position: int) -> ReferenceEntry:
        original_text = text
        text = self._numbered_pattern.sub('', text).strip()

        entry = ReferenceEntry(
            original_text=original_text,
            original_position=position,
        )

        self._extract_structured_fields(text, entry)

        if self._looks_like_doi_only(text):
            if not entry.title:
                entry.title = f"DOI: {entry.doi}" if entry.doi else text[:100]
            entry.entry_type = self._detect_type(entry, text)
            return entry

        text_clean = text
        if entry.doi:
            text_clean = DOI_PATTERN.sub('', text)

        title_match = re.search(r'["“《]([^"”》]+)["”》]', text_clean)
        if title_match:
            entry.title = title_match.group(1).strip()
            before_title = text_clean[:title_match.start()].strip().rstrip(',.:;')
            after_title = text_clean[title_match.end():].strip().lstrip(',.:; ')
            
            if before_title:
                self._parse_authors(before_title, entry)
            if after_title:
                self._parse_journal(after_title, entry)
        else:
            self._parse_without_quotes(text_clean, entry)

        if not entry.title and text_clean:
            entry.title = text_clean[:min(len(text_clean), 200)]

        entry.entry_type = self._detect_type(entry, text)
        return entry

    def _looks_like_doi_only(self, text: str) -> bool:
        text = text.strip()
        if text.lower().startswith('doi:') or text.lower().startswith('https://doi.org'):
            return True
        if re.match(r'^10\.\d{4,9}/[\-._;()/:A-Za-z0-9]+$', text):
            return True
        return False

    def _extract_structured_fields(self, text: str, entry: ReferenceEntry) -> None:
        doi_match = DOI_PATTERN.search(text)
        if doi_match:
            entry.doi = doi_match.group(1).lower()

        year_match = YEAR_PATTERN.search(text)
        if year_match:
            entry.year = int(year_match.group(0))

        chinese_year = re.search(r'(\d{4})年', text)
        if chinese_year and not entry.year:
            entry.year = int(chinese_year.group(1))

        page_match = PAGE_PATTERN.search(text)
        if page_match:
            start_page = page_match.group(1)
            end_page = page_match.group(2)
            if len(start_page) <= 5 and len(end_page) <= 5:
                page_start = int(start_page)
                page_end = int(end_page)
                if page_start < 100000 and page_end < 100000 and page_start <= page_end:
                    entry.pages = f"{start_page}-{end_page}"

        url_match = re.search(r'https?://\S+', text)
        if url_match and not entry.doi:
            entry.url = url_match.group(0).rstrip('.,;)')

        vol_pattern = re.compile(r',\s*(\d+)\s*\(\s*(\d+)\s*\)')
        vol_match = vol_pattern.search(text)
        if vol_match:
            entry.volume = vol_match.group(1)
            entry.number = vol_match.group(2)

        chinese_vol = re.search(r'第\s*(\d+)\s*卷', text)
        if chinese_vol and not entry.volume:
            entry.volume = chinese_vol.group(1)

        chinese_num = re.search(r'第\s*(\d+)\s*期', text)
        if chinese_num and not entry.number:
            entry.number = chinese_num.group(1)

        vol_word_pattern = re.search(r'Vol\.?\s*(\d+)', text, re.IGNORECASE)
        if vol_word_pattern and not entry.volume:
            entry.volume = vol_word_pattern.group(1)

    def _parse_without_quotes(self, text: str, entry: ReferenceEntry) -> None:
        year_match = re.search(r'\((19|20)\d{2}\)', text)
        if year_match:
            year_pos = year_match.start()
            before_year = text[:year_pos].strip().rstrip(',.:;')
            after_year = text[year_match.end():].strip().lstrip(',.:; ')
            
            period_pos = before_year.rfind('. ')
            if period_pos > 0:
                author_part = before_year[:period_pos].strip()
                title_part = before_year[period_pos + 2:].strip()
                if title_part and len(title_part) >= 5:
                    entry.title = title_part
                if author_part:
                    self._parse_authors(author_part, entry)
            else:
                self._parse_authors(before_year, entry)
            
            if after_year:
                self._parse_journal(after_year, entry)
            return

        dot_sections = re.split(r'(?<=[\.\?])\s+', text)
        if len(dot_sections) >= 2:
            first_section = dot_sections[0].strip()
            second_section = dot_sections[1].strip()
            
            self._parse_authors(first_section, entry)
            
            if second_section and len(second_section) >= 5:
                entry.title = second_section
            
            if len(dot_sections) >= 3:
                third_section = dot_sections[2].strip()
                self._parse_journal(third_section, entry)

    def _parse_authors(self, text: str, entry: ReferenceEntry) -> None:
        if not text or len(text) > 200:
            return

        text = text.strip().rstrip(',.:;')

        if re.search(r'[\u4e00-\u9fff]', text):
            self._parse_chinese_authors(text, entry)
        else:
            self._parse_english_authors(text, entry)

    def _parse_chinese_authors(self, text: str, entry: ReferenceEntry) -> None:
        parts = re.split(r'[，,、。.；;\s]+', text)
        parts = [p.strip() for p in parts if p.strip() and p.strip() not in ['等', 'et', 'al', 'al.', 'and', '与', '和']]
        
        has_et_al = any(p in text for p in ['等', 'et al', 'et al.', 'etal'])
        
        if parts:
            authors = parts[:3]
            if has_et_al or len(parts) > 3:
                authors.append('et al.')
            entry.authors = authors

    def _parse_english_authors(self, text: str, entry: ReferenceEntry) -> None:
        text = re.sub(r'\s*&\s*', '; ', text)
        text = re.sub(r'\s+(?:and|AND|And)\s+', '; ', text)
        
        parts = [p.strip().rstrip(',.') for p in text.split(';') if p.strip()]
        
        authors = []
        for part in parts:
            if part.lower() in ['et al', 'et al.', 'etal']:
                if authors:
                    authors.append('et al.')
                break
            
            parsed = self._parse_single_english_author(part)
            if parsed:
                authors.extend(parsed)
        
        if authors and len(authors) <= 10:
            if len(authors) > 3 and 'et al.' not in authors:
                authors = authors[:3] + ['et al.']
            entry.authors = authors

    def _parse_single_english_author(self, text: str) -> list[str]:
        text = text.strip()
        
        comma_pos = text.find(',')
        if comma_pos > 0:
            last_name = text[:comma_pos].strip()
            first_part = text[comma_pos + 1:].strip()
            
            if last_name and first_part:
                initials = '. '.join([p[0].upper() for p in first_part.split() if p])
                if initials:
                    return [f"{last_name}, {initials}."]
                return [f"{last_name}, {first_part}"]
        
        words = text.split()
        if len(words) >= 2:
            last_name = words[-1]
            first_parts = words[:-1]
            
            initials = '. '.join([w[0].upper() for w in first_parts if w])
            if initials:
                return [f"{last_name}, {initials}."]
            return [last_name]
        
        if text:
            return [text]
        
        return []

    def _parse_journal(self, text: str, entry: ReferenceEntry) -> None:
        if not text:
            return

        text = text.lstrip('()').strip()

        year_str = str(entry.year) if entry.year else None
        if year_str and year_str in text:
            year_pos = text.find(year_str)
            candidate = text[:year_pos].strip().rstrip(',.: ')
            if self._looks_like_journal(candidate):
                entry.journal = candidate
                remaining = text[year_pos:].strip()
                self._extract_vol_page(remaining, entry)
                return

        comma_pos = text.find(',')
        if comma_pos > 0:
            candidate = text[:comma_pos].strip()
            if self._looks_like_journal(candidate):
                entry.journal = candidate
                remaining = text[comma_pos + 1:].strip()
                self._extract_vol_page(remaining, entry)
                return

        period_pos = text.find('. ')
        if period_pos > 0:
            candidate = text[:period_pos].strip()
            if self._looks_like_journal(candidate):
                entry.journal = candidate
                remaining = text[period_pos + 2:].strip()
                self._extract_vol_page(remaining, entry)
                return

        words = text.split()
        for i in range(min(len(words), 10), 1, -1):
            candidate = ' '.join(words[:i])
            if self._looks_like_journal(candidate):
                entry.journal = candidate
                remaining = ' '.join(words[i:]).strip()
                self._extract_vol_page(remaining, entry)
                return

        if text and self._looks_like_journal(text):
            entry.journal = text

    def _looks_like_journal(self, text: str) -> bool:
        if not text or len(text) < 3 or len(text) > 150:
            return False

        text_lower = text.lower()

        if text_lower.startswith(('http', 'doi', '10.', 'url', 'pp.', 'vol.', 'no.', '19', '20', 'https', '第')):
            return False

        if re.match(r'^\d+$', text):
            return False

        if re.match(r'^\d+\s*[-–—]\s*\d+$', text):
            return False

        if re.match(r'^\d+\(\d+\)$', text):
            return False

        if re.match(r'^[A-Z][a-z]\.?$', text):
            return False

        if re.search(r'\d+卷|\d+期', text):
            return False

        if re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$', text):
            return True

        if re.match(r'^[\u4e00-\u9fff]+(?:[\u4e00-\u9fff]| )*$', text):
            return True

        known_journals = [
            'Nature', 'Science', 'Nature Communications', 'PNAS',
            'The New England Journal of Medicine', 'Lancet', 'Cell',
            'NEJM', 'JAMA', 'Proceedings of the National Academy of Sciences',
            '计算机学报', '软件学报', '科学通报', '中国科学', '物理学报', '化学学报',
            'Advances in Neural Information Processing Systems',
            'Neural Information Processing Systems', 'NIPS', 'NeurIPS',
            'Journal of the American Chemical Society', 'JACS',
            'IEEE', 'ACM', 'CVPR', 'ICML', 'ICLR', 'AAAI', 'ACL',
            'Cambridge University Press', 'Oxford University Press', 'Springer', 'Elsevier'
        ]
        if any(journal.lower() in text_lower for journal in known_journals):
            return True

        return False

    def _extract_vol_page(self, text: str, entry: ReferenceEntry) -> None:
        if not text:
            return

        vol_pattern = re.compile(r'(\d+)\s*\(\s*(\d+)\s*\)')
        vol_match = vol_pattern.search(text)
        if vol_match:
            if not entry.volume:
                entry.volume = vol_match.group(1)
            if not entry.number:
                entry.number = vol_match.group(2)

        vol_word_pattern = re.search(r'Vol\.?\s*(\d+)', text, re.IGNORECASE)
        if vol_word_pattern and not entry.volume:
            entry.volume = vol_word_pattern.group(1)

    def _detect_type(self, entry: ReferenceEntry, text: str) -> ReferenceType:
        lower = text.lower()

        if any(k in lower for k in ['thesis', 'dissertation', '硕士', '博士', '学位论文', '【博士论文】', '【硕士论文】']):
            return ReferenceType.THESIS
        elif any(k in lower for k in ['proceedings', 'conference', 'symposium', '会议录', '研讨会',
                                      'Neural Information Processing Systems', 'NeurIPS', 'NIPS',
                                      'CVPR', 'ICML', 'ICLR', 'AAAI', 'ACL']):
            return ReferenceType.INPROCEEDINGS
        elif any(k in lower for k in ['book', '图书', '专著', '出版社', 'press', 'University Press',
                                      'Cambridge', 'Oxford', 'Springer', 'Elsevier']):
            return ReferenceType.BOOK
        elif any(k in lower for k in ['chapter', 'in:', '编者', '章节']):
            return ReferenceType.INCOLLECTION
        elif any(k in lower for k in ['http://', 'https://', 'www.', 'online']):
            if entry.doi or entry.url:
                return ReferenceType.ARTICLE
            return ReferenceType.ONLINE
        elif entry.journal:
            return ReferenceType.ARTICLE
        else:
            return ReferenceType.UNKNOWN


class BibTeXParser:
    TYPE_MAPPING = {
        'article': ReferenceType.ARTICLE,
        'book': ReferenceType.BOOK,
        'booklet': ReferenceType.BOOK,
        'incollection': ReferenceType.INCOLLECTION,
        'inproceedings': ReferenceType.INPROCEEDINGS,
        'conference': ReferenceType.INPROCEEDINGS,
        'proceedings': ReferenceType.INPROCEEDINGS,
        'mastersthesis': ReferenceType.THESIS,
        'phdthesis': ReferenceType.THESIS,