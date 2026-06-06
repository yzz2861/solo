import json
import csv

def main():
    with open('output/inspection_results.json', 'r') as f:
        data = json.load(f)

    final_summary = data['final_summary']
    print('=== JSON 最终摘要 ===')
    print('总组数:', final_summary['total_groups'])
    print('高风险:', final_summary['high_risk'])
    print('中风险:', final_summary['medium_risk'])
    print('低风险:', final_summary['low_risk'])
    print('无法判定:', final_summary['undetermined'])
    print('需复核:', final_summary['needs_review'])
    print()

    print('=== 分组报表统计 ===')
    report_levels = {}
    report_groups = {}
    with open('output/group_report.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            level = row.get('风险等级(英文)', '')
            report_levels[level] = report_levels.get(level, 0) + 1
            group_key = '|'.join([row.get('tunnel_id', ''), row.get('direction', ''), row.get('lighting_zone', '')])
            report_groups[group_key] = row
    for level in ['high', 'medium', 'low', 'undetermined']:
        print(f'{level}: {report_levels.get(level, 0)}')
    print()

    print('=== 人工复核表统计 ===')
    review_count = 0
    review_levels = {}
    with open('output/manual_review_list.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            review_count += 1
            level = row.get('风险等级', '')
            review_levels[level] = review_levels.get(level, 0) + 1
    print('总复核数:', review_count)
    for level, count in sorted(review_levels.items()):
        print(f'  {level}: {count}')
    print()

    print('=== 验证 undetermined 分组详情 ===')
    undetermined_groups = final_summary.get('undetermined_groups', [])
    if undetermined_groups:
        gkey = undetermined_groups[0]
        print(f'分组: {gkey}')
        report_row = report_groups.get(gkey, {})
        print(f'  报表中的风险等级: {report_row.get("风险等级", "")}')
        print(f'  报表中的原因: {report_row.get("主要原因", "")}')
        print(f'  报表中的记录数: {report_row.get("记录数", "")}')
        print(f'  是否需复核: {report_row.get("是否需复核", "")}')

        for wkey, wdata in data['windows'].items():
            groups = wdata.get('groups', {})
            if gkey in groups:
                gdata = groups[gkey]
                print(f'  JSON 中风险等级: {gdata.get("risk_level_cn", "")}')
                print(f'  JSON 中原因: {gdata.get("reasons", [])}')
                print(f'  JSON 中数据充足性问题: {gdata.get("data_adequacy", {}).get("issues", [])}')
                print(f'  JSON 中历史轨迹窗口数: {len(gdata.get("history_trace", []))}')
                break

    print()
    print('=== 四类风险状态验证 ===')
    all_levels = set(final_summary.keys())
    has_all = all(level in report_levels for level in ['high', 'medium', 'low', 'undetermined'])
    print('四类状态全部覆盖:', has_all)

    json_count = sum([final_summary['high_risk'], final_summary['medium_risk'], final_summary['low_risk'], final_summary['undetermined']])
    report_count = sum(report_levels.values())
    print(f'JSON 总数: {json_count}, 报表总数: {report_count}, 一致: {json_count == report_count}')

if __name__ == '__main__':
    main()
