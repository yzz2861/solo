#!/usr/bin/env python3
"""
短视频素材授权核对脚本
扫描素材目录、导入授权表和引用清单，按素材ID串联状态，检测异常并生成报告。
"""

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, date
from pathlib import Path


MATERIAL_ID_PATTERN = re.compile(r'^(MAT-\d{6})[-_\s]')
REVIEW_STATE_FILENAME = '.review_state.json'


def parse_args():
    parser = argparse.ArgumentParser(description='短视频素材授权核对工具')
    parser.add_argument('--materials-dir', required=True, help='素材目录路径')
    parser.add_argument('--auth-csv', required=True, help='授权补录CSV文件路径')
    parser.add_argument('--ref-json', required=True, help='成片引用JSON文件路径')
    parser.add_argument('--output-dir', default='./output', help='报告输出目录')
    parser.add_argument('--review', action='store_true', help='进入交互复核模式')
    parser.add_argument('--mark-reviewed', nargs='+', metavar='ANOMALY_ID',
                        help='将指定异常ID标记为已复核')
    parser.add_argument('--today', help='指定核对日期 (YYYY-MM-DD)，默认今天', default=None)
    return parser.parse_args()


def scan_materials(materials_dir):
    materials = {}
    materials_path = Path(materials_dir)
    if not materials_path.exists():
        print(f"[警告] 素材目录不存在: {materials_dir}")
        return materials

    for root, _, files in os.walk(materials_path):
        for filename in files:
            if filename.startswith('.'):
                continue
            match = MATERIAL_ID_PATTERN.match(filename)
            if match:
                mat_id = match.group(1)
            else:
                mat_id = None

            file_path = os.path.join(root, filename)
            rel_path = os.path.relpath(file_path, materials_dir)

            file_info = {
                'filename': filename,
                'relative_path': rel_path,
                'full_path': file_path,
                'size': os.path.getsize(file_path),
                'mtime': os.path.getmtime(file_path),
            }

            if mat_id:
                if mat_id not in materials:
                    materials[mat_id] = []
                materials[mat_id].append(file_info)

    return materials


