const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { success, fail } = require('../utils/response');

const router = express.Router();

router.post('/work-orders/:id/satisfaction', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const orderId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return fail(res, '评分必须在1-5之间');
    }

    const order = await get('SELECT * FROM work_orders WHERE id = ?', [orderId]);
    if (!order) return fail(res, '工单不存在', 404, 404);
    if (order.student_id !== req.user.id) return fail(res, '只能评价自己的工单', 403, 403);
    if (!['completed', 'confirmed'].includes(order.status)) {
      return fail(res, '只有已完成或已确认的工单可以评价');
    }

    const existing = await get('SELECT * FROM satisfactions WHERE work_order_id = ?', [orderId]);
    if (existing) {
      await run(
        'UPDATE satisfactions SET rating = ?, comment = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
        [rating, comment || '', existing.id]
      );
      await run(
        `INSERT INTO work_order_logs (work_order_id, action, operator_id, detail) 
         VALUES (?, 'update_satisfaction', ?, ?)`,
        [orderId, req.user.id, `修改满意度评分：${rating}星`]
      );
      return success(res, null, '评价更新成功');
    }

    await run(
      'INSERT INTO satisfactions (work_order_id, student_id, rating, comment) VALUES (?, ?, ?, ?)',
      [orderId, req.user.id, rating, comment || '']
    );
    await run(
      `INSERT INTO work_order_logs (work_order_id, action, operator_id, detail) 
       VALUES (?, 'satisfaction', ?, ?)`,
      [orderId, req.user.id, `提交满意度评分：${rating}星`]
    );

    success(res, null, '评价提交成功');
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/satisfactions/stats', authMiddleware, requireRole('admin', 'storekeeper'), async (req, res) => {
  try {
    const { start_date, end_date, worker_id } = req.query;
    const params = [];
    let where = 'WHERE wo.status IN ("completed", "confirmed")';

    if (start_date) { where += ' AND date(s.created_at) >= date(?)'; params.push(start_date); }
    if (end_date) { where += ' AND date(s.created_at) <= date(?)'; params.push(end_date); }
    if (worker_id) { where += ' AND wo.worker_id = ?'; params.push(worker_id); }

    const overall = await get(
      `SELECT COUNT(*) as total, AVG(s.rating) as avg_rating
       FROM satisfactions s
       JOIN work_orders wo ON s.work_order_id = wo.id
       ${where}`,
      params
    );

    const byRating = await all(
      `SELECT s.rating, COUNT(*) as count
       FROM satisfactions s
       JOIN work_orders wo ON s.work_order_id = wo.id
       ${where}
       GROUP BY s.rating
       ORDER BY s.rating DESC`,
      params
    );

    success(res, {
      total: overall.total,
      avg_rating: overall.avg_rating ? parseFloat(overall.avg_rating).toFixed(2) : 0,
      by_rating: byRating
    });
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

module.exports = router;
