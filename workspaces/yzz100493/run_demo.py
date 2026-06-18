import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEMO = ROOT / "demo_project"
if DEMO.exists():
    shutil.rmtree(DEMO)
DEMO.mkdir()

(DEMO / "package.json").write_text(json.dumps({
    "name": "demo-app",
    "version": "1.0.0",
    "dependencies": {"lodash": "^4.17.0", "react": "^18.0.0"},
    "devDependencies": {"jest": "^29.0.0", "eslint": "^8.0.0"},
}, indent=2))

(DEMO / "package-lock.json").write_text(json.dumps({
    "name": "demo-app",
    "version": "1.0.0",
    "packages": {
        "node_modules/lodash": {"name": "lodash", "version": "4.17.21", "license": "MIT"},
        "node_modules/react": {"name": "react", "version": "18.2.0", "license": "MIT"},
        "node_modules/loose-envify": {"name": "loose-envify", "version": "1.4.0", "license": "MIT"},
        "node_modules/jest": {"name": "jest", "version": "29.7.0", "dev": True, "license": "MIT"},
        "node_modules/eslint": {"name": "eslint", "version": "8.57.0", "dev": True, "license": "MIT"},
        "node_modules/some-gpl-lib": {"name": "some-gpl-lib", "version": "1.0.0", "license": "GPL-3.0"},
        "node_modules/unknown-license": {"name": "unknown-license", "version": "0.1.0"},
        "node_modules/dual-pkg": {"name": "dual-pkg", "version": "2.0.0", "license": "MIT OR Apache-2.0"},
        "node_modules/dual-risk": {"name": "dual-risk", "version": "1.0.0", "license": "GPL-3.0 OR MIT"},
        "node_modules/weird-pkg": {"name": "weird-pkg", "version": "0.0.1", "license": "MySecretLicense"},
    },
}, indent=2))

(DEMO / "requirements.txt").write_text("requests==2.31.0\nflask==2.3.3\n")

dist = DEMO / "dist"
dist.mkdir()
(dist / "bundle.js").write_text(
    "// bundled: node_modules/lodash/index.js\n"
    "// bundled: node_modules/jest/index.js\n"
)

print("=== demo project created ===")
for p in sorted(DEMO.rglob("*")):
    if p.is_file():
        print(" ", p.relative_to(DEMO))

print("\n=== running CLI audit ===")
res = subprocess.run(
    [sys.executable, "-m", "license_audit.cli", "audit", "-p", str(DEMO), "--include-dev"],
    cwd=str(ROOT),
    capture_output=True,
    text=True,
)
print("STDIN+STDOUT:")
print(res.stdout)
if res.stderr:
    print("STDERR:")
    print(res.stderr)
print("exit code:", res.returncode)

print("\n=== generated report files ===")
out = DEMO / "license-report"
for p in sorted(out.rglob("*")):
    if p.is_file():
        print(" ", p.relative_to(DEMO), "  (", p.stat().st_size, " bytes)")

print("\n=== dev-report.md (first 80 lines) ===")
md = out / "dev-report.md"
for i, line in enumerate(md.read_text(encoding="utf-8").splitlines()[:80]):
    print(f"{i+1:3}: {line}")

print("\n=== legal-risk-summary.csv ===")
csv_p = out / "legal-risk-summary.csv"
print(csv_p.read_text(encoding="utf-8"))
