const { Router } = require('express');
const { getDb, findById, find, insert, update } = require('../db');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `recovery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.post('/:checkoutId/install', (req, res) => {
  const { checkoutId } = req.params;
  const { notes } = req.body;
  const db = getDb();

  const checkout = findById(db, 'checkout_records', checkoutId);
  if (!checkout) return res.status(404).json({ error: '领用记录不存在' });
  if (checkout.status !== 'checked_out') {
    return res.status(400).json({ error: '该领用记录状态不允许安装确认' });
  }
  if (checkout.technician_id !== req.user.technician_id && req.user.role !== 'station_manager') {
    return res.status(403).json({ error: '只能确认自己领用的备件安装' });
  }

  const install = insert(db, 'install_records', {
    checkout_record_id: String(checkoutId),
    installed_at: new Date().toISOString(),
    installed_by: req.user.technician_id || req.user.id,
    notes: notes || null
  });

  update(db, 'checkout_records', checkoutId, { status: 'installed' });

  insert(db, 'old_part_recoveries', {
    checkout_record_id: String(checkoutId),
    spare_part_id: checkout.spare_part_id,
    work_order_id: checkout.work_order_id,
    technician_id: checkout.technician_id,
    status: 'pending',
    photo_paths: [],
    notes: null,
    recovered_at: null,
    recovered_by: null
  });

  res.status(201).json({ install, message: '安装已确认，请尽快回收旧件' });
});

router.post('/:checkoutId/recovery', upload.array('photos', 5), (req, res) => {
  const { checkoutId } = req.params;
  const { notes } = req.body;
  const db = getDb();

  const checkout = findById(db, 'checkout_records', checkoutId);
  if (!checkout) return res.status(404).json({ error: '领用记录不存在' });

  let recovery = find(db, 'old_part_recoveries', r => r.checkout_record_id === String(checkoutId));
  if (!recovery.length) {
    return res.status(404).json({ error: '未找到对应的旧件回收记录，请先确认安装' });
  }
  recovery = recovery[0];

  if (recovery.status === 'recovered') {
    return res.status(400).json({ error: '旧件已回收' });
  }

  const photoPaths = (req.files || []).map(f => f.filename);

  update(db, 'old_part_recoveries', recovery.id, {
    status: 'recovered',
    recovered_at: new Date().toISOString(),
    recovered_by: req.user.technician_id || req.user.id,
    photo_paths: [...(recovery.photo_paths || []), ...photoPaths],
    notes: notes || null
  });

  res.json({ message: '旧件回收已登记', recovery: findById(db, 'old_part_recoveries', recovery.id) });
});

router.post('/:checkoutId/recovery/photos', upload.array('photos', 5), (req, res) => {
  const { checkoutId } = req.params;
  const db = getDb();

  let recovery = find(db, 'old_part_recoveries', r => r.checkout_record_id === String(checkoutId));
  if (!recovery.length) {
    return res.status(404).json({ error: '旧件回收记录不存在' });
  }
  recovery = recovery[0];

  if (recovery.status !== 'recovered') {
    return res.status(400).json({ error: '旧件尚未回收，请先完成回收' });
  }

  const photoPaths = (req.files || []).map(f => f.filename);
  if (!photoPaths.length) {
    return res.status(400).json({ error: '请选择要上传的照片' });
  }

  update(db, 'old_part_recoveries', recovery.id, {
    photo_paths: [...(recovery.photo_paths || []), ...photoPaths]
  });

  res.json({
    message: '旧件回收照片已补传',
    photo_paths: findById(db, 'old_part_recoveries', recovery.id).photo_paths
  });
});

router.get('/pending', (req, res) => {
  const db = getDb();
  let pending = find(db, 'old_part_recoveries', r => r.status === 'pending');

  if (req.user.role === 'technician' && req.user.technician_id) {
    pending = pending.filter(r => r.technician_id === req.user.technician_id);
  }

  const enriched = pending.map(r => ({
    ...r,
    spare_part: findById(db, 'spare_parts', r.spare_part_id),
    work_order: findById(db, 'work_orders', r.work_order_id),
    technician: findById(db, 'technicians', r.technician_id),
    checkout: findById(db, 'checkout_records', r.checkout_record_id)
  }));

  res.json(enriched);
});

module.exports = router;
