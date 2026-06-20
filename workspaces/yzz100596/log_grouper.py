#!/usr/bin/env python3

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

RE_UUID = re.compile(
    r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
)
RE_NUMERIC_ID = re.compile(r'(?<=/)\d{2,}(?=[/?\s]|$)')
RE_QUERY_STRING = re.compile(r'\?.*$')
RE_HEX_ID = re.compile(r'(?<=/)0x[0-9a-fA-F]+(?=[/?\s]|$)')

RE_ISO_TS = re.compile(
    r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?'
)
RE_BRACKET_TS = re.compile(r'\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]')
RE_SYSLOG_TS = re.compile(r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})')

RE_ERROR_CODE_PATTERNS = [
    re.compile(r'(?:error_code|errcode|err_code|errorCode)\s*[=:]\s*["\']?(\w+)["\']?', re.I),
    re.compile(r'(?:code|status)\s*[=:]\s*["\']?(\d{3,})["\']?', re.I),
    re.compile(r'\b(ERR_[A-Z0-9_]+)\b'),
    re.compile(r'\b(E\d{4,6})\b'),
    re.compile(r'\bERROR\s+(\d{3,})\b'),
]

RE_PATH_PATTERNS = [
    re.compile(r'(?:path|uri|url|request_path|endpoint)\s*[=:]\s*["\']([^"\']+)["\']', re.I),
    re.compile(r'(?:GET|POST|PUT|DELETE|PATCH)\s+(/\S+)'),
    re.compile(r'["\'](/[^\s"\']+)["\']'),
    re.compile(r'(?<=[\s=])(/api/[^\s"\',;]+)'),
    re.compile(r'(?<=[\s=])(/[^\s"\',;]*(?:login|health|charge|order|payment|user|session|callback|webhook|admin)[^\s"\',;]*)', re.I),
]

RE_SERVICE_PATTERNS = [
    re.compile(r'(?:service|app|service_name|application|component)\s*[=:]\s*["\']?([\w-]+)["\']?', re.I),
    re.compile(r'\[([\w-]+)/(?:[\w-]+)\]'),
    re.compile(r'^([\w-]+)\s+\[', re.MULTILINE),
]

JSON_TS_FIELDS = [
    '@timestamp', 'timestamp', 'time', 'datetime', 'ts',
    'created_at', 'log_time', 'date',
]
JSON_CODE_FIELDS = [
    'error_code', 'errcode', 'err_code', 'errorCode', 'code',
    'status', 'status_code', 'error.status',
]
JSON_PATH_FIELDS = [
    'path', 'uri', 'url', 'request_path', 'endpoint',
    'request.uri', 'request.path',
]
JSON_SERVICE_FIELDS = [
    'service', 'app', 'service_name', 'application',
    'component', 'source', 'logger_name',
]
JSON_MSG_FIELDS = ['message', 'msg', 'log', 'text', 'body']


def normalize_path(raw_path):
    if not raw_path:
        return ''
    p = RE_QUERY_STRING.sub('', raw_path)
    p = RE_UUID.sub('{uuid}', p)
    p = RE_HEX_ID.sub('{id}', p)
    p = RE_NUMERIC_ID.sub('{id}', p)
    p = re.sub(r'/+', '/', p)
    p = p.rstrip('/')
    if not p.startswith('/'):
        p = '/' + p
    return p


def parse_timestamp(ts_str):
    if not ts_str:
        return None
    for fmt in (
        '%Y-%m-%dT%H:%M:%S.%fZ',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%dT%H:%M:%S.%f%z',
        '%Y-%m-%dT%H:%M:%S%z',
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d %H:%M:%S.%f',
        '%Y-%m-%d %H:%M:%S',
    ):
        try:
            return datetime.strptime(ts_str.strip(), fmt)
        except (ValueError, TypeError):
            continue
    return None


