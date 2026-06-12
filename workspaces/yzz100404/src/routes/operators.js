const express = require('express');
const { getDB } = require('../db');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const { role } = req.query;
  let sql = 'SELECT * FROM operators WHERE 1=1';
  const params = [];
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  sql += ' ORDER BY created_at DESC';
  const operators = db.prepare(sql).all(...params);
  res.json(operators);
});

router.post('/', (req, res) => {
  const db = getDB();
  const { name, role, phone } = req.body;
  if (!name || !role || !phone) {
    return res.status(400).json({ error: '姓名、角色和手机号为必填项' });
  }
  const exists = db.prepare('SELECT id FROM operators WHERE phone = ?').get(phone);
  if (exists) {
    return res.status(400).json({ error: '该手机号已存在' });
  }
  const stmt = db.prepare('INSERT INTO operators (name, role, phone, created_at) VALUES (?, ?, ?, ?)');
  const result = stmt.run(name, role, phone, dayjs().format());
  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(operator);
});

router.put('/:id', (req, res) => {
  const db = getDB();
  const { name, role, phone } = req.body;
  const operator = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  if (!operator) {
    return res.status(404).json({ error: '操作员不存在' });
  }
  if (phone && phone !== operator.phone) {
    const exists = db.prepare('SELECT id FROM operators WHERE phone = ?').get(phone);
    if (exists) {
      return res.status(400).json({ error: '该手机号已被其他操作员使用' });
    }
  }
  db.prepare('UPDATE operators SET name = COALESCE(?, name), role = COALESCE(?, role), phone = COALESCE(?, phone) WHERE id = ?')
    .run(name || null, role || null, phone || null, req.params.id);
  const updated = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM operators WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

module.exports = router;
