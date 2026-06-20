import re
import csv
import json
from datetime import date
from typing import List, Optional, Dict, Any
from pathlib import Path

import pandas as pd

from .models import LeaveRecord, LeaveType, SourceType
from .utils import parse_date, classify_leave_type, parse_period, extract_name


class BaseReader:
    def __init__(self, class_name: str = "未指定班级", reference_date: Optional[date] = None):
        self.class_name = class_name
        self.reference_date = reference_date or date.today()
        self.record_counter = 0

    def _next_id(self, prefix: str) -> str:
        self.record_counter += 1
        return f"{prefix}-{self.record_counter:04d}"


class SMSReader(BaseReader):
    def read(self, file_path: str) -> List[LeaveRecord]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"短信文件不存在: {file_path}")

        content = path.read_text(encoding="utf-8")
        lines = [l.strip() for l in content.splitlines() if l.strip()]

        records: List[LeaveRecord] = []
        current_blocks = self._split_into_blocks(lines)

        for block in current_blocks:
            block_text = "\n".join(block)
            record = self._parse_sms_block(block_text)
            if record:
                records.append(record)

        return records

    def _split_into_blocks(self, lines: List[str]) -> List[List[str]]:
        blocks: List[List[str]] = []
        current_block: List[str] = []

        date_pattern = re.compile(r"(\d{1,2}月\d{1,2}[日号]|\d{4}[-/年]\d{1,2}[-/月]\d{1,2}|今天|今日|明天)")

        for line in lines:
            if date_pattern.search(line) and current_block:
                blocks.append(current_block)
                current_block = [line]
            else:
                current_block.append(line)

        if current_block:
            blocks.append(current_block)

        return blocks if blocks else [lines]

    def _parse_sms_block(self, text: str) -> Optional[LeaveRecord]:
        name = extract_name(text)
        if not name:
            return None

        record_date = parse_date(text, self.reference_date) or self.reference_date
        period, is_half_day = parse_period(text)
        leave_type = classify_leave_type(text)

        reason = self._extract_reason(text, name)

        return LeaveRecord(
            student_name=name,
            record_date=record_date,
            period=period,
            leave_type=leave_type,
            reason=reason,
            source=SourceType.SMS,
            raw_content=text,
            is_half_day=is_half_day,
            record_id=self._next_id("SMS"),
        )

    def _extract_reason(self, text: str, name: str) -> str:
        patterns = [
            r"因(为)?(.+?)[，。,.;；请]",
            r"由于(.+?)[，。,.;；请]",
            r"(?:感冒|发烧|生病|住院|就医|有事|家里|参加|办).+?[，。,.;；]",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(0).strip("，。,.;；")
        return text[:30]


class LeaveSheetReader(BaseReader):
    def read(self, file_path: str) -> List[LeaveRecord]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"请假表文件不存在: {file_path}")

        suffix = path.suffix.lower()

        if suffix in [".xlsx", ".xls"]:
            return self._read_excel(path)
        elif suffix in [".csv"]:
            return self._read_csv(path)
        elif suffix in [".json"]:
            return self._read_json(path)
        else:
            raise ValueError(f"不支持的文件格式: {suffix}")

    def _read_excel(self, path: Path) -> List[LeaveRecord]:
        df = pd.read_excel(path, dtype=str)
        return self._parse_dataframe(df)

    def _read_csv(self, path: Path) -> List[LeaveRecord]:
        df = pd.read_csv(path, dtype=str, encoding="utf-8")
        return self._parse_dataframe(df)

    def _read_json(self, path: Path) -> List[LeaveRecord]:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        df = pd.DataFrame(data)
        return self._parse_dataframe(df)

    def _parse_dataframe(self, df: pd.DataFrame) -> List[LeaveRecord]:
        df.columns = [self._normalize_colname(c) for c in df.columns]

        required_map = self._detect_columns(df)

        records: List[LeaveRecord] = []
        for _, row in df.iterrows():
            try:
                record = self._parse_row(row, required_map)
                if record:
                    records.append(record)
            except Exception:
                continue

        return records

    def _normalize_colname(self, col: str) -> str:
        return str(col).strip().lower().replace(" ", "").replace("　", "")

    def _detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        col_map: Dict[str, str] = {}

        name_keywords = ["姓名", "学生", "名字", "学生姓名", "name", "student"]
        date_keywords = ["日期", "时间", "请假日期", "date", "请假时间"]
        period_keywords = ["节次", "时段", "时间段", "上午下午", "period"]
        type_keywords = ["类型", "假别", "种类", "请假类型", "type"]
        reason_keywords = ["原因", "事由", "请假原因", "reason", "备注"]
        teacher_keywords = ["老师", "班主任", "批假人", "teacher"]
        contact_keywords = ["联系", "电话", "家长", "联系方式", "contact"]

        all_cols = df.columns.tolist()

        for col in all_cols:
            if any(k in col for k in name_keywords) and "name" not in col_map:
                col_map["name"] = col
            elif any(k in col for k in date_keywords) and "date" not in col_map:
                col_map["date"] = col
            elif any(k in col for k in period_keywords) and "period" not in col_map:
                col_map["period"] = col
            elif any(k in col for k in type_keywords) and "type" not in col_map:
                col_map["type"] = col
            elif any(k in col for k in reason_keywords) and "reason" not in col_map:
                col_map["reason"] = col
            elif any(k in col for k in teacher_keywords) and "teacher" not in col_map:
                col_map["teacher"] = col
            elif any(k in col for k in contact_keywords) and "contact" not in col_map:
                col_map["contact"] = col

        return col_map

    def _parse_row(self, row: pd.Series, col_map: Dict[str, str]) -> Optional[LeaveRecord]:
        if "name" not in col_map:
            return None

        name_val = str(row.get(col_map["name"], "")).strip()
        if not name_val or name_val.lower() == "nan":
            return None

        date_val = str(row.get(col_map.get("date", ""), "")).strip()
        record_date = parse_date(date_val, self.reference_date) or self.reference_date

        period_val = str(row.get(col_map.get("period", ""), "")).strip() if col_map.get("period") else ""
        period, is_half_day = parse_period(period_val)

        type_val = str(row.get(col_map.get("type", ""), "")).strip() if col_map.get("type") else ""
        reason_val = str(row.get(col_map.get("reason", ""), "")).strip() if col_map.get("reason") else ""

        if type_val:
            leave_type = classify_leave_type(type_val)
        else:
            leave_type = classify_leave_type(reason_val)

        if not reason_val:
            reason_val = type_val or "未填写"

        teacher_val = str(row.get(col_map.get("teacher", ""), "")).strip() if col_map.get("teacher") else None
        contact_val = str(row.get(col_map.get("contact", ""), "")).strip() if col_map.get("contact") else None

        return LeaveRecord(
            student_name=name_val,
            record_date=record_date,
            period=period,
            leave_type=leave_type,
            reason=reason_val[:100],
            source=SourceType.PAPER,
            raw_content=f"{name_val}|{date_val}|{period_val}|{type_val}|{reason_val}",
            is_half_day=is_half_day,
            teacher=teacher_val if teacher_val and teacher_val.lower() != "nan" else None,
            contact=contact_val if contact_val and contact_val.lower() != "nan" else None,
            record_id=self._next_id("PAPER"),
        )


