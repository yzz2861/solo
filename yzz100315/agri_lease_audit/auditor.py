from .storage import get_db, FUEL_CONSUMPTION_THRESHOLD
from collections import defaultdict
from datetime import datetime


def _parse_date(s):
    if not s:
        return None
    for fmt in ('%Y-%m-%d', '%Y/%m/%d', '%Y.%m.%d', '%Y%m%d'):
        try:
            return datetime.strptime(s, fmt)
        except (ValueError, TypeError):
            continue
    try:
        return datetime.fromisoformat(str(s))
    except (ValueError, TypeError):
        return None


def _date_between(check, start, end):
    cd = _parse_date(check)
    sd = _parse_date(start)
    ed = _parse_date(end)
    if cd is None:
        return False
    if sd and cd < sd:
        return False
    if ed and cd > ed:
        return False
    return True


def _pair_lease_return_cycles(leases, returns):
    sorted_leases = sorted(leases, key=lambda x: x['lease_date'])
    sorted_returns = sorted(returns, key=lambda x: x['return_date'])

    cycles = []
    used_returns = set()

    for lease in sorted_leases:
        lease_date = lease['lease_date']
        matched_return = None
        for idx, ret in enumerate(sorted_returns):
            if idx in used_returns:
                continue
            if _date_between(ret['return_date'], lease_date, None):
                matched_return = ret
                used_returns.add(idx)
                break
        if matched_return:
            cycles.append({
                "lease": lease,
                "return": matched_return,
                "lease_date": lease_date,
                "return_date": matched_return['return_date'],
            })

    return cycles


def get_all_equipment_ids():
    with get_db() as conn:
        c = conn.cursor()
        equipment_ids = set()
        for table in ['lease_out', 'fuel_records', 'return_check']:
            c.execute(f"SELECT DISTINCT equipment_id FROM {table}")
            for row in c.fetchall():
                equipment_ids.add(row['equipment_id'])
        return sorted(equipment_ids)


def get_equipment_lease_out(equipment_id):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT lo.*, ib.source_file as batch_file
            FROM lease_out lo
            LEFT JOIN import_batches ib ON lo.batch_id = ib.id
            WHERE lo.equipment_id = ?
            ORDER BY lo.lease_date
        """, (equipment_id,))
        return [dict(row) for row in c.fetchall()]


def get_equipment_fuel(equipment_id):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT fr.*, ib.source_file as batch_file
            FROM fuel_records fr
            LEFT JOIN import_batches ib ON fr.batch_id = ib.id
            WHERE fr.equipment_id = ?
            ORDER BY fr.fuel_date
        """, (equipment_id,))
        return [dict(row) for row in c.fetchall()]


def get_equipment_return(equipment_id):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT rc.*, ib.source_file as batch_file
            FROM return_check rc
            LEFT JOIN import_batches ib ON rc.batch_id = ib.id
            WHERE rc.equipment_id = ?
            ORDER BY rc.return_date
        """, (equipment_id,))
        return [dict(row) for row in c.fetchall()]


def get_equipment_reviews(equipment_id):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT * FROM reviews
            WHERE equipment_id = ?
            ORDER BY review_time DESC
        """, (equipment_id,))
        return [dict(row) for row in c.fetchall()]


def get_latest_review(equipment_id):
    reviews = get_equipment_reviews(equipment_id)
    return reviews[0] if reviews else None


