const express = require('express');
const { all, get, run } = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');
const summaryService = require('../services/summaryGenerator');

const router = express.Router();
router.use(authenticate);
router.use(requireRole(['supervisor']));

router.get('/revisions', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, has_manual_revision, risk_level } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereClause = 'WHERE s.has_manual_revision = 1';
    let params = [];
    
    if (risk_level) {
      whereClause += ' AND EXISTS (SELECT 1 FROM supervisor_reviews sr WHERE sr.summary_id = s.id AND sr.risk_level = ?)';
      params.push(risk_level);
    }
    
    const summaries = await all(`
      SELECT s.*, c.claim_no, c.customer_name, c.accident_date,
             u.name as generator_name,
             (SELECT COUNT(*) FROM revisions r WHERE r.summary_id = s.id) as revision_count,
             (SELECT MAX(revised_at) FROM revisions r WHERE r.summary_id = s.id) as last_revised_at,
             (SELECT risk_level FROM supervisor_reviews sr WHERE sr.summary_id = s.id ORDER BY sr.reviewed_at DESC LIMIT 1) as current_risk
      FROM summaries s
      LEFT JOIN claims c ON s.claim_id = c.id
      LEFT JOIN users u ON s.generated_by = u.id
      ${whereClause}
      ORDER BY s.generated_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(pageSize), offset]);
    
    const totalResult = await get(`
      SELECT COUNT(*) as total FROM summaries s ${whereClause}
    `, params);
    
    res.json({
      summaries,
      total: totalResult.total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    console.error('获取改判摘要列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/revisions/:summary_id', async (req, res) => {
  try {
    const { summary_id } = req.params;
    
    const detail = await summaryService.getSummaryDetail(summary_id);
    if (!detail) {
      return res.status(404).json({ error: '摘要不存在' });
    }
    
    res.json(detail);
  } catch (err) {
    console.error('获取改判摘要详情错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/:summary_id/review', async (req, res) => {
  try {
    const { summary_id } = req.params;
    const { risk_level, risk_notes, approved } = req.body;
    
    const summary = await get('SELECT * FROM summaries WHERE id = ?', [summary_id]);
    if (!summary) {
      return res.status(404).json({ error: '摘要不存在' });
    }
    
    if (!['low', 'medium', 'high'].includes(risk_level)) {
      return res.status(400).json({ error: '风险等级无效' });
    }
    
    await run(`
      INSERT INTO supervisor_reviews (summary_id, supervisor_id, risk_level, risk_notes, approved)
      VALUES (?, ?, ?, ?, ?)
    `, [summary_id, req.user.id, risk_level, risk_notes || '', approved ? 1 : 0]);
    
    if (approved) {
      await run(`
        UPDATE summaries SET status = 'reviewed' WHERE id = ?
      `, [summary_id]);
    }
    
    const result = await summaryService.getSummaryDetail(summary_id);
    res.json(result);
  } catch (err) {
    console.error('提交审核意见错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/reviews', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, risk_level, approved } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereClause = '';
    let params = [];
    
    if (risk_level) {
      whereClause = 'WHERE sr.risk_level = ?';
      params.push(risk_level);
    }
    
    if (approved !== undefined) {
      whereClause = whereClause ? `${whereClause} AND sr.approved = ?` : 'WHERE sr.approved = ?';
      params.push(approved === '1' || approved === true ? 1 : 0);
    }
    
    const reviews = await all(`
      SELECT sr.*, s.claim_id, s.has_manual_revision,
             c.claim_no, c.customer_name,
             u.name as supervisor_name,
             (SELECT COUNT(*) FROM revisions r WHERE r.summary_id = s.id) as revision_count
      FROM supervisor_reviews sr
      LEFT JOIN summaries s ON sr.summary_id = s.id
      LEFT JOIN claims c ON s.claim_id = c.id
      LEFT JOIN users u ON sr.supervisor_id = u.id
      ${whereClause}
      ORDER BY sr.reviewed_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(pageSize), offset]);
    
    const totalResult = await get(`
      SELECT COUNT(*) as total FROM supervisor_reviews sr ${whereClause}
    `, params);
    
    res.json({
      reviews,
      total: totalResult.total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    console.error('获取审核记录错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const stats = {};
    
    const totalClaims = await get('SELECT COUNT(*) as count FROM claims');
    stats.total_claims = totalClaims.count;
    
    const totalSummaries = await get('SELECT COUNT(*) as count FROM summaries');
    stats.total_summaries = totalSummaries.count;
    
    const revisedSummaries = await get('SELECT COUNT(*) as count FROM summaries WHERE has_manual_revision = 1');
    stats.revised_summaries = revisedSummaries.count;
    
    const reviewedSummaries = await get('SELECT COUNT(*) as count FROM summaries WHERE status = "reviewed"');
    stats.reviewed_summaries = reviewedSummaries.count;
    
    const pendingSummaries = await get(`
      SELECT COUNT(*) as count FROM summaries s
      WHERE s.has_manual_revision = 1
      AND NOT EXISTS (SELECT 1 FROM supervisor_reviews sr WHERE sr.summary_id = s.id AND sr.approved = 1)
    `);
    stats.pending_review = pendingSummaries.count;
    
    const highRiskReviews = await get(`
      SELECT COUNT(*) as count FROM supervisor_reviews 
      WHERE risk_level = 'high' AND approved = 0
    `);
    stats.high_risk_pending = highRiskReviews.count;
    
    const adjusterStats = await all(`
      SELECT u.id, u.name, u.username,
             (SELECT COUNT(*) FROM claims c WHERE c.created_by = u.id) as claim_count,
             (SELECT COUNT(*) FROM summaries s WHERE s.generated_by = u.id) as summary_count,
             (SELECT COUNT(*) FROM summaries s WHERE s.generated_by = u.id AND s.has_manual_revision = 1) as revised_count
      FROM users u
      WHERE u.role = 'adjuster'
      ORDER BY claim_count DESC
    `);
    stats.adjuster_performance = adjusterStats;
    
    const recentRevisions = await all(`
      SELECT r.*, s.claim_id, c.claim_no, c.customer_name,
             u.name as reviser_name
      FROM revisions r
      LEFT JOIN summaries s ON r.summary_id = s.id
      LEFT JOIN claims c ON s.claim_id = c.id
      LEFT JOIN users u ON r.revised_by = u.id
      ORDER BY r.revised_at DESC
      LIMIT 10
    `);
    stats.recent_revisions = recentRevisions;
    
    res.json(stats);
  } catch (err) {
    console.error('获取统计数据错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
