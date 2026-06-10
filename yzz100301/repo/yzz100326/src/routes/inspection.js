const express = require('express');
const { db, upsertPackage, updatePackageStatus } = require('../db');

const router = express.Router();

router.post('/import', (req, res) => {
  const { batch_id, records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records 不能为空数组' });
  }

  const batchId = batch_id || `insp_${Date.now()}`;
  let created = 0;
  let skipped = 0;
  let errors = [];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO inspections
    (package_no, batch_id, inspect_result, inspect_time, inspector,
     category_checked, category_match, id_checked, id_match,
     value_checked, value_match, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const checkStmt = db.prepare('SELECT id FROM inspections WHERE package_no = ? AND batch_id = ?');

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
        r.inspect_result || r.inspectResult || null,
        r.inspect_time || r.inspectTime || null,
        r.inspector || null,
        r.category_checked || r.categoryChecked || null,
        r.category_match === true || r.categoryMatch === true ? 1 : (r.category_match === false || r.categoryMatch === false ? 0 : null),
        r.id_checked ? 1 : (r.idChecked ? 1 : null),
        r.id_match === true || r.idMatch === true ? 1 : (r.id_match === false || r.idMatch === false ? 0 : null),
        r.value_checked ? parseFloat(r.value_checked) : (r.valueChecked ? parseFloat(r.valueChecked) : null),
        r.value_match === true || r.valueMatch === true ? 1 : (r.value_match === false || r.valueMatch === false ? 0 : null),
        r.notes || null
      );

      const pkg = upsertPackage(packageNo, null);
      const result = r.inspect_result || r.inspectResult;
      let newStatus = 'inspected';
      if (result === 'pass' || result === '通过') {
        newStatus = 'inspection_pass';
      } else if (result === 'fail' || result === '不通过' || result === '未通过') {
        newStatus = 'inspection_fail';
      }
      updatePackageStatus(packageNo, newStatus);

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
      message: `成功导入 ${created} 条查验结果，跳过 ${skipped} 条重复记录`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:package_no', (req, res) => {
  const rows = db.prepare('SELECT * FROM inspections WHERE package_no = ? ORDER BY import_time DESC')
    .all(req.params.package_no);
  res.json({ package_no: req.params.package_no, inspections: rows });
});

module.exports = router;
