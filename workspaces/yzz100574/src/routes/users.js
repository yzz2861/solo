const express = require('express');
const { get, run, all } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/me', authMiddleware(), (req, res) => {
  res.json(req.user);
});

router.get('/', authMiddleware(['admin']), async (req, res) => {
  const { role, page = 1, page_size = 20 } = req.query;
  const offset = (page - 1) * page_size;

  let sql = 'SELECT * FROM users WHERE 1=1';
  const params = [];

  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const totalRow = await get(countSql, params);

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), Number(offset));

  const users = await all(sql, params);

  res.json({
    list: users,
    total: totalRow.count,
    page: Number(page),
    page_size: Number(page_size)
  });
});

router.post('/', authMiddleware(['admin']), async (req, res) => {
  const { name, email, role } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: '姓名、邮箱和角色不能为空' });
  }

  const validRoles = ['volunteer', 'admin', 'activity_manager'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: '无效的角色' });
  }

  try {
    const result = await run('INSERT INTO users (name, email, role) VALUES (?, ?, ?)', [name, email, role]);
    const user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    res.status(201).json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '该邮箱已被使用' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
