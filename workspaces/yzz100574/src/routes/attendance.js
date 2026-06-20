const express = require('express');
const { get, run, all } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function calculateHours(signIn, signOut) {
  if (!signIn || !signOut) return 0;
  const diff = new Date(signOut) - new Date(signIn);
  return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
}

router.post('/sign-in', authMiddleware(['volunteer']), async (req, res) => {
  const { activity_id } = req.body;

  if (!activity_id) {
    return res.status(400).json({ error: '活动ID不能为空' });
  }

  try {
    const activity = await get('SELECT * FROM activities WHERE id = ?', [activity_id]);
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const existing = await get(
      'SELECT * FROM attendance_records WHERE activity_id = ? AND volunteer_id = ?',
      [activity_id, req.user.id]
    );

    if (existing && existing.sign_in_time) {
      return res.status(400).json({ error: '已经签到过了' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (existing) {
      await run(
        'UPDATE attendance_records SET sign_in_time = ?, updated_at = ? WHERE id = ?',
        [now, now, existing.id]
      );
    } else {
      await run(`
        INSERT INTO attendance_records (activity_id, volunteer_id, sign_in_time, source)
        VALUES (?, ?, ?, 'normal')
      `, [activity_id, req.user.id, now]);
    }

    const record = await get(
      'SELECT * FROM attendance_records WHERE activity_id = ? AND volunteer_id = ?',
      [activity_id, req.user.id]
    );

    res.json({ message: '签到成功', record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sign-out', authMiddleware(['volunteer']), async (req, res) => {
  const { activity_id } = req.body;

  if (!activity_id) {
    return res.status(400).json({ error: '活动ID不能为空' });
  }

  try {
    const record = await get(
      'SELECT * FROM attendance_records WHERE activity_id = ? AND volunteer_id = ?',
      [activity_id, req.user.id]
    );

    if (!record || !record.sign_in_time) {
      return res.status(400).json({ error: '尚未签到，无法签退' });
    }

    if (record.sign_out_time) {
      return res.status(400).json({ error: '已经签退过了' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const hours = calculateHours(record.sign_in_time, now);

    await run(`
      UPDATE attendance_records
      SET sign_out_time = ?, hours = ?, updated_at = ?
      WHERE id = ?
    `, [now, hours, now, record.id]);

    const updated = await get('SELECT * FROM attendance_records WHERE id = ?', [record.id]);

    res.json({ message: '签退成功', record: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/activity/:activityId', authMiddleware(), async (req, res) => {
  const { activityId } = req.params;
  const { page = 1, page_size = 20 } = req.query;
  const offset = (page - 1) * page_size;

  try {
    if (req.user.role === 'volunteer') {
      const record = await get(`
        SELECT ar.*, a.name as activity_name, u.name as volunteer_name
        FROM attendance_records ar
        JOIN activities a ON ar.activity_id = a.id
        JOIN users u ON ar.volunteer_id = u.id
        WHERE ar.activity_id = ? AND ar.volunteer_id = ?
      `, [activityId, req.user.id]);

      if (!record) {
        return res.status(404).json({ error: '未找到签到记录' });
      }
      return res.json(record);
    }

    const records = await all(`
      SELECT ar.*, u.name as volunteer_name
      FROM attendance_records ar
      JOIN users u ON ar.volunteer_id = u.id
      WHERE ar.activity_id = ?
      ORDER BY ar.created_at DESC
      LIMIT ? OFFSET ?
    `, [activityId, Number(page_size), Number(offset)]);

    const totalRow = await get(
      'SELECT COUNT(*) as count FROM attendance_records WHERE activity_id = ?',
      [activityId]
    );

    res.json({
      list: records,
      total: totalRow.count,
      page: Number(page),
      page_size: Number(page_size)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mine', authMiddleware(['volunteer']), async (req, res) => {
  const { page = 1, page_size = 20, status } = req.query;
  const offset = (page - 1) * page_size;

  let sql = `
    SELECT ar.*, a.name as activity_name, a.location, a.start_time as activity_start
    FROM attendance_records ar
    JOIN activities a ON ar.activity_id = a.id
    WHERE ar.volunteer_id = ?
  `;
  const params = [req.user.id];

  if (status === 'completed') {
    sql += ' AND ar.sign_out_time IS NOT NULL';
  } else if (status === 'incomplete') {
    sql += ' AND ar.sign_out_time IS NULL';
  }

  const countSql = sql.replace('SELECT ar.*, a.name as activity_name, a.location, a.start_time as activity_start', 'SELECT COUNT(*) as count');
  const totalRow = await get(countSql, params);

  sql += ' ORDER BY ar.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), Number(offset));

  const records = await all(sql, params);

  res.json({
    list: records,
    total: totalRow.count,
    page: Number(page),
    page_size: Number(page_size)
  });
});

router.put('/:id/manual', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  const { sign_in_time, sign_out_time, hours } = req.body;

  try {
    const record = await get('SELECT * FROM attendance_records WHERE id = ?', [req.params.id]);
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    if (req.user.role === 'activity_manager') {
      const activity = await get('SELECT * FROM activities WHERE id = ?', [record.activity_id]);
      if (activity.manager_id !== req.user.id) {
        return res.status(403).json({ error: '无权修改该活动的签到记录' });
      }
    }

    const finalHours = hours || calculateHours(sign_in_time, sign_out_time);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await run(`
      UPDATE attendance_records
      SET sign_in_time = COALESCE(?, sign_in_time),
          sign_out_time = COALESCE(?, sign_out_time),
          hours = COALESCE(?, hours),
          source = 'manual',
          updated_at = ?
      WHERE id = ?
    `, [sign_in_time, sign_out_time, finalHours, now, req.params.id]);

    const updated = await get('SELECT * FROM attendance_records WHERE id = ?', [req.params.id]);

    res.json({ message: '手动修改成功', record: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
