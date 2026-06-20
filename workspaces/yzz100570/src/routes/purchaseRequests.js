const express = require('express');
const db = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { generateRequestNo, checkDuplicateRequests, getRequestDetail } = require('../utils/requestUtil');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { item_name, item_spec, quantity, unit, purpose, estimated_budget, urgency, remark } = req.body;

    if (!item_name || !purpose) {
      return res.status(400).json({ error: '物品名称和用途不能为空' });
    }

    const qty = quantity || 1;
    if (qty < 1) {
      return res.status(400).json({ error: '数量必须大于0' });
    }

    const duplicates = await checkDuplicateRequests(item_name, req.user.id);

    const requestNo = await generateRequestNo();

    const result = await db.run(`
      INSERT INTO purchase_requests 
      (request_no, applicant_id, item_name, item_spec, quantity, unit, purpose, 
       estimated_budget, urgency, remark, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `, [
      requestNo,
      req.user.id,
      item_name,
      item_spec || null,
      qty,
      unit || null,
      purpose,
      estimated_budget || null,
      urgency || 'normal',
      remark || null
    ]);

    const detail = await getRequestDetail(result.lastID);

    res.status(201).json({
      request: detail,
      duplicate_warning: duplicates.length > 0 ? duplicates : null,
      message: duplicates.length > 0 ? '检测到类似的采购申请，请注意是否重复' : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const { status, page = 1, page_size = 20 } = req.query;
    
    let sql = `
      SELECT pr.*, u.name as applicant_name
      FROM purchase_requests pr
      JOIN users u ON pr.applicant_id = u.id
      WHERE pr.applicant_id = ?
    `;
    
    const params = [req.user.id];
    
    if (status) {
      sql += ' AND pr.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY pr.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(page_size), (parseInt(page) - 1) * parseInt(page_size));
    
    const list = await db.all(sql, params);
    
    let countSql = 'SELECT COUNT(*) as total FROM purchase_requests WHERE applicant_id = ?';
    const countParams = [req.user.id];
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    const { total } = await db.get(countSql, countParams);
    
    res.json({ list, total, page: parseInt(page), page_size: parseInt(page_size) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pending/admin', authenticate, requireRole('admin', 'leader'), async (req, res) => {
  try {
    const { page = 1, page_size = 20 } = req.query;
    
    const statuses = req.user.role === 'admin' 
      ? "status IN ('submitted', 'admin_review')"
      : "status = 'admin_review'";
    
    const sql = `
      SELECT pr.*, u.name as applicant_name, u.department as applicant_department
      FROM purchase_requests pr
      JOIN users u ON pr.applicant_id = u.id
      WHERE ${statuses}
      ORDER BY pr.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const list = await db.all(sql, [parseInt(page_size), (parseInt(page) - 1) * parseInt(page_size)]);
    
    const countSql = `SELECT COUNT(*) as total FROM purchase_requests WHERE ${statuses}`;
    const { total } = await db.get(countSql);
    
    res.json({ list, total, page: parseInt(page), page_size: parseInt(page_size) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const detail = await getRequestDetail(req.params.id);
    
    if (!detail) {
      return res.status(404).json({ error: '采购申请不存在' });
    }
    
    if (req.user.role === 'employee' && detail.applicant_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看此申请' });
    }
    
    const quotationCount = detail.quotations.length;
    let quotation_warning = null;
    if (detail.status !== 'draft' && quotationCount < 3) {
      quotation_warning = `当前仅 ${quotationCount} 家报价，建议至少 3 家比价`;
    }
    
    res.json({ ...detail, quotation_warning });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { item_name, item_spec, quantity, unit, purpose, estimated_budget, urgency, remark } = req.body;
    
    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [req.params.id]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }
    
    if (request.applicant_id !== req.user.id && req.user.role === 'employee') {
      return res.status(403).json({ error: '无权修改此申请' });
    }
    
    if (request.status !== 'draft') {
      return res.status(400).json({ error: '只能修改草稿状态的申请' });
    }
    
    await db.run(`
      UPDATE purchase_requests SET
        item_name = ?,
        item_spec = ?,
        quantity = ?,
        unit = ?,
        purpose = ?,
        estimated_budget = ?,
        urgency = ?,
        remark = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      item_name || request.item_name,
      item_spec !== undefined ? item_spec : request.item_spec,
      quantity || request.quantity,
      unit !== undefined ? unit : request.unit,
      purpose || request.purpose,
      estimated_budget !== undefined ? estimated_budget : request.estimated_budget,
      urgency || request.urgency,
      remark !== undefined ? remark : request.remark,
      req.params.id
    ]);
    
    const detail = await getRequestDetail(req.params.id);
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [req.params.id]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }
    
    if (request.applicant_id !== req.user.id && req.user.role === 'employee') {
      return res.status(403).json({ error: '无权提交此申请' });
    }
    
    if (request.status !== 'draft') {
      return res.status(400).json({ error: '只能提交草稿状态的申请' });
    }
    
    const { count: quotationCount } = await db.get(
      'SELECT COUNT(*) as count FROM quotations WHERE request_id = ?',
      [req.params.id]
    );
    
    await db.run(
      'UPDATE purchase_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['submitted', req.params.id]
    );
    
    const detail = await getRequestDetail(req.params.id);
    
    res.json({
      request: detail,
      quotation_warning: quotationCount < 3 ? `当前仅 ${quotationCount} 家报价，建议补充至 3 家` : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/check-duplicate', authenticate, async (req, res) => {
  try {
    const { item_name, exclude_id } = req.body;
    
    if (!item_name) {
      return res.status(400).json({ error: '物品名称不能为空' });
    }
    
    const duplicates = await checkDuplicateRequests(item_name, req.user.id, exclude_id);
    
    res.json({
      duplicates,
      has_duplicate: duplicates.length > 0,
      message: duplicates.length > 0 ? `检测到 ${duplicates.length} 条类似申请` : '未检测到类似申请'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
