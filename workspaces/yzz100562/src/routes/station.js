const { Router } = require('express');
const { getDb, findById, find } = require('../db');

const router = Router();

router.get('/unreturned', (req, res) => {
  const db = getDb();
  const checkouts = find(db, 'checkout_records', r =>
    r.status === 'checked_out' || r.status === 'installed'
  );

  const enriched = checkouts.map(c => {
    const returns = find(db, 'return_records', r => r.checkout_record_id === c.id);
    const alreadyReturned = returns.reduce((sum, r) => sum + Number(r.returned_qty), 0);
    const remaining = Number(c.qty) - alreadyReturned;

    return {
      ...c,
      spare_part: findById(db, 'spare_parts', c.spare_part_id),
      work_order: findById(db, 'work_orders', c.work_order_id),
      technician: findById(db, 'technicians', c.technician_id),
      remaining_qty: remaining,
      days_since_checkout: Math.floor((Date.now() - new Date(c.checkout_date).getTime()) / 86400000)
    };
  }).filter(c => c.remaining_qty > 0);

  res.json(enriched);
});

router.get('/unreturned/export', (req, res) => {
  const db = getDb();
  const checkouts = find(db, 'checkout_records', r =>
    r.status === 'checked_out' || r.status === 'installed'
  );

  const csv = require('csv-stringify');
  const rows = checkouts.map(c => {
    const part = findById(db, 'spare_parts', c.spare_part_id);
    const tech = findById(db, 'technicians', c.technician_id);
    const wo = findById(db, 'work_orders', c.work_order_id);
    const returns = find(db, 'return_records', r => r.checkout_record_id === c.id);
    const alreadyReturned = returns.reduce((sum, r) => sum + Number(r.returned_qty), 0);
    const days = Math.floor((Date.now() - new Date(c.checkout_date).getTime()) / 86400000);

    return [wo?.order_no || '', tech?.name || '', part?.name || '', c.qty, alreadyReturned, Number(c.qty) - alreadyReturned, c.checkout_date?.slice(0, 10), days];
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=unreturned_parts.csv');

  csv.stringify([['工单号', '师傅', '备件', '领用数量', '已退回', '未归还', '领用日期', '天数'], ...rows], (err, output) => {
    if (err) return res.status(500).json({ error: '导出失败' });
    res.send('\uFEFF' + output);
  });
});

router.get('/old-part-missing', (req, res) => {
  const db = getDb();
  const pending = find(db, 'old_part_recoveries', r => r.status === 'pending');

  const enriched = pending.map(r => ({
    ...r,
    spare_part: findById(db, 'spare_parts', r.spare_part_id),
    work_order: findById(db, 'work_orders', r.work_order_id),
    technician: findById(db, 'technicians', r.technician_id),
    checkout: findById(db, 'checkout_records', r.checkout_record_id),
    days_pending: Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)
  }));

  res.json(enriched);
});

router.get('/old-part-missing/export', (req, res) => {
  const db = getDb();
  const pending = find(db, 'old_part_recoveries', r => r.status === 'pending');

  const csv = require('csv-stringify');
  const rows = pending.map(r => {
    const part = findById(db, 'spare_parts', r.spare_part_id);
    const tech = findById(db, 'technicians', r.technician_id);
    const wo = findById(db, 'work_orders', r.work_order_id);
    const days = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);

    return [wo?.order_no || '', tech?.name || '', part?.name || '', days, '未回收'];
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=old_part_missing.csv');

  csv.stringify([['工单号', '师傅', '备件', '待回收天数', '状态'], ...rows], (err, output) => {
    if (err) return res.status(500).json({ error: '导出失败' });
    res.send('\uFEFF' + output);
  });
});

router.get('/scrap-pending', (req, res) => {
  const db = getDb();
  const pending = find(db, 'scrap_records', r => r.status === 'pending');

  const enriched = pending.map(s => ({
    ...s,
    spare_part: findById(db, 'spare_parts', s.spare_part_id),
    checkout: findById(db, 'checkout_records', s.checkout_record_id),
    work_order: s.checkout ? findById(db, 'work_orders', s.checkout.work_order_id) : null
  }));

  res.json(enriched);
});

router.get('/inventory-risk', (req, res) => {
  const db = getDb();
  const technicians = db.technicians || [];
  const parts = db.spare_parts || [];

  const techRisks = technicians.map(tech => {
    const checkouts = find(db, 'checkout_records', r =>
      r.technician_id === tech.id && (r.status === 'checked_out' || r.status === 'installed')
    );
    const pendingRecoveries = find(db, 'old_part_recoveries', r =>
      r.technician_id === tech.id && r.status === 'pending'
    );
    const overdueRecoveries = pendingRecoveries.filter(r =>
      Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000) >= 3
    );
    const pendingScraps = find(db, 'scrap_records', s =>
      s.scrap_by === tech.id && s.status === 'pending'
    );

    return {
      technician: tech,
      unreturned_count: checkouts.length,
      old_part_pending: pendingRecoveries.length,
      old_part_overdue: overdueRecoveries.length,
      scrap_pending: pendingScraps.length,
      risk_level: overdueRecoveries.length > 2 ? 'high' : overdueRecoveries.length > 0 ? 'medium' : 'low'
    };
  });

  const lowStockParts = parts.filter(p => p.stock_qty <= (p.min_stock || 5));

  const partRiskMap = {};
  find(db, 'checkout_records', r => r.status === 'checked_out' || r.status === 'installed').forEach(c => {
    if (!partRiskMap[c.spare_part_id]) {
      partRiskMap[c.spare_part_id] = { part: findById(db, 'spare_parts', c.spare_part_id), checked_out_qty: 0, technicians: [] };
    }
    partRiskMap[c.spare_part_id].checked_out_qty += Number(c.qty);
    const tech = findById(db, 'technicians', c.technician_id);
    if (tech && !partRiskMap[c.spare_part_id].technicians.find(t => t.id === tech.id)) {
      partRiskMap[c.spare_part_id].technicians.push(tech);
    }
  });

  res.json({
    technician_risks: techRisks,
    low_stock_parts: lowStockParts,
    part_checkout_concentration: Object.values(partRiskMap).filter(p => p.technicians.length > 1),
    summary: {
      total_technicians: technicians.length,
      high_risk_count: techRisks.filter(t => t.risk_level === 'high').length,
      medium_risk_count: techRisks.filter(t => t.risk_level === 'medium').length,
      low_stock_count: lowStockParts.length
    }
  });
});

module.exports = router;
