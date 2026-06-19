const express = require('express');
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/me', auth, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, name, role, phone, email, violation_count, blacklisted_until, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);

  res.json(user);
});

router.get('/my-violations', auth, (req, res) => {
  const violations = db.prepare(`
    SELECT v.*, r.start_time, r.end_time, ro.name as room_name
    FROM violations v
    JOIN reservations r ON v.reservation_id = r.id
    JOIN rooms ro ON r.room_id = ro.id
    WHERE v.user_id = ?
    ORDER BY v.recorded_at DESC
  `).all(req.user.id);

  res.json(violations);
});

router.get('/', auth, requireRole('librarian'), (req, res) => {
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

  const countQuery = query.replace('SELECT id, username, name, role, phone, email, violation_count, blacklisted_until, created_at', 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countQuery).get(...params);

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), (page - 1) * page_size);

  const users = db.prepare(query).all(...params);

  res.json({
    list: users,
    pagination: {
      page: Number(page),
      page_size: Number(page_size),
      total,
    },
  });
});

router.get('/:id', auth, requireRole('librarian'), (req, res) => {
  const user = db.prepare(`
    SELECT id, username, name, role, phone, email, violation_count, blacklisted_until, created_at
    FROM users WHERE id = ?
  `).get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json(user);
});

router.put('/:id/blacklist', auth, requireRole('librarian'), (req, res) => {
  const { days, reason } = req.body;
  const userId = req.params.id;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  if (user.role === 'librarian') {
    return res.status(400).json({ error: '无法限制馆员账号' });
  }

  const blacklistedUntil = require('dayjs')().add(days || 7, 'day').format('YYYY-MM-DD HH:mm:ss');

  db.prepare(`
    UPDATE users
    SET blacklisted_until = ?,
        violation_count = violation_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(blacklistedUntil, userId);

  if (reason) {
    db.prepare(`
      INSERT INTO violations (user_id, type, description)
      VALUES (?, 'manual_blacklist', ?)
    `).run(userId, reason);
  }

  const updatedUser = db.prepare(`
    SELECT id, username, name, role, violation_count, blacklisted_until
    FROM users WHERE id = ?
  `).get(userId);

  res.json(updatedUser);
});

router.delete('/:id/blacklist', auth, requireRole('librarian'), (req, res) => {
  const userId = req.params.id;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  db.prepare(`
    UPDATE users
    SET blacklisted_until = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(userId);

  res.json({ message: '已解除黑名单限制' });
});

router.get('/:id/violations', auth, requireRole('librarian'), (req, res) => {
  const violations = db.prepare(`
    SELECT v.*, r.start_time, r.end_time, ro.name as room_name
    FROM violations v
    JOIN reservations r ON v.reservation_id = r.id
    JOIN rooms ro ON r.room_id = ro.id
    WHERE v.user_id = ?
    ORDER BY v.recorded_at DESC
  `).all(req.params.id);

  res.json(violations);
});

module.exports = router;
