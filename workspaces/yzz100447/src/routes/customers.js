const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { success, error: resError, AppError } = require('../utils/response');

const router = express.Router();

const customerSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().pattern(/^1\d{10}$/).required(),
  address: Joi.string().required(),
  inspection_status: Joi.string().valid('pass', 'fail', 'pending').default('pending')
});

const updateSchema = Joi.object({
  name: Joi.string(),
  phone: Joi.string().pattern(/^1\d{10}$/),
  address: Joi.string(),
  inspection_status: Joi.string().valid('pass', 'fail', 'pending')
});

router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, keyword = '' } = req.query;
  const offset = (page - 1) * pageSize;

  let whereSql = '';
  let params = [];
  if (keyword) {
    whereSql = 'WHERE name LIKE ? OR phone LIKE ? OR address LIKE ?';
    const kw = `%${keyword}%`;
    params = [kw, kw, kw];
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM customers ${whereSql}`).get(...params).count;
  const list = db.prepare(`
    SELECT * FROM customers ${whereSql}
    ORDER BY id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  success(res, { list, total, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) {
    return resError(res, '客户不存在', 404, 404);
  }
  success(res, customer);
});

router.post('/', (req, res) => {
  const { error, value } = customerSchema.validate(req.body);
  if (error) {
    return resError(res, error.details[0].message);
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO customers (name, phone, address, inspection_status)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(value.name, value.phone, value.address, value.inspection_status);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    success(res, customer, '创建成功');
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return resError(res, '该手机号已存在');
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    return resError(res, error.details[0].message);
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) {
    return resError(res, '客户不存在', 404, 404);
  }

  const fields = [];
  const params = [];
  Object.entries(value).forEach(([k, v]) => {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      params.push(v);
    }
  });
  if (fields.length === 0) {
    return resError(res, '没有需要更新的字段');
  }
  fields.push("updated_at = datetime('now', 'localtime')");
  params.push(req.params.id);

  try {
    db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    success(res, updated, '更新成功');
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return resError(res, '该手机号已存在');
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) {
    return resError(res, '客户不存在', 404, 404);
  }

  const hasOrders = db.prepare('SELECT COUNT(*) as count FROM delivery_orders WHERE customer_id = ?').get(req.params.id).count;
  if (hasOrders > 0) {
    return resError(res, '该客户有配送记录，无法删除');
  }

  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  success(res, null, '删除成功');
});

module.exports = router;
