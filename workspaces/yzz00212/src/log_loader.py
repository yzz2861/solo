import csv
import json
import os
from datetime import datetime
from typing import List, Dict, Any


class LogLoader:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.supported_formats = ['.csv', '.json', '.log']
        self.records = []
        self.source_info = []

    def load_from_directory(self, dir_path: str) -> List[Dict[str, Any]]:
        all_records = []
        if not os.path.isdir(dir_path):
            raise ValueError(f"目录不存在: {dir_path}")

        for filename in sorted(os.listdir(dir_path)):
            filepath = os.path.join(dir_path, filename)
            if not os.path.isfile(filepath):
                continue

            ext = os.path.splitext(filename)[1].lower()
            if ext not in self.supported_formats:
                continue

            records = self._load_file(filepath, ext, filename)
            all_records.extend(records)
            self.source_info.append({
                'filename': filename,
                'record_count': len(records),
                'load_time': datetime.now().isoformat()
            })

        self.records = all_records
        return all_records

    def load_from_files(self, file_paths: List[str]) -> List[Dict[str, Any]]:
        all_records = []
        for filepath in file_paths:
            if not os.path.isfile(filepath):
                raise ValueError(f"文件不存在: {filepath}")

            filename = os.path.basename(filepath)
            ext = os.path.splitext(filename)[1].lower()
            if ext not in self.supported_formats:
                continue

            records = self._load_file(filepath, ext, filename)
            all_records.extend(records)
            self.source_info.append({
                'filename': filename,
                'record_count': len(records),
                'load_time': datetime.now().isoformat()
            })

        self.records = all_records
        return all_records

    def _load_file(self, filepath: str, ext: str, filename: str) -> List[Dict[str, Any]]:
        records = []
        if ext == '.csv':
            records = self._load_csv(filepath)
        elif ext == '.json':
            records = self._load_json(filepath)
        elif ext == '.log':
            records = self._load_log(filepath)

        for record in records:
            record['_source_file'] = filename
            record['_load_time'] = datetime.now().isoformat()
            if 'timestamp' in record and isinstance(record['timestamp'], str):
                record['timestamp'] = self._parse_timestamp(record['timestamp'])

        return records

    def _load_csv(self, filepath: str) -> List[Dict[str, Any]]:
        records = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                record = self._convert_types(row)
                records.append(record)
        return records

    def _load_json(self, filepath: str) -> List[Dict[str, Any]]:
        records = []
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list):
                for item in data:
                    record = self._convert_types(item)
                    records.append(record)
            elif isinstance(data, dict):
                record = self._convert_types(data)
                records.append(record)
        return records

    def _load_log(self, filepath: str) -> List[Dict[str, Any]]:
        records = []
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    record = self._convert_types(record)
                    records.append(record)
                except json.JSONDecodeError:
                    record = self._parse_log_line(line)
                    if record:
                        records.append(record)
        return records

    def _parse_log_line(self, line: str) -> Dict[str, Any]:
        record = {}
        parts = line.split('|')
        if len(parts) < 2:
            return None

        for part in parts:
            if '=' in part:
                key, value = part.split('=', 1)
                record[key.strip()] = value.strip()
            elif len(parts) == 2 and 'timestamp' not in record:
                record['timestamp'] = parts[0].strip()
                record['message'] = parts[1].strip()

        return record if record else None

    def _convert_types(self, record: Dict[str, Any]) -> Dict[str, Any]:
        numeric_fields = ['brightness', 'power', 'temperature', 'failure_rate',
                          'flicker_count', 'voltage', 'current']
        for field in numeric_fields:
            if field in record and record[field] is not None and record[field] != '':
                try:
                    record[field] = float(record[field])
                except (ValueError, TypeError):
                    pass
        return record

    def _parse_timestamp(self, ts_str: str) -> datetime:
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M:%S.%f',
            '%Y/%m/%d %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%S.%f',
            '%Y%m%d%H%M%S',
        ]
        for fmt in formats:
            try:
                return datetime.strptime(ts_str, fmt)
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(ts_str)
        except (ValueError, TypeError):
            return ts_str

    def get_source_info(self) -> List[Dict[str, Any]]:
        return self.source_info

    def get_record_count(self) -> int:
        return len(self.records)

    def get_records(self) -> List[Dict[str, Any]]:
        return self.records
