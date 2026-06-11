from setuptools import setup, find_packages

setup(
    name="vaccine-cli",
    version="1.0.0",
    description="兽医院疫苗冰箱记录管理系统",
    packages=find_packages(),
    install_requires=[
        "click>=8.1.0",
        "tabulate>=0.9.0",
        "python-dateutil>=2.8.2",
    ],
    entry_points={
        "console_scripts": [
            "vaccine-cli=vaccine_cli.cli:cli",
        ],
    },
    python_requires=">=3.8",
)
