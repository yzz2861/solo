const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { success, error: resError } = require('../utils/response');

const router = express.Router();

const inspectionSchema = Joi.object({
  customer_id: Joi.number().integer().required(),
  cylinder_id: Joi.number().integer(),
  inspector: Joi.string(),
  result: Joi.string().valid('pass', 'fail').required(),
  issues: Joi.string().allow(''),
  inspection_date: Joi.string(),
  next_inspection_date: Joi.string(),
  remark: Joi.string().allow('')
});

router.get('/', (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    customer_id,
    result,
    start_date,
    end_date
  } = req.query;
  const offset = (page - 1) * pageSize;

  let whereSql = '';
  let params = [];
  const conditions = [];

  if (customer_id) {
    conditions.push('i.customer_id = ?');
    params.push(customer_id);
  }
  if (result) {
    conditions.push('i.result = ?');
    params.push(result);
  }
  if (start_date) {
    conditions.push('date(i.inspection_date) >= date(?)');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('date(i.inspection_date) <= date(?)');
    params.push(end_date);
  }
  if (conditions.length > 0) {
    whereSql = 'WHERE ' + conditions.join(' AND ');
  }

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM inspections i
    ${whereSql}
  `).get(...params).count;

  const list = db.prepare(`
    SELECT i.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification
    FROM inspections i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN cylinders cy ON i.cylinder_id = cy.id
    ${whereSql}
    ORDER BY i.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  success(res, { list, total, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/:id', (req, res) => {
  const inspection = db.prepare(`
    SELECT i.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification
    FROM inspections i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN cylinders cy ON i.cylinder_id = cy.id
    WHERE i.id = ?
  `).get(req.params.id);
  if (!inspection) {
    return resError(res, '安检记录不存在', 404, 404);
  }
  success(res, inspection);
});

router.post('/', (req, res) => {
  const { error, value } = inspectionSchema.validate(req.body || {});
  if (error) {
    return resError(res, error.details[0].message);
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(value.customer_id);
  if (!customer) {
    return resError(res, '客户不存在');
  }

  if (value.cylinder_id) {
    const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(value.cylinder_id);
    if (!cylinder) {
      return resError(res, '钢瓶不存在');
    }
  }

  const tx = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO inspections
      (customer_id, cylinder_id, inspector, result, issues, inspection_date, next_inspection_date, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      value.customer_id,
      value.cylinder_id || null,
      value.inspector || null,
      value.result,
      value.issues || null,
      value.inspection_date || null,
      value.next_inspection_date || null,
      value.remark || null
    );
    const inspectionId = result.lastInsertRowid;

    db.prepare(`
      UPDATE customers SET inspection_status = ?, inspection_date = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(value.result, value.inspection_date || new Date().toISOString(), value.customer_id);

    if (value.cylinder_id) {
      db.prepare(`
        UPDATE cylinders SET last_inspection_date = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(value.inspection_date || new Date().toISOString(), value.cylinder_id);
    }

    return inspectionId;
  });

  const inspectionId = tx();
  const inspection = db.prepare(`
    SELECT i.*,
           c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
           cy.cylinder_no, cy.specification
    FROM inspections i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN cylinders cy ON i.cylinder_id = cy.id
    WHERE i.id = ?
  `).get(inspectionId);

  success(res, inspection, '安检记录创建成功');
});

module.exports = router;
