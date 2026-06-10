const express = require('express');
const { db, upsertPackage, updatePackageStatus } = require('../db');

const router = express.Router();

router.post('/import', (req, res) => {
  const { batch_id, records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records 不能为空数组' });
  }

  const batchId = batch_id || `supp_${Date.now()}`;
  let created = 0;
  let skipped = 0;
  let errors = [];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO supplementary
    (package_no, batch_id, id_proof_url, id_proof_type, id_verified,
     item_category, item_quantity, purchase_receipt_url, additional_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const checkStmt = db.prepare('SELECT id FROM supplementary WHERE package_no = ? AND batch_id = ?');

  const tx = db.transaction((records) => {
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const packageNo = r.package_no || r.packageNo;

      if (!packageNo) {
        errors.push({ row: i + 1, error: '缺少包裹号' });
        continue;
      }

      const existing = checkStmt.get(packageNo, batchId);
      if (existing) {
        skipped++;
        continue;
      }

      insertStmt.run(
        packageNo,
        batchId,
        r.id_proof_url || r.idProofUrl || null,
        r.id_proof_type || r.idProofType || null,
        r.id_verified ? 1 : 0,
        r.item_category || r.itemCategory || null,
        r.item_quantity ? parseInt(r.item_quantity) : null,
        r.purchase_receipt_url || r.purchaseReceiptUrl || null,
        r.additional_info || r.additionalInfo || null
      );

      const pkg = upsertPackage(packageNo, null);
      if (pkg.created) {
        updatePackageStatus(packageNo, 'supplementary');
      } else {
        const pkgRow = db.prepare('SELECT status FROM packages WHERE package_no = ?').get(packageNo);
        if (pkgRow.status === 'pending' || pkgRow.status === 'declared') {
          updatePackageStatus(packageNo, 'supplementary');
        }
      }
      created++;
    }
  });

  try {
    tx(records);
    res.json({
      batch_id: batchId,
      total: records.length,
      created,
      skipped,
      errors,
      message: `成功导入 ${created} 条补录资料，跳过 ${skipped} 条重复记录`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:package_no', (req, res) => {
  const rows = db.prepare('SELECT * FROM supplementary WHERE package_no = ? ORDER BY import_time DESC')
    .all(req.params.package_no);
  res.json({ package_no: req.params.package_no, supplementary: rows });
});

module.exports = router;
