const { prepare } = require('../db/database');
const { createObjectCsvWriter } = require('csv-writer');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

const EXPORT_DIR = path.join(__dirname, '..', '..', 'exports');

function ensureExportDir() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

function buildQuery(req) {
  const {
    date_from, date_to, courtroom_id, case_id,
    review_status, verification_status, seat_type_code,
    apply_source, keyword
  } = req.query;

  let sql = `
    SELECT r.id as reservation_id, r.apply_source, r.review_status, r.review_reason,
           r.reviewer, r.reviewed_at, r.verification_status, r.verified_at, r.created_at,
           a.id_card, a.name, a.phone, a.organization, a.applicant_type,
           st.code as seat_type_code, st.name as seat_type_name,
           h.id as hearing_id, h.hearing_date, h.start_time, h.end_time, h.status as hearing_status, h.change_reason,
           c.case_number, c.case_name, c.case_type, c.presiding_judge,
           cr.name as courtroom_name, cr.location
    FROM reservations r
    JOIN applicants a ON r.applicant_id = a.id
    JOIN seat_types st ON r.seat_type_id = st.id
    JOIN hearings h ON r.hearing_id = h.id
    JOIN cases c ON h.case_id = c.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    WHERE 1=1
  `;
  const params = [];

  if (date_from) {
    sql += ' AND h.hearing_date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    sql += ' AND h.hearing_date <= ?';
    params.push(date_to);
  }
  if (courtroom_id) {
    sql += ' AND cr.id = ?';
    params.push(courtroom_id);
  }
  if (case_id) {
    sql += ' AND c.id = ?';
    params.push(case_id);
  }
  if (review_status) {
    const arr = review_status.split(',');
    sql += ' AND r.review_status IN (' + arr.map(() => '?').join(',') + ')';
    params.push(...arr);
  }
  if (verification_status) {
    const arr = verification_status.split(',');
    sql += ' AND r.verification_status IN (' + arr.map(() => '?').join(',') + ')';
    params.push(...arr);
  }
  if (seat_type_code) {
    sql += ' AND st.code = ?';
    params.push(seat_type_code);
  }
  if (apply_source) {
    sql += ' AND r.apply_source = ?';
    params.push(apply_source);
  }
  if (keyword) {
    sql += ' AND (a.id_card LIKE ? OR a.name LIKE ? OR c.case_number LIKE ? OR c.case_name LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }

  sql += ' ORDER BY h.hearing_date DESC, h.start_time DESC, r.created_at DESC';

  return { sql, params };
}

const REVIEW_STATUS_MAP = {
  pending: '待审核',
  approved: '审核通过',
  rejected: '已驳回',
  merged: '已合并',
  pending_notice: '待通知'
};
const VERIFY_STATUS_MAP = {
  unverified: '未核验',
  arrived: '已到场',
  no_show: '爽约'
};

function queryRecords(req, res) {
  const { sql, params } = buildQuery(req);
  const { page = 1, page_size = 100 } = req.query;

  const countSql = sql.replace(/^SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as cnt FROM');
  const orderIdx = countSql.lastIndexOf(' ORDER BY');
  const cleanCountSql = orderIdx > -1 ? countSql.slice(0, orderIdx) : countSql;
  const total = prepare(cleanCountSql).get(...params).cnt;

  const dataSql = sql + ' LIMIT ? OFFSET ?';
  const allParams = [...params, Number(page_size), (Number(page) - 1) * Number(page_size)];
  const rows = prepare(dataSql).all(...allParams);

  const list = rows.map(r => ({
    ...r,
    review_status_text: REVIEW_STATUS_MAP[r.review_status] || r.review_status,
    verification_status_text: VERIFY_STATUS_MAP[r.verification_status] || r.verification_status
  }));

  const stats = prepare(`
    SELECT
      SUM(CASE WHEN review_status = 'approved' AND verification_status = 'arrived' THEN 1 ELSE 0 END) as arrived_total,
      SUM(CASE WHEN review_status = 'approved' AND verification_status = 'no_show' THEN 1 ELSE 0 END) as no_show_total,
      SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected_total
    FROM (${orderIdx > -1 ? sql.slice(0, orderIdx) : sql})
  `).get(...params);

  res.json({
    code: 0,
    data: {
      list,
      total,
      page: Number(page),
      page_size: Number(page_size),
      summary: {
        arrived: stats.arrived_total || 0,
        no_show: stats.no_show_total || 0,
        rejected: stats.rejected_total || 0
      }
    }
  });
}

function exportRecords(req, res) {
  const { sql, params } = buildQuery(req);
  const { type = 'all', format = 'csv' } = req.query;

  const orderIdx = sql.lastIndexOf(' ORDER BY');
  const sqlWithoutOrder = orderIdx > -1 ? sql.slice(0, orderIdx) : sql;
  const orderSql = orderIdx > -1 ? sql.slice(orderIdx) : '';

  let filteredSql = sqlWithoutOrder;
  let filteredParams = [...params];

  if (type === 'arrived') {
    filteredSql += ` AND r.review_status = 'approved' AND r.verification_status = 'arrived'`;
  } else if (type === 'no_show') {
    filteredSql += ` AND r.review_status = 'approved' AND r.verification_status = 'no_show'`;
  } else if (type === 'rejected') {
    filteredSql += ` AND r.review_status = 'rejected'`;
  }

  filteredSql += orderSql;

  const rows = prepare(filteredSql).all(...filteredParams);

  if (rows.length === 0) {
    return res.json({ code: 0, data: [], message: '没有可导出的记录' });
  }

  if (format === 'json') {
    return res.json({
      code: 0,
      data: rows.map(r => ({
        ...r,
        review_status_text: REVIEW_STATUS_MAP[r.review_status] || r.review_status,
        verification_status_text: VERIFY_STATUS_MAP[r.verification_status] || r.verification_status
      })),
      total: rows.length
    });
  }

  ensureExportDir();
  const filename = `export_${type}_${moment().format('YYYYMMDD_HHmmss')}.csv`;
  const filepath = path.join(EXPORT_DIR, filename);

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: [
      { id: 'reservation_id', title: '预约编号' },
      { id: 'hearing_date', title: '开庭日期' },
      { id: 'start_time', title: '开始时间' },
      { id: 'end_time', title: '结束时间' },
      { id: 'case_number', title: '案号' },
      { id: 'case_name', title: '案件名称' },
      { id: 'case_type', title: '案件类型' },
      { id: 'courtroom_name', title: '法庭' },
      { id: 'name', title: '姓名' },
      { id: 'id_card', title: '证件号' },
      { id: 'phone', title: '联系电话' },
      { id: 'organization', title: '单位/组织' },
      { id: 'applicant_type', title: '申请人类型' },
      { id: 'apply_source', title: '申请来源' },
      { id: 'seat_type_name', title: '席位类型' },
      { id: 'review_status_text', title: '审核状态' },
      { id: 'review_reason', title: '审核/驳回原因' },
      { id: 'reviewer', title: '审核人' },
      { id: 'reviewed_at', title: '审核时间' },
      { id: 'verification_status_text', title: '核验状态' },
      { id: 'verified_at', title: '核验时间' },
      { id: 'hearing_status', title: '庭审状态' },
      { id: 'change_reason', title: '改期/闭庭原因' },
      { id: 'created_at', title: '预约提交时间' }
    ]
  });

  const records = rows.map(r => ({
    ...r,
    review_status_text: REVIEW_STATUS_MAP[r.review_status] || r.review_status,
    verification_status_text: VERIFY_STATUS_MAP[r.verification_status] || r.verification_status
  }));

  try {
    csvWriter.writeRecords(records);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const content = fs.readFileSync(filepath, 'utf-8');
    const bom = '\uFEFF';
    res.send(bom + content);
  } catch (err) {
    res.status(500).json({ code: 500, message: '导出失败：' + err.message });
  }
}

