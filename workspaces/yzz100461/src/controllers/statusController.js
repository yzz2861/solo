const { prepare } = require('../db/database');

function closeHearing(req, res) {
  const { hearing_id } = req.params;
  const { reason, operator } = req.body;

  if (!reason) {
    return res.status(400).json({ code: 400, message: '闭庭/改期原因为必填' });
  }

  const hearing = prepare('SELECT * FROM hearings WHERE id = ?').get(hearing_id);
  if (!hearing) {
    return res.status(404).json({ code: 404, message: '场次不存在' });
  }

  if (hearing.status === 'closed' || hearing.status === 'canceled') {
    return res.status(400).json({ code: 400, message: '场次已处于闭庭/取消状态' });
  }

  prepare(`
    UPDATE hearings SET
      status = 'closed',
      change_reason = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(reason, hearing_id);

  const approvedReservations = prepare(`
    SELECT r.id, hs.reserved_seats, hs.total_seats, r.seat_type_id
    FROM reservations r
    JOIN hearing_seats hs ON r.hearing_id = hs.hearing_id AND r.seat_type_id = hs.seat_type_id
    WHERE r.hearing_id = ? AND r.review_status = 'approved'
  `).all(hearing_id);

  let changedCount = 0;
  for (const r of approvedReservations) {
    prepare(`
      UPDATE reservations SET
        review_status = 'pending_notice',
        review_reason = ?,
        reviewer = ?,
        reviewed_at = datetime('now','localtime'),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      reason,
      operator || '系统',
      r.id
    );

    prepare(`
      UPDATE hearing_seats
      SET reserved_seats = MAX(reserved_seats - 1, 0)
      WHERE hearing_id = ? AND seat_type_id = ?
    `).run(hearing_id, r.seat_type_id);

    changedCount++;
  }

  res.json({
    code: 0,
    data: {
      hearing_id: Number(hearing_id),
      new_status: 'closed',
      changed_count: changedCount,
      reason
    },
    message: `场次已闭庭，${changedCount} 条已通过预约转为待通知状态`
  });
}

function rescheduleHearing(req, res) {
  const { hearing_id } = req.params;
  const { new_hearing_date, new_start_time, new_end_time, new_courtroom_id, reason, operator } = req.body;

  if (!reason) {
    return res.status(400).json({ code: 400, message: '改期原因为必填' });
  }
  if (!new_hearing_date || !new_start_time) {
    return res.status(400).json({ code: 400, message: '新日期和开始时间必填' });
  }

  const hearing = prepare('SELECT * FROM hearings WHERE id = ?').get(hearing_id);
  if (!hearing) {
    return res.status(404).json({ code: 404, message: '场次不存在' });
  }

  const targetCourtroom = new_courtroom_id || hearing.courtroom_id;
  const conflict = prepare(`
    SELECT id FROM hearings
    WHERE id != ? AND courtroom_id = ? AND hearing_date = ?
    AND ((start_time <= ? AND (? < COALESCE(end_time, '23:59')))
      OR (start_time < COALESCE(?, '23:59') AND COALESCE(end_time, '23:59') > ?))
    AND status != 'canceled' AND status != 'closed'
  `).get(
    hearing_id,
    targetCourtroom,
    new_hearing_date,
    new_start_time,
    new_start_time,
    new_end_time || null,
    new_start_time
  );

  if (conflict) {
    return res.status(400).json({ code: 400, message: '新时间该庭室已有安排' });
  }

  prepare(`
    UPDATE hearings SET
      hearing_date = ?,
      start_time = ?,
      end_time = ?,
      courtroom_id = ?,
      status = 'scheduled',
      change_reason = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    new_hearing_date,
    new_start_time,
    new_end_time || null,
    targetCourtroom,
    reason,
    hearing_id
  );

  const toNotice = prepare(`
    SELECT r.id, r.seat_type_id FROM reservations r
    WHERE r.hearing_id = ? AND r.review_status = 'approved'
  `).all(hearing_id);

  let changedCount = 0;
  for (const r of toNotice) {
    prepare(`
      UPDATE reservations SET
        review_status = 'pending_notice',
        review_reason = ?,
        reviewer = ?,
        reviewed_at = datetime('now','localtime'),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      `庭审改期：${reason}`,
      operator || '系统',
      r.id
    );

    prepare(`
      UPDATE hearing_seats
      SET reserved_seats = MAX(reserved_seats - 1, 0)
      WHERE hearing_id = ? AND seat_type_id = ?
    `).run(hearing_id, r.seat_type_id);

    changedCount++;
  }

  const updated = prepare(`
    SELECT h.*, cr.name as courtroom_name
    FROM hearings h JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE h.id = ?
  `).get(hearing_id);

  res.json({
    code: 0,
    data: {
      hearing: updated,
      changed_count: changedCount
    },
    message: `场次已改期，${changedCount} 条已通过预约转为待通知，请重新审核`
  });
}

function confirmNotified(req, res) {
  const { hearing_id, action } = req.body;

  if (!hearing_id) {
    return res.status(400).json({ code: 400, message: '场次ID必填' });
  }
  if (!action || !['reapprove', 'cancel_all'].includes(action)) {
    return res.status(400).json({ code: 400, message: '操作类型必填(reapprove/cancel_all)' });
  }

  const hearing = prepare('SELECT * FROM hearings WHERE id = ?').get(hearing_id);
  if (!hearing) {
    return res.status(404).json({ code: 404, message: '场次不存在' });
  }

  const pendingList = prepare(`
    SELECT r.id, r.seat_type_id FROM reservations r
    WHERE r.hearing_id = ? AND r.review_status = 'pending_notice'
  `).all(hearing_id);

  if (pendingList.length === 0) {
    return res.json({ code: 0, data: { processed: 0 }, message: '没有待通知记录' });
  }

  let processed = 0;
  let skipped = 0;

  if (action === 'reapprove') {
    for (const r of pendingList) {
      const hs = prepare(`
        SELECT total_seats, reserved_seats FROM hearing_seats
        WHERE hearing_id = ? AND seat_type_id = ?
      `).get(hearing_id, r.seat_type_id);

      if (hs && hs.reserved_seats < hs.total_seats) {
        prepare(`
          UPDATE reservations SET
            review_status = 'approved',
            review_reason = '改期后重新确认通过',
            reviewed_at = datetime('now','localtime'),
            updated_at = datetime('now','localtime')
          WHERE id = ?
        `).run(r.id);

        prepare(`
          UPDATE hearing_seats SET reserved_seats = reserved_seats + 1
          WHERE hearing_id = ? AND seat_type_id = ?
        `).run(hearing_id, r.seat_type_id);

        processed++;
      } else {
        skipped++;
      }
    }
  } else {
    for (const r of pendingList) {
      prepare(`
        UPDATE reservations SET
          review_status = 'rejected',
          review_reason = '庭审改期后确认取消',
          reviewed_at = datetime('now','localtime'),
          updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(r.id);
      processed++;
    }
  }

  const result = { processed, skipped };

  res.json({
    code: 0,
    data: result,
    message: action === 'reapprove'
      ? `重新审核通过 ${result.processed} 条${result.skipped ? `，${result.skipped} 条因席位已满保留待通知` : ''}`
      : `已取消 ${result.processed} 条待通知预约`
  });
}

module.exports = {
  closeHearing,
  rescheduleHearing,
  confirmNotified
};
