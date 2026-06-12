from __future__ import annotations

import csv
import os
import tempfile
from datetime import datetime
from pathlib import Path

import pytest

from fuel_recon.importer import DataStore, find_fuzzy_plate_match, normalize_plate, plate_edit_distance_one
from fuel_recon.models import (
    AnomalyType,
    DriverShift,
    FuelTransaction,
    MileageRecord,
    ReimburseStatus,
)
from fuel_recon.reconciler import Reconciler
from fuel_recon.exporter import export_audit_report, export_pending_list, export_reimburse_summary


def _make_txn(**overrides) -> FuelTransaction:
    defaults = dict(
        txn_id="TXN001",
        card_number="CARD001",
        plate_number="京A12345",
        driver_name="张三",
        fuel_time=datetime(2025, 3, 15, 10, 0),
        station_name="中石油朝阳站",
        station_city="北京",
        fuel_type="0号柴油",
        volume_liters=100.0,
        amount_with_tax=700.0,
        tax_rate=0.13,
        receipt_number="INV001",
    )
    defaults.update(overrides)
    return FuelTransaction(**defaults)


class TestNormalizePlate:
    def test_uppercase(self):
        assert normalize_plate("京a12345") == "京A12345"

    def test_strip_spaces(self):
        assert normalize_plate(" 京A12345 ") == "京A12345"

    def test_remove_dot(self):
        assert normalize_plate("京A.12345") == "京A12345"


class TestPlateEditDistance:
    def test_same(self):
        assert not plate_edit_distance_one("京A12345", "京A12345")

    def test_one_diff(self):
        assert plate_edit_distance_one("京A12345", "京A12346")

    def test_two_diff(self):
        assert not plate_edit_distance_one("京A12345", "京A12366")

    def test_different_length(self):
        assert not plate_edit_distance_one("京A12345", "京A1234")


class TestFindFuzzyPlateMatch:
    def test_exact_match(self):
        assert find_fuzzy_plate_match("京A12345", {"京A12345"}) == "京A12345"

    def test_fuzzy_match_one_off(self):
        assert find_fuzzy_plate_match("京A12346", {"京A12345"}) == "京A12345"

    def test_no_match(self):
        assert find_fuzzy_plate_match("京A99999", {"京A12345"}) is None


class TestFuelTransaction:
    def test_amount_without_tax(self):
        txn = _make_txn(amount_with_tax=1130.0, tax_rate=0.13)
        assert txn.amount_without_tax == 1000.0

    def test_tax_amount(self):
        txn = _make_txn(amount_with_tax=1130.0, tax_rate=0.13)
        assert txn.tax_amount == 130.0

    def test_dedup_key(self):
        txn1 = _make_txn()
        txn2 = _make_txn()
        assert txn1.dedup_key() == txn2.dedup_key()

    def test_dedup_key_different(self):
        txn1 = _make_txn()
        txn2 = _make_txn(volume_liters=200.0)
        assert txn1.dedup_key() != txn2.dedup_key()


class TestDataStore:
    def test_import_transactions_csv(self, tmp_path):
        csv_path = tmp_path / "fuel.csv"
        csv_path.write_text(
            "流水号,卡号,车牌号,司机,加油时间,油站名称,油站城市,油品,加油量,金额,税率,票据号\n"
            "TXN001,CARD001,京A12345,张三,2025-03-15 10:00:00,中石油朝阳站,北京,0号柴油,100,700,0.13,INV001\n",
            encoding="utf-8-sig",
        )
        store = DataStore(str(tmp_path / "store"))
        new_count, dup_count = store.import_transactions(str(csv_path))
        assert new_count == 1
        assert dup_count == 0
        assert len(store.transactions) == 1

    def test_import_dedup(self, tmp_path):
        csv_path = tmp_path / "fuel.csv"
        csv_path.write_text(
            "流水号,卡号,车牌号,司机,加油时间,油站名称,油站城市,油品,加油量,金额,税率,票据号\n"
            "TXN001,CARD001,京A12345,张三,2025-03-15 10:00:00,中石油朝阳站,北京,0号柴油,100,700,0.13,INV001\n",
            encoding="utf-8-sig",
        )
        store = DataStore(str(tmp_path / "store"))
        store.import_transactions(str(csv_path))
        new_count, dup_count = store.import_transactions(str(csv_path))
        assert new_count == 0
        assert dup_count == 1

    def test_import_shifts(self, tmp_path):
        csv_path = tmp_path / "shift.csv"
        csv_path.write_text(
            "司机,车牌号,开始时间,结束时间\n"
            "张三,京A12345,2025-03-15 08:00:00,2025-03-15 20:00:00\n",
            encoding="utf-8-sig",
        )
        store = DataStore(str(tmp_path / "store"))
        count = store.import_shifts(str(csv_path))
        assert count == 1

    def test_import_mileages(self, tmp_path):
        csv_path = tmp_path / "mileage.csv"
        csv_path.write_text(
            "车牌号,日期,起始里程,结束里程\n"
            "京A12345,2025-03-15,10000,10500\n",
            encoding="utf-8-sig",
        )
        store = DataStore(str(tmp_path / "store"))
        count = store.import_mileages(str(csv_path))
        assert count == 1