def compute_fuel_stats(equipment_id):
    leases = get_equipment_lease_out(equipment_id)
    returns = get_equipment_return(equipment_id)
    fuels = get_equipment_fuel(equipment_id)

    cycles = _pair_lease_return_cycles(leases, returns)

    total_fuel = 0.0
    total_hours = 0.0
    hours_inverted = False
    cycle_details = []

    used_fuel_ids = set()

    for cycle in cycles:
        lease = cycle['lease']
        ret = cycle['return']
        start_h = lease['start_hours']
        end_h = ret['end_hours']
        seg_hours = end_h - start_h

        if seg_hours < 0:
            hours_inverted = True

        seg_fuel = 0.0
        seg_fuels = []
        for f_idx, f in enumerate(fuels):
            if id(f) in used_fuel_ids:
                continue
            if _date_between(f['fuel_date'], cycle['lease_date'], cycle['return_date']):
                seg_fuel += f['fuel_amount']
                seg_fuels.append({
                    "fuel_date": f['fuel_date'],
                    "fuel_amount": f['fuel_amount'],
                    "fuel_source": f.get('batch_file', ''),
                    "fuel_line": f['source_line'],
                })
                used_fuel_ids.add(id(f))

        if seg_hours > 0:
            total_hours += seg_hours
            total_fuel += seg_fuel

        cycle_details.append({
            "cycle_index": len(cycle_details) + 1,
            "lease_date": cycle['lease_date'],
            "return_date": cycle['return_date'],
            "start_hours": start_h,
            "end_hours": end_h,
            "seg_hours": seg_hours,
            "seg_fuel": seg_fuel,
            "seg_fuel_rate": seg_fuel / seg_hours if seg_hours > 0 else 0,
            "lease_source": lease.get('batch_file', ''),
            "lease_line": lease['source_line'],
            "return_source": ret.get('batch_file', ''),
            "return_line": ret['source_line'],
            "fuel_records_in_segment": seg_fuels,
            "hours_inverted": seg_hours < 0,
        })

    if not cycles and leases and returns:
        total_fuel = sum(f['fuel_amount'] for f in fuels)
        latest_lease = max(leases, key=lambda x: x['lease_date'])
        latest_return = max(returns, key=lambda x: x['return_date'])
        seg_hours = latest_return['end_hours'] - latest_lease['start_hours']
        if seg_hours < 0:
            hours_inverted = True
        if seg_hours > 0:
            total_hours = seg_hours
        else:
            total_hours = 0
    elif not cycles:
        total_fuel = sum(f['fuel_amount'] for f in fuels)

    fuel_rate = total_fuel / total_hours if total_hours > 0 else 0

    return {
        "total_fuel": total_fuel,
        "total_hours": total_hours,
        "fuel_rate": fuel_rate,
        "hours_inverted": hours_inverted,
        "lease_count": len(leases),
        "fuel_count": len(fuels),
        "return_count": len(returns),
        "cycle_count": len(cycles),
        "cycle_details": cycle_details,
        "latest_lease": leases[-1] if leases else None,
        "latest_return": returns[-1] if returns else None,
    }


def check_fuel_abnormal(equipment_id, threshold=None):
    if threshold is None:
        threshold = FUEL_CONSUMPTION_THRESHOLD
    stats = compute_fuel_stats(equipment_id)
    is_abnormal = stats['fuel_rate'] > threshold and stats['total_hours'] > 0

    abnormal_cycles = []
    for cd in stats['cycle_details']:
        if cd['seg_hours'] > 0 and cd['seg_fuel_rate'] > threshold:
            abnormal_cycles.append(cd)

    if is_abnormal:
        cycle_desc_parts = []
        for cd in abnormal_cycles:
            fuel_srcs = []
            for fr in cd['fuel_records_in_segment']:
                src = fr['fuel_source'] or ''
                line = fr['fuel_line']
                if src and line:
                    fuel_srcs.append(f"{src}:第{line}行")
                elif line:
                    fuel_srcs.append(f"第{line}行")
            lease_src = cd['lease_source'] or ''
            lease_line = cd['lease_line']
            ret_src = cd['return_source'] or ''
            ret_line = cd['return_line']
            lease_loc = f"{lease_src}:第{lease_line}行" if lease_src and lease_line else f"第{lease_line}行"
            ret_loc = f"{ret_src}:第{ret_line}行" if ret_src and ret_line else f"第{ret_line}行"
            cycle_desc_parts.append(
                f"第{cd['cycle_index']}段({cd['lease_date']}~{cd['return_date']}):"
                f"油耗{cd['seg_fuel']:.2f}L,工时{cd['seg_hours']:.2f}h,"
                f"油耗率{cd['seg_fuel_rate']:.2f}L/h;"
                f"租出[{lease_loc}],归还[{ret_loc}],"
                f"加油[{'; '.join(fuel_srcs) if fuel_srcs else '无匹配记录'}]"
            )
        overall_desc = (
            f"累计总加油量 {stats['total_fuel']:.2f}L, "
            f"总工时 {stats['total_hours']:.2f}h, "
            f"综合油耗率 {stats['fuel_rate']:.2f}L/h，超过阈值 {threshold}L/h。"
        )
        if cycle_desc_parts:
            explanation = overall_desc + " 异常分段: " + " | ".join(cycle_desc_parts)
        else:
            explanation = overall_desc
    else:
        explanation = "油耗正常"

    return {
        "equipment_id": equipment_id,
        "is_abnormal": is_abnormal,
        "fuel_rate": stats['fuel_rate'],
        "total_fuel": stats['total_fuel'],
        "total_hours": stats['total_hours'],
        "threshold": threshold,
        "cycle_count": stats['cycle_count'],
        "abnormal_cycles": abnormal_cycles,
        "cycle_details": stats['cycle_details'],
        "explanation": explanation,
    }


