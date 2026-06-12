import os
from typing import List, Dict, Any, Optional
from collections import defaultdict

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import and_

from .database import get_db, ensure_initialized
from .models import (
    Player, Registration, Payment, Anomaly,
    GroupRule, GroupAssignment, ImportRecord
)
from .utils import safe_str, calculate_age


def _get_player_anomalies(db: Session, player_id: int) -> List[Anomaly]:
    return db.query(Anomaly).filter(
        Anomaly.player_id == player_id,
        Anomaly.resolved == False
    ).all()


def _get_player_payments(db: Session, player_id: int) -> List[Payment]:
    return db.query(Payment).filter(Payment.player_id == player_id).all()


def _get_group_info(db: Session, reg_id: int) -> Optional[Dict[str, Any]]:
    ga = db.query(GroupAssignment).filter(GroupAssignment.registration_id == reg_id).first()
    if not ga:
        return None
    rule = db.query(GroupRule).get(ga.rule_id)
    if not rule:
        return None
    return {
        "event": rule.event,
        "age_group": rule.age_group,
        "fee": rule.fee,
        "min_age": rule.min_age,
        "max_age": rule.max_age,
        "gender_rule": rule.gender_rule,
    }


def export_confirmed_list(output_path: str, tournament_year: Optional[int] = None) -> Dict[str, Any]:
    ensure_initialized()
    db = next(get_db())
    try:
        regs = db.query(Registration).filter(Registration.is_valid == True).all()
        confirmed_rows = []
        pending_rows = []

        for reg in regs:
            player = db.query(Player).get(reg.player_id)
            if not player:
                continue

            anomalies = _get_player_anomalies(db, player.id)
            error_anoms = [a for a in anomalies if a.severity in ("error",)]
            payments = _get_player_payments(db, player.id)
            total_paid = sum(p.amount or 0 for p in payments)

            group_info = _get_group_info(db, reg.id)
            expected_fee = group_info["fee"] if group_info else 100.0
            age = calculate_age(player.birth_year, tournament_year)

            partner_name = ""
            if reg.partner_id:
                partner = db.query(Player).get(reg.partner_id)
                if partner:
                    partner_name = partner.name

            import_src = ""
            import_rec = db.query(ImportRecord).get(reg.import_record_id)
            if import_rec:
                import_src = f"{import_rec.source_type}:{import_rec.file_name}"

            row = {
                "报名ID": reg.id,
                "姓名": player.name,
                "手机号": player.phone or "",
                "性别": player.gender or "",
                "年龄": age if age else "",
                "出生年份": player.birth_year or "",
                "身份证后4位": player.id_card_last4 or "",
                "俱乐部": player.club or "",
                "项目": reg.event,
                "组别": group_info["age_group"] if group_info else (reg.age_group or ""),
                "搭档": partner_name or (reg.partner_name or ""),
                "搭档手机": reg.partner_phone or "",
                "报名费(¥)": f"{expected_fee:.2f}",
                "已缴金额(¥)": f"{total_paid:.2f}",
                "缴费状态": "已缴清" if abs(total_paid - expected_fee) < 0.01 else ("不足" if total_paid < expected_fee else "超额"),
                "代报人": reg.club_representative or "",
                "来源": import_src,
                "异常数": len(error_anoms),
                "确认状态": "✓ 确认" if (not error_anoms and abs(total_paid - expected_fee) < 0.01) else "待确认",
            }

            if not error_anoms and abs(total_paid - expected_fee) < 0.01:
                confirmed_rows.append(row)
            else:
                pending_rows.append(row)

        if output_path.endswith(".xlsx"):
            with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
                pd.DataFrame(confirmed_rows).to_excel(writer, sheet_name="确认名单", index=False)
                pd.DataFrame(pending_rows).to_excel(writer, sheet_name="待确认", index=False)
        else:
            pd.DataFrame(confirmed_rows).to_csv(output_path, index=False, encoding="utf-8-sig")
            base, ext = os.path.splitext(output_path)
            pd.DataFrame(pending_rows).to_csv(f"{base}_pending{ext}", index=False, encoding="utf-8-sig")

        return {
            "status": "success",
            "confirmed_count": len(confirmed_rows),
            "pending_count": len(pending_rows),
            "output_path": output_path,
        }
    finally:
        db.close()


