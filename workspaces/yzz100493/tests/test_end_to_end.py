from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from license_audit.auditor import run_audit  # noqa: E402
from license_audit.config import AppConfig  # noqa: E402
from license_audit.models import LicenseCategory  # noqa: E402
from license_audit.reporting import generate_all_reports  # noqa: E402


def _build_demo_project(root: Path) -> None:
    (root / "package.json").write_text(json.dumps({
        "name": "demo-app",
        "version": "1.0.0",
        "dependencies": {
            "lodash": "^4.17.0",
            "react": "^18.0.0",
        },
        "devDependencies": {
            "jest": "^29.0.0",
            "eslint": "^8.0.0",
        },
    }), encoding="utf-8")

    (root / "package-lock.json").write_text(json.dumps({
        "name": "demo-app",
        "version": "1.0.0",
        "packages": {
            "node_modules/lodash": {
                "name": "lodash",
                "version": "4.17.21",
                "license": "MIT",
                "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
            },
            "node_modules/react": {
                "name": "react",
                "version": "18.2.0",
                "license": "MIT",
                "resolved": "https://registry.npmjs.org/react/-/react-18.2.0.tgz",
            },
            "node_modules/loose-envify": {
                "name": "loose-envify",
                "version": "1.4.0",
                "license": "MIT",
            },
            "node_modules/jest": {
                "name": "jest",
                "version": "29.7.0",
                "dev": True,
                "license": "MIT",
            },
            "node_modules/eslint": {
                "name": "eslint",
                "version": "8.57.0",
                "dev": True,
                "license": "MIT",
            },
            "node_modules/some-gpl-lib": {
                "name": "some-gpl-lib",
                "version": "1.0.0",
                "license": "GPL-3.0",
            },
            "node_modules/unknown-license": {
                "name": "unknown-license",
                "version": "0.1.0",
            },
            "node_modules/dual-pkg": {
                "name": "dual-pkg",
                "version": "2.0.0",
                "license": "MIT OR Apache-2.0",
            },
            "node_modules/dual-risk": {
                "name": "dual-risk",
                "version": "1.0.0",
                "license": "GPL-3.0 OR MIT",
            },
            "node_modules/lodash": {
                "name": "lodash",
                "version": "4.17.21",
                "license": "MIT",
            },
        },
    }), encoding="utf-8")

    (root / "requirements.txt").write_text(
        "requests==2.31.0\nflask==2.3.3\ncelery==5.3.0\n",
        encoding="utf-8",
    )

    dist_dir = root / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)
    (dist_dir / "bundle.js").write_text(
        "// bundled node_modules/lodash/index.js\n"
        "// bundled node_modules/react/index.js\n"
        "// bundled node_modules/jest/index.js\n",
        encoding="utf-8",
    )


def test_end_to_end_audit_and_reports():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        _build_demo_project(root)

        config = AppConfig.from_dict({}, project_root=root)
        config.scan.include_dev_dependencies = True
        config.scan.check_build_artifacts = True

        report = run_audit(config, save_history=True)
        assert len(report.scan.packages) > 0

        names = {p.name for p in report.scan.packages}
        assert "lodash" in names
        assert "some-gpl-lib" in names
        assert "unknown-license" in names

        risk_names = {p.name for p in report.risks}
        assert "some-gpl-lib" in risk_names
        assert "unknown-license" in risk_names
        assert "dual-risk" in risk_names
        assert "lodash" not in risk_names

        dual = [p for p in report.scan.packages if p.name == "dual-pkg"][0]
        assert dual.license.is_dual is True
        assert dual.license.category == LicenseCategory.DUAL_APPROVED

        dual_risk = [p for p in report.scan.packages if p.name == "dual-risk"][0]
        assert dual_risk.license.category == LicenseCategory.DUAL_MIXED

        output_dir = root / "license-report"
        paths = generate_all_reports(report, output_dir)
        for group, files in paths.items():
            for p in files:
                assert p.exists()
                assert p.stat().st_size > 0

        md_dev = output_dir / "dev-report.md"
        assert "修复建议" in md_dev.read_text(encoding="utf-8")
        md_legal = output_dir / "legal-report.md"
        assert "法务依赖许可证审查报告" in md_legal.read_text(encoding="utf-8")
        csv_risk = output_dir / "legal-risk-summary.csv"
        assert csv_risk.exists()
        assert "风险级别" in csv_risk.read_text(encoding="utf-8")


def test_history_diff():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        config = AppConfig.from_dict({}, project_root=root)

        (root / "package.json").write_text(json.dumps({
            "name": "demo",
            "dependencies": {"safe-pkg": "1.0.0"},
        }), encoding="utf-8")
        (root / "package-lock.json").write_text(json.dumps({
            "packages": {
                "node_modules/safe-pkg": {
                    "name": "safe-pkg",
                    "version": "1.0.0",
                    "license": "MIT",
                },
            },
        }), encoding="utf-8")

        first = run_audit(config, save_history=True)
        assert len(first.new_risks_vs_baseline) == 0

        (root / "package-lock.json").write_text(json.dumps({
            "packages": {
                "node_modules/safe-pkg": {
                    "name": "safe-pkg",
                    "version": "1.0.0",
                    "license": "MIT",
                },
                "node_modules/bad-pkg": {
                    "name": "bad-pkg",
                    "version": "1.0.0",
                    "license": "GPL-3.0",
                },
            },
        }), encoding="utf-8")

        second = run_audit(config, save_history=True)
        new_risk_names = {p.name for p in second.new_risks_vs_baseline}
        assert "bad-pkg" in new_risk_names


def run_all():
    tests = [
        test_end_to_end_audit_and_reports,
        test_history_diff,
    ]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"[PASS] {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"[FAIL] {t.__name__}: {e}")
            import traceback
            traceback.print_exc()
        except Exception as e:
            failed += 1
            print(f"[ERROR] {t.__name__}: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return failed


if __name__ == "__main__":
    sys.exit(run_all())