def check_hours_inverted(equipment_id):
    leases = get_equipment_lease_out(equipment_id)
    returns = get_equipment_return(equipment_id)

    abnormalities = []
    if not leases or not returns:
        return {
            "equipment_id": equipment_id,
            "is_abnormal": False,
            "details": [],
            "explanation": "租出或归还记录缺失，无法判断"
        }

    cycles = _pair_lease_return_cycles(leases, returns)
    for cycle in cycles:
        lease = cycle['lease']
        ret = cycle['return']
        if ret['end_hours'] < lease['start_hours']:
            abnormalities.append({
                "lease_date": lease['lease_date'],
                "start_hours": lease['start_hours'],
                "lease_source": lease.get('batch_file', ''),
                "lease_line": lease['source_line'],
                "return_date": ret['return_date'],
                "end_hours": ret['end_hours'],
                "return_source": ret.get('batch_file', ''),
                "return_line": ret['source_line'],
                "seg_hours": ret['end_hours'] - lease['start_hours'],
            })

    if not cycles:
        for ret in returns:
            matching_leases = [l for l in leases if l['lease_date'] <= ret['return_date']]
            if matching_leases:
                latest_lease = max(matching_leases, key=lambda x: x['lease_date'])
                if ret['end_hours'] < latest_lease['start_hours']:
                    abnormalities.append({
                        "lease_date": latest_lease['lease_date'],
                        "start_hours": latest_lease['start_hours'],
                        "lease_source": latest_lease.get('batch_file', ''),
                        "lease_line": latest_lease['source_line'],
                        "return_date": ret['return_date'],
                        "end_hours": ret['end_hours'],
                        "return_source": ret.get('batch_file', ''),
                        "return_line": ret['source_line'],
                        "seg_hours": ret['end_hours'] - latest_lease['start_hours'],
                    })

    return {
        "equipment_id": equipment_id,
        "is_abnormal": len(abnormalities) > 0,
        "details": abnormalities,
        "explanation": f"发现 {len(abnormalities)} 处小时数倒挂异常" if abnormalities else "小时数正常"
    }


