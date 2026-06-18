const express = require('express');
const path = require('path');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const dayjs = require('dayjs');
const { all, get } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { success, fail } = require('../utils/response');

const router = express.Router();

const EXPORT_DIR = path.resolve(__dirname, '../../exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

router.get('/overdue-orders', authMiddleware, requireRole('admin', 'storekeeper'), async (req, res) => {
  try {
    const { format = 'json', start_date, end_date } = req.query;
    const params = [];
    let where = `WHERE (wo.status = 'overdue' 
               OR (wo.status IN ('pending', 'assigned', 'in_progress') AND datetime(wo.deadline) < datetime('now')))`;

    if (start_date) { where += ' AND date(wo.created_at) >= date(?)'; params.push(start_date); }
    if (end_date) { where += ' AND date(wo.created_at) <= date(?)'; params.push(end_date); }

    const list = await all(
      `SELECT wo.order_no, wo.title, b.name as building_name, r.room_no, rt.name as repair_type,
              wo.status, wo.priority, u1.real_name as student_name, u1.phone as student_phone,
              u2.real_name as worker_name, wo.created_at, wo.deadline,
              CAST((julianday('now') - julianday(wo.deadline)) * 24 AS INTEGER) as overdue_hours
       FROM work_orders wo
       JOIN buildings b ON wo.building_id = b.id
       JOIN rooms r ON wo.room_id = r.id
       JOIN repair_types rt ON wo.repair_type_id = rt.id
       JOIN users u1 ON wo.student_id = u1.id
       LEFT JOIN users u2 ON wo.worker_id = u2.id
       ${where}
       ORDER BY wo.deadline ASC`,
      params
    );

    if (format === 'csv') {
      const filePath = path.join(EXPORT_DIR, `overdue_orders_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'order_no', title: '工单号' },
          { id: 'title', title: '标题' },
          { id: 'building_name', title: '楼栋' },
          { id: 'room_no', title: '房间号' },
          { id: 'repair_type', title: '维修类型' },
          { id: 'status', title: '状态' },
          { id: 'priority', title: '优先级' },
          { id: 'student_name', title: '报修人' },
          { id: 'student_phone', title: '联系电话' },
          { id: 'worker_name', title: '维修师傅' },
          { id: 'created_at', title: '创建时间' },
          { id: 'deadline', title: '截止时间' },
          { id: 'overdue_hours', title: '超期小时数' }
        ]
      });
      await csvWriter.writeRecords(list);
      return res.download(filePath);
    }

    success(res, { total: list.length, list });
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/material-consumption', authMiddleware, requireRole('admin', 'storekeeper'), async (req, res) => {
  try {
    const { format = 'json', start_date, end_date, category } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (start_date) { where += ' AND date(mi.issued_at) >= date(?)'; params.push(start_date); }
    if (end_date) { where += ' AND date(mi.issued_at) <= date(?)'; params.push(end_date); }
    if (category) { where += ' AND m.category = ?'; params.push(category); }

    const list = await all(
      `SELECT m.id, m.name, m.model, m.unit, m.category,
              SUM(mi.quantity) as total_issued,
              SUM(mi.returned_quantity) as total_returned,
              SUM(mi.quantity - mi.returned_quantity) as total_consumed,
              COUNT(DISTINCT mi.work_order_id) as order_count
       FROM material_issues mi
       JOIN materials m ON mi.material_id = m.id
       ${where}
       GROUP BY m.id
       ORDER BY total_consumed DESC`,
      params
    );

    if (format === 'csv') {
      const filePath = path.join(EXPORT_DIR, `material_consumption_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'name', title: '材料名称' },
          { id: 'model', title: '型号' },
          { id: 'category', title: '分类' },
          { id: 'unit', title: '单位' },
          { id: 'total_issued', title: '累计领用' },
          { id: 'total_returned', title: '累计回仓' },
          { id: 'total_consumed', title: '实际消耗' },
          { id: 'order_count', title: '关联工单' }
        ]
      });
      await csvWriter.writeRecords(list);
      return res.download(filePath);
    }

    const summary = {
      total_items: list.length,
      total_consumed_value: list.reduce((sum, i) => sum + (i.total_consumed || 0), 0)
    };
    success(res, { summary, list });
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/unconfirmed-repairs', authMiddleware, requireRole('admin', 'storekeeper'), async (req, res) => {
  try {
    const { format = 'json', start_date, end_date } = req.query;
    const params = [];
    let where = `WHERE wo.status = 'completed'`;

    if (start_date) { where += ' AND date(wo.completed_at) >= date(?)'; params.push(start_date); }
    if (end_date) { where += ' AND date(wo.completed_at) <= date(?)'; params.push(end_date); }

    const list = await all(
      `SELECT wo.order_no, wo.title, b.name as building_name, r.room_no, rt.name as repair_type,
              u1.real_name as student_name, u1.phone as student_phone,
              u2.real_name as worker_name, wo.completed_at,
              CAST((julianday('now') - julianday(wo.completed_at)) AS INTEGER) as days_since_completed
       FROM work_orders wo
       JOIN buildings b ON wo.building_id = b.id
       JOIN rooms r ON wo.room_id = r.id
       JOIN repair_types rt ON wo.repair_type_id = rt.id
       JOIN users u1 ON wo.student_id = u1.id
       LEFT JOIN users u2 ON wo.worker_id = u2.id
       ${where}
       ORDER BY wo.completed_at ASC`,
      params
    );

    if (format === 'csv') {
      const filePath = path.join(EXPORT_DIR, `unconfirmed_repairs_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'order_no', title: '工单号' },
          { id: 'title', title: '标题' },
          { id: 'building_name', title: '楼栋' },
          { id: 'room_no', title: '房间号' },
          { id: 'repair_type', title: '维修类型' },
          { id: 'student_name', title: '报修人' },
          { id: 'student_phone', title: '联系电话' },
          { id: 'worker_name', title: '维修师傅' },
          { id: 'completed_at', title: '完成时间' },
          { id: 'days_since_completed', title: '完成后天数' }
        ]
      });
      await csvWriter.writeRecords(list);
      return res.download(filePath);
    }

    success(res, { total: list.length, list });
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/dashboard', authMiddleware, requireRole('admin', 'storekeeper'), async (req, res) => {
  try {
    const stats = {};

    stats.by_status = await all(
      `SELECT status, COUNT(*) as count FROM work_orders GROUP BY status`
    );

    stats.pending_count = (await get(
      `SELECT COUNT(*) as count FROM work_orders WHERE status IN ('pending', 'assigned')`
    )).count;

    stats.overdue_count = (await get(
      `SELECT COUNT(*) as count FROM work_orders 
       WHERE status IN ('pending', 'assigned', 'in_progress') AND datetime(deadline) < datetime('now')`
    )).count;

    stats.unconfirmed_count = (await get(
      `SELECT COUNT(*) as count FROM work_orders WHERE status = 'completed'`
    )).count;

    stats.low_stock_materials = await all(
      `SELECT * FROM materials WHERE stock <= safety_stock ORDER BY stock ASC LIMIT 10`
    );

    stats.today_orders = (await get(
      `SELECT COUNT(*) as count FROM work_orders WHERE date(created_at) = date('now')`
    )).count;

    stats.month_consumption = await all(
      `SELECT m.name, m.model, m.unit,
              SUM(mi.quantity - mi.returned_quantity) as consumed
       FROM material_issues mi
       JOIN materials m ON mi.material_id = m.id
       WHERE strftime('%Y-%m', mi.issued_at) = strftime('%Y-%m', 'now')
       GROUP BY m.id
       ORDER BY consumed DESC
       LIMIT 10`
    );

    success(res, stats);
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

module.exports = router;
