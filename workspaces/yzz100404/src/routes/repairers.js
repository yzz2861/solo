const express = require('express');
const { getDB } = require('../db');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const repairers = db.prepare('SELECT * FROM repairers ORDER BY created_at DESC').all();
  res.json(repairers);
});

router.post('/', (req, res) => {
  const db = getDB();
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: '姓名和手机号为必填项' });
  }
  const exists = db.prepare('SELECT id FROM repairers WHERE phone = ?').get(phone);
  if (exists) {
    return res.status(400).json({ error: '该手机号已存在' });
  }
  const stmt = db.prepare('INSERT INTO repairers (name, phone, created_at) VALUES (?, ?, ?)');
  const result = stmt.run(name, phone, dayjs().format());
  const repairer = db.prepare('SELECT * FROM repairers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(repairer);
});

router.put('/:id', (req, res) => {
  const db = getDB();
  const { name, phone } = req.body;
  const repairer = db.prepare('SELECT * FROM repairers WHERE id = ?').get(req.params.id);
  if (!repairer) {
    return res.status(404).json({ error: '维修工不存在' });
  }
  if (phone && phone !== repairer.phone) {
    const exists = db.prepare('SELECT id FROM repairers WHERE phone = ?').get(phone);
    if (exists) {
      return res.status(400).json({ error: '该手机号已被其他维修工使用' });
    }
  }
  db.prepare('UPDATE repairers SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?')
    .run(name || null, phone || null, req.params.id);
  const updated = db.prepare('SELECT * FROM repairers WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  const repairer = db.prepare('SELECT * FROM repairers WHERE id = ?').get(req.params.id);
  if (!repairer) {
    return res.status(404).json({ error: '维修工不存在' });
  }
  const activeOrders = db.prepare(`
    SELECT id FROM fault_orders 
    WHERE repairer_id = ? AND status IN ('assigned', 'repairing')
  `).all(req.params.id);
  if (activeOrders.length > 0) {
    return res.status(400).json({ error: '该维修工存在未完成工单，无法删除' });
  }
  db.prepare('DELETE FROM repairers WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

module.exports = router;
