const { Router } = require('express');
const { getDb, findById, find, insert, update } = require('../db');

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const parts = db.spare_parts || [];
  const { category } = req.query;
  const filtered = category ? parts.filter(p => p.category === category) : parts;
  res.json(filtered);
});

router.post('/', (req, res) => {
  const { name, category, sku, stock_qty, unit_price, min_stock } = req.body;
  if (!name || !category || !sku || stock_qty === undefined) {
    return res.status(400).json({ error: '备件名称、分类、SKU和库存数量为必填' });
  }
  if (!['主板', '电机', '传感器', '其他'].includes(category)) {
    return res.status(400).json({ error: '分类必须为主板/电机/传感器/其他' });
  }

  const db = getDb();
  const existing = find(db, 'spare_parts', p => p.sku === sku);
  if (existing.length) return res.status(409).json({ error: 'SKU已存在' });

  const part = insert(db, 'spare_parts', {
    name,
    category,
    sku,
    stock_qty: Number(stock_qty),
    unit_price: unit_price ? Number(unit_price) : 0,
    min_stock: min_stock ? Number(min_stock) : 5,
    station_id: '1'
  });

  res.status(201).json(part);
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const part = findById(db, 'spare_parts', req.params.id);
  if (!part) return res.status(404).json({ error: '备件不存在' });

  const allowed = ['name', 'category', 'unit_price', 'min_stock'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: '没有可更新的字段' });
  }

  const updated = update(db, 'spare_parts', req.params.id, updates);
  res.json(updated);
});

router.post('/:id/adjust-stock', (req, res) => {
  const { qty, notes } = req.body;
  if (qty === undefined) return res.status(400).json({ error: '调整数量为必填' });

  const db = getDb();
  const part = findById(db, 'spare_parts', req.params.id);
  if (!part) return res.status(404).json({ error: '备件不存在' });

  const newQty = part.stock_qty + Number(qty);
  if (newQty < 0) return res.status(400).json({ error: '调整后库存不能为负数' });

  update(db, 'spare_parts', req.params.id, { stock_qty: newQty });

  insert(db, 'inventory_flows', {
    spare_part_id: req.params.id,
    type: 'adjust',
    qty: Number(qty),
    reference_id: null,
    reference_type: 'adjust',
    operator_id: req.user.id,
    notes: notes || '库存调整'
  });

  res.json({ stock_qty: newQty, part: findById(db, 'spare_parts', req.params.id) });
});

module.exports = router;
