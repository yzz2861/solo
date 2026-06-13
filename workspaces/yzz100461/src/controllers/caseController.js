const { prepare } = require('../db/database');

function listCases(req, res) {
  const { keyword, case_type } = req.query;
  let sql = 'SELECT * FROM cases WHERE 1=1';
  const params = [];

  if (keyword) {
    sql += ' AND (case_number LIKE ? OR case_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (case_type) {
    sql += ' AND case_type = ?';
    params.push(case_type);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = prepare(sql).all(...params);
  res.json({ code: 0, data: rows });
}

function getCase(req, res) {
  const { id } = req.params;
  const row = prepare('SELECT * FROM cases WHERE id = ?').get(id);
  if (!row) {
    return res.status(404).json({ code: 404, message: '案件不存在' });
  }
  res.json({ code: 0, data: row });
}

function createCase(req, res) {
  const { case_number, case_name, case_type, presiding_judge, sensitive_remark } = req.body;

  if (!case_number || !case_name || !case_type) {
    return res.status(400).json({ code: 400, message: '案号、案件名称、案件类型为必填项' });
  }

  const exists = prepare('SELECT id FROM cases WHERE case_number = ?').get(case_number);
  if (exists) {
    return res.status(400).json({ code: 400, message: '案号已存在' });
  }

  const stmt = prepare(`
    INSERT INTO cases (case_number, case_name, case_type, presiding_judge, sensitive_remark)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(case_number, case_name, case_type, presiding_judge || null, sensitive_remark || null);

  const newCase = prepare('SELECT * FROM cases WHERE id = ?').get(result.lastInsertRowid);
  res.json({ code: 0, data: newCase, message: '案件创建成功' });
}

function updateCase(req, res) {
  const { id } = req.params;
  const { case_number, case_name, case_type, presiding_judge, sensitive_remark } = req.body;

  const existing = prepare('SELECT * FROM cases WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '案件不存在' });
  }

  if (case_number && case_number !== existing.case_number) {
    const exists = prepare('SELECT id FROM cases WHERE case_number = ? AND id != ?').get(case_number, id);
    if (exists) {
      return res.status(400).json({ code: 400, message: '案号已存在' });
    }
  }

  const stmt = prepare(`
    UPDATE cases SET
      case_number = COALESCE(?, case_number),
      case_name = COALESCE(?, case_name),
      case_type = COALESCE(?, case_type),
      presiding_judge = COALESCE(?, presiding_judge),
      sensitive_remark = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `);
  stmt.run(
    case_number || null,
    case_name || null,
    case_type || null,
    presiding_judge || null,
    sensitive_remark !== undefined ? sensitive_remark : existing.sensitive_remark,
    id
  );

  const updated = prepare('SELECT * FROM cases WHERE id = ?').get(id);
  res.json({ code: 0, data: updated, message: '案件更新成功' });
}

function deleteCase(req, res) {
  const { id } = req.params;

  const hearingCount = prepare('SELECT COUNT(*) as cnt FROM hearings WHERE case_id = ?').get(id).cnt;
  if (hearingCount > 0) {
    return res.status(400).json({ code: 400, message: `该案件下存在 ${hearingCount} 个场次，无法删除` });
  }

  const result = prepare('DELETE FROM cases WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ code: 404, message: '案件不存在' });
  }
  res.json({ code: 0, message: '案件删除成功' });
}

module.exports = {
  listCases,
  getCase,
  createCase,
  updateCase,
  deleteCase
};
