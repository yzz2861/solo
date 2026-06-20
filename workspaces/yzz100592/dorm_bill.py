#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
宿舍水电费对账CLI - 导入多表数据、自动计算、异常检测、账单导出
"""

import argparse
import csv
import sys
from dataclasses import dataclass, field
from datetime import datetime, date
from typing import List, Dict, Optional, Tuple
from collections import defaultdict


# ==================== 数据模型 ====================

@dataclass
class ReadingRecord:
    """房间抄表记录"""
    room_id: str
    month: int
    year: int
    water_reading: float
    elec_reading: float
    reader: str
    read_date: str
    line_no: int = 0


@dataclass
class ResidentRecord:
    """住宿名单记录"""
    room_id: str
    student_id: str
    student_name: str
    move_in_date: str
    move_out_date: str
    deposit_amount: float
    is_graduate: bool
    line_no: int = 0


@dataclass
class PriceRecord:
    """价格表记录"""
    month: int
    year: int
    water_price: float
    elec_price: float
    line_no: int = 0


@dataclass
class WaiverRecord:
    """减免记录"""
    student_id: str
    month: int
    year: int
    waiver_type: str
    waiver_amount: float
    approved_by: str
    line_no: int = 0


@dataclass
class PrepaidRecord:
    """预存款记录"""
    room_id: str
    month: int
    year: int
    prepaid_amount: float
    payer: str
    line_no: int = 0


@dataclass
class HistoryArrearRecord:
    """历史欠费记录"""
    room_id: str
    month: int
    year: int
    arrears_amount: float
    line_no: int = 0


@dataclass
class RoomBill:
    """房间账单"""
    room_id: str
    month: int
    year: int
    water_usage: float = 0.0
    elec_usage: float = 0.0
    water_cost: float = 0.0
    elec_cost: float = 0.0
    total_cost: float = 0.0
    prepaid_amount: float = 0.0
    waiver_amount: float = 0.0
    payable_amount: float = 0.0
    arrears_amount: float = 0.0
    history_arrears: float = 0.0
    total_arrears: float = 0.0
    residents: List[ResidentRecord] = field(default_factory=list)
    anomalies: List[str] = field(default_factory=list)
    calculation_details: List[str] = field(default_factory=list)
    line_references: Dict[str, int] = field(default_factory=dict)


@dataclass
class RefundResult:
    """退费结果"""
    student_id: str
    student_name: str
    room_id: str
    deposit_amount: float
    last_month_arrears: float
    refund_amount: float
    status: str


# ==================== CSV 加载模块 ====================

class CSVLoader:
    """CSV数据加载器"""

    @staticmethod
    def _parse_bool(value: str) -> bool:
        return value.strip().lower() in ('是', 'true', '1', 'yes', 'y')

    @staticmethod
    def _parse_float(value: str, default: float = 0.0) -> float:
        try:
            return float(value.strip())
        except (ValueError, AttributeError):
            return default

    @staticmethod
    def _parse_int(value: str, default: int = 0) -> int:
        try:
            return int(float(value.strip()))
        except (ValueError, AttributeError):
            return default

    @staticmethod
    def load_readings(filepath: str) -> List[ReadingRecord]:
        records = []
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_no, row in enumerate(reader, start=2):
                rec = ReadingRecord(
                    room_id=row.get('room_id', '').strip(),
                    month=CSVLoader._parse_int(row.get('month', '0')),
                    year=CSVLoader._parse_int(row.get('year', str(datetime.now().year))),
                    water_reading=CSVLoader._parse_float(row.get('water_reading', '0')),
                    elec_reading=CSVLoader._parse_float(row.get('elec_reading', '0')),
                    reader=row.get('reader', '').strip(),
                    read_date=row.get('read_date', '').strip(),
                    line_no=line_no
                )
                records.append(rec)
        return records

    @staticmethod
    def load_residents(filepath: str) -> List[ResidentRecord]:
        records = []
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_no, row in enumerate(reader, start=2):
                rec = ResidentRecord(
                    room_id=row.get('room_id', '').strip(),
                    student_id=row.get('student_id', '').strip(),
                    student_name=row.get('student_name', '').strip(),
                    move_in_date=row.get('move_in_date', '').strip(),
                    move_out_date=row.get('move_out_date', '').strip(),
                    deposit_amount=CSVLoader._parse_float(row.get('deposit_amount', '0')),
                    is_graduate=CSVLoader._parse_bool(row.get('is_graduate', '否')),
                    line_no=line_no
                )
                records.append(rec)
        return records

    @staticmethod
    def load_prices(filepath: str) -> List[PriceRecord]:
        records = []
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_no, row in enumerate(reader, start=2):
                rec = PriceRecord(
                    month=CSVLoader._parse_int(row.get('month', '0')),
                    year=CSVLoader._parse_int(row.get('year', str(datetime.now().year))),
                    water_price=CSVLoader._parse_float(row.get('water_price', '0')),
                    elec_price=CSVLoader._parse_float(row.get('elec_price', '0')),
                    line_no=line_no
                )
                records.append(rec)
        return records

    @staticmethod
    def load_waivers(filepath: str) -> List[WaiverRecord]:
        records = []
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_no, row in enumerate(reader, start=2):
                rec = WaiverRecord(
                    student_id=row.get('student_id', '').strip(),
                    month=CSVLoader._parse_int(row.get('month', '0')),
                    year=CSVLoader._parse_int(row.get('year', str(datetime.now().year))),
                    waiver_type=row.get('waiver_type', '').strip(),
                    waiver_amount=CSVLoader._parse_float(row.get('waiver_amount', '0')),
                    approved_by=row.get('approved_by', '').strip(),
                    line_no=line_no
                )
                records.append(rec)
        return records

    @staticmethod
    def load_prepaid(filepath: str) -> List[PrepaidRecord]:
        records = []
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_no, row in enumerate(reader, start=2):
                rec = PrepaidRecord(
                    room_id=row.get('room_id', '').strip(),
                    month=CSVLoader._parse_int(row.get('month', '0')),
                    year=CSVLoader._parse_int(row.get('year', str(datetime.now().year))),
                    prepaid_amount=CSVLoader._parse_float(row.get('prepaid_amount', '0')),
                    payer=row.get('payer', '').strip(),
                    line_no=line_no
                )
                records.append(rec)
        return records

    @staticmethod
    def load_history_arrears(filepath: str) -> List[HistoryArrearRecord]:
        records = []
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_no, row in enumerate(reader, start=2):
                rec = HistoryArrearRecord(
                    room_id=row.get('room_id', '').strip(),
                    month=CSVLoader._parse_int(row.get('month', '0')),
                    year=CSVLoader._parse_int(row.get('year', str(datetime.now().year))),
                    arrears_amount=CSVLoader._parse_float(row.get('arrears_amount', '0')),
                    line_no=line_no
                )
                records.append(rec)
        return records


# ==================== 异常检测模块 ====================

class AnomalyDetector:
    """异常检测器"""

    @staticmethod
    def detect_reading_inversion(
        current_readings: List[ReadingRecord],
        previous_readings: List[ReadingRecord]
    ) -> List[str]:
        """检测读数倒挂（当前读数 < 上月读数）"""
        anomalies = []
        prev_map = {(r.room_id, r.month, r.year): r for r in previous_readings}

        for curr in current_readings:
            prev_key = (curr.room_id, curr.month - 1 if curr.month > 1 else 12,
                       curr.year if curr.month > 1 else curr.year - 1)
            if prev_key in prev_map:
                prev = prev_map[prev_key]
                if curr.water_reading < prev.water_reading:
                    anomalies.append(
                        f"[读数倒挂] 房间 {curr.room_id} 水表读数倒挂: "
                        f"上月 {prev.water_reading} → 本月 {curr.water_reading} "
                        f"(读数表第{curr.line_no}行)"
                    )
                if curr.elec_reading < prev.elec_reading:
                    anomalies.append(
                        f"[读数倒挂] 房间 {curr.room_id} 电表读数倒挂: "
                        f"上月 {prev.elec_reading} → 本月 {curr.elec_reading} "
                        f"(读数表第{curr.line_no}行)"
                    )
        return anomalies

    @staticmethod
    def detect_room_change(
        current_residents: List[ResidentRecord],
        previous_residents: List[ResidentRecord]
    ) -> List[str]:
        """检测房间换人"""
        anomalies = []
        prev_room_students = defaultdict(set)
        for r in previous_residents:
            prev_room_students[r.room_id].add(r.student_id)

        curr_room_students = defaultdict(set)
        for r in current_residents:
            curr_room_students[r.room_id].add(r.student_id)

        all_rooms = set(prev_room_students.keys()) | set(curr_room_students.keys())
        for room_id in all_rooms:
            prev_students = prev_room_students.get(room_id, set())
            curr_students = curr_room_students.get(room_id, set())
            moved_out = prev_students - curr_students
            moved_in = curr_students - prev_students
            if moved_out or moved_in:
                msg_parts = [f"[房间换人] 房间 {room_id}:"]
                if moved_out:
                    msg_parts.append(f"搬出 {len(moved_out)} 人: {', '.join(moved_out)}")
                if moved_in:
                    msg_parts.append(f"搬入 {len(moved_in)} 人: {', '.join(moved_in)}")
                anomalies.append(" | ".join(msg_parts))
        return anomalies

    @staticmethod
    def detect_cross_month_checkout(
        residents: List[ResidentRecord],
        target_month: int,
        target_year: int
    ) -> List[str]:
        """检测退宿跨月（退宿日期不在当月1号到当月最后一天之间）"""
        anomalies = []
        for res in residents:
            if not res.move_out_date:
                continue
            try:
                move_out = datetime.strptime(res.move_out_date, '%Y-%m-%d').date()
                month_start = date(target_year, target_month, 1)
                if target_month == 12:
                    next_month = date(target_year + 1, 1, 1)
                else:
                    next_month = date(target_year, target_month + 1, 1)
                month_end = date.fromordinal(next_month.toordinal() - 1)

                if move_out < month_start or move_out > month_end:
                    anomalies.append(
                        f"[退宿跨月] {res.student_name}({res.student_id}) "
                        f"退宿日期 {res.move_out_date} 不在 {target_year}年{target_month}月 范围内 "
                        f"(住宿表第{res.line_no}行)"
                    )
            except ValueError:
                anomalies.append(
                    f"[日期格式错误] {res.student_name}({res.student_id}) "
                    f"退宿日期格式错误: {res.move_out_date} "
                    f"(住宿表第{res.line_no}行)"
                )
        return anomalies

    @staticmethod
    def detect_duplicate_waivers(waivers: List[WaiverRecord]) -> List[str]:
        """检测重复减免（同一学生同月多次减免）"""
        anomalies = []
        waiver_map = defaultdict(list)
        for w in waivers:
            key = (w.student_id, w.month, w.year)
            waiver_map[key].append(w)

        for key, records in waiver_map.items():
            if len(records) > 1:
                student_id, month, year = key
                line_nos = [str(r.line_no) for r in records]
                total_amount = sum(r.waiver_amount for r in records)
                anomalies.append(
                    f"[减免重复] 学生 {student_id} 在 {year}年{month}月 有 {len(records)} 条减免记录 "
                    f"(减免表第{', '.join(line_nos)}行), 累计金额: {total_amount:.2f}元"
                )
        return anomalies


# ==================== 核心计算引擎 ====================

class BillingEngine:
    """账单计算引擎"""

    def __init__(
        self,
        readings: List[ReadingRecord],
        residents: List[ResidentRecord],
        prices: List[PriceRecord],
        waivers: List[WaiverRecord],
        prepaid: List[PrepaidRecord],
        history_arrears: List[HistoryArrearRecord],
        previous_readings: Optional[List[ReadingRecord]] = None,
        target_month: Optional[int] = None,
        target_year: Optional[int] = None
    ):
        self.readings = readings
        self.residents = residents
        self.prices = prices
        self.waivers = waivers
        self.prepaid = prepaid
        self.history_arrears = history_arrears
        self.previous_readings = previous_readings or []
        self.target_month = target_month
        self.target_year = target_year
        self.bills: Dict[str, RoomBill] = {}
        self.global_anomalies: List[str] = []

    def _get_price(self, month: int, year: int) -> Tuple[float, float]:
        """获取指定月份的价格"""
        for p in self.prices:
            if p.month == month and p.year == year:
                return p.water_price, p.elec_price
        return 0.0, 0.0

    def _get_previous_reading(self, room_id: str, curr_month: int, curr_year: int) -> Optional[ReadingRecord]:
        """获取上月读数"""
        if curr_month == 1:
            prev_month, prev_year = 12, curr_year - 1
        else:
            prev_month, prev_year = curr_month - 1, curr_year

        for r in self.previous_readings:
            if r.room_id == room_id and r.month == prev_month and r.year == prev_year:
                return r

        for r in self.readings:
            if r.room_id == room_id and r.month == prev_month and r.year == prev_year:
                return r
        return None

    def _get_room_residents(self, room_id: str, month: int, year: int) -> List[ResidentRecord]:
        """获取指定房间当月在住的学生"""
        room_residents = []
        for r in self.residents:
            if r.room_id != room_id:
                continue
            try:
                move_in = datetime.strptime(r.move_in_date, '%Y-%m-%d').date() if r.move_in_date else None
                move_out = datetime.strptime(r.move_out_date, '%Y-%m-%d').date() if r.move_out_date else None
            except ValueError:
                continue

            month_start = date(year, month, 1)
            if month == 12:
                next_month = date(year + 1, 1, 1)
            else:
                next_month = date(year, month + 1, 1)
            month_end = date.fromordinal(next_month.toordinal() - 1)

            if move_in and move_in > month_end:
                continue
            if move_out and move_out < month_start:
                continue
            room_residents.append(r)
        return room_residents

    def _get_room_prepaid(self, room_id: str, month: int, year: int) -> float:
        """获取房间当月预存款"""
        total = 0.0
        for p in self.prepaid:
            if p.room_id == room_id and p.month == month and p.year == year:
                total += p.prepaid_amount
        return total

    def _get_student_waivers(self, student_id: str, month: int, year: int) -> float:
        """获取学生当月减免总额"""
        total = 0.0
        for w in self.waivers:
            if w.student_id == student_id and w.month == month and w.year == year:
                total += w.waiver_amount
        return total

    def _get_room_history_arrears(self, room_id: str, month: int, year: int) -> float:
        """获取房间历史欠费（截止到上月）"""
        total = 0.0
        for h in self.history_arrears:
            if h.room_id != room_id:
                continue
            if h.year < year:
                total += h.arrears_amount
            elif h.year == year and h.month < month:
                total += h.arrears_amount
        return total

    def calculate(self) -> Tuple[Dict[str, RoomBill], List[str]]:
        """计算所有账单"""
        all_anomalies = []

        detector = AnomalyDetector()

        if self.previous_readings:
            all_anomalies.extend(
                detector.detect_reading_inversion(self.readings, self.previous_readings)
            )

        if self.target_month and self.target_year:
            all_anomalies.extend(
                detector.detect_cross_month_checkout(
                    self.residents, self.target_month, self.target_year
                )
            )

        all_anomalies.extend(detector.detect_duplicate_waivers(self.waivers))

        reading_by_month_room = defaultdict(list)
        for r in self.readings:
            reading_by_month_room[(r.year, r.month)].append(r)

        for (year, month), month_readings in reading_by_month_room.items():
            water_price, elec_price = self._get_price(month, year)

            for reading in month_readings:
                room_id = reading.room_id
                bill_key = f"{room_id}_{year}_{month}"

                prev_reading = self._get_previous_reading(room_id, month, year)

                water_usage = reading.water_reading - (prev_reading.water_reading if prev_reading else 0)
                elec_usage = reading.elec_reading - (prev_reading.elec_reading if prev_reading else 0)

                if prev_reading is None:
                    water_usage = max(0.0, water_usage)
                    elec_usage = max(0.0, elec_usage)

                water_cost = round(water_usage * water_price, 2)
                elec_cost = round(elec_usage * elec_price, 2)
                total_cost = round(water_cost + elec_cost, 2)

                room_residents = self._get_room_residents(room_id, month, year)

                total_waivers = 0.0
                for res in room_residents:
                    total_waivers += self._get_student_waivers(res.student_id, month, year)
                total_waivers = round(total_waivers, 2)

                prepaid_amount = self._get_room_prepaid(room_id, month, year)
                history_arrears = self._get_room_history_arrears(room_id, month, year)

                payable_amount = round(max(0.0, total_cost - total_waivers), 2)
                after_prepaid = round(payable_amount - prepaid_amount, 2)
                arrears_amount = round(max(0.0, after_prepaid), 2)
                total_arrears = round(history_arrears + arrears_amount, 2)

                bill = RoomBill(
                    room_id=room_id,
                    month=month,
                    year=year,
                    water_usage=water_usage,
                    elec_usage=elec_usage,
                    water_cost=water_cost,
                    elec_cost=elec_cost,
                    total_cost=total_cost,
                    prepaid_amount=prepaid_amount,
                    waiver_amount=total_waivers,
                    payable_amount=payable_amount,
                    arrears_amount=arrears_amount,
                    history_arrears=history_arrears,
                    total_arrears=total_arrears,
                    residents=room_residents,
                    line_references={'reading': reading.line_no}
                )

                details = [
                    f"房间: {room_id}",
                    f"周期: {year}年{month}月",
                    f"水表读数: 上月 {prev_reading.water_reading if prev_reading else '无'} → 本月 {reading.water_reading} = 用量 {water_usage:.2f}",
                    f"水费计算: {water_usage:.2f} × {water_price}元 = {water_cost:.2f}元",
                    f"电表读数: 上月 {prev_reading.elec_reading if prev_reading else '无'} → 本月 {reading.elec_reading} = 用量 {elec_usage:.2f}",
                    f"电费计算: {elec_usage:.2f} × {elec_price}元 = {elec_cost:.2f}元",
                    f"费用合计: {water_cost:.2f} + {elec_cost:.2f} = {total_cost:.2f}元",
                    f"减免合计: {total_waivers:.2f}元",
                    f"应缴金额: {total_cost:.2f} - {total_waivers:.2f} = {payable_amount:.2f}元",
                    f"预存抵扣: {prepaid_amount:.2f}元",
                    f"本月欠费: {payable_amount:.2f} - {prepaid_amount:.2f} = {arrears_amount:.2f}元",
                    f"历史欠费: {history_arrears:.2f}元",
                    f"累计欠费: {total_arrears:.2f}元",
                    f"在住学生: {', '.join([r.student_name for r in room_residents]) if room_residents else '无'}"
                ]
                bill.calculation_details = details

                bill_anomalies = []
                if prev_reading:
                    if reading.water_reading < prev_reading.water_reading:
                        bill_anomalies.append(
                            f"[读数倒挂] 水表: {prev_reading.water_reading} → {reading.water_reading} "
                            f"(读数表第{reading.line_no}行)"
                        )
                    if reading.elec_reading < prev_reading.elec_reading:
                        bill_anomalies.append(
                            f"[读数倒挂] 电表: {prev_reading.elec_reading} → {reading.elec_reading} "
                            f"(读数表第{reading.line_no}行)"
                        )
                bill.anomalies = bill_anomalies

                self.bills[bill_key] = bill

        self.global_anomalies = all_anomalies
        return self.bills, all_anomalies


# ==================== 账单导出模块 ====================

class BillExporter:
    """账单导出器"""

    @staticmethod
    def export_student_bills(bills: Dict[str, RoomBill], output_file: str):
        """导出学生版简洁账单"""
        headers = [
            '房间号', '年份', '月份', '学生姓名', '学号',
            '水费(元)', '电费(元)', '合计(元)', '减免(元)',
            '预存抵扣(元)', '本月应缴(元)', '累计欠费(元)'
        ]

        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)

            for bill_key, bill in sorted(bills.items()):
                if not bill.residents:
                    writer.writerow([
                        bill.room_id, bill.year, bill.month, '', '',
                        f"{bill.water_cost:.2f}", f"{bill.elec_cost:.2f}",
                        f"{bill.total_cost:.2f}", f"{bill.waiver_amount:.2f}",
                        f"{bill.prepaid_amount:.2f}", f"{bill.arrears_amount:.2f}",
                        f"{bill.total_arrears:.2f}"
                    ])
                else:
                    for res in bill.residents:
                        writer.writerow([
                            bill.room_id, bill.year, bill.month,
                            res.student_name, res.student_id,
                            f"{bill.water_cost:.2f}", f"{bill.elec_cost:.2f}",
                            f"{bill.total_cost:.2f}", f"{bill.waiver_amount:.2f}",
                            f"{bill.prepaid_amount:.2f}", f"{bill.arrears_amount:.2f}",
                            f"{bill.total_arrears:.2f}"
                        ])

        print(f"✓ 学生版账单已导出: {output_file}")

    @staticmethod
    def export_admin_bills(
        bills: Dict[str, RoomBill],
        anomalies: List[str],
        output_file: str
    ):
        """导出宿管版明细账单（含计算明细和异常行号）"""
        headers = [
            '房间号', '年份', '月份',
            '水表用量', '水费(元)', '电表用量', '电费(元)',
            '费用合计(元)', '减免(元)', '应缴(元)',
            '预存(元)', '本月欠费(元)', '历史欠费(元)', '累计欠费(元)',
            '在住学生', '异常信息', '相关行号', '计算明细'
        ]

        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)

            for bill_key, bill in sorted(bills.items()):
                line_refs = []
                if 'reading' in bill.line_references:
                    line_refs.append(f"读数表:{bill.line_references['reading']}")

                anomalies_str = " | ".join(bill.anomalies) if bill.anomalies else ""
                residents_str = ", ".join([r.student_name for r in bill.residents]) if bill.residents else ""
                details_str = " | ".join(bill.calculation_details)

                writer.writerow([
                    bill.room_id, bill.year, bill.month,
                    f"{bill.water_usage:.2f}", f"{bill.water_cost:.2f}",
                    f"{bill.elec_usage:.2f}", f"{bill.elec_cost:.2f}",
                    f"{bill.total_cost:.2f}", f"{bill.waiver_amount:.2f}",
                    f"{bill.payable_amount:.2f}", f"{bill.prepaid_amount:.2f}",
                    f"{bill.arrears_amount:.2f}", f"{bill.history_arrears:.2f}",
                    f"{bill.total_arrears:.2f}",
                    residents_str, anomalies_str,
                    ", ".join(line_refs), details_str
                ])

            writer.writerow([])
            writer.writerow(['=== 全局异常汇总 ==='])
            for anomaly in anomalies:
                writer.writerow([anomaly])

        print(f"✓ 宿管版明细账单已导出: {output_file}")

    @staticmethod
    def print_bill_details(bill: RoomBill):
        """打印单个房间的详细账单（供学生查询）"""
        print("\n" + "=" * 60)
        print(f"  房间 {bill.room_id} - {bill.year}年{bill.month}月 账单明细")
        print("=" * 60)
        for detail in bill.calculation_details:
            print(f"  {detail}")
        if bill.anomalies:
            print("\n  ⚠️  异常提示:")
            for anomaly in bill.anomalies:
                print(f"    {anomaly}")
        if bill.total_arrears > 0:
            print(f"\n  💰 累计欠费: {bill.total_arrears:.2f} 元")
        print("=" * 60 + "\n")


# ==================== 退费与押金模块 ====================

class RefundManager:
    """退费与押金管理器"""

    def __init__(
        self,
        residents: List[ResidentRecord],
        bills: Dict[str, RoomBill],
        history_arrears: List[HistoryArrearRecord]
    ):
        self.residents = residents
        self.bills = bills
        self.history_arrears = history_arrears

    def _get_student_room(self, student_id: str) -> Optional[ResidentRecord]:
        """获取学生住宿记录"""
        for r in self.residents:
            if r.student_id == student_id:
                return r
        return None

    def _get_last_month_bill(self, room_id: str, move_out_date: str) -> Optional[RoomBill]:
        """获取退宿当月账单"""
        try:
            move_out = datetime.strptime(move_out_date, '%Y-%m-%d').date()
            bill_key = f"{room_id}_{move_out.year}_{move_out.month}"
            return self.bills.get(bill_key)
        except (ValueError, KeyError):
            return None

    def _get_student_total_arrears(self, student_id: str) -> float:
        """获取学生累计欠费"""
        resident = self._get_student_room(student_id)
        if not resident:
            return 0.0

        total = 0.0
        for bill_key, bill in self.bills.items():
            if bill.room_id == resident.room_id and bill.residents:
                if any(r.student_id == student_id for r in bill.residents):
                    total += bill.arrears_amount

        for h in self.history_arrears:
            if h.room_id == resident.room_id:
                total += h.arrears_amount

        return total

    def calculate_refund(self, student_id: str) -> RefundResult:
        """计算毕业生退费（扣除最后一个月未结清部分）"""
        resident = self._get_student_room(student_id)

        if not resident:
            return RefundResult(
                student_id=student_id,
                student_name="未知",
                room_id="未知",
                deposit_amount=0.0,
                last_month_arrears=0.0,
                refund_amount=0.0,
                status="未找到该学生住宿记录"
            )

        if not resident.is_graduate:
            return RefundResult(
                student_id=student_id,
                student_name=resident.student_name,
                room_id=resident.room_id,
                deposit_amount=resident.deposit_amount,
                last_month_arrears=0.0,
                refund_amount=0.0,
                status="该学生非毕业生，暂不退费"
            )

        total_arrears = self._get_student_total_arrears(student_id)
        last_bill = self._get_last_month_bill(resident.room_id, resident.move_out_date)
        last_month_arrears = last_bill.arrears_amount if last_bill else 0.0

        refund_amount = max(0.0, resident.deposit_amount - total_arrears)
        status = "正常"

        if total_arrears > resident.deposit_amount:
            status = f"押金不足以抵扣欠费，仍需补缴 {total_arrears - resident.deposit_amount:.2f} 元"
        elif total_arrears > 0:
            status = f"已扣除欠费 {total_arrears:.2f} 元"

        return RefundResult(
            student_id=student_id,
            student_name=resident.student_name,
            room_id=resident.room_id,
            deposit_amount=resident.deposit_amount,
            last_month_arrears=last_month_arrears,
            refund_amount=refund_amount,
            status=status
        )

    def check_deposit(self, student_id: str) -> str:
        """核对退宿押金"""
        resident = self._get_student_room(student_id)
        if not resident:
            return f"⚠️  未找到学生 {student_id} 的住宿记录"

        total_arrears = self._get_student_total_arrears(student_id)
        result = []
        result.append(f"{'='*50}")
        result.append(f"  押金核对 - {resident.student_name}({resident.student_id})")
        result.append(f"{'='*50}")
        result.append(f"  房间号: {resident.room_id}")
        result.append(f"  入住日期: {resident.move_in_date}")
        result.append(f"  退宿日期: {resident.move_out_date or '未退宿'}")
        result.append(f"  是否毕业生: {'是' if resident.is_graduate else '否'}")
        result.append(f"  押金金额: {resident.deposit_amount:.2f} 元")
        result.append(f"  累计欠费: {total_arrears:.2f} 元")
        result.append(f"  可退金额: {max(0.0, resident.deposit_amount - total_arrears):.2f} 元")
        result.append(f"{'='*50}")

        return "\n".join(result)


# ==================== 历史欠费查询 ====================

class ArrearsQuery:
    """历史欠费查询"""

    def __init__(
        self,
        bills: Dict[str, RoomBill],
        history_arrears: List[HistoryArrearRecord],
        residents: List[ResidentRecord]
    ):
        self.bills = bills
        self.history_arrears = history_arrears
        self.residents = residents

    def query_room_arrears(self, room_id: str) -> str:
        """查询房间历史欠费"""
        result = []
        result.append(f"\n{'='*60}")
        result.append(f"  房间 {room_id} 欠费明细")
        result.append(f"{'='*60}")

        room_history = [h for h in self.history_arrears if h.room_id == room_id]
        if room_history:
            result.append(f"\n  📋 历史欠费记录:")
            total_history = 0.0
            for h in sorted(room_history, key=lambda x: (x.year, x.month)):
                result.append(f"    {h.year}年{h.month:02d}月: {h.arrears_amount:.2f} 元")
                total_history += h.arrears_amount
            result.append(f"    {'-'*30}")
            result.append(f"    历史欠费合计: {total_history:.2f} 元")

        room_bills = [b for b in self.bills.values() if b.room_id == room_id]
        if room_bills:
            result.append(f"\n  📊 本期账单欠费:")
            total_current = 0.0
            for b in sorted(room_bills, key=lambda x: (x.year, x.month)):
                result.append(f"    {b.year}年{b.month:02d}月: {b.arrears_amount:.2f} 元 (累计: {b.total_arrears:.2f} 元)")
                total_current += b.arrears_amount
            result.append(f"    {'-'*30}")
            result.append(f"    本期欠费合计: {total_current:.2f} 元")

        room_residents = [r for r in self.residents if r.room_id == room_id and not r.move_out_date]
        if room_residents:
            result.append(f"\n  👥 当前在住:")
            for r in room_residents:
                result.append(f"    {r.student_name}({r.student_id})")

        result.append(f"\n{'='*60}")
        return "\n".join(result)

    def query_student_arrears(self, student_id: str) -> str:
        """查询学生欠费"""
        student = next((r for r in self.residents if r.student_id == student_id), None)
        if not student:
            return f"\n⚠️  未找到学生 {student_id} 的记录\n"

        room_bills = [b for b in self.bills.values()
                     if b.room_id == student.room_id and
                     any(r.student_id == student_id for r in b.residents)]

        result = []
        result.append(f"\n{'='*60}")
        result.append(f"  {student.student_name}({student_id}) 欠费明细")
        result.append(f"{'='*60}")
        result.append(f"  房间号: {student.room_id}")
        result.append(f"  入住日期: {student.move_in_date}")
        result.append(f"  退宿日期: {student.move_out_date or '未退宿'}")

        total = 0.0
        if room_bills:
            result.append(f"\n  📊 欠费记录:")
            for b in sorted(room_bills, key=lambda x: (x.year, x.month)):
                if b.arrears_amount > 0:
                    result.append(f"    {b.year}年{b.month:02d}月: {b.arrears_amount:.2f} 元")
                    total += b.arrears_amount

        room_history = [h for h in self.history_arrears if h.room_id == student.room_id]
        history_total = sum(h.arrears_amount for h in room_history)
        if history_total > 0:
            result.append(f"    历史欠费: {history_total:.2f} 元")
            total += history_total

        result.append(f"\n  💰 累计欠费: {total:.2f} 元")
        result.append(f"{'='*60}\n")
        return "\n".join(result)


# ==================== CLI 入口 ====================

class DormBillingCLI:
    """宿舍水电费对账CLI主类"""

    def __init__(self):
        self.parser = self._build_parser()

    def _build_parser(self) -> argparse.ArgumentParser:
        parser = argparse.ArgumentParser(
            prog='dorm_bill',
            description='🏠 宿舍水电费对账CLI - 导入数据、自动计算、异常检测、账单导出',
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
示例:
  # 1. 计算本月账单
  dorm_bill calculate --readings readings.csv --residents residents.csv \\
    --prices prices.csv --waivers waivers.csv --prepaid prepaid.csv \\
    --history history.csv --month 6 --year 2026

  # 2. 导出账单
  dorm_bill export --bills bills.pkl --student student_bills.csv --admin admin_bills.csv

  # 3. 查询房间明细
  dorm_bill query --bills bills.pkl --room A101

  # 4. 查询学生欠费
  dorm_bill query --bills bills.pkl --student 2022001

  # 5. 计算毕业生退费
  dorm_bill refund --bills bills.pkl --residents residents.csv --student 2022001

  # 6. 核对押金
  dorm_bill deposit --bills bills.pkl --residents residents.csv --student 2022001

  # 7. 一键完成所有操作
  dorm_bill run --readings readings.csv --residents residents.csv \\
    --prices prices.csv --waivers waivers.csv --prepaid prepaid.csv \\
    --history history.csv --month 6 --year 2026 \\
    --student-out student.csv --admin-out admin.csv
            """
        )

        subparsers = parser.add_subparsers(dest='command', help='可用命令')

        calc_parser = subparsers.add_parser('calculate', help='计算账单')
        self._add_calc_args(calc_parser)

        export_parser = subparsers.add_parser('export', help='导出账单')
        self._add_export_args(export_parser)

        query_parser = subparsers.add_parser('query', help='查询账单')
        self._add_query_args(query_parser)

        refund_parser = subparsers.add_parser('refund', help='计算退费')
        self._add_refund_args(refund_parser)

        deposit_parser = subparsers.add_parser('deposit', help='核对押金')
        self._add_deposit_args(deposit_parser)

        run_parser = subparsers.add_parser('run', help='一键完成所有操作')
        self._add_run_args(run_parser)

        gen_parser = subparsers.add_parser('gen-samples', help='生成示例CSV文件')

        return parser

    def _add_calc_args(self, parser):
        parser.add_argument('--readings', required=True, help='抄表读数CSV')
        parser.add_argument('--residents', required=True, help='住宿名单CSV')
        parser.add_argument('--prices', required=True, help='价格表CSV')
        parser.add_argument('--waivers', required=True, help='减免表CSV')
        parser.add_argument('--prepaid', required=True, help='预存款CSV')
        parser.add_argument('--history', required=True, help='历史欠费CSV')
        parser.add_argument('--prev-readings', help='上月抄表读数CSV（用于读数倒挂检测）')
        parser.add_argument('--month', type=int, required=True, help='对账月份')
        parser.add_argument('--year', type=int, required=True, help='对账年份')
        parser.add_argument('--save-bills', default='bills.pkl', help='保存账单到文件')

    def _add_export_args(self, parser):
        parser.add_argument('--bills', required=True, help='账单数据文件')
        parser.add_argument('--student', help='学生版账单输出路径')
        parser.add_argument('--admin', help='宿管版账单输出路径')

    def _add_query_args(self, parser):
        parser.add_argument('--bills', required=True, help='账单数据文件')
        parser.add_argument('--residents', help='住宿名单CSV（查询学生欠费时需要）')
        parser.add_argument('--history', help='历史欠费CSV')
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument('--room', help='房间号')
        group.add_argument('--student', help='学号')
        group.add_argument('--list-rooms', action='store_true', help='列出所有房间欠费')
        group.add_argument('--list-students', action='store_true', help='列出所有学生欠费')

    def _add_refund_args(self, parser):
        parser.add_argument('--bills', required=True, help='账单数据文件')
        parser.add_argument('--residents', required=True, help='住宿名单CSV')
        parser.add_argument('--history', help='历史欠费CSV')
        parser.add_argument('--student', required=True, help='学号')

    def _add_deposit_args(self, parser):
        parser.add_argument('--bills', required=True, help='账单数据文件')
        parser.add_argument('--residents', required=True, help='住宿名单CSV')
        parser.add_argument('--history', help='历史欠费CSV')
        parser.add_argument('--student', required=True, help='学号')

    def _add_run_args(self, parser):
        self._add_calc_args(parser)
        parser.add_argument('--student-out', required=True, help='学生版账单输出')
        parser.add_argument('--admin-out', required=True, help='宿管版账单输出')

    def _save_bills(self, bills: Dict[str, RoomBill], anomalies: List[str], filepath: str):
        import pickle
        with open(filepath, 'wb') as f:
            pickle.dump({'bills': bills, 'anomalies': anomalies}, f)
        print(f"✓ 账单数据已保存: {filepath}")

    def _load_bills(self, filepath: str) -> Tuple[Dict[str, RoomBill], List[str]]:
        import pickle
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        return data['bills'], data['anomalies']

    def run_calculate(self, args):
        print("📊 正在计算账单...")
        print(f"   对账周期: {args.year}年{args.month}月")

        loader = CSVLoader()
        readings = loader.load_readings(args.readings)
        residents = loader.load_residents(args.residents)
        prices = loader.load_prices(args.prices)
        waivers = loader.load_waivers(args.waivers)
        prepaid = loader.load_prepaid(args.prepaid)
        history = loader.load_history_arrears(args.history)

        prev_readings = loader.load_readings(args.prev_readings) if args.prev_readings else []

        print(f"   读数记录: {len(readings)} 条")
        print(f"   住宿记录: {len(residents)} 条")
        print(f"   价格记录: {len(prices)} 条")
        print(f"   减免记录: {len(waivers)} 条")
        print(f"   预存记录: {len(prepaid)} 条")
        print(f"   历史欠费: {len(history)} 条")

        engine = BillingEngine(
            readings=readings,
            residents=residents,
            prices=prices,
            waivers=waivers,
            prepaid=prepaid,
            history_arrears=history,
            previous_readings=prev_readings,
            target_month=args.month,
            target_year=args.year
        )

        bills, anomalies = engine.calculate()

        print(f"\n✓ 已生成 {len(bills)} 个房间的账单")

        if anomalies:
            print(f"\n⚠️  发现 {len(anomalies)} 个异常:")
            for i, anomaly in enumerate(anomalies, 1):
                print(f"   {i}. {anomaly}")
        else:
            print("\n✓ 未发现异常")

        self._save_bills(bills, anomalies, args.save_bills)
        return bills, anomalies

    def run_export(self, args):
        bills, anomalies = self._load_bills(args.bills)

        if args.student:
            BillExporter.export_student_bills(bills, args.student)

        if args.admin:
            BillExporter.export_admin_bills(bills, anomalies, args.admin)

        if not args.student and not args.admin:
            print("⚠️  请指定 --student 或 --admin 输出路径")

    def run_query(self, args):
        bills, _ = self._load_bills(args.bills)
        residents = []
        history = []

        if args.residents:
            residents = CSVLoader.load_residents(args.residents)
        if args.history:
            history = CSVLoader.load_history_arrears(args.history)

        querier = ArrearsQuery(bills, history, residents)

        if args.room:
            print(querier.query_room_arrears(args.room))
        elif args.student:
            if not residents:
                print("⚠️  查询学生欠费需要指定 --residents 参数")
                return
            print(querier.query_student_arrears(args.student))
        elif args.list_rooms:
            print("\n📋 所有房间欠费汇总:")
            print("-" * 50)
            for room_id in sorted(set(b.room_id for b in bills.values())):
                room_bills = [b for b in bills.values() if b.room_id == room_id]
                total = sum(b.total_arrears for b in room_bills) / len(room_bills) if room_bills else 0
                print(f"  {room_id}: {total:.2f} 元")
            print()
        elif args.list_students:
            if not residents:
                print("⚠️  列出学生欠费需要指定 --residents 参数")
                return
            print("\n📋 所有学生欠费汇总:")
            print("-" * 50)
            for student in sorted(residents, key=lambda x: x.student_id):
                arrears = sum(
                    b.arrears_amount for b in bills.values()
                    if b.room_id == student.room_id and
                    any(r.student_id == student.student_id for r in b.residents)
                )
                print(f"  {student.student_name}({student.student_id}): {arrears:.2f} 元")
            print()

    def run_refund(self, args):
        bills, _ = self._load_bills(args.bills)
        residents = CSVLoader.load_residents(args.residents)
        history = CSVLoader.load_history_arrears(args.history) if args.history else []

        refund_manager = RefundManager(residents, bills, history)
        result = refund_manager.calculate_refund(args.student)

        print("\n" + "=" * 50)
        print("  🎓 毕业生退费计算")
        print("=" * 50)
        print(f"  学号: {result.student_id}")
        print(f"  姓名: {result.student_name}")
        print(f"  房间: {result.room_id}")
        print(f"  押金金额: {result.deposit_amount:.2f} 元")
        print(f"  最后一个月欠费: {result.last_month_arrears:.2f} 元")
        print(f"  可退金额: {result.refund_amount:.2f} 元")
        print(f"  状态: {result.status}")
        print("=" * 50 + "\n")

    def run_deposit(self, args):
        bills, _ = self._load_bills(args.bills)
        residents = CSVLoader.load_residents(args.residents)
        history = CSVLoader.load_history_arrears(args.history) if args.history else []

        refund_manager = RefundManager(residents, bills, history)
        print(refund_manager.check_deposit(args.student))

    def run_all(self, args):
        bills, anomalies = self.run_calculate(args)

        print("\n📤 正在导出账单...")
        BillExporter.export_student_bills(bills, args.student_out)
        BillExporter.export_admin_bills(bills, anomalies, args.admin_out)

        total_arrears = sum(b.total_arrears for b in bills.values())
        print(f"\n💰 本月累计欠费: {total_arrears:.2f} 元")
        print(f"✓ 全部操作完成!\n")

    def run_gen_samples(self):
        """生成示例CSV文件"""
        import os

        samples = {
            'readings.csv': [
                ['room_id', 'month', 'year', 'water_reading', 'elec_reading', 'reader', 'read_date'],
                ['A101', '6', '2026', '125.5', '320.8', '李老师', '2026-06-30'],
                ['A102', '6', '2026', '98.3', '256.4', '李老师', '2026-06-30'],
                ['A103', '6', '2026', '156.7', '412.3', '李老师', '2026-06-30'],
                ['B201', '6', '2026', '89.2', '198.5', '王老师', '2026-06-30'],
                ['B202', '6', '2026', '145.8', '367.2', '王老师', '2026-06-30'],
            ],
            'residents.csv': [
                ['room_id', 'student_id', 'student_name', 'move_in_date', 'move_out_date', 'deposit_amount', 'is_graduate'],
                ['A101', '2022001', '张三', '2022-09-01', '2026-06-30', '200.0', '是'],
                ['A101', '2022002', '李四', '2022-09-01', '2026-06-30', '200.0', '是'],
                ['A102', '2023001', '王五', '2023-09-01', '', '200.0', '否'],
                ['A102', '2023002', '赵六', '2023-09-01', '', '200.0', '否'],
                ['A103', '2024001', '孙七', '2024-09-01', '', '200.0', '否'],
                ['A103', '2024002', '周八', '2024-09-01', '', '200.0', '否'],
                ['B201', '2022003', '吴九', '2022-09-01', '2026-06-30', '200.0', '是'],
                ['B202', '2023003', '郑十', '2023-09-01', '', '200.0', '否'],
            ],
            'prices.csv': [
                ['month', 'year', 'water_price', 'elec_price'],
                ['6', '2026', '5.0', '0.8'],
            ],
            'waivers.csv': [
                ['student_id', 'month', 'year', 'waiver_type', 'waiver_amount', 'approved_by'],
                ['2024001', '6', '2026', '困难减免', '30.0', '学生处'],
            ],
            'prepaid.csv': [
                ['room_id', 'month', 'year', 'prepaid_amount', 'payer'],
                ['A101', '6', '2026', '100.0', '张三'],
                ['A102', '6', '2026', '50.0', '王五'],
                ['A103', '6', '2026', '80.0', '孙七'],
                ['B201', '6', '2026', '60.0', '吴九'],
                ['B202', '6', '2026', '70.0', '郑十'],
            ],
            'history.csv': [
                ['room_id', 'month', 'year', 'arrears_amount'],
                ['A101', '5', '2026', '25.5'],
                ['A103', '4', '2026', '18.3'],
                ['B201', '5', '2026', '12.8'],
            ],
            'prev_readings.csv': [
                ['room_id', 'month', 'year', 'water_reading', 'elec_reading', 'reader', 'read_date'],
                ['A101', '5', '2026', '110.2', '285.6', '李老师', '2026-05-31'],
                ['A102', '5', '2026', '85.6', '225.3', '李老师', '2026-05-31'],
                ['A103', '5', '2026', '142.3', '385.7', '李老师', '2026-05-31'],
                ['B201', '5', '2026', '76.8', '172.4', '王老师', '2026-05-31'],
                ['B202', '5', '2026', '132.5', '338.6', '王老师', '2026-05-31'],
            ],
        }

        for filename, content in samples.items():
            filepath = os.path.join(os.getcwd(), filename)
            with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.writer(f)
                writer.writerows(content)
            print(f"✓ 已生成: {filename}")

        print(f"\n📁 所有示例文件已生成到: {os.getcwd()}")
        print("💡 现在可以运行: dorm_bill run --readings readings.csv --residents residents.csv --prices prices.csv --waivers waivers.csv --prepaid prepaid.csv --history history.csv --prev-readings prev_readings.csv --month 6 --year 2026 --student-out student.csv --admin-out admin.csv\n")

    def run(self, argv=None):
        args = self.parser.parse_args(argv)

        if not args.command:
            self.parser.print_help()
            return

        try:
            if args.command == 'calculate':
                self.run_calculate(args)
            elif args.command == 'export':
                self.run_export(args)
            elif args.command == 'query':
                self.run_query(args)
            elif args.command == 'refund':
                self.run_refund(args)
            elif args.command == 'deposit':
                self.run_deposit(args)
            elif args.command == 'run':
                self.run_all(args)
            elif args.command == 'gen-samples':
                self.run_gen_samples()
        except FileNotFoundError as e:
            print(f"\n❌ 文件未找到: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"\n❌ 运行出错: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


def main():
    cli = DormBillingCLI()
    cli.run()


if __name__ == '__main__':
    main()
