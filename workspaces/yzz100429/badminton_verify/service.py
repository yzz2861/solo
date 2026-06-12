import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from .database import get_db, ensure_initialized
from .models import (
    Player, Registration, Payment, ImportRecord,
    GroupRule, GroupAssignment, Anomaly
)
from .utils import (
    normalize_name, normalize_phone, is_valid_phone, has_name_spaces,
    compute_file_hash, compute_data_hash, safe_str, calculate_age
)
from .reader import read_and_parse

ANOMALY_TYPES = {
    "NAME_WITH_SPACES": "姓名含空格或特殊字符",
    "INVALID_PHONE": "手机号格式错误或缺失",
    "PHONE_INCOMPLETE": "手机号位数不足",
    "DUPLICATE_REGISTRATION": "同一项目重复报名",
    "MULTIPLE_EVENTS_WARNING": "报名多个项目",
    "PAYMENT_MISMATCH": "缴费金额不符",
    "NO_PAYMENT": "未查到缴费记录",
    "MIXED_DOUBLE_SINGLE_PAY": "混双仅一人缴费",
    "PARTNER_NOT_FOUND": "未找到搭档信息",
    "PARTNER_PHONE_MISSING": "搭档手机号缺失",
    "AGE_GROUP_MISMATCH": "年龄与组别不符",
    "NO_AGE_INFO": "缺少出生日期信息",
    "CLUB_REP_NO_CLUB": "代报但未注明俱乐部",
    "MERGE_SUSPECTED": "疑似同一人多身份",
    "LOW_CONFIDENCE_MATCH": "匹配置信度低",
}


def check_duplicate_import(db: Session, file_path: str) -> Optional[ImportRecord]:
    file_hash = compute_file_hash(file_path)
    return db.query(ImportRecord).filter(ImportRecord.file_hash == file_hash).first()


def _find_or_create_player(db: Session, record: Dict[str, Any]) -> Tuple[Player, bool, List[Dict[str, Any]]]:
    anomalies = []
    is_existing = False
    name = record.get("name") or ""
    phone = record.get("phone") or ""
    id_last4 = record.get("id_card_last4") or ""
    club = record.get("club") or ""

    query = db.query(Player)
    filters = []

    if name and phone:
        filters.append(and_(
            Player.normalized_name == name,
            Player.normalized_phone == phone
        ))
    if name and id_last4:
        filters.append(and_(
            Player.normalized_name == name,
            Player.id_card_last4 == id_last4
        ))
    if phone:
        filters.append(Player.normalized_phone == phone)
    if filters:
        query = query.filter(or_(*filters))

    candidates = query.all()
    matched = None
    merge_suspects = []

    for cand in candidates:
        score = 0
        reasons = []
        if name and cand.normalized_name == name:
            score += 40
            reasons.append("姓名匹配")
        if phone and cand.normalized_phone == phone:
            score += 40
            reasons.append("手机匹配")
        if id_last4 and cand.id_card_last4 == id_last4:
            score += 30
            reasons.append("身份证后4位匹配")
        if club and cand.club and cand.club == club:
            score += 10
            reasons.append("俱乐部匹配")
        if score >= 40:
            if matched is None or score > matched[1]:
                matched = (cand, score, reasons)
        elif score >= 20:
            merge_suspects.append((cand, score, reasons))

    player = None
    if matched:
        player = matched[0]
        is_existing = True
        updated = False
        if not player.phone and phone:
            player.phone = record.get("raw_phone")
            player.normalized_phone = phone
            updated = True
        if not player.id_card_last4 and id_last4:
            player.id_card_last4 = id_last4
            updated = True
        if not player.club and club:
            player.club = club
            updated = True
        if not player.gender and record.get("gender"):
            player.gender = record.get("gender")
            updated = True
        if not player.birth_year and record.get("birth_year"):
            player.birth_year = record.get("birth_year")
            updated = True
        if not player.wechat_id and record.get("wechat_id"):
            player.wechat_id = record.get("wechat_id")
            updated = True
        if updated:
            player.updated_at = datetime.now()
    else:
        player = Player(
            name=record.get("raw_name") or name,
            normalized_name=name,
            phone=record.get("raw_phone") or phone,
            normalized_phone=phone,
            id_card_last4=id_last4,
            gender=record.get("gender"),
            birth_year=record.get("birth_year"),
            club=club,
            wechat_id=record.get("wechat_id"),
        )
        db.add(player)
        db.flush()

    for cand, score, reasons in merge_suspects:
        if cand.id != player.id:
            anomalies.append({
                "player_id": player.id,
                "anomaly_type": "MERGE_SUSPECTED",
                "severity": "info",
                "description": f"疑似与选手#{cand.id}({cand.name})为同一人，匹配分数{score}：{'+'.join(reasons)}",
                "field_name": "player_match",
                "field_value": f"player_{cand.id}",
            })

    return player, is_existing, anomalies


