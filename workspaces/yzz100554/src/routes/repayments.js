const express = require('express');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const { run, get, all, beginTransaction, commitTransaction, rollbackTransaction } = require('../config/database');
const { authenticate, requireBossOrClerk, requireBoss } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { generateRepaymentNo, isToday, round2 } = require('../utils/helpers');
const { updateOrderBalance, checkOrderSettled } = require('./salesOrders');

const router = express.Router();

const checkDuplicateRepayment = async (farmerId, amount, repaymentDate, createdBy) => {
  const existing = await get(`
    SELECT id, repayment_no, amount, repayment_date, created_at
    FROM repayments 
    WHERE farmer_id = ? AND amount = ? AND repayment_date = ? AND created_by = ?
    ORDER BY created_at DESC
    LIMIT 1
  `, [farmerId, amount, repaymentDate, createdBy]);
  
  return existing;
};

router.get('/', authenticate, requireBossOrClerk, async (req, res) => {
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
  
  const repayments = await all(`
    SELECT r.*, f.name as farmer_name, so.order_no as order_no,
           u.name as creator_name
    FROM repayments r
    LEFT JOIN farmers f ON r.farmer_id = f.id
    LEFT JOIN sales_orders so ON r.sales_order_id = so.id
    LEFT JOIN users u ON r.created_by = u.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(pageSize), parseInt(offset)]);
  
  const { total } = await get(`
    SELECT COUNT(*) as total FROM repayments r ${whereClause}
  `, params);
  
  const { total_amount } = await get(`
    SELECT COALESCE(SUM(amount), 0) as total_amount FROM repayments r ${whereClause}
  `, params);
  
  res.json({
    data: repayments,
    pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total, total_amount: round2(total_amount) }
  });
});

router.get('/today', authenticate, requireBossOrClerk, async (req, res) => {
  const todayStr = moment().format('YYYY-MM-DD');
  
  let whereClause = 'WHERE r.repayment_date = ?';
  const params = [todayStr];
  
  if (req.user.role === 'clerk') {
    whereClause += ' AND r.created_by = ?';
    params.push(req.user.id);
  }
  
  const repayments = await all(`
    SELECT r.*, f.name as farmer_name, so.order_no as order_no,
           u.name as creator_name
    FROM repayments r
    LEFT JOIN farmers f ON r.farmer_id = f.id
    LEFT JOIN sales_orders so ON r.sales_order_id = so.id
    LEFT JOIN users u ON r.created_by = u.id
    ${whereClause}
    ORDER BY r.created_at DESC
  `, params);
  
  const { total_amount } = await get(`
    SELECT COALESCE(SUM(amount), 0) as total_amount FROM repayments r ${whereClause}
  `, params);
  
  res.json({
    data: repayments,
    summary: {
      date: todayStr,
      count: repayments.length,
      total_amount: round2(total_amount)
    }
  });
});

router.get('/:id', authenticate, requireBossOrClerk, async (req, res) => {
  const repayment = await get(`
    SELECT r.*, f.name as farmer_name, f.phone as farmer_phone,
           so.order_no as order_no, so.total_amount as order_total,
           u.name as creator_name
    FROM repayments r
    LEFT JOIN farmers f ON r.farmer_id = f.id
    LEFT JOIN sales_orders so ON r.sales_order_id = so.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.id = ?
  `, [req.params.id]);
  
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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { farmer_id, sales_order_id, amount, repayment_date, payment_method, remark } = req.body;

    if (req.user.role === 'clerk' && !isToday(repayment_date)) {
      return res.status(403).json({ message: '店员只能录入当天的还款记录' });
    }

    const farmer = await get('SELECT id, name FROM farmers WHERE id = ?', [farmer_id]);
    if (!farmer) {
      return res.status(400).json({ message: '农户不存在' });
    }

    if (sales_order_id) {
      const order = await get('SELECT id, status FROM sales_orders WHERE id = ?', [sales_order_id]);
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

    const duplicate = await checkDuplicateRepayment(farmer_id, amount, repayment_date, req.user.id);
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

    let repaymentId;
    try {
      await beginTransaction();
      
      const result = await run(`
        INSERT INTO repayments (repayment_no, farmer_id, sales_order_id, amount, 
                                repayment_date, payment_method, remark, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [repaymentNo, farmer_id, sales_order_id, parseFloat(amount),
          repayment_date, payment_method, remark, req.user.id]);
      
      repaymentId = result.lastID;
      
      if (sales_order_id) {
        await updateOrderBalance(sales_order_id, req.user.id);
      }
      
      await commitTransaction();
    } catch (err) {
      await rollbackTransaction();
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ message: '该还款记录已存在（重复录入）' });
      }
      console.error(err);
      return res.status(500).json({ message: '创建还款记录失败', error: err.message });
    }
    
    const repayment = await get(`
      SELECT r.*, f.name as farmer_name, so.order_no as order_no,
             u.name as creator_name
      FROM repayments r
      LEFT JOIN farmers f ON r.farmer_id = f.id
      LEFT JOIN sales_orders so ON r.sales_order_id = so.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = ?
    `, [repaymentId]);
    
    res.status(201).json({
      message: '还款记录创建成功',
      data: repayment
    });
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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { farmer_id, sales_order_id, amount, repayment_date, payment_method, remark } = req.body;

    if (req.user.role === 'clerk' && !isToday(repayment_date)) {
      return res.status(403).json({ message: '店员只能录入当天的还款记录' });
    }

    const farmer = await get('SELECT id, name FROM farmers WHERE id = ?', [farmer_id]);
    if (!farmer) {
      return res.status(400).json({ message: '农户不存在' });
    }

    const repaymentNo = generateRepaymentNo();

    let repaymentId;
    try {
      await beginTransaction();
      
      const finalRemark = remark ? `${remark} (确认非重复录入)` : '(确认非重复录入)';
      
      const result = await run(`
        INSERT INTO repayments (repayment_no, farmer_id, sales_order_id, amount, 
                                repayment_date, payment_method, remark, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [repaymentNo, farmer_id, sales_order_id, parseFloat(amount),
          repayment_date, payment_method, finalRemark, req.user.id]);
      
      repaymentId = result.lastID;
      
      if (sales_order_id) {
        await updateOrderBalance(sales_order_id, req.user.id);
      }
      
      await commitTransaction();
    } catch (err) {
      await rollbackTransaction();
      console.error(err);
      return res.status(500).json({ message: '创建还款记录失败', error: err.message });
    }
    
    const repayment = await get(`
      SELECT r.*, f.name as farmer_name, so.order_no as order_no,
             u.name as creator_name
      FROM repayments r
      LEFT JOIN farmers f ON r.farmer_id = f.id
      LEFT JOIN sales_orders so ON r.sales_order_id = so.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = ?
    `, [repaymentId]);
    
    res.status(201).json({
      message: '还款记录创建成功（已确认非重复）',
      data: repayment
    });
  }
);

router.put('/:id',
  authenticate,
  requireBoss,
  auditLog('update', 'repayments'),
  async (req, res) => {
    const repaymentId = parseInt(req.params.id);
    const repayment = await get('SELECT * FROM repayments WHERE id = ?', [repaymentId]);
    
    if (!repayment) {
      return res.status(404).json({ message: '还款记录不存在' });
    }

    if (repayment.sales_order_id && await checkOrderSettled(repayment.sales_order_id)) {
      return res.status(400).json({ message: '关联的销售单已结清，无法修改还款记录' });
    }

    const { sales_order_id, amount, repayment_date, payment_method, remark } = req.body;

    if (sales_order_id) {
      const order = await get('SELECT id, status FROM sales_orders WHERE id = ?', [sales_order_id]);
      if (!order) {
        return res.status(400).json({ message: '销售单不存在' });
      }
      if (order.status === 'settled') {
        return res.status(400).json({ message: '该销售单已结清' });
      }
    }

    try {
      await beginTransaction();
      
      const oldOrderId = repayment.sales_order_id;
      
      await run(`
        UPDATE repayments 
        SET sales_order_id = ?, amount = ?, repayment_date = ?, 
            payment_method = ?, remark = ?
        WHERE id = ?
      `, [
        sales_order_id ?? repayment.sales_order_id,
        amount !== undefined ? parseFloat(amount) : repayment.amount,
        repayment_date ?? repayment.repayment_date,
        payment_method ?? repayment.payment_method,
        remark ?? repayment.remark,
        repaymentId
      ]);
      
      if (oldOrderId) {
        await updateOrderBalance(oldOrderId, req.user.id);
      }
      if (sales_order_id && sales_order_id !== oldOrderId) {
        await updateOrderBalance(sales_order_id, req.user.id);
      }
      
      await commitTransaction();
    } catch (err) {
      await rollbackTransaction();
      console.error(err);
      return res.status(500).json({ message: '更新还款记录失败', error: err.message });
    }
    
    const updatedRepayment = await get(`
      SELECT r.*, f.name as farmer_name, so.order_no as order_no,
             u.name as creator_name
      FROM repayments r
      LEFT JOIN farmers f ON r.farmer_id = f.id
      LEFT JOIN sales_orders so ON r.sales_order_id = so.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = ?
    `, [repaymentId]);
    
    res.json({
      message: '还款记录更新成功',
      data: updatedRepayment
    });
  }
);

router.delete('/:id',
  authenticate,
  requireBoss,
  auditLog('delete', 'repayments'),
  async (req, res) => {
    const repaymentId = parseInt(req.params.id);
    const repayment = await get('SELECT * FROM repayments WHERE id = ?', [repaymentId]);
    
    if (!repayment) {
      return res.status(404).json({ message: '还款记录不存在' });
    }

    if (repayment.sales_order_id && await checkOrderSettled(repayment.sales_order_id)) {
      return res.status(400).json({ message: '关联的销售单已结清，无法删除还款记录' });
    }

    try {
      await beginTransaction();
      
      await run('DELETE FROM repayments WHERE id = ?', [repaymentId]);
      
      if (repayment.sales_order_id) {
        await updateOrderBalance(repayment.sales_order_id, req.user.id);
      }
      
      await commitTransaction();
    } catch (err) {
      await rollbackTransaction();
      console.error(err);
      return res.status(500).json({ message: '删除还款记录失败', error: err.message });
    }
    
    res.json({ message: '还款记录删除成功' });
  }
);

module.exports = router;
