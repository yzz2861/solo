const express = require('express');
const { get } = require('../database');
const { authenticate } = require('../middleware/auth');
const exportService = require('../services/exportService');

const router = express.Router();
router.use(authenticate);

router.post('/:summary_id/customer', async (req, res) => {
  try {
    const { summary_id } = req.params;
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [summary_id]);
    if (!summary) {
      return res.status(404).json({ error: '摘要不存在' });
    }
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const result = await exportService.generateCustomerExport(summary_id, req.user.id);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.title)}.txt"`);
    
    res.json(result);
  } catch (err) {
    console.error('导出客户版错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.post('/:summary_id/internal', async (req, res) => {
  try {
    const { summary_id } = req.params;
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [summary_id]);
    if (!summary) {
      return res.status(404).json({ error: '摘要不存在' });
    }
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const result = await exportService.generateInternalExport(summary_id, req.user.id);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.title)}.txt"`);
    
    res.json(result);
  } catch (err) {
    console.error('导出内部版错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

module.exports = router;
