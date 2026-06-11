"""输入解析器：纯文本和 BibTeX 解析"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from .models import ReferenceEntry, ReferenceType


DOI_PATTERN = re.compile(
    r'(?:https?://(?:dx\.)?doi\.org/|doi:\s*)?(10\.\d{4,9}/[\-._;()/:A-Z0-9]+)',
    re.IGNORECASE,
)

YEAR_PATTERN = re.compile(r'\b(19|20)\d{2}\b')

PAGE_PATTERN = re.compile(r'(\d+)\s*[-–—]\s*(\d+)')

VOLUME_PATTERN = re.compile(r'Vol\.?\s*(\d+)', re.IGNORECASE)
NUMBER_PATTERN = re.compile(r'(?:No\.?|Issue)\s*(\d+)', re.IGNORECASE)


class TextParser:
    def __init__(self, preserve_order: bool = True) -> None:
        self.preserve_order = preserve_order
        self._entry_split_pattern = re.compile(r'\n\s*(?:\[?\d+\]?\.?\s*)?\n')
        self._numbered_pattern = re.compile(r'^\s*\[?(\d+)\]?[\.\)]\s*')

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

        doi_match = DOI_PATTERN.search(text)
        if doi_match:
            entry.doi = doi_match.group(1)

        year_match = YEAR_PATTERN.search(text)
        if year_match:
            entry.year = int(year_match.group(0))

        page_match = PAGE_PATTERN.search(text)
        if page_match:
            entry.pages = f"{page_match.group(1)}-{page_match.group(2)}"

        vol_match = VOLUME_PATTERN.search(text)
        if vol_match:
            entry.volume = vol_match.group(1)

        num_match = NUMBER_PATTERN.search(text)
        if num_match:
            entry.number = num_match.group(1)

        authors, remaining = self._extract_authors(text)
        entry.authors = authors

        title, remaining = self._extract_title(remaining, entry.year)
        if title:
            entry.title = title

        journal = self._extract_journal(remaining)
        if journal:
            entry.journal = journal

        entry.entry_type = self._detect_type(text)

        if 'http' in text.lower() and not entry.doi:
            url_match = re.search(r'https?://\S+', text)
            if url_match:
                entry.url = url_match.group(0).rstrip('.,;)')

        return entry

    def _extract_authors(self, text: str) -> tuple[list[str], str]:
        authors = []
        remaining = text

        year_match = YEAR_PATTERN.search(text)
        if year_match:
            before_year = text[:year_match.start()]
            author_part = before_year.strip()
            remaining = text[year_match.start():]
        else:
            first_period = text.find('. ')
            if first_period > 0 and first_period < 200:
                author_part = text[:first_period]
                remaining = text[first_period + 2:]
            else:
                return [], text

        author_part = author_part.strip().rstrip(',.;')

        if not author_part:
            return [], remaining

        author_part = re.sub(r'[，；]', ',', author_part)
        author_part = re.sub(r'\s+and\s+', ', ', author_part, flags=re.IGNORECASE)

        raw_authors = [a.strip() for a in author_part.split(',') if a.strip()]

        for author in raw_authors:
            normalized = self._normalize_author_name(author)
            if normalized:
                authors.append(normalized)

        return authors, remaining

    def _normalize_author_name(self, author: str) -> Optional[str]:
        author = author.strip().strip('.')
        if not author or author.lower() in ['et al', 'etal', '等']:
            return 'et al.'

        author = re.sub(r'\s+', ' ', author)

        if ',' in author:
            parts = [p.strip() for p in author.split(',', 1)]
            if len(parts) == 2:
                last, first = parts
                if first:
                    initials = '. '.join([c for c in first if c.isupper()]) + '.'
                    return f"{last}, {initials}"
                return last

        words = author.split()
        if len(words) > 1:
            last = words[-1]
            first_initials = '. '.join([w[0].upper() for w in words[:-1] if w])
            if first_initials:
                return f"{last}, {first_initials}."
            return last

        return author if author else None

    def _extract_title(self, text: str, year: Optional[int]) -> tuple[Optional[str], str]:
        text = text.strip()

        if year:
            year_str = str(year)
            idx = text.find(year_str)
            if idx >= 0:
                text = text[idx + len(year_str):].lstrip(').,; ')

        quoted_match = re.match(r'[《"“]([^》"”]+)[》"”]', text)
        if quoted_match:
            title = quoted_match.group(1).strip()
            remaining = text[quoted_match.end():].lstrip('.,; ')
            return title, remaining

        parts = re.split(r'[.。]\s+', text, maxsplit=2)
        if len(parts) >= 2:
            title_candidate = parts[0].strip().strip('"“”《》')
            if 5 <= len(title_candidate) <= 300:
                if not re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$', title_candidate):
                    remaining = '. '.join(parts[1:]).strip()
                    return title_candidate, remaining

        return None, text

    def _extract_journal(self, text: str) -> Optional[str]:
        text = text.strip()

        if not text:
            return None

        parts = re.split(r'[.,;]\s+', text, maxsplit=1)
        if parts:
            journal_candidate = parts[0].strip().strip('"“”')
            if 2 <= len(journal_candidate) <= 100:
                if not journal_candidate.lower().startswith(('vol', 'no', 'issue', '19', '20', 'http')):
                    return journal_candidate

        return None

    def _detect_type(self, text: str) -> ReferenceType:
        lower = text.lower()

        if any(k in lower for k in ['thesis', 'dissertation', '硕士', '博士']):
            return ReferenceType.THESIS
        elif any(k in lower for k in ['proceedings', 'conference', 'symposium', '会议']):
            return ReferenceType.INPROCEEDINGS
        elif any(k in lower for k in ['book', '图书', '出版']):
            return ReferenceType.BOOK
        elif any(k in lower for k in ['chapter', 'in:', 'pp.']):
            return ReferenceType.INCOLLECTION
        elif any(k in lower for k in ['http', 'url', 'www.']):
            return ReferenceType.ONLINE
        elif any(k in text for k in ['Journal', 'Trans.', 'Proc.', 'Review', 'Letters']) or re.search(r'Vol\.?\s*\d+', text):
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
                entry.doi = doi_match.group(1)

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
