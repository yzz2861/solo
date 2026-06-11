"""输出格式化器 - 支持多种学校格式"""

from __future__ import annotations

import re
from typing import Optional

from .models import ProcessingStatus, ReferenceEntry


class OutputFormat:
    GB7714 = "gb7714"
    APA = "apa"
    MLA = "mla"
    SIMPLE = "simple"


class OutputFormatter:
    def __init__(
        self,
        format_name: str = OutputFormat.GB7714,
        numbering: bool = True,
        include_original_position: bool = False,
    ) -> None:
        self.format_name = format_name
        self.numbering = numbering
        self.include_original_position = include_original_position

    def format_entries(self, entries: list[ReferenceEntry]) -> str:
        output_entries = [e for e in entries if e.status != ProcessingStatus.DUPLICATE]
        output_entries.sort(key=lambda e: e.output_position)

        lines = []
        for idx, entry in enumerate(output_entries, 1):
            formatted = self.format_single_entry(entry, idx)
            if formatted:
                lines.append(formatted)

        return '\n'.join(lines)

    def format_single_entry(self, entry: ReferenceEntry, output_index: int) -> Optional[str]:
        if entry.status == ProcessingStatus.DUPLICATE:
            return None

        formatters = {
            OutputFormat.GB7714: self._format_gb7714,
            OutputFormat.APA: self._format_apa,
            OutputFormat.MLA: self._format_mla,
            OutputFormat.SIMPLE: self._format_simple,
        }

        formatter = formatters.get(self.format_name, self._format_gb7714)
        formatted = formatter(entry)

        if self.numbering:
            formatted = f"[{output_index}] {formatted}"

        if self.include_original_position:
            formatted += f" {{原始位置: {entry.original_position + 1}}}"

        return formatted

    def _format_authors(self, authors: list[str], max_display: int = 3) -> str:
        if not authors:
            return ""

        display_authors = authors[:max_display]
        author_str = ', '.join(display_authors)

        if len(authors) > max_display:
            if authors[-1].lower() == 'et al.':
                pass
            else:
                author_str += ', et al.'
        elif len(authors) > 1:
            parts = author_str.rsplit(', ', 1)
            author_str = ', and '.join(parts)

        return author_str

    def _format_gb7714(self, entry: ReferenceEntry) -> str:
        parts = []

        authors = self._format_authors(entry.authors, max_display=3)
        if authors:
            parts.append(authors)

        if entry.title:
            title = entry.title
            if not title.endswith('.'):
                title += '.'
            parts.append(title)

        type_label = self._get_gb_type_label(entry)
        if type_label:
            parts.append(type_label)

        journal_info = []
        if entry.journal:
            journal_info.append(entry.journal)
        if entry.year:
            year_part = str(entry.year)
            if entry.volume:
                year_part += f', {entry.volume}'
                if entry.number:
                    year_part += f'({entry.number})'
            journal_info.append(year_part)
        if entry.pages:
            journal_info.append(f': {entry.pages}')

        if journal_info:
            parts.append(''.join(journal_info) + '.')

        if entry.booktitle and not entry.journal:
            book_info = []
            if entry.booktitle:
                book_info.append(entry.booktitle)
            if entry.publisher:
                place_pub = entry.publisher
                if entry.year:
                    place_pub += f', {entry.year}'
                book_info.append(place_pub)
            if entry.pages:
                book_info.append(f': {entry.pages}')
            parts.append('. '.join(book_info) + '.')

        if entry.doi:
            parts.append(f'DOI: {entry.doi}.')
        elif entry.url:
            parts.append(f'URL: {entry.url}.')

        result = ' '.join(parts)
        result = re.sub(r'\s+', ' ', result)
        result = re.sub(r'\.\.+', '.', result)
        return result.strip()

    def _get_gb_type_label(self, entry: ReferenceEntry) -> Optional[str]:
        from .models import ReferenceType

        type_map = {
            ReferenceType.ARTICLE: '[J]',
            ReferenceType.BOOK: '[M]',
            ReferenceType.INCOLLECTION: '[G]',
            ReferenceType.INPROCEEDINGS: '[C]',
            ReferenceType.THESIS: '[D]',
            ReferenceType.ONLINE: '[EB/OL]',
            ReferenceType.UNKNOWN: '[文献类型标识]',
        }

        return type_map.get(entry.entry_type)

    def _format_apa(self, entry: ReferenceEntry) -> str:
        parts = []

        authors = self._format_authors(entry.authors, max_display=20)
        if authors:
            year = entry.year if entry.year else 'n.d.'
            parts.append(f"{authors} ({year}).")

        if entry.title:
            parts.append(f"{entry.title}.")

        if entry.journal:
            journal = entry.journal
            if entry.volume:
                journal += f", {entry.volume}"
                if entry.pages:
                    journal += f", {entry.pages}"
            parts.append(journal + '.')
        elif entry.booktitle:
            book = entry.booktitle
            if entry.publisher:
                book += f". {entry.publisher}"
            parts.append(book + '.')

        if entry.doi:
            parts.append(f"https://doi.org/{entry.doi}")
        elif entry.url:
            parts.append(entry.url)

        return ' '.join(parts)

    def _format_mla(self, entry: ReferenceEntry) -> str:
        parts = []

        if entry.authors:
            if len(entry.authors) == 1:
                parts.append(entry.authors[0] + '.')
            elif len(entry.authors) == 2:
                parts.append(f"{entry.authors[0]}, and {entry.authors[1]}.")
            else:
                parts.append(f"{entry.authors[0]}, et al.")

        if entry.title:
            parts.append(f'"{entry.title}."')

        if entry.journal:
            container = entry.journal
            if entry.volume:
                container += f", vol. {entry.volume}"
            if entry.number:
                container += f", no. {entry.number}"
            if entry.year:
                container += f", {entry.year}"
            if entry.pages:
                container += f", pp. {entry.pages}"
            parts.append(container + '.')
        elif entry.booktitle:
            container = entry.booktitle
            if entry.publisher:
                container += f", {entry.publisher}"
            if entry.year:
                container += f", {entry.year}"
            if entry.pages:
                container += f", pp. {entry.pages}"
            parts.append(container + '.')

        if entry.doi:
            parts.append(f"https://doi.org/{entry.doi}.")

        return ' '.join(parts)

    def _format_simple(self, entry: ReferenceEntry) -> str:
        parts = []

        authors = self._format_authors(entry.authors, max_display=5)
        if authors:
            parts.append(authors)

        if entry.title:
            parts.append(f'"{entry.title}"')

        if entry.journal:
            journal = entry.journal
            if entry.volume:
                journal += f" {entry.volume}"
                if entry.number:
                    journal += f"({entry.number})"
            if entry.pages:
                journal += f": {entry.pages}"
            if entry.year:
                journal += f" ({entry.year})"
            parts.append(journal)
        elif entry.booktitle:
            book = entry.booktitle
            if entry.publisher:
                book += f", {entry.publisher}"
            if entry.year:
                book += f" ({entry.year})"
            parts.append(book)

        if entry.doi:
            parts.append(f"DOI: {entry.doi}")

        result = '. '.join(parts)
        if not result.endswith('.'):
            result += '.'
        return result

    def format_bibtex(self, entries: list[ReferenceEntry]) -> str:
        output_entries = [e for e in entries if e.status != ProcessingStatus.DUPLICATE]
        output_entries.sort(key=lambda e: e.output_position)

        lines = []
        for entry in output_entries:
            bib_entry = self._entry_to_bibtex(entry)
            if bib_entry:
                lines.append(bib_entry)
                lines.append('')

        return '\n'.join(lines).strip()

    def _entry_to_bibtex(self, entry: ReferenceEntry) -> Optional[str]:
        if entry.status == ProcessingStatus.DUPLICATE:
            return None

        from .models import ReferenceType

        type_map = {
            ReferenceType.ARTICLE: 'article',
            ReferenceType.BOOK: 'book',
            ReferenceType.INCOLLECTION: 'incollection',
            ReferenceType.INPROCEEDINGS: 'inproceedings',
            ReferenceType.THESIS: 'phdthesis',
            ReferenceType.ONLINE: 'misc',
            ReferenceType.UNKNOWN: 'misc',
        }

        bib_type = type_map.get(entry.entry_type, 'misc')
        cite_key = entry.citation_key or f"ref{entry.original_position + 1}"

        lines = [f"@{bib_type}{{{cite_key},"]

        fields: list[tuple[str, Optional[str]]] = [
            ('author', ' and '.join(entry.authors) if entry.authors else None),
            ('title', entry.title),
            ('journal', entry.journal),
            ('booktitle', entry.booktitle),
            ('year', str(entry.year) if entry.year else None),
            ('volume', entry.volume),
            ('number', entry.number),
            ('pages', entry.pages),
            ('publisher', entry.publisher),
            ('doi', entry.doi),
            ('url', entry.url),
            ('isbn', entry.isbn),
        ]

        for field_name, value in fields:
            if value:
                lines.append(f"  {field_name} = {{{value}}},")

        if lines[-1].endswith(','):
            lines[-1] = lines[-1][:-1]

        lines.append("}")
        return '\n'.join(lines)


def get_available_formats() -> dict[str, str]:
    return {
        OutputFormat.GB7714: "GB/T 7714-2015 格式（中国高校通用）",
        OutputFormat.APA: "APA 格式（心理学、社会科学）",
        OutputFormat.MLA: "MLA 格式（人文学科）",
        OutputFormat.SIMPLE: "简洁格式",
    }
