const express = require('express');
const { get, all } = require('../db');
const authMiddleware = require('../middleware/auth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

const router = express.Router();

const exportDir = path.join(__dirname, '..', '..', 'exports');
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

function getAppealTypeLabel(type) {
  const labels = {
    'missed_sign': '缺签补录',
    'extended_activity': '活动延时',
    'admin_error': '管理员录错'
  };
  return labels[type] || type;
}

function getStatusLabel(status) {
  const labels = {
    'pending': '待审核',
    'reviewing': '审核中',
    'approved': '已通过',
    'rejected': '已驳回',
    'merged': '已合并'
  };
  return labels[status] || status;
}

router.get('/publication/:id/csv', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  try {
    const publication = await get(`
      SELECT p.*, a.name as activity_name
      FROM publications p
      JOIN activities a ON p.activity_id = a.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!publication) {
      return res.status(404).json({ error: '公示不存在' });
    }

    if (req.user.role === 'activity_manager') {
      const activity = await get('SELECT * FROM activities WHERE id = ?', [publication.activity_id]);
      if (activity.manager_id !== req.user.id) {
        return res.status(403).json({ error: '无权导出' });
      }
    }

    const records = await all(`
      SELECT pr.*, ap.appeal_type
      FROM publication_records pr
      LEFT JOIN appeals ap ON pr.appeal_id = ap.id
      WHERE pr.publication_id = ?
      ORDER BY pr.final_hours DESC, pr.volunteer_name ASC
    `, [req.params.id]);

    const csvData = records.map((r, index) => ({
      序号: index + 1,
      志愿者姓名: r.volunteer_name,
      原时长: r.original_hours,
      最终时长: r.final_hours,
      是否修正: r.is_corrected ? '是' : '否',
      修正原因: r.correction_reason || '',
      申诉类型: r.appeal_type ? getAppealTypeLabel(r.appeal_type) : ''
    }));

    const fileName = `公示清单_${publication.batch_no}.csv`;
    const filePath = path.join(exportDir, fileName);

    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: '序号', title: '序号' },
        { id: '志愿者姓名', title: '志愿者姓名' },
        { id: '原时长', title: '原时长(小时)' },
        { id: '最终时长', title: '最终时长(小时)' },
        { id: '是否修正', title: '是否修正' },
        { id: '修正原因', title: '修正原因' },
        { id: '申诉类型', title: '申诉类型' }
      ],
      encoding: 'utf-8'
    });

    await csvWriter.writeRecords(csvData);
    res.download(filePath, fileName);
  } catch (err) {
    res.status(500).json({ error: '导出失败: ' + err.message });
  }
});

router.get('/corrections/csv', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  try {
    const { activity_id, appeal_type, start_date, end_date } = req.query;

    let sql = `
      SELECT ap.*, ar.hours as original_hours, ar.hours as final_hours,
             u.name as volunteer_name, act.name as activity_name,
             al.remark as approve_remark, u2.name as reviewer_name,
             al.created_at as approved_at
      FROM appeals ap
      JOIN users u ON ap.volunteer_id = u.id
      JOIN activities act ON ap.activity_id = act.id
      LEFT JOIN attendance_records ar ON ar.activity_id = ap.activity_id AND ar.volunteer_id = ap.volunteer_id
      LEFT JOIN audit_logs al ON al.appeal_id = ap.id AND al.action = 'approve'
      LEFT JOIN users u2 ON al.operator_id = u2.id
      WHERE ap.status = 'approved'
    `;
    const params = [];

    if (activity_id) {
      sql += ' AND ap.activity_id = ?';
      params.push(activity_id);
    }

    if (appeal_type) {
      sql += ' AND ap.appeal_type = ?';
      params.push(appeal_type);
    }

    if (start_date) {
      sql += ' AND ap.created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND ap.created_at <= ?';
      params.push(end_date);
    }

    if (req.user.role === 'activity_manager') {
      sql += ' AND act.manager_id = ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY ap.created_at DESC';

    const appeals = await all(sql, params);

    const csvData = appeals.map((a, index) => ({
      序号: index + 1,
      活动名称: a.activity_name,
      志愿者姓名: a.volunteer_name,
      申诉类型: getAppealTypeLabel(a.appeal_type),
      申诉理由: a.reason,
      申请时长: a.requested_hours || '',
      审核人: a.reviewer_name || '',
      审核时间: a.approved_at || '',
      审核备注: a.approve_remark || '',
      提交时间: a.created_at
    }));

    const fileName = `修正记录_${Date.now()}.csv`;
    const filePath = path.join(exportDir, fileName);

    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: '序号', title: '序号' },
        { id: '活动名称', title: '活动名称' },
        { id: '志愿者姓名', title: '志愿者姓名' },
        { id: '申诉类型', title: '申诉类型' },
        { id: '申诉理由', title: '申诉理由' },
        { id: '申请时长', title: '申请时长(小时)' },
        { id: '审核人', title: '审核人' },
        { id: '审核时间', title: '审核时间' },
        { id: '审核备注', title: '审核备注' },
        { id: '提交时间', title: '提交时间' }
      ],
      encoding: 'utf-8'
    });

    await csvWriter.writeRecords(csvData);
    res.download(filePath, fileName);
  } catch (err) {
    res.status(500).json({ error: '导出失败: ' + err.message });
  }
});

router.get('/appeals/csv', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  try {
    const { activity_id, status, appeal_type } = req.query;

    let sql = `
      SELECT ap.*, u.name as volunteer_name, act.name as activity_name
      FROM appeals ap
      JOIN users u ON ap.volunteer_id = u.id
      JOIN activities act ON ap.activity_id = act.id
      WHERE ap.status != 'merged'
    `;
    const params = [];

    if (activity_id) {
      sql += ' AND ap.activity_id = ?';
      params.push(activity_id);
    }

    if (status) {
      sql += ' AND ap.status = ?';
      params.push(status);
    }

    if (appeal_type) {
      sql += ' AND ap.appeal_type = ?';
      params.push(appeal_type);
    }

    if (req.user.role === 'activity_manager') {
      sql += ' AND act.manager_id = ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY ap.created_at DESC';

    const appeals = await all(sql, params);

    const csvData = appeals.map((a, index) => ({
      序号: index + 1,
      活动名称: a.activity_name,
      志愿者姓名: a.volunteer_name,
      申诉类型: getAppealTypeLabel(a.appeal_type),
      申诉理由: a.reason,
      申请时长: a.requested_hours || '',
      状态: getStatusLabel(a.status),
      提交时间: a.created_at,
      更新时间: a.updated_at
    }));

    const fileName = `申诉列表_${Date.now()}.csv`;
    const filePath = path.join(exportDir, fileName);

    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: '序号', title: '序号' },
        { id: '活动名称', title: '活动名称' },
        { id: '志愿者姓名', title: '志愿者姓名' },
        { id: '申诉类型', title: '申诉类型' },
        { id: '申诉理由', title: '申诉理由' },
        { id: '申请时长', title: '申请时长(小时)' },
        { id: '状态', title: '状态' },
        { id: '提交时间', title: '提交时间' },
        { id: '更新时间', title: '更新时间' }
      ],
      encoding: 'utf-8'
    });

    await csvWriter.writeRecords(csvData);
    res.download(filePath, fileName);
  } catch (err) {
    res.status(500).json({ error: '导出失败: ' + err.message });
  }
});

router.get('/attendance/csv', authMiddleware(['admin', 'activity_manager']), async (req, res) => {
  try {
    const { activity_id } = req.query;

    if (!activity_id) {
      return res.status(400).json({ error: '请指定活动ID' });
    }

    const activity = await get('SELECT * FROM activities WHERE id = ?', [activity_id]);
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }

    if (req.user.role === 'activity_manager' && activity.manager_id !== req.user.id) {
      return res.status(403).json({ error: '无权导出' });
    }

    const records = await all(`
      SELECT ar.*, u.name as volunteer_name
      FROM attendance_records ar
      JOIN users u ON ar.volunteer_id = u.id
      WHERE ar.activity_id = ?
      ORDER BY ar.hours DESC
    `, [activity_id]);

    const csvData = records.map((r, index) => ({
      序号: index + 1,
      志愿者姓名: r.volunteer_name,
      签到时间: r.sign_in_time || '',
      签退时间: r.sign_out_time || '',
      时长: r.hours,
      数据来源: r.source === 'normal' ? '正常签到' : r.source === 'appeal_fix' ? '申诉修正' : '手动录入',
      是否已公示: r.is_public ? '是' : '否'
    }));

    const fileName = `签到记录_${activity.name}_${Date.now()}.csv`;
    const filePath = path.join(exportDir, fileName);

    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: '序号', title: '序号' },
        { id: '志愿者姓名', title: '志愿者姓名' },
        { id: '签到时间', title: '签到时间' },
        { id: '签退时间', title: '签退时间' },
        { id: '时长', title: '时长(小时)' },
        { id: '数据来源', title: '数据来源' },
        { id: '是否已公示', title: '是否已公示' }
      ],
      encoding: 'utf-8'
    });

    await csvWriter.writeRecords(csvData);
    res.download(filePath, fileName);
  } catch (err) {
    res.status(500).json({ error: '导出失败: ' + err.message });
  }
});

module.exports = router;
