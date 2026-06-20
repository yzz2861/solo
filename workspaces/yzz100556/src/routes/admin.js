const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authMiddleware, roleMiddleware, logOperation } = require('../middleware/auth');

const router = express.Router();

router.post('/users', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const { username, password, role, realName } = req.body;

  if (!username || !password || !role || !realName) {
    return res.status(400).json({ error: '用户名、密码、角色、真实姓名不能为空' });
  }
  if (!['receptionist', 'security', 'admin'].includes(role)) {
    return res.status(400).json({ error: '角色必须是 receptionist, security, admin 之一' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度至少6位' });
  }

  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, role, real_name)
      VALUES (?, ?, ?, ?)
    `).run(username, passwordHash, role, realName);

    const user = db.prepare('SELECT id, username, role, real_name, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    logOperation(req.user.id, 'create_user', 'user', user.id, { username, role }, req.ip);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: '创建用户失败: ' + err.message });
  }
});

router.get('/users', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const users = db.prepare(`
    SELECT id, username, role, real_name, created_at, last_login 
    FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

router.put('/users/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const { password, role, realName } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const updates = [];
  const params = [];

  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(password, 10));
  }
  if (role) {
    if (!['receptionist', 'security', 'admin'].includes(role)) {
      return res.status(400).json({ error: '角色无效' });
    }
    updates.push('role = ?');
    params.push(role);
  }
  if (realName) {
    updates.push('real_name = ?');
    params.push(realName);
  }

  if (updates.length === 0) {
    return res.json({ message: '没有需要更新的内容' });
  }

  params.push(user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const updatedUser = db.prepare('SELECT id, username, role, real_name, created_at, last_login FROM users WHERE id = ?').get(user.id);
  logOperation(req.user.id, 'update_user', 'user', user.id, { fields: updates.map(u => u.split(' ')[0]) }, req.ip);
  res.json(updatedUser);
});

module.exports = router;
