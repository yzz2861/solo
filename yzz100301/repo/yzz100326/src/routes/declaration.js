const express = require('express');
const { parse } = require('csv-parse/sync');
const { db, upsertPackage, updatePackageStatus } = require('../db');

const router = express.Router();

router.post('/import', (req, res) => {
  const { batch_id, records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records 不能为空数组' });
  }

  const batchId = batch_id || `decl_${Date.now()}`;
  let created = 0;
  let skipped = 0;
  let errors = [];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO declarations 
    (package_no, batch_id, sender_name, sender_id_no, receiver_name, receiver_id_no, 
     category, item_name, declared_value, weight, origin_country, raw_csv)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const checkStmt = db.prepare('SELECT id FROM declarations WHERE package_no = ? AND batch_id = ?');

  const tx = db.transaction((records) => {
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const packageNo = r.package_no || r.packageNo || r.包裹号;

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
        r.sender_name || r.senderName || r.发件人 || null,
        r.sender_id_no || r.senderIdNo || r.发件人身份证 || null,
        r.receiver_name || r.receiverName || r.收件人 || null,
        r.receiver_id_no || r.receiverIdNo || r.收件人身份证 || null,
        r.category || r.品类 || null,
        r.item_name || r.itemName || r.物品名称 || null,
        r.declared_value ? parseFloat(r.declared_value) : (r.申报价值 ? parseFloat(r.申报价值) : null),
        r.weight ? parseFloat(r.weight) : (r.重量 ? parseFloat(r.重量) : null),
        r.origin_country || r.originCountry || r.原产国 || null,
        JSON.stringify(r)
      );

      upsertPackage(packageNo, 'declared');
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
      message: `成功导入 ${created} 条，跳过 ${skipped} 条重复记录`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import-csv', (req, res) => {
  const { batch_id, csv_content } = req.body;

  if (!csv_content) {
    return res.status(400).json({ error: 'csv_content 不能为空' });
  }

  try {
    const records = parse(csv_content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    req.body = { batch_id, records };
    router.handle({ ...req, method: 'POST', url: '/import' }, res, (err) => {
      if (err) res.status(500).json({ error: err.message });
    });
  } catch (err) {
    res.status(400).json({ error: 'CSV 解析失败: ' + err.message });
  }
});

router.get('/:package_no', (req, res) => {
  const rows = db.prepare('SELECT * FROM declarations WHERE package_no = ? ORDER BY import_time DESC')
    .all(req.params.package_no);
  res.json({ package_no: req.params.package_no, declarations: rows });
});

module.exports = router;
