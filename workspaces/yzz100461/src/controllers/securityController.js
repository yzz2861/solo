const { prepare } = require('../db/database');
const moment = require('moment');

function _maskIdCard(idCard) {
  if (!idCard || idCard.length < 8) return idCard;
  return idCard.slice(0, 6) + '********' + idCard.slice(-4);
}

function _maskName(name) {
  if (!name || name.length <= 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name.slice(-1);
}

function getSecurityList(req, res) {
  const { hearing_id, courtroom_id, date, include_sensitive } = req.query;

  if (!hearing_id && (!courtroom_id || !date)) {
    return res.status(400).json({
      code: 400,
      message: '请提供 hearing_id，或同时提供 courtroom_id 和 date'
    });
  }

  let sql = `
    SELECT r.id, r.review_status, r.verification_status, r.verified_at,
           r.apply_source, r.seat_type_id,
           a.id_card, a.name, a.phone,
           st.code as seat_type_code, st.name as seat_type_name,
           h.id as hearing_id, h.hearing_date, h.start_time, h.end_time, h.status as hearing_status,
           c.case_number, c.case_name,
           cr.id as courtroom_id, cr.name as courtroom_name
    FROM reservations r
    JOIN applicants a ON r.applicant_id = a.id
    JOIN seat_types st ON r.seat_type_id = st.id
    JOIN hearings h ON r.hearing_id = h.id
    JOIN cases c ON h.case_id = c.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE 1=1
  `;
  const params = [];

  if (hearing_id) {
    sql += ' AND h.id = ?';
    params.push(hearing_id);
  }
  if (courtroom_id) {
    sql += ' AND cr.id = ?';
    params.push(courtroom_id);
  }
  if (date) {
    sql += ' AND h.hearing_date = ?';
    params.push(date);
  }

  sql += ` AND r.review_status IN ('approved', 'pending_notice')`;
  sql += ` ORDER BY cr.name, h.start_time, st.id, a.name`;

  const rows = prepare(sql).all(...params);

  const result = rows.map(r => {
    const item = {
      reservation_id: r.id,
      hearing_id: r.hearing_id,
      case_number: r.case_number,
      case_name: r.case_name,
      courtroom: r.courtroom_name,
      hearing_date: r.hearing_date,
      start_time: r.start_time,
      end_time: r.end_time,
      hearing_status: r.hearing_status,
      name: include_sensitive ? r.name : _maskName(r.name),
      id_card: include_sensitive ? r.id_card : _maskIdCard(r.id_card),
      phone: include_sensitive ? r.phone : (r.phone ? r.phone.slice(0, 3) + '****' + r.phone.slice(-4) : null),
      seat_type: r.seat_type_name,
      seat_type_code: r.seat_type_code,
      apply_source: r.apply_source,
      review_status: r.review_status,
      verification_status: r.verification_status,
      verified_at: r.verified_at
    };
    if (include_sensitive) {
      item.sensitive_remark = r.sensitive_remark;
    }
    return item;
  });

  const grouped = {};
  for (const item of result) {
    const key = `${item.courtroom}|${item.hearing_date}|${item.start_time}|${item.hearing_id}`;
    if (!grouped[key]) {
      grouped[key] = {
        hearing_id: item.hearing_id,
        case_number: item.case_number,
        case_name: item.case_name,
        courtroom: item.courtroom,
        hearing_date: item.hearing_date,
        start_time: item.start_time,
        end_time: item.end_time,
        hearing_status: item.hearing_status,
        seat_summary: { PUBLIC: 0, MEDIA: 0, INTERNAL: 0 },
        verification_summary: { unverified: 0, arrived: 0, no_show: 0 },
        people: []
      };
    }
    grouped[key].seat_summary[item.seat_type_code] = (grouped[key].seat_summary[item.seat_type_code] || 0) + 1;
    grouped[key].verification_summary[item.verification_status]++;
    grouped[key].people.push(item);
  }

  res.json({
    code: 0,
    data: {
      total: result.length,
      groups: Object.values(grouped),
      flat_list: result
    }
  });
}

function getShortListByCourtroom(req, res) {
  const { courtroom_id, date } = req.params;
  const { format = 'json' } = req.query;

  if (!courtroom_id || !date) {
    return res.status(400).json({ code: 400, message: '庭室ID和日期必填' });
  }

  const hearings = prepare(`
    SELECT h.id, h.start_time, h.end_time, c.case_number, c.case_name, cr.name as courtroom_name
    FROM hearings h
    JOIN cases c ON h.case_id = c.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE h.courtroom_id = ? AND h.hearing_date = ?
      AND h.status NOT IN ('canceled', 'closed')
    ORDER BY h.start_time
  `).all(courtroom_id, date);

  if (hearings.length === 0) {
    return res.json({ code: 0, data: [], message: '该庭室当日无庭审安排' });
  }

  const allData = [];

  for (const h of hearings) {
    const people = prepare(`
      SELECT r.id, r.verification_status, a.name, a.id_card,
             st.code as seat_type_code, st.name as seat_type_name,
             r.apply_source, r.review_status
      FROM reservations r
      JOIN applicants a ON r.applicant_id = a.id
      JOIN seat_types st ON r.seat_type_id = st.id
      WHERE r.hearing_id = ? AND r.review_status IN ('approved', 'pending_notice')
      ORDER BY st.id, a.name
    `).all(h.id);

    const seatGroups = {};
    for (const p of people) {
      const code = p.seat_type_code;
      if (!seatGroups[code]) {
        seatGroups[code] = { type_name: p.seat_type_name, list: [] };
      }
      seatGroups[code].list.push({
        reservation_id: p.id,
        name: _maskName(p.name),
        id_card_masked: _maskIdCard(p.id_card),
        apply_source: p.apply_source,
        verification_status: p.verification_status
      });
    }

    allData.push({
      hearing_id: h.id,
      case_number: h.case_number,
      case_name: h.case_name,
      courtroom: h.courtroom_name,
      date,
      start_time: h.start_time,
      end_time: h.end_time,
      total_people: people.length,
      seat_groups: seatGroups,
      printed_at: moment().format('YYYY-MM-DD HH:mm:ss')
    });
  }

  if (format === 'text') {
    let text = '';
    for (const h of allData) {
      text += `\n${'='.repeat(50)}\n`;
      text += `庭室：${h.courtroom}    日期：${h.date}\n`;
      text += `案号：${h.case_number}\n`;
      text += `案由：${h.case_name}\n`;
      text += `时间：${h.start_time}${h.end_time ? ' - ' + h.end_time : ''}    人数：${h.total_people}\n`;
      text += `${'-'.repeat(50)}\n`;
      for (const [code, group] of Object.entries(h.seat_groups)) {
        text += `\n【${group.type_name}】(${group.list.length}人)\n`;
        text += `序号\t姓名\t证件号\t\t来源\t状态\n`;
        group.list.forEach((p, i) => {
          text += `${i + 1}\t${p.name}\t${p.id_card_masked}\t${p.apply_source}\t${p.verification_status}\n`;
        });
      }
      text += `\n打印时间：${h.printed_at}\n`;
    }
    res.set('Content-Type', 'text/plain; charset=utf-8');
    return res.send(text);
  }

  res.json({
    code: 0,
    data: allData,
    message: '安检短名单（已脱敏）'
  });
}

function verifyPerson(req, res) {
  const { reservation_id, id_card, action } = req.body;

  if (!reservation_id && !id_card) {
    return res.status(400).json({ code: 400, message: '请提供预约ID或证件号' });
  }
  if (!action || !['arrive', 'no_show', 'reset'].includes(action)) {
    return res.status(400).json({ code: 400, message: '操作类型无效(arrive/no_show/reset)' });
  }

  let reservation;
  if (reservation_id) {
    reservation = prepare(`
      SELECT r.*, a.id_card as real_id_card, h.hearing_date, h.start_time, h.status as hearing_status
      FROM reservations r
      JOIN applicants a ON r.applicant_id = a.id
      JOIN hearings h ON r.hearing_id = h.id
      WHERE r.id = ?
    `).get(reservation_id);
  } else if (id_card) {
    const today = moment().format('YYYY-MM-DD');
    reservation = prepare(`
      SELECT r.*, a.id_card as real_id_card, h.hearing_date, h.start_time, h.status as hearing_status
      FROM reservations r
      JOIN applicants a ON r.applicant_id = a.id
      JOIN hearings h ON r.hearing_id = h.id
      WHERE a.id_card = ? AND h.hearing_date = ?
        AND r.review_status IN ('approved', 'pending_notice')
      ORDER BY h.start_time LIMIT 1
    `).get(id_card, today);
  }

  if (!reservation) {
    return res.status(404).json({ code: 404, message: '未找到有效预约' });
  }

  if (!['approved', 'pending_notice'].includes(reservation.review_status)) {
    return res.status(400).json({
      code: 400,
      message: `预约审核状态为 ${reservation.review_status}，无法核验`
    });
  }

  if (id_card && reservation.real_id_card !== id_card) {
    return res.status(400).json({ code: 400, message: '证件号与预约信息不匹配' });
  }

  if (action === 'arrive' && reservation.verification_status === 'arrived') {
    return res.status(400).json({ code: 400, message: '该人员已核验入场，请勿重复操作' });
  }

  const verificationMap = {
    arrive: 'arrived',
    no_show: 'no_show',
    reset: 'unverified'
  };

  prepare(`
    UPDATE reservations SET
      verification_status = ?,
      verified_at = CASE WHEN ? = 'unverified' THEN NULL ELSE datetime('now','localtime') END,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(verificationMap[action], verificationMap[action], reservation.id);

  const result = prepare(`
    SELECT r.id, r.verification_status, r.verified_at, r.review_status,
           a.name, a.id_card,
           st.code as seat_type_code, st.name as seat_type_name,
           h.hearing_date, h.start_time, c.case_number, c.case_name, cr.name as courtroom_name
    FROM reservations r
    JOIN applicants a ON r.applicant_id = a.id
    JOIN seat_types st ON r.seat_type_id = st.id
    JOIN hearings h ON r.hearing_id = h.id
    JOIN cases c ON h.case_id = c.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE r.id = ?
  `).get(reservation.id);

  const display = {
    ...result,
    name: _maskName(result.name),
    id_card_masked: _maskIdCard(result.id_card)
  };
  delete display.id_card;

  const actionText = { arrive: '入场核验成功', no_show: '已标记为爽约', reset: '已重置核验状态' }[action];
  res.json({ code: 0, data: display, message: actionText });
}

function getVerificationStats(req, res) {
  const { hearing_id, date, courtroom_id } = req.query;

  let sql = `
    SELECT h.id as hearing_id, c.case_number, c.case_name, cr.name as courtroom,
           h.hearing_date, h.start_time, h.status as hearing_status,
           SUM(CASE WHEN r.review_status = 'approved' THEN 1 ELSE 0 END) as approved_count,
           SUM(CASE WHEN r.review_status = 'pending_notice' THEN 1 ELSE 0 END) as pending_notice_count,
           SUM(CASE WHEN r.verification_status = 'arrived' THEN 1 ELSE 0 END) as arrived_count,
           SUM(CASE WHEN r.verification_status = 'no_show' THEN 1 ELSE 0 END) as no_show_count,
           SUM(CASE WHEN r.verification_status = 'unverified' AND r.review_status IN ('approved','pending_notice') THEN 1 ELSE 0 END) as unverified_count
    FROM hearings h
    LEFT JOIN reservations r ON r.hearing_id = h.id
    JOIN cases c ON h.case_id = c.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE 1=1
  `;
  const params = [];

  if (hearing_id) {
    sql += ' AND h.id = ?';
    params.push(hearing_id);
  }
  if (date) {
    sql += ' AND h.hearing_date = ?';
    params.push(date);
  }
  if (courtroom_id) {
    sql += ' AND cr.id = ?';
    params.push(courtroom_id);
  }

  sql += ' GROUP BY h.id ORDER BY h.hearing_date, h.start_time';

  const rows = prepare(sql).all(...params);

  res.json({ code: 0, data: rows });
}

module.exports = {
  getSecurityList,
  getShortListByCourtroom,
  verifyPerson,
  getVerificationStats
};
