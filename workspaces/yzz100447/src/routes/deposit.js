const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { success, error: resError } = require('../utils/response');
const { getCustomerDepositBalance, addDepositRecord } = require('../utils/deposit');

const router = express.Router();

const adjustSchema = Joi.object({
  customer_id: Joi.number().integer().required(),
  type: Joi.string().valid('adjust_increase', 'adjust_decrease').required(),
  amount: Joi.number().positive().required(),
  remark: Joi.string().required()
});

router.get('/', (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    customer_id,
    type,
    start_date,
    end_date
  } = req.query;
  const offset = (page - 1) * pageSize;

  let whereSql = '';
  let params = [];
  const conditions = [];

  if (customer_id) {
    conditions.push('dl.customer_id = ?');
    params.push(customer_id);
  }
  if (type) {
    conditions.push('dl.type = ?');
    params.push(type);
  }
  if (start_date) {
    conditions.push('date(dl.created_at) >= date(?)');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('date(dl.created_at) <= date(?)');
    params.push(end_date);
  }
  if (conditions.length > 0) {
    whereSql = 'WHERE ' + conditions.join(' AND ');
  }

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM deposit_ledger dl
    ${whereSql}
  `).get(...params).count;

  const list = db.prepare(`
    SELECT dl.*,
           c.name as customer_name, c.phone as customer_phone,
           do.order_no as delivery_order_no,
           ro.id as return_order_id
    FROM deposit_ledger dl
    LEFT JOIN customers c ON dl.customer_id = c.id
    LEFT JOIN delivery_orders do ON dl.delivery_order_id = do.id
    LEFT JOIN return_orders ro ON dl.return_order_id = ro.id
    ${whereSql}
    ORDER BY dl.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  success(res, { list, total, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/customer/:customerId', (req, res) => {
  const customerId = req.params.customerId;
  const { page = 1, pageSize = 50 } = req.query;
  const offset = (page - 1) * pageSize;

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  if (!customer) {
    return resError(res, '客户不存在', 404, 404);
  }

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM deposit_ledger WHERE customer_id = ?
  `).get(customerId).count;

  const list = db.prepare(`
    SELECT dl.*,
           do.order_no as delivery_order_no,
           ro.id as return_order_id
    FROM deposit_ledger dl
    LEFT JOIN delivery_orders do ON dl.delivery_order_id = do.id
    LEFT JOIN return_orders ro ON dl.return_order_id = ro.id
    WHERE dl.customer_id = ?
    ORDER BY dl.id DESC LIMIT ? OFFSET ?
  `).all(customerId, Number(pageSize), offset);

  const currentBalance = getCustomerDepositBalance(customerId);

  success(res, {
    customer,
    current_balance: currentBalance,
    list,
    total,
    page: Number(page),
    pageSize: Number(pageSize)
  });
});

router.get('/explanation/:customerId', (req, res) => {
  const customerId = req.params.customerId;

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  if (!customer) {
    return resError(res, '客户不存在', 404, 404);
  }

  const currentBalance = getCustomerDepositBalance(customerId);

  const allRecords = db.prepare(`
    SELECT dl.*,
           do.order_no as delivery_order_no,
           do.delivery_time,
           cy.cylinder_no,
           cy.specification,
           ro.id as return_order_id,
           ro.return_time
    FROM deposit_ledger dl
    LEFT JOIN delivery_orders do ON dl.delivery_order_id = do.id
    LEFT JOIN cylinders cy ON do.cylinder_id = cy.id
    LEFT JOIN return_orders ro ON dl.return_order_id = ro.id
    WHERE dl.customer_id = ?
    ORDER BY dl.id ASC
  `).all(customerId);

  const collectRecords = allRecords.filter(r => r.type === 'collect');
  const refundRecords = allRecords.filter(r => r.type === 'refund');
  const adjustRecords = allRecords.filter(r => r.type.startsWith('adjust_'));

  const totalCollect = collectRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalRefund = refundRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalAdjustIncrease = adjustRecords.filter(r => r.type === 'adjust_increase').reduce((sum, r) => sum + r.amount, 0);
  const totalAdjustDecrease = adjustRecords.filter(r => r.type === 'adjust_decrease').reduce((sum, r) => sum + r.amount, 0);

  const activeCylinders = db.prepare(`
    SELECT cy.*,
           do.order_no, do.delivery_time, do.deposit_amount,
           julianday('now') - julianday(do.delivery_time) as days_in_use
    FROM cylinders cy
    JOIN delivery_orders do ON do.cylinder_id = cy.id AND do.status = 'delivered'
    LEFT JOIN return_orders ro ON ro.delivery_order_id = do.id
    WHERE cy.current_customer_id = ?
      AND cy.status = 'in_use'
      AND ro.id IS NULL
    ORDER BY do.delivery_time ASC
  `).all(customerId);

  const expectedDepositByCylinders = activeCylinders.reduce((sum, c) => sum + c.deposit_amount, 0);
  const balanceDifference = currentBalance - expectedDepositByCylinders;

  const explanation = {
    summary: {
      current_balance: currentBalance,
      total_collect: totalCollect,
      total_refund: totalRefund,
      total_adjust_increase: totalAdjustIncrease,
      total_adjust_decrease: totalAdjustDecrease,
      net_balance: totalCollect + totalAdjustIncrease - totalRefund - totalAdjustDecrease
    },
    active_cylinders: activeCylinders,
    active_cylinder_count: activeCylinders.length,
    expected_deposit_by_cylinders: expectedDepositByCylinders,
    balance_difference: balanceDifference,
    balance_status: Math.abs(balanceDifference) < 0.01 ? 'balanced' : (balanceDifference > 0 ? 'surplus' : 'deficit'),
    transactions: allRecords
  };

  let explanationText = '';
  if (Math.abs(balanceDifference) < 0.01) {
    explanationText = `押金余额正常。客户当前有${activeCylinders.length}只在用钢瓶，对应押金${expectedDepositByCylinders}元，与账户余额${currentBalance}元一致。`;
  } else if (balanceDifference > 0) {
    explanationText = `押金有结余。客户当前有${activeCylinders.length}只在用钢瓶，对应押金${expectedDepositByCylinders}元，账户余额${currentBalance}元，多出${balanceDifference.toFixed(2)}元。可能原因：有历史押金未用完、或有押金调整增加。`;
  } else {
    explanationText = `押金有差额。客户当前有${activeCylinders.length}只在用钢瓶，对应押金${expectedDepositByCylinders}元，账户余额${currentBalance}元，少${Math.abs(balanceDifference).toFixed(2)}元。可能原因：有押金调整扣除、或部分退款未对应回收。`;
  }

  explanation.explanation_text = explanationText;

  success(res, explanation);
});

router.post('/adjust', (req, res) => {
  const { error, value } = adjustSchema.validate(req.body);
  if (error) {
    return resError(res, error.details[0].message);
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(value.customer_id);
  if (!customer) {
    return resError(res, '客户不存在');
  }

  if (value.type === 'adjust_decrease') {
    const currentBalance = getCustomerDepositBalance(value.customer_id);
    if (value.amount > currentBalance) {
      return resError(res, `押金余额不足，当前余额${currentBalance}元`);
    }
  }

  const result = addDepositRecord(value.customer_id, value.type, value.amount, {
    remark: value.remark
  });

  const record = db.prepare(`
    SELECT dl.*,
           c.name as customer_name, c.phone as customer_phone
    FROM deposit_ledger dl
    LEFT JOIN customers c ON dl.customer_id = c.id
    WHERE dl.id = ?
  `).get(result.id);

  success(res, record, '押金调整成功');
});

module.exports = router;
