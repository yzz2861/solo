const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireBossOrClerk, requireBoss } = require('../middleware/auth');
const { auditLog, logAction } = require('../middleware/audit');
const { generateOrderNo, round2 } = require('../utils/helpers');

const router = express.Router();

const checkOrderSettled = (orderId) => {
  const order = db.prepare('SELECT status FROM sales_orders WHERE id = ?').get(orderId);
  return order && order.status === 'settled';
};

const updateOrderBalance = (orderId, userId) => {
  const order = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(returned_quantity * unit_price), 0) as returned_amount
    FROM sales_order_items 
    WHERE sales_order_id = ?
  `).get(orderId);
  
  const payments = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as paid_amount
    FROM repayments 
    WHERE sales_order_id = ?
  `).get(orderId);
  
  const totalAmount = round2(order.total_amount);
  const paidAmount = round2(payments.paid_amount);
  const returnedAmount = round2(order.returned_amount);
  const balance = round2(totalAmount - paidAmount - returnedAmount);
  
  let status = 'pending';
  let settledAt = null;
  let settledBy = null;
  
  if (balance <= 0 && totalAmount > 0) {
    status = 'settled';
    settledAt = 'CURRENT_TIMESTAMP';
    settledBy = userId;
  }
  
  const currentOrder = db.prepare('SELECT status FROM sales_orders WHERE id = ?').get(orderId);
  
  if (currentOrder.status === 'settled' && status === 'settled') {
    db.prepare(`
      UPDATE sales_orders 
      SET total_amount = ?, paid_amount = ?, returned_amount = ?, balance = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(totalAmount, paidAmount, returnedAmount, balance, orderId);
  } else if (status === 'settled') {
    db.prepare(`
      UPDATE sales_orders 
      SET total_amount = ?, paid_amount = ?, returned_amount = ?, balance = ?, status = ?,
          settled_at = CURRENT_TIMESTAMP, settled_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(totalAmount, paidAmount, returnedAmount, balance, status, userId, orderId);
  } else {
    db.prepare(`
      UPDATE sales_orders 
      SET total_amount = ?, paid_amount = ?, returned_amount = ?, balance = ?, status = ?,
          settled_at = NULL, settled_by = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(totalAmount, paidAmount, returnedAmount, balance, status, orderId);
  }
  
  return { totalAmount, paidAmount, returnedAmount, balance, status };
};

router.get('/', authenticate, requireBossOrClerk, (req, res) => {
  const { farmer_id, season_id, status, start_date, end_date, page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (farmer_id) {
    whereClause += ' AND so.farmer_id = ?';
    params.push(parseInt(farmer_id));
  }
  
  if (season_id) {
    whereClause += ' AND so.season_id = ?';
    params.push(parseInt(season_id));
  }
  
  if (status) {
    whereClause += ' AND so.status = ?';
    params.push(status);
  }
  
  if (start_date) {
    whereClause += ' AND so.sale_date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    whereClause += ' AND so.sale_date <= ?';
    params.push(end_date);
  }
  
  const orders = db.prepare(`
    SELECT so.*, f.name as farmer_name, s.name as season_name, 
           u.name as creator_name, su.name as settler_name
    FROM sales_orders so
    LEFT JOIN farmers f ON so.farmer_id = f.id
    LEFT JOIN seasons s ON so.season_id = s.id
    LEFT JOIN users u ON so.created_by = u.id
    LEFT JOIN users su ON so.settled_by = su.id
    ${whereClause}
    ORDER BY so.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), parseInt(offset));
  
  const { total } = db.prepare(`
    SELECT COUNT(*) as total FROM sales_orders so ${whereClause}
  `).get(...params);
  
  res.json({
    data: orders,
    pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total }
  });
});

