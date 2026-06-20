"""
学生请假条汇总器
================

用于整合短信、请假条和缺勤记录，合并去重并生成异常报告和统计报表。
"""

__version__ = "1.0.0"
__author__ = "班主任助手"

from .models import (
    LeaveType,
    SourceType,
    AnomalyType,
    LeaveRecord,
    Anomaly,
    ClassSummary,
    SickAlert,
)
from .readers import (
    SMSReader,
    LeaveSheetReader,
    AbsenceReader,
    read_all_sources,
)
from .merger import (
    RecordMerger,
    LeaveClassifier,
    AnomalyDetector,
)
from .statistics import StatisticsAnalyzer
from .exporter import ExcelExporter

__all__ = [
    "LeaveType",
    "SourceType",
    "AnomalyType",
    "LeaveRecord",
    "Anomaly",
    "ClassSummary",
    "SickAlert",
    "SMSReader",
    "LeaveSheetReader",
    "AbsenceReader",
    "read_all_sources",
    "RecordMerger",
    "LeaveClassifier",
    "AnomalyDetector",
    "StatisticsAnalyzer",
    "ExcelExporter",
]
