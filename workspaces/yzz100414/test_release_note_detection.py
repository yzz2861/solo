#!/usr/bin/env python3
from config import config

test_cases = [
    ('RELEASE_NOTE.md', True, '标准英文发布说明'),
    ('release-notes.txt', True, '横杠分隔的英文'),
    ('CHANGELOG.rst', True, '更新日志'),
    ('ChangeLog.md', True, '大小写混合'),
    ('README.md', True, 'README文件'),
    ('版本说明.md', True, '中文版本说明'),
    ('发布说明.md', True, '中文发布说明'),
    ('更新说明.txt', True, '中文更新说明'),
    ('version.txt', False, '只有version'),
    ('VERSION', False, '纯VERSION无后缀'),
    ('version_history.md', False, '含history的被排除'),
    ('.version_align_history.json', False, '历史记录文件'),
    ('config.yaml', False, '配置文件'),
    ('app-release-notes.md', True, '中间带release-notes的'),
]

print('发布说明识别验证:')
print('-' * 60)
all_pass = True
for filename, expected, desc in test_cases:
    actual = config.is_release_note(filename)
    status = 'PASS' if actual == expected else 'FAIL'
    if actual != expected:
        all_pass = False
    print(f'  [{status}] {filename:35s} ({desc})')

print()
print(f'测试结果: {"全部通过" if all_pass else "有失败"}')
