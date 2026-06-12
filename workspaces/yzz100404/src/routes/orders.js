const express = require('express');
const { getDB } = require('../db');
const dayjs = require('dayjs');

const router = express.Router();

const addTimeline = (orderId, action, operatorName, detail) => {
  const db = getDB();
  db.prepare(`
    INSERT INTO order_timeline (order_id, action, operator, detail, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(orderId, action, operatorName, detail || null, dayjs().format());
};

const generateOrderNo = () => {
  const db = getDB();
  const date = dayjs().format('YYYYMMDD');
  const count = db.prepare(`
    SELECT COUNT(*) as cnt FROM fault_orders WHERE order_no LIKE ?
  `).get(`${date}%`).cnt + 1;
  return `${date}${String(count).padStart(4, '0')}`;
};

router.get('/', (req, res) => {
  const db = getDB();
  const { status, pile_id, repairer_id, start_date, end_date, keyword, page = 1, page_size = 20 } = req.query;
  let sql = `
    SELECT fo.*, cp.pile_no, cp.location, cp.pile_type, cp.batch_no,
           r.name as repairer_name, r.phone as repairer_phone,
           o.name as reviewer_name
    FROM fault_orders fo
    LEFT JOIN charging_piles cp ON fo.pile_id = cp.id
    LEFT JOIN repairers r ON fo.repairer_id = r.id
    LEFT JOIN operators o ON fo.reviewer_id = o.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND fo.status = ?';
    params.push(status);
  }
  if (pile_id) {
    sql += ' AND fo.pile_id = ?';
    params.push(pile_id);
  }
  if (repairer_id) {
    sql += ' AND fo.repairer_id = ?';
    params.push(repairer_id);
  }
  if (start_date) {
    sql += ' AND fo.created_at >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND fo.created_at <= ?';
    params.push(end_date);
  }
  if (keyword) {
    sql += ' AND (fo.order_no LIKE ? OR cp.pile_no LIKE ? OR fo.description LIKE ? OR fo.reporter LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const countSql = sql.replace('SELECT fo.*, cp.pile_no, cp.location, cp.pile_type, cp.batch_no, r.name as repairer_name, r.phone as repairer_phone, o.name as reviewer_name', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;

  sql += ' ORDER BY fo.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), (Number(page) - 1) * Number(page_size));

  const orders = db.prepare(sql).all(...params);
  res.json({
    total,
    page: Number(page),
    page_size: Number(page_size),
    list: orders,
  });
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const order = db.prepare(`
    SELECT fo.*, cp.pile_no, cp.location, cp.pile_type, cp.batch_no,
           r.name as repairer_name, r.phone as repairer_phone,
           o.name as reviewer_name
    FROM fault_orders fo
    LEFT JOIN charging_piles cp ON fo.pile_id = cp.id
    LEFT JOIN repairers r ON fo.repairer_id = r.id
    LEFT JOIN operators o ON fo.reviewer_id = o.id
    WHERE fo.id = ?
  `).get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: '工单不存在' });
  }

  const timeline = db.prepare('SELECT * FROM order_timeline WHERE order_id = ? ORDER BY created_at ASC').all(req.params.id);
  const mergedOrders = db.prepare(`
    SELECT fo.*, cp.pile_no FROM fault_orders fo
    LEFT JOIN charging_piles cp ON fo.pile_id = cp.id
    WHERE merged_to_order_id = ?
  `).all(req.params.id);

  res.json({ ...order, timeline, merged_orders: mergedOrders });
});

