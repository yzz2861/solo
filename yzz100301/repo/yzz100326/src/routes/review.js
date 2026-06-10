const express = require('express');
const { db, updatePackageStatus } = require('../db');

const router = express.Router();

const VALID_STATUSES = [
  'pending', 'declared', 'supplementary',
  'inspected', 'inspection_pass', 'inspection_fail',
  'reviewing', 'review_pass', 'review_fail',
  'released', 'held', 'returned'
];

router.post('/:package_no', (req, res) => {
  const { package_no } = req.params;
  const { reviewer, comment, status } = req.body;

  const pkg = db.prepare('SELECT * FROM packages WHERE package_no = ?').get(package_no);
  if (!pkg) {
    return res.status(404).json({ error: '包裹不存在' });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `无效状态，有效值: ${VALID_STATUSES.join(', ')}` });
  }

  if (!comment && !status) {
    return res.status(400).json({ error: '至少提供 comment 或 status' });
  }

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO reviews (package_no, reviewer, review_comment, review_status)
      VALUES (?, ?, ?, ?)
    `).run(package_no, reviewer || null, comment || null, status || null);

    if (status) {
      updatePackageStatus(package_no, status);
    }
  });

  try {
    tx();
    const updated = db.prepare('SELECT * FROM packages WHERE package_no = ?').get(package_no);
    const reviews = db.prepare('SELECT * FROM reviews WHERE package_no = ? ORDER BY created_at DESC').all(package_no);

    res.json({
      message: '复核记录已保存',
      package: updated,
      latest_review: reviews[0],
      reviews
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:package_no', (req, res) => {
  const rows = db.prepare('SELECT * FROM reviews WHERE package_no = ? ORDER BY created_at DESC')
    .all(req.params.package_no);
  res.json({ package_no: req.params.package_no, reviews: rows });
});

router.get('/', (req, res) => {
  const { status, reviewer, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let whereClauses = [];
  let params = [];

  if (status) {
    whereClauses.push('review_status = ?');
    params.push(status);
  }
  if (reviewer) {
    whereClauses.push('reviewer = ?');
    params.push(reviewer);
  }

  const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as count FROM reviews ${whereStr}`).get(...params).count;
  const rows = db.prepare(`
    SELECT r.*, p.status as package_status
    FROM reviews r
    JOIN packages p ON p.package_no = r.package_no
    ${whereStr}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), parseInt(offset));

  res.json({
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows
  });
});

module.exports = router;
