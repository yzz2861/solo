const { Router } = require('express');
const { getDb, find, findById } = require('../db');

const router = Router();

router.get('/flows', (req, res) => {
  const db = getDb();
  let flows = db.inventory_flows || [];

  const { spare_part_id, type, start_date, end_date } = req.query;
  if (spare_part_id) flows = flows.filter(f => f.spare_part_id === spare_part_id);
  if (type) flows = flows.filter(f => f.type === type);
  if (start_date) flows = flows.filter(f => f.created_at >= start_date);
  if (end_date) flows = flows.filter(f => f.created_at <= end_date + 'T23:59:59.999Z');

  const enriched = flows.map(f => ({
    ...f,
    spare_part: findById(db, 'spare_parts', f.spare_part_id)
  }));

  res.json(enriched);
});

router.get('/stock-summary', (req, res) => {
  const db = getDb();
  const parts = db.spare_parts || [];

  const summary = parts.map(p => {
    const flows = find(db, 'inventory_flows', f => f.spare_part_id === p.id);
    const totalOut = flows.filter(f => f.type === 'checkout').reduce((s, f) => s + Math.abs(Number(f.qty)), 0);
    const totalIn = flows.filter(f => f.type === 'return').reduce((s, f) => s + Number(f.qty), 0);
    const totalScrap = flows.filter(f => f.type === 'scrap').length;

    return {
      ...p,
      total_checked_out: totalOut,
      total_returned: totalIn,
      total_scrap_requests: totalScrap,
      flow_count: flows.length
    };
  });

  res.json(summary);
});

router.get('/parts', (req, res) => {
  const db = getDb();
  let parts = db.spare_parts || [];
  const { category, low_stock } = req.query;
  if (category) parts = parts.filter(p => p.category === category);
  if (low_stock === 'true') parts = parts.filter(p => p.stock_qty <= (p.min_stock || 5));

  res.json(parts);
});

router.get('/flows/export', (req, res) => {
  const db = getDb();
  let flows = db.inventory_flows || [];

  const { spare_part_id, type, start_date, end_date } = req.query;
  if (spare_part_id) flows = flows.filter(f => f.spare_part_id === spare_part_id);
  if (type) flows = flows.filter(f => f.type === type);
  if (start_date) flows = flows.filter(f => f.created_at >= start_date);
  if (end_date) flows = flows.filter(f => f.created_at <= end_date + 'T23:59:59.999Z');

  const csv = require('csv-stringify');
  const rows = flows.map(f => {
    const part = findById(db, 'spare_parts', f.spare_part_id);
    return [f.created_at, part?.name || '', part?.sku || '', f.type, f.qty, f.notes || ''];
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=inventory_flows.csv');

  csv.stringify([['时间', '备件名称', 'SKU', '类型', '数量', '备注'], ...rows], (err, output) => {
    if (err) return res.status(500).json({ error: '导出失败' });
    res.send('\uFEFF' + output);
  });
});

module.exports = router;
