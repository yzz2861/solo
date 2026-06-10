const express = require('express');
const { db } = require('../db');

const router = express.Router();

function getPackageFullInfo(packageNo) {
  const pkg = db.prepare('SELECT * FROM packages WHERE package_no = ?').get(packageNo);
  if (!pkg) return null;

  const declarations = db.prepare('SELECT * FROM declarations WHERE package_no = ? ORDER BY import_time DESC').all(packageNo);
  const supplementary = db.prepare('SELECT * FROM supplementary WHERE package_no = ? ORDER BY import_time DESC').all(packageNo);
  const inspections = db.prepare('SELECT * FROM inspections WHERE package_no = ? ORDER BY import_time DESC').all(packageNo);
  const reviews = db.prepare('SELECT * FROM reviews WHERE package_no = ? ORDER BY created_at DESC').all(packageNo);

  const latestDecl = declarations[0];
  const latestSupp = supplementary[0];
  const latestInsp = inspections[0];
  const latestReview = reviews[0];

  const issues = [];

  const hasIdProof = (latestDecl && latestDecl.receiver_id_no) ||
    (latestSupp && latestSupp.id_proof_url && latestSupp.id_verified);
  if (!hasIdProof) {
    issues.push({ type: 'missing_id_proof', severity: 'high', message: '身份证明缺失' });
  }

  const declCategory = latestDecl ? latestDecl.category : null;
  const suppCategory = latestSupp ? latestSupp.item_category : null;
  const inspCategory = latestInsp ? latestInsp.category_checked : null;
  const categoryMatch = latestInsp ? latestInsp.category_match : null;

  if (declCategory && suppCategory && declCategory !== suppCategory) {
    issues.push({ type: 'category_mismatch', severity: 'medium', message: `申报品类(${declCategory})与补录品类(${suppCategory})不一致` });
  }

  if (categoryMatch === 0) {
    issues.push({ type: 'inspection_category_mismatch', severity: 'high', message: '海关查验品类不一致' });
  }

  if (latestInsp && (latestInsp.inspect_result === 'fail' || latestInsp.inspect_result === '不通过' || latestInsp.inspect_result === '未通过')) {
    if (pkg.status === 'released' || pkg.status === 'review_pass') {
      issues.push({ type: 'failed_but_released', severity: 'critical', message: '查验未通过但已放行' });
    }
  }

  return {
    package_no: packageNo,
    status: pkg.status,
    created_at: pkg.created_at,
    updated_at: pkg.updated_at,
    declarations,
    supplementary,
    inspections,
    reviews,
    latest_review: latestReview || null,
    issues,
    has_issues: issues.length > 0
  };
}

router.get('/:package_no', (req, res) => {
  const info = getPackageFullInfo(req.params.package_no);
  if (!info) {
    return res.status(404).json({ error: '包裹不存在' });
  }
  res.json(info);
});

router.get('/', (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  let params = [];

  if (status) {
    whereClause = 'WHERE status = ?';
    params.push(status);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM packages ${whereClause}`).get(...params).count;
  const rows = db.prepare(`SELECT package_no, status, created_at, updated_at FROM packages ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .all(...params, parseInt(limit), parseInt(offset));

  res.json({
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows
  });
});

router.get('/anomaly/missing-id', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const sql = `
    SELECT p.package_no, p.status, p.updated_at,
           d.receiver_id_no, d.sender_id_no,
           s.id_proof_url, s.id_verified
    FROM packages p
    LEFT JOIN declarations d ON d.package_no = p.package_no
    LEFT JOIN supplementary s ON s.package_no = p.package_no
    WHERE (d.receiver_id_no IS NULL OR d.receiver_id_no = '')
      AND (s.id_proof_url IS NULL OR s.id_proof_url = '' OR s.id_verified = 0)
    GROUP BY p.package_no
    ORDER BY p.updated_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(DISTINCT p.package_no) as count
    FROM packages p
    LEFT JOIN declarations d ON d.package_no = p.package_no
    LEFT JOIN supplementary s ON s.package_no = p.package_no
    WHERE (d.receiver_id_no IS NULL OR d.receiver_id_no = '')
      AND (s.id_proof_url IS NULL OR s.id_proof_url = '' OR s.id_verified = 0)
  `;

  const total = db.prepare(countSql).get().count;
  const data = db.prepare(sql).all(parseInt(limit), parseInt(offset));

  res.json({
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    anomaly_type: 'missing_id_proof',
    description: '身份证明缺失的包裹',
    data
  });
});

