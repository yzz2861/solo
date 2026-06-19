const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { errorResponse } = require('../utils/response');

function buildCSV(headers, rows) {
  const headerRow = headers.join(',');
  const dataRows = rows.map(row =>
    headers.map(h => {
      let val = row[h] || '';
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    }).join(',')
  );
  return '\uFEFF' + headerRow + '\n' + dataRows.join('\n') + '\n';
}

router.get('/borrow-records.csv', (req, res) => {
  const db = getDB();
  const { project_id, status, start_date, end_date } = req.query;

  let where = [];
  let params = {};

  if (project_id) {
    where.push('br.project_id = @project_id');
    params.project_id = project_id;
  }
  if (status) {
    where.push('br.status = @status');
    params.status = status;
  }
  if (start_date) {
    where.push('date(br.created_at) >= date(@start_date)');
    params.start_date = start_date;
  }
  if (end_date) {
    where.push('date(br.created_at) <= date(@end_date)');
    params.end_date = end_date;
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const records = db.prepare(`
    SELECT br.id, br.borrower_name, br.borrower_role, br.borrower_contact,
           br.status, br.planned_out_date, br.planned_return_date,
           br.actual_out_date, br.actual_return_date,
           br.out_verified_by, br.return_verified_by,
           br.has_defect, br.defect_description,
           s.name as sample_name, s.category, s.brand, s.value, s.insurance_amount,
           p.name as project_name, p.client as project_client,
           (SELECT COUNT(*) FROM liability_confirmations lc WHERE lc.borrow_record_id = br.id) as confirmation_count
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    LEFT JOIN projects p ON br.project_id = p.id
    ${whereSql}
    ORDER BY br.created_at DESC
  `).all(params);

  const statusMap = {
    'pending': '待出库',
    'out': '已出库',
    'returned': '已归还',
    'defect': '有瑕疵',
    'closed': '已关闭'
  };

  const categoryMap = {
    'jewelry': '珠宝',
    'watch': '腕表',
    'bag': '限量包'
  };

  const rows = records.map(r => ({
    '借用单号': r.id,
    '样品名称': r.sample_name,
    '样品品类': categoryMap[r.category] || r.category,
    '品牌': r.brand || '',
    '样品价值(元)': r.value,
    '保险额度(元)': r.insurance_amount,
    '项目名称': r.project_name,
    '客户': r.project_client || '',
    '借用人': r.borrower_name,
    '借用人角色': r.borrower_role,
    '联系方式': r.borrower_contact || '',
    '状态': statusMap[r.status] || r.status,
    '计划借出日': r.planned_out_date,
    '计划归还日': r.planned_return_date,
    '实际出库日': r.actual_out_date || '',
    '实际归还日': r.actual_return_date || '',
    '出库确认人': r.out_verified_by || '',
    '归还验收人': r.return_verified_by || '',
    '是否有瑕疵': r.has_defect ? '是' : '否',
    '瑕疵描述': r.defect_description || '',
    '责任确认数': r.confirmation_count
  }));

  const headers = Object.keys(rows[0] || {});
  const csv = buildCSV(headers, rows);

  const filename = `借用记录_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(csv);
});

router.get('/liability-chain/:sampleId.csv', (req, res) => {
  const db = getDB();
  const sampleId = req.params.sampleId;

  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(sampleId);
  if (!sample) {
    return errorResponse(res, '样品不存在', 404, 404);
  }

  const chain = db.prepare(`
    SELECT br.id as borrow_id, br.status,
           br.borrower_name, br.borrower_role, br.borrower_contact,
           br.planned_out_date, br.planned_return_date,
           br.actual_out_date, br.actual_return_date,
           br.out_verified_by, br.return_verified_by,
           br.has_defect, br.defect_description,
           p.name as project_name, p.client as project_client,
           lc.confirmer_name, lc.confirmer_role, lc.confirmed_at
    FROM borrow_records br
    LEFT JOIN projects p ON br.project_id = p.id
    LEFT JOIN liability_confirmations lc ON lc.borrow_record_id = br.id
    WHERE br.sample_id = ?
    ORDER BY br.created_at DESC, lc.confirmed_at ASC
  `).all(sampleId);

  const statusMap = {
    'pending': '待出库',
    'out': '已出库',
    'returned': '已归还',
    'defect': '有瑕疵',
    'closed': '已关闭'
  };

  const rows = chain.map(r => ({
    '借用单号': r.borrow_id,
    '项目名称': r.project_name,
    '客户': r.project_client || '',
    '借用人': r.borrower_name,
    '借用人角色': r.borrower_role,
    '联系方式': r.borrower_contact || '',
    '状态': statusMap[r.status] || r.status,
    '计划借出日': r.planned_out_date,
    '计划归还日': r.planned_return_date,
    '实际出库日': r.actual_out_date || '',
    '实际归还日': r.actual_return_date || '',
    '出库确认人': r.out_verified_by || '',
    '归还验收人': r.return_verified_by || '',
    '责任确认人': r.confirmer_name || '',
    '确认人角色': r.confirmer_role || '',
    '确认时间': r.confirmed_at || '',
    '是否有瑕疵': r.has_defect ? '是' : '否',
    '瑕疵描述': r.defect_description || ''
  }));

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const csv = buildCSV(headers, rows);

  const filename = `借用链路_${sample.name}_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(csv);
});

router.get('/samples-list.csv', (req, res) => {
  const db = getDB();
  const { category, status } = req.query;

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

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const samples = db.prepare(`
    SELECT * FROM samples ${whereSql} ORDER BY created_at DESC
  `).all(params);

  const statusMap = {
    'in_stock': '在库',
    'out_of_stock': '出库中',
    'maintenance': '维护中',
    'lost': '已遗失'
  };

  const categoryMap = {
    'jewelry': '珠宝',
    'watch': '腕表',
    'bag': '限量包'
  };

  const rows = samples.map(s => ({
    '样品编号': s.id,
    '样品名称': s.name,
    '品类': categoryMap[s.category] || s.category,
    '品牌': s.brand || '',
    '描述': s.description || '',
    '价值(元)': s.value,
    '保险额度(元)': s.insurance_amount,
    '保险到期日': s.insurance_expiry_date || '',
    '状态': statusMap[s.status] || s.status,
    '创建时间': s.created_at
  }));

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const csv = buildCSV(headers, rows);

  const filename = `样品清单_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(csv);
});

module.exports = router;
