const express = require('express');
const { get, run, all } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function generateBatchNo(activityId) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GS-${activityId}-${dateStr}-${random}`;
}

function getAppealTypeLabel(type) {
  const labels = {
    'missed_sign': '缺签补录',
    'extended_activity': '活动延时',
    'admin_error': '管理员录错'
  };
  return labels[type] || type;
}

router.post('/generate', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  const { activity_id } = req.body;

  if (!activity_id) {
    return res.status(400).json({ error: '活动ID不能为空' });
  }

  try {
    const activity = await get('SELECT * FROM activities WHERE id = ?', [activity_id]);
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }

    if (req.user.role === 'activity_manager' && activity.manager_id !== req.user.id) {
      return res.status(403).json({ error: '无权生成该活动的公示' });
    }

    const records = await all(`
      SELECT ar.*, u.name as volunteer_name
      FROM attendance_records ar
      JOIN users u ON ar.volunteer_id = u.id
      WHERE ar.activity_id = ?
      ORDER BY ar.hours DESC
    `, [activity_id]);

    const batchNo = generateBatchNo(activity_id);

    const pubResult = await run(`
      INSERT INTO publications (activity_id, batch_no, status, created_by)
      VALUES (?, ?, 'pending_review', ?)
    `, [activity_id, batchNo, req.user.id]);

    const publicationId = pubResult.lastID;

    for (const record of records) {
      const approvedAppeal = await get(`
        SELECT * FROM appeals
        WHERE activity_id = ? AND volunteer_id = ? AND status = 'approved'
        ORDER BY updated_at DESC
        LIMIT 1
      `, [activity_id, record.volunteer_id]);

      let isCorrected = 0;
      let correctionReason = null;
      let appealId = null;
      const originalHours = record.hours;

      if (approvedAppeal) {
        isCorrected = 1;
        correctionReason = getAppealTypeLabel(approvedAppeal.appeal_type);
        appealId = approvedAppeal.id;
      }

      if (record.source === 'manual') {
        isCorrected = 1;
        correctionReason = correctionReason ? correctionReason + ' / 手动修改' : '手动修改';
      }

      await run(`
        INSERT INTO publication_records
        (publication_id, attendance_id, volunteer_id, volunteer_name, original_hours, final_hours, is_corrected, correction_reason, appeal_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [publicationId, record.id, record.volunteer_id, record.volunteer_name, originalHours, record.hours, isCorrected, correctionReason, appealId]);
    }

    const publication = await get(`
      SELECT p.*, a.name as activity_name
      FROM publications p
      JOIN activities a ON p.activity_id = a.id
      WHERE p.batch_no = ?
    `, [batchNo]);

    const pubRecords = await all(
      'SELECT * FROM publication_records WHERE publication_id = ? ORDER BY final_hours DESC',
      [publication.id]
    );

    res.status(201).json({
      message: '公示清单已生成，待复核',
      publication,
      records: pubRecords
    });
  } catch (err) {
    res.status(500).json({ error: '生成公示失败：' + err.message });
  }
});

router.get('/', authMiddleware(), async (req, res) => {
  const { activity_id, status, page = 1, page_size = 20 } = req.query;
  const offset = (page - 1) * page_size;

  let sql = `
    SELECT p.*, a.name as activity_name
    FROM publications p
    JOIN activities a ON p.activity_id = a.id
    WHERE 1=1
  `;
  const params = [];

  if (activity_id) {
    sql += ' AND p.activity_id = ?';
    params.push(activity_id);
  }

  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }

  if (req.user.role === 'activity_manager') {
    sql += ' AND a.manager_id = ?';
    params.push(req.user.id);
  }

  const countSql = sql.replace('SELECT p.*, a.name as activity_name', 'SELECT COUNT(*) as count');
  const totalRow = await get(countSql, params);

  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), Number(offset));

  const publications = await all(sql, params);

  res.json({
    list: publications,
    total: totalRow.count,
    page: Number(page),
    page_size: Number(page_size)
  });
});

