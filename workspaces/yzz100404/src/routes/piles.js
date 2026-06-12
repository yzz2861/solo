const express = require('express');
const { getDB } = require('../db');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const { status, pile_type, keyword } = req.query;
  let sql = 'SELECT * FROM charging_piles WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (pile_type) {
    sql += ' AND pile_type = ?';
    params.push(pile_type);
  }
  if (keyword) {
    sql += ' AND (pile_no LIKE ? OR location LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY created_at DESC';
  const piles = db.prepare(sql).all(...params);
  res.json(piles);
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const pile = db.prepare('SELECT * FROM charging_piles WHERE id = ?').get(req.params.id);
  if (!pile) {
    return res.status(404).json({ error: '充电桩不存在' });
  }
  res.json(pile);
});

router.post('/', (req, res) => {
  const db = getDB();
  const { pile_no, location, pile_type, batch_no } = req.body;
  if (!pile_no || !location || !pile_type) {
    return res.status(400).json({ error: '桩号、位置、桩型为必填项' });
  }

  const exists = db.prepare('SELECT id FROM charging_piles WHERE pile_no = ?').get(pile_no);
  if (exists) {
    return res.status(400).json({ error: '该桩号已存在' });
  }

  const stmt = db.prepare(`
    INSERT INTO charging_piles (pile_no, location, pile_type, batch_no, status, created_at)
    VALUES (?, ?, ?, ?, 'available', ?)
  `);
  const result = stmt.run(pile_no, location, pile_type, batch_no || null, dayjs().format());
  const pile = db.prepare('SELECT * FROM charging_piles WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(pile);
});

router.put('/:id', (req, res) => {
  const db = getDB();
  const pile = db.prepare('SELECT * FROM charging_piles WHERE id = ?').get(req.params.id);
  if (!pile) {
    return res.status(404).json({ error: '充电桩不存在' });
  }

  const { location, pile_type, batch_no, status } = req.body;

  if (status && !['available', 'out_of_service', 'under_repair'].includes(status)) {
    return res.status(400).json({ error: '无效的状态值，可选: available, out_of_service, under_repair' });
  }

  db.prepare(`
    UPDATE charging_piles
    SET location = COALESCE(?, location),
        pile_type = COALESCE(?, pile_type),
        batch_no = COALESCE(?, batch_no),
        status = COALESCE(?, status)
    WHERE id = ?
  `).run(location || null, pile_type || null, batch_no || null, status || null, req.params.id);

  const updated = db.prepare('SELECT * FROM charging_piles WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  const pile = db.prepare('SELECT * FROM charging_piles WHERE id = ?').get(req.params.id);
  if (!pile) {
    return res.status(404).json({ error: '充电桩不存在' });
  }

  const activeOrders = db.prepare(`
    SELECT id FROM fault_orders 
    WHERE pile_id = ? AND status IN ('pending', 'assigned', 'repairing', 'reviewing')
  `).all(req.params.id);

  if (activeOrders.length > 0) {
    return res.status(400).json({ error: '该充电桩存在未完成的工单，无法删除' });
  }

  db.prepare('DELETE FROM charging_piles WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

module.exports = router;
