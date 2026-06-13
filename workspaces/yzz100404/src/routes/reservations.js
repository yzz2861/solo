const express = require('express');
const { getDB } = require('../db');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const { status, pile_id, user_phone, date } = req.query;
  let sql = `
    SELECT r.*, cp.pile_no, cp.location, cp.pile_type, cp.status as pile_status
    FROM reservations r
    LEFT JOIN charging_piles cp ON r.pile_id = cp.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND r.status = ?';
    params.push(status);
  }
  if (pile_id) {
    sql += ' AND r.pile_id = ?';
    params.push(pile_id);
  }
  if (user_phone) {
    sql += ' AND r.user_phone = ?';
    params.push(user_phone);
  }
  if (date) {
    sql += ' AND r.start_time >= ? AND r.start_time < ?';
    params.push(`${date}T00:00:00`, `${date}T23:59:59`);
  }

  sql += ' ORDER BY r.start_time DESC';
  const reservations = db.prepare(sql).all(...params);
  res.json(reservations);
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const reservation = db.prepare(`
    SELECT r.*, cp.pile_no, cp.location, cp.pile_type, cp.status as pile_status
    FROM reservations r
    LEFT JOIN charging_piles cp ON r.pile_id = cp.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!reservation) {
    return res.status(404).json({ error: '预约不存在' });
  }
  res.json(reservation);
});

router.post('/', (req, res) => {
  const db = getDB();
  const { pile_id, user_name, user_phone, start_time, end_time } = req.body;

  if (!pile_id || !user_name || !user_phone || !start_time || !end_time) {
    return res.status(400).json({ error: '充电桩ID、用户姓名、手机号、开始和结束时间为必填项' });
  }

  const pile = db.prepare('SELECT * FROM charging_piles WHERE id = ?').get(pile_id);
  if (!pile) {
    return res.status(404).json({ error: '充电桩不存在' });
  }

  if (pile.status !== 'available') {
    const statusLabel = {
      out_of_service: '停用',
      under_repair: '维修中',
    }[pile.status] || pile.status;

    return res.status(409).json({
      error: `充电桩当前状态为「${statusLabel}」，不可预约`,
      pile_status: pile.status,
    });
  }

  const conflict = db.prepare(`
    SELECT id, user_name, start_time, end_time FROM reservations
    WHERE pile_id = ?
      AND status = 'active'
      AND start_time < ?
      AND end_time > ?
  `).get(pile_id, end_time, start_time);

  if (conflict) {
    return res.status(409).json({
      error: '该时段已有预约，请选择其他时间',
      conflict: conflict,
    });
  }

  const stmt = db.prepare(`
    INSERT INTO reservations (pile_id, user_name, user_phone, start_time, end_time, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?)
  `);
  const result = stmt.run(pile_id, user_name, user_phone, start_time, end_time, dayjs().format());
  const reservation = db.prepare(`
    SELECT r.*, cp.pile_no, cp.location, cp.pile_type
    FROM reservations r
    LEFT JOIN charging_piles cp ON r.pile_id = cp.id
    WHERE r.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(reservation);
});

router.put('/:id/cancel', (req, res) => {
  const db = getDB();
  const { cancel_reason } = req.body;

  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  if (!reservation) {
    return res.status(404).json({ error: '预约不存在' });
  }
  if (reservation.status !== 'active') {
    return res.status(400).json({ error: '只有有效预约才能取消' });
  }

  db.prepare(`
    UPDATE reservations SET status = 'cancelled', cancel_reason = ? WHERE id = ?
  `).run(cancel_reason || null, req.params.id);

  const updated = db.prepare(`
    SELECT r.*, cp.pile_no, cp.location
    FROM reservations r
    LEFT JOIN charging_piles cp ON r.pile_id = cp.id
    WHERE r.id = ?
  `).get(req.params.id);

  res.json(updated);
});

module.exports = router;
