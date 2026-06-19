const express = require('express');
const db = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;

    let query = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY name ASC';

    const rooms = await db.all(query, ...params);
    res.json(rooms);
  } catch (err) {
    console.error('获取房间列表错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const room = await db.get('SELECT * FROM rooms WHERE id = ?', req.params.id);

    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    res.json(room);
  } catch (err) {
    console.error('获取房间详情错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { name, capacity, location, equipment } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({ error: '房间名称和容量为必填项' });
    }

    if (capacity < 1) {
      return res.status(400).json({ error: '容量必须大于0' });
    }

    const existing = await db.get('SELECT id FROM rooms WHERE name = ?', name);
    if (existing) {
      return res.status(409).json({ error: '房间名称已存在' });
    }

    const result = await db.run(
      'INSERT INTO rooms (name, capacity, location, equipment) VALUES (?, ?, ?, ?)',
      name, capacity, location || null, equipment || null
    );

    const room = await db.get('SELECT * FROM rooms WHERE id = ?', result.lastID);
    res.status(201).json(room);
  } catch (err) {
    console.error('创建房间错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/:id', auth, requireRole('librarian'), async (req, res) => {
  try {
    const { name, capacity, location, equipment, status } = req.body;
    const id = req.params.id;

    const room = await db.get('SELECT * FROM rooms WHERE id = ?', id);
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    if (name && name !== room.name) {
      const existing = await db.get('SELECT id FROM rooms WHERE name = ? AND id != ?', name, id);
      if (existing) {
        return res.status(409).json({ error: '房间名称已存在' });
      }
    }

    await db.run(
      `UPDATE rooms
       SET name = COALESCE(?, name),
           capacity = COALESCE(?, capacity),
           location = COALESCE(?, location),
           equipment = COALESCE(?, equipment),
           status = COALESCE(?, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      name || null,
      capacity || null,
      location || null,
      equipment || null,
      status || null,
      id
    );

    const updatedRoom = await db.get('SELECT * FROM rooms WHERE id = ?', id);
    res.json(updatedRoom);
  } catch (err) {
    console.error('更新房间错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/:id', auth, requireRole('librarian'), async (req, res) => {
  try {
    const id = req.params.id;

    const room = await db.get('SELECT * FROM rooms WHERE id = ?', id);
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const activeRow = await db.get(
      `SELECT COUNT(*) as count FROM reservations
       WHERE room_id = ? AND status IN ('reserved', 'checked_in')`,
      id
    );

    if (activeRow.count > 0) {
      return res.status(400).json({ error: '该房间存在有效预约，无法删除' });
    }

    await db.run('DELETE FROM rooms WHERE id = ?', id);
    res.json({ message: '房间已删除' });
  } catch (err) {
    console.error('删除房间错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
