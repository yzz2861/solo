const express = require('express');
const dayjs = require('dayjs');
const { all, get, run, db } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { success, fail, generateOrderNo, parsePagination } = require('../utils/response');

const router = express.Router();

async function addLog(orderId, action, operatorId, detail = '') {
  await run(
    'INSERT INTO work_order_logs (work_order_id, action, operator_id, detail) VALUES (?, ?, ?, ?)',
    [orderId, action, operatorId, detail]
  );
}

router.post('/', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { building_id, room_id, repair_type_id, title, description, priority } = req.body;
    if (!building_id || !room_id || !repair_type_id || !title) {
      return fail(res, '楼栋、房间、维修类型、标题不能为空');
    }

    const duplicateOrders = await all(
      `SELECT wo.id, wo.order_no, wo.status, wo.created_at, rt.name as repair_type 
       FROM work_orders wo 
       JOIN repair_types rt ON wo.repair_type_id = rt.id
       WHERE wo.room_id = ? AND wo.repair_type_id = ? 
         AND wo.status IN ('pending', 'assigned', 'in_progress')
         AND datetime(wo.created_at) > datetime('now', '-7 days')
       ORDER BY wo.created_at DESC`,
      [room_id, repair_type_id]
    );

    if (duplicateOrders.length > 0 && !req.body.force_create) {
      return success(
        res,
        { duplicate: true, duplicate_orders: duplicateOrders },
        '该房间近7天已有同类未完成维修，是否继续创建？'
      );
    }

    const orderNo = generateOrderNo();
    const deadline = dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss');

    const result = await run(
      `INSERT INTO work_orders (order_no, student_id, building_id, room_id, repair_type_id, 
        title, description, priority, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderNo, req.user.id, building_id, room_id, repair_type_id, title, description || '', priority || 'normal', deadline]
    );

    await addLog(result.lastID, 'create', req.user.id, `学生${req.user.real_name}创建工单`);

    success(res, { id: result.lastID, order_no: orderNo, duplicate: false }, '工单创建成功');
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { status, building_id, worker_id, repair_type_id, keyword } = req.query;
    const conditions = [];
    const params = [];

    if (req.user.role === 'student') {
      conditions.push('wo.student_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'worker') {
      conditions.push('(wo.worker_id = ? OR wo.status IN ("pending", "assigned"))');
      params.push(req.user.id);
    }

    if (status) {
      conditions.push('wo.status = ?');
      params.push(status);
    }
    if (building_id) {
      conditions.push('wo.building_id = ?');
      params.push(building_id);
    }
    if (worker_id) {
      conditions.push('wo.worker_id = ?');
      params.push(worker_id);
    }
    if (repair_type_id) {
      conditions.push('wo.repair_type_id = ?');
      params.push(repair_type_id);
    }
    if (keyword) {
      conditions.push('(wo.title LIKE ? OR wo.description LIKE ? OR wo.order_no LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const whereSql = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const totalRow = await get(
      `SELECT COUNT(*) as count FROM work_orders wo ${whereSql}`,
      params
    );

    const list = await all(
      `SELECT wo.*, b.name as building_name, r.room_no, rt.name as repair_type_name,
              u1.real_name as student_name, u2.real_name as worker_name
       FROM work_orders wo
       JOIN buildings b ON wo.building_id = b.id
       JOIN rooms r ON wo.room_id = r.id
       JOIN repair_types rt ON wo.repair_type_id = rt.id
       JOIN users u1 ON wo.student_id = u1.id
       LEFT JOIN users u2 ON wo.worker_id = u2.id
       ${whereSql}
       ORDER BY wo.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    success(res, { list, total: totalRow.count, page, pageSize });
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await get(
      `SELECT wo.*, b.name as building_name, r.room_no, rt.name as repair_type_name, rt.category as repair_category,
              u1.real_name as student_name, u1.phone as student_phone, u1.student_no,
              u2.real_name as worker_name, u2.phone as worker_phone
       FROM work_orders wo
       JOIN buildings b ON wo.building_id = b.id
       JOIN rooms r ON wo.room_id = r.id
       JOIN repair_types rt ON wo.repair_type_id = rt.id
       JOIN users u1 ON wo.student_id = u1.id
       LEFT JOIN users u2 ON wo.worker_id = u2.id
       WHERE wo.id = ?`,
      [req.params.id]
    );
    if (!order) return fail(res, '工单不存在', 404, 404);

    const issues = await all(
      `SELECT mi.*, m.name as material_name, m.model as material_model, m.unit,
              u.real_name as worker_name
       FROM material_issues mi
       JOIN materials m ON mi.material_id = m.id
       JOIN users u ON mi.worker_id = u.id
       WHERE mi.work_order_id = ?
       ORDER BY mi.issued_at DESC`,
      [req.params.id]
    );

    const logs = await all(
      `SELECT wl.*, u.real_name as operator_name
       FROM work_order_logs wl
       LEFT JOIN users u ON wl.operator_id = u.id
       WHERE wl.work_order_id = ?
       ORDER BY wl.created_at ASC`,
      [req.params.id]
    );

    const satisfaction = await get(
      'SELECT * FROM satisfactions WHERE work_order_id = ?',
      [req.params.id]
    );

    success(res, { ...order, issues, logs, satisfaction });
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.put('/:id/assign', authMiddleware, requireRole('admin', 'storekeeper'), async (req, res) => {
  try {
    const { worker_id } = req.body;
    if (!worker_id) return fail(res, '维修师傅ID不能为空');

    const worker = await get('SELECT * FROM users WHERE id = ? AND role = ?', [worker_id, 'worker']);
    if (!worker) return fail(res, '维修师傅不存在');

    const order = await get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    if (!order) return fail(res, '工单不存在', 404, 404);
    if (order.status !== 'pending') return fail(res, '只有待接单状态可以派单');

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await run(
      'UPDATE work_orders SET worker_id = ?, status = ?, assigned_at = ?, updated_at = ? WHERE id = ?',
      [worker_id, 'assigned', now, now, req.params.id]
    );
    await addLog(req.params.id, 'assign', req.user.id, `派单给${worker.real_name}`);

    success(res, null, '派单成功');
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.put('/:id/start', authMiddleware, requireRole('worker'), async (req, res) => {
  try {
    const order = await get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    if (!order) return fail(res, '工单不存在', 404, 404);
    if (order.worker_id !== req.user.id) return fail(res, '只能处理自己的工单', 403, 403);
    if (!['assigned', 'in_progress'].includes(order.status)) return fail(res, '当前状态不可开始维修');

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await run(
      'UPDATE work_orders SET status = ?, started_at = COALESCE(started_at, ?), updated_at = ? WHERE id = ?',
      ['in_progress', now, now, req.params.id]
    );
    await addLog(req.params.id, 'start', req.user.id, `${req.user.real_name}开始维修`);

    success(res, null, '已开始维修');
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.put('/:id/complete', authMiddleware, requireRole('worker'), async (req, res) => {
  try {
    const order = await get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    if (!order) return fail(res, '工单不存在', 404, 404);
    if (order.worker_id !== req.user.id) return fail(res, '只能处理自己的工单', 403, 403);
    if (order.status !== 'in_progress') return fail(res, '只有维修中状态可以完成');

    const unreturnedIssues = await all(
      `SELECT mi.*, m.name as material_name 
       FROM material_issues mi JOIN materials m ON mi.material_id = m.id 
       WHERE mi.work_order_id = ? AND mi.status != 'full_returned' AND mi.returned_quantity < mi.quantity`,
      [req.params.id]
    );

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await run(
      'UPDATE work_orders SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      ['completed', now, now, req.params.id]
    );
    await addLog(
      req.params.id,
      'complete',
      req.user.id,
      unreturnedIssues.length > 0
        ? `完成维修，提醒：${unreturnedIssues.map(i => i.material_name).join('、')} 待回填`
        : '完成维修'
    );

    success(res, { unreturned_issues: unreturnedIssues }, '维修完成，请及时回填未使用材料');
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.put('/:id/confirm', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const order = await get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    if (!order) return fail(res, '工单不存在', 404, 404);
    if (order.student_id !== req.user.id) return fail(res, '只能确认自己的工单', 403, 403);
    if (order.status !== 'completed') return fail(res, '只有已完成状态可以确认');

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await run(
      'UPDATE work_orders SET status = ?, confirmed_at = ?, updated_at = ? WHERE id = ?',
      ['confirmed', now, now, req.params.id]
    );
    await addLog(req.params.id, 'confirm', req.user.id, `${req.user.real_name}确认维修完成`);

    success(res, null, '确认成功，请对本次服务进行评价');
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const order = await get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    if (!order) return fail(res, '工单不存在', 404, 404);

    if (req.user.role === 'student' && order.student_id !== req.user.id) {
      return fail(res, '只能取消自己的工单', 403, 403);
    }
    if (!['pending', 'assigned'].includes(order.status)) {
      return fail(res, '当前状态不可取消');
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    await run(
      'UPDATE work_orders SET status = ?, updated_at = ? WHERE id = ?',
      ['cancelled', now, req.params.id]
    );
    await addLog(req.params.id, 'cancel', req.user.id, '工单已取消');

    success(res, null, '取消成功');
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

router.get('/:id/similar-history', authMiddleware, requireRole('worker', 'admin', 'storekeeper'), async (req, res) => {
  try {
    const order = await get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    if (!order) return fail(res, '工单不存在', 404, 404);

    const history = await all(
      `SELECT wo.id, wo.order_no, wo.status, wo.created_at, wo.completed_at,
              b.name as building_name, r.room_no, u.real_name as worker_name,
              GROUP_CONCAT(DISTINCT m.name || '(' || m.model || ')' || 'x' || mi.quantity, '; ') as materials_used
       FROM work_orders wo
       JOIN buildings b ON wo.building_id = b.id
       JOIN rooms r ON wo.room_id = r.id
       LEFT JOIN users u ON wo.worker_id = u.id
       LEFT JOIN material_issues mi ON mi.work_order_id = wo.id
       LEFT JOIN materials m ON mi.material_id = m.id
       WHERE wo.repair_type_id = ? AND wo.status IN ('completed', 'confirmed') AND wo.id != ?
       GROUP BY wo.id
       ORDER BY wo.created_at DESC
       LIMIT 20`,
      [order.repair_type_id, order.id]
    );

    const materialStats = await all(
      `SELECT m.id, m.name, m.model, m.unit, m.category,
              SUM(mi.quantity - mi.returned_quantity) as total_used
       FROM material_issues mi
       JOIN materials m ON mi.material_id = m.id
       JOIN work_orders wo ON mi.work_order_id = wo.id
       WHERE wo.repair_type_id = ? AND wo.status IN ('completed', 'confirmed')
       GROUP BY m.id
       ORDER BY total_used DESC
       LIMIT 10`,
      [order.repair_type_id]
    );

    success(res, { history, recommended_materials: materialStats });
  } catch (err) {
    fail(res, err.message, 500, 500);
  }
});

module.exports = router;
