from setuptools import setup, find_packages

setup(
    name="qc-ledger",
    version="1.0.0",
    description="质检不合格台账 CLI 工具",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "click>=8.0.0",
        "pandas>=2.0.0",
        "openpyxl>=3.1.0",
        "tabulate>=0.9.0",
    ],
    entry_points={
        "console_scripts": [
            "qc-ledger=qc_ledger.cli:main",
        ],
    },
)
