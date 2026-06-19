const express = require('express');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const db = require('../config/database');
const { authenticate, requireBossOrClerk, requireBoss } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { generateRepaymentNo, isToday, round2 } = require('../utils/helpers');
const { updateOrderBalance, checkOrderSettled } = require('./salesOrders');

const router = express.Router();

const checkDuplicateRepayment = (farmerId, amount, repaymentDate, createdBy) => {
  const existing = db.prepare(`
    SELECT id, repayment_no, amount, repayment_date, created_at
    FROM repayments 
    WHERE farmer_id = ? AND amount = ? AND repayment_date = ? AND created_by = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(farmerId, amount, repaymentDate, createdBy);
  
  return existing;
};

router.get('/', authenticate, requireBossOrClerk, (req, res) => {
  const { farmer_id, sales_order_id, start_date, end_date, created_by, today, page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (farmer_id) {
    whereClause += ' AND r.farmer_id = ?';
    params.push(parseInt(farmer_id));
  }
  
  if (sales_order_id) {
    whereClause += ' AND r.sales_order_id = ?';
    params.push(parseInt(sales_order_id));
  }
  
  if (start_date) {
    whereClause += ' AND r.repayment_date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    whereClause += ' AND r.repayment_date <= ?';
    params.push(end_date);
  }
  
  if (created_by) {
    whereClause += ' AND r.created_by = ?';
    params.push(parseInt(created_by));
  }
  
  if (today === 'true' || today === '1') {
    const todayStr = moment().format('YYYY-MM-DD');
    whereClause += ' AND r.repayment_date = ?';
    params.push(todayStr);
  }
  
  if (req.user.role === 'clerk') {
    const todayStr = moment().format('YYYY-MM-DD');
    whereClause += ' AND r.repayment_date = ? AND r.created_by = ?';
    params.push(todayStr, req.user.id);
  }
  
  const repayments = db.prepare(`
    SELECT r.*, f.name as farmer_name, so.order_no as order_no,
           u.name as creator_name
    FROM repayments r
    LEFT JOIN farmers f ON r.farmer_id = f.id
    LEFT JOIN sales_orders so ON r.sales_order_id = so.id
    LEFT JOIN users u ON r.created_by = u.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), parseInt(offset));
  
  const { total } = db.prepare(`
    SELECT COUNT(*) as total FROM repayments r ${whereClause}
  `).get(...params);
  
  const { total_amount } = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_amount FROM repayments r ${whereClause}
  `).get(...params);
  
  res.json({
    data: repayments,
    pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total, total_amount: round2(total_amount) }
  });
});

router.get('/today', authenticate, requireBossOrClerk, (req, res) => {
  const todayStr = moment().format('YYYY-MM-DD');
  
  let whereClause = 'WHERE r.repayment_date = ?';
  const params = [todayStr];
  
  if (req.user.role === 'clerk') {
    whereClause += ' AND r.created_by = ?';
    params.push(req.user.id);
  }
  
  const repayments = db.prepare(`
    SELECT r.*, f.name as farmer_name, so.order_no as order_no,
           u.name as creator_name
    FROM repayments r
    LEFT JOIN farmers f ON r.farmer_id = f.id
    LEFT JOIN sales_orders so ON r.sales_order_id = so.id
    LEFT JOIN users u ON r.created_by = u.id
    ${whereClause}
    ORDER BY r.created_at DESC
  `).all(...params);
  
  const { total_amount } = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_amount FROM repayments r ${whereClause}
  `).get(...params);
  
  res.json({
    data: repayments,
    summary: {
      date: todayStr,
      count: repayments.length,
      total_amount: round2(total_amount)
    }
  });
});

router.get('/:id', authenticate, requireBossOrClerk, (req, res) => {
  const repayment = db.prepare(`
    SELECT r.*, f.name as farmer_name, f.phone as farmer_phone,
           so.order_no as order_no, so.total_amount as order_total,
           u.name as creator_name
    FROM repayments r
    LEFT JOIN farmers f ON r.farmer_id = f.id
    LEFT JOIN sales_orders so ON r.sales_order_id = so.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.id = ?
  `).get(req.params.id);
  
  if (!repayment) {
    return res.status(404).json({ message: '还款记录不存在' });
  }
  
  res.json({ data: repayment });
});