def load_auth_csv(auth_csv_path):
    auth_records = {}
    if not os.path.exists(auth_csv_path):
        print(f"[警告] 授权CSV文件不存在: {auth_csv_path}")
        return auth_records

    with open(auth_csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mat_id = row.get('素材ID', '').strip()
            if not mat_id:
                continue

            expiry_str = row.get('授权到期日', '').strip()
            expiry_date = None
            if expiry_str:
                for fmt in ('%Y-%m-%d', '%Y/%m/%d', '%Y.%m.%d'):
                    try:
                        expiry_date = datetime.strptime(expiry_str, fmt).date()
                        break
                    except ValueError:
                        continue

            auth_records[mat_id] = {
                'material_id': mat_id,
                'asset_name': row.get('素材名称', '').strip(),
                'source': row.get('授权来源', '').strip(),
                'license_type': row.get('授权类型', '').strip(),
                'expiry_date': expiry_date,
                'expiry_str': expiry_str,
                'authorized_by': row.get('授权人', '').strip(),
                'remark': row.get('备注', '').strip(),
            }

    return auth_records


def load_ref_json(ref_json_path):
    ref_records = {}
    if not os.path.exists(ref_json_path):
        print(f"[警告] 引用JSON文件不存在: {ref_json_path}")
        return ref_records

    with open(ref_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    refs = data.get('references', data) if isinstance(data, dict) else data

    if isinstance(refs, list):
        for item in refs:
            mat_id = item.get('material_id', item.get('素材ID', '')).strip()
            if not mat_id:
                continue
            video_title = item.get('video_title', item.get('成片标题', '')).strip()
            usage = item.get('usage', item.get('使用方式', '')).strip()

            if mat_id not in ref_records:
                ref_records[mat_id] = []
            ref_records[mat_id].append({
                'material_id': mat_id,
                'video_title': video_title,
                'usage': usage,
                'editor': item.get('editor', item.get('剪辑', '')).strip(),
            })
    elif isinstance(refs, dict):
        for mat_id, ref_list in refs.items():
            mat_id = mat_id.strip()
            if not mat_id:
                continue
            if isinstance(ref_list, list):
                ref_records[mat_id] = ref_list

    return ref_records


def detect_filename_mismatch(materials, auth_records):
    mismatches = []
    for mat_id, file_list in materials.items():
        if mat_id not in auth_records:
            continue
        auth_name = auth_records[mat_id].get('asset_name', '')
        if not auth_name:
            continue
        for finfo in file_list:
            filename = finfo['filename']
            base = os.path.splitext(filename)[0]
            id_prefix = mat_id + '-'
            name_part = base[len(id_prefix):] if base.startswith(id_prefix) else base
            if auth_name and name_part and auth_name not in filename and name_part != auth_name:
                mismatches.append({
                    'material_id': mat_id,
                    'filename': filename,
                    'auth_name': auth_name,
                    'relative_path': finfo['relative_path'],
                })
    return mismatches


def detect_anomalies(materials, auth_records, ref_records, today_date):
    anomalies = []
    anomaly_id_counter = 0

    def add_anomaly(anom_type, mat_id, description, detail=None):
        nonlocal anomaly_id_counter
        anomaly_id_counter += 1
        anom_id = f"ANOM-{today_date.strftime('%Y%m%d')}-{anomaly_id_counter:04d}"
        anomalies.append({
            'anomaly_id': anom_id,
            'type': anom_type,
            'material_id': mat_id,
            'description': description,
            'detail': detail or {},
            'detected_at': datetime.now().isoformat(),
        })

    for mat_id, ref_list in ref_records.items():
        if mat_id not in auth_records:
            video_titles = [r.get('video_title', '') for r in ref_list]
            add_anomaly(
                'unauthorized_reference',
                mat_id,
                f"素材 {mat_id} 被成片引用但无授权记录",
                {'referenced_in': video_titles}
            )

    for mat_id, auth in auth_records.items():
        if auth['expiry_date'] and auth['expiry_date'] < today_date:
            refs = ref_records.get(mat_id, [])
            add_anomaly(
                'expired_authorization',
                mat_id,
                f"素材 {mat_id} 授权已过期 ({auth['expiry_str']})",
                {
                    'expiry_date': auth['expiry_str'],
                    'days_expired': (today_date - auth['expiry_date']).days,
                    'referenced_in': [r.get('video_title', '') for r in refs],
                }
            )

    mismatches = detect_filename_mismatch(materials, auth_records)
    for mm in mismatches:
        add_anomaly(
            'filename_mismatch',
            mm['material_id'],
            f"素材 {mm['material_id']} 文件名与授权表名称不一致",
            {
                'filename': mm['filename'],
                'auth_name': mm['auth_name'],
                'relative_path': mm['relative_path'],
            }
        )

    for mat_id, file_list in materials.items():
        if mat_id not in auth_records and mat_id not in ref_records:
            pass
        elif mat_id not in auth_records and mat_id in ref_records:
            pass

    return anomalies


def load_review_state(output_dir):
    state_path = os.path.join(output_dir, REVIEW_STATE_FILENAME)
    if os.path.exists(state_path):
        with open(state_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'reviewed_anomalies': {}, 'history': []}


def save_review_state(output_dir, state):
    os.makedirs(output_dir, exist_ok=True)
    state_path = os.path.join(output_dir, REVIEW_STATE_FILENAME)
    with open(state_path, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def apply_review_state(anomalies, review_state):
    reviewed = review_state.get('reviewed_anomalies', {})
    for anom in anomalies:
        sig = _anomaly_signature(anom)
        if sig in reviewed:
            anom['reviewed'] = True
            anom['review_note'] = reviewed[sig].get('note', '')
            anom['reviewed_at'] = reviewed[sig].get('reviewed_at', '')
        else:
            anom['reviewed'] = False
            anom['review_note'] = ''
            anom['reviewed_at'] = ''
    return anomalies


def _anomaly_signature(anom):
    return f"{anom['type']}|{anom['material_id']}"


def mark_anomalies_reviewed(anomaly_ids, review_state, anomalies):
    reviewed = review_state.setdefault('reviewed_anomalies', {})
    for anom in anomalies:
        if anom['anomaly_id'] in anomaly_ids:
            sig = _anomaly_signature(anom)
            reviewed[sig] = {
                'note': '',
                'reviewed_at': datetime.now().isoformat(),
                'anomaly_id': anom['anomaly_id'],
            }
    return review_state


def generate_markdown_report(materials, auth_records, ref_records,
                              anomalies, output_dir, today_date):
    os.makedirs(output_dir, exist_ok=True)
    report_path = os.path.join(output_dir, 'audit_report.md')

    new_anomalies = [a for a in anomalies if not a['reviewed']]
    reviewed_anomalies = [a for a in anomalies if a['reviewed']]

    unauthorized = [a for a in new_anomalies if a['type'] == 'unauthorized_reference']
    expired = [a for a in new_anomalies if a['type'] == 'expired_authorization']
    mismatched = [a for a in new_anomalies if a['type'] == 'filename_mismatch']

    total_materials = len(materials)
    total_auth = len(auth_records)
    total_ref = len(ref_records)
    total_new_anomalies = len(new_anomalies)

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(f"# 素材授权核对报告\n\n")
        f.write(f"> 核对日期：{today_date.strftime('%Y-%m-%d')}\n\n")

        f.write(f"## 概览\n\n")
        f.write(f"| 指标 | 数量 |\n")
        f.write(f"|------|------|\n")
        f.write(f"| 素材目录文件数（按ID聚合） | {total_materials} |\n")
        f.write(f"| 授权记录数 | {total_auth} |\n")
        f.write(f"| 成片引用素材数 | {total_ref} |\n")
        f.write(f"| **新增异常数** | **{total_new_anomalies}** |\n")
        f.write(f"| 已复核异常数 | {len(reviewed_anomalies)} |\n\n")

        f.write(f"## 异常分类统计\n\n")
        f.write(f"- 🔴 未授权引用：{len(unauthorized)} 条\n")
        f.write(f"- 🟠 授权过期：{len(expired)} 条\n")
        f.write(f"- 🟡 文件名不一致：{len(mismatched)} 条\n\n")

        f.write(f"---\n\n")

        if unauthorized:
            f.write(f"## 🔴 未授权引用\n\n")
            f.write(f"> 被成片引用但在授权表中无记录的素材\n\n")
            for i, a in enumerate(unauthorized, 1):
                refs = a['detail'].get('referenced_in', [])
                ref_str = '、'.join(refs) if refs else '未知'
                f.write(f"### {i}. [{a['anomaly_id']}] {a['material_id']}\n\n")
                f.write(f"- **异常类型**：未授权引用\n")
                f.write(f"- **素材ID**：{a['material_id']}\n")
                f.write(f"- **引用成片**：{ref_str}\n")
                f.write(f"- **检测时间**：{a['detected_at']}\n\n")

        if expired:
            f.write(f"## 🟠 授权过期\n\n")
            f.write(f"> 授权已过期的素材\n\n")
            for i, a in enumerate(expired, 1):
                detail = a['detail']
                refs = detail.get('referenced_in', [])
                ref_str = '、'.join(refs) if refs else '未引用'
                days = detail.get('days_expired', 0)
                f.write(f"### {i}. [{a['anomaly_id']}] {a['material_id']}\n\n")
                f.write(f"- **异常类型**：授权过期\n")
                f.write(f"- **素材ID**：{a['material_id']}\n")
                f.write(f"- **到期日期**：{detail.get('expiry_date', 'N/A')}\n")
                f.write(f"- **已过期天数**：{days} 天\n")
                f.write(f"- **引用成片**：{ref_str}\n\n")

        if mismatched:
            f.write(f"## 🟡 文件名与素材ID不一致\n\n")
            f.write(f"> 素材文件名与授权表中名称不匹配\n\n")
            for i, a in enumerate(mismatched, 1):
                detail = a['detail']
                f.write(f"### {i}. [{a['anomaly_id']}] {a['material_id']}\n\n")
                f.write(f"- **异常类型**：文件名不一致\n")
                f.write(f"- **素材ID**：{a['material_id']}\n")
                f.write(f"- **实际文件名**：{detail.get('filename', 'N/A')}\n")
                f.write(f"- **授权表名称**：{detail.get('auth_name', 'N/A')}\n")
                f.write(f"- **文件路径**：{detail.get('relative_path', 'N/A')}\n\n")

        if not new_anomalies:
            f.write(f"## ✅ 本次无新增异常\n\n")
            f.write(f"所有素材授权状态正常。\n\n")

        if reviewed_anomalies:
            f.write(f"---\n\n")
            f.write(f"## ✅ 已复核异常（{len(reviewed_anomalies)} 条）\n\n")
            f.write(f"> 历史检测且已标记复核的异常，本次不再重复告警\n\n")
            type_map = {
                'unauthorized_reference': '未授权引用',
                'expired_authorization': '授权过期',
                'filename_mismatch': '文件名不一致',
            }
            for a in reviewed_anomalies:
                type_name = type_map.get(a['type'], a['type'])
                f.write(f"- [{a['anomaly_id']}] {a['material_id']} - {type_name} "
                        f"(复核于 {a.get('reviewed_at', '')[:16]})\n")
            f.write(f"\n")

        f.write(f"---\n\n")
        f.write(f"## 素材清单（按ID）\n\n")
        f.write(f"| 素材ID | 入库 | 授权 | 引用 | 状态 |\n")
        f.write(f"|--------|------|------|------|------|\n")

        all_ids = set(materials.keys()) | set(auth_records.keys()) | set(ref_records.keys())
        for mat_id in sorted(all_ids):
            has_material = '✅' if mat_id in materials else '❌'
            has_auth = '✅' if mat_id in auth_records else '❌'
            has_ref = '✅' if mat_id in ref_records else '❌'

            status_parts = []
            if mat_id not in auth_records and mat_id in ref_records:
                status_parts.append('未授权')
            if mat_id in auth_records and auth_records[mat_id]['expiry_date'] \
                    and auth_records[mat_id]['expiry_date'] < today_date:
                status_parts.append('已过期')
            mm = [a for a in mismatched if a['material_id'] == mat_id]
            if mm:
                status_parts.append('文件名不符')

            status = '、'.join(status_parts) if status_parts else '正常'
            f.write(f"| {mat_id} | {has_material} | {has_auth} | {has_ref} | {status} |\n")

        f.write(f"\n---\n\n")
        f.write(f"*报告由素材授权核对脚本自动生成*\n")

    return report_path


def export_anomalies_csv(anomalies, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    csv_path = os.path.join(output_dir, 'anomalies.csv')

    type_map = {
        'unauthorized_reference': '未授权引用',
        'expired_authorization': '授权过期',
        'filename_mismatch': '文件名不一致',
    }

    fieldnames = ['异常ID', '类型', '素材ID', '描述', '详情', '检测时间', '是否已复核', '复核时间']

    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for a in anomalies:
            detail_str = json.dumps(a['detail'], ensure_ascii=False) if a['detail'] else ''
            writer.writerow({
                '异常ID': a['anomaly_id'],
                '类型': type_map.get(a['type'], a['type']),
                '素材ID': a['material_id'],
                '描述': a['description'],
                '详情': detail_str,
                '检测时间': a['detected_at'],
                '是否已复核': '是' if a['reviewed'] else '否',
                '复核时间': a.get('reviewed_at', ''),
            })

    return csv_path


def interactive_review(anomalies, review_state, output_dir):
    new_anomalies = [a for a in anomalies if not a['reviewed']]
    if not new_anomalies:
        print("没有待复核的异常。")
        return review_state

    print(f"\n共 {len(new_anomalies)} 条新增异常待复核。\n")

    type_map = {
        'unauthorized_reference': '未授权引用',
        'expired_authorization': '授权过期',
        'filename_mismatch': '文件名不一致',
    }

    reviewed = review_state.setdefault('reviewed_anomalies', {})

    for i, a in enumerate(new_anomalies, 1):
        print(f"\n--- [{i}/{len(new_anomalies)}] ---")
        print(f"异常ID: {a['anomaly_id']}")
        print(f"类型: {type_map.get(a['type'], a['type'])}")
        print(f"素材ID: {a['material_id']}")
        print(f"描述: {a['description']}")
        print(f"详情: {json.dumps(a['detail'], ensure_ascii=False)}")

        while True:
            choice = input("\n标记为已复核？(y/n/q退出): ").strip().lower()
            if choice == 'y':
                sig = _anomaly_signature(a)
                note = input("复核备注（可留空）: ").strip()
                reviewed[sig] = {
                    'note': note,
                    'reviewed_at': datetime.now().isoformat(),
                    'anomaly_id': a['anomaly_id'],
                }
                a['reviewed'] = True
                a['review_note'] = note
                a['reviewed_at'] = datetime.now().isoformat()
                break
            elif choice == 'n':
                break
            elif choice == 'q':
                save_review_state(output_dir, review_state)
                print("复核进度已保存，退出。")
                sys.exit(0)
            else:
                print("请输入 y/n/q")

    save_review_state(output_dir, review_state)
    print(f"\n复核完成，已复核 {len(reviewed)} 条异常。")
    return review_state


def main():
    args = parse_args()

    today_date = date.today()
    if args.today:
        try:
            today_date = datetime.strptime(args.today, '%Y-%m-%d').date()
        except ValueError:
            print(f"[错误] 日期格式错误: {args.today}，请使用 YYYY-MM-DD")
            sys.exit(1)

    print(f"📅 核对基准日期: {today_date}")

    print("🔍 扫描素材目录...")
    materials = scan_materials(args.materials_dir)
    print(f"   找到 {len(materials)} 个素材ID")

    print("📄 加载授权CSV...")
    auth_records = load_auth_csv(args.auth_csv)
    print(f"   加载 {len(auth_records)} 条授权记录")

    print("📋 加载引用JSON...")
    ref_records = load_ref_json(args.ref_json)
    print(f"   加载 {len(ref_records)} 个被引用素材")

    print("🔎 检测异常...")
    anomalies = detect_anomalies(materials, auth_records, ref_records, today_date)

    print("💾 加载复核状态...")
    review_state = load_review_state(args.output_dir)
    anomalies = apply_review_state(anomalies, review_state)

    new_count = len([a for a in anomalies if not a['reviewed']])
    reviewed_count = len([a for a in anomalies if a['reviewed']])
    print(f"   共 {len(anomalies)} 条异常，其中新增 {new_count} 条，已复核 {reviewed_count} 条")

    if args.mark_reviewed:
        review_state = mark_anomalies_reviewed(args.mark_reviewed, review_state, anomalies)
        save_review_state(args.output_dir, review_state)
        anomalies = apply_review_state(anomalies, review_state)
        print(f"✅ 已标记 {len(args.mark_reviewed)} 条异常为已复核")

    if args.review:
        review_state = interactive_review(anomalies, review_state, args.output_dir)
        save_review_state(args.output_dir, review_state)

    print("📝 生成Markdown报告...")
    report_path = generate_markdown_report(
        materials, auth_records, ref_records, anomalies, args.output_dir, today_date
    )
    print(f"   报告已生成: {report_path}")

    print("📊 导出异常CSV...")
    csv_path = export_anomalies_csv(anomalies, args.output_dir)
    print(f"   CSV已生成: {csv_path}")

    print("\n✅ 核对完成！")


if __name__ == '__main__':
    main()