def _detect_registration_anomalies(
    db: Session, record: Dict[str, Any], player: Player,
    import_record: ImportRecord
) -> List[Anomaly]:
    anomalies = []

    raw_name = record.get("raw_name") or ""
    if has_name_spaces(raw_name):
        anomalies.append(Anomaly(
            player_id=player.id,
            anomaly_type="NAME_WITH_SPACES",
            severity="warning",
            description=f"姓名「{raw_name}」含空格或特殊字符，已自动标准化为「{player.normalized_name}」",
            field_name="name",
            field_value=raw_name,
            expected_value=player.normalized_name,
        ))

    raw_phone = record.get("raw_phone") or ""
    norm_phone = record.get("phone") or ""
    if not norm_phone:
        anomalies.append(Anomaly(
            player_id=player.id,
            anomaly_type="INVALID_PHONE",
            severity="error",
            description="手机号缺失，无法联系与验重",
            field_name="phone",
            field_value=raw_phone,
        ))
    elif not is_valid_phone(norm_phone):
        anomalies.append(Anomaly(
            player_id=player.id,
            anomaly_type="PHONE_INCOMPLETE",
            severity="warning",
            description=f"手机号「{raw_phone}」格式异常（{len(norm_phone)}位），请确认",
            field_name="phone",
            field_value=norm_phone,
            expected_value="11位有效手机号",
        ))

    return anomalies


def _check_duplicate_registrations(
    db: Session, player: Player, events: List[str], current_reg_id: Optional[int] = None
) -> List[Anomaly]:
    anomalies = []
    event_counts = defaultdict(list)

    existing = db.query(Registration).filter(
        Registration.player_id == player.id,
        Registration.is_valid == True
    ).all()
    if current_reg_id:
        existing = [r for r in existing if r.id != current_reg_id]

    for reg in existing:
        event_counts[reg.event].append(reg)

    for event in events:
        all_events = [event] + [r.event for r in event_counts.get(event, [])]
        total = len(set(all_events)) if len(event_counts.get(event, [])) > 0 else 1
        if event_counts.get(event):
            anomalies.append(Anomaly(
                player_id=player.id,
                anomaly_type="DUPLICATE_REGISTRATION",
                severity="error",
                description=f"项目「{event}」已有报名记录（编号#{event_counts[event][0].id}），请勿重复报名",
                field_name="event",
                field_value=event,
            ))

    if len(events) > 1:
        anomalies.append(Anomaly(
            player_id=player.id,
            anomaly_type="MULTIPLE_EVENTS_WARNING",
            severity="info",
            description=f"同时报名 {len(events)} 个项目: {', '.join(events)}，请注意赛程是否冲突",
            field_name="events",
            field_value=",".join(events),
        ))

    return anomalies


def _match_partner(db: Session, partner_name: str, partner_phone: str) -> Optional[Player]:
    if not partner_name:
        return None
    query = db.query(Player).filter(Player.normalized_name == partner_name)
    if partner_phone:
        query = query.filter(Player.normalized_phone == partner_phone)
    result = query.first()
    if result:
        return result
    if partner_phone:
        return db.query(Player).filter(Player.normalized_phone == partner_phone).first()
    return None


