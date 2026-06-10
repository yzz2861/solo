"""最终一致性校验：HTML报告 vs CSV明细"""
import re
import pandas as pd

merged = pd.read_csv('output/merged_detail.csv')
wave_summary = pd.read_csv('output/wave_summary.csv')
anomalies = pd.read_csv('output/all_anomalies.csv')

with open('output/report.html', 'r', encoding='utf-8') as f:
    html = f.read()

all_match = True

def check(name, report_val, expected_val):
    global all_match
    ok = report_val == expected_val
    status = 'PASS' if ok else 'FAIL'
    if not ok:
        all_match = False
    print(f'  [{status}] {name}: 报告={report_val}, 数据={expected_val}')

print('=== 1. 汇总卡片校验 ===')

card_pattern = r'<div class="card[^"]*">\s*<div class="label">([^<]+)</div>\s*<div class="value">([^<]+)</div>'
cards = dict(re.findall(card_pattern, html))

check('波次总数', cards.get('波次总数', ''), str(len(wave_summary)))
check('SKU行数', cards.get('SKU行数', ''), str(len(merged)))
check('拣货完成率', cards.get('拣货完成率', ''), f"{(merged['qty_picked'].sum() / merged['qty_expected'].sum() * 100):.2f}%")
check('最终履约率', cards.get('最终履约率', ''), f"{((merged['qty_expected'].sum() - merged['qty_final_short'].sum()) / merged['qty_expected'].sum() * 100):.2f}%")
check('短拣行数', cards.get('短拣行数', ''), str((merged['qty_short'] > 0).sum()))
check('未补发行数', cards.get('未补发行数', ''), str((merged['qty_final_short'] > 0).sum()))

print()
print('=== 2. 整体数据概览表校验 ===')

overview_pattern = r'<th>应拣总数</th>[\s\S]*?<th>实拣总数</th>[\s\S]*?<th>短拣总数</th>[\s\S]*?<th>已补发</th>[\s\S]*?<th>最终短拣</th>[\s\S]*?<tr>[\s\S]*?<td><strong>数量</strong></td>([\s\S]*?)</tr>'
m = re.search(overview_pattern, html)
if m:
    row_html = m.group(1)
    nums = re.findall(r'<td[^>]*>([^<]+)</td>', row_html)
    nums = [n.replace(',', '').replace('<strong style="color:#ff4d4f">', '').replace('</strong>', '') for n in nums]
    
    expected_vals = [
        str(merged['qty_expected'].sum()),
        str(merged['qty_picked'].sum()),
        str(merged['qty_short'].sum()),
        str(merged['qty_supplemented'].sum()),
        str(merged['qty_final_short'].sum()),
    ]
    labels = ['应拣总数', '实拣总数', '短拣总数', '已补发', '最终短拣']
    
    for label, report_val, expected_val in zip(labels, nums, expected_vals):
        check(label, report_val, expected_val)
else:
    print('  [SKIP] 未找到整体数据概览表')

print()
print('=== 3. 异常数量校验 ===')

anomaly_checks = [
    ('短拣未补', 'short_not_supplemented'),
    ('复核人不一致', 'reviewer_inconsistent'),
    ('SKU跨波次重复', 'sku_cross_wave'),
    ('超拣', 'over_pick'),
]

for display_name, _ in anomaly_checks:
    csv_count = len(anomalies[anomalies['anomaly_type'] == display_name])
    pattern = re.escape(display_name) + r'\s*<span class="anomaly-count">(\d+)\s*条</span>'
    m = re.search(pattern, html)
    if m:
        report_count = int(m.group(1))
        check(display_name, str(report_count) + '条', str(csv_count) + '条')
    else:
        print(f'  [SKIP] {display_name}: 未找到')

print()
print('=== 4. 波次明细表校验 ===')

wave_rows = re.findall(r'<tr>\s*<td>(W\d+)</td>\s*<td>(\d+)</td>\s*<td>([\d,]+)</td>\s*<td>([\d,]+)</td>\s*<td>([^<]+)</td>\s*<td>[^>]*>([^<]+)</span></td>', html)

if wave_rows:
    print(f'  找到 {len(wave_rows)} 个波次')
    
    total_expected_report = sum(int(r[2].replace(',', '')) for r in wave_rows)
    total_expected_csv = wave_summary['total_expected'].sum()
    check('波次表应拣合计', str(total_expected_report), str(total_expected_csv))
    
    total_picked_report = sum(int(r[3].replace(',', '')) for r in wave_rows)
    total_picked_csv = wave_summary['total_picked'].sum()
    check('波次表实拣合计', str(total_picked_report), str(total_picked_csv))
else:
    print('  [SKIP] 未解析到波次明细行')

print()
print('=' * 50)
print(f'  数据一致性校验结果: {"全部通过 ✓" if all_match else "存在不一致 ✗"}')
print('=' * 50)
