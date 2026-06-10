const db = require('../db/database');

function getBannedWords() {
  return db.prepare('SELECT word, category FROM banned_words').all();
}

function matchBannedWords(text) {
  const hits = [];
  if (!text) return hits;

  const words = getBannedWords();
  for (const w of words) {
    if (text.includes(w.word)) {
      hits.push({
        rule_type: 'banned_word',
        rule_name: `禁用词: ${w.word}`,
        hit_detail: `类别: ${w.category}, 位置: ${text.indexOf(w.word)}`,
      });
    }
  }
  return hits;
}

function checkChannelRejectStillActive(materialId) {
  const hits = [];

  const feedbacks = db.prepare(`
    SELECT * FROM channel_feedbacks
    WHERE material_id = ? AND status = 'rejected'
    ORDER BY feedback_time DESC
  `).all(materialId);

  if (feedbacks.length === 0) return hits;

  const material = db.prepare('SELECT * FROM materials WHERE material_id = ?').get(materialId);
  if (!material) return hits;

  const latestReject = feedbacks[0];
  if (latestReject.reject_reason) {
    hits.push({
      rule_type: 'channel_rejected',
      rule_name: '渠道驳回',
      hit_detail: `渠道: ${latestReject.channel || '未知'}, 原因: ${latestReject.reject_reason}`,
    });
  }

  return hits;
}

function checkOverriddenReview(materialId) {
  const hits = [];

  const reviews = db.prepare(`
    SELECT * FROM reviews
    WHERE material_id = ?
    ORDER BY review_time DESC
  `).all(materialId);

  if (reviews.length < 2) return hits;

  const latest = reviews[0];
  if (latest.is_overridden) {
    hits.push({
      rule_type: 'review_overridden',
      rule_name: '人工改判',
      hit_detail: `原意见: ${latest.previous_opinion || '无'} → 现意见: ${latest.review_opinion || '无'}`,
    });
  }

  return hits;
}

function runAllRules(materialId, importBatch) {
  const material = db.prepare('SELECT * FROM materials WHERE material_id = ?').get(materialId);
  if (!material) return [];

  const allHits = [];

  const bannedHits = matchBannedWords(material.title + ' ' + material.content);
  allHits.push(...bannedHits);

  const channelHits = checkChannelRejectStillActive(materialId);
  allHits.push(...channelHits);

  const reviewHits = checkOverriddenReview(materialId);
  allHits.push(...reviewHits);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO rule_hits (material_id, rule_type, rule_name, hit_detail, hit_time, import_batch)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  for (const hit of allHits) {
    insert.run(materialId, hit.rule_type, hit.rule_name, hit.hit_detail, now, importBatch);
  }

  return allHits;
}

function getRuleHits(materialId) {
  return db.prepare(`
    SELECT * FROM rule_hits
    WHERE material_id = ?
    ORDER BY created_at DESC
  `).all(materialId);
}

module.exports = {
  getBannedWords,
  matchBannedWords,
  checkChannelRejectStillActive,
  checkOverriddenReview,
  runAllRules,
  getRuleHits,
};