router.post('/',
  authenticate,
  requireBossOrClerk,
  [
    body('farmer_id').isInt({ min: 1 }).withMessage('农户ID不能为空'),
    body('amount').isFloat({ min: 0.01 }).withMessage('还款金额必须大于0'),
    body('repayment_date').isDate().withMessage('还款日期不能为空')
  ],
  auditLog('create', 'repayments'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { farmer_id, sales_order_id, amount, repayment_date, payment_method, remark } = req.body;

    if (req.user.role === 'clerk' && !isToday(repayment_date)) {
      return res.status(403).json({ message: '店员只能录入当天的还款记录' });
    }

    const farmer = db.prepare('SELECT id, name FROM farmers WHERE id = ?').get(farmer_id);
    if (!farmer) {
      return res.status(400).json({ message: '农户不存在' });
    }

    if (sales_order_id) {
      const order = db.prepare('SELECT id, status FROM sales_orders WHERE id = ?').get(sales_order_id);
      if (!order) {
        return res.status(400).json({ message: '销售单不存在' });
      }
      if (order.status === 'settled') {
        return res.status(400).json({ message: '该销售单已结清，无需再还款' });
      }
      if (order.status === 'voided') {
        return res.status(400).json({ message: '该销售单已作废' });
      }
    }

    const duplicate = checkDuplicateRepayment(farmer_id, amount, repayment_date, req.user.id);
    if (duplicate) {
      return res.status(409).json({
        message: '检测到可能的重复还款',
        duplicate: {
          id: duplicate.id,
          repayment_no: duplicate.repayment_no,
          amount: duplicate.amount,
          repayment_date: duplicate.repayment_date,
          created_at: duplicate.created_at
        },
        hint: '如果确认是不同的还款，请修改金额或日期后重试，或在备注中说明'
      });
    }

    const repaymentNo = generateRepaymentNo();

    const tx = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO repayments (repayment_no, farmer_id, sales_order_id, amount, 
                                repayment_date, payment_method, remark, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(repaymentNo, farmer_id, sales_order_id, parseFloat(amount),
                              repayment_date, payment_method, remark, req.user.id);
      
      if (sales_order_id) {
        updateOrderBalance(sales_order_id, req.user.id);
      }
      
      return result.lastInsertRowid;
    });
    
    try {
      const repaymentId = tx();
      
      const repayment = db.prepare(`
        SELECT r.*, f.name as farmer_name, so.order_no as order_no,
               u.name as creator_name
        FROM repayments r
        LEFT JOIN farmers f ON r.farmer_id = f.id
        LEFT JOIN sales_orders so ON r.sales_order_id = so.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.id = ?
      `).get(repaymentId);
      
      res.status(201).json({
        message: '还款记录创建成功',
        data: repayment
      });
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ message: '该还款记录已存在（重复录入）' });
      }
      console.error(err);
      res.status(500).json({ message: '创建还款记录失败', error: err.message });
    }
  }
);

router.post('/:id/confirm-duplicate',
  authenticate,
  requireBossOrClerk,
  [
    body('farmer_id').isInt({ min: 1 }).withMessage('农户ID不能为空'),
    body('amount').isFloat({ min: 0.01 }).withMessage('还款金额必须大于0'),
    body('repayment_date').isDate().withMessage('还款日期不能为空')
  ],
  auditLog('create_force', 'repayments'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { farmer_id, sales_order_id, amount, repayment_date, payment_method, remark } = req.body;

    if (req.user.role === 'clerk' && !isToday(repayment_date)) {
      return res.status(403).json({ message: '店员只能录入当天的还款记录' });
    }

    const farmer = db.prepare('SELECT id, name FROM farmers WHERE id = ?').get(farmer_id);
    if (!farmer) {
      return res.status(400).json({ message: '农户不存在' });
    }

    const repaymentNo = generateRepaymentNo();

    const tx = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO repayments (repayment_no, farmer_id, sales_order_id, amount, 
                                repayment_date, payment_method, remark, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const finalRemark = remark ? `${remark} (确认非重复录入)` : '(确认非重复录入)';
      
      const result = stmt.run(repaymentNo, farmer_id, sales_order_id, parseFloat(amount),
                              repayment_date, payment_method, finalRemark, req.user.id);
      
      if (sales_order_id) {
        updateOrderBalance(sales_order_id, req.user.id);
      }
      
      return result.lastInsertRowid;
    });
    
    try {
      const repaymentId = tx();
      
      const repayment = db.prepare(`
        SELECT r.*, f.name as farmer_name, so.order_no as order_no,
               u.name as creator_name
        FROM repayments r
        LEFT JOIN farmers f ON r.farmer_id = f.id
        LEFT JOIN sales_orders so ON r.sales_order_id = so.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.id = ?
      `).get(repaymentId);
      
      res.status(201).json({
        message: '还款记录创建成功（已确认非重复）',
        data: repayment
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: '创建还款记录失败', error: err.message });
    }
  }
);