router.get('/:id', authenticate, requireBossOrClerk, (req, res) => {
  const order = db.prepare(`
    SELECT so.*, f.name as farmer_name, f.phone as farmer_phone, 
           s.name as season_name, s.due_date as season_due_date,
           u.name as creator_name, su.name as settler_name
    FROM sales_orders so
    LEFT JOIN farmers f ON so.farmer_id = f.id
    LEFT JOIN seasons s ON so.season_id = s.id
    LEFT JOIN users u ON so.created_by = u.id
    LEFT JOIN users su ON so.settled_by = su.id
    WHERE so.id = ?
  `).get(req.params.id);
  
  if (!order) {
    return res.status(404).json({ message: '销售单不存在' });
  }
  
  const items = db.prepare(`
    SELECT soi.*, p.name as product_name, p.category as product_category, p.unit as product_unit
    FROM sales_order_items soi
    LEFT JOIN products p ON soi.product_id = p.id
    WHERE soi.sales_order_id = ?
  `).all(req.params.id);
  
  const repayments = db.prepare(`
    SELECT r.*, u.name as creator_name
    FROM repayments r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.sales_order_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id);
  
  const returns = db.prepare(`
    SELECT rt.*, p.name as product_name, u.name as creator_name
    FROM returns rt
    LEFT JOIN products p ON rt.product_id = p.id
    LEFT JOIN users u ON rt.created_by = u.id
    WHERE rt.sales_order_id = ?
    ORDER BY rt.created_at DESC
  `).all(req.params.id);
  
  res.json({
    data: {
      ...order,
      items,
      repayments,
      returns
    }
  });
});

router.post('/',
  authenticate,
  requireBossOrClerk,
  [
    body('farmer_id').isInt({ min: 1 }).withMessage('农户ID不能为空'),
    body('season_id').isInt({ min: 1 }).withMessage('作物季ID不能为空'),
    body('sale_date').isDate().withMessage('销售日期不能为空'),
    body('items').isArray({ min: 1 }).withMessage('至少需要一个商品'),
    body('items.*.product_id').isInt({ min: 1 }).withMessage('商品ID不能为空'),
    body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('数量必须大于0'),
    body('items.*.unit_price').isFloat({ min: 0 }).withMessage('单价不能小于0')
  ],
  auditLog('create', 'sales_orders'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { farmer_id, season_id, sale_date, remark, items } = req.body;

    const farmer = db.prepare('SELECT id FROM farmers WHERE id = ?').get(farmer_id);
    if (!farmer) {
      return res.status(400).json({ message: '农户不存在' });
    }

    const season = db.prepare('SELECT id FROM seasons WHERE id = ?').get(season_id);
    if (!season) {
      return res.status(400).json({ message: '作物季不存在' });
    }

    const orderNo = generateOrderNo('SO');
    
    const insertOrderStmt = db.prepare(`
      INSERT INTO sales_orders (order_no, farmer_id, season_id, sale_date, remark, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const insertItemStmt = db.prepare(`
      INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, amount, remark)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      const orderResult = insertOrderStmt.run(orderNo, farmer_id, season_id, sale_date, remark, req.user.id);
      const orderId = orderResult.lastInsertRowid;
      
      let totalAmount = 0;
      for (const item of items) {
        const amount = round2(item.quantity * item.unit_price);
        totalAmount += amount;
        insertItemStmt.run(orderId, item.product_id, item.quantity, item.unit_price, amount, item.remark);
      }
      
      updateOrderBalance(orderId, req.user.id);
      
      return orderId;
    });
    
    try {
      const orderId = tx();
      
      const order = db.prepare(`
        SELECT so.*, f.name as farmer_name, s.name as season_name
        FROM sales_orders so
        LEFT JOIN farmers f ON so.farmer_id = f.id
        LEFT JOIN seasons s ON so.season_id = s.id
        WHERE so.id = ?
      `).get(orderId);
      
      const orderItems = db.prepare(`
        SELECT soi.*, p.name as product_name
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE soi.sales_order_id = ?
      `).all(orderId);
      
      res.status(201).json({
        message: '销售单创建成功',
        data: {
          ...order,
          items: orderItems
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: '创建销售单失败', error: err.message });
    }
  }
);

router.put('/:id',
  authenticate,
  requireBoss,
  [
    body('items').optional().isArray({ min: 1 }).withMessage('至少需要一个商品')
  ],
  auditLog('update', 'sales_orders'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const orderId = parseInt(req.params.id);
    
    if (checkOrderSettled(orderId)) {
      return res.status(400).json({ message: '该销售单已结清，无法修改' });
    }

    const oldOrder = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId);
    if (!oldOrder) {
      return res.status(404).json({ message: '销售单不存在' });
    }

    const { farmer_id, season_id, sale_date, remark, items } = req.body;

    const tx = db.transaction(() => {
      if (farmer_id || season_id || sale_date || remark !== undefined) {
        db.prepare(`
          UPDATE sales_orders 
          SET farmer_id = COALESCE(?, farmer_id),
              season_id = COALESCE(?, season_id),
              sale_date = COALESCE(?, sale_date),
              remark = COALESCE(?, remark),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(farmer_id, season_id, sale_date, remark, orderId);
      }
      
      if (items) {
        db.prepare('DELETE FROM sales_order_items WHERE sales_order_id = ?').run(orderId);
        
        const insertItemStmt = db.prepare(`
          INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, amount, remark)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        for (const item of items) {
          const amount = round2(item.quantity * item.unit_price);
          insertItemStmt.run(orderId, item.product_id, item.quantity, item.unit_price, amount, item.remark);
        }
      }
      
      updateOrderBalance(orderId, req.user.id);
    });
    
    try {
      tx();
      
      logAction('update', 'sales_orders', orderId, oldOrder, req.body, req.user.id);
      
      const order = db.prepare(`
        SELECT so.*, f.name as farmer_name, s.name as season_name
        FROM sales_orders so
        LEFT JOIN farmers f ON so.farmer_id = f.id
        LEFT JOIN seasons s ON so.season_id = s.id
        WHERE so.id = ?
      `).get(orderId);
      
      const orderItems = db.prepare(`
        SELECT soi.*, p.name as product_name
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE soi.sales_order_id = ?
      `).all(orderId);
      
      res.json({
        message: '销售单更新成功',
        data: {
          ...order,
          items: orderItems
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: '更新销售单失败', error: err.message });
    }
  }
);

router.post('/:id/void',
  authenticate,
  requireBoss,
  auditLog('void', 'sales_orders'),
  (req, res) => {
    const orderId = parseInt(req.params.id);
    
    if (checkOrderSettled(orderId)) {
      return res.status(400).json({ message: '该销售单已结清，无法作废' });
    }

    const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ message: '销售单不存在' });
    }

    if (order.status === 'voided') {
      return res.status(400).json({ message: '该销售单已作废' });
    }

    db.prepare(`
      UPDATE sales_orders 
      SET status = 'voided', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(orderId);

    const updatedOrder = db.prepare(`
      SELECT so.*, f.name as farmer_name, s.name as season_name
      FROM sales_orders so
      LEFT JOIN farmers f ON so.farmer_id = f.id
      LEFT JOIN seasons s ON so.season_id = s.id
      WHERE so.id = ?
    `).get(orderId);

    res.json({
      message: '销售单已作废',
      data: updatedOrder
    });
  }
);

module.exports = router;
module.exports.updateOrderBalance = updateOrderBalance;
module.exports.checkOrderSettled = checkOrderSettled;
