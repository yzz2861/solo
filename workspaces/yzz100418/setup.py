from setuptools import setup, find_packages

setup(
    name="study-abroad-checklist",
    version="0.1.0",
    description="留学材料清点器 - 帮你快速检查申请材料是否齐全",
    author="Study Abroad Tools",
    packages=find_packages(),
    include_package_data=True,
    package_data={
        "study_abroad_checklist": ["templates/*.yaml"],
    },
    install_requires=[
        "click>=8.0",
        "PyYAML>=6.0",
    ],
    entry_points={
        "console_scripts": [
            "study-check=study_abroad_checklist.cli:main",
        ],
    },
    python_requires=">=3.8",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
