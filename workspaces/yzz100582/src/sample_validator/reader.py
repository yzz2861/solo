import os
import pandas as pd
from typing import List, Dict, Optional
from datetime import datetime, date

from .models import SampleRecord, SampleStatus


SAMPLE_ID_COLUMNS = ['sample_id', '样本号', '样本编号', '编号', 'id', 'sample']
BOX_ID_COLUMNS = ['box_id', '盒号', '冻存盒', '盒子编号', 'box']
POSITION_COLUMNS = ['position', '孔位', '位置', '盒位', 'pos', 'slot']
STATUS_COLUMNS = ['status', '状态', '样本状态', 'state']
BATCH_COLUMNS = ['batch_id', '批次', '批次号', 'batch']
DATE_COLUMNS = ['collect_date', '采集日期', '日期', 'date', '采样日期']
TYPE_COLUMNS = ['sample_type', '样本类型', '类型', 'type']
OWNER_COLUMNS = ['owner', '负责人', '保管人', 'owner_name']
NOTES_COLUMNS = ['notes', '备注', '说明', 'note', 'remark']


STATUS_MAP = {
    'active': SampleStatus.ACTIVE,
    '正常': SampleStatus.ACTIVE,
    '在库': SampleStatus.ACTIVE,
    '有效': SampleStatus.ACTIVE,
    'temporary': SampleStatus.TEMPORARY,
    '临时': SampleStatus.TEMPORARY,
    '暂存': SampleStatus.TEMPORARY,
    'destroyed': SampleStatus.DESTROYED,
    '销毁': SampleStatus.DESTROYED,
    '已销毁': SampleStatus.DESTROYED,
    '废弃': SampleStatus.DESTROYED,
    'unknown': SampleStatus.UNKNOWN,
    '未知': SampleStatus.UNKNOWN,
}


def read_samples(file_path: str) -> List[SampleRecord]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"样本文件不存在: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    if ext in ['.csv']:
        df = pd.read_csv(file_path, dtype=str)
    elif ext in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path, dtype=str)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")

    df.columns = [str(c).strip().lower() for c in df.columns]

    samples = []
    for idx, row in df.iterrows():
        sample = _parse_row(row, idx + 2)
        if sample:
            samples.append(sample)

    return samples


def _parse_row(row: pd.Series, row_num: int) -> Optional[SampleRecord]:
    raw_id = _find_column_value(row, SAMPLE_ID_COLUMNS, raw=True)
    if not raw_id or pd.isna(raw_id):
        return None

    raw_id = str(raw_id)
    sample_id = raw_id.strip()
    if not sample_id:
        return None

    box_id = _find_column_value(row, BOX_ID_COLUMNS) or ''
    position = _find_column_value(row, POSITION_COLUMNS) or ''
    status_str = _find_column_value(row, STATUS_COLUMNS)
    batch_id = _find_column_value(row, BATCH_COLUMNS)
    date_str = _find_column_value(row, DATE_COLUMNS)
    sample_type = _find_column_value(row, TYPE_COLUMNS)
    owner = _find_column_value(row, OWNER_COLUMNS)
    notes = _find_column_value(row, NOTES_COLUMNS)

    status = _parse_status(status_str)
    collect_date = _parse_date(date_str)

    return SampleRecord(
        sample_id=sample_id,
        box_id=str(box_id).strip() if box_id else '',
        position=str(position).strip() if position else '',
        status=status,
        batch_id=str(batch_id).strip() if batch_id else None,
        collect_date=collect_date,
        sample_type=str(sample_type).strip() if sample_type else None,
        owner=str(owner).strip() if owner else None,
        notes=str(notes).strip() if notes else None,
        row_num=row_num,
        raw_id=raw_id
    )


def _find_column_value(row: pd.Series, candidates: List[str], raw: bool = False) -> Optional[str]:
    for col in candidates:
        col_lower = col.lower()
        if col_lower in row.index:
            val = row[col_lower]
            if pd.notna(val):
                val_str = str(val)
                if val_str.strip():
                    return val_str if raw else val_str.strip()
    return None


def _parse_status(status_str: Optional[str]) -> SampleStatus:
    if not status_str:
        return SampleStatus.ACTIVE
    status_lower = str(status_str).strip().lower()
    return STATUS_MAP.get(status_lower, SampleStatus.ACTIVE)


def _parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str or pd.isna(date_str):
        return None

    date_str = str(date_str).strip()
    if not date_str:
        return None

    for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%Y.%m.%d', '%Y%m%d',
                '%Y-%m-%d %H:%M:%S', '%Y/%m/%d %H:%M:%S']:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue

    try:
        ts = pd.Timestamp(date_str)
        if pd.notna(ts):
            return ts.date()
    except (ValueError, TypeError):
        pass

    return None


def get_column_analysis(file_path: str) -> Dict:
    ext = os.path.splitext(file_path)[1].lower()
    if ext in ['.csv']:
        df = pd.read_csv(file_path, nrows=5)
    elif ext in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path, nrows=5)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")

    columns = list(df.columns)
    detected = {
        'total_columns': len(columns),
        'columns': columns,
        'sample_id_col': _match_column(columns, SAMPLE_ID_COLUMNS),
        'box_id_col': _match_column(columns, BOX_ID_COLUMNS),
        'position_col': _match_column(columns, POSITION_COLUMNS),
        'status_col': _match_column(columns, STATUS_COLUMNS),
        'batch_col': _match_column(columns, BATCH_COLUMNS),
        'date_col': _match_column(columns, DATE_COLUMNS),
    }
    return detected


def _match_column(columns: List[str], candidates: List[str]) -> Optional[str]:
    col_lower_map = {c.lower(): c for c in columns}
    for candidate in candidates:
        if candidate.lower() in col_lower_map:
            return col_lower_map[candidate.lower()]
    return None