def _match_payment_for_player(
    db: Session, player: Player, expected_fee: float
) -> Tuple[List[Payment], List[Anomaly]]:
    anomalies = []
    matched_payments = []

    candidates = db.query(Payment).filter(
        or_(
            and_(Payment.player_id == player.id),
            and_(Payment.normalized_payer_name == player.normalized_name),
            and_(Payment.normalized_payer_name != "",
                 Payment.normalized_payer_name == player.normalized_name),
        )
    ).all()

    if player.normalized_phone:
        phone_cands = db.query(Payment).filter(
            Payment.phone == player.normalized_phone
        ).all()
        for pc in phone_cands:
            if pc not in candidates:
                candidates.append(pc)

    total_paid = 0.0
    for pmt in candidates:
        if pmt.player_id is None:
            pmt.player_id = player.id
        matched_payments.append(pmt)
        if pmt.amount:
            total_paid += pmt.amount

    if not matched_payments:
        anomalies.append(Anomaly(
            player_id=player.id,
            anomaly_type="NO_PAYMENT",
            severity="error",
            description=f"未查到「{player.name}」的缴费记录，应缴金额 ¥{expected_fee:.2f}",
            field_name="payment",
            expected_value=f"¥{expected_fee:.2f}",
        ))
    else:
        if abs(total_paid - expected_fee) > 0.01:
            anomalies.append(Anomaly(
                player_id=player.id,
                anomaly_type="PAYMENT_MISMATCH",
                severity="warning",
                description=f"缴费金额不符：实缴 ¥{total_paid:.2f}，应缴 ¥{expected_fee:.2f}",
                field_name="payment_amount",
                field_value=f"¥{total_paid:.2f}",
                expected_value=f"¥{expected_fee:.2f}",
            ))
        for pmt in matched_payments:
            pmt.is_verified = True
            pmt.expected_amount = expected_fee

    return matched_payments, anomalies


def _check_mixed_double_payment(
    db: Session, reg: Registration, partner: Optional[Player], fee: float
) -> List[Anomaly]:
    anomalies = []
    if not partner:
        return anomalies
    if not ("混双" in reg.event or "混合" in reg.event or "Mixed" in reg.event):
        return anomalies

    player_pmts = db.query(Payment).filter(Payment.player_id == reg.player_id).all()
    partner_pmts = db.query(Payment).filter(Payment.player_id == partner.id).all()

    player_paid = sum(p.amount or 0 for p in player_pmts)
    partner_paid = sum(p.amount or 0 for p in partner_pmts)

    if player_paid >= fee and partner_paid < fee:
        anomalies.append(Anomaly(
            player_id=partner.id,
            registration_id=reg.id,
            anomaly_type="MIXED_DOUBLE_SINGLE_PAY",
            severity="error",
            description=f"混双搭档「{partner.name}」尚未缴费（搭档「{reg.player.name}」已缴费），请联系确认",
            field_name="mixed_double_payment",
        ))
    elif partner_paid >= fee and player_paid < fee:
        anomalies.append(Anomaly(
            player_id=reg.player_id,
            registration_id=reg.id,
            anomaly_type="MIXED_DOUBLE_SINGLE_PAY",
            severity="error",
            description=f"混双选手「{reg.player.name}」尚未缴费（搭档「{partner.name}」已缴费），请联系确认",
            field_name="mixed_double_payment",
        ))

    return anomalies


