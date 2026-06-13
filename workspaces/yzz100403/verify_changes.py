#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""验证脚本 - 检查新增功能是否正常工作"""

import json
import glob

report_files = glob.glob('reports/audit_report_*.json')
if not report_files:
    print("未找到报告文件，请先运行 permission_audit.py")
    exit(1)

with open(report_files[0], 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=" * 60)
print("验证新增功能")
print("=" * 60)

print("\n1. 风险类型统计")
print("-" * 40)
type_counts = {}
for item in data['fix_order']:
    for risk in item['risks']:
        t = risk['type']
        type_counts[t] = type_counts.get(t, 0) + 1
for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
    print(f"  {t}: {c}")

print("\n2. unowned_folder (无人负责文件夹)")
print("-" * 40)
unowned_count = 0
for item in data['fix_order']:
    for risk in item['risks']:
        if risk['type'] == 'unowned_folder':
            unowned_count += 1
            print(f"  [{risk['level']}] {item['path'][-60:]}")
            print(f"         {risk['detail'][:80]}")
print(f"\n无人负责文件夹总数: {unowned_count}")
if unowned_count > 0:
    print("✅ unowned_folder 检测正常")
else:
    print("❌ unowned_folder 未检测到任何风险")

print("\n3. permission_missing (权限信息缺失)")
print("-" * 40)
perm_missing_count = 0
for item in data['fix_order']:
    for risk in item['risks']:
        if risk['type'] == 'permission_missing':
            perm_missing_count += 1
            is_confirm = risk.get('confirmation_required', False)
            print(f"  [{risk['level']}] {item['path'][-60:]}")
            print(f"         待确认: {is_confirm}")
            print(f"         {risk['detail'][:80]}")
print(f"\n权限缺失项总数: {perm_missing_count}")
if perm_missing_count > 0:
    print("✅ permission_missing 检测正常")
else:
    print("❌ permission_missing 未检测到任何风险")

print("\n4. 待确认项统计")
print("-" * 40)
confirm_count = 0
confirm_types = {}
for item in data['fix_order']:
    for risk in item['risks']:
        if risk.get('confirmation_required'):
            confirm_count += 1
            t = risk['type']
            confirm_types[t] = confirm_types.get(t, 0) + 1

for t, c in sorted(confirm_types.items(), key=lambda x: -x[1]):
    print(f"  {t}: {c}")
print(f"\n待确认项总数: {confirm_count}")

has_perm_missing = 'permission_missing' in confirm_types
if has_perm_missing:
    print("✅ permission_missing 已纳入待确认项")
else:
    print("❌ permission_missing 未纳入待确认项")

print("\n5. 报告文件检查")
print("-" * 40)
import os
summary_files = glob.glob('reports/audit_summary_*.md')
fix_files = glob.glob('reports/fix_order_*.md')
dept_dirs = glob.glob('reports/by_department_*')
json_files = glob.glob('reports/audit_report_*.json')

print(f"  摘要报告: {'✅' if summary_files else '❌'} ({len(summary_files)} 个)")
print(f"  修复顺序报告: {'✅' if fix_files else '❌'} ({len(fix_files)} 个)")
print(f"  部门报告目录: {'✅' if dept_dirs else '❌'} ({len(dept_dirs)} 个)")
print(f"  JSON 报告: {'✅' if json_files else '❌'} ({len(json_files)} 个)")

print("\n" + "=" * 60)
print("验证完成")
print("=" * 60)
