const express = require('express');
const { body, validationResult } = require('express-validator');
const { run, get, all, beginTransaction, commitTransaction, rollbackTransaction } = require('../config/database');
const { authenticate, requireBossOrClerk, requireBoss } = require('../middleware/auth');
const { auditLog, logAction } = require('../middleware/audit');
const { generateOrderNo, round2 } = require('../utils/helpers');

const router = express.Router();

const checkOrderSettled = async (orderId) => {
  const order = await get('SELECT status FROM sales_orders WHERE id = ?', [orderId]);
  return order && order.status === 'settled';
};

const updateOrderBalance = async (orderId, userId) => {
  const order = await get(`
    SELECT 
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(returned_quantity * unit_price), 0) as returned_amount
    FROM sales_order_items 
    WHERE sales_order_id = ?
  `, [orderId]);
  
  const payments = await get(`
    SELECT COALESCE(SUM(amount), 0) as paid_amount
    FROM repayments 
    WHERE sales_order_id = ?
  `, [orderId]);
  
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
  
  const currentOrder = await get('SELECT status FROM sales_orders WHERE id = ?', [orderId]);
  
  if (currentOrder.status === 'settled' && status === 'settled') {
    await run(`
      UPDATE sales_orders 
      SET total_amount = ?, paid_amount = ?, returned_amount = ?, balance = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [totalAmount, paidAmount, returnedAmount, balance, orderId]);
  } else if (status === 'settled') {
    await run(`
      UPDATE sales_orders 
      SET total_amount = ?, paid_amount = ?, returned_amount = ?, balance = ?, status = ?,
          settled_at = CURRENT_TIMESTAMP, settled_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [totalAmount, paidAmount, returnedAmount, balance, status, userId, orderId]);
  } else {
    await run(`
      UPDATE sales_orders 
      SET total_amount = ?, paid_amount = ?, returned_amount = ?, balance = ?, status = ?,
          settled_at = NULL, settled_by = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [totalAmount, paidAmount, returnedAmount, balance, status, orderId]);
  }
  
  return { totalAmount, paidAmount, returnedAmount, balance, status };
};

router.get('/', authenticate, requireBossOrClerk, async (req, res) => {
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
  
  const orders = await all(`
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
  `, [...params, parseInt(pageSize), parseInt(offset)]);
  
  const { total } = await get(`
    SELECT COUNT(*) as total FROM sales_orders so ${whereClause}
  `, params);
  
  res.json({
    data: orders,
    pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total }
  });
});

router.get('/:id', authenticate, requireBossOrClerk, async (req, res) => {
  const order = await get(`
    SELECT so.*, f.name as farmer_name, f.phone as farmer_phone, 
           s.name as season_name, s.due_date as season_due_date,
           u.name as creator_name, su.name as settler_name
    FROM sales_orders so
    LEFT JOIN farmers f ON so.farmer_id = f.id
    LEFT JOIN seasons s ON so.season_id = s.id
    LEFT JOIN users u ON so.created_by = u.id
    LEFT JOIN users su ON so.settled_by = su.id
    WHERE so.id = ?
  `, [req.params.id]);
  
  if (!order) {
    return res.status(404).json({ message: '销售单不存在' });
  }
  
  const items = await all(`
    SELECT soi.*, p.name as product_name, p.category as product_category, p.unit as product_unit
    FROM sales_order_items soi
    LEFT JOIN products p ON soi.product_id = p.id
    WHERE soi.sales_order_id = ?
  `, [req.params.id]);
  
  const repayments = await all(`
    SELECT r.*, u.name as creator_name
    FROM repayments r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.sales_order_id = ?
    ORDER BY r.created_at DESC
  `, [req.params.id]);
  
  const returns = await all(`
    SELECT rt.*, p.name as product_name, u.name as creator_name
    FROM returns rt
    LEFT JOIN products p ON rt.product_id = p.id
    LEFT JOIN users u ON rt.created_by = u.id
    WHERE rt.sales_order_id = ?
    ORDER BY rt.created_at DESC
  `, [req.params.id]);
  
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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { farmer_id, season_id, sale_date, remark, items } = req.body;

    const farmer = await get('SELECT id FROM farmers WHERE id = ?', [farmer_id]);
    if (!farmer) {
      return res.status(400).json({ message: '农户不存在' });
    }

    const season = await get('SELECT id FROM seasons WHERE id = ?', [season_id]);
    if (!season) {
      return res.status(400).json({ message: '作物季不存在' });
    }

    const orderNo = generateOrderNo('SO');
    
    let orderId;
    try {
      await beginTransaction();
      
      const orderResult = await run(`
        INSERT INTO sales_orders (order_no, farmer_id, season_id, sale_date, remark, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [orderNo, farmer_id, season_id, sale_date, remark, req.user.id]);
      
      orderId = orderResult.lastID;
      
      let totalAmount = 0;
      for (const item of items) {
        const amount = round2(item.quantity * item.unit_price);
        totalAmount += amount;
        await run(`
          INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, amount, remark)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [orderId, item.product_id, item.quantity, item.unit_price, amount, item.remark]);
      }
      
      await updateOrderBalance(orderId, req.user.id);
      
      await commitTransaction();
    } catch (err) {
      await rollbackTransaction();
      console.error(err);
      return res.status(500).json({ message: '创建销售单失败', error: err.message });
    }
    
    const order = await get(`
      SELECT so.*, f.name as farmer_name, s.name as season_name
      FROM sales_orders so
      LEFT JOIN farmers f ON so.farmer_id = f.id
      LEFT JOIN seasons s ON so.season_id = s.id
      WHERE so.id = ?
    `, [orderId]);
    
    const orderItems = await all(`
      SELECT soi.*, p.name as product_name
      FROM sales_order_items soi
      LEFT JOIN products p ON soi.product_id = p.id
      WHERE soi.sales_order_id = ?
    `, [orderId]);
    
    res.status(201).json({
      message: '销售单创建成功',
      data: {
        ...order,
        items: orderItems
      }
    });
  }
);

router.put('/:id',
  authenticate,
  requireBoss,
  [
    body('items').optional().isArray({ min: 1 }).withMessage('至少需要一个商品')
  ],
  auditLog('update', 'sales_orders'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const orderId = parseInt(req.params.id);
    
    if (await checkOrderSettled(orderId)) {
      return res.status(400).json({ message: '该销售单已结清，无法修改' });
    }

    const oldOrder = await get('SELECT * FROM sales_orders WHERE id = ?', [orderId]);
    if (!oldOrder) {
      return res.status(404).json({ message: '销售单不存在' });
    }

    const { farmer_id, season_id, sale_date, remark, items } = req.body;

    try {
      await beginTransaction();
      
      if (farmer_id || season_id || sale_date || remark !== undefined) {
        await run(`
          UPDATE sales_orders 
          SET farmer_id = COALESCE(?, farmer_id),
              season_id = COALESCE(?, season_id),
              sale_date = COALESCE(?, sale_date),
              remark = COALESCE(?, remark),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [farmer_id, season_id, sale_date, remark, orderId]);
      }
      
      if (items) {
        await run('DELETE FROM sales_order_items WHERE sales_order_id = ?', [orderId]);
        
        for (const item of items) {
          const amount = round2(item.quantity * item.unit_price);
          await run(`
            INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, amount, remark)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [orderId, item.product_id, item.quantity, item.unit_price, amount, item.remark]);
        }
      }
      
      await updateOrderBalance(orderId, req.user.id);
      
      await commitTransaction();
    } catch (err) {
      await rollbackTransaction();
      console.error(err);
      return res.status(500).json({ message: '更新销售单失败', error: err.message });
    }
    
    await logAction('update', 'sales_orders', orderId, oldOrder, req.body, req.user.id);
    
    const order = await get(`
      SELECT so.*, f.name as farmer_name, s.name as season_name
      FROM sales_orders so
      LEFT JOIN farmers f ON so.farmer_id = f.id
      LEFT JOIN seasons s ON so.season_id = s.id
      WHERE so.id = ?
    `, [orderId]);
    
    const orderItems = await all(`
      SELECT soi.*, p.name as product_name
      FROM sales_order_items soi
      LEFT JOIN products p ON soi.product_id = p.id
      WHERE soi.sales_order_id = ?
    `, [orderId]);
    
    res.json({
      message: '销售单更新成功',
      data: {
        ...order,
        items: orderItems
      }
    });
  }
);

router.post('/:id/void',
  authenticate,
  requireBoss,
  auditLog('void', 'sales_orders'),
  async (req, res) => {
    const orderId = parseInt(req.params.id);
    
    if (await checkOrderSettled(orderId)) {
      return res.status(400).json({ message: '该销售单已结清，无法作废' });
    }

    const order = await get('SELECT * FROM sales_orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ message: '销售单不存在' });
    }

    if (order.status === 'voided') {
      return res.status(400).json({ message: '该销售单已作废' });
    }

    await run(`
      UPDATE sales_orders 
      SET status = 'voided', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [orderId]);

    const updatedOrder = await get(`
      SELECT so.*, f.name as farmer_name, s.name as season_name
      FROM sales_orders so
      LEFT JOIN farmers f ON so.farmer_id = f.id
      LEFT JOIN seasons s ON so.season_id = s.id
      WHERE so.id = ?
    `, [orderId]);

    res.json({
      message: '销售单已作废',
      data: updatedOrder
    });
  }
);

module.exports = router;
module.exports.updateOrderBalance = updateOrderBalance;
module.exports.checkOrderSettled = checkOrderSettled;
