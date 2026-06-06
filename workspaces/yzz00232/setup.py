from setuptools import setup, find_packages

setup(
    name="bus-lost-found",
    version="1.0.0",
    description="公交失物招领归档CLI工具",
    packages=find_packages(),
    install_requires=[
        "click>=8.0.0",
    ],
    entry_points={
        "console_scripts": [
            "bus-lost-found=lost_found.cli:main",
        ],
    },
    python_requires=">=3.8",
)
