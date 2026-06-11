import re
import hashlib
from pathlib import Path
from typing import List, Dict, Set, Tuple
from urllib.parse import urlparse, urlunparse, quote, unquote


class URLManager:
    def __init__(self, urls_file: Path):
        self.urls_file = urls_file
        self.invalid_chars_pattern = re.compile(r'[\\/:*?"<>|\t\n\r]+')
        self.whitespace_pattern = re.compile(r'\s+')

    def read_urls(self) -> List[str]:
        if not self.urls_file.exists():
            raise FileNotFoundError(f"URLs file not found: {self.urls_file}")

        urls = []
        with open(self.urls_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                url = line.strip()
                if url and not url.startswith('#'):
                    urls.append((line_num, url))

        return urls

    def normalize_url(self, url: str) -> str:
        url = url.strip()
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        parsed = urlparse(url)

        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()

        if ':' in netloc:
            host, port = netloc.rsplit(':', 1)
            if (scheme == 'http' and port == '80') or (scheme == 'https' and port == '443'):
                netloc = host

        path = parsed.path
        if path == '':
            path = '/'
        elif len(path) > 1 and path.endswith('/'):
            path = path.rstrip('/')

        try:
            path = unquote(path)
            path = quote(path, safe='/_-')
        except Exception:
            pass

        normalized = urlunparse((
            scheme,
            netloc,
            path,
            parsed.params,
            parsed.query,
            parsed.fragment
        ))

        return normalized

    def sanitize_filename(self, name: str, max_length: int = 100) -> str:
        if not name:
            return 'untitled'

        cleaned = self.invalid_chars_pattern.sub('_', name)
        cleaned = self.whitespace_pattern.sub('_', cleaned)
        cleaned = cleaned.strip('._-')

        try:
            cleaned.encode('ascii')
        except UnicodeEncodeError:
            cleaned = cleaned.encode('utf-8').decode('utf-8', 'ignore')

        if len(cleaned) > max_length:
            cleaned = cleaned[:max_length].rstrip('._-')

        return cleaned or 'untitled'

    def generate_url_id(self, url: str) -> str:
        normalized = self.normalize_url(url)
        return hashlib.md5(normalized.encode('utf-8')).hexdigest()[:16]

    def deduplicate_urls(self, urls_with_lines: List[Tuple[int, str]]) -> Tuple[List[Dict], List[Dict]]:
        seen_ids: Set[str] = set()
        processed_urls: List[Dict] = []
        duplicates: List[Dict] = []

        for line_num, url in urls_with_lines:
            try:
                url_id = self.generate_url_id(url)
                normalized_url = self.normalize_url(url)

                if url_id in seen_ids:
                    duplicates.append({
                        'line': line_num,
                        'original_url': url,
                        'normalized_url': normalized_url,
                        'url_id': url_id,
                    })
                else:
                    seen_ids.add(url_id)
                    processed_urls.append({
                        'line': line_num,
                        'original_url': url,
                        'normalized_url': normalized_url,
                        'url_id': url_id,
                    })
            except Exception as e:
                duplicates.append({
                    'line': line_num,
                    'original_url': url,
                    'error': str(e),
                })

        return processed_urls, duplicates

    def load_and_process_urls(self) -> Dict:
        raw_urls = self.read_urls()
        processed_urls, duplicates = self.deduplicate_urls(raw_urls)

        return {
            'total_raw': len(raw_urls),
            'total_unique': len(processed_urls),
            'total_duplicates': len(duplicates),
            'urls': processed_urls,
            'duplicates': duplicates,
        }
