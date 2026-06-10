import csv
import json
from datetime import datetime
from .auditor import (
    audit_all,
    audit_equipment,
    get_equipment_lease_out,
    get_equipment_fuel,
    get_equipment_return,
    get_equipment_reviews,
    compute_fuel_stats,
)


def _format_anomalies(anomalies):
    if not anomalies:
        return ""
    return "; ".join([f"[{a['type']}] {a['description']}" for a in anomalies])


def _format_source_lines(records, file_field='batch_file', line_field='source_line'):
    if not records:
        return ""
    lines = []
    for r in records:
        f = r.get(file_field, '')
        l = r.get(line_field, '')
        if f and l:
            lines.append(f"{f}:第{l}行")
        elif l:
            lines.append(f"第{l}行")
    return "; ".join(lines)


def export_report_csv(filepath, fuel_threshold=None, anomaly_type=None):
    audit_results = audit_all(fuel_threshold, anomaly_type)

    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            '设备编号',
            '状态',
            '异常数量',
            '异常说明',
            '总加油量(升)',
            '工作小时数',
            '油耗率(升/小时)',
            '租出记录数',
            '加油记录数',
            '归还记录数',
            '租出原始位置',
            '加油原始位置',
            '归还原始位置',
            '最新复核人',
            '最新复核状态',
            '复核意见',
            '最终结论',
            '导出时间',
        ])

        export_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        for ar in audit_results:
            eid = ar['equipment_id']
            leases = get_equipment_lease_out(eid)
            fuels = get_equipment_fuel(eid)
            returns = get_equipment_return(eid)
            review = ar['latest_review']

            writer.writerow([
                eid,
                ar['status'],
                ar['anomaly_count'],
                _format_anomalies(ar['anomalies']),
                f"{ar['fuel_stats']['total_fuel']:.2f}",
                f"{ar['fuel_stats']['total_hours']:.2f}",
                f"{ar['fuel_stats']['fuel_rate']:.2f}",
                ar['fuel_stats']['lease_count'],
                ar['fuel_stats']['fuel_count'],
                ar['fuel_stats']['return_count'],
                _format_source_lines(leases),
                _format_source_lines(fuels),
                _format_source_lines(returns),
                review['reviewer'] if review else '',
                review['review_status'] if review else '',
                review['review_comment'] if review else '',
                ar['final_conclusion'],
                export_time,
            ])

    return {
        "file": filepath,
        "record_count": len(audit_results),
        "export_time": export_time,
    }


def export_detailed_json(filepath, fuel_threshold=None, anomaly_type=None):
    audit_results = audit_all(fuel_threshold, anomaly_type)

    detailed = []
    for ar in audit_results:
        eid = ar['equipment_id']
        leases = get_equipment_lease_out(eid)
        fuels = get_equipment_fuel(eid)
        returns = get_equipment_return(eid)
        reviews = get_equipment_reviews(eid)

        detailed.append({
            "equipment_id": eid,
            "status": ar['status'],
            "anomaly_count": ar['anomaly_count'],
            "anomalies": ar['anomalies'],
            "fuel_stats": ar['fuel_stats'],
            "lease_records": leases,
            "fuel_records": fuels,
            "return_records": returns,
            "review_history": reviews,
            "latest_review": ar['latest_review'],
            "final_conclusion": ar['final_conclusion'],
        })

    result = {
        "export_time": datetime.now().isoformat(),
        "total_equipment": len(detailed),
        "fuel_threshold": fuel_threshold,
        "equipment": detailed,
    }

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2, default=str)

    return {
        "file": filepath,
        "record_count": len(detailed),
    }


def export_anomaly_detail_csv(filepath, anomaly_type=None, fuel_threshold=None):
    audit_results = audit_all(fuel_threshold, anomaly_type)

    rows = []
    for ar in audit_results:
        eid = ar['equipment_id']
        for anomaly in ar['anomalies']:
            row = {
                '设备编号': eid,
                '异常类型': anomaly['type'],
                '异常描述': anomaly['description'],
                '最终结论': ar['final_conclusion'],
                '复核状态': ar['latest_review']['review_status'] if ar['latest_review'] else '未复核',
                '复核人': ar['latest_review']['reviewer'] if ar['latest_review'] else '',
                '复核意见': ar['latest_review']['review_comment'] if ar['latest_review'] else '',
            }
            detail = anomaly.get('detail', {})

            if anomaly['type'] == 'fuel_abnormal':
                row['总加油量(升)'] = f"{detail.get('total_fuel', 0):.2f}"
                row['工作小时数'] = f"{detail.get('total_hours', 0):.2f}"
                row['油耗率(升/小时)'] = f"{detail.get('fuel_rate', 0):.2f}"
                row['阈值(升/小时)'] = f"{detail.get('threshold', 0):.2f}"

            elif anomaly['type'] == 'hours_inverted':
                details = detail.get('details', [])
                if details:
                    for d in details:
                        r = row.copy()
                        r['租出日期'] = d.get('lease_date', '')
                        r['起始小时数'] = d.get('start_hours', '')
                        r['租出来源'] = d.get('lease_source', '')
                        r['租出行号'] = d.get('lease_line', '')
                        r['归还日期'] = d.get('return_date', '')
                        r['结束小时数'] = d.get('end_hours', '')
                        r['归还来源'] = d.get('return_source', '')
                        r['归还行号'] = d.get('return_line', '')
                        rows.append(r)
                    continue

            elif anomaly['type'] == 'inspector_inconsistency':
                details = detail.get('details', [])
                if details:
                    for d in details:
                        r = row.copy()
                        r['不一致类型'] = d.get('type', '')
                        if d.get('type') == 'multiple_inspectors':
                            r['验收人列表'] = ', '.join(d.get('inspectors', []))
                        else:
                            r['操作人员'] = d.get('operator', '')
                            r['验收人'] = d.get('inspector', '')
                            r['租出日期'] = d.get('lease_date', '')
                            r['归还日期'] = d.get('return_date', '')
                        r['详细说明'] = d.get('explanation', '')
                        rows.append(r)
                    continue

            rows.append(row)

    if not rows:
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['设备编号', '异常类型', '异常描述'])
        return {"file": filepath, "record_count": 0}

    all_fields = []
    seen = set()
    base_fields = ['设备编号', '异常类型', '异常描述', '最终结论', '复核状态', '复核人', '复核意见']
    for f in base_fields:
        if f not in seen:
            all_fields.append(f)
            seen.add(f)
    for row in rows:
        for k in row.keys():
            if k not in seen:
                all_fields.append(k)
                seen.add(k)

    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=all_fields, restval='')
        writer.writeheader()
        writer.writerows(rows)

    return {
        "file": filepath,
        "record_count": len(rows),
    }
