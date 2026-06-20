const express = require('express');
const db = require('../config/database');
const { authMiddleware, roleMiddleware, logOperation } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/owners', roleMiddleware('receptionist', 'admin'), (req, res) => {
  const { name, phone, roomNumber } = req.query;
  let sql = `
    SELECT DISTINCT o.*, r.room_number, r.building, r.unit 
    FROM owners o 
    LEFT JOIN rooms r ON o.id = r.owner_id 
    WHERE 1=1
  `;
  const params = [];
  
  if (name) {
    sql += ' AND o.name LIKE ?';
    params.push(`%${name}%`);
  }
  if (phone) {
    sql += ' AND o.phone LIKE ?';
    params.push(`%${phone}%`);
  }
  if (roomNumber) {
    sql += ' AND r.room_number LIKE ?';
    params.push(`%${roomNumber}%`);
  }
  
  sql += ' ORDER BY o.created_at DESC LIMIT 200';
  
  const owners = db.prepare(sql).all(...params);
  res.json(owners);
});

router.post('/owners', roleMiddleware('receptionist', 'admin'), (req, res) => {
  const { name, phone, idCard, roomNumber, building, unit } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '业主姓名不能为空' });
  }
  if (!roomNumber || !building) {
    return res.status(400).json({ error: '房号和楼栋不能为空' });
  }

  const tx = db.transaction(() => {
    let owner = db.prepare('SELECT * FROM owners WHERE name = ? AND (phone = ? OR phone IS NULL)').get(name, phone || null);
    
    if (!owner) {
      const result = db.prepare('INSERT INTO owners (name, phone, id_card) VALUES (?, ?, ?)').run(name, phone || null, idCard || null);
      owner = db.prepare('SELECT * FROM owners WHERE id = ?').get(result.lastInsertRowid);
    }
    
    let room = db.prepare('SELECT * FROM rooms WHERE room_number = ?').get(roomNumber);
    if (room) {
      db.prepare('UPDATE rooms SET owner_id = ?, building = ?, unit = ? WHERE id = ?').run(owner.id, building, unit || null, room.id);
      room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id);
    } else {
      const result = db.prepare('INSERT INTO rooms (room_number, building, unit, owner_id) VALUES (?, ?, ?, ?)').run(roomNumber, building, unit || null, owner.id);
      room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);
    }

    return { owner, room };
  });

  try {
    const result = tx();
    logOperation(req.user.id, 'create_owner', 'owner', result.owner.id, { name, roomNumber }, req.ip);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: '创建业主信息失败: ' + err.message });
  }
});

router.get('/owners/:id', roleMiddleware('receptionist', 'admin'), (req, res) => {
  const owner = db.prepare(`
    SELECT o.*, r.room_number, r.building, r.unit 
    FROM owners o 
    LEFT JOIN rooms r ON o.id = r.owner_id 
    WHERE o.id = ?
  `).get(req.params.id);
  
  if (!owner) {
    return res.status(404).json({ error: '业主不存在' });
  }
  
  const cards = db.prepare(`
    SELECT c.*, r.room_number 
    FROM access_cards c 
    JOIN rooms r ON c.room_id = r.id 
    WHERE c.owner_id = ? 
    ORDER BY c.issued_at DESC
  `).all(req.params.id);
  
  res.json({ ...owner, cards });
});

router.get('/rooms', roleMiddleware('receptionist', 'security', 'admin'), (req, res) => {
  const { roomNumber, building } = req.query;
  let sql = `
    SELECT r.*, o.name as owner_name, o.phone 
    FROM rooms r 
    LEFT JOIN owners o ON r.owner_id = o.id 
    WHERE 1=1
  `;
  const params = [];
  
  if (roomNumber) {
    sql += ' AND r.room_number LIKE ?';
    params.push(`%${roomNumber}%`);
  }
  if (building) {
    sql += ' AND r.building = ?';
    params.push(building);
  }
  
  sql += ' ORDER BY r.building, r.room_number LIMIT 200';
  
  const rooms = db.prepare(sql).all(...params);
  res.json(rooms);
});

module.exports = router;
