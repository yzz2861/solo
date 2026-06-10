const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { Parser } = require('json2csv');
const dayjs = require('dayjs');

router.get('/report', (req, res) => {
  const {
    format = 'csv',
    hasBannedWord = '',
    channelRejected = '',
    isOverridden = '',
    reviewStatus = '',
  } = req.query;

  try {
    let whereClauses = [];
    let params = [];

    if (reviewStatus) {
      whereClauses.push('r.review_status = ?');
      params.push(reviewStatus);
    }

    let havingClauses = [];
    if (hasBannedWord === 'true') {
      havingClauses.push('banned_word_count > 0');
    }
    if (channelRejected === 'true') {
      havingClauses.push('channel_rejected_count > 0');
    }
    if (isOverridden === 'true') {
      havingClauses.push('is_overridden = 1');
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const havingSQL = havingClauses.length > 0 ? 'HAVING ' + havingClauses.join(' AND ') : '';

    const sql = `
      SELECT
        m.material_id as '素材编号',
        m.title as '标题',
        m.content as '文案内容',
        m.channel as '投放渠道',
        m.submit_time as '提交时间',
        CASE
          WHEN r.review_status = 'compliant' THEN '合规'
          WHEN r.review_status = 'non_compliant' THEN '不合规'
          WHEN r.review_status = 'pending' THEN '待复核'
          ELSE '未处理'
        END as '复核状态',
        r.review_opinion as '复核意见',
        r.reviewer as '审核员',
        r.review_time as '复核时间',
        CASE WHEN COALESCE(rv_over.overridden_count, 0) > 0 THEN '是' ELSE '否' END as '是否改判',
        r.previous_opinion as '原意见',
        COALESCE(rh_bw.banned_word_count, 0) as '禁用词命中数',
        COALESCE(cf_rej.channel_rejected_count, 0) as '渠道驳回次数',
        COALESCE(rh_all.total_hits, 0) as '规则命中总数'
      FROM materials m
      LEFT JOIN (
        SELECT material_id, review_status, review_opinion, reviewer, review_time, is_overridden, previous_opinion
        FROM reviews
        WHERE id IN (SELECT MAX(id) FROM reviews GROUP BY material_id)
      ) r ON r.material_id = m.material_id
      LEFT JOIN (
        SELECT material_id, COUNT(*) as banned_word_count
        FROM rule_hits
        WHERE rule_type = 'banned_word'
        GROUP BY material_id
      ) rh_bw ON rh_bw.material_id = m.material_id
      LEFT JOIN (
        SELECT material_id, COUNT(*) as channel_rejected_count
        FROM channel_feedbacks
        WHERE status = 'rejected'
        GROUP BY material_id
      ) cf_rej ON cf_rej.material_id = m.material_id
      LEFT JOIN (
        SELECT material_id, COUNT(*) as total_hits
        FROM rule_hits
        GROUP BY material_id
      ) rh_all ON rh_all.material_id = m.material_id
      LEFT JOIN (
        SELECT material_id, COUNT(*) as overridden_count
        FROM reviews
        WHERE is_overridden = 1
        GROUP BY material_id
      ) rv_over ON rv_over.material_id = m.material_id
      ${whereSQL}
      GROUP BY m.id
      ${havingSQL}
      ORDER BY m.created_at DESC
    `;

    const rows = db.prepare(sql).all(...params);

    if (format === 'json') {
      const timestamp = dayjs().format('YYYYMMDD_HHmmss');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="compliance_report_${timestamp}.json"`);
      res.json(rows);
    } else {
      const fields = [
        '素材编号', '标题', '文案内容', '投放渠道', '提交时间',
        '复核状态', '复核意见', '审核员', '复核时间',
        '是否改判', '原意见', '禁用词命中数', '渠道驳回次数', '规则命中总数'
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(rows);

      const timestamp = dayjs().format('YYYYMMDD_HHmmss');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="compliance_report_${timestamp}.csv"`);
      res.send('\uFEFF' + csv);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    const totalMaterials = db.prepare('SELECT COUNT(*) as count FROM materials').get().count;

    const pendingReview = db.prepare(`
      SELECT COUNT(*) as count
      FROM materials m
      LEFT JOIN (
        SELECT material_id, review_status
        FROM reviews
        WHERE id IN (SELECT MAX(id) FROM reviews GROUP BY material_id)
      ) r ON r.material_id = m.material_id
      WHERE r.review_status IS NULL OR r.review_status = 'pending'
    `).get().count;

    const compliantCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM (
        SELECT material_id, review_status
        FROM reviews
        WHERE id IN (SELECT MAX(id) FROM reviews GROUP BY material_id)
      ) r
      WHERE r.review_status = 'compliant'
    `).get().count;

    const nonCompliantCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM (
        SELECT material_id, review_status
        FROM reviews
        WHERE id IN (SELECT MAX(id) FROM reviews GROUP BY material_id)
      ) r
      WHERE r.review_status = 'non_compliant'
    `).get().count;

    const hasBannedWordCount = db.prepare(`
      SELECT COUNT(DISTINCT material_id) as count
      FROM rule_hits
      WHERE rule_type = 'banned_word'
    `).get().count;

    const channelRejectedCount = db.prepare(`
      SELECT COUNT(DISTINCT material_id) as count
      FROM channel_feedbacks
      WHERE status = 'rejected'
    `).get().count;

    const overriddenCount = db.prepare(`
      SELECT COUNT(DISTINCT material_id) as count
      FROM reviews
      WHERE is_overridden = 1
    `).get().count;

    const totalRuleHits = db.prepare('SELECT COUNT(*) as count FROM rule_hits').get().count;

    res.json({
      totalMaterials,
      pendingReview,
      compliantCount,
      nonCompliantCount,
      hasBannedWordCount,
      channelRejectedCount,
      overriddenCount,
      totalRuleHits,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
