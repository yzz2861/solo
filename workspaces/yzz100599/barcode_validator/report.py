import csv
import sys
from collections import defaultdict
from dataclasses import dataclass
from .validator import BarcodeRecord
from .rules import SupplierRule


@dataclass
class ValidationStats:
    total: int = 0
    valid: int = 0
    invalid: int = 0
    bad_rows: int = 0
    by_supplier: dict = None
    by_issue_code: dict = None
    sample_checked: int = 0
    sample_total: int = 0

    def __post_init__(self):
        if self.by_supplier is None:
            self.by_supplier = defaultdict(lambda: {"valid": 0, "invalid": 0, "bad": 0})
        if self.by_issue_code is None:
            self.by_issue_code = defaultdict(int)


def compute_stats(records: list[BarcodeRecord], rules: dict[str, SupplierRule]) -> ValidationStats:
    stats = ValidationStats(total=len(records))

    for rec in records:
        if rec.is_bad_row:
            stats.bad_rows += 1
            stats.by_supplier[rec.supplier_code or "UNKNOWN"]["bad"] += 1
            continue

        supplier = rec.supplier_code
        if rec.is_valid:
            stats.valid += 1
            stats.by_supplier[supplier]["valid"] += 1
        else:
            stats.invalid += 1
            stats.by_supplier[supplier]["invalid"] += 1

        for issue in rec.issues:
            stats.by_issue_code[issue.code] += 1

    stats.sample_total = stats.total - stats.bad_rows
    for code, rule in rules.items():
        s = stats.by_supplier.get(code, {})
        checked = s.get("valid", 0) + s.get("invalid", 0)
        stats.sample_checked += checked

    return stats


def write_qualified_csv(records: list[BarcodeRecord], path: str) -> None:
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["原始行号", "条码", "供应商代码", "箱号", "扫码时间"])
        for rec in records:
            if rec.is_valid:
                writer.writerow([
                    rec.raw_line_number,
                    rec.clean_barcode,
                    rec.supplier_code,
                    rec.box_id,
                    rec.scan_time,
                ])


def write_anomaly_csv(records: list[BarcodeRecord], path: str) -> None:
    groups: dict[str, list[BarcodeRecord]] = defaultdict(list)
    for rec in records:
        if not rec.is_valid:
            key = rec.supplier_code if rec.supplier_code else "UNKNOWN"
            groups[key].append(rec)

    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["供应商代码", "原始行号", "原始条码", "清理后条码", "异常代码", "异常描述", "箱号"])
        for supplier in sorted(groups.keys()):
            for rec in groups[supplier]:
                for issue in rec.issues:
                    writer.writerow([
                        supplier,
                        rec.raw_line_number,
                        rec.raw_barcode,
                        rec.clean_barcode,
                        issue.code,
                        issue.message,
                        rec.box_id,
                    ])


def print_summary(stats: ValidationStats, rules: dict[str, SupplierRule], out=None) -> None:
    if out is None:
        out = sys.stdout

    print("=" * 60, file=out)
    print("仓库条码批量验真报告", file=out)
    print("=" * 60, file=out)
    print(file=out)
    print(f"总记录数:       {stats.total}", file=out)
    print(f"合格条码:       {stats.valid}", file=out)
    print(f"异常条码:       {stats.invalid}", file=out)
    print(f"坏行(无法解析): {stats.bad_rows}", file=out)
    print(file=out)

    if stats.sample_total > 0:
        ratio = stats.sample_checked / stats.sample_total * 100
        print(f"抽检比例:       {stats.sample_checked}/{stats.sample_total} = {ratio:.1f}%", file=out)
    else:
        print("抽检比例:       N/A", file=out)

    print(file=out)
    print("-" * 60, file=out)
    print("按供应商统计:", file=out)
    print("-" * 60, file=out)
    for code in sorted(stats.by_supplier.keys()):
        s = stats.by_supplier[code]
        name = rules[code].name if code in rules else code
        print(f"  {name} ({code}):", file=out)
        print(f"    合格={s['valid']}  异常={s['invalid']}  坏行={s['bad']}", file=out)
        if code in rules:
            sr = rules[code]
            total_for_supplier = s["valid"] + s["invalid"]
            if sr.sample_ratio < 1.0 and total_for_supplier > 0:
                print(f"    抽检率配置={sr.sample_ratio*100:.0f}%  实际抽检={total_for_supplier}", file=out)

    if stats.by_issue_code:
        print(file=out)
        print("-" * 60, file=out)
        print("异常类型分布:", file=out)
        print("-" * 60, file=out)
        for code in sorted(stats.by_issue_code.keys()):
            print(f"  {code}: {stats.by_issue_code[code]}", file=out)

    print(file=out)
    print("=" * 60, file=out)
