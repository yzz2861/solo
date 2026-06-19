const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, requireBossOrClerk, requireBoss } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { generateReturnNo, round2 } = require('../utils/helpers');
const { updateOrderBalance, checkOrderSettled } = require('./salesOrders');

const router = express.Router();

router.get('/', authenticate, requireBossOrClerk, (req, res) => {
  const { sales_order_id, product_id, start_date, end_date, page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (sales_order_id) {
    whereClause += ' AND rt.sales_order_id = ?';
    params.push(parseInt(sales_order_id));
  }
  
  if (product_id) {
    whereClause += ' AND rt.product_id = ?';
    params.push(parseInt(product_id));
  }
  
  if (start_date) {
    whereClause += ' AND rt.return_date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    whereClause += ' AND rt.return_date <= ?';
    params.push(end_date);
  }
  
  const returns = db.prepare(`
    SELECT rt.*, f.name as farmer_name, so.order_no as order_no,
           p.name as product_name, p.unit as product_unit,
           u.name as creator_name
    FROM returns rt
    LEFT JOIN sales_orders so ON rt.sales_order_id = so.id
    LEFT JOIN farmers f ON so.farmer_id = f.id
    LEFT JOIN products p ON rt.product_id = p.id
    LEFT JOIN users u ON rt.created_by = u.id
    ${whereClause}
    ORDER BY rt.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), parseInt(offset));
  
  const { total } = db.prepare(`
    SELECT COUNT(*) as total FROM returns rt ${whereClause}
  `).get(...params);
  
  const { total_amount } = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_amount FROM returns rt ${whereClause}
  `).get(...params);
  
  res.json({
    data: returns,
    pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total, total_amount: round2(total_amount) }
  });
});

router.get('/:id', authenticate, requireBossOrClerk, (req, res) => {
  const returnRecord = db.prepare(`
    SELECT rt.*, f.name as farmer_name, f.phone as farmer_phone,
           so.order_no as order_no, so.sale_date as order_date,
           soi.quantity as original_quantity, soi.amount as original_amount,
           p.name as product_name, p.unit as product_unit, p.specification,
           u.name as creator_name
    FROM returns rt
    LEFT JOIN sales_orders so ON rt.sales_order_id = so.id
    LEFT JOIN farmers f ON so.farmer_id = f.id
    LEFT JOIN sales_order_items soi ON rt.sales_order_item_id = soi.id
    LEFT JOIN products p ON rt.product_id = p.id
    LEFT JOIN users u ON rt.created_by = u.id
    WHERE rt.id = ?
  `).get(req.params.id);
  
  if (!returnRecord) {
    return res.status(404).json({ message: '退货记录不存在' });
  }
  
  res.json({ data: returnRecord });
});

router.post('/',
  authenticate,
  requireBossOrClerk,
  [
    body('sales_order_id').isInt({ min: 1 }).withMessage('销售单ID不能为空'),
    body('sales_order_item_id').isInt({ min: 1 }).withMessage('销售单明细ID不能为空'),
    body('quantity').isFloat({ min: 0.01 }).withMessage('退货数量必须大于0'),
    body('return_date').isDate().withMessage('退货日期不能为空')
  ],
  auditLog('create', 'returns'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sales_order_id, sales_order_item_id, quantity, return_date, reason, remark } = req.body;

    if (checkOrderSettled(sales_order_id)) {
      return res.status(400).json({ message: '该销售单已结清，无法退货' });
    }

    const order = db.prepare(`
      SELECT so.id, so.status, so.farmer_id,
             soi.product_id, soi.quantity as sold_quantity, 
             soi.unit_price, soi.returned_quantity
      FROM sales_orders so
      JOIN sales_order_items soi ON so.id = soi.sales_order_id
      WHERE so.id = ? AND soi.id = ?
    `).get(sales_order_id, sales_order_item_id);
    
    if (!order) {
      return res.status(400).json({ message: '销售单或明细不存在' });
    }
    
    if (order.status === 'voided') {
      return res.status(400).json({ message: '该销售单已作废' });
    }

    const availableQuantity = order.sold_quantity - order.returned_quantity;
    if (quantity > availableQuantity) {
      return res.status(400).json({ 
        message: `退货数量超过可退数量`,
        details: {
          sold_quantity: order.sold_quantity,
          returned_quantity: order.returned_quantity,
          available_quantity: availableQuantity
        }
      });
    }

    const returnNo = generateReturnNo();
    const amount = round2(quantity * order.unit_price);

    const tx = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO returns (return_no, sales_order_id, sales_order_item_id, product_id,
                             quantity, unit_price, amount, return_date, reason, remark, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(returnNo, sales_order_id, sales_order_item_id, order.product_id,
                              quantity, order.unit_price, amount, return_date, reason, remark, req.user.id);
      
      db.prepare(`
        UPDATE sales_order_items 
        SET returned_quantity = returned_quantity + ?
        WHERE id = ?
      `).run(quantity, sales_order_item_id);
      
      updateOrderBalance(sales_order_id, req.user.id);
      
      return result.lastInsertRowid;
    });
    
    try {
      const returnId = tx();
      
      const returnRecord = db.prepare(`
        SELECT rt.*, f.name as farmer_name, so.order_no as order_no,
               p.name as product_name, u.name as creator_name
        FROM returns rt
        LEFT JOIN sales_orders so ON rt.sales_order_id = so.id
        LEFT JOIN farmers f ON so.farmer_id = f.id
        LEFT JOIN products p ON rt.product_id = p.id
        LEFT JOIN users u ON rt.created_by = u.id
        WHERE rt.id = ?
      `).get(returnId);
      
      res.status(201).json({
        message: '退货记录创建成功',
        data: returnRecord
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: '创建退货记录失败', error: err.message });
    }
  }
);

router.delete('/:id',
  authenticate,
  requireBoss,
  auditLog('delete', 'returns'),
  (req, res) => {
    const returnId = parseInt(req.params.id);
    const returnRecord = db.prepare('SELECT * FROM returns WHERE id = ?').get(returnId);
    
    if (!returnRecord) {
      return res.status(404).json({ message: '退货记录不存在' });
    }

    if (checkOrderSettled(returnRecord.sales_order_id)) {
      return res.status(400).json({ message: '关联的销售单已结清，无法撤销退货' });
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE sales_order_items 
        SET returned_quantity = returned_quantity - ?
        WHERE id = ?
      `).run(returnRecord.quantity, returnRecord.sales_order_item_id);
      
      db.prepare('DELETE FROM returns WHERE id = ?').run(returnId);
      
      updateOrderBalance(returnRecord.sales_order_id, req.user.id);
    });
    
    try {
      tx();
      res.json({ message: '退货记录已撤销' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: '撤销退货记录失败', error: err.message });
    }
  }
);

module.exports = router;
