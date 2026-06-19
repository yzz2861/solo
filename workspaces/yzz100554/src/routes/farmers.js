const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireBossOrClerk, requireBoss } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

router.get('/', authenticate, requireBossOrClerk, (req, res) => {
  const { name, village, page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (name) {
    whereClause += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }
  
  if (village) {
    whereClause += ' AND village LIKE ?';
    params.push(`%${village}%`);
  }
  
  const farmers = db.prepare(`
    SELECT f.*, u.name as creator_name 
    FROM farmers f
    LEFT JOIN users u ON f.created_by = u.id
    ${whereClause}
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), parseInt(offset));
  
  const { total } = db.prepare(`
    SELECT COUNT(*) as total FROM farmers ${whereClause}
  `).get(...params);
  
  res.json({
    data: farmers,
    pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total }
  });
});

router.get('/:id', authenticate, requireBossOrClerk, (req, res) => {
  const farmer = db.prepare(`
    SELECT f.*, u.name as creator_name 
    FROM farmers f
    LEFT JOIN users u ON f.created_by = u.id
    WHERE f.id = ?
  `).get(req.params.id);
  
  if (!farmer) {
    return res.status(404).json({ message: '农户不存在' });
  }
  
  res.json({ data: farmer });
});

router.post('/',
  authenticate,
  requireBossOrClerk,
  [
    body('name').notEmpty().withMessage('姓名不能为空'),
    body('phone').optional().isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
    body('id_card').optional().isLength({ min: 18, max: 18 }).withMessage('身份证号必须是18位')
  ],
  auditLog('create', 'farmers'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, id_card, address, village } = req.body;

    if (id_card) {
      const existing = db.prepare('SELECT id FROM farmers WHERE id_card = ?').get(id_card);
      if (existing) {
        return res.status(400).json({ message: '该身份证号已存在' });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO farmers (name, phone, id_card, address, village, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(name, phone, id_card, address, village, req.user.id);
    
    const farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
      message: '农户创建成功',
      data: farmer
    });
  }
);

router.put('/:id',
  authenticate,
  requireBoss,
  [
    body('name').notEmpty().withMessage('姓名不能为空'),
    body('phone').optional().isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
    body('id_card').optional().isLength({ min: 18, max: 18 }).withMessage('身份证号必须是18位')
  ],
  auditLog('update', 'farmers'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(req.params.id);
    if (!farmer) {
      return res.status(404).json({ message: '农户不存在' });
    }

    const { name, phone, id_card, address, village } = req.body;

    if (id_card && id_card !== farmer.id_card) {
      const existing = db.prepare('SELECT id FROM farmers WHERE id_card = ? AND id != ?').get(id_card, req.params.id);
      if (existing) {
        return res.status(400).json({ message: '该身份证号已被其他农户使用' });
      }
    }

    db.prepare(`
      UPDATE farmers 
      SET name = ?, phone = ?, id_card = ?, address = ?, village = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, phone, id_card, address, village, req.params.id);

    const updatedFarmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(req.params.id);
    
    res.json({
      message: '农户更新成功',
      data: updatedFarmer
    });
  }
);

router.delete('/:id', authenticate, requireBoss, auditLog('delete', 'farmers'), (req, res) => {
  const farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(req.params.id);
  if (!farmer) {
    return res.status(404).json({ message: '农户不存在' });
  }

  const hasOrders = db.prepare('SELECT COUNT(*) as count FROM sales_orders WHERE farmer_id = ?').get(req.params.id);
  if (hasOrders.count > 0) {
    return res.status(400).json({ message: '该农户存在关联订单，无法删除' });
  }

  db.prepare('DELETE FROM farmers WHERE id = ?').run(req.params.id);
  
  res.json({ message: '农户删除成功' });
});

router.get('/:id/summary', authenticate, requireBoss, (req, res) => {
  const farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(req.params.id);
  if (!farmer) {
    return res.status(404).json({ message: '农户不存在' });
  }

  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
      SUM(CASE WHEN status = 'settled' THEN 1 ELSE 0 END) as settled_orders,
      SUM(total_amount) as total_amount,
      SUM(paid_amount) as total_paid,
      SUM(returned_amount) as total_returned,
      SUM(balance) as total_balance
    FROM sales_orders
    WHERE farmer_id = ?
  `).get(req.params.id);

  res.json({
    data: {
      farmer,
      summary
    }
  });
});

module.exports = router;
