const { Router } = require('express');
const { getDb, findById, find, insert } = require('../db');
const { generateToken } = require('../middleware/auth');

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码为必填' });
  }

  const db = getDb();
  const user = find(db, 'users', u => u.username === username && u.password === password);
  if (!user.length) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = generateToken(user[0]);
  res.json({
    token,
    user: {
      id: user[0].id,
      name: user[0].name,
      role: user[0].role,
      technician_id: user[0].technician_id || null
    }
  });
});

router.post('/register', (req, res) => {
  const { username, password, name, role, technician_id } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: '用户名、密码、姓名和角色为必填' });
  }
  if (!['technician', 'warehouse_manager', 'station_manager'].includes(role)) {
    return res.status(400).json({ error: '角色必须为 technician、warehouse_manager 或 station_manager' });
  }

  const db = getDb();
  const existing = find(db, 'users', u => u.username === username);
  if (existing.length) {
    return res.status(409).json({ error: '用户名已存在' });
  }

  const user = insert(db, 'users', {
    username,
    password,
    name,
    role,
    technician_id: technician_id || null
  });

  const token = generateToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, role: user.role, technician_id: user.technician_id || null }
  });
});

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: '未认证' });
  const db = getDb();
  const user = findById(db, 'users', req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  res.json({
    id: user.id,
    name: user.name,
    role: user.role,
    technician_id: user.technician_id || null,
    username: user.username
  });
});

module.exports = router;
