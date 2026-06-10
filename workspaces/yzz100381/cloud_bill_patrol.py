#!/usr/bin/env python3
import csv
import json
import os
import sys
import argparse
from datetime import datetime
from collections import defaultdict

CONFIG_DEFAULTS = {
    "spike_threshold_pct": 50,
    "peak_threshold_cny": 10000,
    "idle_threshold_cny": 50,
    "currency_rates": {"CNY": 1.0, "USD": 7.25},
    "default_currency": "CNY",
}


def load_csv(path, encoding="utf-8-sig"):
    rows = []
    with open(path, encoding=encoding, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def load_history(history_dir):
    if not os.path.isdir(history_dir):
        return None
    files = sorted(
        [f for f in os.listdir(history_dir) if f.startswith("results_") and f.endswith(".json")]
    )
    if not files:
        return None
    latest = os.path.join(history_dir, files[-1])
    with open(latest, encoding="utf-8") as f:
        return json.load(f)


def save_history(history_dir, data):
    os.makedirs(history_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(history_dir, f"results_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return path


def to_cny(amount, currency, rates):
    rate = rates.get(currency, 1.0)
    return float(amount) * rate


def format_amount(amount, currency):
    return f"{float(amount):,.2f} {currency}"


def parse_bill(rows, config):
    rates = config["currency_rates"]
    records = []
    for r in rows:
        raw_amount = r.get("费用", "0").strip()
        currency = r.get("币种", config["default_currency"]).strip() or config["default_currency"]
        amount_cny = to_cny(raw_amount, currency, rates)
        records.append(
            {
                "month": r.get("月份", "").strip(),
                "resource_id": r.get("资源ID", "").strip(),
                "resource_name": r.get("资源名称", "").strip(),
                "resource_type": r.get("资源类型", "").strip(),
                "region": r.get("区域", "").strip(),
                "project_tag": r.get("项目标签", "").strip(),
                "owner": r.get("负责人", "").strip(),
                "amount": float(raw_amount),
                "currency": currency,
                "amount_cny": amount_cny,
            }
        )
    return records


def parse_mapping(rows):
    mapping = {}
    for r in rows:
        tag = r.get("项目标签", "").strip()
        mapping[tag] = {
            "department": r.get("部门", "").strip(),
            "dept_head": r.get("部门负责人", "").strip(),
            "contact": r.get("联系方式", "").strip(),
        }
    return mapping


def normalize_tag(tag):
    return tag.strip().lower()


def check_missing_tags(records):
    results = []
    for r in records:
        issues = []
        if not r["project_tag"]:
            issues.append("缺少项目标签")
        if not r["owner"]:
            issues.append("缺少负责人标签")
        if issues:
            results.append({"record": r, "issues": issues})
    return results


def check_case_inconsistency(records):
    tag_variants = defaultdict(set)
    for r in records:
        raw = r["project_tag"]
        if raw:
            tag_variants[normalize_tag(raw)].add(raw)
    results = []
    for norm, variants in tag_variants.items():
        if len(variants) > 1:
            results.append({"normalized": norm, "variants": sorted(variants)})
    return results


def check_duplicate_names(records):
    name_groups = defaultdict(list)
    for r in records:
        name_groups[r["resource_name"]].append(r)
    results = []
    for name, group in name_groups.items():
        unique_ids = set(r["resource_id"] for r in group)
        if len(unique_ids) > 1:
            results.append(
                {
                    "resource_name": name,
                    "resource_ids": sorted(unique_ids),
                    "count": len(unique_ids),
                }
            )
    return results


def check_unmapped_projects(records, mapping):
    results = []
    seen = set()
    for r in records:
        tag = r["project_tag"]
        if tag and tag not in mapping and tag not in seen:
            results.append(
                {
                    "project_tag": tag,
                    "owner_hint": r["owner"] or "未知",
                    "resource_id_hint": r["resource_id"],
                }
            )
            seen.add(tag)
    return results


def check_cost_spike(records, prev_records, threshold_pct):
    if not prev_records:
        return []
    prev_by_id = defaultdict(list)
    for r in prev_records:
        prev_by_id[r["resource_id"]].append(r)
    curr_by_id = defaultdict(list)
    for r in records:
        curr_by_id[r["resource_id"]].append(r)
    results = []
    for rid, curr_list in curr_by_id.items():
        if rid not in prev_by_id:
            continue
        prev_total = sum(r["amount_cny"] for r in prev_by_id[rid])
        curr_total = sum(r["amount_cny"] for r in curr_list)
        if prev_total > 0:
            pct = ((curr_total - prev_total) / prev_total) * 100
            if pct > threshold_pct:
                results.append(
                    {
                        "resource_id": rid,
                        "resource_name": curr_list[0]["resource_name"],
                        "project_tag": curr_list[0]["project_tag"],
                        "owner": curr_list[0]["owner"],
                        "prev_total_cny": round(prev_total, 2),
                        "curr_total_cny": round(curr_total, 2),
                        "spike_pct": round(pct, 1),
                    }
                )
    return results


def check_peak_cost(records, threshold_cny):
    by_id = defaultdict(list)
    for r in records:
        by_id[r["resource_id"]].append(r)
    results = []
    for rid, group in by_id.items():
        total = sum(r["amount_cny"] for r in group)
        if total > threshold_cny:
            results.append(
                {
                    "resource_id": rid,
                    "resource_name": group[0]["resource_name"],
                    "resource_type": group[0]["resource_type"],
                    "project_tag": group[0]["project_tag"],
                    "owner": group[0]["owner"],
                    "total_cny": round(total, 2),
                    "detail_amounts": [
                        format_amount(r["amount"], r["currency"]) for r in group
                    ],
                }
            )
    return sorted(results, key=lambda x: x["total_cny"], reverse=True)


def check_idle_resources(records, idle_threshold_cny, peak_threshold_cny):
    by_id = defaultdict(list)
    for r in records:
        by_id[r["resource_id"]].append(r)
    results = []
    for rid, group in by_id.items():
        total = sum(r["amount_cny"] for r in group)
        rtype = group[0]["resource_type"]
        if total <= idle_threshold_cny and rtype in ("ECS", "RDS", "Redis"):
            results.append(
                {
                    "resource_id": rid,
                    "resource_name": group[0]["resource_name"],
                    "resource_type": rtype,
                    "region": group[0]["region"],
                    "project_tag": group[0]["project_tag"],
                    "owner": group[0]["owner"],
                    "total_cny": round(total, 2),
                }
            )
    return results


def resolve_contact(record, mapping, unmapped_tags):
    tag = record["project_tag"]
    owner = record["owner"]
    if tag and tag in mapping:
        info = mapping[tag]
        contact_name = owner or info["dept_head"]
        return {
            "contact": contact_name or info["dept_head"],
            "department": info["department"],
            "email": info["contact"],
        }
    if tag and tag in unmapped_tags:
        return {
            "contact": owner or "待确认",
            "department": "待确认(项目未映射)",
            "email": "",
        }
    return {
        "contact": owner or "待确认",
        "department": "待确认(缺少标签)",
        "email": "",
    }


def build_traceable_resources(records, mapping, unmapped_tags_set):
    results = []
    for r in records:
        if not r["project_tag"] or not r["owner"]:
            continue
        if r["project_tag"] not in mapping:
            continue
        info = mapping[r["project_tag"]]
        results.append(
            {
                "resource_id": r["resource_id"],
                "resource_name": r["resource_name"],
                "resource_type": r["resource_type"],
                "region": r["region"],
                "project_tag": r["project_tag"],
                "owner": r["owner"],
                "amount": format_amount(r["amount"], r["currency"]),
                "department": info["department"],
                "dept_head": info["dept_head"],
                "contact_email": info["contact"],
            }
        )
    return results


def build_pending_allocation(records, mapping, missing_tags, unmapped_projects):
    results = []
    unmapped_tags_set = {p["project_tag"] for p in unmapped_projects}
    for r in records:
        reasons = []
        if not r["project_tag"]:
            reasons.append("缺少项目标签")
        if not r["owner"]:
            reasons.append("缺少负责人标签")
        if r["project_tag"] and r["project_tag"] not in mapping:
            tag_val = r["project_tag"]
            reasons.append(f"项目'{tag_val}'未在映射表中")
        if not reasons:
            continue
        contact = resolve_contact(r, mapping, unmapped_tags_set)
        results.append(
            {
                "resource_id": r["resource_id"],
                "resource_name": r["resource_name"],
                "resource_type": r["resource_type"],
                "region": r["region"],
                "project_tag": r["project_tag"] or "(空)",
                "owner": r["owner"] or "(空)",
                "amount": format_amount(r["amount"], r["currency"]),
                "amount_cny": round(r["amount_cny"], 2),
                "reasons": reasons,
                "suggest_contact": contact["contact"],
                "suggest_department": contact["department"],
                "suggest_email": contact["email"],
            }
        )
    return results


def build_idle_with_contact(records, idle_items, mapping, unmapped_tags_set):
    results = []
    for item in idle_items:
        r = next(
            (x for x in records if x["resource_id"] == item["resource_id"]),
            None,
        )
        if r is None:
            continue
        contact = resolve_contact(r, mapping, unmapped_tags_set)
        results.append(
            {
                **item,
                "suggest_contact": contact["contact"],
                "suggest_department": contact["department"],
                "suggest_email": contact["email"],
            }
        )
    return results


def build_spike_with_contact(spike_items, mapping, unmapped_tags_set):
    results = []
    for item in spike_items:
        tag = item["project_tag"]
        owner = item["owner"]
        if tag and tag in mapping:
            info = mapping[tag]
            contact_name = owner or info["dept_head"]
            results.append(
                {
                    **item,
                    "suggest_contact": contact_name,
                    "suggest_department": info["department"],
                    "suggest_email": info["contact"],
                }
            )
        else:
            contact = resolve_contact(
                {"project_tag": tag, "owner": owner}, mapping, unmapped_tags_set
            )
            results.append(
                {
                    **item,
                    "suggest_contact": contact["contact"],
                    "suggest_department": contact["department"],
                    "suggest_email": contact["email"],
                }
            )
    return results


def generate_report(
    target_month,
    records,
    mapping,
    missing_tags,
    case_issues,
    dup_names,
    unmapped_projects,
    spikes,
    peaks,
    idles,
    pending,
    traceable,
    idle_with_contact,
    spike_with_contact,
    prev_run_info,
    output_path,
):
    lines = []
    lines.append(f"# 云账单标签巡查报告")
    lines.append(f"")
    lines.append(f"- **巡查月份**: {target_month}")
    lines.append(f"- **生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    if prev_run_info:
        lines.append(f"- **上次巡查时间**: {prev_run_info.get('run_time', '未知')}")
    lines.append(f"")

    total_cost_cny = sum(r["amount_cny"] for r in records)
    total_resources = len(set(r["resource_id"] for r in records))
    tagged_count = sum(1 for r in records if r["project_tag"])
    owner_count = sum(1 for r in records if r["owner"])

    lines.append(f"## 一、概览统计")
    lines.append(f"")
    lines.append(f"| 指标 | 数值 |")
    lines.append(f"|------|------|")
    lines.append(f"| 本月总费用 | ¥{total_cost_cny:,.2f} |")
    lines.append(f"| 资源数量 | {total_resources} |")
    lines.append(f"| 有项目标签 | {tagged_count}/{len(records)} |")
    lines.append(f"| 有负责人标签 | {owner_count}/{len(records)} |")
    lines.append(f"| 标签缺失异常 | {len(missing_tags)} 条 |")
    lines.append(f"| 大小写不一致 | {len(case_issues)} 组 |")
    lines.append(f"| 资源名重复 | {len(dup_names)} 组 |")
    lines.append(f"| 新项目未映射 | {len(unmapped_projects)} 个 |")
    lines.append(f"| 费用环比飙升 | {len(spike_with_contact)} 条 |")
    lines.append(f"| 费用异常峰值 | {len(peaks)} 条 |")
    lines.append(f"| 疑似闲置资源 | {len(idle_with_contact)} 条 |")
    lines.append(f"| 待人工分摊 | {len(pending)} 条 |")
    lines.append(f"")

    lines.append(f"## 二、可直接追人的资源（标签完整且有部门映射）")
    lines.append(f"")
    if traceable:
        lines.append(
            f"| 资源ID | 资源名称 | 类型 | 区域 | 项目 | 负责人 | 费用 | 部门 | 联系邮箱 |"
        )
        lines.append(
            f"|--------|----------|------|------|------|--------|------|------|----------|"
        )
        for t in traceable:
            lines.append(
                f"| {t['resource_id']} | {t['resource_name']} | {t['resource_type']} "
                f"| {t['region']} | {t['project_tag']} | {t['owner']} | {t['amount']} "
                f"| {t['department']} | {t['contact_email']} |"
            )
    else:
        lines.append(f"> 本月无可直接追人的资源。")
    lines.append(f"")

    lines.append(f"## 三、疑似闲置资源（费用极低但仍在运行的计算实例）")
    lines.append(f"")
    if idle_with_contact:
        lines.append(
            f"| 资源ID | 资源名称 | 类型 | 区域 | 费用(CNY) | 项目 | 负责人 | 建议联系 | 部门 | 邮箱 |"
        )
        lines.append(
            f"|--------|----------|------|------|-----------|------|--------|----------|------|------|"
        )
        for i in idle_with_contact:
            lines.append(
                f"| {i['resource_id']} | {i['resource_name']} | {i['resource_type']} "
                f"| {i['region']} | ¥{i['total_cny']:,.2f} | {i['project_tag'] or '(空)'} "
                f"| {i['owner'] or '(空)'} | {i['suggest_contact']} | {i['suggest_department']} "
                f"| {i['suggest_email']} |"
            )
    else:
        lines.append(f"> 本月无疑似闲置资源。")
    lines.append(f"")

    lines.append(f"## 四、待人工分摊费用（标签缺失/无映射/新项目）")
    lines.append(f"")
    if pending:
        lines.append(
            f"| 资源ID | 资源名称 | 类型 | 区域 | 项目 | 负责人 | 费用 | 原因 | 建议联系 | 部门 | 邮箱 |"
        )
        lines.append(
            f"|--------|----------|------|------|------|--------|------|------|----------|------|------|"
        )
        for p in pending:
            reasons_str = "; ".join(p["reasons"])
            lines.append(
                f"| {p['resource_id']} | {p['resource_name']} | {p['resource_type']} "
                f"| {p['region']} | {p['project_tag']} | {p['owner']} | {p['amount']} "
                f"| {reasons_str} | {p['suggest_contact']} | {p['suggest_department']} "
                f"| {p['suggest_email']} |"
            )
        total_pending_cny = sum(p["amount_cny"] for p in pending)
        lines.append(f"")
        lines.append(f"> **待人工分摊费用合计**: ¥{total_pending_cny:,.2f}")
    else:
        lines.append(f"> 本月无待人工分摊费用。")
    lines.append(f"")

    lines.append(f"## 五、费用环比飙升（较上月涨幅超过阈值）")
    lines.append(f"")
    if spike_with_contact:
        lines.append(
            f"| 资源ID | 资源名称 | 项目 | 负责人 | 上月(CNY) | 本月(CNY) | 涨幅 | 建议联系 | 部门 | 邮箱 |"
        )
        lines.append(
            f"|--------|----------|------|--------|-----------|-----------|------|----------|------|------|"
        )
        for s in spike_with_contact:
            lines.append(
                f"| {s['resource_id']} | {s['resource_name']} | {s['project_tag'] or '(空)'} "
                f"| {s['owner'] or '(空)'} | ¥{s['prev_total_cny']:,.2f} | ¥{s['curr_total_cny']:,.2f} "
                f"| +{s['spike_pct']}% | {s['suggest_contact']} | {s['suggest_department']} "
                f"| {s['suggest_email']} |"
            )
    else:
        lines.append(f"> 本月无费用环比飙升，或无上月数据。")
    lines.append(f"")

    lines.append(f"## 六、费用异常峰值（单资源费用超过阈值）")
    lines.append(f"")
    if peaks:
        lines.append(f"| 资源ID | 资源名称 | 类型 | 项目 | 负责人 | 费用(CNY) | 明细 |")
        lines.append(f"|--------|----------|------|------|--------|-----------|------|")
        for p in peaks:
            details = ", ".join(p["detail_amounts"])
            lines.append(
                f"| {p['resource_id']} | {p['resource_name']} | {p['resource_type']} "
                f"| {p['project_tag'] or '(空)'} | {p['owner'] or '(空)'} "
                f"| ¥{p['total_cny']:,.2f} | {details} |"
            )
    else:
        lines.append(f"> 本月无费用异常峰值。")
    lines.append(f"")

    lines.append(f"## 七、标签问题明细")
    lines.append(f"")
    lines.append(f"### 7.1 大小写不一致")
    lines.append(f"")
    if case_issues:
        for c in case_issues:
            lines.append(f"- **{c['normalized']}**: 存在变体 {', '.join(f'`{v}`' for v in c['variants'])}")
    else:
        lines.append(f"> 无大小写不一致问题。")
    lines.append(f"")

    lines.append(f"### 7.2 资源名重复（不同资源ID但名称相同）")
    lines.append(f"")
    if dup_names:
        for d in dup_names:
            ids_str = ", ".join(d["resource_ids"])
            lines.append(
                f"- **{d['resource_name']}**: {d['count']} 个不同资源ID ({ids_str})"
            )
    else:
        lines.append(f"> 无资源名重复问题。")
    lines.append(f"")

    lines.append(f"### 7.3 新项目未映射")
    lines.append(f"")
    if unmapped_projects:
        for u in unmapped_projects:
            lines.append(
                f"- **{u['project_tag']}**: 负责人提示={u['owner_hint']}, "
                f"示例资源ID={u['resource_id_hint']}"
            )
    else:
        lines.append(f"> 无新项目未映射问题。")
    lines.append(f"")

    lines.append(f"---")
    lines.append(f"")
    lines.append(f"*报告由云账单标签巡查脚本自动生成，如有疑问请联系财务部。*")

    report_text = "\n".join(lines)
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report_text)
    return report_text


def main():
    parser = argparse.ArgumentParser(description="云账单标签巡查")
    parser.add_argument("--bill", default="bill.csv", help="云账单CSV文件路径")
    parser.add_argument("--mapping", default="mapping.csv", help="部门映射CSV文件路径")
    parser.add_argument("--month", default=None, help="巡查目标月份(如2026-05)，默认取账单最新月份")
    parser.add_argument(
        "--spike-threshold",
        type=float,
        default=CONFIG_DEFAULTS["spike_threshold_pct"],
        help=f"环比飙升阈值百分比(默认{CONFIG_DEFAULTS['spike_threshold_pct']})",
    )
    parser.add_argument(
        "--peak-threshold",
        type=float,
        default=CONFIG_DEFAULTS["peak_threshold_cny"],
        help=f"单资源费用峰值阈值CNY(默认{CONFIG_DEFAULTS['peak_threshold_cny']})",
    )
    parser.add_argument(
        "--idle-threshold",
        type=float,
        default=CONFIG_DEFAULTS["idle_threshold_cny"],
        help=f"疑似闲置费用阈值CNY(默认{CONFIG_DEFAULTS['idle_threshold_cny']})",
    )
    parser.add_argument(
        "--history-dir",
        default="history",
        help="历史结果目录(默认history)",
    )
    parser.add_argument(
        "--output",
        default="report.md",
        help="输出报告路径(默认report.md)",
    )
    args = parser.parse_args()

    config = {
        **CONFIG_DEFAULTS,
        "spike_threshold_pct": args.spike_threshold,
        "peak_threshold_cny": args.peak_threshold,
        "idle_threshold_cny": args.idle_threshold,
    }

    print(f"[1/7] 读取账单文件: {args.bill}")
    bill_rows = load_csv(args.bill)
    all_records = parse_bill(bill_rows, config)
    print(f"      共 {len(all_records)} 条记录")

    print(f"[2/7] 读取部门映射: {args.mapping}")
    mapping_rows = load_csv(args.mapping)
    mapping = parse_mapping(mapping_rows)
    print(f"      共 {len(mapping)} 个项目映射")

    months = sorted(set(r["month"] for r in all_records))
    if not months:
        print("错误: 账单中无月份数据", file=sys.stderr)
        sys.exit(1)
    target_month = args.month or months[-1]
    prev_month = None
    if target_month in months:
        idx = months.index(target_month)
        if idx > 0:
            prev_month = months[idx - 1]

    records = [r for r in all_records if r["month"] == target_month]
    prev_records = [r for r in all_records if r["month"] == prev_month] if prev_month else []
    print(f"      目标月份: {target_month}, 上月: {prev_month or '无'}")
    print(f"      本月记录: {len(records)}, 上月记录: {len(prev_records)}")

    print(f"[3/7] 加载上次巡查结果...")
    prev_run = load_history(args.history_dir)
    prev_run_time = prev_run["run_time"] if prev_run else None
    if prev_run:
        print(f"      上次巡查时间: {prev_run_time}")
    else:
        print(f"      无历史记录(首次巡查)")

    print(f"[4/7] 执行检查...")
    missing_tags = check_missing_tags(records)
    case_issues = check_case_inconsistency(records)
    dup_names = check_duplicate_names(records)
    unmapped_projects = check_unmapped_projects(records, mapping)
    spikes = check_cost_spike(records, prev_records, config["spike_threshold_pct"])
    peaks = check_peak_cost(records, config["peak_threshold_cny"])
    idles = check_idle_resources(records, config["idle_threshold_cny"], config["peak_threshold_cny"])

    unmapped_tags_set = {p["project_tag"] for p in unmapped_projects}

    traceable = build_traceable_resources(records, mapping, unmapped_tags_set)
    pending = build_pending_allocation(records, mapping, missing_tags, unmapped_projects)
    idle_with_contact = build_idle_with_contact(records, idles, mapping, unmapped_tags_set)
    spike_with_contact = build_spike_with_contact(spikes, mapping, unmapped_tags_set)

    print(f"      标签缺失: {len(missing_tags)} | 大小写不一致: {len(case_issues)} | "
          f"资源名重复: {len(dup_names)} | 未映射项目: {len(unmapped_projects)}")
    print(f"      环比飙升: {len(spikes)} | 异常峰值: {len(peaks)} | 疑似闲置: {len(idles)}")
    print(f"      可追人: {len(traceable)} | 待分摊: {len(pending)}")

    print(f"[5/7] 生成报告: {args.output}")
    prev_run_info = {"run_time": prev_run_time} if prev_run_time else None
    report = generate_report(
        target_month,
        records,
        mapping,
        missing_tags,
        case_issues,
        dup_names,
        unmapped_projects,
        spikes,
        peaks,
        idles,
        pending,
        traceable,
        idle_with_contact,
        spike_with_contact,
        prev_run_info,
        args.output,
    )
    print(f"      报告已写入: {args.output}")

    print(f"[6/7] 保存巡查历史...")
    run_data = {
        "run_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "target_month": target_month,
        "prev_month": prev_month,
        "total_cost_cny": round(sum(r["amount_cny"] for r in records), 2),
        "resource_count": len(set(r["resource_id"] for r in records)),
        "missing_tag_count": len(missing_tags),
        "case_issue_count": len(case_issues),
        "duplicate_name_count": len(dup_names),
        "unmapped_project_count": len(unmapped_projects),
        "spike_count": len(spikes),
        "peak_count": len(peaks),
        "idle_count": len(idles),
        "pending_count": len(pending),
        "traceable_count": len(traceable),
        "missing_tags": [
            {"resource_id": m["record"]["resource_id"], "issues": m["issues"]}
            for m in missing_tags
        ],
        "unmapped_projects": unmapped_projects,
        "spikes": spikes,
        "peaks": [
            {k: v for k, v in p.items() if k != "detail_amounts"} for p in peaks
        ],
        "idles": idles,
    }
    hist_path = save_history(args.history_dir, run_data)
    print(f"      历史已保存: {hist_path}")

    print(f"[7/7] 完成!")
    print(f"")
    print(f"=== 巡查摘要 ({target_month}) ===")
    print(f"  总费用: ¥{run_data['total_cost_cny']:,.2f}")
    print(f"  资源数: {run_data['resource_count']}")
    print(f"  可追人: {run_data['traceable_count']}  待分摊: {run_data['pending_count']}  "
          f"疑似闲置: {run_data['idle_count']}")
    print(f"  环比飙升: {run_data['spike_count']}  异常峰值: {run_data['peak_count']}")
    print(f"  报告: {args.output}")
    print(f"  历史: {hist_path}")


if __name__ == "__main__":
    main()
