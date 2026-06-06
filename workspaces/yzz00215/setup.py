from setuptools import setup, find_packages

setup(
    name='notary-checklist',
    version='1.0.0',
    description='公证材料清单CLI工具 - 支持校验、生成、导出和查看摘要',
    packages=find_packages(),
    install_requires=[
        'click>=8.1.0',
        'pandas>=2.0.0',
        'openpyxl>=3.1.0',
        'PyYAML>=6.0',
        'jinja2>=3.1.0',
    ],
    entry_points={
        'console_scripts': [
            'notary-checklist=notary_checklist.cli:cli',
        ],
    },
    python_requires='>=3.9',
)
