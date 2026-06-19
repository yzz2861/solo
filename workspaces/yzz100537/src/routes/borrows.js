const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { generateId, successResponse, errorResponse, validateRequiredFields } = require('../utils/response');
const { isInsuranceSufficient, isInsuranceExpired, isOverdue } = require('../utils/insurance');
const upload = require('../middleware/upload');
const config = require('../config');

function checkSampleAvailability(db, sampleId, plannedOutDate, plannedReturnDate, excludeRecordId = null) {
  let sql = `
    SELECT COUNT(*) as count FROM borrow_records
    WHERE sample_id = ?
      AND status IN ('pending', 'out')
      AND NOT (
        date(planned_return_date) < date(?)
        OR date(planned_out_date) > date(?)
      )
  `;
  let params = [sampleId, plannedOutDate, plannedReturnDate];

  if (excludeRecordId) {
    sql += ' AND id != ?';
    params.push(excludeRecordId);
  }

  const result = db.prepare(sql).get(...params);
  return result.count === 0;
}

router.get('/', (req, res) => {
  const db = getDB();
  const { sample_id, project_id, status, borrower_name, page = 1, pageSize = 20 } = req.query;

  let where = [];
  let params = {};

  if (sample_id) {
    where.push('br.sample_id = @sample_id');
    params.sample_id = sample_id;
  }
  if (project_id) {
    where.push('br.project_id = @project_id');
    params.project_id = project_id;
  }
  if (status) {
    where.push('br.status = @status');
    params.status = status;
  }
  if (borrower_name) {
    where.push('br.borrower_name LIKE @borrower_name');
    params.borrower_name = `%${borrower_name}%`;
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (page - 1) * pageSize;

  const total = db.prepare(`SELECT COUNT(*) as count FROM borrow_records br ${whereSql}`).get(params).count;

  const records = db.prepare(`
    SELECT br.*, s.name as sample_name, s.category as sample_category, s.value as sample_value,
           p.name as project_name, p.client as project_client
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    LEFT JOIN projects p ON br.project_id = p.id
    ${whereSql}
    ORDER BY br.created_at DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit: Number(pageSize), offset });

  const result = records.map(r => ({
    ...r,
    is_overdue: r.status === 'out' && isOverdue(r.planned_return_date),
    insurance_sufficient: isInsuranceSufficient(r.sample_value, null)
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
  const record = db.prepare(`
    SELECT br.*, s.name as sample_name, s.category as sample_category, s.value as sample_value,
           s.insurance_amount as sample_insurance_amount, s.insurance_expiry_date as sample_insurance_expiry,
           p.name as project_name, p.client as project_client
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.id = ?
  `).get(req.params.id);

  if (!record) {
    return errorResponse(res, '借用记录不存在', 404, 404);
  }

  const photos = db.prepare(`
    SELECT * FROM photos WHERE borrow_record_id = ? ORDER BY photo_type, uploaded_at
  `).all(req.params.id);

  const confirmations = db.prepare(`
    SELECT * FROM liability_confirmations WHERE borrow_record_id = ? ORDER BY confirmed_at
  `).all(req.params.id);

  successResponse(res, {
    ...record,
    is_overdue: record.status === 'out' && isOverdue(record.planned_return_date),
    photos,
    confirmations
  });
});

router.post('/', (req, res) => {
  const missing = validateRequiredFields(req.body,
    ['sample_id', 'project_id', 'borrower_name', 'borrower_role', 'planned_out_date', 'planned_return_date']
  );
  if (missing) {
    return errorResponse(res, `缺少必填字段: ${missing.join(', ')}`);
  }

  const { sample_id, project_id, borrower_name, borrower_role, borrower_contact,
          planned_out_date, planned_return_date } = req.body;

  const db = getDB();

  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(sample_id);
  if (!sample) {
    return errorResponse(res, '样品不存在');
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id);
  if (!project) {
    return errorResponse(res, '项目不存在');
  }

  if (new Date(planned_return_date) < new Date(planned_out_date)) {
    return errorResponse(res, '归还日期不能早于借出日期');
  }

  if (!isInsuranceSufficient(sample.value, sample.insurance_amount, config.insurance.minInsuranceRatio)) {
    return errorResponse(res,
      `保险额度不足：样品价值${sample.value}元，保险额度${sample.insurance_amount}元，需至少${sample.value * config.insurance.minInsuranceRatio}元才能出库`
    );
  }

  if (isInsuranceExpired(sample.insurance_expiry_date)) {
    return errorResponse(res, '样品保险已过期，无法借用');
  }

  const available = checkSampleAvailability(db, sample_id, planned_out_date, planned_return_date);
  if (!available) {
    return errorResponse(res, '该样品在指定时间段内已被其他项目占用，无法同时借用');
  }

  const id = generateId('B');

  db.prepare(`
    INSERT INTO borrow_records
    (id, sample_id, project_id, borrower_name, borrower_role, borrower_contact,
     planned_out_date, planned_return_date, status)
    VALUES
    (@id, @sample_id, @project_id, @borrower_name, @borrower_role, @borrower_contact,
     @planned_out_date, @planned_return_date, 'pending')
  `).run({
    id,
    sample_id,
    project_id,
    borrower_name,
    borrower_role,
    borrower_contact: borrower_contact || null,
    planned_out_date,
    planned_return_date
  });

  const record = db.prepare(`
    SELECT br.*, s.name as sample_name, p.name as project_name
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.id = ?
  `).get(id);

  successResponse(res, record, '借用申请创建成功');
});

router.post('/:id/out', (req, res) => {
  const db = getDB();
  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);

  if (!record) {
    return errorResponse(res, '借用记录不存在', 404, 404);
  }

  if (record.status !== 'pending') {
    return errorResponse(res, `当前状态为 ${record.status}，无法执行出库操作`);
  }

  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(record.sample_id);

  if (!isInsuranceSufficient(sample.value, sample.insurance_amount, config.insurance.minInsuranceRatio)) {
    return errorResponse(res,
      `保险额度不足，禁止出库：样品价值${sample.value}元，保险额度${sample.insurance_amount}元`
    );
  }

  if (isInsuranceExpired(sample.insurance_expiry_date)) {
    return errorResponse(res, '样品保险已过期，禁止出库');
  }

  const { verified_by } = req.body;

  const stmt = db.prepare(`
    UPDATE borrow_records
    SET status = 'out', actual_out_date = datetime('now'), out_verified_by = @verified_by,
        updated_at = datetime('now')
    WHERE id = @id
  `);
  stmt.run({ id: req.params.id, verified_by: verified_by || null });

  db.prepare("UPDATE samples SET status = 'out_of_stock', updated_at = datetime('now') WHERE id = ?")
    .run(record.sample_id);

  const updated = db.prepare(`
    SELECT br.*, s.name as sample_name, p.name as project_name
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.id = ?
  `).get(req.params.id);

  successResponse(res, updated, '出库成功');
});

router.post('/:id/return', (req, res) => {
  const db = getDB();
  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);

  if (!record) {
    return errorResponse(res, '借用记录不存在', 404, 404);
  }

  if (record.status !== 'out') {
    return errorResponse(res, `当前状态为 ${record.status}，无法执行归还操作`);
  }

  const { has_defect, defect_description, verified_by } = req.body;

  if (has_defect && !defect_description) {
    return errorResponse(res, '有瑕疵时必须填写瑕疵描述');
  }

  const newStatus = has_defect ? 'defect' : 'returned';

  db.prepare(`
    UPDATE borrow_records
    SET status = @status, actual_return_date = datetime('now'), return_verified_by = @verified_by,
        has_defect = @has_defect, defect_description = @defect_description,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id: req.params.id,
    status: newStatus,
    verified_by: verified_by || null,
    has_defect: has_defect ? 1 : 0,
    defect_description: defect_description || null
  });

  if (!has_defect) {
    db.prepare("UPDATE samples SET status = 'in_stock', updated_at = datetime('now') WHERE id = ?")
      .run(record.sample_id);
  }

  const updated = db.prepare(`
    SELECT br.*, s.name as sample_name, p.name as project_name
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.id = ?
  `).get(req.params.id);

  const message = has_defect ? '归还验收有瑕疵，请跟进处理' : '归还成功';
  successResponse(res, updated, message);
});

