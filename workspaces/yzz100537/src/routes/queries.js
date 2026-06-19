const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { successResponse } = require('../utils/response');
const { isOverdue, daysUntilExpiry, isInsuranceExpiring } = require('../utils/insurance');
const config = require('../config');

router.get('/samples/out', (req, res) => {
  const db = getDB();

  const samples = db.prepare(`
    SELECT s.id as sample_id, s.name as sample_name, s.category, s.brand, s.value,
           s.insurance_amount, s.insurance_expiry_date,
           br.id as borrow_id, br.borrower_name, br.borrower_role,
           br.project_id, p.name as project_name,
           br.planned_out_date, br.planned_return_date, br.actual_out_date,
           br.out_verified_by
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.status = 'out'
    ORDER BY br.actual_out_date DESC
  `).all();

  const result = samples.map(s => ({
    ...s,
    is_overdue: isOverdue(s.planned_return_date),
    insurance_sufficient: s.insurance_amount >= s.value * config.insurance.minInsuranceRatio
  }));

  successResponse(res, {
    total: result.length,
    overdue_count: result.filter(s => s.is_overdue).length,
    list: result
  });
});

router.get('/projects/:id/sample-usage', (req, res) => {
  const db = getDB();

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) {
    return successResponse(res, []);
  }

  const borrows = db.prepare(`
    SELECT br.sample_id, s.name as sample_name, s.category, s.value,
           br.status, br.planned_out_date, br.planned_return_date,
           br.actual_out_date, br.actual_return_date,
           br.borrower_name, br.borrower_role
    FROM borrow_records br
    LEFT JOIN samples s ON br.sample_id = s.id
    WHERE br.project_id = ?
    ORDER BY br.planned_out_date ASC
  `).all(req.params.id);

  const timeline = borrows.map(b => ({
    sample_id: b.sample_id,
    sample_name: b.sample_name,
    status: b.status,
    start_date: b.planned_out_date,
    end_date: b.planned_return_date,
    borrower: b.borrower_name
  }));

  successResponse(res, {
    project_id: req.params.id,
    project_name: project.name,
    total_samples: borrows.length,
    active_count: borrows.filter(b => b.status === 'out').length,
    timeline
  });
});

router.get('/samples/:id/timeline', (req, res) => {
  const db = getDB();

  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(req.params.id);
  if (!sample) {
    return successResponse(res, []);
  }

  const history = db.prepare(`
    SELECT br.id as borrow_id, br.status,
           br.planned_out_date, br.planned_return_date,
           br.actual_out_date, br.actual_return_date,
           br.borrower_name, br.borrower_role,
           p.id as project_id, p.name as project_name, p.client as project_client,
           br.has_defect, br.defect_description
    FROM borrow_records br
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.sample_id = ?
    ORDER BY br.created_at DESC
  `).all(req.params.id);

  successResponse(res, {
    sample_id: req.params.id,
    sample_name: sample.name,
    total_borrows: history.length,
    history
  });
});

router.get('/legal/borrow-chain/:sampleId', (req, res) => {
  const db = getDB();

  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(req.params.sampleId);
  if (!sample) {
    return successResponse(res, []);
  }

  const chain = db.prepare(`
    SELECT br.id as borrow_id, br.status,
           br.borrower_name, br.borrower_role, br.borrower_contact,
           br.planned_out_date, br.planned_return_date,
           br.actual_out_date, br.actual_return_date,
           br.out_verified_by, br.return_verified_by,
           br.has_defect, br.defect_description,
           p.id as project_id, p.name as project_name, p.client as project_client,
           (SELECT COUNT(*) FROM liability_confirmations lc WHERE lc.borrow_record_id = br.id) as confirmation_count,
           (SELECT GROUP_CONCAT(confirmer_name || '(' || confirmer_role || ')', '; ')
            FROM liability_confirmations lc WHERE lc.borrow_record_id = br.id) as confirmers
    FROM borrow_records br
    LEFT JOIN projects p ON br.project_id = p.id
    WHERE br.sample_id = ?
    ORDER BY br.created_at DESC
  `).all(req.params.sampleId);

  successResponse(res, {
    sample: {
      id: sample.id,
      name: sample.name,
      category: sample.category,
      value: sample.value,
      insurance_amount: sample.insurance_amount
    },
    total_records: chain.length,
    chain
  });
});

router.get('/reminders', (req, res) => {
  const db = getDB();
  const { type, is_read } = req.query;

  let where = [];
  let params = {};

  if (type) {
    where.push('type = @type');
    params.type = type;
  }
  if (is_read !== undefined) {
    where.push('is_read = @is_read');
    params.is_read = is_read === 'true' || is_read === '1' ? 1 : 0;
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const reminders = db.prepare(
    `SELECT * FROM reminders ${whereSql} ORDER BY created_at DESC LIMIT 100`
  ).all(params);

  successResponse(res, reminders);
});

router.post('/reminders/:id/read', (req, res) => {
  const db = getDB();
  db.prepare('UPDATE reminders SET is_read = 1 WHERE id = ?').run(req.params.id);
  successResponse(res, null, '已标记为已读');
});

router.get('/dashboard/stats', (req, res) => {
  const db = getDB();

  const totalSamples = db.prepare("SELECT COUNT(*) as count FROM samples WHERE status != 'lost'").get().count;
  const outSamples = db.prepare("SELECT COUNT(*) as count FROM samples WHERE status = 'out_of_stock'").get().count;
  const activeProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'active'").get().count;
  const overdueBorrows = db.prepare(`
    SELECT COUNT(*) as count FROM borrow_records
    WHERE status = 'out' AND date(planned_return_date) < date('now')
  `).get().count;

  const expiringInsurance = db.prepare(`
    SELECT COUNT(*) as count FROM samples
    WHERE insurance_expiry_date IS NOT NULL
      AND date(insurance_expiry_date) >= date('now')
      AND date(insurance_expiry_date) <= date('now', '+' || ? || ' days')
  `).get(config.insurance.expiryWarningDays).count;

  const insufficientInsurance = db.prepare(`
    SELECT COUNT(*) as count FROM samples
    WHERE insurance_amount < value * ?
  `).get(config.insurance.minInsuranceRatio).count;

  successResponse(res, {
    total_samples: totalSamples,
    out_samples: outSamples,
    active_projects: activeProjects,
    overdue_borrows: overdueBorrows,
    expiring_insurance: expiringInsurance,
    insufficient_insurance: insufficientInsurance
  });
});

module.exports = router;
