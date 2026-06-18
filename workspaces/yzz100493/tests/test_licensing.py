from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from license_audit.config import WhiteListConfig  # noqa: E402
from license_audit.licensing import (  # noqa: E402
    classify_license,
    normalize_license,
    parse_license,
)
from license_audit.models import LicenseCategory  # noqa: E402


def test_normalize_license_simple():
    wl = WhiteListConfig()
    assert normalize_license("MIT") == ["MIT"]
    assert normalize_license(" mit ") == ["MIT"]
    assert normalize_license("Apache 2.0") == ["Apache-2.0"]
    assert normalize_license("") == ["UNKNOWN"]
    assert normalize_license("GPL-3.0 OR MIT") == ["GPL-3.0", "MIT"]
    assert normalize_license("(MIT)") == ["MIT"]


def test_classify_license():
    wl = WhiteListConfig()
    cat, note = classify_license(["MIT"], wl)
    assert cat == LicenseCategory.APPROVED
    cat, note = classify_license(["GPL-3.0"], wl)
    assert cat == LicenseCategory.RESTRICTED
    cat, note = classify_license(["UNKNOWN"], wl)
    assert cat == LicenseCategory.MISSING
    cat, note = classify_license(["MIT", "Apache-2.0"], wl)
    assert cat == LicenseCategory.DUAL_APPROVED
    cat, note = classify_license(["MIT", "GPL-3.0"], wl)
    assert cat == LicenseCategory.DUAL_MIXED
    cat, note = classify_license(["GPL-2.0", "GPL-3.0"], wl)
    assert cat == LicenseCategory.DUAL_RESTRICTED
    cat, note = classify_license(["Some-New-License"], wl)
    assert cat == LicenseCategory.UNCERTAIN


def test_parse_license_exception():
    wl = WhiteListConfig(package_exceptions={"weird-pkg": "MIT"})
    info = parse_license("", wl, package_name="weird-pkg")
    assert info.category == LicenseCategory.APPROVED
    assert "例外许可证" in info.note


def test_parse_license_dual():
    wl = WhiteListConfig()
    info = parse_license("MIT OR Apache-2.0", wl)
    assert info.is_dual is True
    assert info.category == LicenseCategory.DUAL_APPROVED
    assert set(info.identifiers) == {"MIT", "Apache-2.0"}


def run_all():
    failed = 0
    tests = [
        test_normalize_license_simple,
        test_classify_license,
        test_parse_license_exception,
        test_parse_license_dual,
    ]
    for t in tests:
        try:
            t()
            print(f"[PASS] {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"[FAIL] {t.__name__}: {e}")
        except Exception as e:
            failed += 1
            print(f"[ERROR] {t.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return failed


if __name__ == "__main__":
    sys.exit(run_all())