router.post('/:id/close', (req, res) => {
  const db = getDB();
  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);

  if (!record) {
    return errorResponse(res, '借用记录不存在', 404, 404);
  }

  if (record.status !== 'defect') {
    return errorResponse(res, `当前状态为 ${record.status}，只有瑕疵状态才能关闭`);
  }

  const { resolution, closed_by } = req.body;
  if (!resolution) {
    return errorResponse(res, '请填写瑕疵处理结果');
  }

  db.prepare(`
    UPDATE borrow_records
    SET status = 'closed', updated_at = datetime('now')
    WHERE id = @id
  `).run({ id: req.params.id });

  db.prepare("UPDATE samples SET status = 'in_stock', updated_at = datetime('now') WHERE id = ?")
    .run(record.sample_id);

  const updated = db.prepare(`
    SELECT br.*, s.name as sample_name, p.name as project_name
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.id = ?
  `).get(req.params.id);

  successResponse(res, updated, '借用记录已关闭');
});

router.post('/:id/photos', upload.array('photos', 20), (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { photo_type } = req.body;

  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(id);
  if (!record) {
    return errorResponse(res, '借用记录不存在', 404, 404);
  }

  if (!photo_type || !['out', 'return', 'defect'].includes(photo_type)) {
    return errorResponse(res, 'photo_type 必须是 out(出库照)、return(归还照)、defect(瑕疵照) 之一');
  }

  if (!req.files || req.files.length === 0) {
    return errorResponse(res, '请上传照片');
  }

  const insertStmt = db.prepare(`
    INSERT INTO photos (id, borrow_record_id, photo_type, file_path, file_name)
    VALUES (@id, @borrow_record_id, @photo_type, @file_path, @file_name)
  `);

  const photos = [];
  const transaction = db.transaction(() => {
    for (const file of req.files) {
      const photoId = generateId('P');
      insertStmt.run({
        id: photoId,
        borrow_record_id: id,
        photo_type,
        file_path: file.path,
        file_name: file.originalname
      });
      photos.push({
        id: photoId,
        photo_type,
        file_path: file.path,
        file_name: file.originalname
      });
    }
  });
  transaction();

  successResponse(res, photos, '照片上传成功');
});

