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
            text_clean = re.sub(r'\bdoi:\s*', '', text_clean, flags=re.IGNORECASE)

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
        text = text.strip().rstrip(',.:;')
        
        text = re.sub(r'\s*&\s*', '; ', text)
        text = re.sub(r'\s+(?:and|AND|And)\s+', '; ', text)
        
        parts = [p.strip().rstrip(',.') for p in text.split(';') if p.strip()]
        
        authors = []
        for part in parts:
            if part.lower() in ['et al', 'et al.', 'etal']:
                if authors:
                    authors.append('et al.')
                break
            
            comma_parts = [p.strip() for p in part.split(',') if p.strip()]
            if len(comma_parts) >= 2:
                last_name = comma_parts[0].strip()
                first_part = ' '.join(comma_parts[1:]).strip()
                
                initials = '. '.join([p[0].upper() for p in first_part.split() if p])
                if initials:
                    authors.append(f"{last_name}, {initials}.")
                else:
                    authors.append(f"{last_name}, {first_part}")
            elif part:
                words = part.split()
                if len(words) >= 2:
                    last_name = words[-1]
                    initials = '. '.join([w[0].upper() for w in words[:-1] if w])
                    if initials:
                        authors.append(f"{last_name}, {initials}.")
                    else:
                        authors.append(last_name)
                elif part:
                    authors.append(part)
        
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
