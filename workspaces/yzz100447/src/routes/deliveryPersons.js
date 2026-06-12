const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { success, error: resError } = require('../utils/response');

const router = express.Router();

const dpSchema = Joi.object({
  name: Joi.string().required(),
  employee_no: Joi.string().required(),
  phone: Joi.string().pattern(/^1\d{10}$/),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const updateSchema = Joi.object({
  name: Joi.string(),
  phone: Joi.string().pattern(/^1\d{10}$/),
  status: Joi.string().valid('active', 'inactive')
});

router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, keyword = '', status } = req.query;
  const offset = (page - 1) * pageSize;

  let whereSql = '';
  let params = [];
  const conditions = [];
  if (keyword) {
    conditions.push('name LIKE ? OR employee_no LIKE ? OR phone LIKE ?');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (conditions.length > 0) {
    whereSql = 'WHERE ' + conditions.join(' AND ');
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM delivery_persons ${whereSql}`).get(...params).count;
  const list = db.prepare(`
    SELECT * FROM delivery_persons ${whereSql}
    ORDER BY id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  success(res, { list, total, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/:id', (req, res) => {
  const dp = db.prepare('SELECT * FROM delivery_persons WHERE id = ?').get(req.params.id);
  if (!dp) {
    return resError(res, '配送员不存在', 404, 404);
  }
  success(res, dp);
});

router.post('/', (req, res) => {
  const { error, value } = dpSchema.validate(req.body || {});
  if (error) {
    return resError(res, error.details[0].message);
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO delivery_persons (name, employee_no, phone, status)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(value.name, value.employee_no, value.phone || null, value.status);
    const dp = db.prepare('SELECT * FROM delivery_persons WHERE id = ?').get(result.lastInsertRowid);
    success(res, dp, '创建成功');
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return resError(res, '工号已存在');
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const { error, value } = updateSchema.validate(req.body || {});
  if (error) {
    return resError(res, error.details[0].message);
  }

  const dp = db.prepare('SELECT * FROM delivery_persons WHERE id = ?').get(req.params.id);
  if (!dp) {
    return resError(res, '配送员不存在', 404, 404);
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
  params.push(req.params.id);

  try {
    db.prepare(`UPDATE delivery_persons SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    const updated = db.prepare('SELECT * FROM delivery_persons WHERE id = ?').get(req.params.id);
    success(res, updated, '更新成功');
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return resError(res, '工号已存在');
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const dp = db.prepare('SELECT * FROM delivery_persons WHERE id = ?').get(req.params.id);
  if (!dp) {
    return resError(res, '配送员不存在', 404, 404);
  }

  const hasOrders = db.prepare('SELECT COUNT(*) as count FROM delivery_orders WHERE delivery_person_id = ?').get(req.params.id).count;
  if (hasOrders > 0) {
    return resError(res, '该配送员有配送记录，无法删除');
  }

  db.prepare('DELETE FROM delivery_persons WHERE id = ?').run(req.params.id);
  success(res, null, '删除成功');
});

module.exports = router;
