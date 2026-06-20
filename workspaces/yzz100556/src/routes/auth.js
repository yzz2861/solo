const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken, authMiddleware, logOperation } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  
  if (!isValid) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  
  const ipAddress = req.ip || req.connection.remoteAddress;
  logOperation(user.id, 'login', 'user', user.id, { username: user.username }, ipAddress);

  const token = generateToken(user);
  
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      realName: user.real_name
    }
  });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', authMiddleware, (req, res) => {
  logOperation(req.user.id, 'logout', 'user', req.user.id, {}, req.ip);
  res.json({ message: '登出成功' });
});

module.exports = router;
