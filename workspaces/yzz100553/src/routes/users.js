const express = require('express');
const dayjs = require('dayjs');
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/me', auth, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, username, name, role, phone, email, violation_count, blacklisted_until, created_at FROM users WHERE id = ?',
      req.user.id
    );
    res.json(user);
  } catch (err) {
    console.error('获取个人信息错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/my-violations', auth, async (req, res) => {
  try {
    const violations = await db.all(`
      SELECT v.*, r.start_time, r.end_time, ro.name as room_name
      FROM violations v
      JOIN reservations r ON v.reservation_id = r.id
      JOIN rooms ro ON r.room_id = ro.id
      WHERE v.user_id = ?
      ORDER BY v.recorded_at DESC
    `, req.user.id);

    res.json(violations);
  } catch (err) {
    console.error('获取违规记录错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { role, blacklisted, page = 1, page_size = 20 } = req.query;

    let query = `
      SELECT id, username, name, role, phone, email, violation_count, blacklisted_until, created_at
      FROM users WHERE 1=1
    `;
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (blacklisted === 'true') {
      query += " AND blacklisted_until > datetime('now')";
    } else if (blacklisted === 'false') {
      query += " AND (blacklisted_until IS NULL OR blacklisted_until <= datetime('now'))";
    }

    const countQuery = query.replace(
      'SELECT id, username, name, role, phone, email, violation_count, blacklisted_until, created_at',
      'SELECT COUNT(*) as total'
    );
    const { total } = await db.get(countQuery, ...params);

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(page_size), (page - 1) * page_size);

    const users = await db.all(query, ...params);

    res.json({
      list: users,
      pagination: {
        page: Number(page),
        page_size: Number(page_size),
        total,
      },
    });
  } catch (err) {
    console.error('获取用户列表错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:id', auth, requireRole('librarian'), async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, username, name, role, phone, email, violation_count, blacklisted_until, created_at FROM users WHERE id = ?',
      req.params.id
    );

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (err) {
    console.error('获取用户详情错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/:id/blacklist', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { days, reason } = req.body;
    const userId = req.params.id;

    const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.role === 'librarian') {
      return res.status(400).json({ error: '无法限制馆员账号' });
    }

    const blacklistedUntil = dayjs().add(days || 7, 'day').format('YYYY-MM-DD HH:mm:ss');

    await db.run(
      `UPDATE users
       SET blacklisted_until = ?,
           violation_count = violation_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      blacklistedUntil, userId
    );

    if (reason) {
      await db.run(
        'INSERT INTO violations (user_id, reservation_id, type, description) VALUES (?, 0, ?, ?)',
        userId, 'manual_blacklist', reason
      );
    }

    const updatedUser = await db.get(
      'SELECT id, username, name, role, violation_count, blacklisted_until FROM users WHERE id = ?',
      userId
    );

    res.json(updatedUser);
  } catch (err) {
    console.error('加入黑名单错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/:id/blacklist', auth, requireRole('librarian'), async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    await db.run(
      'UPDATE users SET blacklisted_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      userId
    );

    res.json({ message: '已解除黑名单限制' });
  } catch (err) {
    console.error('解除黑名单错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:id/violations', auth, requireRole('librarian'), async (req, res) => {
  try {
    const violations = await db.all(`
      SELECT v.*, r.start_time, r.end_time, ro.name as room_name
      FROM violations v
      JOIN reservations r ON v.reservation_id = r.id
      JOIN rooms ro ON r.room_id = ro.id
      WHERE v.user_id = ?
      ORDER BY v.recorded_at DESC
    `, req.params.id);

    res.json(violations);
  } catch (err) {
    console.error('获取用户违规记录错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
