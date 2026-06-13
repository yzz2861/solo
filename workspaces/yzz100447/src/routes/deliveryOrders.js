const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { success, error: resError } = require('../utils/response');
const { addDepositRecord } = require('../utils/deposit');

const router = express.Router();

const createSchema = Joi.object({
  order_no: Joi.string().required(),
  delivery_person_id: Joi.number().integer().required(),
  customer_id: Joi.number().integer().required(),
  cylinder_id: Joi.number().integer().required(),
  deposit_amount: Joi.number().positive().required(),
  route_date: Joi.string(),
  remark: Joi.string().allow('')
});

const confirmSchema = Joi.object({
  delivery_time: Joi.string()
});

router.get('/', (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    customer_id,
    delivery_person_id,
    status,
    route_date,
    start_date,
    end_date
  } = req.query;
  const offset = (page - 1) * pageSize;

  let whereSql = '';
  let params = [];
  const conditions = [];

  if (customer_id) {
    conditions.push('do.customer_id = ?');
    params.push(customer_id);
  }
  if (delivery_person_id) {
    conditions.push('do.delivery_person_id = ?');
    params.push(delivery_person_id);
  }
  if (status) {
    conditions.push('do.status = ?');
    params.push(status);
  }
  if (route_date) {
    conditions.push('do.route_date = ?');
    params.push(route_date);
  }
  if (start_date) {
    conditions.push('date(do.created_at) >= date(?)');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('date(do.created_at) <= date(?)');
    params.push(end_date);
  }
  if (conditions.length > 0) {
    whereSql = 'WHERE ' + conditions.join(' AND ');
  }

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM delivery_orders do
    ${whereSql}
  `).get(...params).count;

  const list = db.prepare(`
    SELECT do.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification,
           dp.name as delivery_person_name, dp.employee_no
    FROM delivery_orders do
    LEFT JOIN customers c ON do.customer_id = c.id
    LEFT JOIN cylinders cy ON do.cylinder_id = cy.id
    LEFT JOIN delivery_persons dp ON do.delivery_person_id = dp.id
    ${whereSql}
    ORDER BY do.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  success(res, { list, total, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/:id', (req, res) => {
  const order = db.prepare(`
    SELECT do.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification,
           dp.name as delivery_person_name, dp.employee_no
    FROM delivery_orders do
    LEFT JOIN customers c ON do.customer_id = c.id
    LEFT JOIN cylinders cy ON do.cylinder_id = cy.id
    LEFT JOIN delivery_persons dp ON do.delivery_person_id = dp.id
    WHERE do.id = ?
  `).get(req.params.id);
  if (!order) {
    return resError(res, '配送单不存在', 404, 404);
  }

  const returnOrder = db.prepare(`
    SELECT * FROM return_orders WHERE delivery_order_id = ?
  `).get(order.id);
  order.return_order = returnOrder || null;

  success(res, order);
});

router.get('/by-order-no/:orderNo', (req, res) => {
  const order = db.prepare(`
    SELECT do.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification,
           dp.name as delivery_person_name, dp.employee_no
    FROM delivery_orders do
    LEFT JOIN customers c ON do.customer_id = c.id
    LEFT JOIN cylinders cy ON do.cylinder_id = cy.id
    LEFT JOIN delivery_persons dp ON do.delivery_person_id = dp.id
    WHERE do.order_no = ?
  `).get(req.params.orderNo);
  if (!order) {
    return resError(res, '配送单不存在', 404, 404);
  }
  success(res, order);
});

router.post('/', (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) {
    return resError(res, error.details[0].message);
  }

  const existingOrder = db.prepare('SELECT * FROM delivery_orders WHERE order_no = ?').get(value.order_no);
  if (existingOrder) {
    return resError(res, '订单号已存在，请勿重复提交', 409);
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(value.customer_id);
  if (!customer) {
    return resError(res, '客户不存在');
  }
  if (customer.inspection_status === 'fail') {
    return resError(res, '客户安检不通过，无法下单，请先完成安检整改', 403);
  }

  const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(value.cylinder_id);
  if (!cylinder) {
    return resError(res, '钢瓶不存在');
  }
  if (cylinder.status !== 'filled') {
    return resError(res, `钢瓶当前状态为${cylinder.status}，无法配送，需要为已充气状态`);
  }

  const dp = db.prepare('SELECT * FROM delivery_persons WHERE id = ?').get(value.delivery_person_id);
  if (!dp) {
    return resError(res, '配送员不存在');
  }
  if (dp.status !== 'active') {
    return resError(res, '配送员未处于在职状态');
  }

  const today = value.route_date || new Date().toISOString().split('T')[0];

  const tx = db.transaction(() => {
    const orderStmt = db.prepare(`
      INSERT INTO delivery_orders
      (order_no, delivery_person_id, customer_id, cylinder_id, deposit_amount, route_date, remark, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    const orderResult = orderStmt.run(
      value.order_no,
      value.delivery_person_id,
      value.customer_id,
      value.cylinder_id,
      value.deposit_amount,
      today,
      value.remark || null
    );
    const orderId = orderResult.lastInsertRowid;

    addDepositRecord(value.customer_id, 'collect', value.deposit_amount, {
      deliveryOrderId: orderId,
      remark: `配送单${value.order_no}收取押金`
    });

    db.prepare(`
      UPDATE cylinders SET status = 'in_use', current_customer_id = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(value.customer_id, value.cylinder_id);

    return orderId;
  });

  try {
    const orderId = tx();
    const order = db.prepare(`
      SELECT do.*,
             c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
             cy.cylinder_no, cy.specification,
             dp.name as delivery_person_name, dp.employee_no
      FROM delivery_orders do
      LEFT JOIN customers c ON do.customer_id = c.id
      LEFT JOIN cylinders cy ON do.cylinder_id = cy.id
      LEFT JOIN delivery_persons dp ON do.delivery_person_id = dp.id
      WHERE do.id = ?
    `).get(orderId);
    success(res, order, '创建配送单成功');
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return resError(res, '订单号已存在，请勿重复提交', 409);
    }
    throw err;
  }
});

router.post('/:id/confirm', (req, res) => {
  const order = db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return resError(res, '配送单不存在', 404, 404);
  }
  if (order.status === 'delivered') {
    return resError(res, '配送单已确认，无需重复确认');
  }
  if (order.status === 'cancelled') {
    return resError(res, '配送单已取消');
  }

  const { error, value } = confirmSchema.validate(req.body || {});
  if (error) {
    return resError(res, error.details[0].message);
  }

  const deliveryTime = (value && value.delivery_time) || new Date().toISOString();

  db.prepare(`
    UPDATE delivery_orders SET status = 'delivered', delivery_time = ? WHERE id = ?
  `).run(deliveryTime, req.params.id);

  const updated = db.prepare(`
    SELECT do.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification,
           dp.name as delivery_person_name, dp.employee_no
    FROM delivery_orders do
    LEFT JOIN customers c ON do.customer_id = c.id
    LEFT JOIN cylinders cy ON do.cylinder_id = cy.id
    LEFT JOIN delivery_persons dp ON do.delivery_person_id = dp.id
    WHERE do.id = ?
  `).get(req.params.id);

  success(res, updated, '配送确认成功');
});

router.post('/:id/cancel', (req, res) => {
  const order = db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return resError(res, '配送单不存在', 404, 404);
  }
  if (order.status === 'delivered') {
    return resError(res, '已配送的订单无法取消，请走回收流程');
  }
  if (order.status === 'cancelled') {
    return resError(res, '订单已取消');
  }

  const hasReturn = db.prepare('SELECT COUNT(*) as count FROM return_orders WHERE delivery_order_id = ?').get(req.params.id).count;
  if (hasReturn > 0) {
    return resError(res, '该订单已有回收记录，无法取消');
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE delivery_orders SET status = 'cancelled' WHERE id = ?
    `).run(req.params.id);

    addDepositRecord(order.customer_id, 'refund', order.deposit_amount, {
      deliveryOrderId: order.id,
      remark: `配送单${order.order_no}取消，退还押金`
    });

    db.prepare(`
      UPDATE cylinders SET status = 'filled', current_customer_id = NULL, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(order.cylinder_id);
  });

  tx();
  success(res, null, '取消成功');
});

module.exports = router;
