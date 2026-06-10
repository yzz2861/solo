const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.post('/:tripId', (req, res) => {
  const { tripId } = req.params;
  const { opinion, reviewer, is_closed = false, anomaly_type } = req.body;

  if (!opinion) {
    return res.status(400).json({ error: '缺少必填字段: opinion' });
  }

  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
  if (!trip) {
    return res.status(404).json({ error: '车次不存在' });
  }

  const info = db.prepare(`
    INSERT INTO review_records (trip_id, anomaly_type, opinion, reviewer, is_closed)
    VALUES (?, ?, ?, ?, ?)
  `).run(tripId, anomaly_type || null, opinion, reviewer || null, is_closed ? 1 : 0);

  const updateFields = ['review_opinion = ?', "review_time = datetime('now')", "updated_at = datetime('now')"];
  const updateValues = [opinion];

  if (reviewer) {
    updateFields.push('reviewed_by = ?');
    updateValues.push(reviewer);
  }

  if (is_closed) {
    updateFields.push('is_review_closed = 1');
    updateFields.push("status = 'reviewed'");
  }

  updateValues.push(tripId);
  db.prepare(`
    UPDATE trips SET ${updateFields.join(', ')} WHERE id = ?
  `).run(...updateValues);

  const updatedTrip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);

  res.status(201).json({
    message: is_closed ? '复核意见已提交，异常已关闭' : '复核意见已提交',
    review_id: info.lastInsertRowid,
    trip: updatedTrip
  });
});

router.post('/batch/close', (req, res) => {
  const { trip_ids, opinion, reviewer } = req.body;

  if (!Array.isArray(trip_ids) || trip_ids.length === 0) {
    return res.status(400).json({ error: 'trip_ids 必须是非空数组' });
  }
  if (!opinion) {
    return res.status(400).json({ error: '缺少必填字段: opinion' });
  }

  let success = 0;
  let failed = 0;
  const results = [];

  for (const tripId of trip_ids) {
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
      if (!trip) {
        failed++;
        results.push({ trip_id: tripId, error: '车次不存在' });
        continue;
      }

      db.prepare(`
        INSERT INTO review_records (trip_id, opinion, reviewer, is_closed)
        VALUES (?, ?, ?, 1)
      `).run(tripId, opinion, reviewer || null);

      db.prepare(`
        UPDATE trips
        SET review_opinion = ?,
            reviewed_by = ?,
            is_review_closed = 1,
            status = 'reviewed',
            review_time = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(opinion, reviewer || null, tripId);

      success++;
      results.push({ trip_id: tripId, success: true });
    } catch (e) {
      failed++;
      results.push({ trip_id: tripId, error: e.message });
    }
  }

  res.json({
    total: trip_ids.length,
    success,
    failed,
    results
  });
});

router.get('/trip/:tripId', (req, res) => {
  const { tripId } = req.params;

  const records = db.prepare(`
    SELECT * FROM review_records
    WHERE trip_id = ?
    ORDER BY created_at DESC
  `).all(tripId);

  res.json({
    trip_id: tripId,
    total: records.length,
    records
  });
});

router.get('/', (req, res) => {
  const { reviewer, is_closed, start_date, end_date, page = 1, page_size = 20 } = req.query;

  let sql = 'SELECT * FROM review_records WHERE 1=1';
  const params = [];

  if (reviewer) {
    sql += ' AND reviewer = ?';
    params.push(reviewer);
  }
  if (is_closed !== undefined) {
    sql += ' AND is_closed = ?';
    params.push(is_closed === 'true' || is_closed === '1' ? 1 : 0);
  }
  if (start_date) {
    sql += ' AND date(created_at) >= date(?)';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND date(created_at) <= date(?)';
    params.push(end_date);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as cnt');
  const total = db.prepare(countSql).get(...params).cnt;

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), (Number(page) - 1) * Number(page_size));

  const records = db.prepare(sql).all(...params);

  res.json({
    total,
    page: Number(page),
    page_size: Number(page_size),
    records
  });
});

module.exports = router;
