const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { success, error: resError } = require('../utils/response');
const { addDepositRecord, getCustomerDepositBalance } = require('../utils/deposit');

const router = express.Router();

const createSchema = Joi.object({
  delivery_order_id: Joi.number().integer().required(),
  deposit_refund: Joi.number().min(0).required(),
  cylinder_condition: Joi.string().valid('good', 'damaged', 'empty').default('good'),
  remark: Joi.string().allow('')
});

const confirmSchema = Joi.object({
  return_time: Joi.string()
});

router.get('/', (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    customer_id,
    cylinder_id,
    status,
    start_date,
    end_date
  } = req.query;
  const offset = (page - 1) * pageSize;

  let whereSql = '';
  let params = [];
  const conditions = [];

  if (customer_id) {
    conditions.push('ro.customer_id = ?');
    params.push(customer_id);
  }
  if (cylinder_id) {
    conditions.push('ro.cylinder_id = ?');
    params.push(cylinder_id);
  }
  if (status) {
    conditions.push('ro.status = ?');
    params.push(status);
  }
  if (start_date) {
    conditions.push('date(ro.created_at) >= date(?)');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('date(ro.created_at) <= date(?)');
    params.push(end_date);
  }
  if (conditions.length > 0) {
    whereSql = 'WHERE ' + conditions.join(' AND ');
  }

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM return_orders ro
    ${whereSql}
  `).get(...params).count;

  const list = db.prepare(`
    SELECT ro.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification,
           do.order_no, do.deposit_amount
    FROM return_orders ro
    LEFT JOIN customers c ON ro.customer_id = c.id
    LEFT JOIN cylinders cy ON ro.cylinder_id = cy.id
    LEFT JOIN delivery_orders do ON ro.delivery_order_id = do.id
    ${whereSql}
    ORDER BY ro.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  success(res, { list, total, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/:id', (req, res) => {
  const returnOrder = db.prepare(`
    SELECT ro.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification,
           do.order_no, do.deposit_amount, do.delivery_time
    FROM return_orders ro
    LEFT JOIN customers c ON ro.customer_id = c.id
    LEFT JOIN cylinders cy ON ro.cylinder_id = cy.id
    LEFT JOIN delivery_orders do ON ro.delivery_order_id = do.id
    WHERE ro.id = ?
  `).get(req.params.id);
  if (!returnOrder) {
    return resError(res, '回收单不存在', 404, 404);
  }
  success(res, returnOrder);
});

router.post('/', (req, res) => {
  const { error, value } = createSchema.validate(req.body || {});
  if (error) {
    return resError(res, error.details[0].message);
  }

  const deliveryOrder = db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(value.delivery_order_id);
  if (!deliveryOrder) {
    return resError(res, '配送单不存在');
  }
  if (deliveryOrder.status !== 'delivered') {
    return resError(res, '配送单尚未配送完成，无法回收');
  }

  const existingReturn = db.prepare('SELECT * FROM return_orders WHERE delivery_order_id = ?').get(value.delivery_order_id);
  if (existingReturn) {
    return resError(res, '该配送单已回收，不可重复回收退押金', 409);
  }

  const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(deliveryOrder.cylinder_id);
  if (!cylinder) {
    return resError(res, '钢瓶不存在');
  }

  const currentBalance = getCustomerDepositBalance(deliveryOrder.customer_id);
  if (value.deposit_refund > currentBalance) {
    return resError(res, `押金余额不足，当前余额${currentBalance}元`);
  }

  const tx = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO return_orders
      (delivery_order_id, cylinder_id, customer_id, deposit_refund, cylinder_condition, remark, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);
    const result = stmt.run(
      value.delivery_order_id,
      deliveryOrder.cylinder_id,
      deliveryOrder.customer_id,
      value.deposit_refund,
      value.cylinder_condition,
      value.remark || null
    );
    const returnId = result.lastInsertRowid;

    return returnId;
  });

  try {
    const returnId = tx();
    const returnOrder = db.prepare(`
      SELECT ro.*,
             c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
             cy.cylinder_no, cy.specification,
             do.order_no, do.deposit_amount
      FROM return_orders ro
      LEFT JOIN customers c ON ro.customer_id = c.id
      LEFT JOIN cylinders cy ON ro.cylinder_id = cy.id
      LEFT JOIN delivery_orders do ON ro.delivery_order_id = do.id
      WHERE ro.id = ?
    `).get(returnId);
    success(res, returnOrder, '创建回收单成功');
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return resError(res, '该配送单已回收，不可重复回收退押金', 409);
    }
    throw err;
  }
});

router.post('/:id/confirm', (req, res) => {
  const returnOrder = db.prepare('SELECT * FROM return_orders WHERE id = ?').get(req.params.id);
  if (!returnOrder) {
    return resError(res, '回收单不存在', 404, 404);
  }
  if (returnOrder.status === 'completed') {
    return resError(res, '回收单已确认完成，无需重复确认');
  }
  if (returnOrder.status === 'cancelled') {
    return resError(res, '回收单已取消');
  }

  const { error, value } = confirmSchema.validate(req.body || {});
  if (error) {
    return resError(res, error.details[0].message);
  }

  const returnTime = (value && value.return_time) || new Date().toISOString();

  const currentBalance = getCustomerDepositBalance(returnOrder.customer_id);
  if (returnOrder.deposit_refund > currentBalance) {
    return resError(res, `押金余额不足，当前余额${currentBalance}元`);
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE return_orders SET status = 'completed', return_time = ? WHERE id = ?
    `).run(returnTime, req.params.id);

    addDepositRecord(returnOrder.customer_id, 'refund', returnOrder.deposit_refund, {
      returnOrderId: returnOrder.id,
      deliveryOrderId: returnOrder.delivery_order_id,
      remark: `回收单${returnOrder.id}退还押金`
    });

    const cylinderStatus = returnOrder.cylinder_condition === 'damaged' ? 'repairing' : 'empty';
    db.prepare(`
      UPDATE cylinders SET status = ?, current_customer_id = NULL, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(cylinderStatus, returnOrder.cylinder_id);
  });

  tx();

  const updated = db.prepare(`
    SELECT ro.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification,
           do.order_no, do.deposit_amount
    FROM return_orders ro
    LEFT JOIN customers c ON ro.customer_id = c.id
    LEFT JOIN cylinders cy ON ro.cylinder_id = cy.id
    LEFT JOIN delivery_orders do ON ro.delivery_order_id = do.id
    WHERE ro.id = ?
  `).get(req.params.id);

  success(res, updated, '回收确认成功，押金已退还');
});

router.post('/:id/cancel', (req, res) => {
  const returnOrder = db.prepare('SELECT * FROM return_orders WHERE id = ?').get(req.params.id);
  if (!returnOrder) {
    return resError(res, '回收单不存在', 404, 404);
  }
  if (returnOrder.status === 'completed') {
    return resError(res, '已完成的回收单无法取消');
  }
  if (returnOrder.status === 'cancelled') {
    return resError(res, '回收单已取消');
  }

  db.prepare(`UPDATE return_orders SET status = 'cancelled' WHERE id = ?`).run(req.params.id);
  success(res, null, '取消成功');
});

module.exports = router;