def _assign_group_rule(
    db: Session, reg: Registration, player: Player, tournament_year: Optional[int] = None
) -> Tuple[Optional[GroupRule], List[Anomaly]]:
    anomalies = []
    age = calculate_age(player.birth_year, tournament_year)

    rules = db.query(GroupRule).filter(
        GroupRule.is_active == True,
        GroupRule.event == reg.event
    ).all()

    matched = None
    if rules:
        for rule in rules:
            min_a = rule.min_age or 0
            max_a = rule.max_age or 999
            if reg.age_group and rule.age_group == reg.age_group:
                matched = rule
                break
            if age is not None and min_a <= age <= max_a:
                matched = rule
                break

        if matched is None and rules:
            if age is None:
                anomalies.append(Anomaly(
                    player_id=player.id,
                    registration_id=reg.id,
                    anomaly_type="NO_AGE_INFO",
                    severity="warning",
                    description=f"缺少出生日期信息，无法自动匹配「{reg.event}」的年龄组，请手动指定",
                    field_name="age_group",
                ))
            else:
                anomalies.append(Anomaly(
                    player_id=player.id,
                    registration_id=reg.id,
                    anomaly_type="AGE_GROUP_MISMATCH",
                    severity="warning",
                    description=f"年龄 {age} 岁不符合「{reg.event}」现有年龄组范围，请确认组别规则",
                    field_name="age",
                    field_value=str(age),
                ))

    if matched is None and reg.age_group:
        matched = db.query(GroupRule).filter(
            GroupRule.is_active == True,
            GroupRule.event == reg.event,
            GroupRule.age_group == reg.age_group
        ).first()

    return matched, anomalies


def import_registrations(
    file_path: str, source_type: Optional[str] = None, tournament_year: Optional[int] = None
) -> Dict[str, Any]:
    ensure_initialized()
    db = next(get_db())

    try:
        dup = check_duplicate_import(db, file_path)
        if dup:
            return {
                "status": "skipped",
                "message": f"文件已导入（编号#{dup.id}），跳过以避免重复。文件名：{dup.file_name}，导入时间：{dup.imported_at}",
                "import_record_id": dup.id,
                "row_count": dup.row_count,
            }

        parsed = read_and_parse(file_path, source_type)

        import_rec = ImportRecord(
            file_hash=compute_file_hash(file_path),
            file_name=os.path.basename(file_path),
            source_type=parsed["source_type"],
            row_count=parsed["row_count"],
            status="processing",
        )
        db.add(import_rec)
        db.flush()

        stats = {
            "players_created": 0,
            "players_merged": 0,
            "registrations_created": 0,
            "payments_created": 0,
            "payments_matched": 0,
            "anomalies_created": 0,
            "errors": [],
        }

        if parsed["record_type"] == "registration":
            for record in parsed["records"]:
                try:
                    player, is_existing, pre_anomalies = _find_or_create_player(db, record)
                    if not player.id:
                        db.flush()
                    if is_existing:
                        stats["players_merged"] += 1
                    else:
                        stats["players_created"] += 1

                    for a in pre_anomalies:
                        anom = Anomaly(**a)
                        db.add(anom)
                        stats["anomalies_created"] += 1

                    base_anoms = _detect_registration_anomalies(db, record, player, import_rec)
                    for a in base_anoms:
                        db.add(a)
                        stats["anomalies_created"] += 1

                    if record.get("club_representative") and not record.get("club"):
                        anom = Anomaly(
                            player_id=player.id,
                            anomaly_type="CLUB_REP_NO_CLUB",
                            severity="info",
                            description=f"由「{record['club_representative']}」代报，但未注明所属俱乐部",
                            field_name="club_representative",
                            field_value=record["club_representative"],
                        )
                        db.add(anom)
                        stats["anomalies_created"] += 1

                    events = record.get("events") or ["未指定"]
                    dup_anoms = _check_duplicate_registrations(db, player, events)
                    for a in dup_anoms:
                        db.add(a)
                        stats["anomalies_created"] += 1

                    partner = _match_partner(
                        db, record.get("partner_name") or "", record.get("partner_phone") or ""
                    )

                    if record.get("partner_name") and not partner:
                        anom = Anomaly(
                            player_id=player.id,
                            anomaly_type="PARTNER_NOT_FOUND",
                            severity="info",
                            description=f"未找到搭档「{record.get('partner_name')}」的独立报名记录，搭档可能未单独报名",
                            field_name="partner",
                            field_value=record.get("partner_name"),
                        )
                        db.add(anom)
                        stats["anomalies_created"] += 1
                    if record.get("partner_name") and not record.get("partner_phone"):
                        anom = Anomaly(
                            player_id=player.id,
                            anomaly_type="PARTNER_PHONE_MISSING",
                            severity="warning",
                            description=f"搭档「{record.get('partner_name')}」未填写手机号，无法核实身份",
                            field_name="partner_phone",
                        )
                        db.add(anom)
                        stats["anomalies_created"] += 1

                    for event in events:
                        reg = Registration(
                            player_id=player.id,
                            import_record_id=import_rec.id,
                            event=event,
                            age_group=record.get("age_group"),
                            partner_name=record.get("partner_name"),
                            partner_phone=record.get("partner_phone"),
                            partner_id=partner.id if partner else None,
                            club_representative=record.get("club_representative"),
                            raw_data=record.get("raw_data"),
                        )
                        db.add(reg)
                        db.flush()
                        stats["registrations_created"] += 1

                        default_fee = 100.0
                        rule, group_anoms = _assign_group_rule(db, reg, player, tournament_year)
                        for a in group_anoms:
                            db.add(a)
                            stats["anomalies_created"] += 1

                        if rule:
                            ga = GroupAssignment(
                                registration_id=reg.id,
                                rule_id=rule.id,
                            )
                            db.add(ga)
                            fee = rule.fee
                        else:
                            fee = default_fee

                        _, pay_anoms = _match_payment_for_player(db, player, fee)
                        for a in pay_anoms:
                            a.registration_id = reg.id
                            db.add(a)
                            stats["anomalies_created"] += 1

                        mix_anoms = _check_mixed_double_payment(db, reg, partner, fee)
                        for a in mix_anoms:
                            db.add(a)
                            stats["anomalies_created"] += 1

                except Exception as e:
                    stats["errors"].append(f"第{record.get('row_index', '?')}行: {str(e)}")

        elif parsed["record_type"] == "payment":
            for record in parsed["records"]:
                try:
                    payer_name = record.get("payer_name") or ""
                    phone = record.get("phone") or ""

                    player = None
                    if phone:
                        player = db.query(Player).filter(Player.normalized_phone == phone).first()
                    if not player and payer_name:
                        player = db.query(Player).filter(Player.normalized_name == payer_name).first()

                    pmt = Payment(
                        player_id=player.id if player else None,
                        import_record_id=import_rec.id,
                        payer_name=record.get("raw_payer_name"),
                        normalized_payer_name=payer_name,
                        phone=phone,
                        amount=record.get("amount"),
                        payment_method=record.get("payment_method"),
                        screenshot_ref=record.get("screenshot_ref"),
                        remark=record.get("remark"),
                        raw_data=record.get("raw_data"),
                    )
                    db.add(pmt)
                    db.flush()
                    stats["payments_created"] += 1

                    if player and record.get("amount"):
                        db.flush()
                        stats["payments_matched"] += 1

                except Exception as e:
                    stats["errors"].append(f"第{record.get('row_index', '?')}行: {str(e)}")

        import_rec.status = "completed" if not stats["errors"] else "partial"
        db.commit()

        return {
            "status": "success",
            "import_record_id": import_rec.id,
            "source_type": parsed["source_type"],
            "record_type": parsed["record_type"],
            "row_count": parsed["row_count"],
            "parsed_count": parsed["parsed_count"],
            **stats,
        }

    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()


