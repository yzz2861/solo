const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getRuleHits, runAllRules, getBannedWords } = require('../db/ruleEngine');

router.get('/', (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    keyword = '',
    ruleType = '',
    reviewStatus = '',
    hasBannedWord = '',
    channelRejected = '',
    isOverridden = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = req.query;

  const pageNum = parseInt(page, 10);
  const size = parseInt(pageSize, 10);
  const offset = (pageNum - 1) * size;

  let whereClauses = [];
  let params = [];

  if (keyword) {
    whereClauses.push('(m.material_id LIKE ? OR m.title LIKE ? OR m.content LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }

  if (reviewStatus) {
    whereClauses.push('r.review_status = ?');
    params.push(reviewStatus);
  }

  let havingClauses = [];

  if (hasBannedWord === 'true') {
    havingClauses.push('banned_word_count > 0');
  } else if (hasBannedWord === 'false') {
    havingClauses.push('banned_word_count = 0');
  }

  if (channelRejected === 'true') {
    havingClauses.push('channel_rejected_count > 0');
  } else if (channelRejected === 'false') {
    havingClauses.push('channel_rejected_count = 0');
  }

  if (isOverridden === 'true') {
    havingClauses.push('overridden_count > 0');
  }

  const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
  const havingSQL = havingClauses.length > 0 ? 'HAVING ' + havingClauses.join(' AND ') : '';

  const validSortColumns = ['created_at', 'submit_time', 'material_id'];
  const orderColumn = validSortColumns.includes(sortBy) ? `m.${sortBy}` : 'm.created_at';
  const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countSQL = `
    SELECT COUNT(*) as total FROM (
      SELECT m.id
      FROM materials m
      LEFT JOIN reviews r ON r.material_id = m.material_id
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
        SELECT material_id, COUNT(*) as overridden_count
        FROM reviews
        WHERE is_overridden = 1
        GROUP BY material_id
      ) rv_over ON rv_over.material_id = m.material_id
      ${whereSQL}
      GROUP BY m.id
      ${havingSQL}
    ) sub
  `;

  const listSQL = `
    SELECT
      m.id,
      m.material_id,
      m.title,
      m.content,
      m.channel,
      m.submit_time,
      m.created_at,
      r.review_status,
      r.review_opinion,
      r.reviewer,
      r.review_time,
      CASE WHEN COALESCE(rv_over.overridden_count, 0) > 0 THEN 1 ELSE 0 END as is_overridden,
      COALESCE(rh_bw.banned_word_count, 0) as banned_word_count,
      COALESCE(cf_rej.channel_rejected_count, 0) as channel_rejected_count,
      COALESCE(rh_all.total_hits, 0) as total_rule_hits
    FROM materials m
    LEFT JOIN (
      SELECT material_id, review_status, review_opinion, reviewer, review_time, is_overridden
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
    ORDER BY ${orderColumn} ${orderDir}
    LIMIT ? OFFSET ?
  `;

  params.push(size, offset);

  try {
    const countResult = db.prepare(countSQL).get(...params.slice(0, -2));
    const list = db.prepare(listSQL).all(...params);

    res.json({
      list,
      total: countResult ? countResult.total : 0,
      page: pageNum,
      pageSize: size,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const material = db.prepare('SELECT * FROM materials WHERE material_id = ? OR id = ?').get(id, id);
    if (!material) {
      return res.status(404).json({ error: '素材不存在' });
    }

    const ruleHits = getRuleHits(material.material_id);

    const channelFeedbacks = db.prepare(`
      SELECT * FROM channel_feedbacks
      WHERE material_id = ?
      ORDER BY feedback_time DESC
    `).all(material.material_id);

    const reviews = db.prepare(`
      SELECT * FROM reviews
      WHERE material_id = ?
      ORDER BY review_time DESC
    `).all(material.material_id);

    res.json({
      material,
      ruleHits,
      channelFeedbacks,
      reviews,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/review', (req, res) => {
  const { id } = req.params;
  const { review_status, review_opinion, reviewer } = req.body;

  try {
    const material = db.prepare('SELECT * FROM materials WHERE material_id = ? OR id = ?').get(id, id);
    if (!material) {
      return res.status(404).json({ error: '素材不存在' });
    }

    const latestReview = db.prepare(`
      SELECT * FROM reviews
      WHERE material_id = ?
      ORDER BY review_time DESC
      LIMIT 1
    `).get(material.material_id);

    let isOverridden = 0;
    let previousOpinion = '';

    if (latestReview && (latestReview.review_opinion !== review_opinion || latestReview.review_status !== review_status)) {
      isOverridden = 1;
      previousOpinion = latestReview.review_opinion || '';
    }

    const insert = db.prepare(`
      INSERT INTO reviews (material_id, reviewer, review_status, review_opinion, previous_opinion, is_overridden)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      material.material_id,
      reviewer || '审核员',
      review_status || 'pending',
      review_opinion || '',
      previousOpinion,
      isOverridden
    );

    const newReview = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);

    res.json({
      success: true,
      review: newReview,
      is_overridden: isOverridden,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
