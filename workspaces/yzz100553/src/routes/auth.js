const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const config = require('../config');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = await db.get('SELECT * FROM users WHERE username = ?', username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
        email: user.email,
        violation_count: user.violation_count,
        blacklisted_until: user.blacklisted_until,
      },
    });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, name, phone, email } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: '用户名、密码、姓名不能为空' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    const existing = await db.get('SELECT id FROM users WHERE username = ?', username);
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = await db.run(
      'INSERT INTO users (username, password, name, phone, email, role) VALUES (?, ?, ?, ?, ?, ?)',
      username, hashedPassword, name, phone || null, email || null, 'student'
    );

    const user = await db.get(
      'SELECT id, username, name, role, phone, email FROM users WHERE id = ?',
      result.lastID
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('注册错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
