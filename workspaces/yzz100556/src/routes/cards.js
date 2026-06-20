const express = require('express');
const db = require('../config/database');
const { authMiddleware, roleMiddleware, logOperation } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', roleMiddleware('receptionist', 'security', 'admin'), (req, res) => {
  const { cardNumber, roomId, status, ownerName } = req.query;
  let sql = `
    SELECT c.*, r.room_number, r.building, r.unit, o.name as owner_name, o.phone,
           u.real_name as disabled_by_name
    FROM access_cards c 
    JOIN rooms r ON c.room_id = r.id 
    JOIN owners o ON c.owner_id = o.id 
    LEFT JOIN users u ON c.disabled_by = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (cardNumber) {
    sql += ' AND c.card_number LIKE ?';
    params.push(`%${cardNumber}%`);
  }
  if (roomId) {
    sql += ' AND c.room_id = ?';
    params.push(roomId);
  }
  if (status) {
    sql += ' AND c.status = ?';
    params.push(status);
  }
  if (ownerName) {
    sql += ' AND o.name LIKE ?';
    params.push(`%${ownerName}%`);
  }
  
  sql += ' ORDER BY c.issued_at DESC LIMIT 300';
  
  const cards = db.prepare(sql).all(...params);
  res.json(cards);
});

router.post('/', roleMiddleware('receptionist', 'admin'), (req, res) => {
  const { cardNumber, ownerId, roomId } = req.body;
  
  if (!cardNumber || !ownerId || !roomId) {
    return res.status(400).json({ error: '卡号、业主ID、房间ID不能为空' });
  }

  const existing = db.prepare('SELECT * FROM access_cards WHERE card_number = ?').get(cardNumber);
  if (existing) {
    return res.status(400).json({ error: '该卡号已存在' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO access_cards (card_number, owner_id, room_id, status)
      VALUES (?, ?, ?, 'active')
    `).run(cardNumber, ownerId, roomId);
    
    const card = db.prepare('SELECT * FROM access_cards WHERE id = ?').get(result.lastInsertRowid);
    logOperation(req.user.id, 'create_card', 'access_card', card.id, { cardNumber }, req.ip);
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: '创建门禁卡失败: ' + err.message });
  }
});

router.get('/:id', roleMiddleware('receptionist', 'security', 'admin'), (req, res) => {
  const card = db.prepare(`
    SELECT c.*, r.room_number, r.building, r.unit, o.name as owner_name, o.phone,
           u.real_name as disabled_by_name
    FROM access_cards c 
    JOIN rooms r ON c.room_id = r.id 
    JOIN owners o ON c.owner_id = o.id 
    LEFT JOIN users u ON c.disabled_by = u.id
    WHERE c.id = ?
  `).get(req.params.id);
  
  if (!card) {
    return res.status(404).json({ error: '门禁卡不存在' });
  }
  res.json(card);
});

router.post('/:id/disable', roleMiddleware('security', 'receptionist', 'admin'), (req, res) => {
  const { notes } = req.body;
  
  const card = db.prepare('SELECT * FROM access_cards WHERE id = ?').get(req.params.id);
  if (!card) {
    return res.status(404).json({ error: '门禁卡不存在' });
  }
  
  if (card.status === 'disabled' || card.status === 'replaced') {
    return res.status(400).json({ error: '该门禁卡已停用/已更换' });
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE access_cards 
      SET status = 'disabled', disabled_at = CURRENT_TIMESTAMP, disabled_by = ?, notes = ?
      WHERE id = ?
    `).run(req.user.id, notes || null, card.id);
    
    const relatedReissue = db.prepare(`
      SELECT * FROM card_reissues 
      WHERE old_card_id = ? AND status IN ('pending_stop', 'stopped')
      ORDER BY reported_at DESC LIMIT 1
    `).get(card.id);
    
    if (relatedReissue && relatedReissue.status === 'pending_stop') {
      db.prepare(`
        UPDATE card_reissues 
        SET status = 'stopped', stopped_by = ?, stopped_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.id, relatedReissue.id);
    }
    
    return db.prepare('SELECT * FROM access_cards WHERE id = ?').get(card.id);
  });

  try {
    const updatedCard = tx();
    logOperation(req.user.id, 'disable_card', 'access_card', card.id, { cardNumber: card.card_number }, req.ip);
    res.json(updatedCard);
  } catch (err) {
    res.status(500).json({ error: '停用门禁卡失败: ' + err.message });
  }
});

router.post('/:id/recover', roleMiddleware('receptionist', 'admin'), (req, res) => {
  const card = db.prepare('SELECT * FROM access_cards WHERE id = ?').get(req.params.id);
  if (!card) {
    return res.status(404).json({ error: '门禁卡不存在' });
  }
  
  if (!['lost', 'disabled', 'replaced'].includes(card.status)) {
    return res.status(400).json({ error: '只有挂失、停用或已更换状态的卡才能找回' });
  }

  const relatedReissue = db.prepare(`
    SELECT cr.*, c2.status as new_card_status
    FROM card_reissues cr 
    LEFT JOIN access_cards c2 ON cr.new_card_id = c2.id
    WHERE cr.old_card_id = ? AND cr.status IN ('stopped', 'new_card_issued', 'completed', 'old_card_recovered')
    ORDER BY cr.reported_at DESC LIMIT 1
  `).get(card.id);

  if (relatedReissue && relatedReissue.new_card_id && relatedReissue.new_card_status === 'active') {
    return res.status(400).json({ 
      error: '该房号已有新卡在使用，找回旧卡前需先停用新卡，确保不能两张卡同时有效',
      newCardId: relatedReissue.new_card_id
    });
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE access_cards 
      SET status = 'active', disabled_at = NULL, disabled_by = NULL
      WHERE id = ?
    `).run(card.id);
    
    if (relatedReissue && relatedReissue.status !== 'old_card_recovered') {
      db.prepare(`
        UPDATE card_reissues 
        SET status = 'old_card_recovered', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(relatedReissue.id);
    }
    
    return db.prepare('SELECT * FROM access_cards WHERE id = ?').get(card.id);
  });

  try {
    const updatedCard = tx();
    logOperation(req.user.id, 'recover_card', 'access_card', card.id, { cardNumber: card.card_number }, req.ip);
    res.json(updatedCard);
  } catch (err) {
    res.status(500).json({ error: '找回门禁卡失败: ' + err.message });
  }
});

module.exports = router;