router.post('/report', (req, res) => {
  const db = getDB();
  const { pile_id, description, reporter, reporter_phone, operator_name } = req.body;

  if (!pile_id || !description || !reporter) {
    return res.status(400).json({ error: '桩号ID、故障描述、上报人为必填项' });
  }

  const pile = db.prepare('SELECT * FROM charging_piles WHERE id = ?').get(pile_id);
  if (!pile) {
    return res.status(404).json({ error: '充电桩不存在' });
  }

  const twoHoursAgo = dayjs().subtract(2, 'hour').format();
  const existingOrder = db.prepare(`
    SELECT * FROM fault_orders
    WHERE pile_id = ?
      AND status IN ('pending', 'assigned', 'repairing', 'reviewing')
      AND created_at >= ?
      AND merged_to_order_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `).get(pile_id, twoHoursAgo);

  const tx = db.transaction(() => {
    if (existingOrder) {
      const mergedOrderNo = generateOrderNo();
      const deadline = dayjs().add(24, 'hour').format();

      db.prepare(`
        INSERT INTO fault_orders (order_no, pile_id, description, reporter, reporter_phone, status, merged_to_order_id, deadline, created_at)
        VALUES (?, ?, ?, ?, ?, 'merged', ?, ?, ?)
      `).run(mergedOrderNo, pile_id, description, reporter, reporter_phone || null, existingOrder.id, deadline, dayjs().format());

      const detail = `新上报已合并至工单 ${existingOrder.order_no}：${description}（上报人：${reporter}）`;
      addTimeline(existingOrder.id, 'merge', operator_name || '系统', detail);

      const mergedOrder = db.prepare('SELECT * FROM fault_orders WHERE order_no = ?').get(mergedOrderNo);
      return { order: existingOrder, merged: true, merged_order_id: mergedOrder.id };
    }

    const orderNo = generateOrderNo();
    const deadline = dayjs().add(24, 'hour').format();

    const stmt = db.prepare(`
      INSERT INTO fault_orders (order_no, pile_id, description, reporter, reporter_phone, status, deadline, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `);
    const result = stmt.run(orderNo, pile_id, description, reporter, reporter_phone || null, deadline, dayjs().format());
    const orderId = result.lastInsertRowid;

    db.prepare("UPDATE charging_piles SET status = 'out_of_service' WHERE id = ?").run(pile_id);

    addTimeline(orderId, 'report', operator_name || reporter, `故障上报：${description}`);

    const order = db.prepare(`
      SELECT fo.*, cp.pile_no, cp.location FROM fault_orders fo
      LEFT JOIN charging_piles cp ON fo.pile_id = cp.id
      WHERE fo.id = ?
    `).get(orderId);

    return { order, merged: false };
  });

  const result = tx();
  res.status(201).json(result);
});

