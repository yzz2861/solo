import yaml
import csv
from datetime import datetime, date
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
import os


@dataclass
class CylinderRecord:
    气瓶编号: str = ""
    气瓶类型: str = ""
    实验室: str = ""
    存放位置: str = ""
    充装介质: str = ""
    上次检验日期: str = ""
    到期日期: str = ""
    责任人: str = ""
    采集来源: str = ""
    采集时间: str = ""
    到期日期_解析后: Optional[date] = None
    距离到期天数: Optional[int] = None
    风险等级: str = ""
    处理批次: str = ""
    来源标识: str = ""
    数据行号: int = 0


@dataclass
class ProblemRecord:
    数据行号: int = 0
    气瓶编号: str = ""
    问题类型: str = ""
    问题描述: str = ""
    原始数据: str = ""
    处理批次: str = ""
    来源标识: str = ""


@dataclass
class ProcessResult:
    valid_records: List[CylinderRecord] = field(default_factory=list)
    problem_records: List[ProblemRecord] = field(default_factory=list)
    dedup_removed: int = 0


class ConfigLoader:
    @staticmethod
    def load(config_path: str) -> Dict:
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)


class DataParser:
    def __init__(self, config: Dict, base_dir: str = None):
        self.config = config
        self.batch_id = config['batch_id']
        self.source_name = config['source_name']
        self.required_fields = config['required_fields']
        self.base_dir = base_dir or os.path.dirname(os.path.abspath(__file__))
        self.check_date = datetime.strptime(config['time_range']['check_date'], '%Y-%m-%d').date()

    def parse_date(self, date_str: str) -> Optional[date]:
        if not date_str or not date_str.strip():
            return None
        date_str = date_str.strip()
        formats = ['%Y-%m-%d', '%Y/%m/%d', '%Y.%m.%d', '%y-%m-%d']
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        return None

    def validate_record(self, record: Dict, row_num: int) -> List[str]:
        problems = []
        for field in self.required_fields:
            if field not in record or not record[field] or not record[field].strip():
                problems.append(f"缺少必填字段: {field}")
        return problems

    def parse_csv(self, file_path: str) -> Tuple[List[CylinderRecord], List[ProblemRecord]]:
        records = []
        problems = []
        abs_path = os.path.join(self.base_dir, file_path)

        with open(abs_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, start=2):
                problem_list = self.validate_record(row, i)
                if problem_list:
                    problems.append(ProblemRecord(
                        数据行号=i,
                        气瓶编号=row.get('气瓶编号', ''),
                        问题类型='字段缺失',
                        问题描述='; '.join(problem_list),
                        原始数据=str(row),
                        处理批次=self.batch_id,
                        来源标识=self.source_name
                    ))
                    continue

                exp_date = self.parse_date(row.get('到期日期', ''))
                if exp_date is None:
                    problems.append(ProblemRecord(
                        数据行号=i,
                        气瓶编号=row.get('气瓶编号', ''),
                        问题类型='日期格式错误',
                        问题描述=f"到期日期无法解析: {row.get('到期日期', '')}",
                        原始数据=str(row),
                        处理批次=self.batch_id,
                        来源标识=self.source_name
                    ))
                    continue

                record = CylinderRecord(
                    气瓶编号=row.get('气瓶编号', '').strip(),
                    气瓶类型=row.get('气瓶类型', '').strip(),
                    实验室=row.get('实验室', '').strip(),
                    存放位置=row.get('存放位置', '').strip(),
                    充装介质=row.get('充装介质', '').strip(),
                    上次检验日期=row.get('上次检验日期', '').strip(),
                    到期日期=row.get('到期日期', '').strip(),
                    责任人=row.get('责任人', '').strip(),
                    采集来源=row.get('采集来源', '').strip(),
                    采集时间=row.get('采集时间', '').strip(),
                    到期日期_解析后=exp_date,
                    处理批次=self.batch_id,
                    来源标识=self.source_name,
                    数据行号=i
                )
                records.append(record)

        return records, problems


