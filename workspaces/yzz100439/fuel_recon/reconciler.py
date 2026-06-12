from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fuel_recon.importer import DataStore, find_fuzzy_plate_match, normalize_plate
from fuel_recon.models import (
    Anomaly,
    AnomalyType,
    DriverShift,
    FuelTransaction,
    MileageRecord,
    ReconciliationResult,
    ReimburseStatus,
)

FUEL_EFFICIENCY_L_PER_100KM = 30.0
VOLUME_EXCESS_MULTIPLIER = 2.0
DUPLICATE_TIME_WINDOW_MINUTES = 60
OVERNIGHT_START_HOUR = 22
OVERNIGHT_END_HOUR = 6


class Reconciler:
    def __init__(self, store: DataStore, config: Optional[dict] = None):
        self.store = store
        cfg = config or {}
        self.fuel_efficiency = cfg.get("fuel_efficiency", FUEL_EFFICIENCY_L_PER_100KM)
        self.volume_excess_multiplier = cfg.get(
            "volume_excess_multiplier", VOLUME_EXCESS_MULTIPLIER
        )
        self.duplicate_window = timedelta(
            minutes=cfg.get("duplicate_window_minutes", DUPLICATE_TIME_WINDOW_MINUTES)
        )
        self.overnight_start = cfg.get("overnight_start_hour", OVERNIGHT_START_HOUR)
        self.overnight_end = cfg.get("overnight_end_hour", OVERNIGHT_END_HOUR)

    def reconcile(self) -> ReconciliationResult:
        result = ReconciliationResult(
            total_transactions=len(self.store.transactions),
            new_transactions=len(self.store.transactions),
        )

        known_plates = self._build_known_plates()
        plate_shift_map = self._build_shift_map()
        mileage_map = self._build_mileage_map()

        effective_plate_map: dict[str, str] = {}
        for txn in self.store.transactions:
            matched = find_fuzzy_plate_match(txn.plate_number, known_plates)
            effective_plate_map[txn.txn_id] = matched or normalize_plate(txn.plate_number)

        txns_by_effective_plate: dict[str, list[FuelTransaction]] = defaultdict(list)
        for txn in self.store.transactions:
            ep = effective_plate_map[txn.txn_id]
            txns_by_effective_plate[ep].append(txn)

        for txn in self.store.transactions:
            matched_plate = find_fuzzy_plate_match(txn.plate_number, known_plates)
            effective_plate = effective_plate_map[txn.txn_id]

            if matched_plate and matched_plate != normalize_plate(txn.plate_number):
                result.anomalies.append(
                    Anomaly(
                        txn=txn,
                        anomaly_type=AnomalyType.PLATE_MISMATCH,
                        description=(
                            f"车牌 '{txn.plate_number}' 与系统中 '{matched_plate}' "
                            f"仅差一位，可能是录入错误"
                        ),
                        severity="low",
                    )
                )

            shift = self._find_shift(txn, effective_plate, plate_shift_map)
            self._check_driver_swap(txn, shift, effective_plate, result)

            self._check_out_of_area(txn, effective_plate, shift, txns_by_effective_plate, result)

            self._check_mileage_support(txn, effective_plate, mileage_map, result)

            self._check_excessive_volume(txn, effective_plate, txns_by_effective_plate, result)

            self._check_overnight_crossday(txn, result)

        self._check_duplicates(result)

        return result

    def _build_known_plates(self) -> set[str]:
        plates: set[str] = set()
        for s in self.store.shifts:
            plates.add(normalize_plate(s.plate_number))
        for m in self.store.mileages:
            plates.add(normalize_plate(m.plate_number))
        return plates

    def _build_shift_map(self) -> dict[str, list[DriverShift]]:
        m: dict[str, list[DriverShift]] = defaultdict(list)
        for s in self.store.shifts:
            m[normalize_plate(s.plate_number)].append(s)
        return m

    def _build_mileage_map(self) -> dict[str, list[MileageRecord]]:
        m: dict[str, list[MileageRecord]] = defaultdict(list)
        for mr in self.store.mileages:
            m[normalize_plate(mr.plate_number)].append(mr)
        return m

    def _find_shift(
        self,
        txn: FuelTransaction,
        plate: str,
        shift_map: dict[str, list[DriverShift]],
    ) -> Optional[DriverShift]:
        for shift in shift_map.get(plate, []):
            if shift.is_on_shift(txn.fuel_time):
                return shift
        for shifts in shift_map.values():
            for shift in shifts:
                if shift.driver_name == txn.driver_name and shift.is_on_shift(
                    txn.fuel_time
                ):
                    return shift
        return None

    def _check_driver_swap(
        self,
        txn: FuelTransaction,
        shift: Optional[DriverShift],
        effective_plate: str,
        result: ReconciliationResult,
    ):
        if shift is None:
            return
        if normalize_plate(shift.plate_number) != normalize_plate(effective_plate):
            result.anomalies.append(
                Anomaly(
                    txn=txn,
                    anomaly_type=AnomalyType.DRIVER_SWAP,
                    description=(
                        f"司机 '{txn.driver_name}' 排班车辆为 '{shift.plate_number}'，"
                        f"但加油车辆为 '{txn.plate_number}'，疑似临时换车"
                    ),
                    severity="medium",
                    related_shift=shift,
                )
            )

    def _check_out_of_area(
        self,
        txn: FuelTransaction,
        effective_plate: str,
        shift: Optional[DriverShift],
        txns_by_effective_plate: dict[str, list[FuelTransaction]],
        result: ReconciliationResult,
    ):
        if not txn.station_city:
            return
        if shift is None:
            return
        same_plate_txns = txns_by_effective_plate.get(effective_plate, [])
        cities: set[str] = set()
        for t in same_plate_txns:
            if t.station_city:
                cities.add(t.station_city)
        if len(cities) <= 1:
            return
        city_counts: dict[str, int] = defaultdict(int)
        for t in same_plate_txns:
            if t.station_city:
                city_counts[t.station_city] += 1
        primary_city = max(city_counts, key=city_counts.get)
        if txn.station_city != primary_city:
            result.anomalies.append(
                Anomaly(
                    txn=txn,
                    anomaly_type=AnomalyType.OUT_OF_AREA,
                    description=(
                        f"车辆 '{txn.plate_number}' 主要在 '{primary_city}' 加油，"
                        f"本次在 '{txn.station_city}' 加油，属异地加油"
                    ),
                    severity="medium",
                    related_shift=shift,
                )
            )

    def _check_mileage_support(
        self,
        txn: FuelTransaction,
        plate: str,
        mileage_map: dict[str, list[MileageRecord]],
        result: ReconciliationResult,
    ):
        records = mileage_map.get(plate, [])
        if not records:
            return
        fuel_date = txn.fuel_time.strftime("%Y-%m-%d")
        for mr in records:
            if mr.record_date == fuel_date and mr.daily_mileage > 0:
                expected_max_liters = mr.daily_mileage / 100.0 * self.fuel_efficiency
                if txn.volume_liters > expected_max_liters:
                    result.anomalies.append(
                        Anomaly(
                            txn=txn,
                            anomaly_type=AnomalyType.MILEAGE_UNSUPPORTED,
                            description=(
                                f"车辆 '{plate}' 当日里程 {mr.daily_mileage:.1f}km，"
                                f"按油耗 {self.fuel_efficiency}L/100km 最多应加油 "
                                f"{expected_max_liters:.1f}L，实际加油 "
                                f"{txn.volume_liters:.1f}L，里程不支持该加油量"
                            ),
                            severity="high",
                            related_mileage=mr,
                        )
                    )
                return

    def _check_excessive_volume(
        self,
        txn: FuelTransaction,
        effective_plate: str,
        txns_by_effective_plate: dict[str, list[FuelTransaction]],
        result: ReconciliationResult,
    ):
        same_plate_txns = txns_by_effective_plate.get(effective_plate, [])
        if len(same_plate_txns) < 2:
            return
        volumes = [t.volume_liters for t in same_plate_txns]
        avg_vol = sum(volumes) / len(volumes)
        if avg_vol == 0:
            return
        if txn.volume_liters >= avg_vol * self.volume_excess_multiplier:
            result.anomalies.append(
                Anomaly(
                    txn=txn,
                    anomaly_type=AnomalyType.EXCESSIVE_VOLUME,
                    description=(
                        f"车辆 '{effective_plate}' 平均加油 {avg_vol:.1f}L，"
                        f"本次加油 {txn.volume_liters:.1f}L，"
                        f"超过均值 {self.volume_excess_multiplier} 倍，油量超常"
                    ),
                    severity="high",
                )
            )

    def _check_overnight_crossday(
        self, txn: FuelTransaction, result: ReconciliationResult
    ):
        hour = txn.fuel_time.hour
        is_overnight = hour >= self.overnight_start or hour < self.overnight_end
        if not is_overnight:
            return
        is_crossday = txn.fuel_time.hour >= self.overnight_start and txn.fuel_time.day != (txn.fuel_time + timedelta(hours=1)).day
        desc = (
            f"车辆 '{txn.plate_number}' 在 {txn.fuel_time:%H:%M} 加油，属于夜间加油"
        )
        if is_crossday:
            desc += "且跨天"
        result.anomalies.append(
            Anomaly(
                txn=txn,
                anomaly_type=AnomalyType.OVERNIGHT_CROSSDAY,
                description=desc,
                severity="low",
            )
        )

    def _check_duplicates(self, result: ReconciliationResult):
        txns_by_plate = defaultdict(list)
        for t in self.store.transactions:
            txns_by_plate[normalize_plate(t.plate_number)].append(t)

        seen_pairs: set[frozenset[str]] = set()
        for plate, txns in txns_by_plate.items():
            for i, t1 in enumerate(txns):
                for t2 in txns[i + 1 :]:
                    if t1.txn_id == t2.txn_id:
                        continue
                    pair_key = frozenset({t1.txn_id, t2.txn_id})
                    if pair_key in seen_pairs:
                        continue
                    time_diff = abs((t1.fuel_time - t2.fuel_time).total_seconds())
                    if (
                        time_diff <= self.duplicate_window.total_seconds()
                        and t1.station_name == t2.station_name
                    ):
                        vol_diff = abs(t1.volume_liters - t2.volume_liters)
                        if vol_diff < max(t1.volume_liters, t2.volume_liters) * 0.1:
                            seen_pairs.add(pair_key)
                            result.anomalies.append(
                                Anomaly(
                                    txn=t1,
                                    anomaly_type=AnomalyType.SUSPECTED_DUPLICATE,
                                    description=(
                                        f"车辆 '{plate}' 在 {t1.fuel_time:%Y-%m-%d %H:%M} "
                                        f"和 {t2.fuel_time:%Y-%m-%d %H:%M} 于同一油站 "
                                        f"'{t1.station_name}' 加相近油量 "
                                        f"({t1.volume_liters:.1f}L vs "
                                        f"{t2.volume_liters:.1f}L)，疑似重复报销"
                                    ),
                                    severity="high",
                                    related_txns=[t2],
                                )
                            )

    def classify_reimburse(
        self, result: ReconciliationResult
    ) -> dict[ReimburseStatus, list[Anomaly]]:
        classified: dict[ReimburseStatus, list[Anomaly]] = {
            ReimburseStatus.APPROVED: [],
            ReimburseStatus.PENDING: [],
            ReimburseStatus.REJECTED: [],
        }

        for a in result.anomalies:
            if a.anomaly_type == AnomalyType.SUSPECTED_DUPLICATE:
                classified[ReimburseStatus.REJECTED].append(a)
            elif a.anomaly_type == AnomalyType.PLATE_MISMATCH:
                classified[ReimburseStatus.APPROVED].append(a)
            elif a.anomaly_type in (
                AnomalyType.OVERNIGHT_CROSSDAY,
                AnomalyType.DRIVER_SWAP,
            ):
                classified[ReimburseStatus.PENDING].append(a)
            elif a.anomaly_type in (
                AnomalyType.OUT_OF_AREA,
                AnomalyType.EXCESSIVE_VOLUME,
                AnomalyType.MILEAGE_UNSUPPORTED,
            ):
                classified[ReimburseStatus.PENDING].append(a)

        return classified