def export_contact_list(output_path: str) -> Dict[str, Any]:
    ensure_initialized()
    db = next(get_db())
    try:
        anomalies = db.query(Anomaly).filter(Anomaly.resolved == False).order_by(
            Anomaly.severity.desc(), Anomaly.created_at
        ).all()

        player_contact_map: Dict[int, Dict[str, Any]] = defaultdict(lambda: {
            "name": "", "phone": "", "club": "",
            "severity": "", "anomalies": [], "registrations": []
        })

        for anom in anomalies:
            pid = anom.player_id
            if pid:
                player = db.query(Player).get(pid)
                if player:
                    info = player_contact_map[pid]
                    info["name"] = player.name
                    info["phone"] = player.phone or ""
                    info["club"] = player.club or ""
                    sev_rank = {"error": 3, "warning": 2, "info": 1}
                    cur_rank = sev_rank.get(info["severity"], 0)
                    new_rank = sev_rank.get(anom.severity, 0)
                    if new_rank > cur_rank:
                        info["severity"] = anom.severity
                    info["anomalies"].append({
                        "type": anom.anomaly_type,
                        "severity": anom.severity,
                        "desc": anom.description,
                    })

        for pid in list(player_contact_map.keys()):
            regs = db.query(Registration).filter(
                Registration.player_id == pid,
                Registration.is_valid == True
            ).all()
            for r in regs:
                gi = _get_group_info(db, r.id)
                player_contact_map[pid]["registrations"].append({
                    "event": r.event,
                    "group": gi["age_group"] if gi else (r.age_group or ""),
                })

        rows = []
        for pid, info in sorted(player_contact_map.items(), key=lambda x: (
            {"error": 0, "warning": 1, "info": 2}.get(x[1]["severity"], 99),
            x[1]["name"]
        )):
            anomaly_descs = []
            for a in info["anomalies"]:
                sev_label = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(a["severity"], "")
                anomaly_descs.append(f"{sev_label} {a['desc']}")
            regs_desc = "; ".join([f"{r['event']}({r['group']})" for r in info["registrations"]]) or "无"
            rows.append({
                "选手ID": pid,
                "姓名": info["name"],
                "手机号": info["phone"],
                "俱乐部": info["club"],
                "最高优先级": {"error": "紧急🔴", "warning": "关注🟡", "info": "提示🔵"}.get(info["severity"], info["severity"]),
                "报名项目": regs_desc,
                "异常数量": len(info["anomalies"]),
                "问题详情": "\n".join(anomaly_descs),
                "联系状态": "待联系",
                "联系备注": "",
            })

        if output_path.endswith(".xlsx"):
            with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
                pd.DataFrame(rows).to_excel(writer, sheet_name="待联系清单", index=False)
        else:
            pd.DataFrame(rows).to_csv(output_path, index=False, encoding="utf-8-sig")

        by_severity = defaultdict(int)
        for info in player_contact_map.values():
            by_severity[info["severity"]] += 1

        return {
            "status": "success",
            "total_contacts": len(rows),
            "by_severity": dict(by_severity),
            "output_path": output_path,
        }
    finally:
        db.close()


def export_grouped_checklist(output_path: str, tournament_year: Optional[int] = None) -> Dict[str, Any]:
    ensure_initialized()
    db = next(get_db())
    try:
        rules = db.query(GroupRule).filter(GroupRule.is_active == True).order_by(
            GroupRule.event, GroupRule.age_group
        ).all()

        regs = db.query(Registration).filter(Registration.is_valid == True).all()
        grouped: Dict[tuple, List[Dict[str, Any]]] = defaultdict(list)

        for reg in regs:
            player = db.query(Player).get(reg.player_id)
            if not player:
                continue

            gi = _get_group_info(db, reg.id)
            if gi:
                key = (gi["event"], gi["age_group"])
            else:
                key = (reg.event, reg.age_group or "未分组")

            partner = None
            if reg.partner_id:
                partner = db.query(Player).get(reg.partner_id)

            age = calculate_age(player.birth_year, tournament_year)
            payments = _get_player_payments(db, player.id)
            total_paid = sum(p.amount or 0 for p in payments)
            expected_fee = gi["fee"] if gi else 100.0

            grouped[key].append({
                "序号": 0,
                "报名ID": reg.id,
                "姓名": player.name,
                "性别": player.gender or "",
                "年龄": age if age else "",
                "手机": player.phone or "",
                "俱乐部": player.club or "",
                "身份证后4位": player.id_card_last4 or "",
                "搭档": partner.name if partner else (reg.partner_name or ""),
                "搭档手机": reg.partner_phone or "",
                "报名费(¥)": f"{expected_fee:.2f}",
                "已缴(¥)": f"{total_paid:.2f}",
                "缴费OK": "✓" if abs(total_paid - expected_fee) < 0.01 else "✗",
                "签名": "",
                "检录": "",
            })

        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            summary_rows = []
            for (event, age_group), rows in sorted(grouped.items()):
                rows_sorted = sorted(rows, key=lambda x: x["姓名"])
                for i, r in enumerate(rows_sorted, 1):
                    r["序号"] = i

                sheet_name = f"{event[:10]}_{age_group[:10]}"
                sheet_name = sheet_name.replace("/", "_").replace("\\", "_")
                df = pd.DataFrame(rows_sorted)
                df = df[[c for c in ["序号", "姓名", "性别", "年龄", "手机", "俱乐部", "身份证后4位",
                                     "搭档", "搭档手机", "报名费(¥)", "已缴(¥)", "缴费OK", "签名", "检录", "报名ID"]
                         if c in df.columns]]
                df.to_excel(writer, sheet_name=sheet_name, index=False)

                summary_rows.append({
                    "项目": event,
                    "组别": age_group,
                    "参赛人数": len(rows_sorted),
                    "已缴费": sum(1 for r in rows_sorted if r["缴费OK"] == "✓"),
                    "待缴费": sum(1 for r in rows_sorted if r["缴费OK"] == "✗"),
                })

            if summary_rows:
                pd.DataFrame(summary_rows).to_excel(writer, sheet_name="汇总", index=False)

        return {
            "status": "success",
            "total_groups": len(grouped),
            "total_players": sum(len(v) for v in grouped.values()),
            "groups": [{
                "event": k[0], "age_group": k[1], "count": len(v)
            } for k, v in sorted(grouped.items())],
            "output_path": output_path,
        }
    finally:
        db.close()


