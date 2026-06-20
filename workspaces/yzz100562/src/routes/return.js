const { Router } = require('express');
const { getDb, findById, find, insert, update } = require('../db');

const router = Router();

router.post('/:checkoutId/return', (req, res) => {
  const { checkoutId } = req.params;
  const { returned_qty, reason, condition } = req.body;

  if (!returned_qty || returned_qty < 1) {
    return res.status(400).json({ error: '退回数量必须大于0' });
  }
  if (!['good', 'damaged'].includes(condition)) {
    return res.status(400).json({ error: 'condition 必须为 good 或 damaged' });
  }

  const db = getDb();
  const checkout = findById(db, 'checkout_records', checkoutId);
  if (!checkout) return res.status(404).json({ error: '领用记录不存在' });
  if (checkout.status === 'returned') {
    return res.status(400).json({ error: '该领用已全部退回' });
  }
  if (checkout.status === 'scrapped') {
    return res.status(400).json({ error: '该领用已报废，不可退回' });
  }

  const alreadyReturned = find(db, 'return_records', r => r.checkout_record_id === String(checkoutId))
    .reduce((sum, r) => sum + Number(r.returned_qty), 0);
  if (alreadyReturned + Number(returned_qty) > Number(checkout.qty)) {
    return res.status(400).json({
      error: `退回数量超出领用数量，已退回: ${alreadyReturned}, 领用: ${checkout.qty}`
    });
  }

  const returnRecord = insert(db, 'return_records', {
    checkout_record_id: String(checkoutId),
    returned_qty: Number(returned_qty),
    returned_at: new Date().toISOString(),
    returned_by: req.user.technician_id || req.user.id,
    reason: reason || null,
    condition
  });

  if (condition === 'good') {
    const part = findById(db, 'spare_parts', checkout.spare_part_id);
    update(db, 'spare_parts', checkout.spare_part_id, {
      stock_qty: part.stock_qty + Number(returned_qty)
    });

    insert(db, 'inventory_flows', {
      spare_part_id: checkout.spare_part_id,
      type: 'return',
      qty: Number(returned_qty),
      reference_id: returnRecord.id,
      reference_type: 'return',
      operator_id: req.user.id,
      notes: condition === 'good' ? '完好退回入库' : '损坏退回'
    });
  } else {
    insert(db, 'inventory_flows', {
      spare_part_id: checkout.spare_part_id,
      type: 'return_damaged',
      qty: 0,
      reference_id: returnRecord.id,
      reference_type: 'return',
      operator_id: req.user.id,
      notes: '损坏退回，不入库'
    });
  }

  const newTotalReturned = alreadyReturned + Number(returned_qty);
  if (newTotalReturned >= Number(checkout.qty)) {
    update(db, 'checkout_records', checkoutId, { status: 'returned' });
  }

  res.status(201).json(returnRecord);
});

router.get('/', (req, res) => {
  const db = getDb();
  let records = db.return_records || [];
  const { checkout_record_id, condition } = req.query;
  if (checkout_record_id) records = records.filter(r => r.checkout_record_id === checkout_record_id);
  if (condition) records = records.filter(r => r.condition === condition);

  res.json(records);
});

module.exports = router;