router.get('/:id', authMiddleware(), async (req, res) => {
  try {
    const publication = await get(`
      SELECT p.*, a.name as activity_name, a.location, a.start_time, a.end_time,
             uc.name as creator_name, ur.name as reviewer_name
      FROM publications p
      JOIN activities a ON p.activity_id = a.id
      LEFT JOIN users uc ON p.created_by = uc.id
      LEFT JOIN users ur ON p.reviewed_by = ur.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!publication) {
      return res.status(404).json({ error: '公示不存在' });
    }

    if (req.user.role === 'activity_manager') {
      const activity = await get('SELECT * FROM activities WHERE id = ?', [publication.activity_id]);
      if (activity.manager_id !== req.user.id) {
        return res.status(403).json({ error: '无权查看该公示' });
      }
    }

    const records = await all(`
      SELECT pr.*,
             ap.appeal_type, ap.reason as appeal_reason
      FROM publication_records pr
      LEFT JOIN appeals ap ON pr.appeal_id = ap.id
      WHERE pr.publication_id = ?
      ORDER BY pr.final_hours DESC, pr.volunteer_name ASC
    `, [req.params.id]);

    const correctedCount = records.filter(r => r.is_corrected).length;
    const totalHours = records.reduce((sum, r) => sum + r.final_hours, 0);

    res.json({
      publication,
      records,
      summary: {
        total_volunteers: records.length,
        corrected_count: correctedCount,
        total_hours: Math.round(totalHours * 100) / 100
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/corrections', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  try {
    const publication = await get('SELECT * FROM publications WHERE id = ?', [req.params.id]);
    if (!publication) {
      return res.status(404).json({ error: '公示不存在' });
    }

    if (req.user.role === 'activity_manager') {
      const activity = await get('SELECT * FROM activities WHERE id = ?', [publication.activity_id]);
      if (activity.manager_id !== req.user.id) {
        return res.status(403).json({ error: '无权查看' });
      }
    }

    const corrections = await all(`
      SELECT pr.*, ap.appeal_type, ap.reason as appeal_reason,
             al.action, al.remark as audit_remark, u.name as reviewer_name
      FROM publication_records pr
      JOIN appeals ap ON pr.appeal_id = ap.id
      LEFT JOIN audit_logs al ON al.appeal_id = ap.id AND al.action = 'approve'
      LEFT JOIN users u ON al.operator_id = u.id
      WHERE pr.publication_id = ? AND pr.is_corrected = 1
      ORDER BY pr.final_hours DESC
    `, [req.params.id]);

    const grouped = {
      missed_sign: corrections.filter(c => c.appeal_type === 'missed_sign'),
      extended_activity: corrections.filter(c => c.appeal_type === 'extended_activity'),
      admin_error: corrections.filter(c => c.appeal_type === 'admin_error'),
      manual: corrections.filter(c => !c.appeal_type)
    };

    res.json({
      total: corrections.length,
      grouped,
      list: corrections
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/review', authMiddleware(['activity_manager']), async (req, res) => {
  try {
    const publication = await get('SELECT * FROM publications WHERE id = ?', [req.params.id]);

    if (!publication) {
      return res.status(404).json({ error: '公示不存在' });
    }

    const activity = await get('SELECT * FROM activities WHERE id = ?', [publication.activity_id]);
    if (activity.manager_id !== req.user.id) {
      return res.status(403).json({ error: '无权复核该公示' });
    }

    if (publication.status !== 'pending_review') {
      return res.status(400).json({ error: '该公示状态不可复核' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await run(`
      UPDATE publications
      SET status = 'reviewed', reviewed_by = ?, reviewed_at = ?
      WHERE id = ?
    `, [req.user.id, now, publication.id]);

    const updated = await get('SELECT * FROM publications WHERE id = ?', [publication.id]);

    res.json({ message: '复核完成', publication: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/publish', authMiddleware(['admin']), async (req, res) => {
  try {
    const publication = await get('SELECT * FROM publications WHERE id = ?', [req.params.id]);

    if (!publication) {
      return res.status(404).json({ error: '公示不存在' });
    }

    if (publication.status !== 'reviewed') {
      return res.status(400).json({ error: '公示需先经负责人复核后才能发布' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await run(`
      UPDATE publications
      SET status = 'published', published_at = ?
      WHERE id = ?
    `, [now, publication.id]);

    await run(`
      UPDATE attendance_records
      SET is_public = 1
      WHERE activity_id = ?
    `, [publication.activity_id]);

    await run(`
      UPDATE activities
      SET status = 'published'
      WHERE id = ?
    `, [publication.activity_id]);

    const updated = await get('SELECT * FROM publications WHERE id = ?', [publication.id]);

    res.json({ message: '公示已发布', publication: updated });
  } catch (err) {
    res.status(500).json({ error: '发布失败：' + err.message });
  }
});

router.post('/:id/revise', authMiddleware(['admin']), async (req, res) => {
  try {
    const publication = await get('SELECT * FROM publications WHERE id = ?', [req.params.id]);

    if (!publication) {
      return res.status(404).json({ error: '公示不存在' });
    }

    if (publication.status !== 'published') {
      return res.status(400).json({ error: '只有已发布的公示才能修正' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await run('UPDATE publications SET status = ? WHERE id = ?', ['revised', publication.id]);

    const records = await all(`
      SELECT ar.*, u.name as volunteer_name
      FROM attendance_records ar
      JOIN users u ON ar.volunteer_id = u.id
      WHERE ar.activity_id = ?
      ORDER BY ar.hours DESC
    `, [publication.activity_id]);

    const newBatchNo = generateBatchNo(publication.activity_id) + '-R';

    const newPubResult = await run(`
      INSERT INTO publications (activity_id, batch_no, status, created_by)
      VALUES (?, ?, 'pending_review', ?)
    `, [publication.activity_id, newBatchNo, req.user.id]);

    const newPubId = newPubResult.lastID;

    for (const record of records) {
      const oldPubRecord = await get(`
        SELECT final_hours as old_final_hours FROM publication_records
        WHERE publication_id = ? AND volunteer_id = ?
        ORDER BY id DESC LIMIT 1
      `, [publication.id, record.volunteer_id]);

      const approvedAppeal = await get(`
        SELECT * FROM appeals
        WHERE activity_id = ? AND volunteer_id = ? AND status = 'approved'
          AND updated_at > (SELECT published_at FROM publications WHERE id = ?)
        ORDER BY updated_at DESC
        LIMIT 1
      `, [publication.activity_id, record.volunteer_id, publication.id]);

      let isCorrected = 0;
      let correctionReason = null;
      let appealId = null;

      if (approvedAppeal) {
        isCorrected = 1;
        correctionReason = getAppealTypeLabel(approvedAppeal.appeal_type);
        appealId = approvedAppeal.id;
      }

      const originalHours = oldPubRecord ? oldPubRecord.old_final_hours : record.hours;

      await run(`
        INSERT INTO publication_records
        (publication_id, attendance_id, volunteer_id, volunteer_name, original_hours, final_hours, is_corrected, correction_reason, appeal_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [newPubId, record.id, record.volunteer_id, record.volunteer_name, originalHours, record.hours, isCorrected, correctionReason, appealId]);
    }

    const newPublication = await get(`
      SELECT p.*, a.name as activity_name
      FROM publications p
      JOIN activities a ON p.activity_id = a.id
      WHERE p.batch_no = ?
    `, [newBatchNo]);

    res.json({
      message: '已生成修正版公示，待复核',
      previous_publication_id: publication.id,
      new_publication: newPublication
    });
  } catch (err) {
    res.status(500).json({ error: '生成修正公示失败：' + err.message });
  }
});

module.exports = router;
