#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
容器镜像基线扫描批量处理脚本
- 输入：多来源日志、配置文件、历史基线、输出路径
- 输出：分组报表、坏数据清单、JSON结果、人工复核表
- 特性：时间窗口、分组维度、阈值命中可解释、可追溯编号、重复处理检测
"""

import json
import os
import sys
import re
import hashlib
import csv
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict


def load_config(config_path):
    """加载配置文件"""
    if not os.path.exists(config_path):
        print(f"[ERROR] 配置文件不存在: {config_path}")
        sys.exit(1)
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    return config


def load_baseline(baseline_path):
    """加载历史基线"""
    if not baseline_path:
        return None
    if not os.path.exists(baseline_path):
        print(f"[WARN] 历史基线文件不存在: {baseline_path}，将作为首次运行处理")
        return None
    with open(baseline_path, 'r', encoding='utf-8') as f:
        baseline = json.load(f)
    return baseline


def parse_log_file(log_path, source_name):
    """解析单个日志文件，返回扫描记录列表"""
    records = []
    bad_records = []

    if not os.path.exists(log_path):
        bad_records.append({
            "source": source_name,
            "file": log_path,
            "reason": "文件不存在",
            "raw": ""
        })
        return records, bad_records

    try:
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        bad_records.append({
            "source": source_name,
            "file": log_path,
            "reason": f"文件读取失败: {str(e)}",
            "raw": ""
        })
        return records, bad_records

    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        if not line:
            continue
        if line.startswith('#') or line.startswith('//'):
            continue

        try:
            record = parse_log_line(line, source_name, log_path, line_num)
            if record:
                records.append(record)
            else:
                bad_records.append({
                    "source": source_name,
                    "file": log_path,
                    "line": line_num,
                    "reason": "无法解析的记录格式",
                    "raw": line
                })
        except Exception as e:
            bad_records.append({
                "source": source_name,
                "file": log_path,
                "line": line_num,
                "reason": f"解析异常: {str(e)}",
                "raw": line
            })

    return records, bad_records


def parse_log_line(line, source_name, file_path, line_num):
    """解析单行日志，支持多种格式"""
    record = None

    if line.startswith('{'):
        try:
            data = json.loads(line)
            record = normalize_json_record(data, source_name)
        except json.JSONDecodeError:
            pass
    else:
        record = parse_text_line(line, source_name)

    if record:
        record['_source_file'] = os.path.basename(file_path)
        record['_source_line'] = line_num
        record['_source'] = source_name
        record['_trace_id'] = generate_trace_id(record)
        record['_raw'] = line

    return record


def normalize_json_record(data, source_name):
    """标准化JSON格式记录"""
    image = data.get('image') or data.get('repository') or data.get('image_name') or ''
    tag = data.get('tag') or data.get('image_tag') or 'latest'
    scan_time = data.get('scan_time') or data.get('timestamp') or data.get('time') or ''
    severity = data.get('severity') or data.get('risk_level') or 'unknown'
    vulnerability = data.get('vulnerability') or data.get('cve') or data.get('vuln_id') or ''
    description = data.get('description') or data.get('desc') or ''
    cvss = data.get('cvss') or data.get('cvss_score') or 0.0
    namespace = data.get('namespace') or data.get('project') or data.get('team') or 'default'
    registry = data.get('registry') or data.get('registry_url') or 'default'

    return {
        "image": image,
        "tag": tag,
        "full_image": f"{image}:{tag}" if image else '',
        "scan_time": scan_time,
        "severity": str(severity).lower(),
        "vulnerability": vulnerability,
        "description": description,
        "cvss": float(cvss) if cvss else 0.0,
        "namespace": namespace,
        "registry": registry,
        "source_type": source_name
    }


def parse_text_line(line, source_name):
    """解析文本格式记录（多种分隔符）"""
    patterns = [
        (r'^(?P<time>[\d\- :.TZ]+)\s+(?P<image>\S+)\s+(?P<severity>\w+)\s+(?P<vuln>\S+)\s+(?P<cvss>[\d.]+)\s+(?P<desc>.*)$', 'standard'),
        (r'^(?P<image>\S+)\s*[,|\t]\s*(?P<tag>\S+)\s*[,|\t]\s*(?P<severity>\w+)\s*[,|\t]\s*(?P<vuln>\S+)\s*[,|\t]\s*(?P<time>[\d\- :.TZ]+)', 'csv_like'),
        (r'^\[(?P<severity>\w+)\]\s+(?P<vuln>[\w\-]+)\s+-\s+(?P<image>\S+)\s+-\s+(?P<desc>.+)$', 'bracket_style'),
    ]

    for pattern, style in patterns:
        match = re.match(pattern, line)
        if match:
            groups = match.groupdict()
            image = groups.get('image', '')
            tag = groups.get('tag', 'latest')
            if ':' in image and not groups.get('tag'):
                parts = image.rsplit(':', 1)
                if '/' not in parts[1]:
                    image, tag = parts

            return {
                "image": image,
                "tag": tag,
                "full_image": f"{image}:{tag}",
                "scan_time": groups.get('time', ''),
                "severity": groups.get('severity', 'unknown').lower(),
                "vulnerability": groups.get('vuln', ''),
                "description": groups.get('desc', ''),
                "cvss": float(groups.get('cvss', 0)) if groups.get('cvss') else 0.0,
                "namespace": "default",
                "registry": "default",
                "source_type": source_name
            }

    return None


def generate_trace_id(record):
    """生成可追溯编号"""
    key_parts = [
        record.get('image', ''),
        record.get('tag', ''),
        record.get('vulnerability', ''),
        record.get('scan_time', ''),
        record.get('_source', '')
    ]
    key_str = '|'.join(key_parts)
    hash_val = hashlib.md5(key_str.encode('utf-8')).hexdigest()[:12]
    return f"SCAN-{hash_val.upper()}"


def is_within_time_window(scan_time_str, window_start, window_end):
    """检查扫描时间是否在时间窗口内"""
    if not scan_time_str:
        return True

    scan_time = parse_datetime(scan_time_str)
    if not scan_time:
        return True

    if window_start and scan_time < window_start:
        return False
    if window_end and scan_time > window_end:
        return False

    return True


def parse_datetime(time_str):
    """解析多种时间格式"""
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%dT%H:%M:%S.%fZ',
        '%Y-%m-%d %H:%M:%S.%f',
        '%Y/%m/%d %H:%M:%S',
        '%Y-%m-%d',
    ]
    for fmt in formats:
        try:
            return datetime.strptime(time_str.strip(), fmt)
        except ValueError:
            continue
    return None


def filter_by_time_window(records, config):
    """按时间窗口过滤记录，并返回命中解释"""
    window_config = config.get('time_window', {})
    if not window_config.get('enabled', False):
        return records, "时间窗口未启用，包含全部记录"

    start_str = window_config.get('start')
    end_str = window_config.get('end')
    days = window_config.get('days')

    window_start = None
    window_end = None

    if start_str:
        window_start = parse_datetime(start_str)
    if end_str:
        window_end = parse_datetime(end_str)

    if days and not window_start:
        window_end = window_end or datetime.now()
        window_start = window_end - timedelta(days=days)

    explanation_parts = []
    if window_start:
        explanation_parts.append(f"起始时间: {window_start.strftime('%Y-%m-%d %H:%M:%S')}")
    if window_end:
        explanation_parts.append(f"结束时间: {window_end.strftime('%Y-%m-%d %H:%M:%S')}")

    if not window_start and not window_end:
        return records, "时间窗口配置无效，包含全部记录"

    filtered = []
    for r in records:
        if is_within_time_window(r.get('scan_time', ''), window_start, window_end):
            filtered.append(r)

    explanation = f"时间窗口过滤 [{' | '.join(explanation_parts)}]，保留 {len(filtered)}/{len(records)} 条记录"
    return filtered, explanation


def check_threshold(record, thresholds):
    """检查单条记录是否命中阈值，返回是否命中及命中详情"""
    severity = record.get('severity', '').lower()
    cvss = record.get('cvss', 0.0)

    hits = []

    for threshold in thresholds:
        level = threshold.get('level', '').lower()
        min_cvss = threshold.get('min_cvss', 0)
        label = threshold.get('label', level)

        if severity == level and cvss >= min_cvss:
            hits.append({
                "level": level,
                "label": label,
                "threshold": min_cvss,
                "actual_cvss": cvss,
                "explanation": f"严重级别 '{level}' 且 CVSS={cvss} >= {min_cvss}"
            })

    return len(hits) > 0, hits


def calculate_group_stats(records, thresholds, group_key):
    """计算分组统计数据"""
    total = len(records)
    vuln_images = len(set(r.get('full_image', '') for r in records))
    threshold_hit_records = []
    threshold_hit_details = []

    for r in records:
        is_hit, hits = check_threshold(r, thresholds)
        if is_hit:
            threshold_hit_records.append(r)
            threshold_hit_details.append({
                "trace_id": r.get('_trace_id'),
                "image": r.get('full_image'),
                "vulnerability": r.get('vulnerability'),
                "severity": r.get('severity'),
                "cvss": r.get('cvss'),
                "hits": hits
            })

    severity_counts = defaultdict(int)
    for r in records:
        sev = r.get('severity', 'unknown')
        severity_counts[sev] += 1

    return {
        "group_key": group_key,
        "total_records": total,
        "unique_images": vuln_images,
        "threshold_hit_count": len(threshold_hit_records),
        "threshold_hit_images": len(set(r.get('full_image', '') for r in threshold_hit_records)),
        "severity_distribution": dict(severity_counts),
        "hit_details": threshold_hit_details
    }


def group_records(records, config):
    """按配置的维度分组"""
    group_config = config.get('group_by', ['namespace'])
    thresholds = config.get('thresholds', [])

    groups = defaultdict(list)

    for r in records:
        key_parts = []
        for dim in group_config:
            val = r.get(dim, 'unknown')
            key_parts.append(f"{dim}={val}")
        group_key = ' | '.join(key_parts)
        groups[group_key].append(r)

    group_stats = {}
    for key, group_recs in groups.items():
        group_stats[key] = calculate_group_stats(group_recs, thresholds, key)

    return group_stats, group_config


def generate_dedup_key(record):
    """生成去重键值（基于内容，不依赖来源）"""
    key_parts = [
        record.get('image', ''),
        record.get('tag', ''),
        record.get('vulnerability', ''),
        record.get('scan_time', '')
    ]
    return '|'.join(key_parts)


def check_duplicates(records):
    """检查重复记录（基于内容去重，与来源无关）"""
    seen = {}
    duplicates = []

    for r in records:
        dedup_key = generate_dedup_key(r)
        trace_id = r.get('_trace_id', '')
        if dedup_key in seen:
            first_record = seen[dedup_key]
            duplicates.append({
                "trace_id": first_record.get('_trace_id', ''),
                "image": r.get('full_image'),
                "vulnerability": r.get('vulnerability'),
                "first_source": first_record.get('_source', ''),
                "first_file": first_record.get('_source_file', ''),
                "first_line": first_record.get('_source_line', ''),
                "dup_source": r.get('_source', ''),
                "dup_file": r.get('_source_file', ''),
                "dup_line": r.get('_source_line', '')
            })
        else:
            seen[dedup_key] = r

    unique_records = list(seen.values())
    return unique_records, duplicates


def compare_with_baseline(records, baseline, config):
    """与历史基线比较，生成新增/消失/持续的风险"""
    if not baseline:
        return records, {
            "new_risks": [],
            "resolved_risks": [],
            "persistent_risks": [],
            "explanation": "无历史基线数据，跳过基线对比"
        }

    baseline_items = baseline.get('risk_items', [])
    baseline_keys = set()
    for item in baseline_items:
        key = f"{item.get('image', '')}|{item.get('vulnerability', '')}"
        baseline_keys.add(key)

    current_keys = set()
    current_map = {}
    for r in records:
        key = f"{r.get('image', '')}|{r.get('vulnerability', '')}"
        current_keys.add(key)
        current_map[key] = r

    new_keys = current_keys - baseline_keys
    resolved_keys = baseline_keys - current_keys
    persistent_keys = current_keys & baseline_keys

    new_risks = [current_map[k] for k in new_keys if k in current_map]
    persistent_risks = [current_map[k] for k in persistent_keys if k in current_map]

    comparison = {
        "new_risks": [
            {
                "image": r.get('full_image'),
                "vulnerability": r.get('vulnerability'),
                "severity": r.get('severity'),
                "cvss": r.get('cvss'),
                "trace_id": r.get('_trace_id'),
                "explanation": f"基线对比为新增风险: {r.get('full_image')} - {r.get('vulnerability')}"
            }
            for r in new_risks
        ],
        "resolved_risks": [
            {
                "image": item.get('image'),
                "vulnerability": item.get('vulnerability'),
                "severity": item.get('severity'),
                "explanation": f"基线对比为已修复风险: {item.get('image')} - {item.get('vulnerability')}"
            }
            for item in baseline_items
            if f"{item.get('image', '')}|{item.get('vulnerability', '')}" in resolved_keys
        ],
        "persistent_risks": [
            {
                "image": r.get('full_image'),
                "vulnerability": r.get('vulnerability'),
                "severity": r.get('severity'),
                "cvss": r.get('cvss'),
                "trace_id": r.get('_trace_id'),
                "explanation": f"基线对比为持续存在风险: {r.get('full_image')} - {r.get('vulnerability')}"
            }
            for r in persistent_risks
        ],
        "explanation": (
            f"基线对比完成: 新增 {len(new_keys)} 项, "
            f"已修复 {len(resolved_keys)} 项, "
            f"持续存在 {len(persistent_keys)} 项"
        )
    }

    return records, comparison


def generate_conclusion(group_stats, comparison, config):
    """生成结论"""
    total_hits = sum(s['threshold_hit_count'] for s in group_stats.values())
    total_images = sum(s['unique_images'] for s in group_stats.values())
    threshold_config = config.get('thresholds', [])
    high_risk_levels = [t.get('label', t.get('level')) for t in threshold_config if t.get('level', '').lower() in ('critical', 'high')]

    risk_level = "合规"
    if total_hits > 0:
        risk_level = "存在风险"

    has_high_risk = any(
        hit.get('severity', '').lower() in ('critical', 'high')
        for s in group_stats.values()
        for hit in s.get('hit_details', [])
    )
    if has_high_risk:
        risk_level = "高风险"

    conclusion = {
        "overall_risk_level": risk_level,
        "total_groups": len(group_stats),
        "total_vulnerabilities": sum(s['total_records'] for s in group_stats.values()),
        "total_images": total_images,
        "total_threshold_hits": total_hits,
        "threshold_hit_images": sum(s['threshold_hit_images'] for s in group_stats.values()),
        "baseline_comparison": comparison.get('explanation', ''),
        "new_risks_count": len(comparison.get('new_risks', [])),
        "resolved_risks_count": len(comparison.get('resolved_risks', [])),
        "persistent_risks_count": len(comparison.get('persistent_risks', [])),
        "recommendations": []
    }

    if risk_level == "高风险":
        conclusion["recommendations"].append("立即处置高危漏洞，暂停相关镜像发布")
    elif risk_level == "存在风险":
        conclusion["recommendations"].append("安排在版本迭代中修复中低危漏洞")
    else:
        conclusion["recommendations"].append("继续保持当前安全基线")

    if comparison.get('new_risks'):
        conclusion["recommendations"].append("关注新增风险，评估引入原因")
    if comparison.get('persistent_risks'):
        conclusion["recommendations"].append("跟进持续风险，制定修复计划")

    return conclusion


def write_json_output(output_path, result):
    """输出JSON结果文件"""
    os.makedirs(output_path, exist_ok=True)
    output_file = os.path.join(output_path, 'scan_result.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    return output_file


def write_group_report(output_path, group_stats, group_config):
    """输出分组报表（CSV格式）"""
    os.makedirs(output_path, exist_ok=True)
    output_file = os.path.join(output_path, 'group_report.csv')

    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            '分组维度', '分组键值', '漏洞总数', '受影响镜像数',
            '阈值命中数', '阈值命中镜像数', '严重级别分布'
        ])
        group_dims = ', '.join(group_config)
        for key, stats in group_stats.items():
            sev_dist = '; '.join([f"{k}:{v}" for k, v in stats['severity_distribution'].items()])
            writer.writerow([
                group_dims,
                key,
                stats['total_records'],
                stats['unique_images'],
                stats['threshold_hit_count'],
                stats['threshold_hit_images'],
                sev_dist
            ])
    return output_file


def write_bad_data_report(output_path, bad_records):
    """输出坏数据清单"""
    os.makedirs(output_path, exist_ok=True)
    output_file = os.path.join(output_path, 'bad_data_list.csv')

    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['来源', '文件', '行号', '异常原因', '原始内容'])
        for rec in bad_records:
            writer.writerow([
                rec.get('source', ''),
                rec.get('file', ''),
                rec.get('line', ''),
                rec.get('reason', ''),
                rec.get('raw', '')
            ])
    return output_file


def write_review_table(output_path, group_stats, comparison, config):
    """输出人工复核表"""
    os.makedirs(output_path, exist_ok=True)
    output_file = os.path.join(output_path, 'manual_review_table.csv')

    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            '追溯编号', '分组', '镜像', '漏洞ID', '严重级别',
            'CVSS分数', '阈值命中说明', '基线状态', '描述', '复核状态', '复核人', '备注'
        ])

        new_risk_map = {}
        persistent_risk_map = {}
        for r in comparison.get('new_risks', []):
            new_risk_map[r['trace_id']] = True
        for r in comparison.get('persistent_risks', []):
            persistent_risk_map[r['trace_id']] = True

        for group_key, stats in group_stats.items():
            for hit in stats.get('hit_details', []):
                trace_id = hit['trace_id']
                hit_explanations = '; '.join([h['explanation'] for h in hit['hits']])

                baseline_status = "无变化"
                if trace_id in new_risk_map:
                    baseline_status = "新增"
                elif trace_id in persistent_risk_map:
                    baseline_status = "持续"

                writer.writerow([
                    trace_id,
                    group_key,
                    hit['image'],
                    hit['vulnerability'],
                    hit['severity'],
                    hit['cvss'],
                    hit_explanations,
                    baseline_status,
                    '',
                    '待复核',
                    '',
                    ''
                ])
    return output_file


def write_duplicates_report(output_path, duplicates):
    """输出重复记录报告"""
    if not duplicates:
        return None
    os.makedirs(output_path, exist_ok=True)
    output_file = os.path.join(output_path, 'duplicates_list.csv')

    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            '追溯编号', '镜像', '漏洞',
            '首次来源', '首次文件', '首次行号',
            '重复来源', '重复文件', '重复行号'
        ])
        for d in duplicates:
            writer.writerow([
                d['trace_id'],
                d['image'],
                d['vulnerability'],
                d['first_source'],
                d['first_file'],
                d['first_line'],
                d['dup_source'],
                d['dup_file'],
                d['dup_line']
            ])
    return output_file


def run_scan(config_path, output_path, log_sources=None, baseline_path=None):
    """主扫描流程"""
    print("=" * 60)
    print("容器镜像基线扫描批量处理脚本")
    print("=" * 60)

    config = load_config(config_path)
    print(f"[INFO] 配置文件已加载: {config_path}")

    baseline = load_baseline(baseline_path) if baseline_path else None
    if baseline:
        print(f"[INFO] 历史基线已加载: {baseline_path}")
    else:
        print("[INFO] 无历史基线数据")

    if log_sources is None:
        log_sources = config.get('log_sources', [])

    if not log_sources:
        print("[ERROR] 未配置任何日志来源")
        sys.exit(1)

    all_records = []
    all_bad_records = []

    for source in log_sources:
        source_name = source.get('name', 'unknown')
        source_path = source.get('path', '')
        source_type = source.get('type', 'file')

        print(f"[INFO] 正在解析来源 [{source_name}]: {source_path}")

        if source_type == 'dir' or os.path.isdir(source_path):
            if os.path.isdir(source_path):
                for fname in sorted(os.listdir(source_path)):
                    fpath = os.path.join(source_path, fname)
                    if os.path.isfile(fpath) and (fname.endswith('.log') or fname.endswith('.txt') or fname.endswith('.json')):
                        recs, bads = parse_log_file(fpath, source_name)
                        all_records.extend(recs)
                        all_bad_records.extend(bads)
            else:
                all_bad_records.append({
                    "source": source_name,
                    "file": source_path,
                    "reason": "目录不存在",
                    "raw": ""
                })
        else:
            recs, bads = parse_log_file(source_path, source_name)
            all_records.extend(recs)
            all_bad_records.extend(bads)

    print(f"[INFO] 原始解析: {len(all_records)} 条有效记录, {len(all_bad_records)} 条坏数据")

    unique_records, duplicates = check_duplicates(all_records)
    print(f"[INFO] 去重后: {len(unique_records)} 条唯一记录, 发现 {len(duplicates)} 条重复")

    filtered_records, time_explanation = filter_by_time_window(unique_records, config)
    print(f"[INFO] 时间窗口过滤: {time_explanation}")

    group_stats, group_config = group_records(filtered_records, config)
    print(f"[INFO] 分组维度: {group_config}, 分组数量: {len(group_stats)}")

    _, baseline_comparison = compare_with_baseline(filtered_records, baseline, config)
    print(f"[INFO] {baseline_comparison.get('explanation', '')}")

    conclusion = generate_conclusion(group_stats, baseline_comparison, config)
    print(f"[INFO] 整体风险等级: {conclusion['overall_risk_level']}")

    result = {
        "scan_time": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "config_path": config_path,
        "baseline_path": baseline_path,
        "output_path": output_path,
        "summary": conclusion,
        "group_dimensions": group_config,
        "group_stats": {k: {kk: vv for kk, vv in v.items() if kk != 'hit_details'} for k, v in group_stats.items()},
        "time_window_explanation": time_explanation,
        "baseline_comparison": baseline_comparison,
        "bad_data_count": len(all_bad_records),
        "duplicate_count": len(duplicates),
        "trace_ids_sample": [r.get('_trace_id') for r in filtered_records[:5]]
    }

    json_file = write_json_output(output_path, result)
    print(f"[OK] JSON结果已输出: {json_file}")

    group_file = write_group_report(output_path, group_stats, group_config)
    print(f"[OK] 分组报表已输出: {group_file}")

    bad_file = write_bad_data_report(output_path, all_bad_records)
    print(f"[OK] 坏数据清单已输出: {bad_file}")

    review_file = write_review_table(output_path, group_stats, baseline_comparison, config)
    print(f"[OK] 人工复核表已输出: {review_file}")

    dup_file = write_duplicates_report(output_path, duplicates)
    if dup_file:
        print(f"[OK] 重复记录清单已输出: {dup_file}")

    print("=" * 60)
    print("扫描处理完成")
    print("=" * 60)

    return result


def main():
    import argparse

    parser = argparse.ArgumentParser(description='容器镜像基线扫描批量处理脚本')
    parser.add_argument('-c', '--config', required=True, help='配置文件路径')
    parser.add_argument('-o', '--output', required=True, help='输出目录路径')
    parser.add_argument('-b', '--baseline', default=None, help='历史基线文件路径')
    parser.add_argument('--log-source', action='append', default=None,
                        help='指定日志来源 (name:path:type)，可多次使用')

    args = parser.parse_args()

    log_sources = None
    if args.log_source:
        log_sources = []
        for src in args.log_source:
            parts = src.split(':', 2)
            source = {'name': parts[0], 'path': parts[1] if len(parts) > 1 else ''}
            if len(parts) > 2:
                source['type'] = parts[2]
            log_sources.append(source)

    run_scan(
        config_path=args.config,
        output_path=args.output,
        log_sources=log_sources,
        baseline_path=args.baseline
    )


if __name__ == '__main__':
    main()
