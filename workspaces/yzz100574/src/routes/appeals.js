const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { get, run, all } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

async function findPendingAppeal(activityId, volunteerId) {
  return await get(`
    SELECT * FROM appeals
    WHERE activity_id = ? AND volunteer_id = ?
      AND status IN ('pending', 'reviewing')
    ORDER BY created_at DESC
    LIMIT 1
  `, [activityId, volunteerId]);
}

router.post('/', authMiddleware(['volunteer']), upload.array('attachments', 5), async (req, res) => {
  const { activity_id, appeal_type, reason, requested_hours, requested_sign_in, requested_sign_out } = req.body;

  if (!activity_id || !appeal_type || !reason) {
    return res.status(400).json({ error: '活动ID、申诉类型和申诉理由不能为空' });
  }

  const validTypes = ['missed_sign', 'extended_activity', 'admin_error'];
  if (!validTypes.includes(appeal_type)) {
    return res.status(400).json({ error: '无效的申诉类型' });
  }

  try {
    const activity = await get('SELECT * FROM activities WHERE id = ?', [activity_id]);
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const existingPending = await findPendingAppeal(activity_id, req.user.id);

    if (existingPending) {
      const mergedResult = await run(`
        INSERT INTO appeals (activity_id, volunteer_id, appeal_type, reason, requested_hours, requested_sign_in, requested_sign_out, status, merged_to_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'merged', ?)
      `, [activity_id, req.user.id, appeal_type, reason, requested_hours, requested_sign_in, requested_sign_out, existingPending.id]);

      const mergedAppeal = await get('SELECT * FROM appeals WHERE id = ?', [mergedResult.lastID]);

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await run(`
            INSERT INTO appeal_attachments (appeal_id, file_name, file_path, file_size)
            VALUES (?, ?, ?, ?)
          `, [existingPending.id, file.originalname, file.path, file.size]);
        }
      }

      return res.json({
        message: '该活动已有待审核申诉，本次申诉已合并',
        merged_to_id: existingPending.id,
        merged_appeal: mergedAppeal
      });
    }

    const result = await run(`
      INSERT INTO appeals (activity_id, volunteer_id, appeal_type, reason, requested_hours, requested_sign_in, requested_sign_out, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [activity_id, req.user.id, appeal_type, reason, requested_hours, requested_sign_in, requested_sign_out]);

    const appealId = result.lastID;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await run(`
          INSERT INTO appeal_attachments (appeal_id, file_name, file_path, file_size)
          VALUES (?, ?, ?, ?)
        `, [appealId, file.originalname, file.path, file.size]);
      }
    }

    await run(`
      INSERT INTO audit_logs (appeal_id, operator_id, action, remark, old_status, new_status)
      VALUES (?, ?, 'submit', ?, NULL, 'pending')
    `, [appealId, req.user.id, '志愿者提交申诉']);

    const appeal = await get('SELECT * FROM appeals WHERE id = ?', [appealId]);
    const attachments = await all('SELECT * FROM appeal_attachments WHERE appeal_id = ?', [appealId]);

    res.status(201).json({
      message: '申诉提交成功',
      appeal,
      attachments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mine', authMiddleware(['volunteer']), async (req, res) => {
  const { status, page = 1, page_size = 20 } = req.query;
  const offset = (page - 1) * page_size;

  let sql = `
    SELECT a.*, act.name as activity_name, act.location
    FROM appeals a
    JOIN activities act ON a.activity_id = act.id
    WHERE a.volunteer_id = ? AND a.status != 'merged'
  `;
  const params = [req.user.id];

  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }

  const countSql = sql.replace('SELECT a.*, act.name as activity_name, act.location', 'SELECT COUNT(*) as count');
  const totalRow = await get(countSql, params);

  sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), Number(offset));

  const appeals = await all(sql, params);

  res.json({
    list: appeals,
    total: totalRow.count,
    page: Number(page),
    page_size: Number(page_size)
  });
});

router.get('/:id', authMiddleware(), async (req, res) => {
  try {
    const appeal = await get(`
      SELECT a.*, act.name as activity_name, u.name as volunteer_name, u.email as volunteer_email
      FROM appeals a
      JOIN activities act ON a.activity_id = act.id
      JOIN users u ON a.volunteer_id = u.id
      WHERE a.id = ?
    `, [req.params.id]);

    if (!appeal) {
      return res.status(404).json({ error: '申诉不存在' });
    }

    if (req.user.role === 'volunteer' && appeal.volunteer_id !== req.user.id) {
      return res.status(403).json({ error: '无权查看他人申诉' });
    }

    const attachments = await all('SELECT * FROM appeal_attachments WHERE appeal_id = ?', [req.params.id]);
    const auditLogs = await all(`
      SELECT al.*, u.name as operator_name
      FROM audit_logs al
      JOIN users u ON al.operator_id = u.id
      WHERE al.appeal_id = ?
      ORDER BY al.created_at ASC
    `, [req.params.id]);

    const mergedAppeals = await all(`
      SELECT * FROM appeals WHERE merged_to_id = ? AND status = 'merged'
    `, [req.params.id]);

    res.json({
      appeal,
      attachments,
      audit_logs: auditLogs,
      merged_appeals: mergedAppeals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  const { status, appeal_type, activity_id, page = 1, page_size = 20 } = req.query;
  const offset = (page - 1) * page_size;

  let sql = `
    SELECT a.*, act.name as activity_name, u.name as volunteer_name
    FROM appeals a
    JOIN activities act ON a.activity_id = act.id
    JOIN users u ON a.volunteer_id = u.id
    WHERE a.status != 'merged'
  `;
  const params = [];

  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }

  if (appeal_type) {
    sql += ' AND a.appeal_type = ?';
    params.push(appeal_type);
  }

  if (activity_id) {
    sql += ' AND a.activity_id = ?';
    params.push(activity_id);
  }

  if (req.user.role === 'activity_manager') {
    sql += ' AND act.manager_id = ?';
    params.push(req.user.id);
  }

  const countSql = sql.replace('SELECT a.*, act.name as activity_name, u.name as volunteer_name', 'SELECT COUNT(*) as count');
  const totalRow = await get(countSql, params);

  sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), Number(offset));

  const appeals = await all(sql, params);

  res.json({
    list: appeals,
    total: totalRow.count,
    page: Number(page),
    page_size: Number(page_size)
  });
});

router.get('/:id/merged', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  const mergedAppeals = await all(`
    SELECT a.*, u.name as volunteer_name
    FROM appeals a
    JOIN users u ON a.volunteer_id = u.id
    WHERE a.merged_to_id = ? AND a.status = 'merged'
    ORDER BY a.created_at ASC
  `, [req.params.id]);

  res.json(mergedAppeals);
});

module.exports = router;
