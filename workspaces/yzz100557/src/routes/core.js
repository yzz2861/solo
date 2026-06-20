const express = require('express');
const { getDB } = require('../db/singleton');
const { authRequired, roleRequired } = require('../middleware/auth');
const {
  generateNo,
  todayStr,
  nowTimeStr,
  BusinessError,
  checkDeliveryAcceptedAndLocked,
  checkDuplicateDeliveryForPO,
  updatePOItemStatus,
  updatePOStatus,
  updateDeductionStatus,
  updateStockSnapshot,
  syncFinanceDeduction
} = require('../utils/business');

const router = express.Router();
router.use(authRequired);

function handleError(res, err) {
  if (err instanceof BusinessError) {
    return res.status(err.code).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: '服务器内部错误', detail: err.message });
}

router.get('/purchase-orders', async (req, res) => {
  try {
    const db = await getDB();
    const { supplier_id, status, date_from, date_to } = req.query;
    let sql = `SELECT po.*, s.name as supplier_name, s.code as supplier_code, u.name as buyer_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.buyer_id = u.id
      WHERE 1=1`;
    const params = [];
    if (supplier_id) { sql += ' AND po.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (status) { sql += ' AND po.status = ?'; params.push(status); }
    if (date_from) { sql += ' AND po.order_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND po.order_date <= ?'; params.push(date_to); }
    sql += ' ORDER BY po.created_at DESC LIMIT 500';
    const rows = db.prepare(sql).all(...params);
    for (const r of rows) {
      r.items = db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(r.id);
    }
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const db = await getDB();
    const po = db.prepare(`SELECT po.*, s.name as supplier_name, s.code as supplier_code, s.phone as supplier_phone
      FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?`).get(req.params.id);
    if (!po) return res.status(404).json({ error: '采购单不存在' });
    po.items = db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(po.id);
    po.deliveries = db.prepare(`
      SELECT d.*, u.name as inspector_name,
        (SELECT COUNT(*) FROM delivery_items di WHERE di.delivery_id = d.id) as item_count
      FROM deliveries d LEFT JOIN users u ON d.inspector_id = u.id
      WHERE d.po_id = ? ORDER BY d.created_at DESC
    `).all(po.id);
    res.json(po);
  } catch (err) { handleError(res, err); }
});

router.post('/purchase-orders', roleRequired('buyer', 'admin'), async (req, res) => {
  try {
    const db = await getDB();
    const { supplier_id, order_date, expected_delivery_date, items, remarks, buyer_id } = req.body;
    if (!supplier_id || !items || !items.length) throw new BusinessError('请提供供应商和采购明细');
    const po_no = generateNo('PO');
    const orderD = order_date || todayStr();
    const expD = expected_delivery_date || orderD;
    const info = db.prepare(`INSERT INTO purchase_orders
      (po_no, supplier_id, order_date, expected_delivery_date, buyer_id, remarks)
      VALUES (?, ?, ?, ?, ?, ?)`).run(po_no, supplier_id, orderD, expD, buyer_id || req.user.id, remarks || '');
    const poId = info.lastInsertRowid;
    const itemStmt = db.prepare(`INSERT INTO purchase_order_items
      (po_id, material_code, material_name, category, unit, unit_price, expected_qty)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    let total = 0;
    for (const it of items) {
      itemStmt.run(poId, it.material_code, it.material_name, it.category || 'other',
        it.unit, Number(it.unit_price), Number(it.expected_qty));
      total += Number(it.unit_price) * Number(it.expected_qty);
    }
    db.prepare('UPDATE purchase_orders SET total_amount = ? WHERE id = ?').run(total, poId);
    const po = db.prepare(`SELECT po.*, s.name as supplier_name FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?`).get(poId);
    po.items = db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(poId);
    res.status(201).json(po);
  } catch (err) { handleError(res, err); }
});

router.get('/deliveries', async (req, res) => {
  try {
    const db = await getDB();
    const { supplier_id, po_id, date, is_final, batch_no } = req.query;
    let sql = `SELECT d.*, s.name as supplier_name, s.code as supplier_code,
      po.po_no, u.name as inspector_name
      FROM deliveries d
      JOIN suppliers s ON d.supplier_id = s.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON d.inspector_id = u.id
      WHERE 1=1`;
    const params = [];
    if (supplier_id) { sql += ' AND d.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (po_id) { sql += ' AND d.po_id = ?'; params.push(Number(po_id)); }
    if (date) { sql += ' AND d.delivery_date = ?'; params.push(date); }
    if (is_final !== undefined) { sql += ' AND d.is_final = ?'; params.push(Number(is_final)); }
    if (batch_no) { sql += ' AND d.batch_no LIKE ?'; params.push('%' + batch_no + '%'); }
    sql += ' ORDER BY d.created_at DESC LIMIT 500';
    const rows = db.prepare(sql).all(...params);
    for (const r of rows) {
      r.items = db.prepare('SELECT * FROM delivery_items WHERE delivery_id = ?').all(r.id);
    }
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

router.get('/deliveries/:id', async (req, res) => {
  try {
    const db = await getDB();
    const d = db.prepare(`SELECT d.*, s.name as supplier_name, s.code as supplier_code, s.phone as supplier_phone,
      po.po_no, po.expected_delivery_date, u.name as inspector_name
      FROM deliveries d
      JOIN suppliers s ON d.supplier_id = s.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON d.inspector_id = u.id
      WHERE d.id = ?`).get(req.params.id);
    if (!d) return res.status(404).json({ error: '批次不存在' });
    d.items = db.prepare(`SELECT di.*, poi.expected_qty, poi.status as po_item_status
      FROM delivery_items di LEFT JOIN purchase_order_items poi ON di.po_item_id = poi.id
      WHERE di.delivery_id = ?`).all(d.id);
    d.deductions = db.prepare('SELECT * FROM deductions WHERE delivery_id = ?').all(d.id);
    d.returns = db.prepare('SELECT r.*, u.name as handler_name FROM returns r LEFT JOIN users u ON r.handler_id = u.id WHERE r.delivery_id = ?').all(d.id);
    for (const r of d.returns) {
      r.items = db.prepare(`SELECT ri.*, ded.deduction_qty as original_deduction_qty
        FROM return_items ri LEFT JOIN deductions ded ON ri.deduction_id = ded.id
        WHERE ri.return_id = ?`).all(r.id);
    }
    res.json(d);
  } catch (err) { handleError(res, err); }
});

router.post('/deliveries', roleRequired('inspector', 'admin'), async (req, res) => {
  try {
    const db = await getDB();
    const { po_id, supplier_id, delivery_date, delivery_time, items, vehicle_no, driver_name, temperature, photo_urls, remarks } = req.body;
    if (!po_id || !supplier_id || !items || !items.length) throw new BusinessError('请提供采购单、供应商和送货明细');
    const dd = delivery_date || todayStr();
    const dt = delivery_time || nowTimeStr();
    const batch_no = generateNo('BATCH');

    const warnings = checkDuplicateDeliveryForPO(db, po_id, supplier_id, dd, items);

    const info = db.prepare(`INSERT INTO deliveries
      (batch_no, po_id, supplier_id, delivery_date, delivery_time, inspector_id, vehicle_no, driver_name, temperature, photo_urls, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      batch_no, po_id, supplier_id, dd, dt, req.user.id, vehicle_no || '', driver_name || '',
      temperature || null, photo_urls ? JSON.stringify(photo_urls) : null, remarks || ''
    );
    const deliveryId = info.lastInsertRowid;
    const poItemMap = {};
    const poItems = db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(po_id);
    poItems.forEach(pi => poItemMap[pi.material_code] = pi);

    const dedStmt = db.prepare(`INSERT INTO deductions
      (deduction_no, delivery_item_id, delivery_id, supplier_id, po_item_id, material_code, material_name, category, unit, unit_price,
       expected_qty, delivered_qty, deduction_qty, deduction_value, reason, description, photo_urls, remaining_replace_qty, inspector_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const finStmt = db.prepare(`INSERT INTO finance_deductions
      (period, supplier_id, deduction_id, material_name, deduction_qty, deduction_value, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const diStmt = db.prepare(`INSERT INTO delivery_items
      (delivery_id, po_item_id, material_code, material_name, category, unit, unit_price,
       delivered_qty, actual_accepted_qty, deduction_qty, deduction_reason, deduction_photo_urls,
       has_quality_issue, quality_detail, accepted, accepted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);

    const period = dd.substring(0, 7);
    const poNoObj = db.prepare('SELECT po_no FROM purchase_orders WHERE id = ?').get(po_id);

    for (const it of items) {
      const poi = poItemMap[it.material_code];
      if (!poi) throw new BusinessError(`物料 ${it.material_name}(${it.material_code}) 不在采购单中`);
      const dedQty = Number(it.deduction_qty) || 0;
      const actualQty = Number(it.delivered_qty) - dedQty;
      const hasQuality = it.has_quality_issue === 1 || (it.reason && ['rotten','damaged','expired','contaminated'].includes(it.reason));
      const diInfo = diStmt.run(deliveryId, poi.id, it.material_code, it.material_name, poi.category,
        poi.unit, poi.unit_price, Number(it.delivered_qty), actualQty, dedQty,
        it.deduction_reason || it.description || '',
        it.deduction_photo_urls ? JSON.stringify(it.deduction_photo_urls) : null,
        hasQuality ? 1 : 0, it.quality_detail || '',
        it.accepted === false ? 0 : 1);
      const diId = diInfo.lastInsertRowid;

      if (dedQty > 0 && it.reason) {
        const dedNo = generateNo('DED');
        const dedValue = dedQty * poi.unit_price;
        const dInfo = dedStmt.run(dedNo, diId, deliveryId, supplier_id, poi.id,
          it.material_code, it.material_name, poi.category, poi.unit, poi.unit_price,
          poi.expected_qty, Number(it.delivered_qty), dedQty, dedValue,
          it.reason, it.description || '',
          it.deduction_photo_urls ? JSON.stringify(it.deduction_photo_urls) : null,
          dedQty, req.user.id);
        const dedId = dInfo.lastInsertRowid;
        finStmt.run(period, supplier_id, dedId, it.material_name, dedQty, dedValue, it.reason);
      }
      if (actualQty > 0) {
        updateStockSnapshot(db, deliveryId, it.material_code, it.material_name, poi.category,
          poi.unit, actualQty, hasQuality ? dedQty : 0, supplier_id, null, batch_no);
      }
      updatePOItemStatus(db, poi.id);
    }
    updatePOStatus(db, po_id);

    if (poNoObj?.po_no) {
      db.prepare(`UPDATE stock_snapshots SET po_no = ? WHERE batch_no = ? AND (po_no IS NULL OR po_no = '')`).run(poNoObj.po_no, batch_no);
    }

    const delivery = db.prepare(`SELECT d.*, s.name as supplier_name, s.code as supplier_code,
      po.po_no, u.name as inspector_name
      FROM deliveries d JOIN suppliers s ON d.supplier_id = s.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON d.inspector_id = u.id
      WHERE d.id = ?`).get(deliveryId);
    delivery.items = db.prepare('SELECT * FROM delivery_items WHERE delivery_id = ?').all(deliveryId);
    delivery.warnings = warnings;
    res.status(201).json(delivery);
  } catch (err) { handleError(res, err); }
});

router.post('/deliveries/:id/finalize', roleRequired('inspector', 'chef', 'admin'), async (req, res) => {
  try {
    const db = await getDB();
    const d = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    if (!d) return res.status(404).json({ error: '批次不存在' });
    if (Number(d.is_final) === 1) throw new BusinessError('该批次已锁定');
    db.prepare(`UPDATE deliveries SET is_final = 1 WHERE id = ?`).run(req.params.id);
    const result = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(req.params.id);
    res.json({ message: '批次已最终验收，不可再退货或修改', ...result });
  } catch (err) { handleError(res, err); }
});

router.get('/deductions', async (req, res) => {
  try {
    const db = await getDB();
    const { supplier_id, status, reason, date_from, date_to, po_item_id } = req.query;
    let sql = `SELECT ded.*, s.name as supplier_name, d.batch_no, po.po_no,
      u.name as inspector_name
      FROM deductions ded
      JOIN suppliers s ON ded.supplier_id = s.id
      JOIN deliveries d ON ded.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON ded.inspector_id = u.id
      WHERE 1=1`;
    const params = [];
    if (supplier_id) { sql += ' AND ded.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (status) { sql += ' AND ded.status = ?'; params.push(status); }
    if (reason) { sql += ' AND ded.reason = ?'; params.push(reason); }
    if (po_item_id) { sql += ' AND ded.po_item_id = ?'; params.push(Number(po_item_id)); }
    if (date_from) { sql += ' AND DATE(ded.created_at) >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND DATE(ded.created_at) <= ?'; params.push(date_to); }
    sql += ' ORDER BY ded.created_at DESC LIMIT 500';
    const rows = db.prepare(sql).all(...params);
    for (const r of rows) {
      r.replacements = db.prepare(`SELECT rp.*, u.name as buyer_name FROM replacements rp
        LEFT JOIN users u ON rp.buyer_id = u.id WHERE rp.original_deduction_id = ?`).all(r.id);
    }
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

router.get('/deductions/:id', async (req, res) => {
  try {
    const db = await getDB();
    const ded = db.prepare(`SELECT ded.*, s.name as supplier_name, s.phone as supplier_phone,
      d.batch_no, d.delivery_date, po.po_no, u.name as inspector_name
      FROM deductions ded
      JOIN suppliers s ON ded.supplier_id = s.id
      JOIN deliveries d ON ded.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON ded.inspector_id = u.id
      WHERE ded.id = ?`).get(req.params.id);
    if (!ded) return res.status(404).json({ error: '扣量记录不存在' });
    ded.replacements = db.prepare(`SELECT rp.*, u.name as buyer_name,
      (SELECT COALESCE(SUM(rd.received_qty),0) FROM replace_deliveries rd WHERE rd.replacement_id = rp.id) as actual_received,
      (SELECT COALESCE(SUM(rd.re_deduction_qty),0) FROM replace_deliveries rd WHERE rd.replacement_id = rp.id) as re_deduct
      FROM replacements rp LEFT JOIN users u ON rp.buyer_id = u.id
      WHERE rp.original_deduction_id = ? ORDER BY rp.created_at DESC`).all(ded.id);
    for (const rp of ded.replacements) {
      rp.deliveries = db.prepare(`SELECT rd.*, d.batch_no, u.name as inspector_name
        FROM replace_deliveries rd JOIN deliveries d ON rd.delivery_id = d.id
        LEFT JOIN users u ON rd.inspector_id = u.id
        WHERE rd.replacement_id = ?`).all(rp.id);
    }
    ded.return_items = db.prepare(`SELECT ri.*, r.return_no, r.return_date, r.status as return_status
      FROM return_items ri JOIN returns r ON ri.return_id = r.id
      WHERE ri.deduction_id = ?`).all(ded.id);
    res.json(ded);
  } catch (err) { handleError(res, err); }
});

router.get('/returns', async (req, res) => {
  try {
    const db = await getDB();
    const { supplier_id, status, date_from, date_to } = req.query;
    let sql = `SELECT r.*, s.name as supplier_name, d.batch_no, po.po_no, u.name as handler_name
      FROM returns r
      JOIN suppliers s ON r.supplier_id = s.id
      JOIN deliveries d ON r.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON r.handler_id = u.id
      WHERE 1=1`;
    const params = [];
    if (supplier_id) { sql += ' AND r.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (status) { sql += ' AND r.status = ?'; params.push(status); }
    if (date_from) { sql += ' AND r.return_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND r.return_date <= ?'; params.push(date_to); }
    sql += ' ORDER BY r.created_at DESC LIMIT 500';
    const rows = db.prepare(sql).all(...params);
    for (const r of rows) {
      r.items = db.prepare(`SELECT ri.*, ded.deduction_qty as original_deduction_qty, ded.reason as deduction_reason
        FROM return_items ri LEFT JOIN deductions ded ON ri.deduction_id = ded.id
        WHERE ri.return_id = ?`).all(r.id);
    }
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

router.get('/returns/:id', async (req, res) => {
  try {
    const db = await getDB();
    const r = db.prepare(`SELECT r.*, s.name as supplier_name, s.code as supplier_code, s.phone as supplier_phone,
      d.batch_no, po.po_no, u.name as handler_name
      FROM returns r JOIN suppliers s ON r.supplier_id = s.id
      JOIN deliveries d ON r.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON r.handler_id = u.id
      WHERE r.id = ?`).get(req.params.id);
    if (!r) return res.status(404).json({ error: '退货单不存在' });
    r.items = db.prepare(`SELECT ri.*, ded.deduction_qty as original_deduction_qty, ded.reason as deduction_reason,
      ded.description as deduction_description, ded.photo_urls as deduction_photos
      FROM return_items ri LEFT JOIN deductions ded ON ri.deduction_id = ded.id
      WHERE ri.return_id = ?`).all(r.id);
    res.json(r);
  } catch (err) { handleError(res, err); }
});

router.post('/returns', roleRequired('inspector', 'chef', 'admin'), async (req, res) => {
  try {
    const db = await getDB();
    const { delivery_id, supplier_id, return_type, reason, items, photo_urls } = req.body;
    if (!delivery_id || !items || !items.length) throw new BusinessError('请关联送货批次和退货明细');
    checkDeliveryAcceptedAndLocked(db, delivery_id);

    const totalQty = items.reduce((s, i) => s + Number(i.return_qty || 0), 0);
    if (totalQty <= 0) throw new BusinessError('退货总数量必须大于0');
    let totalValue = 0;
    for (const i of items) { totalValue += Number(i.return_qty || 0) * Number(i.unit_price || 0); }

    const return_no = generateNo('RET');
    const rd = todayStr();
    const info = db.prepare(`INSERT INTO returns
      (return_no, delivery_id, supplier_id, return_date, return_type, total_qty, total_value, photo_urls, reason, handler_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      return_no, delivery_id, supplier_id, rd, return_type || 'quality', totalQty, totalValue,
      photo_urls ? JSON.stringify(photo_urls) : null, reason || '', req.user.id
    );
    const returnId = info.lastInsertRowid;
    const riStmt = db.prepare(`INSERT INTO return_items
      (return_id, delivery_item_id, deduction_id, material_code, material_name, unit, unit_price, return_qty, return_value, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (const it of items) {
      const val = Number(it.return_qty) * Number(it.unit_price);
      riStmt.run(returnId, it.delivery_item_id, it.deduction_id || null,
        it.material_code, it.material_name, it.unit, it.unit_price,
        Number(it.return_qty), val, it.reason || '');
      if (it.delivery_item_id) {
        const di = db.prepare('SELECT po_item_id, material_code, material_name, category, unit FROM delivery_items WHERE id = ?').get(it.delivery_item_id);
        if (di) {
          db.prepare(`UPDATE stock_snapshots SET available_qty = MAX(0, available_qty - ?)
            WHERE snapshot_date = ? AND material_code = ? AND batch_no IN (SELECT batch_no FROM deliveries WHERE id = ?)`).run(
            Number(it.return_qty), rd, di.material_code, delivery_id);
          updatePOItemStatus(db, di.po_item_id);
        }
      }
    }
    const dObj = db.prepare('SELECT po_id FROM deliveries WHERE id = ?').get(delivery_id);
    if (dObj) updatePOStatus(db, dObj.po_id);

    const ret = db.prepare(`SELECT r.*, s.name as supplier_name, d.batch_no, po.po_no
      FROM returns r JOIN suppliers s ON r.supplier_id = s.id
      JOIN deliveries d ON r.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      WHERE r.id = ?`).get(returnId);
    ret.items = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(returnId);
    res.status(201).json(ret);
  } catch (err) { handleError(res, err); }
});

router.post('/returns/:id/sign', async (req, res) => {
  try {
    const db = await getDB();
    const r = db.prepare('SELECT * FROM returns WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: '退货单不存在' });
    if (req.user.role === 'supplier' && Number(req.user.supplier_id) !== Number(r.supplier_id)) {
      return res.status(403).json({ error: '只能签收本供应商的退货单' });
    }
    const { supplier_signature_url, supplier_remark } = req.body;
    db.prepare(`UPDATE returns SET
      supplier_signed = 1, supplier_signature_url = ?, supplier_remark = ?,
      supplier_signed_at = datetime('now'), status = 'signed'
      WHERE id = ?`).run(supplier_signature_url || '', supplier_remark || '', req.params.id);
    const updated = db.prepare('SELECT * FROM returns WHERE id = ?').get(req.params.id);
    res.json({ message: '退货单已签收', ...updated });
  } catch (err) { handleError(res, err); }
});

router.post('/returns/:id/complete', roleRequired('inspector', 'admin'), async (req, res) => {
  try {
    const db = await getDB();
    db.prepare(`UPDATE returns SET status = 'completed' WHERE id = ? AND status IN ('pending','signed')`).run(req.params.id);
    const r = db.prepare('SELECT * FROM returns WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: '退货单不存在' });
    res.json({ message: '退货已完成', ...r });
  } catch (err) { handleError(res, err); }
});

router.get('/replacements', async (req, res) => {
  try {
    const db = await getDB();
    const { supplier_id, status, buyer_id, follow_up } = req.query;
    let sql = `SELECT rp.*, s.name as supplier_name, po.po_no, d.batch_no as original_batch,
      ded.deduction_qty as original_deduction_qty, ded.reason as deduction_reason,
      u.name as buyer_name
      FROM replacements rp
      JOIN suppliers s ON rp.supplier_id = s.id
      JOIN purchase_orders po ON rp.po_id = po.id
      JOIN deductions ded ON rp.original_deduction_id = ded.id
      LEFT JOIN deliveries d ON ded.delivery_id = d.id
      LEFT JOIN users u ON rp.buyer_id = u.id
      WHERE 1=1`;
    const params = [];
    if (supplier_id) { sql += ' AND rp.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (status) { sql += ' AND rp.status = ?'; params.push(status); }
    if (buyer_id) { sql += ' AND rp.buyer_id = ?'; params.push(Number(buyer_id)); }
    if (follow_up === 'today') {
      sql += ` AND rp.follow_up_date <= ? AND rp.status IN ('pending','partial_delivered')`;
      params.push(todayStr());
    }
    sql += ' ORDER BY rp.created_at DESC LIMIT 500';
    const rows = db.prepare(sql).all(...params);
    for (const r of rows) {
      r.deliveries = db.prepare(`SELECT rd.*, d.batch_no FROM replace_deliveries rd
        JOIN deliveries d ON rd.delivery_id = d.id WHERE rd.replacement_id = ?`).all(r.id);
    }
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

router.get('/replacements/:id', async (req, res) => {
  try {
    const db = await getDB();
    const rp = db.prepare(`SELECT rp.*, s.name as supplier_name, s.phone as supplier_phone,
      po.po_no, ded.*, u.name as buyer_name
      FROM replacements rp
      JOIN suppliers s ON rp.supplier_id = s.id
      JOIN purchase_orders po ON rp.po_id = po.id
      JOIN deductions ded ON rp.original_deduction_id = ded.id
      LEFT JOIN users u ON rp.buyer_id = u.id
      WHERE rp.id = ?`).get(req.params.id);
    if (!rp) return res.status(404).json({ error: '补送记录不存在' });
    rp.deliveries = db.prepare(`SELECT rd.*, d.batch_no, d.delivery_date, u.name as inspector_name
      FROM replace_deliveries rd
      JOIN deliveries d ON rd.delivery_id = d.id
      LEFT JOIN users u ON rd.inspector_id = u.id
      WHERE rd.replacement_id = ? ORDER BY rd.created_at DESC`).all(rp.id);
    res.json(rp);
  } catch (err) { handleError(res, err); }
});

router.post('/replacements', roleRequired('buyer', 'admin'), async (req, res) => {
  try {
    const db = await getDB();
    const { original_deduction_id, replace_qty, follow_up_date, remarks, buyer_id } = req.body;
    if (!original_deduction_id) throw new BusinessError('必须关联原始扣量记录');
    const ded = db.prepare('SELECT * FROM deductions WHERE id = ?').get(original_deduction_id);
    if (!ded) throw new BusinessError('扣量记录不存在');
    const pendingReplace = Number(ded.deduction_qty) - Number(ded.replaced_qty);
    const rq = Number(replace_qty) || pendingReplace;
    if (rq <= 0) throw new BusinessError('补送数量必须大于0');
    if (rq > pendingReplace) throw new BusinessError(`补送数量 ${rq} 超过剩余待补数量 ${pendingReplace}`);

    const replace_no = generateNo('REP');
    const poIdObj = db.prepare('SELECT po_id FROM purchase_order_items WHERE id = ?').get(ded.po_item_id);
    const info = db.prepare(`INSERT INTO replacements
      (replace_no, original_deduction_id, supplier_id, po_id, po_item_id,
       material_code, material_name, unit, unit_price,
       original_deduction_qty, replace_qty, remaining_replace_qty,
       status, buyer_id, follow_up_date, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`).run(
      replace_no, ded.id, ded.supplier_id, poIdObj.po_id,
      ded.po_item_id, ded.material_code, ded.material_name, ded.unit, ded.unit_price,
      ded.deduction_qty, rq, rq,
      buyer_id || req.user.id, follow_up_date || null, remarks || ''
    );
    const rpId = info.lastInsertRowid;
    const rp = db.prepare(`SELECT rp.*, s.name as supplier_name, po.po_no
      FROM replacements rp JOIN suppliers s ON rp.supplier_id = s.id
      JOIN purchase_orders po ON rp.po_id = po.id WHERE rp.id = ?`).get(rpId);
    res.status(201).json(rp);
  } catch (err) { handleError(res, err); }
});

router.post('/replacements/:id/receive', roleRequired('inspector', 'admin'), async (req, res) => {
  try {
    const db = await getDB();
    const rp = db.prepare('SELECT * FROM replacements WHERE id = ?').get(req.params.id);
    if (!rp) return res.status(404).json({ error: '补送记录不存在' });
    const { delivery_id, delivery_item_id, delivered_qty, received_qty, re_deduction_qty, re_deduction } = req.body;
    if (!delivery_id || !delivery_item_id) throw new BusinessError('必须关联送货批次和明细');
    const dq = Number(delivered_qty);
    const rq = Number(received_qty) || dq;
    const rdq = Number(re_deduction_qty) || 0;
    if (rq <= 0) throw new BusinessError('实收补送数量必须大于0');

    checkDeliveryAcceptedAndLocked(db, delivery_id);

    const remain = Number(rp.remaining_replace_qty);
    const actualReceive = Math.min(remain, rq);
    if (actualReceive <= 0) throw new BusinessError('该补送单已全部收到，无需再收');

    let reDedId = null;
    if (rdq > 0 && re_deduction) {
      const dInfo = db.prepare('SELECT * FROM deductions WHERE id = ?').get(rp.original_deduction_id);
      const dedNo = generateNo('DED');
      const dedValue = rdq * Number(rp.unit_price);
      const inRun = db.prepare(`INSERT INTO deductions
        (deduction_no, delivery_item_id, delivery_id, supplier_id, po_item_id, material_code,
         material_name, category, unit, unit_price, expected_qty, delivered_qty,
         deduction_qty, deduction_value, reason, description, photo_urls, remaining_replace_qty, inspector_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        dedNo, delivery_item_id, delivery_id, rp.supplier_id, rp.po_item_id, rp.material_code,
        rp.material_name, dInfo?.category || 'other', rp.unit, Number(rp.unit_price),
        rp.replace_qty, dq, rdq, dedValue,
        re_deduction.reason || 'other', re_deduction.description || '',
        re_deduction.photo_urls ? JSON.stringify(re_deduction.photo_urls) : null,
        rdq, req.user.id
      );
      reDedId = inRun.lastInsertRowid;
      syncFinanceDeduction(db, {
        id: reDedId, supplier_id: rp.supplier_id, material_name: rp.material_name,
        deduction_qty: rdq, deduction_value: dedValue, reason: re_deduction.reason || 'other'
      });
    }

    db.prepare(`INSERT INTO replace_deliveries
      (replacement_id, deduction_id, delivery_id, delivery_item_id,
       delivered_qty, received_qty, re_deduction_qty, re_deduction_id, inspector_id, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
      rp.id, rp.original_deduction_id, delivery_id, delivery_item_id,
      dq, actualReceive, rdq, reDedId, req.user.id
    );

    const newRemaining = remain - actualReceive;
    const newReplaced = Number(rp.replace_qty) - newRemaining;
    let newStatus;
    if (newRemaining <= 0) newStatus = 'delivered';
    else if (newReplaced > 0) newStatus = 'partial_delivered';
    else newStatus = 'pending';
    db.prepare(`UPDATE replacements SET remaining_replace_qty = ?, status = ? WHERE id = ?`).run(newRemaining, newStatus, rp.id);

    const currentDed = db.prepare('SELECT replaced_qty FROM deductions WHERE id = ?').get(rp.original_deduction_id);
    const newReplacedTotal = (Number(currentDed.replaced_qty) || 0) + actualReceive;
    db.prepare(`UPDATE deductions SET replaced_qty = ? WHERE id = ?`).run(newReplacedTotal, rp.original_deduction_id);
    updateDeductionStatus(db, rp.original_deduction_id);

    if (actualReceive > 0) {
      const batchObj = db.prepare('SELECT batch_no FROM deliveries WHERE id = ?').get(delivery_id);
      const dedObj = db.prepare('SELECT category FROM deductions WHERE id = ?').get(rp.original_deduction_id);
      updateStockSnapshot(db, delivery_id, rp.material_code, rp.material_name, dedObj?.category || 'other',
        rp.unit, actualReceive, 0, rp.supplier_id, null, batchObj?.batch_no || '');
    }
    updatePOItemStatus(db, rp.po_item_id);
    const poObj = db.prepare('SELECT po_id FROM purchase_order_items WHERE id = ?').get(rp.po_item_id);
    updatePOStatus(db, poObj.po_id);

    const updated = db.prepare('SELECT * FROM replacements WHERE id = ?').get(req.params.id);
    res.json({ message: `已确认收到补送 ${actualReceive}${rp.unit}`, ...updated, re_deduction_id: reDedId });
  } catch (err) { handleError(res, err); }
});

router.get('/suppliers', async (req, res) => {
  try {
    const db = await getDB();
    const { status, category } = req.query;
    let sql = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY name';
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

router.post('/suppliers', roleRequired('buyer', 'admin'), async (req, res) => {
  try {
    const db = await getDB();
    const { code, name, contact_person, phone, address, category } = req.body;
    if (!code || !name) throw new BusinessError('供应商编码和名称必填');
    const info = db.prepare(`INSERT INTO suppliers (code, name, contact_person, phone, address, category)
      VALUES (?, ?, ?, ?, ?, ?)`).run(code, name, contact_person || '', phone || '', address || '', category || 'general');
    const sup = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(sup);
  } catch (err) { handleError(res, err); }
});

module.exports = router;