def extract_from_json(line):
    try:
        obj = json.loads(line)
    except (json.JSONDecodeError, ValueError):
        return None

    if not isinstance(obj, dict):
        return None

    ts = None
    for field in JSON_TS_FIELDS:
        val = _deep_get(obj, field)
        if val:
            ts = parse_timestamp(str(val))
            if ts:
                break

    error_code = None
    for field in JSON_CODE_FIELDS:
        val = _deep_get(obj, field)
        if val is not None and str(val) not in ('0', '200', 'OK', 'ok', 'success', 'null', ''):
            error_code = str(val)
            break

    raw_path = None
    for field in JSON_PATH_FIELDS:
        val = _deep_get(obj, field)
        if val:
            raw_path = str(val)
            break

    service = None
    for field in JSON_SERVICE_FIELDS:
        val = _deep_get(obj, field)
        if val:
            service = str(val)
            break

    message = None
    for field in JSON_MSG_FIELDS:
        val = _deep_get(obj, field)
        if val:
            message = str(val)
            break

    if error_code is None and message:
        for pat in RE_ERROR_CODE_PATTERNS:
            m = pat.search(message)
            if m:
                error_code = m.group(1)
                break

    level = ''
    for lf in ('level', 'severity', 'loglevel', 'lvl'):
        val = _deep_get(obj, lf)
        if val:
            level = str(val).upper()
            break

    is_error = False
    if error_code:
        is_error = True
    elif level in ('ERROR', 'ERR', 'FATAL', 'CRITICAL', 'SEVERE'):
        is_error = True
    elif isinstance(_deep_get(obj, 'status'), (int, str)):
        status = _deep_get(obj, 'status')
        try:
            if int(status) >= 400:
                is_error = True
                if not error_code:
                    error_code = str(status)
        except (ValueError, TypeError):
            pass

    if not is_error:
        return None

    if not error_code:
        error_code = level or 'UNKNOWN'

    return {
        'timestamp': ts,
        'error_code': error_code,
        'raw_path': raw_path,
        'normalized_path': normalize_path(raw_path) if raw_path else '',
        'service': service or '',
        'message': message or '',
        'raw_line': line.rstrip('\n'),
    }


def extract_from_text(line):
    if not line.strip():
        return None

    ts = None
    m = RE_BRACKET_TS.search(line)
    if m:
        ts = parse_timestamp(m.group(1))
    if not ts:
        m = RE_ISO_TS.search(line)
        if m:
            ts = parse_timestamp(m.group(0))
    if not ts:
        m = RE_SYSLOG_TS.search(line)
        if m:
            ts = parse_timestamp(m.group(1))

    error_code = None
    for pat in RE_ERROR_CODE_PATTERNS:
        m = pat.search(line)
        if m:
            error_code = m.group(1)
            break

    is_error_level = bool(re.search(r'\b(ERROR|FATAL|CRITICAL|SEVERE|ERR)\b', line, re.I))
    if not error_code and not is_error_level:
        return None

    if not error_code:
        error_code = 'ERROR'

    raw_path = None
    for pat in RE_PATH_PATTERNS:
        m = pat.search(line)
        if m:
            raw_path = m.group(1)
            break

    service = None
    for pat in RE_SERVICE_PATTERNS:
        m = pat.search(line)
        if m:
            candidate = m.group(1)
            if len(candidate) > 1 and candidate.upper() not in ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ERROR', 'WARN', 'INFO', 'CRITICAL', 'FATAL', 'DEBUG', 'TRACE'):
                service = candidate
                break

    return {
        'timestamp': ts,
        'error_code': error_code,
        'raw_path': raw_path,
        'normalized_path': normalize_path(raw_path) if raw_path else '',
        'service': service or '',
        'message': line.strip(),
        'raw_line': line.rstrip('\n'),
    }


def parse_line(line):
    stripped = line.strip()
    if not stripped:
        return None
    if stripped.startswith('{'):
        result = extract_from_json(stripped)
        if result:
            return result
    return extract_from_text(stripped)