def export_anomaly_report(output_path: str) -> Dict[str, Any]:
    ensure_initialized()
    db = next(get_db())
    try:
        anomalies = db.query(Anomaly).order_by(
            Anomaly.severity.desc(), Anomaly.anomaly_type, Anomaly.created_at
        ).all()

        rows = []
        by_type = defaultdict(int)
        by_severity = defaultdict(int)

        for a in anomalies:
            player = db.query(Player).get(a.player_id) if a.player_id else None
            by_type[a.anomaly_type] += 1
            by_severity[a.severity] += 1

            rows.append({
                "异常ID": a.id,
                "类型": a.anomaly_type,
                "级别": {"error": "🔴错误", "warning": "🟡警告", "info": "🔵提示"}.get(a.severity, a.severity),
                "选手": player.name if player else "",
                "选手手机": player.phone if player else "",
                "涉及字段": a.field_name or "",
                "当前值": a.field_value or "",
                "期望值": a.expected_value or "",
                "问题描述": a.description,
                "是否解决": "✓" if a.resolved else "✗",
                "解决备注": a.resolved_note or "",
                "发现时间": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "",
            })

        if output_path.endswith(".xlsx"):
            with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
                pd.DataFrame(rows).to_excel(writer, sheet_name="异常明细", index=False)
                summary = pd.DataFrame([
                    {"类型": k, "级别": "", "数量": v} for k, v in sorted(by_type.items())
                ] + [
                    {"类型": "按级别汇总", "级别": k, "数量": v} for k, v in by_severity.items()
                ])
                summary.to_excel(writer, sheet_name="统计汇总", index=False)
        else:
            pd.DataFrame(rows).to_csv(output_path, index=False, encoding="utf-8-sig")

        return {
            "status": "success",
            "total_anomalies": len(anomalies),
            "by_type": dict(by_type),
            "by_severity": dict(by_severity),
            "output_path": output_path,
        }
    finally:
        db.close()


def get_dashboard_stats() -> Dict[str, Any]:
    ensure_initialized()
    db = next(get_db())
    try:
        total_players = db.query(Player).count()
        total_regs = db.query(Registration).filter(Registration.is_valid == True).count()
        total_payments = db.query(Payment).count()
        total_paid = db.query(Payment).all()
        total_amount = sum(p.amount or 0 for p in total_paid)

        unresolved = db.query(Anomaly).filter(Anomaly.resolved == False).all()
        by_severity = defaultdict(int)
        by_type = defaultdict(int)
        for a in unresolved:
            by_severity[a.severity] += 1
            by_type[a.anomaly_type] += 1

        import_records = db.query(ImportRecord).order_by(ImportRecord.imported_at.desc()).all()
        imports_info = [{
            "id": r.id,
            "file": r.file_name,
            "source": r.source_type,
            "rows": r.row_count,
            "time": r.imported_at.strftime("%m-%d %H:%M") if r.imported_at else "",
            "status": r.status,
        } for r in import_records[:10]]

        rules = db.query(GroupRule).filter(GroupRule.is_active == True).all()
        events = sorted(set(r.event for r in rules))
        groups = [{
            "event": r.event,
            "age_group": r.age_group,
            "fee": r.fee,
            "range": f"{r.min_age or 0}-{r.max_age or '∞'}",
        } for r in rules]

        return {
            "total_players": total_players,
            "total_registrations": total_regs,
            "total_payments": total_payments,
            "total_amount": total_amount,
            "unresolved_anomalies": len(unresolved),
            "by_severity": dict(by_severity),
            "by_type": dict(by_type),
            "events": events,
            "groups_count": len(groups),
            "import_history": imports_info,
        }
    finally:
        db.close()