router.put('/:id',
  authenticate,
  requireBoss,
  auditLog('update', 'repayments'),
  (req, res) => {
    const repaymentId = parseInt(req.params.id);
    const repayment = db.prepare('SELECT * FROM repayments WHERE id = ?').get(repaymentId);
    
    if (!repayment) {
      return res.status(404).json({ message: '还款记录不存在' });
    }

    if (repayment.sales_order_id && checkOrderSettled(repayment.sales_order_id)) {
      return res.status(400).json({ message: '关联的销售单已结清，无法修改还款记录' });
    }

    const { sales_order_id, amount, repayment_date, payment_method, remark } = req.body;

    if (sales_order_id) {
      const order = db.prepare('SELECT id, status FROM sales_orders WHERE id = ?').get(sales_order_id);
      if (!order) {
        return res.status(400).json({ message: '销售单不存在' });
      }
      if (order.status === 'settled') {
        return res.status(400).json({ message: '该销售单已结清' });
      }
    }

    const tx = db.transaction(() => {
      const oldOrderId = repayment.sales_order_id;
      
      db.prepare(`
        UPDATE repayments 
        SET sales_order_id = ?, amount = ?, repayment_date = ?, 
            payment_method = ?, remark = ?
        WHERE id = ?
      `).run(
        sales_order_id ?? repayment.sales_order_id,
        amount !== undefined ? parseFloat(amount) : repayment.amount,
        repayment_date ?? repayment.repayment_date,
        payment_method ?? repayment.payment_method,
        remark ?? repayment.remark,
        repaymentId
      );
      
      if (oldOrderId) {
        updateOrderBalance(oldOrderId, req.user.id);
      }
      if (sales_order_id && sales_order_id !== oldOrderId) {
        updateOrderBalance(sales_order_id, req.user.id);
      }
    });
    
    try {
      tx();
      
      const updatedRepayment = db.prepare(`
        SELECT r.*, f.name as farmer_name, so.order_no as order_no,
               u.name as creator_name
        FROM repayments r
        LEFT JOIN farmers f ON r.farmer_id = f.id
        LEFT JOIN sales_orders so ON r.sales_order_id = so.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.id = ?
      `).get(repaymentId);
      
      res.json({
        message: '还款记录更新成功',
        data: updatedRepayment
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: '更新还款记录失败', error: err.message });
    }
  }
);

router.delete('/:id',
  authenticate,
  requireBoss,
  auditLog('delete', 'repayments'),
  (req, res) => {
    const repaymentId = parseInt(req.params.id);
    const repayment = db.prepare('SELECT * FROM repayments WHERE id = ?').get(repaymentId);
    
    if (!repayment) {
      return res.status(404).json({ message: '还款记录不存在' });
    }

    if (repayment.sales_order_id && checkOrderSettled(repayment.sales_order_id)) {
      return res.status(400).json({ message: '关联的销售单已结清，无法删除还款记录' });
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM repayments WHERE id = ?').run(repaymentId);
      
      if (repayment.sales_order_id) {
        updateOrderBalance(repayment.sales_order_id, req.user.id);
      }
    });
    
    try {
      tx();
      res.json({ message: '还款记录删除成功' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: '删除还款记录失败', error: err.message });
    }
  }
);

module.exports = router;