def run_verification(tournament_year: Optional[int] = None) -> Dict[str, Any]:
    ensure_initialized()
    db = next(get_db())

    try:
        db.query(Anomaly).delete()
        db.flush()

        total_anomalies = 0
        stats = defaultdict(int)

        players = db.query(Player).all()
        for player in players:
            if has_name_spaces(player.name):
                db.add(Anomaly(
                    player_id=player.id,
                    anomaly_type="NAME_WITH_SPACES",
                    severity="warning",
                    description=f"姓名「{player.name}」含空格或特殊字符",
                    field_name="name",
                    field_value=player.name,
                    expected_value=player.normalized_name,
                ))
                total_anomalies += 1
                stats["NAME_WITH_SPACES"] += 1

            if not player.normalized_phone:
                db.add(Anomaly(
                    player_id=player.id,
                    anomaly_type="INVALID_PHONE",
                    severity="error",
                    description="手机号缺失",
                    field_name="phone",
                ))
                total_anomalies += 1
                stats["INVALID_PHONE"] += 1
            elif not is_valid_phone(player.normalized_phone):
                db.add(Anomaly(
                    player_id=player.id,
                    anomaly_type="PHONE_INCOMPLETE",
                    severity="warning",
                    description=f"手机号格式异常: {player.phone}",
                    field_name="phone",
                    field_value=player.normalized_phone,
                ))
                total_anomalies += 1
                stats["PHONE_INCOMPLETE"] += 1

        regs = db.query(Registration).filter(Registration.is_valid == True).all()
        reg_event_map = defaultdict(list)
        for reg in regs:
            reg_event_map[(reg.player_id, reg.event)].append(reg)

        for (pid, evt), regs_list in reg_event_map.items():
            if len(regs_list) > 1:
                for reg in regs_list[1:]:
                    db.add(Anomaly(
                        player_id=pid,
                        registration_id=reg.id,
                        anomaly_type="DUPLICATE_REGISTRATION",
                        severity="error",
                        description=f"项目「{evt}」重复报名（共{len(regs_list)}条）",
                        field_name="event",
                        field_value=evt,
                    ))
                    total_anomalies += 1
                    stats["DUPLICATE_REGISTRATION"] += 1

        for reg in regs:
            player = db.query(Player).get(reg.player_id)
            if not player:
                continue

            rule = None
            ga = db.query(GroupAssignment).filter(GroupAssignment.registration_id == reg.id).first()
            if ga:
                rule = db.query(GroupRule).get(ga.rule_id)
            fee = rule.fee if rule else 100.0

            _, pay_anoms = _match_payment_for_player(db, player, fee)
            for a in pay_anoms:
                a.registration_id = reg.id
                db.add(a)
                total_anomalies += 1
                stats[a.anomaly_type] = stats.get(a.anomaly_type, 0) + 1

            partner = None
            if reg.partner_id:
                partner = db.query(Player).get(reg.partner_id)
            mix_anoms = _check_mixed_double_payment(db, reg, partner, fee)
            for a in mix_anoms:
                db.add(a)
                total_anomalies += 1
                stats[a.anomaly_type] = stats.get(a.anomaly_type, 0) + 1

            _, grp_anoms = _assign_group_rule(db, reg, player, tournament_year)
            for a in grp_anoms:
                db.add(a)
                total_anomalies += 1
                stats[a.anomaly_type] = stats.get(a.anomaly_type, 0) + 1

        db.commit()
        return {
            "status": "completed",
            "total_anomalies": total_anomalies,
            "by_type": dict(stats),
            "total_players": len(players),
            "total_registrations": len(regs),
        }
    finally:
        db.close()


