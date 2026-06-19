const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { generateId, successResponse, errorResponse, validateRequiredFields } = require('../utils/response');
const { isInsuranceSufficient, isInsuranceExpiring, isInsuranceExpired, daysUntilExpiry } = require('../utils/insurance');
const config = require('../config');

router.get('/', (req, res) => {
  const db = getDB();
  const { category, status, keyword, page = 1, pageSize = 20 } = req.query;

  let where = [];
  let params = {};

  if (category) {
    where.push('category = @category');
    params.category = category;
  }
  if (status) {
    where.push('status = @status');
    params.status = status;
  }
  if (keyword) {
    where.push('(name LIKE @keyword OR brand LIKE @keyword OR description LIKE @keyword)');
    params.keyword = `%${keyword}%`;
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (page - 1) * pageSize;

  const total = db.prepare(`SELECT COUNT(*) as count FROM samples ${whereSql}`).get(params).count;
  const samples = db.prepare(
    `SELECT * FROM samples ${whereSql} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`
  ).all({ ...params, limit: Number(pageSize), offset });

  const result = samples.map(s => ({
    ...s,
    insurance_sufficient: isInsuranceSufficient(s.value, s.insurance_amount, config.insurance.minInsuranceRatio),
    insurance_expiring: isInsuranceExpiring(s.insurance_expiry_date, config.insurance.expiryWarningDays),
    insurance_expired: isInsuranceExpired(s.insurance_expiry_date),
    days_until_expiry: daysUntilExpiry(s.insurance_expiry_date)
  }));

  successResponse(res, {
    list: result,
    total,
    page: Number(page),
    pageSize: Number(pageSize)
  });
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(req.params.id);

  if (!sample) {
    return errorResponse(res, '样品不存在', 404, 404);
  }

  const borrowRecords = db.prepare(`
    SELECT br.*, p.name as project_name
    FROM borrow_records br
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.sample_id = ?
    ORDER BY br.created_at DESC
    LIMIT 10
  `).all(req.params.id);

  successResponse(res, {
    ...sample,
    insurance_sufficient: isInsuranceSufficient(sample.value, sample.insurance_amount, config.insurance.minInsuranceRatio),
    insurance_expiring: isInsuranceExpiring(sample.insurance_expiry_date, config.insurance.expiryWarningDays),
    insurance_expired: isInsuranceExpired(sample.insurance_expiry_date),
    days_until_expiry: daysUntilExpiry(sample.insurance_expiry_date),
    recent_borrows: borrowRecords
  });
});

router.post('/', (req, res) => {
  const missing = validateRequiredFields(req.body, ['name', 'category', 'value', 'insurance_amount']);
  if (missing) {
    return errorResponse(res, `缺少必填字段: ${missing.join(', ')}`);
  }

  const { name, category, brand, description, value, insurance_amount, insurance_expiry_date } = req.body;

  if (!['jewelry', 'watch', 'bag'].includes(category)) {
    return errorResponse(res, '品类只能是 jewelry(珠宝)、watch(腕表)、bag(限量包)');
  }

  if (Number(value) <= 0) {
    return errorResponse(res, '样品价值必须大于0');
  }

  if (Number(insurance_amount) < 0) {
    return errorResponse(res, '保险额度不能为负数');
  }

  const db = getDB();
  const id = generateId('S');

  db.prepare(`
    INSERT INTO samples (id, name, category, brand, description, value, insurance_amount, insurance_expiry_date)
    VALUES (@id, @name, @category, @brand, @description, @value, @insurance_amount, @insurance_expiry_date)
  `).run({
    id,
    name,
    category,
    brand: brand || null,
    description: description || null,
    value: Number(value),
    insurance_amount: Number(insurance_amount),
    insurance_expiry_date: insurance_expiry_date || null
  });

  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(id);
  successResponse(res, sample, '创建成功');
});

router.put('/:id', (req, res) => {
  const db = getDB();
  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(req.params.id);

  if (!sample) {
    return errorResponse(res, '样品不存在', 404, 404);
  }

  const { name, category, brand, description, value, insurance_amount, insurance_expiry_date, status } = req.body;

  if (category && !['jewelry', 'watch', 'bag'].includes(category)) {
    return errorResponse(res, '品类只能是 jewelry(珠宝)、watch(腕表)、bag(限量包)');
  }

  if (status && !['in_stock', 'out_of_stock', 'maintenance', 'lost'].includes(status)) {
    return errorResponse(res, '状态值无效');
  }

  db.prepare(`
    UPDATE samples SET
      name = COALESCE(@name, name),
      category = COALESCE(@category, category),
      brand = COALESCE(@brand, brand),
      description = COALESCE(@description, description),
      value = COALESCE(@value, value),
      insurance_amount = COALESCE(@insurance_amount, insurance_amount),
      insurance_expiry_date = COALESCE(@insurance_expiry_date, insurance_expiry_date),
      status = COALESCE(@status, status),
      updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id: req.params.id,
    name: name !== undefined ? name : null,
    category: category !== undefined ? category : null,
    brand: brand !== undefined ? brand : null,
    description: description !== undefined ? description : null,
    value: value !== undefined ? Number(value) : null,
    insurance_amount: insurance_amount !== undefined ? Number(insurance_amount) : null,
    insurance_expiry_date: insurance_expiry_date !== undefined ? insurance_expiry_date : null,
    status: status !== undefined ? status : null
  });

  const updated = db.prepare('SELECT * FROM samples WHERE id = ?').get(req.params.id);
  successResponse(res, updated, '更新成功');
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(req.params.id);

  if (!sample) {
    return errorResponse(res, '样品不存在', 404, 404);
  }

  const activeBorrows = db.prepare(`
    SELECT COUNT(*) as count FROM borrow_records
    WHERE sample_id = ? AND status IN ('pending', 'out')
  `).get(req.params.id).count;

  if (activeBorrows > 0) {
    return errorResponse(res, '该样品有未完成的借用记录，无法删除');
  }

  db.prepare('DELETE FROM samples WHERE id = ?').run(req.params.id);
  successResponse(res, null, '删除成功');
});

router.get('/insurance/expiring-soon', (req, res) => {
  const db = getDB();
  const { days = 30 } = req.query;

  const samples = db.prepare(`
    SELECT * FROM samples
    WHERE insurance_expiry_date IS NOT NULL
      AND date(insurance_expiry_date) >= date('now')
      AND date(insurance_expiry_date) <= date('now', '+' || ? || ' days')
    ORDER BY insurance_expiry_date ASC
  `).all(days);

  const result = samples.map(s => ({
    ...s,
    insurance_sufficient: isInsuranceSufficient(s.value, s.insurance_amount),
    days_until_expiry: daysUntilExpiry(s.insurance_expiry_date)
  }));

  successResponse(res, result);
});

module.exports = router;