def check_inspector_inconsistency(equipment_id):
    returns = get_equipment_return(equipment_id)
    leases = get_equipment_lease_out(equipment_id)

    abnormalities = []

    inspectors = set(r['inspector'] for r in returns if r['inspector'])
    if len(inspectors) > 1:
        abnormalities.append({
            "type": "multiple_inspectors",
            "inspectors": list(inspectors),
            "explanation": f"同一设备存在多名验收人: {', '.join(inspectors)}"
        })

    cycles = _pair_lease_return_cycles(leases, returns)
    if cycles:
        for cycle in cycles:
            lease = cycle['lease']
            ret = cycle['return']
            if lease['operator'] and ret['inspector'] and lease['operator'] != ret['inspector']:
                abnormalities.append({
                    "type": "operator_inspector_diff",
                    "operator": lease['operator'],
                    "inspector": ret['inspector'],
                    "lease_date": lease['lease_date'],
                    "return_date": ret['return_date'],
                    "lease_source": lease.get('batch_file', ''),
                    "lease_line": lease['source_line'],
                    "return_source": ret.get('batch_file', ''),
                    "return_line": ret['source_line'],
                    "explanation": f"操作人员({lease['operator']})与验收人({ret['inspector']})不一致"
                })
    else:
        for ret in returns:
            matching_leases = [l for l in leases if l['lease_date'] <= ret['return_date']]
            if matching_leases:
                latest_lease = max(matching_leases, key=lambda x: x['lease_date'])
                if latest_lease['operator'] and ret['inspector'] and latest_lease['operator'] != ret['inspector']:
                    abnormalities.append({
                        "type": "operator_inspector_diff",
                        "operator": latest_lease['operator'],
                        "inspector": ret['inspector'],
                        "lease_date": latest_lease['lease_date'],
                        "return_date": ret['return_date'],
                        "lease_source": latest_lease.get('batch_file', ''),
                        "lease_line": latest_lease['source_line'],
                        "return_source": ret.get('batch_file', ''),
                        "return_line": ret['source_line'],
                        "explanation": f"操作人员({latest_lease['operator']})与验收人({ret['inspector']})不一致"
                    })

    return {
        "equipment_id": equipment_id,
        "is_abnormal": len(abnormalities) > 0,
        "details": abnormalities,
        "explanation": f"发现 {len(abnormalities)} 处验收人不一致异常" if abnormalities else "验收人一致"
    }


def audit_equipment(equipment_id, fuel_threshold=None):
    fuel_result = check_fuel_abnormal(equipment_id, fuel_threshold)
    hours_result = check_hours_inverted(equipment_id)
    inspector_result = check_inspector_inconsistency(equipment_id)
    review = get_latest_review(equipment_id)

    anomalies = []
    if fuel_result['is_abnormal']:
        anomalies.append({
            "type": "fuel_abnormal",
            "description": fuel_result['explanation'],
            "detail": fuel_result
        })
    if hours_result['is_abnormal']:
        anomalies.append({
            "type": "hours_inverted",
            "description": hours_result['explanation'],
            "detail": hours_result
        })
    if inspector_result['is_abnormal']:
        anomalies.append({
            "type": "inspector_inconsistency",
            "description": inspector_result['explanation'],
            "detail": inspector_result
        })

    fuel_stats = compute_fuel_stats(equipment_id)

    status = "正常"
    if anomalies:
        if review and review['review_status'] == '通过':
            status = "已复核通过"
        elif review and review['review_status'] == '待复核':
            status = "待复核"
        else:
            status = "异常待处理"

    final_conclusion = "设备租赁数据正常"
    if anomalies:
        anomaly_types = [a['type'] for a in anomalies]
        if review and review['review_status'] == '通过':
            final_conclusion = f"存在异常({', '.join(anomaly_types)})，已人工复核通过"
        elif review and review['review_status'] == '待复核':
            final_conclusion = f"存在异常({', '.join(anomaly_types)})，待人工复核"
        else:
            final_conclusion = f"存在异常({', '.join(anomaly_types)})，需人工处理"

    return {
        "equipment_id": equipment_id,
        "status": status,
        "anomalies": anomalies,
        "anomaly_count": len(anomalies),
        "fuel_stats": fuel_stats,
        "latest_review": review,
        "final_conclusion": final_conclusion,
    }


def audit_all(fuel_threshold=None, anomaly_type=None):
    equipment_ids = get_all_equipment_ids()
    results = []

    for eid in equipment_ids:
        audit_result = audit_equipment(eid, fuel_threshold)

        if anomaly_type:
            type_mapping = {
                'fuel': 'fuel_abnormal',
                'hours': 'hours_inverted',
                'inspector': 'inspector_inconsistency',
            }
            target_type = type_mapping.get(anomaly_type, anomaly_type)
            has_target = any(a['type'] == target_type for a in audit_result['anomalies'])
            if not has_target:
                continue

        results.append(audit_result)

    return results


def get_import_history():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT * FROM import_batches
            ORDER BY import_time DESC
        """)
        return [dict(row) for row in c.fetchall()]
