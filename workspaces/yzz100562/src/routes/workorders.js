const { Router } = require('express');
const { getDb, findById, find, insert, update } = require('../db');

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  let orders = db.work_orders || [];
  const { status, technician_id } = req.query;
  if (status) orders = orders.filter(o => o.status === status);
  if (technician_id) orders = orders.filter(o => o.technician_id === technician_id);

  const enriched = orders.map(o => ({
    ...o,
    technician: findById(db, 'technicians', o.technician_id),
    checkout_count: find(db, 'checkout_records', c => c.work_order_id === o.id).length
  }));

  res.json(enriched);
});

router.post('/', (req, res) => {
  const { order_no, customer_name, customer_phone, address, technician_id } = req.body;
  if (!order_no || !customer_name || !technician_id) {
    return res.status(400).json({ error: '工单号、客户姓名和师傅ID为必填' });
  }

  const db = getDb();
  const tech = findById(db, 'technicians', technician_id);
  if (!tech) return res.status(404).json({ error: '师傅不存在' });

  const existing = find(db, 'work_orders', o => o.order_no === order_no);
  if (existing.length) return res.status(409).json({ error: '工单号已存在' });

  const order = insert(db, 'work_orders', {
    order_no,
    customer_name,
    customer_phone: customer_phone || null,
    address: address || null,
    technician_id: String(technician_id),
    status: 'pending'
  });

  res.status(201).json(order);
});

router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['pending', 'in_progress', 'completed', 'closed'].includes(status)) {
    return res.status(400).json({ error: '状态必须为 pending/in_progress/completed/closed' });
  }

  const db = getDb();
  const order = findById(db, 'work_orders', req.params.id);
  if (!order) return res.status(404).json({ error: '工单不存在' });

  if (status === 'closed' && order.status !== 'completed') {
    return res.status(400).json({ error: '只有已完成的工单才能关闭' });
  }

  const updated = update(db, 'work_orders', req.params.id, { status });
  res.json(updated);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const order = findById(db, 'work_orders', req.params.id);
  if (!order) return res.status(404).json({ error: '工单不存在' });

  const checkouts = find(db, 'checkout_records', c => c.work_order_id === order.id);
  const enrichedCheckouts = checkouts.map(c => ({
    ...c,
    spare_part: findById(db, 'spare_parts', c.spare_part_id),
    recovery: find(db, 'old_part_recoveries', r => r.checkout_record_id === c.id),
    returns: find(db, 'return_records', r => r.checkout_record_id === c.id),
    scraps: find(db, 'scrap_records', s => s.checkout_record_id === c.id)
  }));

  res.json({
    ...order,
    technician: findById(db, 'technicians', order.technician_id),
    checkouts: enrichedCheckouts
  });
});

module.exports = router;
