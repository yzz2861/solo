from __future__ import annotations

import json
import os
import shutil
import tempfile
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from studio_check.config import get_config
from studio_check.scanner import Scanner
from studio_check.checker import Checker
from studio_check.reporter import Reporter
from studio_check.confirmer import Confirmer
from studio_check.models import IssueLevel, IssueCode


def create_test_tree(base: Path) -> None:
    retouch = base / "精修"
    original = base / "原片"
    retouch.mkdir()
    original.mkdir()

    (retouch / "A001_精修.jpg").write_bytes(b"fake")
    (retouch / "A002_精修.jpg").write_bytes(b"fake")
    (retouch / "A003_精修.jpg").write_bytes(b"fake")
    (retouch / "A003_精修_v2.jpg").write_bytes(b"fake")
    (retouch / "A005_精修.jpg").write_bytes(b"fake")

    (original / "A001.CR3").write_bytes(b"raw")
    (original / "A002.CR3").write_bytes(b"raw")
    (original / "A003.CR3").write_bytes(b"raw")
    (original / "A004.CR3").write_bytes(b"raw")

    (base / "授权书.pdf").write_bytes(b"auth")
    (base / "挑片表.xlsx").write_bytes(b"sel")

    (retouch / "sub").mkdir()
    (retouch / "sub" / "B010_精修.png").write_bytes(b"deep")


def test_scan_categorizes_files():
    with tempfile.TemporaryDirectory() as td:
        base = Path(td)
        create_test_tree(base)

        scanner = Scanner()
        result = scanner.scan(base)

        assert len(result.retouched) == 6, f"Expected 6 retouched, got {len(result.retouched)}"
        assert len(result.originals) == 4, f"Expected 4 originals, got {len(result.originals)}"
        assert len(result.auth_letters) == 1
        assert len(result.selection_sheets) == 1
        assert len(result.delivery_notes) == 0


def test_checker_detects_issues():
    with tempfile.TemporaryDirectory() as td:
        base = Path(td)
        create_test_tree(base)

        scanner = Scanner()
        result = scanner.scan(base)

        checker = Checker()
        checker.check(result)

        codes = {i.code for i in result.issues}

        assert IssueCode.MISSING_ORIGINAL in codes, "Should detect A005 has no original"
        assert IssueCode.ORPHAN_ORIGINAL in codes, "Should detect A004 has no retouch"
        assert IssueCode.MULTI_VERSION in codes, "Should detect A003 multi-version"
        assert IssueCode.MISSING_DELIVERY_NOTE in codes, "Should detect missing delivery note"
        assert IssueCode.AUTH_NO_SIGNATURE in codes, "Should detect missing signature page"


def test_filenames_with_spaces():
    with tempfile.TemporaryDirectory() as td:
        base = Path(td)
        retouch = base / "精修"
        original = base / "原片"
        retouch.mkdir()
        original.mkdir()

        (retouch / "A001 客户精修.jpg").write_bytes(b"x")
        (retouch / "A002 最终版.jpg").write_bytes(b"x")
        (original / "A001.CR3").write_bytes(b"r")

        (base / "授权书 张三.pdf").write_bytes(b"auth")
        (base / "挑片表 2024.xlsx").write_bytes(b"sel")
        (base / "交付说明.txt").write_bytes(b"note")

        scanner = Scanner()
        result = scanner.scan(base)
        checker = Checker()
        checker.check(result)

        assert len(result.retouched) == 2
        ids = {p.photo_id for p in result.retouched}
        assert "A001" in ids
        assert "A002" in ids


def test_reporter_generates_outputs():
    with tempfile.TemporaryDirectory() as td:
        base = Path(td)
        create_test_tree(base)

        scanner = Scanner()
        result = scanner.scan(base)
        checker = Checker()
        checker.check(result)

        reporter = Reporter(base)
        text = reporter.generate_text(result)
        assert "精修图:" in text
        assert "问题列表" in text

        j = reporter.generate_json(result)
        data = json.loads(j)
        assert "retouched" in data
        assert "issues" in data

        path = reporter.save_report(result)
        assert path.exists()
        assert (base / ".studio-check" / "report.json").exists()
        assert (base / ".studio-check" / "checklist.txt").exists()


def test_confirm_and_lock_flow():
    with tempfile.TemporaryDirectory() as td:
        base = Path(td)
        create_test_tree(base)

        scanner = Scanner()
        result = scanner.scan(base)

        confirmer = Confirmer(base)

        state = confirmer.confirm(["A001", "A003"], result, version=2)
        assert "A001" in state.entries
        assert "A003" in state.entries
        assert state.entries["A003"].confirmed_version == 2

        state2 = confirmer.load_state()
        assert "A001" in state2.entries

        state3 = confirmer.lock()
        assert state3.locked

        try:
            confirmer.confirm(["A002"], result)
            assert False, "Should raise on locked state"
        except RuntimeError:
            pass

        confirmer.unlock()
        state4 = confirmer.confirm(["A002"], result)
        assert "A002" in state4.entries


def test_idempotent_scan():
    with tempfile.TemporaryDirectory() as td:
        base = Path(td)
        create_test_tree(base)

        scanner = Scanner()
        result1 = scanner.scan(base)
        checker = Checker()
        checker.check(result1)
        reporter = Reporter(base)
        reporter.save_report(result1)

        result2 = scanner.scan(base)
        checker.check(result2)
        reporter.save_report(result2)

        assert len(result1.retouched) == len(result2.retouched)
        assert len(result1.originals) == len(result2.originals)
        assert len(result1.issues) == len(result2.issues)


def test_no_client_dir():
    scanner = Scanner()
    try:
        scanner.scan(Path("/nonexistent_dir_xyz_12345"))
        assert False, "Should raise"
    except FileNotFoundError:
        pass


if __name__ == "__main__":
    test_scan_categorizes_files()
    print("✓ test_scan_categorizes_files")

    test_checker_detects_issues()
    print("✓ test_checker_detects_issues")

    test_filenames_with_spaces()
    print("✓ test_filenames_with_spaces")

    test_reporter_generates_outputs()
    print("✓ test_reporter_generates_outputs")

    test_confirm_and_lock_flow()
    print("✓ test_confirm_and_lock_flow")

    test_idempotent_scan()
    print("✓ test_idempotent_scan")

    test_no_client_dir()
    print("✓ test_no_client_dir")

    print("\n全部测试通过 ✓")
