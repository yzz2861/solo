const { prepare } = require('../db/database');

function listHearings(req, res) {
  const { date_from, date_to, courtroom_id, status, case_id } = req.query;
  let sql = `
    SELECT h.*, c.case_number, c.case_name, cr.name as courtroom_name, cr.location
    FROM hearings h
    JOIN cases c ON h.case_id = c.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE 1=1
  `;
  const params = [];

  if (date_from) {
    sql += ' AND h.hearing_date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    sql += ' AND h.hearing_date <= ?';
    params.push(date_to);
  }
  if (courtroom_id) {
    sql += ' AND h.courtroom_id = ?';
    params.push(courtroom_id);
  }
  if (status) {
    sql += ' AND h.status = ?';
    params.push(status);
  }
  if (case_id) {
    sql += ' AND h.case_id = ?';
    params.push(case_id);
  }
  sql += ' ORDER BY h.hearing_date DESC, h.start_time DESC';

  const rows = prepare(sql).all(...params);

  for (const h of rows) {
    h.seats = prepare(`
      SELECT st.code, st.name, hs.total_seats, hs.reserved_seats
      FROM hearing_seats hs
      JOIN seat_types st ON hs.seat_type_id = st.id
      WHERE hs.hearing_id = ?
    `).all(h.id);
  }

  res.json({ code: 0, data: rows });
}

function getHearing(req, res) {
  const { id } = req.params;
  const row = prepare(`
    SELECT h.*, c.case_number, c.case_name, c.sensitive_remark, cr.name as courtroom_name, cr.location
    FROM hearings h
    JOIN cases c ON h.case_id = c.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE h.id = ?
  `).get(id);

  if (!row) {
    return res.status(404).json({ code: 404, message: '场次不存在' });
  }

  row.seats = prepare(`
    SELECT st.id, st.code, st.name, hs.total_seats, hs.reserved_seats
    FROM hearing_seats hs
    JOIN seat_types st ON hs.seat_type_id = st.id
    WHERE hs.hearing_id = ?
  `).all(id);

  res.json({ code: 0, data: row });
}

