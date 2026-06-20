const express = require('express');
const db = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getRequestDetail } = require('../utils/requestUtil');

const router = express.Router();

router.post('/order/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { quotation_id, order_no, order_date, expected_delivery, order_remark } = req.body;

    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [req.params.id]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    if (request.status !== 'leader_approved') {
      return res.status(400).json({ error: '只能对领导审批通过的申请下单' });
    }

    if (!quotation_id) {
      return res.status(400).json({ error: '请选择报价' });
    }

    const quotation = await db.get('SELECT * FROM quotations WHERE id = ? AND request_id = ?',
      [quotation_id, req.params.id]);
    
    if (!quotation) {
      return res.status(404).json({ error: '报价不存在' });
    }

    const leaderApproval = await db.get(`
      SELECT approved_amount FROM approvals 
      WHERE request_id = ? AND approval_type = 'leader_approval' AND action = 'approve'
      ORDER BY created_at DESC LIMIT 1
    `, [req.params.id]);

    let amount_warning = null;
    if (leaderApproval && quotation.total_price > leaderApproval.approved_amount) {
      amount_warning = `下单金额 ${quotation.total_price} 超过审批金额 ${leaderApproval.approved_amount}`;
    }

    const result = await db.run(`
      INSERT INTO orders (request_id, quotation_id, order_no, order_amount, order_date, expected_delivery, order_remark)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      req.params.id,
      quotation_id,
      order_no || null,
      quotation.total_price,
      order_date || null,
      expected_delivery || null,
      order_remark || null
    ]);

    await db.run('UPDATE purchase_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['ordered', req.params.id]);

    await db.run('UPDATE quotations SET is_selected = 0 WHERE request_id = ?', [req.params.id]);
    await db.run('UPDATE quotations SET is_selected = 1 WHERE id = ?', [quotation_id]);

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [result.lastID]);
    const detail = await getRequestDetail(req.params.id);

    res.status(201).json({
      order,
      request: detail,
      amount_warning
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/order/pending-acceptance', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, page_size = 20 } = req.query;

    const sql = `
      SELECT pr.*, u.name as applicant_name, o.order_amount, o.order_date, o.expected_delivery,
             q.supplier_name
      FROM purchase_requests pr
      JOIN users u ON pr.applicant_id = u.id
      JOIN orders o ON pr.id = o.request_id
      JOIN quotations q ON o.quotation_id = q.id
      WHERE pr.status = 'ordered'
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const list = await db.all(sql, [parseInt(page_size), (parseInt(page) - 1) * parseInt(page_size)]);

    const { total } = await db.get("SELECT COUNT(*) as total FROM purchase_requests WHERE status = 'ordered'");

    res.json({ list, total, page: parseInt(page), page_size: parseInt(page_size) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/acceptance/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { 
      acceptance_date, 
      acceptance_result, 
      acceptance_remark, 
      invoice_status, 
      invoice_no, 
      invoice_amount 
    } = req.body;

    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [req.params.id]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    if (request.status !== 'ordered') {
      return res.status(400).json({ error: '只能对已下单的申请进行验收' });
    }

    const order = await db.get('SELECT * FROM orders WHERE request_id = ?', [req.params.id]);
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    if (!acceptance_result) {
      return res.status(400).json({ error: '请选择验收结果' });
    }

    const existing = await db.get('SELECT * FROM acceptances WHERE request_id = ?', [req.params.id]);
    
    let acceptance;
    if (existing) {
      await db.run(`
        UPDATE acceptances SET
          acceptance_date = ?,
          acceptance_result = ?,
          acceptance_remark = ?,
          invoice_status = ?,
          invoice_no = ?,
          invoice_amount = ?,
          accepted_by = ?
        WHERE id = ?
      `, [
        acceptance_date || null,
        acceptance_result,
        acceptance_remark || null,
        invoice_status || 'pending',
        invoice_no || null,
        invoice_amount || null,
        req.user.id,
        existing.id
      ]);
      acceptance = await db.get('SELECT * FROM acceptances WHERE id = ?', [existing.id]);
    } else {
      const result = await db.run(`
        INSERT INTO acceptances 
        (request_id, order_id, acceptance_date, acceptance_result, acceptance_remark, 
         invoice_status, invoice_no, invoice_amount, accepted_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.params.id,
        order.id,
        acceptance_date || null,
        acceptance_result,
        acceptance_remark || null,
        invoice_status || 'pending',
        invoice_no || null,
        invoice_amount || null,
        req.user.id
      ]);
      acceptance = await db.get('SELECT * FROM acceptances WHERE id = ?', [result.lastID]);
    }

    if (acceptance_result === 'pass') {
      await db.run('UPDATE purchase_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['accepted', req.params.id]);
    } else if (acceptance_result === 'fail') {
      await db.run('UPDATE purchase_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['returned', req.params.id]);
    }

    const detail = await getRequestDetail(req.params.id);

    res.json({
      acceptance,
      request: detail
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/acceptance/:id/photos', authenticate, requireRole('admin'), upload.array('photos', 10), async (req, res) => {
  try {
    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [req.params.id]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    const acceptance = await db.get('SELECT * FROM acceptances WHERE request_id = ?', [req.params.id]);
    
    if (!acceptance) {
      return res.status(400).json({ error: '请先创建验收记录' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请上传照片' });
    }

    const photoPaths = req.files.map(f => `/uploads/quotations/${f.filename}`);
    
    let existingPhotos = [];
    if (acceptance.acceptance_photos) {
      try {
        existingPhotos = JSON.parse(acceptance.acceptance_photos);
      } catch (e) {
        existingPhotos = [acceptance.acceptance_photos];
      }
    }
    
    const allPhotos = [...existingPhotos, ...photoPaths];

    await db.run('UPDATE acceptances SET acceptance_photos = ? WHERE id = ?',
      [JSON.stringify(allPhotos), acceptance.id]);

    res.json({
      photos: allPhotos,
      message: `成功上传 ${req.files.length} 张照片`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/acceptance/:id/invoice', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { invoice_status, invoice_no, invoice_amount } = req.body;

    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [req.params.id]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    const acceptance = await db.get('SELECT * FROM acceptances WHERE request_id = ?', [req.params.id]);
    
    if (!acceptance) {
      return res.status(400).json({ error: '请先创建验收记录' });
    }

    await db.run(`
      UPDATE acceptances SET
        invoice_status = ?,
        invoice_no = ?,
        invoice_amount = ?
      WHERE id = ?
    `, [
      invoice_status || acceptance.invoice_status,
      invoice_no !== undefined ? invoice_no : acceptance.invoice_no,
      invoice_amount !== undefined ? invoice_amount : acceptance.invoice_amount,
      acceptance.id
    ]);

    const updated = await db.get('SELECT * FROM acceptances WHERE id = ?', [acceptance.id]);

    res.json({ acceptance: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