function getStats(req, res) {
  const { date_from, date_to, group_by = 'date' } = req.query;

  let whereSql = 'WHERE 1=1';
  const params = [];

  if (date_from) {
    whereSql += ' AND h.hearing_date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    whereSql += ' AND h.hearing_date <= ?';
    params.push(date_to);
  }

  let groupField;
  if (group_by === 'courtroom') {
    groupField = 'cr.name';
  } else if (group_by === 'seat_type') {
    groupField = 'st.name';
  } else if (group_by === 'apply_source') {
    groupField = 'r.apply_source';
  } else {
    groupField = 'h.hearing_date';
  }

  const rows = prepare(`
    SELECT
      ${groupField} as group_key,
      COUNT(*) as total,
      SUM(CASE WHEN r.review_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN r.review_status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN r.review_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN r.review_status = 'merged' THEN 1 ELSE 0 END) as merged,
      SUM(CASE WHEN r.review_status = 'pending_notice' THEN 1 ELSE 0 END) as pending_notice,
      SUM(CASE WHEN r.verification_status = 'arrived' THEN 1 ELSE 0 END) as arrived,
      SUM(CASE WHEN r.verification_status = 'no_show' THEN 1 ELSE 0 END) as no_show
    FROM reservations r
    JOIN hearings h ON r.hearing_id = h.id
    JOIN courtrooms cr ON h.courtroom_id = cr.id
    JOIN seat_types st ON r.seat_type_id = st.id
    ${whereSql}
    GROUP BY ${groupField}
    ORDER BY group_key
  `).all(...params);

  const totals = {
    total: 0, pending: 0, approved: 0, rejected: 0,
    merged: 0, pending_notice: 0, arrived: 0, no_show: 0
  };
  for (const r of rows) {
    for (const k of Object.keys(totals)) totals[k] += r[k] || 0;
  }

  res.json({
    code: 0,
    data: {
      group_by,
      date_from: date_from || null,
      date_to: date_to || null,
      groups: rows,
      totals
    }
  });
}

module.exports = {
  queryRecords,
  exportRecords,
  getStats
};
