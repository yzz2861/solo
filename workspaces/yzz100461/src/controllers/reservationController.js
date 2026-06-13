const { prepare } = require('../db/database');

const VALID_APPLY_SOURCES = ['群众预约', '媒体申请', '内部安排'];
const VALID_REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'merged', 'pending_notice'];
const VALID_APPLICANT_TYPES = ['群众', '媒体', '内部'];

function _getOrCreateApplicant(id_card, name, phone, organization, applicant_type) {
  let applicant = prepare('SELECT * FROM applicants WHERE id_card = ?').get(id_card);

  if (applicant) {
    prepare(`
      UPDATE applicants SET
        name = COALESCE(?, name),
        phone = ?,
        organization = ?,
        applicant_type = COALESCE(?, applicant_type),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      name || null,
      phone !== undefined ? phone : applicant.phone,
      organization !== undefined ? organization : applicant.organization,
      applicant_type || null,
      applicant.id
    );
    applicant = prepare('SELECT * FROM applicants WHERE id = ?').get(applicant.id);
  } else {
    const result = prepare(`
      INSERT INTO applicants (id_card, name, phone, organization, applicant_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(id_card, name, phone || null, organization || null, applicant_type || '群众');
    applicant = prepare('SELECT * FROM applicants WHERE id = ?').get(result.lastInsertRowid);
  }

  return applicant;
}

function listReservations(req, res) {
  const {
    hearing_id, applicant_id, review_status, verification_status,
    apply_source, seat_type_code, keyword, page = 1, page_size = 50
  } = req.query;

  let sql = `
    SELECT r.*, a.id_card, a.name, a.phone, a.organization, a.applicant_type,
           st.code as seat_type_code, st.name as seat_type_name,
           h.hearing_date, h.start_time, h.end_time, h.status as hearing_status,
           c.case_number, c.case_name,
           cr.name as courtroom_name
    FROM reservations r
    JOIN applicants a ON r.applicant_id = a.id
    JOIN seat_types st ON r.seat_type_id = st.id
    JOIN hearings h ON r.hearing_id = h.id
    JOIN cases c ON h.case_id = c.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE 1=1
  `;
  const params = [];
  const countSql = `
    SELECT COUNT(*) as cnt
    FROM reservations r
    JOIN applicants a ON r.applicant_id = a.id
    JOIN seat_types st ON r.seat_type_id = st.id
    JOIN hearings h ON r.hearing_id = h.id
    WHERE 1=1
  `;
  const countParams = [];

  if (hearing_id) {
    sql += ' AND r.hearing_id = ?';
    params.push(hearing_id);
    countSql += ' AND r.hearing_id = ?';
    countParams.push(hearing_id);
  }
  if (applicant_id) {
    sql += ' AND r.applicant_id = ?';
    params.push(applicant_id);
    countSql += ' AND r.applicant_id = ?';
    countParams.push(applicant_id);
  }
  if (review_status) {
    sql += ' AND r.review_status = ?';
    params.push(review_status);
    countSql += ' AND r.review_status = ?';
    countParams.push(review_status);
  }
  if (verification_status) {
    sql += ' AND r.verification_status = ?';
    params.push(verification_status);
    countSql += ' AND r.verification_status = ?';
    countParams.push(verification_status);
  }
  if (apply_source) {
    sql += ' AND r.apply_source = ?';
    params.push(apply_source);
    countSql += ' AND r.apply_source = ?';
    countParams.push(apply_source);
  }
  if (seat_type_code) {
    sql += ' AND st.code = ?';
    params.push(seat_type_code);
    countSql += ' AND st.code = ?';
    countParams.push(seat_type_code);
  }
  if (keyword) {
    sql += ' AND (a.id_card LIKE ? OR a.name LIKE ? OR c.case_number LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    countSql += ' AND (a.id_card LIKE ? OR a.name LIKE ?)';
    countParams.push(`%${keyword}%`, `%${keyword}%`);
  }

  const total = prepare(countSql).get(...countParams).cnt;

  sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), (Number(page) - 1) * Number(page_size));

  const rows = prepare(sql).all(...params);

  res.json({
    code: 0,
    data: {
      list: rows,
      total,
      page: Number(page),
      page_size: Number(page_size)
    }
  });
}

