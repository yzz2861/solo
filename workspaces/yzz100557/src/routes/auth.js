const express = require('express');
const { getDB } = require('../db/singleton');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }
    const db = await getDB();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const token = generateToken(user);
    db.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, user.id);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        supplier_id: user.supplier_id
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const db = await getDB();
      db.prepare('UPDATE users SET token = NULL WHERE token = ?').run(token);
    }
    res.json({ message: '已退出登录' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