function createHearing(req, res) {
  const { case_id, courtroom_id, hearing_date, start_time, end_time, seats } = req.body;

  if (!case_id || !courtroom_id || !hearing_date || !start_time) {
    return res.status(400).json({ code: 400, message: '案件、庭室、日期、开始时间为必填项' });
  }

  const caseExists = prepare('SELECT id FROM cases WHERE id = ?').get(case_id);
  if (!caseExists) {
    return res.status(400).json({ code: 400, message: '案件不存在' });
  }
  const courtroomExists = prepare('SELECT id FROM courtrooms WHERE id = ?').get(courtroom_id);
  if (!courtroomExists) {
    return res.status(400).json({ code: 400, message: '庭室不存在' });
  }

  const conflict = prepare(`
    SELECT id FROM hearings
    WHERE courtroom_id = ? AND hearing_date = ?
    AND ((start_time <= ? AND (? < COALESCE(end_time, '23:59')))
      OR (start_time < COALESCE(?, '23:59') AND COALESCE(end_time, '23:59') > ?))
    AND status != 'canceled' AND status != 'closed'
  `).get(courtroom_id, hearing_date, start_time, start_time, end_time || null, start_time);

  if (conflict) {
    return res.status(400).json({ code: 400, message: '该庭室在此时段已有安排' });
  }

  const stmt = prepare(`
    INSERT INTO hearings (case_id, courtroom_id, hearing_date, start_time, end_time)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(case_id, courtroom_id, hearing_date, start_time, end_time || null);
  const hearingId = result.lastInsertRowid;

  if (seats && Array.isArray(seats)) {
    const seatStmt = prepare(`
      INSERT INTO hearing_seats (hearing_id, seat_type_id, total_seats)
      VALUES (?, ?, ?)
    `);
    for (const s of seats) {
      if (s.seat_type_id && s.total_seats != null) {
        seatStmt.run(hearingId, s.seat_type_id, s.total_seats);
      }
    }
  } else {
    const allTypes = prepare('SELECT id FROM seat_types').all();
    const seatStmt = prepare(`
      INSERT INTO hearing_seats (hearing_id, seat_type_id, total_seats)
      VALUES (?, ?, 0)
    `);
    for (const t of allTypes) {
      seatStmt.run(hearingId, t.id);
    }
  }
  const newHearing = prepare(`
    SELECT h.*, c.case_number, c.case_name, cr.name as courtroom_name
    FROM hearings h JOIN cases c ON h.case_id = c.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE h.id = ?
  `).get(hearingId);

  newHearing.seats = prepare(`
    SELECT st.code, st.name, hs.total_seats, hs.reserved_seats
    FROM hearing_seats hs JOIN seat_types st ON hs.seat_type_id = st.id
    WHERE hs.hearing_id = ?
  `).all(hearingId);

  res.json({ code: 0, data: newHearing, message: '场次创建成功' });
}

function updateHearing(req, res) {
  const { id } = req.params;
  const { case_id, courtroom_id, hearing_date, start_time, end_time, seats, status, change_reason } = req.body;

  const existing = prepare('SELECT * FROM hearings WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '场次不存在' });
  }

  const validStatuses = ['scheduled', 'ongoing', 'completed', 'canceled', 'closed'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ code: 400, message: '状态值无效' });
  }

  if (courtroom_id || hearing_date || start_time || end_time) {
    const checkCourtroom = courtroom_id || existing.courtroom_id;
    const checkDate = hearing_date || existing.hearing_date;
    const checkStart = start_time || existing.start_time;
    const checkEnd = end_time || existing.end_time;

    const conflict = prepare(`
      SELECT id FROM hearings
      WHERE id != ? AND courtroom_id = ? AND hearing_date = ?
      AND ((start_time <= ? AND (? < COALESCE(end_time, '23:59')))
        OR (start_time < COALESCE(?, '23:59') AND COALESCE(end_time, '23:59') > ?))
      AND status != 'canceled' AND status != 'closed'
    `).get(id, checkCourtroom, checkDate, checkStart, checkStart, checkEnd || null, checkStart);

    if (conflict) {
      return res.status(400).json({ code: 400, message: '该庭室在此时段已有安排' });
    }
  }

  try {
    const stmt = prepare(`
      UPDATE hearings SET
        case_id = COALESCE(?, case_id),
        courtroom_id = COALESCE(?, courtroom_id),
        hearing_date = COALESCE(?, hearing_date),
        start_time = COALESCE(?, start_time),
        end_time = ?,
        status = COALESCE(?, status),
        change_reason = COALESCE(?, change_reason),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `);
    stmt.run(
      case_id || null,
      courtroom_id || null,
      hearing_date || null,
      start_time || null,
      end_time !== undefined ? end_time : existing.end_time,
      status || null,
      change_reason !== undefined ? change_reason : existing.change_reason,
      id
    );

    if (seats && Array.isArray(seats)) {
      for (const s of seats) {
        if (s.seat_type_id && s.total_seats != null) {
          const seatRow = prepare(
            'SELECT reserved_seats FROM hearing_seats WHERE hearing_id = ? AND seat_type_id = ?'
          ).get(id, s.seat_type_id);

          if (seatRow && s.total_seats < seatRow.reserved_seats) {
            throw new Error(`席位总数不能小于已预约数(${seatRow.reserved_seats})`);
          }

          prepare(`
            INSERT INTO hearing_seats (hearing_id, seat_type_id, total_seats)
            VALUES (?, ?, ?)
            ON CONFLICT(hearing_id, seat_type_id) DO UPDATE SET total_seats = excluded.total_seats
          `).run(id, s.seat_type_id, s.total_seats);
        }
      }
    }
  } catch (err) {
    return res.status(400).json({ code: 400, message: err.message });
  }

  const updated = prepare(`
    SELECT h.*, c.case_number, c.case_name, cr.name as courtroom_name
    FROM hearings h JOIN cases c ON h.case_id = c.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE h.id = ?
  `).get(id);
  updated.seats = prepare(`
    SELECT st.code, st.name, hs.total_seats, hs.reserved_seats
    FROM hearing_seats hs JOIN seat_types st ON hs.seat_type_id = st.id
    WHERE hs.hearing_id = ?
  `).all(id);

  res.json({ code: 0, data: updated, message: '场次更新成功' });
}

function deleteHearing(req, res) {
  const { id } = req.params;

  const existing = prepare('SELECT * FROM hearings WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '场次不存在' });
  }

  const approvedCount = prepare(
    "SELECT COUNT(*) as cnt FROM reservations WHERE hearing_id = ? AND review_status = 'approved'"
  ).get(id).cnt;

  if (approvedCount > 0 && existing.status !== 'canceled' && existing.status !== 'closed') {
    return res.status(400).json({
      code: 400,
      message: `该场次已有 ${approvedCount} 人审核通过，请先将场次设为取消或闭庭状态`
    });
  }

  prepare('DELETE FROM reservations WHERE hearing_id = ?').run(id);
  prepare('DELETE FROM hearing_seats WHERE hearing_id = ?').run(id);
  prepare('DELETE FROM hearings WHERE id = ?').run(id);

  res.json({ code: 0, message: '场次删除成功' });
}

function listCourtrooms(req, res) {
  const rows = prepare('SELECT * FROM courtrooms ORDER BY id').all();
  res.json({ code: 0, data: rows });
}

function listSeatTypes(req, res) {
  const rows = prepare('SELECT * FROM seat_types ORDER BY id').all();
  res.json({ code: 0, data: rows });
}

module.exports = {
  listHearings,
  getHearing,
  createHearing,
  updateHearing,
  deleteHearing,
  listCourtrooms,
  listSeatTypes
};
