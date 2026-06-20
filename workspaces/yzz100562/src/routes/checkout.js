const { Router } = require('express');
const { getDb, findById, find, insert, update } = require('../db');

const router = Router();

router.post('/', async (req, res) => {
  const { work_order_id, spare_part_id, qty, reason } = req.body;
  const technician_id = req.user.technician_id;

  if (!work_order_id || !spare_part_id || !qty) {
    return res.status(400).json({ error: '工单ID、备件ID和数量为必填' });
  }

  const db = getDb();
  const wo = findById(db, 'work_orders', work_order_id);
  if (!wo) return res.status(404).json({ error: '工单不存在' });
  if (wo.status === 'closed') return res.status(400).json({ error: '工单已关闭，不可领用' });
  if (wo.technician_id !== technician_id) {
    return res.status(403).json({ error: '只能从自己的工单领用备件' });
  }

  const part = findById(db, 'spare_parts', spare_part_id);
  if (!part) return res.status(404).json({ error: '备件不存在' });
  if (part.stock_qty < qty) {
    return res.status(400).json({ error: `库存不足，当前库存: ${part.stock_qty}` });
  }

  const existing = find(db, 'checkout_records', r =>
    r.work_order_id === String(work_order_id) &&
    r.spare_part_id === String(spare_part_id) &&
    r.status === 'checked_out'
  );
  if (existing.length > 0 && !reason) {
    return res.status(400).json({
      error: '同一工单已领用相同备件，请填写重复领用原因',
      existing_checkouts: existing
    });
  }

  const checkout = insert(db, 'checkout_records', {
    work_order_id: String(work_order_id),
    spare_part_id: String(spare_part_id),
    technician_id: String(technician_id),
    qty: Number(qty),
    reason: reason || null,
    status: 'checked_out',
    checkout_date: new Date().toISOString()
  });

  update(db, 'spare_parts', spare_part_id, {
    stock_qty: part.stock_qty - Number(qty)
  });

  insert(db, 'inventory_flows', {
    spare_part_id: String(spare_part_id),
    type: 'checkout',
    qty: -Number(qty),
    reference_id: checkout.id,
    reference_type: 'checkout',
    operator_id: req.user.id,
    notes: `工单${wo.order_no}领用`
  });

  res.status(201).json(checkout);
});

router.get('/', (req, res) => {
  const db = getDb();
  let records = db.checkout_records || [];

  const { work_order_id, technician_id, status, spare_part_id } = req.query;
  if (work_order_id) records = records.filter(r => r.work_order_id === work_order_id);
  if (technician_id) records = records.filter(r => r.technician_id === technician_id);
  if (status) records = records.filter(r => r.status === status);
  if (spare_part_id) records = records.filter(r => r.spare_part_id === spare_part_id);

  const enriched = records.map(r => ({
    ...r,
    spare_part: findById(db, 'spare_parts', r.spare_part_id),
    work_order: findById(db, 'work_orders', r.work_order_id),
    technician: findById(db, 'technicians', r.technician_id)
  }));

  res.json(enriched);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const record = findById(db, 'checkout_records', req.params.id);
  if (!record) return res.status(404).json({ error: '领用记录不存在' });

  res.json({
    ...record,
    spare_part: findById(db, 'spare_parts', record.spare_part_id),
    work_order: findById(db, 'work_orders', record.work_order_id),
    technician: findById(db, 'technicians', record.technician_id),
    install: find(db, 'install_records', i => i.checkout_record_id === record.id),
    recovery: find(db, 'old_part_recoveries', r => r.checkout_record_id === record.id),
    returns: find(db, 'return_records', r => r.checkout_record_id === record.id),
    scraps: find(db, 'scrap_records', s => s.checkout_record_id === record.id)
  });
});

module.exports = router;
