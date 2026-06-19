const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { generateId, successResponse, errorResponse, validateRequiredFields } = require('../utils/response');

router.get('/', (req, res) => {
  const db = getDB();
  const { status, keyword, page = 1, pageSize = 20 } = req.query;

  let where = [];
  let params = {};

  if (status) {
    where.push('status = @status');
    params.status = status;
  }
  if (keyword) {
    where.push('(name LIKE @keyword OR client LIKE @keyword)');
    params.keyword = `%${keyword}%`;
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (page - 1) * pageSize;

  const total = db.prepare(`SELECT COUNT(*) as count FROM projects ${whereSql}`).get(params).count;
  const projects = db.prepare(
    `SELECT * FROM projects ${whereSql} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`
  ).all({ ...params, limit: Number(pageSize), offset });

  successResponse(res, {
    list: projects,
    total,
    page: Number(page),
    pageSize: Number(pageSize)
  });
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  if (!project) {
    return errorResponse(res, '项目不存在', 404, 404);
  }

  const samples = db.prepare(`
    SELECT DISTINCT s.id, s.name, s.category, s.value, br.status as borrow_status,
           br.planned_out_date, br.planned_return_date, br.borrower_name
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    WHERE br.project_id = ?
    ORDER BY br.created_at DESC
  `).all(req.params.id);

  const activeCount = db.prepare(`
    SELECT COUNT(*) as count FROM borrow_records
    WHERE project_id = ? AND status IN ('pending', 'out')
  `).get(req.params.id).count;

  successResponse(res, {
    ...project,
    active_borrow_count: activeCount,
    samples
  });
});

router.post('/', (req, res) => {
  const missing = validateRequiredFields(req.body, ['name']);
  if (missing) {
    return errorResponse(res, `缺少必填字段: ${missing.join(', ')}`);
  }

  const { name, client, shoot_date, status } = req.body;
  const db = getDB();
  const id = generateId('PRJ');

  db.prepare(`
    INSERT INTO projects (id, name, client, shoot_date, status)
    VALUES (@id, @name, @client, @shoot_date, @status)
  `).run({
    id,
    name,
    client: client || null,
    shoot_date: shoot_date || null,
    status: status || 'active'
  });

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  successResponse(res, project, '创建成功');
});

router.put('/:id', (req, res) => {
  const db = getDB();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  if (!project) {
    return errorResponse(res, '项目不存在', 404, 404);
  }

  const { name, client, shoot_date, status } = req.body;

  db.prepare(`
    UPDATE projects SET
      name = COALESCE(@name, name),
      client = COALESCE(@client, client),
      shoot_date = COALESCE(@shoot_date, shoot_date),
      status = COALESCE(@status, status)
    WHERE id = @id
  `).run({
    id: req.params.id,
    name: name !== undefined ? name : null,
    client: client !== undefined ? client : null,
    shoot_date: shoot_date !== undefined ? shoot_date : null,
    status: status !== undefined ? status : null
  });

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  successResponse(res, updated, '更新成功');
});

router.get('/:id/samples', (req, res) => {
  const db = getDB();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  if (!project) {
    return errorResponse(res, '项目不存在', 404, 404);
  }

  const borrows = db.prepare(`
    SELECT br.id as borrow_id, br.status, br.borrower_name, br.borrower_role,
           br.planned_out_date, br.planned_return_date, br.actual_out_date,
           s.id as sample_id, s.name as sample_name, s.category, s.brand, s.value,
           s.insurance_amount
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    WHERE br.project_id = ?
    ORDER BY br.created_at DESC
  `).all(req.params.id);

  const activeSamples = borrows.filter(b => b.status === 'out');
  const pendingSamples = borrows.filter(b => b.status === 'pending');

  successResponse(res, {
    project_name: project.name,
    total_samples: borrows.length,
    active_count: activeSamples.length,
    pending_count: pendingSamples.length,
    borrows
  });
});

module.exports = router;