function getReservation(req, res) {
  const { id } = req.params;
  const row = prepare(`
    SELECT r.*, a.id_card, a.name, a.phone, a.organization, a.applicant_type,
           st.code as seat_type_code, st.name as seat_type_name,
           h.hearing_date, h.start_time, h.end_time, h.status as hearing_status,
           c.case_number, c.case_name, c.sensitive_remark,
           cr.name as courtroom_name
    FROM reservations r
    JOIN applicants a ON r.applicant_id = a.id
    JOIN seat_types st ON r.seat_type_id = st.id
    JOIN hearings h ON r.hearing_id = h.id
    JOIN cases c ON h.case_id = c.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE r.id = ?
  `).get(id);

  if (!row) {
    return res.status(404).json({ code: 404, message: '预约不存在' });
  }

  res.json({ code: 0, data: row });
}

function createReservation(req, res) {
  const {
    hearing_id, id_card, name, phone, organization, applicant_type,
    seat_type_code, apply_source
  } = req.body;

  if (!hearing_id || !id_card || !name || !seat_type_code || !apply_source) {
    return res.status(400).json({ code: 400, message: '场次ID、证件号、姓名、席位类型、申请来源为必填项' });
  }
  if (!VALID_APPLY_SOURCES.includes(apply_source)) {
    return res.status(400).json({ code: 400, message: '申请来源无效' });
  }
  if (applicant_type && !VALID_APPLICANT_TYPES.includes(applicant_type)) {
    return res.status(400).json({ code: 400, message: '申请人类型无效' });
  }

  const hearing = prepare(`
    SELECT h.*, c.case_name
    FROM hearings h JOIN cases c ON h.case_id = c.id
    WHERE h.id = ?
  `).get(hearing_id);
  if (!hearing) {
    return res.status(400).json({ code: 400, message: '场次不存在' });
  }
  if (hearing.status === 'canceled' || hearing.status === 'closed') {
    return res.status(400).json({ code: 400, message: `场次已${hearing.status === 'canceled' ? '取消' : '闭庭'}，无法预约` });
  }

  const seatType = prepare('SELECT * FROM seat_types WHERE code = ?').get(seat_type_code);
  if (!seatType) {
    return res.status(400).json({ code: 400, message: '席位类型不存在' });
  }

  const hearingSeat = prepare(
    'SELECT * FROM hearing_seats WHERE hearing_id = ? AND seat_type_id = ?'
  ).get(hearing_id, seatType.id);

  if (!hearingSeat || hearingSeat.total_seats <= 0) {
    return res.status(400).json({ code: 400, message: '该场次此类型席位未开放' });
  }

  try {
    const applicant = _getOrCreateApplicant(id_card, name, phone, organization, applicant_type);

    const duplicate = prepare(`
      SELECT r.*, st.code as seat_type_code
      FROM reservations r JOIN seat_types st ON r.seat_type_id = st.id
      WHERE r.hearing_id = ? AND r.applicant_id = ?
      AND r.review_status NOT IN ('merged', 'rejected')
    `).get(hearing_id, applicant.id);

    if (duplicate) {
      if (duplicate.seat_type_code === seat_type_code && duplicate.review_status === 'pending') {
        throw new Error('该证件本场次已有待审核的同类型预约');
      }

      if (duplicate.seat_type_code === seat_type_code && duplicate.review_status === 'approved') {
        throw new Error('该证件本场次已有审核通过的同类型预约');
      }

      if (duplicate.review_status === 'approved') {
        throw new Error(`该证件本场次已有审核通过的${duplicate.seat_type_code}席位预约`);
      }
    }

    const stmt = prepare(`
      INSERT INTO reservations (hearing_id, applicant_id, seat_type_id, apply_source, review_status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    const insertResult = stmt.run(hearing_id, applicant.id, seatType.id, apply_source);

    const resultId = insertResult.lastInsertRowid;
    const newRes = prepare(`
      SELECT r.*, a.id_card, a.name, a.phone, a.applicant_type,
             st.code as seat_type_code, st.name as seat_type_name,
             h.hearing_date, h.start_time, c.case_number, c.case_name, cr.name as courtroom_name
      FROM reservations r
      JOIN applicants a ON r.applicant_id = a.id
      JOIN seat_types st ON r.seat_type_id = st.id
      JOIN hearings h ON r.hearing_id = h.id
      JOIN cases c ON h.case_id = c.id
      JOIN courtrooms cr ON h.courtroom_id = cr.id
      WHERE r.id = ?
    `).get(resultId);
    res.json({ code: 0, data: newRes, message: '预约申请提交成功，等待审核' });
  } catch (err) {
    return res.status(400).json({ code: 400, message: err.message });
  }
}

function reviewReservation(req, res) {
  const { id } = req.params;
  const { action, reason, reviewer, merge_to_id } = req.body;

  if (!action || !['approve', 'reject', 'merge'].includes(action)) {
    return res.status(400).json({ code: 400, message: '操作类型无效(approve/reject/merge)' });
  }

  const reservation = prepare(`
    SELECT r.*, st.code as seat_type_code, h.status as hearing_status
    FROM reservations r
    JOIN seat_types st ON r.seat_type_id = st.id
    JOIN hearings h ON r.hearing_id = h.id
    WHERE r.id = ?
  `).get(id);
  if (!reservation) {
    return res.status(404).json({ code: 404, message: '预约不存在' });
  }

  if (reservation.review_status !== 'pending') {
    return res.status(400).json({
      code: 400,
      message: `当前状态为 ${reservation.review_status}，无法审核`
    });
  }
  if (reservation.hearing_status === 'canceled' || reservation.hearing_status === 'closed') {
    return res.status(400).json({ code: 400, message: '场次已取消或闭庭，无法审核' });
  }

  try {
    if (action === 'approve') {
      const hs = prepare(`
        SELECT hs.* FROM hearing_seats hs
        WHERE hs.hearing_id = ? AND hs.seat_type_id = ?
      `).get(reservation.hearing_id, reservation.seat_type_id);

      if (!hs) {
        throw new Error('场次席位配置不存在');
      }
      if (hs.reserved_seats >= hs.total_seats) {
        throw new Error(`该类型席位已满(${hs.reserved_seats}/${hs.total_seats})，无法通过`);
      }

      prepare(`
        UPDATE reservations SET
          review_status = 'approved',
          review_reason = ?,
          reviewer = ?,
          reviewed_at = datetime('now','localtime'),
          updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(reason || null, reviewer || null, id);

      prepare(`
        UPDATE hearing_seats SET reserved_seats = reserved_seats + 1
        WHERE hearing_id = ? AND seat_type_id = ?
      `).run(reservation.hearing_id, reservation.seat_type_id);

    } else if (action === 'reject') {
      if (!reason) {
        throw new Error('驳回必须填写原因');
      }
      prepare(`
        UPDATE reservations SET
          review_status = 'rejected',
          review_reason = ?,
          reviewer = ?,
          reviewed_at = datetime('now','localtime'),
          updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(reason, reviewer || null, id);

    } else if (action === 'merge') {
      if (!merge_to_id) {
        throw new Error('合并需要指定目标预约ID');
      }
      const target = prepare(`
        SELECT r.*, h.hearing_date, h.start_time
        FROM reservations r JOIN hearings h ON r.hearing_id = h.id
        WHERE r.id = ?
      `).get(merge_to_id);
      if (!target) {
        throw new Error('目标预约不存在');
      }
      if (target.applicant_id !== reservation.applicant_id) {
        throw new Error('只能合并同一申请人的预约');
      }
      if (target.review_status === 'rejected' || target.review_status === 'merged') {
        throw new Error(`目标预约状态为${target.review_status}，不能作为合并目标`);
      }

      prepare(`
        UPDATE reservations SET
          review_status = 'merged',
          review_reason = ?,
          merged_to_id = ?,
          reviewer = ?,
          reviewed_at = datetime('now','localtime'),
          updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(
        reason || `合并至预约#${merge_to_id}`,
        merge_to_id,
        reviewer || null,
        id
      );
    }
  } catch (err) {
    return res.status(400).json({ code: 400, message: err.message });
  }

  const updated = prepare(`
    SELECT r.*, a.id_card, a.name, st.code as seat_type_code, st.name as seat_type_name
    FROM reservations r
    JOIN applicants a ON r.applicant_id = a.id
    JOIN seat_types st ON r.seat_type_id = st.id
    WHERE r.id = ?
  `).get(id);

  const actionText = { approve: '审核通过', reject: '已驳回', merge: '已合并' }[action];
  res.json({ code: 0, data: updated, message: actionText + '成功' });
}

function batchReviewByHearing(req, res) {
  const { hearing_id, seat_type_code, reviewer } = req.body;

  if (!hearing_id) {
    return res.status(400).json({ code: 400, message: '场次ID必填' });
  }

  const hearing = prepare('SELECT * FROM hearings WHERE id = ?').get(hearing_id);
  if (!hearing) {
    return res.status(404).json({ code: 404, message: '场次不存在' });
  }

  const seatTypeFilter = seat_type_code
    ? 'AND st.code = ?'
    : '';
  const params = seat_type_code ? [seat_type_code] : [];

  const pending = prepare(`
    SELECT r.*, st.code as seat_type_code, st.id as seat_type_id_real
    FROM reservations r
    JOIN seat_types st ON r.seat_type_id = st.id
    WHERE r.hearing_id = ? AND r.review_status = 'pending' ${seatTypeFilter}
    ORDER BY r.created_at ASC
  `).all(hearing_id, ...params);

  let approved = 0;
  let rejected = 0;
  const rejectedList = [];

  for (const r of pending) {
    const hs = prepare(`
      SELECT total_seats, reserved_seats FROM hearing_seats
      WHERE hearing_id = ? AND seat_type_id = ?
    `).get(hearing_id, r.seat_type_id);

    if (hs && hs.reserved_seats < hs.total_seats) {
      prepare(`
        UPDATE reservations SET
          review_status = 'approved',
          review_reason = '批量审核通过',
          reviewer = ?,
          reviewed_at = datetime('now','localtime'),
          updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(reviewer || null, r.id);

      prepare(`
        UPDATE hearing_seats SET reserved_seats = reserved_seats + 1
        WHERE hearing_id = ? AND seat_type_id = ?
      `).run(hearing_id, r.seat_type_id);

      approved++;
    } else {
      prepare(`
        UPDATE reservations SET
          review_status = 'rejected',
          review_reason = '席位已满，批量驳回',
          reviewer = ?,
          reviewed_at = datetime('now','localtime'),
          updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(reviewer || null, r.id);

      rejected++;
      rejectedList.push({ id: r.id, name: '申请人' + r.id });
    }
  }

  res.json({
    code: 0,
    data: {
      processed: pending.length,
      approved,
      rejected,
      rejected_count: rejected
    },
    message: `批量审核完成：通过${approved}条，驳回${rejected}条`
  });
}

function updateReservation(req, res) {
  const { id } = req.params;
  const { apply_source, seat_type_code } = req.body;

  const r = prepare('SELECT * FROM reservations WHERE id = ?').get(id);
  if (!r) {
    return res.status(404).json({ code: 404, message: '预约不存在' });
  }
  if (r.review_status !== 'pending') {
    return res.status(400).json({ code: 400, message: '非待审核状态不能修改' });
  }

  let newSeatTypeId = r.seat_type_id;
  if (seat_type_code) {
    const st = prepare('SELECT * FROM seat_types WHERE code = ?').get(seat_type_code);
    if (!st) return res.status(400).json({ code: 400, message: '席位类型不存在' });
    newSeatTypeId = st.id;
  }

  if (apply_source && !VALID_APPLY_SOURCES.includes(apply_source)) {
    return res.status(400).json({ code: 400, message: '申请来源无效' });
  }

  prepare(`
    UPDATE reservations SET
      apply_source = COALESCE(?, apply_source),
      seat_type_id = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(apply_source || null, newSeatTypeId, id);

  const updated = prepare(`
    SELECT r.*, a.id_card, a.name, st.code as seat_type_code
    FROM reservations r
    JOIN applicants a ON r.applicant_id = a.id
    JOIN seat_types st ON r.seat_type_id = st.id
    WHERE r.id = ?
  `).get(id);

  res.json({ code: 0, data: updated, message: '预约更新成功' });
}

function deleteReservation(req, res) {
  const { id } = req.params;
  const r = prepare('SELECT * FROM reservations WHERE id = ?').get(id);
  if (!r) {
    return res.status(404).json({ code: 404, message: '预约不存在' });
  }

  if (r.review_status === 'approved') {
    prepare(`
      UPDATE hearing_seats SET reserved_seats = MAX(reserved_seats - 1, 0)
      WHERE hearing_id = ? AND seat_type_id = ?
    `).run(r.hearing_id, r.seat_type_id);
  }
  prepare('DELETE FROM reservations WHERE id = ?').run(id);
  res.json({ code: 0, message: '预约删除成功' });
}

module.exports = {
  listReservations,
  getReservation,
  createReservation,
  reviewReservation,
  batchReviewByHearing,
  updateReservation,
  deleteReservation
};
