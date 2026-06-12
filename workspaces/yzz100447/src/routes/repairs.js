const express = require('express');
const Joi = require('joi');
const db = require('../db/database');
const { success, error: resError } = require('../utils/response');

const router = express.Router();

const createSchema = Joi.object({
  cylinder_id: Joi.number().integer().required(),
  issue: Joi.string().required(),
  repair_person: Joi.string(),
  cost: Joi.number().min(0).default(0),
  remark: Joi.string().allow('')
});

const completeSchema = Joi.object({
  end_date: Joi.string(),
  remark: Joi.string().allow('')
});

router.get('/', (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    cylinder_id,
    status,
    start_date,
    end_date
  } = req.query;
  const offset = (page - 1) * pageSize;

  let whereSql = '';
  let params = [];
  const conditions = [];

  if (cylinder_id) {
    conditions.push('r.cylinder_id = ?');
    params.push(cylinder_id);
  }
  if (status) {
    conditions.push('r.status = ?');
    params.push(status);
  }
  if (start_date) {
    conditions.push('date(r.start_date) >= date(?)');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('date(r.start_date) <= date(?)');
    params.push(end_date);
  }
  if (conditions.length > 0) {
    whereSql = 'WHERE ' + conditions.join(' AND ');
  }

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM repairs r
    ${whereSql}
  `).get(...params).count;

  const list = db.prepare(`
    SELECT r.*,
           cy.cylinder_no, cy.specification, cy.status as cylinder_status
    FROM repairs r
    LEFT JOIN cylinders cy ON r.cylinder_id = cy.id
    ${whereSql}
    ORDER BY r.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);

  success(res, { list, total, page: Number(page), pageSize: Number(pageSize) });
});

router.get('/:id', (req, res) => {
  const repair = db.prepare(`
    SELECT r.*,
           cy.cylinder_no, cy.specification, cy.status as cylinder_status
    FROM repairs r
    LEFT JOIN cylinders cy ON r.cylinder_id = cy.id
    WHERE r.id = ?
  `).get(req.params.id);
  if (!repair) {
    return resError(res, '维修记录不存在', 404, 404);
  }
  success(res, repair);
});

router.post('/', (req, res) => {
  const { error, value } = createSchema.validate(req.body || {});
  if (error) {
    return resError(res, error.details[0].message);
  }

  const cylinder = db.prepare('SELECT * FROM cylinders WHERE id = ?').get(value.cylinder_id);
  if (!cylinder) {
    return resError(res, '钢瓶不存在');
  }

  const tx = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO repairs
      (cylinder_id, issue, repair_person, cost, remark, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `);
    const result = stmt.run(
      value.cylinder_id,
      value.issue,
      value.repair_person || null,
      value.cost,
      value.remark || null
    );
    const repairId = result.lastInsertRowid;

    db.prepare(`
      UPDATE cylinders SET status = 'repairing', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(value.cylinder_id);

    return repairId;
  });

  const repairId = tx();
  const repair = db.prepare(`
    SELECT r.*,
           cy.cylinder_no, cy.specification, cy.status as cylinder_status
    FROM repairs r
    LEFT JOIN cylinders cy ON r.cylinder_id = cy.id
    WHERE r.id = ?
  `).get(repairId);

  success(res, repair, '维修记录创建成功');
});

router.post('/:id/complete', (req, res) => {
  const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(req.params.id);
  if (!repair) {
    return resError(res, '维修记录不存在', 404, 404);
  }
  if (repair.status === 'completed') {
    return resError(res, '维修已完成');
  }

  const { error, value } = completeSchema.validate(req.body || {});
  if (error) {
    return resError(res, error.details[0].message);
  }

  const endDate = value.end_date || new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE repairs SET status = 'completed', end_date = ?, remark = COALESCE(?, remark)
      WHERE id = ?
    `).run(endDate, value.remark || null, req.params.id);

    db.prepare(`
      UPDATE cylinders SET status = 'empty', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(repair.cylinder_id);
  });

  tx();

  const updated = db.prepare(`
    SELECT r.*,
           cy.cylinder_no, cy.specification, cy.status as cylinder_status
    FROM repairs r
    LEFT JOIN cylinders cy ON r.cylinder_id = cy.id
    WHERE r.id = ?
  `).get(req.params.id);

  success(res, updated, '维修完成');
});

module.exports = router;
