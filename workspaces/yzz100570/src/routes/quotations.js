const express = require('express');
const db = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getRequestDetail } = require('../utils/requestUtil');

const router = express.Router({ mergeParams: true });

const canEditQuotation = (request, user) => {
  if (user.role === 'admin') return true;
  if (user.role === 'leader') return true;
  if (user.id === request.applicant_id && request.status === 'draft') return true;
  return false;
};

const isAmountLocked = (request) => {
  const lockedStatuses = ['leader_approved', 'ordered', 'accepted'];
  return lockedStatuses.includes(request.status);
};

router.post('/', authenticate, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const { supplier_name, supplier_contact, unit_price, total_price, delivery_days } = req.body;

    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [requestId]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    if (!canEditQuotation(request, req.user)) {
      return res.status(403).json({ error: '无权添加报价' });
    }

    if (isAmountLocked(request)) {
      return res.status(400).json({ error: '申请已审批通过，无法添加报价' });
    }

    if (!supplier_name || !unit_price || !total_price) {
      return res.status(400).json({ error: '供应商名称、单价和总价不能为空' });
    }

    const result = await db.run(`
      INSERT INTO quotations (request_id, supplier_name, supplier_contact, unit_price, total_price, delivery_days)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      requestId,
      supplier_name,
      supplier_contact || null,
      unit_price,
      total_price,
      delivery_days || null
    ]);

    const quotation = await db.get('SELECT * FROM quotations WHERE id = ?', [result.lastID]);
    
    const { count } = await db.get('SELECT COUNT(*) as count FROM quotations WHERE request_id = ?', [requestId]);

    res.status(201).json({
      quotation,
      quotation_count: count,
      message: count < 3 ? `当前已有 ${count} 家报价，建议至少 3 家比价` : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/upload-image', authenticate, upload.single('image'), async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const quotationId = req.params.id;

    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [requestId]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    const quotation = await db.get('SELECT * FROM quotations WHERE id = ? AND request_id = ?', [quotationId, requestId]);
    
    if (!quotation) {
      return res.status(404).json({ error: '报价不存在' });
    }

    if (!canEditQuotation(request, req.user)) {
      return res.status(403).json({ error: '无权修改报价' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const imagePath = `/uploads/quotations/${req.file.filename}`;
    
    await db.run('UPDATE quotations SET quote_image = ? WHERE id = ?', [imagePath, quotationId]);

    const updated = await db.get('SELECT * FROM quotations WHERE id = ?', [quotationId]);
    
    res.json({ quotation: updated, image_url: imagePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const requestId = req.params.requestId;

    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [requestId]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    if (req.user.role === 'employee' && request.applicant_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看此申请的报价' });
    }

    const quotations = await db.all(
      'SELECT * FROM quotations WHERE request_id = ? ORDER BY total_price ASC',
      [requestId]
    );
    
    const count = quotations.length;

    res.json({
      quotations,
      count,
      warning: count < 3 ? `当前仅 ${count} 家报价，建议至少 3 家比价` : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const quotationId = req.params.id;
    const { supplier_name, supplier_contact, unit_price, total_price, delivery_days, is_selected } = req.body;

    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [requestId]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    const quotation = await db.get('SELECT * FROM quotations WHERE id = ? AND request_id = ?', [quotationId, requestId]);
    
    if (!quotation) {
      return res.status(404).json({ error: '报价不存在' });
    }

    if (!canEditQuotation(request, req.user)) {
      return res.status(403).json({ error: '无权修改报价' });
    }

    if (isAmountLocked(request) && (unit_price !== undefined || total_price !== undefined)) {
      return res.status(400).json({ error: '申请已审批通过，无法修改报价金额' });
    }

    await db.run(`
      UPDATE quotations SET
        supplier_name = ?,
        supplier_contact = ?,
        unit_price = ?,
        total_price = ?,
        delivery_days = ?,
        is_selected = ?
      WHERE id = ?
    `, [
      supplier_name || quotation.supplier_name,
      supplier_contact !== undefined ? supplier_contact : quotation.supplier_contact,
      unit_price !== undefined ? unit_price : quotation.unit_price,
      total_price !== undefined ? total_price : quotation.total_price,
      delivery_days !== undefined ? delivery_days : quotation.delivery_days,
      is_selected !== undefined ? (is_selected ? 1 : 0) : quotation.is_selected,
      quotationId
    ]);

    const updated = await db.get('SELECT * FROM quotations WHERE id = ?', [quotationId]);
    
    res.json({ quotation: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const quotationId = req.params.id;

    const request = await db.get('SELECT * FROM purchase_requests WHERE id = ?', [requestId]);
    
    if (!request) {
      return res.status(404).json({ error: '采购申请不存在' });
    }

    const quotation = await db.get('SELECT * FROM quotations WHERE id = ? AND request_id = ?', [quotationId, requestId]);
    
    if (!quotation) {
      return res.status(404).json({ error: '报价不存在' });
    }

    if (!canEditQuotation(request, req.user)) {
      return res.status(403).json({ error: '无权删除报价' });
    }

    if (isAmountLocked(request)) {
      return res.status(400).json({ error: '申请已审批通过，无法删除报价' });
    }

    await db.run('DELETE FROM quotations WHERE id = ?', [quotationId]);

    const { count } = await db.get('SELECT COUNT(*) as count FROM quotations WHERE request_id = ?', [requestId]);

    res.json({ 
      success: true,
      remaining_count: count,
      warning: count < 3 ? `当前剩余 ${count} 家报价，建议至少 3 家比价` : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
