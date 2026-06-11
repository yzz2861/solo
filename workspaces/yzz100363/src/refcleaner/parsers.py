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
PAGE_PATTERN = re.compile(r'(\d+)\s*[-–—]\s*(\d+)')


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

        text_clean = text.replace('，', ',').replace('。', '.').replace('；', ';').replace('：', ':')
        
        self._parse_reference(text_clean, entry)

        if not entry.title:
            entry.title = text[:min(len(text), 200)]

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

        page_match = PAGE_PATTERN.search(text)
        if page_match:
            start_page = page_match.group(1)
            end_page = page_match.group(2)
            if len(start_page) <= 5 and len(end_page) <= 5:
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

    def _parse_reference(self, text: str, entry: ReferenceEntry) -> None:
        quoted_title = self._find_quoted_title(text)
        if quoted_title:
            title_text, before_title, after_title = quoted_title
            entry.title = title_text.strip('"“”《》').strip('.')
            self._extract_authors_safe(before_title, entry)
            self._extract_journal(after_title, entry)
            return

        year_in_parens = re.search(r'\((19|20)\d{2}\)', text)
        if year_in_parens:
            year_str = year_in_parens.group(0)
            year_pos = text.find(year_str)
            
            before_year = text[:year_pos].strip().rstrip(',.;:')
            after_year = text[year_pos + len(year_str):].strip().lstrip(',.;: ')
            
            period_pos = before_year.rfind('. ')
            comma_before_year = before_year.rfind(', ')
            
            if period_pos > comma_before_year:
                author_part = before_year[:period_pos].strip()
                title_part = before_year[period_pos + 2:].strip()
                
                self._extract_authors_safe(author_part, entry)
                if title_part and len(title_part) >= 5:
                    entry.title = title_part.strip('"“”《》').strip('.')
            else:
                self._extract_authors_safe(before_year, entry)
            
            self._extract_journal(after_year, entry)
            return

        dot_sections = re.split(r'(?<=[\.\?])\s+', text)
        if len(dot_sections) >= 2:
            first_section = dot_sections[0].strip()
            if self._is_author_section(first_section):
                self._extract_authors_safe(first_section, entry)
                if len(dot_sections) >= 2:
                    second_section = dot_sections[1].strip()
                    if second_section and len(second_section) >= 5:
                        entry.title = second_section.strip('"“”《》').strip('.')
                if len(dot_sections) >= 3:
                    third_section = dot_sections[2].strip()
                    self._extract_journal(third_section, entry)

    def _find_quoted_title(self, text: str) -> Optional[Tuple[str, str, str]]:
        patterns = [
            r'“([^”]+)”',
            r'《([^》]+)》',
            r'"([^"]+)"',
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                title_text = match.group(1).strip()
                if 5 <= len(title_text) <= 300:
                    before_title = text[:match.start()].strip().rstrip(',.;:')
                    after_title = text[match.end():].strip().lstrip(',.;: ')
                    return (title_text, before_title, after_title)

        return None

    def _is_author_section(self, text: str) -> bool:
        if not text or len(text) > 200:
            return False
        
        if ' and ' in text.lower() or ' & ' in text or '与' in text or '和' in text:
            comma_count = text.count(',')
            and_count = text.lower().count(' and ') + text.count(' & ') + text.count(' 与 ') + text.count(' 和 ')
            if and_count >= 1 or comma_count >= 1:
                return True
        
        if re.match(r'^[\u4e00-\u9fff]{1,4}(?:[\u3002，,]\s*[\u4e00-\u9fff]{1,4})*$', text):
            return True
        
        if re.match(r'^[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)+$', text):
            return True
        
        if re.match(r'^[A-Z][a-z]+\s+[A-Z][a-z]?(?:,\s*[A-Z][a-z]+\s+[A-Z][a-z]?)+$', text):
            return True
        
        return False

    def _extract_authors_safe(self, text: str, entry: ReferenceEntry) -> None:
        if not text:
            return
        
        text = text.strip().rstrip(',.;:')
        
        if len(text) > 200:
            return
        
        authors = []
        
        sep_patterns = [
            r'\s+(?:and|AND|And)\s+',
            r'\s+(?:与|和)\s+',
            r'\s*&\s*',
        ]
        
        found_sep = None
        parts = None
        
        for sep in sep_patterns:
            if re.search(sep, text):
                parts = re.split(sep, text)
                found_sep = sep
                break
        
        if parts is not None:
            authors_list = []
            for part in parts:
                part = part.strip().rstrip(',.;')
                if not part:
                    continue
                if part.lower() in ['et al', 'et al.', 'etal', '等']:
                    if authors_list:
                        authors_list.append('et al.')
                    break
                normalized = self._normalize_author(part)
                if normalized:
                    authors_list.append(normalized)
            
            if authors_list and len(authors_list) <= 10:
                authors = authors_list
        
        if not authors:
            chinese_authors = re.findall(r'[\u4e00-\u9fff]{1,4}(?:\s+[\u4e00-\u9fff]{1,4})?', text)
            if len(chinese_authors) >= 1 and len(chinese_authors) <= 10:
                authors = [a.strip() for a in chinese_authors if a.strip()]
        
        if not authors and self._looks_like_single_author(text):
            normalized = self._normalize_author(text)
            if normalized:
                authors.append(normalized)
        
        if authors:
            entry.authors = authors

    def _looks_like_single_author(self, text: str) -> bool:
        if not text:
            return False
        
        text = text.strip().rstrip('.')
        
        if re.match(r'^[\u4e00-\u9fff]{1,4}(?:\s+[\u4e00-\u9fff]{1,4})?$', text):
            return True
        
        if re.match(r'^[A-Z][a-z]+\s+[A-Z][a-z]?$', text):
            return True
        
        if re.match(r'^[A-Z][a-z]+,\s*[A-Z][a-z]?$', text):
            return True
        
        if re.match(r'^[A-Z][a-z]+,\s*[A-Z]\.\s*[A-Z]\.?$', text):
            return True
        
        return False

    def _normalize_author(self, name: str) -> Optional[str]:
        name = name.strip().strip('.').strip()
        if not name:
            return None
        
        name = re.sub(r'\s+', ' ', name)
        
        if name.lower() in ['et al', 'et al.', 'etal', '等']:
            return 'et al.'
        
        if re.match(r'^[\u4e00-\u9fff]{1,4}(?:\s+[\u4e00-\u9fff]{1,4})?$', name):
            return name
        
        if ',' in name:
            parts = [p.strip() for p in name.split(',', 1)]
            if len(parts) == 2:
                last, first = parts
                last = last.strip()
                first = first.strip()
                
                if re.match(r'^[A-Za-z]+(?:\s+[A-Za-z]+)*$', last):
                    initial_chars = [c for c in first if c.isupper()]
                    if initial_chars:
                        initials = '. '.join(initial_chars)
                        return f"{last}, {initials}."
                    return last
                
                if re.match(r'^[\u4e00-\u9fff]{1,4}$', last):
                    return name
        
        words = name.split()
        if len(words) == 2:
            if re.match(r'^[A-Z][a-z]+$', words[0]) and re.match(r'^[A-Z]([a-z]+)?$', words[1]):
                return f"{words[0]}, {words[1][0]}."
            if re.match(r'^[\u4e00-\u9fff]{1,4}$', words[0]) and re.match(r'^[\u4e00-\u9fff]{1,4}$', words[1]):
                return name
        
        if len(words) == 1:
            if re.match(r'^[A-Z][a-z]+$', name):
                return name
            if re.match(r'^[\u4e00-\u9fff]{1,4}$', name):
                return name
        
        if len(words) >= 2 and all(re.match(r'^[A-Za-z]+$', w) for w in words):
            last_name = words[-1]
            initials = [w[0].upper() for w in words[:-1] if w]
            if initials:
                return f"{last_name}, {'. '.join(initials)}."
            return last_name
        
        return None

    def _extract_journal(self, text: str, entry: ReferenceEntry) -> None:
        if not text:
            return
        
        text = text.lstrip('()').strip()
        if not text:
            return
        
        year_str = str(entry.year) if entry.year else None
        
        if year_str and year_str in text:
            year_pos = text.find(year_str)
            candidate = text[:year_pos].strip().rstrip(',.;: ')
            if self._is_valid_journal(candidate):
                entry.journal = candidate
                return
        
        comma_pos = text.find(',')
        if comma_pos > 0:
            candidate = text[:comma_pos].strip()
            if self._is_valid_journal(candidate):
                entry.journal = candidate
                return
        
        period_pos = text.find('. ')
        if period_pos > 0:
            candidate = text[:period_pos].strip()
            if self._is_valid_journal(candidate):
                entry.journal = candidate
                return
        
        colon_pos = text.find(': ')
        if colon_pos > 0:
            candidate = text[:colon_pos].strip()
            if self._is_valid_journal(candidate):
                entry.journal = candidate
                return
        
        words = text.split()
        for i in range(min(len(words), 8), 1, -1):
            candidate = ' '.join(words[:i])
            if self._is_valid_journal(candidate):
                entry.journal = candidate
                return

    def _is_valid_journal(self, text: str) -> bool:
        if not text or len(text) < 3 or len(text) > 200:
            return False
        
        text_lower = text.lower()
        
        if text_lower.startswith(('http', 'doi', '10.', 'url', 'pp.', 'vol.', 'no.', '19', '20', 'https', '第', '(')):
            return False
        
        if re.match(r'^\d+$', text):
            return False
        
        if re.match(r'^\d+\s*[-–—]\s*\d+$', text):
            return False
        
        if re.match(r'^\d+\(\d+\)$', text):
            return False
        
        if re.match(r'^[A-Za-z]\.?$', text):
            return False
        
        if re.search(r'^\d+卷|\d+期', text):
            return False
        
        if text_lower in ['et al', 'et al.', 'etal', '等', 'and', '与', '和']:
            return False
        
        if re.match(r'^[A-Z][a-z]+\s+\d+\.\d+', text):
            return False
        
        if len(text) >= 100:
            return False
        
        if re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$', text):
            return True
        
        if re.match(r'^[\u4e00-\u9fff]+(?:[\u4e00-\u9fff]| )*$', text):
            return True
        
        if re.match(r'^[A-Z][a-z]+(?:[ -][A-Z][a-z]+)*$', text):
            return True
        
        if re.match(r'^[A-Z][a-z]+(?:\.[A-Z][a-z]+)*$', text):
            return True
        
        return False

    def _detect_type(self, entry: ReferenceEntry, text: str) -> ReferenceType:
        lower = text.lower()

        if any(k in lower for k in ['thesis', 'dissertation', '硕士', '博士', '学位论文']):
            return ReferenceType.THESIS
        elif any(k in lower for k in ['proceedings', 'conference', 'symposium', '会议录', '研讨会', 'Neural Information Processing Systems']):
            return ReferenceType.INPROCEEDINGS
        elif any(k in lower for k in ['book', '图书', '专著', '出版社', 'press', 'University Press', 'Cambridge', 'Oxford']):
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
        'thesis': ReferenceType.THESIS,
        'online': ReferenceType.ONLINE,
        'misc': ReferenceType.UNKNOWN,
        'unpublished': ReferenceType.UNKNOWN,
        'techreport': ReferenceType.UNKNOWN,
    }

    def parse(self, bibtex_str: str) -> list[ReferenceEntry]:
        try:
            import bibtexparser
            from bibtexparser.bparser import BibTexParser
            from bibtexparser.customization import convert_to_unicode

            parser = BibTexParser(common_strings=True)
            parser.customization = convert_to_unicode
            parser.ignore_nonstandard_types = False

            bib_db = bibtexparser.loads(bibtex_str, parser=parser)

            entries = []
            for pos, entry in enumerate(bib_db.entries):
                ref_entry = self._convert_entry(entry, pos)
                entries.append(ref_entry)

            return entries

        except ImportError:
            return self._parse_manually(bibtex_str)

    def _parse_manually(self, bibtex_str: str) -> list[ReferenceEntry]:
        entries = []
        entry_pattern = re.compile(
            r'@(\w+)\s*\{\s*([^,]+),\s*(.*?)\n\s*\}',
            re.DOTALL | re.IGNORECASE,
        )

        field_pattern = re.compile(r'(\w+)\s*=\s*[\{"](.*?)[\}"]', re.DOTALL)

        for pos, match in enumerate(entry_pattern.finditer(bibtex_str)):
            entry_type, cite_key, fields_str = match.groups()
            fields = {}

            for fm in field_pattern.finditer(fields_str):
                fields[fm.group(1).lower()] = fm.group(2).strip()

            entry = self._create_entry_from_dict(
                entry_type, cite_key, fields, pos, match.group(0)
            )
            entries.append(entry)

        return entries

    def _convert_entry(self, bib_entry: dict, position: int) -> ReferenceEntry:
        entry_type = bib_entry.get('ENTRYTYPE', 'unknown').lower()
        cite_key = bib_entry.get('ID', '')

        fields = {
            k.lower(): v
            for k, v in bib_entry.items()
            if k not in ('ENTRYTYPE', 'ID')
        }

        return self._create_entry_from_dict(
            entry_type, cite_key, fields, position, str(bib_entry)
        )

    def _create_entry_from_dict(
        self,
        entry_type: str,
        cite_key: str,
        fields: dict,
        position: int,
        original_text: str,
    ) -> ReferenceEntry:
        ref_type = self.TYPE_MAPPING.get(entry_type, ReferenceType.UNKNOWN)

        entry = ReferenceEntry(
            original_text=original_text,
            original_position=position,
            entry_type=ref_type,
            citation_key=cite_key,
            raw_fields=fields,
        )

        author_str = fields.get('author', '') or fields.get('authors', '')
        if author_str:
            entry.authors = self._parse_bibtex_authors(author_str)

        entry.title = fields.get('title')
        entry.journal = fields.get('journal') or fields.get('journaltitle')
        entry.booktitle = fields.get('booktitle')
        entry.publisher = fields.get('publisher')

        year_str = fields.get('year', '')
        if year_str and year_str.isdigit():
            entry.year = int(year_str)

        entry.volume = fields.get('volume')
        entry.number = fields.get('number') or fields.get('issue')
        entry.pages = fields.get('pages')
        entry.doi = fields.get('doi')
        entry.url = fields.get('url') or fields.get('link')
        entry.isbn = fields.get('isbn')

        if not entry.doi:
            doi_match = DOI_PATTERN.search(original_text)
            if doi_match:
                entry.doi = doi_match.group(1).lower()

        return entry

    def _parse_bibtex_authors(self, author_str: str) -> list[str]:
        author_str = re.sub(r'\s+and\s+', '|', author_str, flags=re.IGNORECASE)
        raw_authors = [a.strip() for a in author_str.split('|') if a.strip()]

        authors = []
        for author in raw_authors:
            author = author.strip().replace('{', '').replace('}', '')
            if ',' in author:
                parts = [p.strip() for p in author.split(',', 1)]
                if len(parts) == 2:
                    last, first = parts
                    initials = '. '.join(
                        [c for c in first if c.isupper()]
                    )
                    if initials:
                        authors.append(f"{last}, {initials}.")
                    else:
                        authors.append(f"{last}, {first}")
                else:
                    authors.append(author)
            else:
                words = author.split()
                if len(words) > 1:
                    last = words[-1]
                    first_initials = '. '.join(
                        [w[0].upper() for w in words[:-1] if w]
                    )
                    if first_initials:
                        authors.append(f"{last}, {first_initials}.")
                    else:
                        authors.append(author)
                else:
                    authors.append(author)

        return authors


def parse_file(filepath: str | Path) -> list[ReferenceEntry]:
    path = Path(filepath)
    content = path.read_text(encoding='utf-8')

    if path.suffix.lower() in ('.bib', '.bibtex'):
        return BibTeXParser().parse(content)
    else:
        return TextParser().parse(content)


def parse_text(text: str, input_type: str = 'auto') -> list[ReferenceEntry]:
    stripped = text.strip()

    if input_type == 'bibtex' or (
        input_type == 'auto'
        and stripped.startswith('@')
        and '@' in stripped[1:50]
    ):
        return BibTeXParser().parse(text)
    else:
        return TextParser().parse(text)
