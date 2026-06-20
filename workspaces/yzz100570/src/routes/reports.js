const express = require('express');
const db = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

const router = express.Router();

const reportDir = path.join(__dirname, '..', '..', 'reports');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const getMonthRange = (year, month) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
  return { startDate, endDate };
};

const getStatusText = (status) => {
  const statusMap = {
    'draft': '草稿',
    'submitted': '已提交',
    'admin_review': '行政审核中',
    'leader_approved': '领导已批准',
    'leader_rejected': '领导已驳回',
    'ordered': '已下单',
    'accepted': '已验收',
    'rejected': '已退回',
    'returned': '已退货'
  };
  return statusMap[status] || status;
};

router.get('/summary', authenticate, requireRole('admin', 'leader'), async (req, res) => {
  try {
    const { year, month } = req.query;
    
    let dateFilter = '';
    let params = [];
    
    if (year && month) {
      const { startDate, endDate } = getMonthRange(parseInt(year), parseInt(month));
      dateFilter = 'WHERE pr.created_at >= ? AND pr.created_at < ?';
      params = [startDate, endDate];
    }

    const totalRequests = (await db.get(`SELECT COUNT(*) as count FROM purchase_requests pr ${dateFilter}`, params)).count;
    
    const statusCounts = await db.all(`
      SELECT status, COUNT(*) as count 
      FROM purchase_requests pr
      ${dateFilter}
      GROUP BY status
    `, params);

    let totalAmountResult;
    if (year && month) {
      totalAmountResult = await db.get(`
        SELECT COALESCE(SUM(o.order_amount), 0) as total_amount
        FROM orders o
        JOIN purchase_requests pr ON o.request_id = pr.id
        WHERE pr.created_at >= ? AND pr.created_at < ?
      `, params);
    } else {
      totalAmountResult = await db.get(`
        SELECT COALESCE(SUM(o.order_amount), 0) as total_amount
        FROM orders o
      `);
    }

    let overBudgetCount;
    if (year && month) {
      overBudgetCount = await db.get(`
        SELECT COUNT(*) as count
        FROM orders o
        JOIN purchase_requests pr ON o.request_id = pr.id
        JOIN approvals a ON pr.id = a.request_id AND a.approval_type = 'leader_approval' AND a.action = 'approve'
        WHERE pr.created_at >= ? AND pr.created_at < ?
        AND o.order_amount > a.approved_amount
      `, params);
    } else {
      overBudgetCount = await db.get(`
        SELECT COUNT(*) as count
        FROM orders o
        JOIN purchase_requests pr ON o.request_id = pr.id
        JOIN approvals a ON pr.id = a.request_id AND a.approval_type = 'leader_approval' AND a.action = 'approve'
        WHERE o.order_amount > a.approved_amount
      `);
    }

    let pendingAcceptance;
    if (year && month) {
      pendingAcceptance = await db.get(`
        SELECT COUNT(*) as count
        FROM purchase_requests pr
        WHERE status = 'ordered'
        AND pr.created_at >= ? AND pr.created_at < ?
      `, params);
    } else {
      pendingAcceptance = await db.get(`
        SELECT COUNT(*) as count
        FROM purchase_requests pr
        WHERE status = 'ordered'
      `);
    }

    let returnedCount;
    if (year && month) {
      returnedCount = await db.get(`
        SELECT COUNT(*) as count
        FROM purchase_requests pr
        WHERE status IN ('returned', 'rejected')
        AND pr.created_at >= ? AND pr.created_at < ?
      `, params);
    } else {
      returnedCount = await db.get(`
        SELECT COUNT(*) as count
        FROM purchase_requests pr
        WHERE status IN ('returned', 'rejected')
      `);
    }

    res.json({
      total_requests: totalRequests,
      total_amount: totalAmountResult.total_amount,
      status_counts: statusCounts,
      over_budget_count: overBudgetCount.count,
      pending_acceptance: pendingAcceptance.count,
      returned_count: returnedCount.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/purchases', authenticate, requireRole('admin', 'leader'), async (req, res) => {
  try {
    const { year, month, format = 'json' } = req.query;
    
    let params = [];
    let dateCondition = '';
    
    if (year && month) {
      const { startDate, endDate } = getMonthRange(parseInt(year), parseInt(month));
      dateCondition = 'WHERE pr.created_at >= ? AND pr.created_at < ?';
      params = [startDate, endDate];
    }

    const sql = `
      SELECT pr.id, pr.request_no, pr.item_name, pr.item_spec, pr.quantity, pr.unit,
             pr.purpose, u.name as applicant_name, u.department, pr.status,
             o.order_amount, o.order_date, o.order_no, q.supplier_name,
             pr.created_at
      FROM purchase_requests pr
      JOIN users u ON pr.applicant_id = u.id
      LEFT JOIN orders o ON pr.id = o.request_id
      LEFT JOIN quotations q ON o.quotation_id = q.id
      ${dateCondition}
      AND pr.status IN ('ordered', 'accepted')
      ORDER BY pr.created_at DESC
    `;

    const list = await db.all(sql, params);

    if (format === 'csv') {
      const fileName = `purchases_${year || 'all'}_${month || 'all'}.csv`;
      const filePath = path.join(reportDir, fileName);

      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'request_no', title: '申请编号' },
          { id: 'item_name', title: '物品名称' },
          { id: 'item_spec', title: '规格' },
          { id: 'quantity', title: '数量' },
          { id: 'unit', title: '单位' },
          { id: 'purpose', title: '用途' },
          { id: 'applicant_name', title: '申请人' },
          { id: 'department', title: '部门' },
          { id: 'supplier_name', title: '供应商' },
          { id: 'order_amount', title: '采购金额' },
          { id: 'order_date', title: '下单日期' },
          { id: 'status', title: '状态' },
          { id: 'created_at', title: '申请时间' }
        ]
      });

      const records = list.map(item => ({
        ...item,
        status: getStatusText(item.status)
      }));

      await csvWriter.writeRecords(records);
      res.download(filePath, fileName);
    } else {
      res.json({ list, total: list.length });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pending-acceptance', authenticate, requireRole('admin', 'leader'), async (req, res) => {
  try {
    const { year, month, format = 'json' } = req.query;

    let params = [];
    let dateCondition = '';
    
    if (year && month) {
      const { startDate, endDate } = getMonthRange(parseInt(year), parseInt(month));
      dateCondition = 'AND pr.created_at >= ? AND pr.created_at < ?';
      params = [startDate, endDate];
    }

    const sql = `
      SELECT pr.id, pr.request_no, pr.item_name, pr.quantity,
             u.name as applicant_name, u.department,
             o.order_amount, o.order_date, o.expected_delivery,
             q.supplier_name, pr.created_at,
             julianday('now') - julianday(o.order_date) as days_passed
      FROM purchase_requests pr
      JOIN users u ON pr.applicant_id = u.id
      JOIN orders o ON pr.id = o.request_id
      JOIN quotations q ON o.quotation_id = q.id
      WHERE pr.status = 'ordered'
      ${dateCondition}
      ORDER BY o.order_date ASC
    `;

    const list = await db.all(sql, params);

    if (format === 'csv') {
      const fileName = `pending_acceptance_${year || 'all'}_${month || 'all'}.csv`;
      const filePath = path.join(reportDir, fileName);

      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'request_no', title: '申请编号' },
          { id: 'item_name', title: '物品名称' },
          { id: 'quantity', title: '数量' },
          { id: 'applicant_name', title: '申请人' },
          { id: 'department', title: '部门' },
          { id: 'supplier_name', title: '供应商' },
          { id: 'order_amount', title: '采购金额' },
          { id: 'order_date', title: '下单日期' },
          { id: 'expected_delivery', title: '预计到货' },
          { id: 'days_passed', title: '已下单天数' }
        ]
      });

      await csvWriter.writeRecords(list);
      res.download(filePath, fileName);
    } else {
      res.json({ list, total: list.length });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/returned', authenticate, requireRole('admin', 'leader'), async (req, res) => {
  try {
    const { year, month, format = 'json' } = req.query;

    let params = [];
    let dateCondition = '';
    
    if (year && month) {
      const { startDate, endDate } = getMonthRange(parseInt(year), parseInt(month));
      dateCondition = 'AND pr.created_at >= ? AND pr.created_at < ?';
      params = [startDate, endDate];
    }

    const sql = `
      SELECT pr.id, pr.request_no, pr.item_name, pr.quantity,
             u.name as applicant_name, u.department,
             pr.status, pr.updated_at as return_date,
             a.comment as reject_reason
      FROM purchase_requests pr
      JOIN users u ON pr.applicant_id = u.id
      LEFT JOIN approvals a ON pr.id = a.request_id
      WHERE pr.status IN ('returned', 'rejected', 'leader_rejected')
      ${dateCondition}
      ORDER BY pr.updated_at DESC
    `;

    const list = await db.all(sql, params);

    if (format === 'csv') {
      const fileName = `returned_${year || 'all'}_${month || 'all'}.csv`;
      const filePath = path.join(reportDir, fileName);

      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'request_no', title: '申请编号' },
          { id: 'item_name', title: '物品名称' },
          { id: 'quantity', title: '数量' },
          { id: 'applicant_name', title: '申请人' },
          { id: 'department', title: '部门' },
          { id: 'status', title: '状态' },
          { id: 'return_date', title: '退回日期' },
          { id: 'reject_reason', title: '退回原因' }
        ]
      });

      const records = list.map(item => ({
        ...item,
        status: getStatusText(item.status)
      }));

      await csvWriter.writeRecords(records);
      res.download(filePath, fileName);
    } else {
      res.json({ list, total: list.length });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/over-budget', authenticate, requireRole('admin', 'leader'), async (req, res) => {
  try {
    const { year, month, format = 'json' } = req.query;

    let params = [];
    let dateCondition = '';
    
    if (year && month) {
      const { startDate, endDate } = getMonthRange(parseInt(year), parseInt(month));
      dateCondition = 'AND pr.created_at >= ? AND pr.created_at < ?';
      params = [startDate, endDate];
    }

    const sql = `
      SELECT pr.id, pr.request_no, pr.item_name, pr.quantity,
             u.name as applicant_name, u.department,
             a.approved_amount, o.order_amount,
             (o.order_amount - a.approved_amount) as over_amount,
             ROUND((o.order_amount - a.approved_amount) / a.approved_amount * 100, 2) as over_percent,
             q.supplier_name, o.order_date
      FROM orders o
      JOIN purchase_requests pr ON o.request_id = pr.id
      JOIN users u ON pr.applicant_id = u.id
      JOIN quotations q ON o.quotation_id = q.id
      JOIN (
        SELECT request_id, MAX(approved_amount) as approved_amount
        FROM approvals
        WHERE approval_type = 'leader_approval' AND action = 'approve'
        GROUP BY request_id
      ) a ON pr.id = a.request_id
      WHERE o.order_amount > a.approved_amount
      ${dateCondition}
      ORDER BY over_amount DESC
    `;

    const list = await db.all(sql, params);

    if (format === 'csv') {
      const fileName = `over_budget_${year || 'all'}_${month || 'all'}.csv`;
      const filePath = path.join(reportDir, fileName);

      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'request_no', title: '申请编号' },
          { id: 'item_name', title: '物品名称' },
          { id: 'quantity', title: '数量' },
          { id: 'applicant_name', title: '申请人' },
          { id: 'department', title: '部门' },
          { id: 'approved_amount', title: '审批金额' },
          { id: 'order_amount', title: '实际金额' },
          { id: 'over_amount', title: '超支金额' },
          { id: 'over_percent', title: '超支比例(%)' },
          { id: 'supplier_name', title: '供应商' },
          { id: 'order_date', title: '下单日期' }
        ]
      });

      await csvWriter.writeRecords(list);
      res.download(filePath, fileName);
    } else {
      const totalOver = list.reduce((sum, item) => sum + item.over_amount, 0);
      res.json({ list, total: list.length, total_over_amount: totalOver });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
