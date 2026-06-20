const express = require('express');
const { get, run, all } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function calculateHours(signIn, signOut) {
  if (!signIn || !signOut) return 0;
  const diff = new Date(signOut) - new Date(signIn);
  return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
}

router.post('/:id/review', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  try {
    const appeal = await get('SELECT * FROM appeals WHERE id = ?', [req.params.id]);

    if (!appeal) {
      return res.status(404).json({ error: '申诉不存在' });
    }

    if (appeal.status !== 'pending') {
      return res.status(400).json({ error: '该申诉状态不处于待审核状态' });
    }

    if (req.user.role === 'activity_manager') {
      const activity = await get('SELECT * FROM activities WHERE id = ?', [appeal.activity_id]);
      if (activity.manager_id !== req.user.id) {
        return res.status(403).json({ error: '无权审核该活动的申诉' });
      }
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await run(`
      UPDATE appeals SET status = 'reviewing', updated_at = ? WHERE id = ?
    `, [now, appeal.id]);

    await run(`
      INSERT INTO audit_logs (appeal_id, operator_id, action, remark, old_status, new_status)
      VALUES (?, ?, 'start_review', '开始审核', 'pending', 'reviewing')
    `, [appeal.id, req.user.id]);

    const updated = await get('SELECT * FROM appeals WHERE id = ?', [appeal.id]);

    res.json({ message: '已开始审核', appeal: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/approve', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  const { approve_hours, approve_sign_in, approve_sign_out, remark } = req.body;

  try {
    const appeal = await get('SELECT * FROM appeals WHERE id = ?', [req.params.id]);

    if (!appeal) {
      return res.status(404).json({ error: '申诉不存在' });
    }

    if (!['pending', 'reviewing'].includes(appeal.status)) {
      return res.status(400).json({ error: '该申诉状态不可审核' });
    }

    if (req.user.role === 'activity_manager') {
      const activity = await get('SELECT * FROM activities WHERE id = ?', [appeal.activity_id]);
      if (activity.manager_id !== req.user.id) {
        return res.status(403).json({ error: '无权审核该活动的申诉' });
      }
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const finalSignIn = approve_sign_in || appeal.requested_sign_in;
    const finalSignOut = approve_sign_out || appeal.requested_sign_out;
    let finalHours = approve_hours || appeal.requested_hours;

    if (!finalHours && finalSignIn && finalSignOut) {
      finalHours = calculateHours(finalSignIn, finalSignOut);
    }

    if (!finalHours && !finalSignIn && !finalSignOut) {
      return res.status(400).json({ error: '请提供审核通过的时长或签到签退时间' });
    }

    const oldRecord = await get(
      'SELECT * FROM attendance_records WHERE activity_id = ? AND volunteer_id = ?',
      [appeal.activity_id, appeal.volunteer_id]
    );

    const oldHours = oldRecord ? oldRecord.hours : 0;

    await run(`
      UPDATE appeals
      SET status = 'approved', updated_at = ?
      WHERE id = ?
    `, [now, appeal.id]);

    await run(`
      INSERT INTO audit_logs (appeal_id, operator_id, action, remark, old_status, new_status, old_hours, new_hours)
      VALUES (?, ?, 'approve', ?, ?, 'approved', ?, ?)
    `, [appeal.id, req.user.id, remark || '审核通过', appeal.status, oldHours, finalHours]);

    if (oldRecord) {
      await run(`
        UPDATE attendance_records
        SET sign_in_time = COALESCE(?, sign_in_time),
            sign_out_time = COALESCE(?, sign_out_time),
            hours = ?,
            source = 'appeal_fix',
            updated_at = ?
        WHERE id = ?
      `, [finalSignIn, finalSignOut, finalHours, now, oldRecord.id]);
    } else {
      await run(`
        INSERT INTO attendance_records (activity_id, volunteer_id, sign_in_time, sign_out_time, hours, source)
        VALUES (?, ?, ?, ?, ?, 'appeal_fix')
      `, [appeal.activity_id, appeal.volunteer_id, finalSignIn, finalSignOut, finalHours]);
    }

    const updatedAppeal = await get('SELECT * FROM appeals WHERE id = ?', [appeal.id]);
    const updatedRecord = await get(
      'SELECT * FROM attendance_records WHERE activity_id = ? AND volunteer_id = ?',
      [appeal.activity_id, appeal.volunteer_id]
    );

    res.json({
      message: '审核通过',
      appeal: updatedAppeal,
      attendance_record: updatedRecord
    });
  } catch (err) {
    res.status(500).json({ error: '审核失败：' + err.message });
  }
});

router.post('/:id/reject', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: '请填写驳回原因' });
  }

  try {
    const appeal = await get('SELECT * FROM appeals WHERE id = ?', [req.params.id]);

    if (!appeal) {
      return res.status(404).json({ error: '申诉不存在' });
    }

    if (!['pending', 'reviewing'].includes(appeal.status)) {
      return res.status(400).json({ error: '该申诉不可审核' });
    }

    if (req.user.role === 'activity_manager') {
      const activity = await get('SELECT * FROM activities WHERE id = ?', [appeal.activity_id]);
      if (activity.manager_id !== req.user.id) {
        return res.status(403).json({ error: '无权审核该活动的申诉' });
      }
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const oldStatus = appeal.status;

    await run(`
      UPDATE appeals SET status = 'rejected', updated_at = ? WHERE id = ?
    `, [now, appeal.id]);

    await run(`
      INSERT INTO audit_logs (appeal_id, operator_id, action, remark, old_status, new_status)
      VALUES (?, ?, 'reject', ?, ?, 'rejected')
    `, [appeal.id, req.user.id, reason, oldStatus]);

    const updated = await get('SELECT * FROM appeals WHERE id = ?', [appeal.id]);

    res.json({ message: '已驳回', appeal: updated, reject_reason: reason });
  } catch (err) {
    res.status(500).json({ error: '驳回失败：' + err.message });
  }
});

router.get('/:id/audit-logs', authMiddleware(), async (req, res) => {
  try {
    const appeal = await get('SELECT * FROM appeals WHERE id = ?', [req.params.id]);

    if (!appeal) {
      return res.status(404).json({ error: '申诉不存在' });
    }

    if (req.user.role === 'volunteer' && appeal.volunteer_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看' });
    }

    const logs = await all(`
      SELECT al.*, u.name as operator_name, u.role as operator_role
      FROM audit_logs al
      JOIN users u ON al.operator_id = u.id
      WHERE al.appeal_id = ?
      ORDER BY al.created_at ASC
    `, [req.params.id]);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
