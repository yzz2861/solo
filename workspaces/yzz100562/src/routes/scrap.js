const { Router } = require('express');
const { getDb, findById, find, insert, update } = require('../db');

const router = Router();

router.post('/:checkoutId/scrap', (req, res) => {
  const { checkoutId } = req.params;
  const { scrap_qty, reason } = req.body;

  if (!scrap_qty || scrap_qty < 1) {
    return res.status(400).json({ error: '报废数量必须大于0' });
  }
  if (!reason) {
    return res.status(400).json({ error: '报废必须填写原因' });
  }

  const db = getDb();
  const checkout = findById(db, 'checkout_records', checkoutId);
  if (!checkout) return res.status(404).json({ error: '领用记录不存在' });
  if (checkout.status === 'scrapped') {
    return res.status(400).json({ error: '该领用已报废' });
  }

  const wo = findById(db, 'work_orders', checkout.work_order_id);
  if (wo && wo.status !== 'completed' && wo.status !== 'closed') {
    return res.status(400).json({ error: '未完成工单不能将备件直接报废，请先完成或关闭工单' });
  }

  const alreadyScrapped = find(db, 'scrap_records', s => s.checkout_record_id === String(checkoutId) && s.status !== 'rejected')
    .reduce((sum, s) => sum + Number(s.scrap_qty), 0);
  const alreadyReturned = find(db, 'return_records', r => r.checkout_record_id === String(checkoutId))
    .reduce((sum, r) => sum + Number(r.returned_qty), 0);

  if (alreadyScrapped + alreadyReturned + Number(scrap_qty) > Number(checkout.qty)) {
    return res.status(400).json({
      error: '报废数量超出可报废数量',
      available: Number(checkout.qty) - alreadyScrapped - alreadyReturned
    });
  }

  const scrap = insert(db, 'scrap_records', {
    checkout_record_id: String(checkoutId),
    spare_part_id: checkout.spare_part_id,
    scrap_qty: Number(scrap_qty),
    reason,
    status: 'pending',
    scrap_at: new Date().toISOString(),
    scrap_by: req.user.technician_id || req.user.id,
    approved_by: null,
    approved_at: null
  });

  insert(db, 'inventory_flows', {
    spare_part_id: checkout.spare_part_id,
    type: 'scrap',
    qty: 0,
    reference_id: scrap.id,
    reference_type: 'scrap',
    operator_id: req.user.id,
    notes: `报废申请: ${reason}`
  });

  res.status(201).json(scrap);
});

router.get('/', (req, res) => {
  const db = getDb();
  let records = db.scrap_records || [];
  const { status } = req.query;
  if (status) records = records.filter(r => r.status === status);

  const enriched = records.map(s => ({
    ...s,
    spare_part: findById(db, 'spare_parts', s.spare_part_id),
    checkout: findById(db, 'checkout_records', s.checkout_record_id)
  }));

  res.json(enriched);
});

router.put('/:id/approve', (req, res) => {
  const db = getDb();
  const scrap = findById(db, 'scrap_records', req.params.id);
  if (!scrap) return res.status(404).json({ error: '报废记录不存在' });
  if (scrap.status !== 'pending') {
    return res.status(400).json({ error: `报废申请状态为 ${scrap.status}，无法审批` });
  }

  update(db, 'scrap_records', req.params.id, {
    status: 'approved',
    approved_by: req.user.id,
    approved_at: new Date().toISOString()
  });

  const checkout = findById(db, 'checkout_records', scrap.checkout_record_id);
  const alreadyScrapped = find(db, 'scrap_records', s => s.checkout_record_id === scrap.checkout_record_id && s.status === 'approved')
    .reduce((sum, s) => sum + Number(s.scrap_qty), 0);
  const alreadyReturned = find(db, 'return_records', r => r.checkout_record_id === scrap.checkout_record_id)
    .reduce((sum, r) => sum + Number(r.returned_qty), 0);

  if (alreadyScrapped + alreadyReturned >= Number(checkout.qty)) {
    update(db, 'checkout_records', scrap.checkout_record_id, { status: 'scrapped' });
  }

  res.json({ message: '报废申请已批准', scrap: findById(db, 'scrap_records', req.params.id) });
});

router.put('/:id/reject', (req, res) => {
  const db = getDb();
  const scrap = findById(db, 'scrap_records', req.params.id);
  if (!scrap) return res.status(404).json({ error: '报废记录不存在' });
  if (scrap.status !== 'pending') {
    return res.status(400).json({ error: `报废申请状态为 ${scrap.status}，无法操作` });
  }

  update(db, 'scrap_records', req.params.id, {
    status: 'rejected',
    approved_by: req.user.id,
    approved_at: new Date().toISOString()
  });

  res.json({ message: '报废申请已驳回', scrap: findById(db, 'scrap_records', req.params.id) });
});

module.exports = router;
