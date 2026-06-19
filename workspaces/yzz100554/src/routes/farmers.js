const express = require('express');
const { body, validationResult } = require('express-validator');
const { run, get, all } = require('../config/database');
const { authenticate, requireBossOrClerk, requireBoss } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

router.get('/', authenticate, requireBossOrClerk, async (req, res) => {
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
  
  const farmers = await all(`
    SELECT f.*, u.name as creator_name 
    FROM farmers f
    LEFT JOIN users u ON f.created_by = u.id
    ${whereClause}
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(pageSize), parseInt(offset)]);
  
  const { total } = await get(`
    SELECT COUNT(*) as total FROM farmers ${whereClause}
  `, params);
  
  res.json({
    data: farmers,
    pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total }
  });
});

router.get('/:id', authenticate, requireBossOrClerk, async (req, res) => {
  const farmer = await get(`
    SELECT f.*, u.name as creator_name 
    FROM farmers f
    LEFT JOIN users u ON f.created_by = u.id
    WHERE f.id = ?
  `, [req.params.id]);
  
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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, id_card, address, village } = req.body;

    if (id_card) {
      const existing = await get('SELECT id FROM farmers WHERE id_card = ?', [id_card]);
      if (existing) {
        return res.status(400).json({ message: '该身份证号已存在' });
      }
    }

    const result = await run(`
      INSERT INTO farmers (name, phone, id_card, address, village, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, phone, id_card, address, village, req.user.id]);
    
    const farmer = await get('SELECT * FROM farmers WHERE id = ?', [result.lastID]);
    
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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const farmer = await get('SELECT * FROM farmers WHERE id = ?', [req.params.id]);
    if (!farmer) {
      return res.status(404).json({ message: '农户不存在' });
    }

    const { name, phone, id_card, address, village } = req.body;

    if (id_card && id_card !== farmer.id_card) {
      const existing = await get('SELECT id FROM farmers WHERE id_card = ? AND id != ?', [id_card, req.params.id]);
      if (existing) {
        return res.status(400).json({ message: '该身份证号已被其他农户使用' });
      }
    }

    await run(`
      UPDATE farmers 
      SET name = ?, phone = ?, id_card = ?, address = ?, village = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, phone, id_card, address, village, req.params.id]);

    const updatedFarmer = await get('SELECT * FROM farmers WHERE id = ?', [req.params.id]);
    
    res.json({
      message: '农户更新成功',
      data: updatedFarmer
    });
  }
);

router.delete('/:id', authenticate, requireBoss, auditLog('delete', 'farmers'), async (req, res) => {
  const farmer = await get('SELECT * FROM farmers WHERE id = ?', [req.params.id]);
  if (!farmer) {
    return res.status(404).json({ message: '农户不存在' });
  }

  const { count } = await get('SELECT COUNT(*) as count FROM sales_orders WHERE farmer_id = ?', [req.params.id]);
  if (count > 0) {
    return res.status(400).json({ message: '该农户存在关联订单，无法删除' });
  }

  await run('DELETE FROM farmers WHERE id = ?', [req.params.id]);
  
  res.json({ message: '农户删除成功' });
});

router.get('/:id/summary', authenticate, requireBoss, async (req, res) => {
  const farmer = await get('SELECT * FROM farmers WHERE id = ?', [req.params.id]);
  if (!farmer) {
    return res.status(404).json({ message: '农户不存在' });
  }

  const summary = await get(`
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
  `, [req.params.id]);

  res.json({
    data: {
      farmer,
      summary
    }
  });
});

module.exports = router;