router.get('/anomaly/category-mismatch', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const sql = `
    SELECT p.package_no, p.status, p.updated_at,
           d.category as decl_category,
           s.item_category as supp_category,
           i.category_checked as insp_category,
           i.category_match
    FROM packages p
    JOIN declarations d ON d.package_no = p.package_no
    JOIN supplementary s ON s.package_no = p.package_no
    LEFT JOIN inspections i ON i.package_no = p.package_no
    WHERE d.category IS NOT NULL AND s.item_category IS NOT NULL
      AND d.category != s.item_category
    GROUP BY p.package_no
    ORDER BY p.updated_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(DISTINCT p.package_no) as count
    FROM packages p
    JOIN declarations d ON d.package_no = p.package_no
    JOIN supplementary s ON s.package_no = p.package_no
    WHERE d.category IS NOT NULL AND s.item_category IS NOT NULL
      AND d.category != s.item_category
  `;

  const total = db.prepare(countSql).get().count;
  const data = db.prepare(sql).all(parseInt(limit), parseInt(offset));

  res.json({
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    anomaly_type: 'category_mismatch',
    description: '品类申报不一致的包裹',
    data
  });
});

router.get('/anomaly/failed-but-released', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const sql = `
    SELECT p.package_no, p.status, p.updated_at,
           i.inspect_result, i.inspect_time, i.inspector, i.notes
    FROM packages p
    JOIN inspections i ON i.package_no = p.package_no
    WHERE (i.inspect_result = 'fail' OR i.inspect_result = '不通过' OR i.inspect_result = '未通过')
      AND (p.status = 'released' OR p.status = 'review_pass')
    GROUP BY p.package_no
    ORDER BY p.updated_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(DISTINCT p.package_no) as count
    FROM packages p
    JOIN inspections i ON i.package_no = p.package_no
    WHERE (i.inspect_result = 'fail' OR i.inspect_result = '不通过' OR i.inspect_result = '未通过')
      AND (p.status = 'released' OR p.status = 'review_pass')
  `;

  const total = db.prepare(countSql).get().count;
  const data = db.prepare(sql).all(parseInt(limit), parseInt(offset));

  res.json({
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    anomaly_type: 'failed_but_released',
    description: '查验未通过但已放行的包裹',
    data
  });
});

router.get('/anomaly/all', (req, res) => {
  const missingId = db.prepare(`
    SELECT COUNT(DISTINCT p.package_no) as count
    FROM packages p
    LEFT JOIN declarations d ON d.package_no = p.package_no
    LEFT JOIN supplementary s ON s.package_no = p.package_no
    WHERE (d.receiver_id_no IS NULL OR d.receiver_id_no = '')
      AND (s.id_proof_url IS NULL OR s.id_proof_url = '' OR s.id_verified = 0)
  `).get().count;

  const categoryMismatch = db.prepare(`
    SELECT COUNT(DISTINCT p.package_no) as count
    FROM packages p
    JOIN declarations d ON d.package_no = p.package_no
    JOIN supplementary s ON s.package_no = p.package_no
    WHERE d.category IS NOT NULL AND s.item_category IS NOT NULL
      AND d.category != s.item_category
  `).get().count;

  const failedReleased = db.prepare(`
    SELECT COUNT(DISTINCT p.package_no) as count
    FROM packages p
    JOIN inspections i ON i.package_no = p.package_no
    WHERE (i.inspect_result = 'fail' OR i.inspect_result = '不通过' OR i.inspect_result = '未通过')
      AND (p.status = 'released' OR p.status = 'review_pass')
  `).get().count;

  const totalPkgs = db.prepare('SELECT COUNT(*) as count FROM packages').get().count;

  res.json({
    total_packages: totalPkgs,
    anomalies: {
      missing_id_proof: missingId,
      category_mismatch: categoryMismatch,
      failed_but_released: failedReleased
    }
  });
});

module.exports = router;
module.exports.getPackageFullInfo = getPackageFullInfo;