def load_group_rules(rules_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    ensure_initialized()
    db = next(get_db())

    try:
        added = 0
        updated = 0
        for r in rules_data:
            event = r.get("event") or r.get("项目")
            age_group = r.get("age_group") or r.get("年龄组") or r.get("组别")
            if not event or not age_group:
                continue

            existing = db.query(GroupRule).filter(
                GroupRule.event == event,
                GroupRule.age_group == age_group,
            ).first()

            fee = r.get("fee") or r.get("费用") or r.get("报名费")
            if isinstance(fee, str):
                import re
                fee = re.sub(r"[^\d.]", "", fee)
                fee = float(fee) if fee else 100.0

            if existing:
                existing.min_age = r.get("min_age") or r.get("最小年龄") or existing.min_age
                existing.max_age = r.get("max_age") or r.get("最大年龄") or existing.max_age
                existing.fee = float(fee) if fee else existing.fee
                existing.gender_rule = r.get("gender_rule") or r.get("性别限制") or existing.gender_rule
                existing.is_active = True
                updated += 1
            else:
                db.add(GroupRule(
                    event=event,
                    age_group=age_group,
                    min_age=r.get("min_age") or r.get("最小年龄"),
                    max_age=r.get("max_age") or r.get("最大年龄"),
                    fee=float(fee) if fee else 100.0,
                    gender_rule=r.get("gender_rule") or r.get("性别限制"),
                ))
                added += 1

        db.commit()
        return {"status": "success", "added": added, "updated": updated}
    finally:
        db.close()