def time_bucket(ts, window_minutes):
    if ts is None:
        return 0
    bucket = ts.replace(
        minute=(ts.minute // window_minutes) * window_minutes,
        second=0,
        microsecond=0,
    )
    return bucket


def collect_log_files(path):
    p = Path(path)
    if p.is_file():
        return [p]
    if p.is_dir():
        files = []
        for root, _dirs, fnames in os.walk(p):
            for fname in sorted(fnames):
                fpath = Path(root) / fname
                if fpath.suffix in ('.log', '.txt', '.json', '.gz', '.bz2') or not fpath.suffix:
                    if fpath.suffix in ('.gz', '.bz2'):
                        continue
                    files.append(fpath)
        return files
    return []


def parse_time_arg(val):
    for fmt in ('%Y-%m-%d', '%Y-%m-%dT%H:%M', '%Y-%m-%d %H:%M', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(val)
    except (ValueError, TypeError):
        pass
    return None


def group_errors(records, window_minutes):
    groups = defaultdict(lambda: {
        'count': 0,
        'first_seen': None,
        'last_seen': None,
        'affected_paths': set(),
        'raw_paths': set(),
        'services': set(),
        'samples': [],
    })

    for rec in records:
        key = (
            rec['error_code'],
            rec['normalized_path'],
            time_bucket(rec['timestamp'], window_minutes),
            rec['service'],
        )
        g = groups[key]
        g['count'] += 1
        ts = rec['timestamp']
        if ts:
            if g['first_seen'] is None or ts < g['first_seen']:
                g['first_seen'] = ts
            if g['last_seen'] is None or ts > g['last_seen']:
                g['last_seen'] = ts
        if rec['raw_path']:
            g['raw_paths'].add(rec['raw_path'])
        if rec['normalized_path']:
            g['affected_paths'].add(rec['normalized_path'])
        if rec['service']:
            g['services'].add(rec['service'])
        if len(g['samples']) < 3:
            g['samples'].append(rec['raw_line'])

    return groups


def compute_priority(group_key, group_data, baseline_codes):
    error_code = group_key[0]
    score = group_data['count']

    if error_code not in baseline_codes:
        score += 10000

    if group_data['first_seen'] and group_data['last_seen']:
        duration = (group_data['last_seen'] - group_data['first_seen']).total_seconds()
        if duration > 0:
            score += min(group_data['count'] / (duration / 60) * 10, 5000)

    return score


def render_report(groups, baseline_codes, sample_size, output_json=False):
    items = []
    for key, data in groups.items():
        priority_score = compute_priority(key, data, baseline_codes)
        is_new = key[0] not in baseline_codes
        items.append({
            'error_code': key[0],
            'normalized_path': key[1],
            'time_bucket': key[2],
            'service': key[3],
            'count': data['count'],
            'first_seen': data['first_seen'].isoformat() if data['first_seen'] else 'N/A',
            'last_seen': data['last_seen'].isoformat() if data['last_seen'] else 'N/A',
            'affected_paths': sorted(data['affected_paths']),
            'raw_paths': sorted(data['raw_paths']),
            'services': sorted(data['services']),
            'samples': data['samples'][:sample_size],
            'priority_score': priority_score,
            'is_new': is_new,
        })

    items.sort(key=lambda x: x['priority_score'], reverse=True)

    if output_json:
        return json.dumps(items, indent=2, ensure_ascii=False, default=str)

    lines = []
    lines.append('=' * 80)
    lines.append('  日志错误码分组报告')
    lines.append('=' * 80)
    lines.append(f'  分组数量: {len(items)}')
    new_count = sum(1 for i in items if i['is_new'])
    lines.append(f'  新增错误码: {new_count}')
    lines.append('=' * 80)

    for idx, item in enumerate(items, 1):
        lines.append('')
        tag = ' *** 新增 ***' if item['is_new'] else ''
        lines.append(f'  [{idx}] 错误码: {item["error_code"]}{tag}')
        lines.append(f'      归一化路径: {item["normalized_path"] or "(无路径)"}')
        lines.append(f'      服务: {", ".join(item["services"]) or "(未识别)"}')
        lines.append(f'      出现次数: {item["count"]}')
        lines.append(f'      首次出现: {item["first_seen"]}')
        lines.append(f'      最后出现: {item["last_seen"]}')
        if len(item['affected_paths']) > 1:
            lines.append(f'      影响路径 ({len(item["affected_paths"])}):')
            for p in item['affected_paths'][:10]:
                lines.append(f'        - {p}')
            if len(item['affected_paths']) > 10:
                lines.append(f'        ... 及其他 {len(item["affected_paths"]) - 10} 条')
        lines.append(f'      样例行:')
        for s in item['samples']:
            truncated = s[:200] + '...' if len(s) > 200 else s
            lines.append(f'        | {truncated}')
        lines.append('  ' + '-' * 76)

    lines.append('')
    lines.append('--- 优先排查建议 ---')
    new_items = [i for i in items if i['is_new']]
    if new_items:
        lines.append('  以下错误码在事故窗口内首次出现，建议优先排查:')
        for i in new_items[:5]:
            lines.append(f'    * {i["error_code"]} - {i["normalized_path"] or "(无路径)"} (出现 {i["count"]} 次)')
    else:
        lines.append('  未发现新增错误码。关注高频错误即可。')

    high_freq = [i for i in items if not i['is_new']][:5]
    if high_freq:
        lines.append('  高频错误:')
        for i in high_freq:
            lines.append(f'    * {i["error_code"]} - {i["normalized_path"] or "(无路径)"} (出现 {i["count"]} 次)')

    return '\n'.join(lines)


def build_baseline(records):
    codes = set()
    for rec in records:
        codes.add(rec['error_code'])
    return codes


def main():
    parser = argparse.ArgumentParser(
        description='日志错误码分组器 - 按错误码、归一化路径、时间窗口和服务名分组',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='示例:\n'
               '  python log_grouper.py /var/log/app/ --from 2026-06-20T14:00 --to 2026-06-20T16:00\n'
               '  python log_grouper.py error.log --window 10 --sample-size 5 --json\n'
               '  python log_grouper.py /var/log/ --baseline baseline.log\n',
    )
    parser.add_argument('path', help='日志文件或目录路径')
    parser.add_argument('--from', dest='time_from', help='事故开始时间 (如 2026-06-20T14:00)')
    parser.add_argument('--to', dest='time_to', help='事故结束时间 (如 2026-06-20T16:00)')
    parser.add_argument('--window', type=int, default=5, help='时间窗口(分钟)，默认 5')
    parser.add_argument('--sample-size', type=int, default=3, help='每组保留样例行数，默认 3')
    parser.add_argument('--baseline', help='基线日志文件/目录，用于识别新增错误码')
    parser.add_argument('--json', action='store_true', help='以 JSON 格式输出')
    parser.add_argument('--min-count', type=int, default=1, help='最低出现次数过滤，默认 1')

    args = parser.parse_args()

    if not os.path.exists(args.path):
        print(f'错误: 路径不存在 - {args.path}', file=sys.stderr)
        sys.exit(1)

    time_from = parse_time_arg(args.time_from) if args.time_from else None
    time_to = parse_time_arg(args.time_to) if args.time_to else None

    if args.time_from and not time_from:
        print(f'错误: 无法解析开始时间 - {args.time_from}', file=sys.stderr)
        sys.exit(1)
    if args.time_to and not time_to:
        print(f'错误: 无法解析结束时间 - {args.time_to}', file=sys.stderr)
        sys.exit(1)

    baseline_codes = set()
    if args.baseline:
        baseline_files = collect_log_files(args.baseline)
        for bf in baseline_files:
            with open(bf, 'r', encoding='utf-8', errors='replace') as f:
                for line in f:
                    rec = parse_line(line)
                    if rec:
                        baseline_codes.add(rec['error_code'])

    log_files = collect_log_files(args.path)
    if not log_files:
        print('错误: 未找到日志文件', file=sys.stderr)
        sys.exit(1)

    print(f'扫描 {len(log_files)} 个日志文件...', file=sys.stderr)

    records = []
    no_ts_count = 0
    total_lines = 0

    for lf in log_files:
        with open(lf, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                total_lines += 1
                rec = parse_line(line)
                if not rec:
                    continue

                if rec['timestamp'] is None:
                    no_ts_count += 1

                if time_from and rec['timestamp'] and rec['timestamp'] < time_from:
                    continue
                if time_to and rec['timestamp'] and rec['timestamp'] > time_to:
                    continue

                records.append(rec)

    if not records:
        print('未找到错误日志记录', file=sys.stderr)
        sys.exit(0)

    print(f'共处理 {total_lines} 行，提取 {len(records)} 条错误记录', file=sys.stderr)
    if no_ts_count:
        print(f'  其中 {no_ts_count} 条无时间戳', file=sys.stderr)

    groups = group_errors(records, args.window)

    if args.min_count > 1:
        groups = {k: v for k, v in groups.items() if v['count'] >= args.min_count}

    report = render_report(groups, baseline_codes, args.sample_size, output_json=args.json)
    print(report)


def _deep_get(obj, dotted_key):
    keys = dotted_key.split('.')
    current = obj
    for k in keys:
        if isinstance(current, dict) and k in current:
            current = current[k]
        else:
            return None
    return current


if __name__ == '__main__':
    main()
