from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from license_audit.config import WhiteListConfig  # noqa: E402
from license_audit.models import DependencyType, LicenseCategory, PackageManager  # noqa: E402
from license_audit.parsers.npm import parse_package_json, parse_package_lock  # noqa: E402
from license_audit.parsers.python import parse_requirements_txt  # noqa: E402


def _write_package_lock(path: Path):
    data = {
        "name": "demo",
        "version": "1.0.0",
        "packages": {
            "node_modules/foo": {
                "name": "foo",
                "version": "1.2.3",
                "license": "MIT",
                "resolved": "https://registry.npmjs.org/foo/-/foo-1.2.3.tgz",
            },
            "node_modules/bar": {
                "name": "bar",
                "version": "2.0.0",
                "dev": True,
                "license": "GPL-3.0",
            },
            "node_modules/baz": {
                "name": "baz",
                "version": "0.0.1",
            },
            "node_modules/dual": {
                "name": "dual",
                "version": "1.0.0",
                "license": "MIT OR Apache-2.0",
            },
            "node_modules/restricted-dual": {
                "name": "restricted-dual",
                "version": "1.0.0",
                "license": "GPL-2.0 OR GPL-3.0",
            },
        },
    }
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def test_parse_package_lock_basic():
    wl = WhiteListConfig()
    with tempfile.TemporaryDirectory() as td:
        lock_path = Path(td) / "package-lock.json"
        _write_package_lock(lock_path)
        result = parse_package_lock(lock_path, wl, include_dev=True)
        by_name = {p.name: p for p in result.packages}
        assert "foo" in by_name
        assert by_name["foo"].license.category == LicenseCategory.APPROVED
        assert by_name["bar"].dep_type == DependencyType.DEVELOPMENT
        assert by_name["bar"].license.category == LicenseCategory.RESTRICTED
        assert by_name["baz"].license.category == LicenseCategory.MISSING
        assert by_name["dual"].license.is_dual is True
        assert by_name["dual"].license.category == LicenseCategory.DUAL_APPROVED
        assert by_name["restricted-dual"].license.category == LicenseCategory.DUAL_RESTRICTED


def test_parse_package_lock_exclude_dev():
    wl = WhiteListConfig()
    with tempfile.TemporaryDirectory() as td:
        lock_path = Path(td) / "package-lock.json"
        _write_package_lock(lock_path)
        result = parse_package_lock(lock_path, wl, include_dev=False)
        names = {p.name for p in result.packages}
        assert "bar" not in names
        assert "foo" in names


def test_parse_package_json():
    wl = WhiteListConfig()
    with tempfile.TemporaryDirectory() as td:
        pj = Path(td) / "package.json"
        pj.write_text(json.dumps({
            "name": "demo",
            "dependencies": {"foo": "^1.0.0"},
            "devDependencies": {"bar": "^2.0.0"},
        }), encoding="utf-8")
        result = parse_package_json(pj, wl, include_dev=True)
        names = {p.name for p in result.packages}
        assert names == {"foo", "bar"}
        dev = [p for p in result.packages if p.name == "bar"][0]
        assert dev.dep_type == DependencyType.DEVELOPMENT


def test_parse_requirements_txt():
    wl = WhiteListConfig()
    with tempfile.TemporaryDirectory() as td:
        req = Path(td) / "requirements.txt"
        req.write_text("requests==2.31.0\nflask>=2.0.0\n# comment\n-e .\n", encoding="utf-8")
        result = parse_requirements_txt(req, wl, include_dev=True)
        names = {p.name for p in result.packages}
        assert "requests" in names
        assert "flask" in names


def run_all():
    tests = [
        test_parse_package_lock_basic,
        test_parse_package_lock_exclude_dev,
        test_parse_package_json,
        test_parse_requirements_txt,
    ]
    failed = 0
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