router.post('/:id/assign', (req, res) => {
  const db = getDB();
  const { repairer_id, operator_name } = req.body;
  if (!repairer_id || !operator_name) {
    return res.status(400).json({ error: '维修工ID和操作人为必填项' });
  }

  const order = db.prepare('SELECT * FROM fault_orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: '工单不存在' });
  }
  if (order.status !== 'pending') {
    return res.status(400).json({ error: '只有待派单状态的工单才能派单' });
  }

  const repairer = db.prepare('SELECT * FROM repairers WHERE id = ?').get(repairer_id);
  if (!repairer) {
    return res.status(404).json({ error: '维修工不存在' });
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE fault_orders SET status = 'assigned', repairer_id = ? WHERE id = ?
    `).run(repairer_id, req.params.id);

    addTimeline(req.params.id, 'assign', operator_name, `派单给维修工：${repairer.name}`);
  });

  tx();

  const updated = db.prepare(`
    SELECT fo.*, r.name as repairer_name FROM fault_orders fo
    LEFT JOIN repairers r ON fo.repairer_id = r.id
    WHERE fo.id = ?
  `).get(req.params.id);

  res.json(updated);
});

router.post('/:id/repair', (req, res) => {
  const db = getDB();
  const { repairer_id, status, repair_result, repair_photo } = req.body;

  if (!repairer_id || !status || !repair_result) {
    return res.status(400).json({ error: '维修工ID、处理状态和处理结果为必填项' });
  }
  if (!['repairing', 'reviewing'].includes(status)) {
    return res.status(400).json({ error: '处理状态只能是 repairing 或 reviewing' });
  }

  const order = db.prepare('SELECT * FROM fault_orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: '工单不存在' });
  }
  if (!['assigned', 'repairing'].includes(order.status)) {
    return res.status(400).json({ error: '只有已派单或处理中状态的工单才能回填' });
  }
  if (order.repairer_id && order.repairer_id !== Number(repairer_id)) {
    return res.status(400).json({ error: '该工单已派给其他维修工' });
  }

  const repairer = db.prepare('SELECT name FROM repairers WHERE id = ?').get(repairer_id);

  const tx = db.transaction(() => {
    if (status === 'repairing') {
      db.prepare(`
        UPDATE fault_orders SET status = 'repairing', repairer_id = COALESCE(repairer_id, ?) WHERE id = ?
      `).run(repairer_id, req.params.id);
      addTimeline(req.params.id, 'start_repair', repairer?.name || '维修工', `开始处理：${repair_result}`);
    } else {
      db.prepare(`
        UPDATE fault_orders SET status = 'reviewing', repair_result = ?, repair_photo = ?, repair_at = ?, repairer_id = COALESCE(repairer_id, ?)
        WHERE id = ?
      `).run(repair_result, repair_photo || null, dayjs().format(), repairer_id, req.params.id);
      addTimeline(req.params.id, 'submit_review', repairer?.name || '维修工', `处理完成，提交复核：${repair_result}`);
    }
  });

  tx();

  const updated = db.prepare(`
    SELECT fo.*, r.name as repairer_name FROM fault_orders fo
    LEFT JOIN repairers r ON fo.repairer_id = r.id
    WHERE fo.id = ?
  `).get(req.params.id);

  res.json(updated);
});

router.post('/:id/review', (req, res) => {
  const db = getDB();
  const { reviewer_id, review_comment, passed, operator_name } = req.body;

  if (!reviewer_id || passed === undefined) {
    return res.status(400).json({ error: '复核人ID和复核结果为必填项' });
  }

  const order = db.prepare('SELECT * FROM fault_orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: '工单不存在' });
  }
  if (order.status !== 'reviewing') {
    return res.status(400).json({ error: '只有待复核状态的工单才能复核' });
  }

  const reviewer = db.prepare('SELECT name FROM operators WHERE id = ?').get(reviewer_id);

  const tx = db.transaction(() => {
    if (passed) {
      db.prepare(`
        UPDATE fault_orders SET status = 'completed', reviewer_id = ?, review_comment = ?, review_at = ?
        WHERE id = ?
      `).run(reviewer_id, review_comment || null, dayjs().format(), req.params.id);

      db.prepare("UPDATE charging_piles SET status = 'available' WHERE id = ?").run(order.pile_id);

      addTimeline(req.params.id, 'review_pass', reviewer?.name || operator_name || '物业', `复核通过${review_comment ? '：' + review_comment : ''}`);
    } else {
      db.prepare(`
        UPDATE fault_orders SET status = 'repairing', reviewer_id = ?, review_comment = ?
        WHERE id = ?
      `).run(reviewer_id, review_comment || null, req.params.id);

      addTimeline(req.params.id, 'review_reject', reviewer?.name || operator_name || '物业', `复核不通过，需重新处理${review_comment ? '：' + review_comment : ''}`);
    }
  });

  tx();

  const updated = db.prepare(`
    SELECT fo.*, cp.pile_no, cp.status as pile_status, r.name as repairer_name, o.name as reviewer_name
    FROM fault_orders fo
    LEFT JOIN charging_piles cp ON fo.pile_id = cp.id
    LEFT JOIN repairers r ON fo.repairer_id = r.id
    LEFT JOIN operators o ON fo.reviewer_id = o.id
    WHERE fo.id = ?
  `).get(req.params.id);

  res.json(updated);
});

router.get('/:id/timeline', (req, res) => {
  const db = getDB();
  const timeline = db.prepare('SELECT * FROM order_timeline WHERE order_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(timeline);
});

module.exports = router;
