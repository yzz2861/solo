const { Router } = require('express');
const { getDb, findById, find } = require('../db');

const router = Router();

router.get('/unreturned', (req, res) => {
  const db = getDb();
  const techId = req.user.technician_id;
  if (!techId) return res.status(400).json({ error: '当前用户未关联师傅' });

  const checkouts = find(db, 'checkout_records', r =>
    r.technician_id === techId && (r.status === 'checked_out' || r.status === 'installed')
  );

  const enriched = checkouts.map(c => {
    const returns = find(db, 'return_records', r => r.checkout_record_id === c.id);
    const alreadyReturned = returns.reduce((sum, r) => sum + Number(r.returned_qty), 0);
    const remaining = Number(c.qty) - alreadyReturned;

    return {
      ...c,
      spare_part: findById(db, 'spare_parts', c.spare_part_id),
      work_order: findById(db, 'work_orders', c.work_order_id),
      remaining_qty: remaining,
      days_since_checkout: Math.floor((Date.now() - new Date(c.checkout_date).getTime()) / 86400000)
    };
  }).filter(c => c.remaining_qty > 0);

  res.json(enriched);
});

router.get('/old-part-reminders', (req, res) => {
  const db = getDb();
  const techId = req.user.technician_id;
  if (!techId) return res.status(400).json({ error: '当前用户未关联师傅' });

  const pending = find(db, 'old_part_recoveries', r =>
    r.technician_id === techId && r.status === 'pending'
  );

  const enriched = pending.map(r => ({
    ...r,
    spare_part: findById(db, 'spare_parts', r.spare_part_id),
    work_order: findById(db, 'work_orders', r.work_order_id),
    checkout: findById(db, 'checkout_records', r.checkout_record_id),
    days_pending: Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)
  }));

  const urgent = enriched.filter(r => r.days_pending >= 3);
  const normal = enriched.filter(r => r.days_pending < 3);

  res.json({
    total_pending: enriched.length,
    urgent_reminders: urgent,
    normal_reminders: normal,
    message: urgent.length > 0
      ? `有 ${urgent.length} 件旧件超过3天未回收，请尽快处理！`
      : enriched.length > 0
        ? `有 ${enriched.length} 件旧件待回收`
        : '没有待回收的旧件'
  });
});

router.get('/dashboard', (req, res) => {
  const db = getDb();
  const techId = req.user.technician_id;
  if (!techId) return res.status(400).json({ error: '当前用户未关联师傅' });

  const checkouts = find(db, 'checkout_records', r => r.technician_id === techId);
  const unreturned = checkouts.filter(c => c.status === 'checked_out' || c.status === 'installed');
  const pendingRecoveries = find(db, 'old_part_recoveries', r =>
    r.technician_id === techId && r.status === 'pending'
  );
  const pendingScraps = find(db, 'scrap_records', s =>
    s.scrap_by === techId && s.status === 'pending'
  );

  res.json({
    total_checkouts: checkouts.length,
    unreturned_count: unreturned.length,
    old_part_pending: pendingRecoveries.length,
    scrap_pending: pendingScraps.length,
    recent_checkouts: checkouts.slice(-5).map(c => ({
      ...c,
      spare_part: findById(db, 'spare_parts', c.spare_part_id),
      work_order: findById(db, 'work_orders', c.work_order_id)
    }))
  });
});

module.exports = router;
