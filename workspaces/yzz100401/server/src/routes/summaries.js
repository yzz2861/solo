const express = require('express');
const { get } = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');
const summaryService = require('../services/summaryGenerator');

const router = express.Router();
router.use(authenticate);

router.post('/:claim_id/generate', async (req, res) => {
  try {
    const { claim_id } = req.params;
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [claim_id]);
    if (!claim) {
      return res.status(404).json({ error: '理赔案件不存在' });
    }
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const result = await summaryService.generateSummary(claim_id, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('生成摘要错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.get('/:summary_id', async (req, res) => {
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
    
    const result = await summaryService.getSummaryDetail(summary_id);
    res.json(result);
  } catch (err) {
    console.error('获取摘要详情错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.put('/items/:item_id', async (req, res) => {
  try {
    const { item_id } = req.params;
    const { value, reason } = req.body;
    
    const item = await get('SELECT * FROM summary_items WHERE id = ?', [item_id]);
    if (!item) {
      return res.status(404).json({ error: '摘要项不存在' });
    }
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [item.summary_id]);
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const result = await summaryService.updateSummaryItem(item_id, value, req.user.id, reason);
    res.json(result);
  } catch (err) {
    console.error('更新摘要项错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.post('/:summary_id/items', async (req, res) => {
  try {
    const { summary_id } = req.params;
    const { category, key, value, source_ref } = req.body;
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [summary_id]);
    if (!summary) {
      return res.status(404).json({ error: '摘要不存在' });
    }
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    if (!category || !key || !value) {
      return res.status(400).json({ error: '分类、键名和值不能为空' });
    }
    
    const result = await summaryService.addManualSummaryItem(
      summary_id, category, key, value, source_ref, req.user.id
    );
    res.json(result);
  } catch (err) {
    console.error('添加摘要项错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.delete('/items/:item_id', async (req, res) => {
  try {
    const { item_id } = req.params;
    const { reason } = req.body;
    
    const item = await get('SELECT * FROM summary_items WHERE id = ?', [item_id]);
    if (!item) {
      return res.status(404).json({ error: '摘要项不存在' });
    }
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [item.summary_id]);
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const result = await summaryService.deleteSummaryItem(item_id, req.user.id, reason);
    res.json(result);
  } catch (err) {
    console.error('删除摘要项错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.put('/conflicts/:conflict_id/resolve', async (req, res) => {
  try {
    const { conflict_id } = req.params;
    const { resolved } = req.body;
    
    const conflict = await get('SELECT * FROM conflicts WHERE id = ?', [conflict_id]);
    if (!conflict) {
      return res.status(404).json({ error: '冲突记录不存在' });
    }
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [conflict.summary_id]);
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const result = await summaryService.updateConflictStatus(conflict_id, resolved, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('更新冲突状态错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.put('/missing/:item_id', async (req, res) => {
  try {
    const { item_id } = req.params;
    const { item_name, reason, priority } = req.body;
    
    const item = await get('SELECT * FROM missing_items WHERE id = ?', [item_id]);
    if (!item) {
      return res.status(404).json({ error: '缺失项不存在' });
    }
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [item.summary_id]);
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const result = await summaryService.updateMissingItem(item_id, { item_name, reason, priority }, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('更新缺失项错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.post('/:summary_id/missing', async (req, res) => {
  try {
    const { summary_id } = req.params;
    const { item_name, reason, priority } = req.body;
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [summary_id]);
    if (!summary) {
      return res.status(404).json({ error: '摘要不存在' });
    }
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    if (!item_name) {
      return res.status(400).json({ error: '缺失项名称不能为空' });
    }
    
    const result = await summaryService.addMissingItem(
      summary_id, item_name, reason, priority, req.user.id
    );
    res.json(result);
  } catch (err) {
    console.error('添加缺失项错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.delete('/missing/:item_id', async (req, res) => {
  try {
    const { item_id } = req.params;
    
    const item = await get('SELECT * FROM missing_items WHERE id = ?', [item_id]);
    if (!item) {
      return res.status(404).json({ error: '缺失项不存在' });
    }
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [item.summary_id]);
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const result = await summaryService.deleteMissingItem(item_id, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('删除缺失项错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.put('/followup/:point_id', async (req, res) => {
  try {
    const { point_id } = req.params;
    const { question, reason } = req.body;
    
    const point = await get('SELECT * FROM follow_up_points WHERE id = ?', [point_id]);
    if (!point) {
      return res.status(404).json({ error: '追问点不存在' });
    }
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [point.summary_id]);
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const result = await summaryService.updateFollowUpPoint(point_id, { question, reason }, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('更新追问点错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.post('/:summary_id/followup', async (req, res) => {
  try {
    const { summary_id } = req.params;
    const { question, reason } = req.body;
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [summary_id]);
    if (!summary) {
      return res.status(404).json({ error: '摘要不存在' });
    }
    
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    if (!question) {
      return res.status(400).json({ error: '追问内容不能为空' });
    }
    
    const result = await summaryService.addFollowUpPoint(
      summary_id, question, reason, req.user.id
    );
    res.json(result);
  } catch (err) {
    console.error('添加追问点错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

router.delete('/followup/:point_id', async (req, res) => {
  try {
    const { point_id } = req.params;
    
    const point = await get('SELECT * FROM follow_up_points WHERE id = ?', [point_id]);
    if (!point) {
      return res.status(404).json({ error: '追问点不存在' });
    }
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [point.summary_id]);
    const claim = await get('SELECT * FROM claims WHERE id = ?', [summary.claim_id]);
    
    if (req.user.role === 'adjuster' && claim.created_by !== req.user.id) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    const result = await summaryService.deleteFollowUpPoint(point_id, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('删除追问点错误:', err);
    res.status(500).json({ error: err.message || '服务器错误' });
  }
});

module.exports = router;