class DataProcessor:
    def __init__(self, config: Dict):
        self.config = config
        self.batch_id = config['batch_id']
        self.source_name = config['source_name']
        self.risk_levels = config['risk_levels']
        self.dedup_keys = config['deduplication_keys']
        self.check_date = datetime.strptime(config['time_range']['check_date'], '%Y-%m-%d').date()
        self.time_start = datetime.strptime(config['time_range']['start_date'], '%Y-%m-%d').date()
        self.time_end = datetime.strptime(config['time_range']['end_date'], '%Y-%m-%d').date()

    def calculate_days_to_expiry(self, exp_date: date) -> int:
        delta = exp_date - self.check_date
        return delta.days

    def classify_risk(self, days_to_expiry: int) -> str:
        if days_to_expiry is None:
            return '无法判定'
        if days_to_expiry < 0:
            return '高风险'
        if days_to_expiry <= self.risk_levels['high_risk_days']:
            return '高风险'
        elif days_to_expiry <= self.risk_levels['medium_risk_days']:
            return '中风险'
        elif days_to_expiry <= self.risk_levels['low_risk_days']:
            return '低风险'
        else:
            return '低风险'

    def deduplicate(self, records: List[CylinderRecord]) -> Tuple[List[CylinderRecord], int]:
        seen = {}
        unique_records = []
        removed_count = 0

        for record in records:
            key_parts = [str(getattr(record, k, '')) for k in self.dedup_keys]
            dedup_key = '|'.join(key_parts)

            if dedup_key in seen:
                removed_count += 1
            else:
                seen[dedup_key] = True
                unique_records.append(record)

        return unique_records, removed_count

    def filter_by_time_range(self, records: List[CylinderRecord]) -> Tuple[List[CylinderRecord], List[ProblemRecord]]:
        filtered = []
        problems = []

        for record in records:
            exp_date = record.到期日期_解析后
            if exp_date < self.time_start or exp_date > self.time_end:
                problems.append(ProblemRecord(
                    数据行号=record.数据行号,
                    气瓶编号=record.气瓶编号,
                    问题类型='超出时间范围',
                    问题描述=f"到期日期 {record.到期日期} 不在统计范围 {self.time_start} ~ {self.time_end} 内",
                    原始数据=str(record.__dict__),
                    处理批次=self.batch_id,
                    来源标识=self.source_name
                ))
            else:
                filtered.append(record)

        return filtered, problems

    def process(self, records: List[CylinderRecord], parse_problems: List[ProblemRecord]) -> ProcessResult:
        result = ProcessResult()
        result.problem_records.extend(parse_problems)

        deduped_records, dedup_removed = self.deduplicate(records)
        result.dedup_removed = dedup_removed

        filtered_records, time_problems = self.filter_by_time_range(deduped_records)
        result.problem_records.extend(time_problems)

        for record in filtered_records:
            days = self.calculate_days_to_expiry(record.到期日期_解析后)
            record.距离到期天数 = days
            record.风险等级 = self.classify_risk(days)
            result.valid_records.append(record)

        return result


class ResponsibilityMapper:
    def __init__(self, config: Dict, base_dir: str = None):
        self.config = config
        self.base_dir = base_dir or os.path.dirname(os.path.abspath(__file__))
        self.mapping = {}

    def load(self, file_path: str) -> Dict[str, Dict]:
        abs_path = os.path.join(self.base_dir, file_path)
        mapping = {}
        with open(abs_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                lab = row.get('实验室', '').strip()
                if lab:
                    mapping[lab] = {
                        '责任人': row.get('责任人', '').strip(),
                        '联系电话': row.get('联系电话', '').strip(),
                        '部门': row.get('部门', '').strip()
                    }
        self.mapping = mapping
        return mapping

    def enrich(self, records: List[CylinderRecord]) -> List[CylinderRecord]:
        for record in records:
            if record.实验室 in self.mapping:
                if not record.责任人:
                    record.责任人 = self.mapping[record.实验室]['责任人']
        return records