class TestReconciler:
    def _make_store(self, tmp_path, txns=None, shifts=None, mileages=None):
        store = DataStore(str(tmp_path / "store"))
        store.transactions = txns or []
        store.shifts = shifts or []
        store.mileages = mileages or []
        return store

    def test_plate_mismatch(self, tmp_path):
        store = self._make_store(
            tmp_path,
            txns=[_make_txn(plate_number="京A12346")],
            shifts=[DriverShift("张三", "京A12345", datetime(2025, 3, 15, 8, 0), datetime(2025, 3, 15, 20, 0))],
        )
        r = Reconciler(store)
        result = r.reconcile()
        types = [a.anomaly_type for a in result.anomalies]
        assert AnomalyType.PLATE_MISMATCH in types

    def test_driver_swap(self, tmp_path):
        store = self._make_store(
            tmp_path,
            txns=[_make_txn(plate_number="京B99999")],
            shifts=[DriverShift("张三", "京A12345", datetime(2025, 3, 15, 8, 0), datetime(2025, 3, 15, 20, 0))],
        )
        r = Reconciler(store)
        result = r.reconcile()
        types = [a.anomaly_type for a in result.anomalies]
        assert AnomalyType.DRIVER_SWAP in types

    def test_out_of_area(self, tmp_path):
        store = self._make_store(
            tmp_path,
            txns=[
                _make_txn(station_city="北京"),
                _make_txn(txn_id="TXN002", station_city="上海", fuel_time=datetime(2025, 3, 16, 10, 0)),
            ],
            shifts=[
                DriverShift("张三", "京A12345", datetime(2025, 3, 15, 8, 0), datetime(2025, 3, 15, 20, 0)),
                DriverShift("张三", "京A12345", datetime(2025, 3, 16, 8, 0), datetime(2025, 3, 16, 20, 0)),
            ],
        )
        r = Reconciler(store)
        result = r.reconcile()
        types = [a.anomaly_type for a in result.anomalies]
        assert AnomalyType.OUT_OF_AREA in types

    def test_mileage_unsupported(self, tmp_path):
        store = self._make_store(
            tmp_path,
            txns=[_make_txn(volume_liters=200.0)],
            mileages=[MileageRecord("京A12345", "2025-03-15", 10000, 10200)],
        )
        r = Reconciler(store)
        result = r.reconcile()
        types = [a.anomaly_type for a in result.anomalies]
        assert AnomalyType.MILEAGE_UNSUPPORTED in types

    def test_excessive_volume(self, tmp_path):
        store = self._make_store(
            tmp_path,
            txns=[
                _make_txn(volume_liters=50.0),
                _make_txn(txn_id="TXN002", volume_liters=50.0, fuel_time=datetime(2025, 3, 16, 10, 0)),
                _make_txn(txn_id="TXN003", volume_liters=200.0, fuel_time=datetime(2025, 3, 17, 10, 0)),
            ],
        )
        r = Reconciler(store)
        result = r.reconcile()
        types = [a.anomaly_type for a in result.anomalies]
        assert AnomalyType.EXCESSIVE_VOLUME in types

    def test_overnight_crossday(self, tmp_path):
        store = self._make_store(
            tmp_path,
            txns=[_make_txn(fuel_time=datetime(2025, 3, 15, 23, 30))],
        )
        r = Reconciler(store)
        result = r.reconcile()
        types = [a.anomaly_type for a in result.anomalies]
        assert AnomalyType.OVERNIGHT_CROSSDAY in types

    def test_suspected_duplicate(self, tmp_path):
        store = self._make_store(
            tmp_path,
            txns=[
                _make_txn(),
                _make_txn(txn_id="TXN002", fuel_time=datetime(2025, 3, 15, 10, 30)),
            ],
        )
        r = Reconciler(store, config={"duplicate_window_minutes": 60})
        result = r.reconcile()
        types = [a.anomaly_type for a in result.anomalies]
        assert AnomalyType.SUSPECTED_DUPLICATE in types

    def test_classify_reimburse(self, tmp_path):
        store = self._make_store(
            tmp_path,
            txns=[_make_txn(plate_number="京A12346")],
            shifts=[DriverShift("张三", "京A12345", datetime(2025, 3, 15, 8, 0), datetime(2025, 3, 15, 20, 0))],
        )
        r = Reconciler(store)
        result = r.reconcile()
        classified = r.classify_reimburse(result)
        plate_mismatch = [a for a in classified[ReimburseStatus.APPROVED] if a.anomaly_type == AnomalyType.PLATE_MISMATCH]
        assert len(plate_mismatch) >= 1


class TestExporter:
    def test_export_pending(self, tmp_path):
        store = DataStore(str(tmp_path / "store"))
        store.transactions = [_make_txn()]
        store.shifts = [DriverShift("张三", "京A12345", datetime(2025, 3, 15, 8, 0), datetime(2025, 3, 15, 20, 0))]
        r = Reconciler(store)
        result = r.reconcile()
        output = str(tmp_path / "pending.csv")
        export_pending_list(result, r, output)
        assert Path(output).exists()

    def test_export_reimburse(self, tmp_path):
        store = DataStore(str(tmp_path / "store"))
        store.transactions = [_make_txn()]
        store.shifts = [DriverShift("张三", "京A12345", datetime(2025, 3, 15, 8, 0), datetime(2025, 3, 15, 20, 0))]
        r = Reconciler(store)
        result = r.reconcile()
        output = str(tmp_path / "reimburse.csv")
        export_reimburse_summary(result, r, output)
        assert Path(output).exists()

    def test_export_audit(self, tmp_path):
        store = DataStore(str(tmp_path / "store"))
        store.transactions = [_make_txn()]
        store.shifts = [DriverShift("张三", "京A12345", datetime(2025, 3, 15, 8, 0), datetime(2025, 3, 15, 20, 0))]
        r = Reconciler(store)
        result = r.reconcile()
        output = str(tmp_path / "audit.csv")
        export_audit_report(result, r, output)
        assert Path(output).exists()
