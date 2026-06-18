const express = require('express');
const dayjs = require('dayjs');
const { all, get, run } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { success, fail, parsePagination } = require('../utils/response');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword, category, low_stock } = req.query;
    const conditions = [];
    const params = [];

    if (keyword) {
      conditions.push('(name LIKE ? OR model LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (low_stock === '1') {
      conditions.push('stock <= safety_stock');
    }

    const whereSql = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const totalRow = await get(`SELECT COUNT(*) as count FROM materials ${whereSql}`, params);
    const list = await all(
      `SELECT * FROM materials ${whereSql} ORDER BY category, name LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    success(res, { list, total: totalRow.count, page, pageSize });
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const material = await get('SELECT * FROM materials WHERE id = ?', [req.params.id]);
    if (!material) return fail(res, '材料不存在', 404, 404);
    success(res, material);
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.post('/:id/stock', authMiddleware, requireRole('storekeeper', 'admin'), async (req, res) => {
  try {
    const { quantity, remark } = req.body;
    if (!quantity || quantity <= 0) return fail(res, '入库数量必须大于0');

    const material = await get('SELECT * FROM materials WHERE id = ?', [req.params.id]);
    if (!material) return fail(res, '材料不存在', 404, 404);

    await run('UPDATE materials SET stock = stock + ? WHERE id = ?', [quantity, req.params.id]);
    success(res, { new_stock: material.stock + quantity }, '入库成功');
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.post('/issue', authMiddleware, requireRole('worker', 'storekeeper'), async (req, res) => {
  try {
    const { work_order_id, material_id, quantity, remark } = req.body;
    if (!work_order_id || !material_id || !quantity || quantity <= 0) {
      return fail(res, '工单ID、材料ID、数量不能为空且数量大于0');
    }

    const order = await get('SELECT * FROM work_orders WHERE id = ?', [work_order_id]);
    if (!order) return fail(res, '工单不存在', 404, 404);

    if (['completed', 'confirmed', 'cancelled'].includes(order.status)) {
      return fail(res, `工单状态为"${order.status}"，不能再领料`);
    }

    const workerId = req.user.role === 'worker' ? req.user.id : (order.worker_id || req.user.id);

    const material = await get('SELECT * FROM materials WHERE id = ?', [material_id]);
    if (!material) return fail(res, '材料不存在', 404, 404);
    if (material.stock < quantity) {
      return fail(res, `库存不足，当前库存：${material.stock}${material.unit}`);
    }

    const result = await run(
      `INSERT INTO material_issues (work_order_id, material_id, worker_id, quantity, remark) 
       VALUES (?, ?, ?, ?, ?)`,
      [work_order_id, material_id, workerId, quantity, remark || '']
    );

    await run('UPDATE materials SET stock = stock - ? WHERE id = ?', [quantity, material_id]);

    await run(
      `INSERT INTO work_order_logs (work_order_id, action, operator_id, detail) 
       VALUES (?, 'issue_material', ?, ?)`,
      [work_order_id, req.user.id, `领取 ${material.name}(${material.model}) x${quantity}${material.unit}`]
    );

    success(res, { id: result.lastID }, '领料成功');
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.post('/return', authMiddleware, requireRole('storekeeper', 'admin'), async (req, res) => {
  try {
    const { issue_id, quantity, reason } = req.body;
    if (!issue_id || !quantity || quantity <= 0) {
      return fail(res, '领料记录ID和退料数量不能为空');
    }

    const issue = await get('SELECT * FROM material_issues WHERE id = ?', [issue_id]);
    if (!issue) return fail(res, '领料记录不存在', 404, 404);

    const remaining = issue.quantity - issue.returned_quantity;
    if (quantity > remaining) {
      return fail(res, `退料数量超过未还数量（最多可退${remaining}）`);
    }

    const newReturned = issue.returned_quantity + quantity;
    const newStatus = newReturned === issue.quantity ? 'full_returned' : 'partial_returned';
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    await run(
      'UPDATE material_issues SET returned_quantity = ?, returned_at = ?, status = ? WHERE id = ?',
      [newReturned, now, newStatus, issue_id]
    );

    await run(
      `INSERT INTO material_returns (issue_id, material_id, quantity, storekeeper_id, reason) 
       VALUES (?, ?, ?, ?, ?)`,
      [issue_id, issue.material_id, quantity, req.user.id, reason || '']
    );

    await run('UPDATE materials SET stock = stock + ? WHERE id = ?', [quantity, issue.material_id]);

    const material = await get('SELECT * FROM materials WHERE id = ?', [issue.material_id]);
    await run(
      `INSERT INTO work_order_logs (work_order_id, action, operator_id, detail) 
       VALUES (?, 'return_material', ?, ?)`,
      [issue.work_order_id, req.user.id, `回仓 ${material.name}(${material.model}) x${quantity}${material.unit}`]
    );

    success(res, { status: newStatus, returned_total: newReturned }, '退料成功');
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/flows/list', authMiddleware, async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { material_id, work_order_id, worker_id, type, start_date, end_date } = req.query;

    const params = [];
    const where = [];

    const issueSelect = `
      SELECT 'issue' as flow_type, id, work_order_id, material_id, worker_id, 
             quantity as flow_quantity, issued_at as flow_time, remark, status,
             returned_quantity
      FROM material_issues
    `;
    const returnSelect = `
      SELECT 'return' as flow_type, mr.id, mi.work_order_id, mr.material_id, mr.storekeeper_id as worker_id,
             mr.quantity as flow_quantity, mr.returned_at as flow_time, mr.reason as remark, 
             NULL as status, NULL as returned_quantity
      FROM material_returns mr
      JOIN material_issues mi ON mr.issue_id = mi.id
    `;

    let sql = `SELECT f.*, m.name as material_name, m.model as material_model, m.unit, m.category,
                      u.real_name as operator_name, wo.order_no, b.name as building_name, r.room_no
               FROM (${issueSelect} UNION ALL ${returnSelect}) f
               LEFT JOIN materials m ON f.material_id = m.id
               LEFT JOIN users u ON f.worker_id = u.id
               LEFT JOIN work_orders wo ON f.work_order_id = wo.id
               LEFT JOIN buildings b ON wo.building_id = b.id
               LEFT JOIN rooms r ON wo.room_id = r.id
               WHERE 1=1`;

    if (material_id) { sql += ' AND f.material_id = ?'; params.push(material_id); }
    if (work_order_id) { sql += ' AND f.work_order_id = ?'; params.push(work_order_id); }
    if (worker_id) { sql += ' AND f.worker_id = ?'; params.push(worker_id); }
    if (type) { sql += ' AND f.flow_type = ?'; params.push(type); }
    if (start_date) { sql += ' AND date(f.flow_time) >= date(?)'; params.push(start_date); }
    if (end_date) { sql += ' AND date(f.flow_time) <= date(?)'; params.push(end_date); }

    const countSql = `SELECT COUNT(*) as count FROM (${sql})`;
    const totalRow = await get(countSql, params);

    sql += ' ORDER BY f.flow_time DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);
    const list = await all(sql, params);

    success(res, { list, total: totalRow.count, page, pageSize });
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

module.exports = router;
