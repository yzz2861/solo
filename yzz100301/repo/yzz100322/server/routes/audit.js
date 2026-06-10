const express = require('express');
const { prepare } = require('../db');
const dayjs = require('dayjs');

const router = express.Router();

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { audit_status, audit_opinion, auditor } = req.body;

    const record = prepare('SELECT * FROM visit_records WHERE id = ?').get(id);
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    const updateStmt = prepare(`
      UPDATE visit_records 
      SET audit_status = ?, 
          audit_opinion = ?, 
          audit_time = datetime('now', 'localtime'),
          auditor = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);

    updateStmt.run(
      audit_status || record.audit_status,
      audit_opinion !== undefined ? audit_opinion : record.audit_opinion,
      auditor || record.auditor || '安保主管',
      id
    );

    const updated = prepare('SELECT * FROM visit_records WHERE id = ?').get(id);

    res.json({
      success: true,
      data: updated,
      message: '复核意见已更新'
    });
  } catch (err) {
    console.error('更新复核意见出错:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch', (req, res) => {
  try {
    const { ids, audit_status, audit_opinion, auditor } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要复核的记录' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const updateStmt = prepare(`
      UPDATE visit_records 
      SET audit_status = ?, 
          audit_opinion = ?, 
          audit_time = datetime('now', 'localtime'),
          auditor = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id IN (${placeholders})
    `);

    const result = updateStmt.run(
      audit_status || 'reviewed',
      audit_opinion || '',
      auditor || '安保主管',
      ...ids
    );

    res.json({
      success: true,
      updatedCount: result.changes || ids.length,
      message: `已批量复核 ${result.changes || ids.length} 条记录`
    });
  } catch (err) {
    console.error('批量复核出错:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/status/options', (req, res) => {
  res.json({
    success: true,
    data: [
      { value: 'pending', label: '待复核' },
      { value: 'normal', label: '正常放行' },
      { value: 'warning', label: '需关注' },
      { value: 'abnormal', label: '异常放行' },
      { value: 'reviewed', label: '已复核' }
    ]
  });
});

module.exports = router;
