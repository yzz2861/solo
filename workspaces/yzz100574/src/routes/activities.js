const express = require('express');
const { get, run, all } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware(['activity_manager', 'admin']), async (req, res) => {
  const { name, description, location, start_time, end_time } = req.body;

  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: '活动名称、开始时间和结束时间不能为空' });
  }

  const managerId = req.user.role === 'activity_manager' ? req.user.id : null;

  try {
    const result = await run(`
      INSERT INTO activities (name, description, location, start_time, end_time, manager_id, status)
      VALUES (?, ?, ?, ?, ?, ?, 'draft')
    `, [name, description, location, start_time, end_time, managerId]);

    const activity = await get('SELECT * FROM activities WHERE id = ?', [result.lastID]);
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authMiddleware(), async (req, res) => {
  const { status, page = 1, page_size = 20 } = req.query;
  const offset = (page - 1) * page_size;

  let sql = 'SELECT * FROM activities WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (req.user.role === 'activity_manager') {
    sql += ' AND manager_id = ?';
    params.push(req.user.id);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const totalRow = await get(countSql, params);
  const total = totalRow.count;

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), Number(offset));

  const activities = await all(sql, params);

  res.json({
    list: activities,
    total,
    page: Number(page),
    page_size: Number(page_size)
  });
});

router.get('/:id', authMiddleware(), async (req, res) => {
  try {
    const activity = await get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }

    if (req.user.role === 'activity_manager' && activity.manager_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看该活动' });
    }

    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware(['activity_manager', 'admin']), async (req, res) => {
  const { name, description, location, start_time, end_time, status } = req.body;

  try {
    const activity = await get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }

    if (req.user.role === 'activity_manager' && activity.manager_id !== req.user.id) {
      return res.status(403).json({ error: '无权修改该活动' });
    }

    await run(`
      UPDATE activities
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          location = COALESCE(?, location),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          status = COALESCE(?, status)
      WHERE id = ?
    `, [name, description, location, start_time, end_time, status, req.params.id]);

    const updated = await get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