router.post('/:id/confirm-liability', (req, res) => {
  const missing = validateRequiredFields(req.body, ['confirmer_name', 'confirmer_role']);
  if (missing) {
    return errorResponse(res, `缺少必填字段: ${missing.join(', ')}`);
  }

  const { confirmer_name, confirmer_role, signature } = req.body;
  const { id } = req.params;

  const db = getDB();
  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(id);
  if (!record) {
    return errorResponse(res, '借用记录不存在', 404, 404);
  }

  const validRoles = ['photographer', 'stylist', 'client', 'producer'];
  if (!validRoles.includes(confirmer_role)) {
    return errorResponse(res, `确认人角色必须是: ${validRoles.join(', ')}`);
  }

  const confirmId = generateId('C');

  db.prepare(`
    INSERT INTO liability_confirmations (id, borrow_record_id, confirmer_name, confirmer_role, signature)
    VALUES (@id, @borrow_record_id, @confirmer_name, @confirmer_role, @signature)
  `).run({
    id: confirmId,
    borrow_record_id: id,
    confirmer_name,
    confirmer_role,
    signature: signature || null
  });

  const confirmation = db.prepare('SELECT * FROM liability_confirmations WHERE id = ?').get(confirmId);
  successResponse(res, confirmation, '责任确认已签署');
});

router.get('/overdue/list', (req, res) => {
  const db = getDB();

  const records = db.prepare(`
    SELECT br.*, s.name as sample_name, s.value as sample_value,
           p.name as project_name, p.client as project_client
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.status = 'out'
      AND date(br.planned_return_date) < date('now')
    ORDER BY br.planned_return_date ASC
  `).all();

  successResponse(res, records);
});

module.exports = router;
