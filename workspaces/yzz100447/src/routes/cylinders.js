const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { success, error: resError } = require('../utils/response');

const router = express.Router();

const cylinderSchema = Joi.object({
  cylinder_no: Joi.string().required(),
  specification: Joi.string().required(),
  status: Joi.string().valid('empty', 'filled', 'in_use', 'repairing', 'scrapped').default('empty')
});

const updateSchema = Joi.object({
  specification: Joi.string(),
  status: Joi.string().valid('empty', 'filled', 'in_use', 'repairing', 'scrapped')
});

router.get('/', (req, res) => {
  const { page = 1, pageSize = 20, keyword = '', status } = req.query;
  const offset = (page - 1) * pageSize;

  let whereSql = '';
  let params = [];
  const conditions = [];
  if (keyword) {
    conditions.push('cylinder_no LIKE ? OR specification LIKE ?');
    const kw = `%${keyword}%`;
    params.push(kw, kw);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (conditions.length > 0) {
    whereSql = 'WHERE ' + conditions.join(' AND ');
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM cylinders ${whereSql}`).get(...params).count;
  const list = db.prepare(`
    SELECT c.*, cu.name as customer_name, cu.phone as customer_phone, cu.address as customer_address
    FROM cylinders c
    LEFT JOIN customers cu ON c.current_customer_id = cu.id
    ${whereSql}
    ORDER BY c.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  success(res, { list, total, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/:id', (req, res) => {
  const cylinder = db.prepare(`
    SELECT c.*, cu.name as customer_name, cu.phone as customer_phone, cu.address as customer_address
    FROM cylinders c
    LEFT JOIN customers cu ON c.current_customer_id = cu.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!cylinder) {
    return resError(res, '钢瓶不存在', 404, 404);
  }
  success(res, cylinder);
});

router.get('/by-no/:cylinderNo', (req, res) => {
  const cylinder = db.prepare(`
    SELECT c.*, cu.name as customer_name, cu.phone as customer_phone, cu.address as customer_address
    FROM cylinders c
    LEFT JOIN customers cu ON c.current_customer_id = cu.id
    WHERE c.cylinder_no = ?
  `).get(req.params.cylinderNo);
  if (!cylinder) {
    return resError(res, '钢瓶不存在', 404, 404);
  }
  success(res, cylinder);
});

router.post('/', (req, res) => {
  const { error, value } = cylinderSchema.validate(req.body || {});
  if (error) {
    return resError(res, error.details[0].message);
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO cylinders (cylinder_no, specification, status)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(value.cylinder_no, value.specification, value.status);
    const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(result.lastInsertRowid);
    success(res, cylinder, '创建成功');
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return resError(res, '钢瓶编号已存在');
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const { error, value } = updateSchema.validate(req.body || {});
  if (error) {
    return resError(res, error.details[0].message);
  }

  const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(req.params.id);
  if (!cylinder) {
    return resError(res, '钢瓶不存在', 404, 404);
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

  db.prepare(`UPDATE cylinders SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(req.params.id);
  success(res, updated, '更新成功');
});

router.delete('/:id', (req, res) => {
  const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(req.params.id);
  if (!cylinder) {
    return resError(res, '钢瓶不存在', 404, 404);
  }

  const hasOrders = db.prepare('SELECT COUNT(*) as count FROM delivery_orders WHERE cylinder_id = ?').get(req.params.id).count;
  if (hasOrders > 0) {
    return resError(res, '该钢瓶有配送记录，无法删除');
  }

  db.prepare('DELETE FROM cylinders WHERE id = ?').run(req.params.id);
  success(res, null, '删除成功');
});

module.exports = router;