class AbsenceReader(BaseReader):
    def read(self, file_path: str) -> List[LeaveRecord]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"缺勤表文件不存在: {file_path}")

        suffix = path.suffix.lower()

        if suffix in [".xlsx", ".xls"]:
            df = pd.read_excel(path, dtype=str)
        elif suffix in [".csv"]:
            df = pd.read_csv(path, dtype=str, encoding="utf-8")
        elif suffix in [".json"]:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            df = pd.DataFrame(data)
        else:
            raise ValueError(f"不支持的文件格式: {suffix}")

        return self._parse_dataframe(df)

    def _normalize_colname(self, col: str) -> str:
        return str(col).strip().lower().replace(" ", "").replace("　", "")

    def _parse_dataframe(self, df: pd.DataFrame) -> List[LeaveRecord]:
        df.columns = [self._normalize_colname(c) for c in df.columns]

        col_map: Dict[str, str] = {}
        for col in df.columns:
            if any(k in col for k in ["姓名", "学生", "名字", "name", "student"]) and "name" not in col_map:
                col_map["name"] = col
            elif any(k in col for k in ["日期", "时间", "date", "缺勤日期"]) and "date" not in col_map:
                col_map["date"] = col
            elif any(k in col for k in ["节次", "时段", "课节", "period", "第几节"]) and "period" not in col_map:
                col_map["period"] = col
            elif any(k in col for k in ["科目", "课程", "班级", "subject", "老师"]) and "teacher" not in col_map:
                col_map["teacher"] = col
            elif any(k in col for k in ["原因", "备注", "说明", "reason", "缺勤原因"]) and "reason" not in col_map:
                col_map["reason"] = col

        records: List[LeaveRecord] = []
        for _, row in df.iterrows():
            try:
                name_val = str(row.get(col_map.get("name", ""), "")).strip()
                if not name_val or name_val.lower() == "nan":
                    continue

                date_val = str(row.get(col_map.get("date", ""), "")).strip()
                record_date = parse_date(date_val, self.reference_date) or self.reference_date

                period_val = str(row.get(col_map.get("period", ""), "")).strip() if col_map.get("period") else "全天"
                period, _ = parse_period(period_val)

                reason_val = str(row.get(col_map.get("reason", ""), "")).strip() if col_map.get("reason") else "未说明"
                teacher_val = str(row.get(col_map.get("teacher", ""), "")).strip() if col_map.get("teacher") else None

                records.append(LeaveRecord(
                    student_name=name_val,
                    record_date=record_date,
                    period=period,
                    leave_type=LeaveType.OTHER,
                    reason=reason_val if reason_val and reason_val.lower() != "nan" else "未说明",
                    source=SourceType.ABSENCE,
                    raw_content=f"缺勤记录:{name_val}|{date_val}|{period_val}",
                    teacher=teacher_val if teacher_val and teacher_val.lower() != "nan" else None,
                    record_id=self._next_id("ABSENCE"),
                ))
            except Exception:
                continue

        return records


def read_all_sources(
    sms_path: Optional[str] = None,
    sheet_path: Optional[str] = None,
    absence_path: Optional[str] = None,
    class_name: str = "未指定班级",
    reference_date: Optional[date] = None,
) -> List[LeaveRecord]:
    all_records: List[LeaveRecord] = []

    if sms_path:
        reader = SMSReader(class_name, reference_date)
        all_records.extend(reader.read(sms_path))

    if sheet_path:
        reader = LeaveSheetReader(class_name, reference_date)
        all_records.extend(reader.read(sheet_path))

    if absence_path:
        reader = AbsenceReader(class_name, reference_date)
        all_records.extend(reader.read(absence_path))

    return all_records
