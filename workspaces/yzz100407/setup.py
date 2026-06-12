from setuptools import setup, find_packages

setup(
    name="energy-allocation",
    version="1.0.0",
    description="店铺能耗分摊账 - 商场水电费分摊计算工具",
    packages=find_packages(),
    install_requires=[
        "pandas>=2.0.0",
        "openpyxl>=3.1.0",
        "click>=8.1.0",
    ],
    entry_points={
        "console_scripts": [
            "energy-alloc=energy_allocation.cli:cli",
        ],
    },
    python_requires=">=3.9",
)
