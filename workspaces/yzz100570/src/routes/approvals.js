const express = require('express');
const db = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { getRequestDetail } = require('../utils/requestUtil');

const router = express.Router();

router.post('/admin-review/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { action, comment, selected_quotation_id } = req.body;

    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [req.params.id]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    if (request.status !== 'submitted') {
      return res.status(400).json({ error: '只能审核已提交的申请' });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action 必须是 approve 或 reject' });
    }

    const { count: quotationCount } = await db.get(
      'SELECT COUNT(*) as count FROM quotations WHERE request_id = ?',
      [req.params.id]
    );
    
    let warnings = [];
    if (action === 'approve' && quotationCount < 3) {
      warnings.push(`当前仅 ${quotationCount} 家报价，建议至少 3 家比价`);
    }

    await db.run(`
      INSERT INTO approvals (request_id, approver_id, approval_type, action, comment)
      VALUES (?, ?, 'admin_review', ?, ?)
    `, [req.params.id, req.user.id, action, comment || null]);

    let newStatus;
    if (action === 'approve') {
      newStatus = 'admin_review';
    } else {
      newStatus = 'rejected';
    }

    await db.run('UPDATE purchase_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, req.params.id]);

    if (action === 'approve' && selected_quotation_id) {
      await db.run('UPDATE quotations SET is_selected = 0 WHERE request_id = ?', [req.params.id]);
      await db.run('UPDATE quotations SET is_selected = 1 WHERE id = ? AND request_id = ?',
        [selected_quotation_id, req.params.id]);
    }

    const detail = await getRequestDetail(req.params.id);

    res.json({
      request: detail,
      warnings: warnings.length > 0 ? warnings : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/leader-approval/:id', authenticate, requireRole('leader'), async (req, res) => {
  try {
    const { action, comment, approved_amount } = req.body;

    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [req.params.id]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    if (request.status !== 'admin_review') {
      return res.status(400).json({ error: '只能审批行政审核通过的申请' });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action 必须是 approve 或 reject' });
    }

    if (action === 'approve' && approved_amount === undefined) {
      return res.status(400).json({ error: '通过审批时必须指定审批金额' });
    }

    await db.run(`
      INSERT INTO approvals (request_id, approver_id, approval_type, action, comment, approved_amount)
      VALUES (?, ?, 'leader_approval', ?, ?, ?)
    `, [req.params.id, req.user.id, action, comment || null, action === 'approve' ? approved_amount : null]);

    const newStatus = action === 'approve' ? 'leader_approved' : 'leader_rejected';

    await db.run('UPDATE purchase_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, req.params.id]);

    const detail = await getRequestDetail(req.params.id);

    res.json({ request: detail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [req.params.id]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    if (req.user.role === 'employee' && request.applicant_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看此申请的审批历史' });
    }

    const approvals = await db.all(`
      SELECT a.*, u.name as approver_name, u.role as approver_role
      FROM approvals a
      JOIN users u ON a.approver_id = u.id
      WHERE a.request_id = ?
      ORDER BY a.created_at ASC
    `, [req.params.id]);

    const statusHistory = [
      {
        status: request.status,
        time: request.created_at,
        description: '申请创建'
      }
    ];

    approvals.forEach(a => {
      let description = '';
      if (a.approval_type === 'admin_review') {
        description = a.action === 'approve' ? '行政审核通过' : '行政退回';
      } else if (a.approval_type === 'leader_approval') {
        description = a.action === 'approve' ? '领导审批通过' : '领导驳回';
      }
      statusHistory.push({
        status: a.action,
        time: a.created_at,
        description,
        comment: a.comment,
        approver_name: a.approver_name,
        approved_amount: a.approved_amount
      });
    });

    res.json({ approvals, status_history: statusHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pending/leader', authenticate, requireRole('leader'), async (req, res) => {
  try {
    const { page = 1, page_size = 20 } = req.query;

    const sql = `
      SELECT pr.*, u.name as applicant_name, u.department as applicant_department
      FROM purchase_requests pr
      JOIN users u ON pr.applicant_id = u.id
      WHERE pr.status = 'admin_review'
      ORDER BY pr.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const list = await db.all(sql, [parseInt(page_size), (parseInt(page) - 1) * parseInt(page_size)]);

    const { total } = await db.get("SELECT COUNT(*) as total FROM purchase_requests WHERE status = 'admin_review'");

    res.json({ list, total, page: parseInt(page), page_size: parseInt(page_size) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
