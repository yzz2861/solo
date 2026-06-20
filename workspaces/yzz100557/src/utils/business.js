function generateNo(prefix) {
  const date = new Date();
  const ymd = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}${ymd}${random}`;
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    (d.getMonth() + 1).toString().padStart(2, '0') +
    '-' + d.getDate().toString().padStart(2, '0');
}

function nowTimeStr() {
  const d = new Date();
  return d.getHours().toString().padStart(2, '0') + ':' +
    d.getMinutes().toString().padStart(2, '0') + ':' +
    d.getSeconds().toString().padStart(2, '0');
}

class BusinessError extends Error {
  constructor(message, code = 400) {
    super(message);
    this.code = code;
    this.name = 'BusinessError';
  }
}

function checkDeliveryAcceptedAndLocked(db, deliveryId) {
  const delivery = db.prepare('SELECT is_final, batch_no FROM deliveries WHERE id = ?').get(deliveryId);
  if (!delivery) throw new BusinessError('送货批次不存在');
  if (delivery.is_final === 1 || delivery.is_final === '1' || delivery.is_final === true) {
    throw new BusinessError(`批次 ${delivery.batch_no} 已最终验收通过，不可再进行退货或修改`);
  }
  return delivery;
}

function checkDeliveryItemAccepted(db, deliveryItemId) {
  const item = db.prepare('SELECT accepted, material_name FROM delivery_items WHERE id = ?').get(deliveryItemId);
  if (!item) throw new BusinessError('送货明细不存在');
  return item;
}

function checkDuplicateDeliveryForPO(db, poId, supplierId, deliveryDate, items) {
  const warnings = [];
  const existingDeliveries = db.prepare(`
    SELECT d.id, d.batch_no, di.material_code, di.material_name, di.delivered_qty, di.actual_accepted_qty
    FROM deliveries d
    JOIN delivery_items di ON di.delivery_id = d.id
    WHERE d.po_id = ? AND d.supplier_id = ? AND d.delivery_date = ?
  `).all(poId, supplierId, deliveryDate);

  if (existingDeliveries.length > 0) {
    const existingMap = {};
    existingDeliveries.forEach(d => {
      if (!existingMap[d.material_code]) existingMap[d.material_code] = [];
      existingMap[d.material_code].push(d);
    });
    items.forEach(item => {
      if (existingMap[item.material_code]) {
        const exList = existingMap[item.material_code];
        exList.forEach(ex => {
          warnings.push({
            type: 'duplicate_receipt_warning',
            material_code: item.material_code,
            material_name: item.material_name,
            message: `【合并提醒】${item.material_name} 在批次 ${ex.batch_no} 已收 ${ex.delivered_qty}${item.unit || ''}，本次又送 ${item.delivered_qty}${item.unit || ''}，已自动合并累计到采购单中`,
            existing_batch: ex.batch_no,
            existing_qty: ex.delivered_qty,
            new_qty: item.delivered_qty
          });
        });
      }
    });
  }
  return warnings;
}

function getPOItemTotals(db, poItemId) {
  const items = db.prepare(`
    SELECT
      COALESCE(SUM(di.actual_accepted_qty), 0) as total_accepted,
      COALESCE(SUM(di.deduction_qty), 0) as total_deduction,
      COALESCE(SUM(CASE WHEN di.has_quality_issue = 1 THEN di.deduction_qty ELSE 0 END), 0) as quality_deduction
    FROM delivery_items di
    WHERE di.po_item_id = ? AND (di.accepted = 1 OR di.accepted = '1' OR di.accepted = true)
  `).get(poItemId);

  const returned = db.prepare(`
    SELECT COALESCE(SUM(ri.return_qty), 0) as total_returned
    FROM return_items ri
    JOIN delivery_items di ON ri.delivery_item_id = di.id
    WHERE di.po_item_id = ?
  `).get(poItemId);

  const replaced = db.prepare(`
    SELECT COALESCE(SUM(rpl.replaced_qty), 0) as total_replaced
    FROM deductions ded
    JOIN (
      SELECT original_deduction_id, COALESCE(SUM(replace_qty), 0) as replaced_qty
      FROM replacements WHERE status IN ('partial_delivered','delivered','closed')
      GROUP BY original_deduction_id
    ) rpl ON rpl.original_deduction_id = ded.id
    WHERE ded.po_item_id = ?
  `).get(poItemId);

  return {
    accepted: Number(items.total_accepted) || 0,
    deduction: Number(items.total_deduction) || 0,
    quality_deduction: Number(items.quality_deduction) || 0,
    returned: Number(returned.total_returned) || 0,
    replaced: Number(replaced.total_replaced) || 0
  };
}

function updatePOItemStatus(db, poItemId) {
  const poItem = db.prepare('SELECT expected_qty, status FROM purchase_order_items WHERE id = ?').get(poItemId);
  if (!poItem) return;
  const totals = getPOItemTotals(db, poItemId);
  const finalQty = totals.accepted - totals.returned + totals.replaced;
  const hasReturns = totals.returned > 0 || totals.deduction > 0;
  let newStatus;
  if (finalQty >= Number(poItem.expected_qty)) {
    newStatus = hasReturns ? 'has_returns' : 'accepted';
  } else if (finalQty > 0) {
    newStatus = hasReturns ? 'has_returns' : 'partial_accepted';
  } else {
    newStatus = 'pending';
  }
  db.prepare(`
    UPDATE purchase_order_items SET
      accepted_qty = ?,
      returned_qty = ?,
      replaced_qty = ?,
      deduction_qty = ?,
      final_qty = ?,
      status = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(totals.accepted, totals.returned, totals.replaced, totals.deduction, finalQty, newStatus, poItemId);
}

function updatePOStatus(db, poId) {
  const items = db.prepare('SELECT status FROM purchase_order_items WHERE po_id = ?').all(poId);
  if (!items.length) return;
  let allAccepted = true;
  let anyHasReturns = false;
  let anyPending = false;
  items.forEach(it => {
    if (it.status !== 'accepted' && it.status !== 'has_returns' && it.status !== 'closed') {
      allAccepted = false;
    }
    if (it.status === 'has_returns') anyHasReturns = true;
    if (it.status === 'pending') anyPending = true;
  });
  let newStatus;
  if (allAccepted) {
    newStatus = 'accepted';
  } else if (anyPending && !allAccepted) {
    newStatus = items.some(i => i.status === 'partial_accepted' || i.status === 'has_returns') ? 'partial_accepted' : 'pending';
  } else {
    newStatus = 'partial_accepted';
  }
  db.prepare(`UPDATE purchase_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(newStatus, poId);

  const total = db.prepare(`
    SELECT COALESCE(SUM(final_qty * unit_price), 0) as total FROM purchase_order_items WHERE po_id = ?
  `).get(poId);
  db.prepare(`UPDATE purchase_orders SET total_amount = ? WHERE id = ?`).run(Number(total.total) || 0, poId);
}

function updateDeductionStatus(db, deductionId) {
  const ded = db.prepare('SELECT deduction_qty, replaced_qty, status FROM deductions WHERE id = ?').get(deductionId);
  if (!ded) return;
  const dq = Number(ded.deduction_qty) || 0;
  const rq = Number(ded.replaced_qty) || 0;
  const remaining = dq - rq;
  let newStatus;
  if (rq >= dq && dq > 0) {
    newStatus = 'replaced';
  } else if (rq > 0) {
    newStatus = 'partial_replaced';
  } else if (remaining === dq) {
    newStatus = 'pending_replace';
  } else {
    newStatus = 'deducted';
  }
  db.prepare(`
    UPDATE deductions SET
      replaced_qty = ?,
      remaining_replace_qty = ?,
      status = ?
    WHERE id = ?
  `).run(rq, Math.max(0, remaining), newStatus, deductionId);
}

function updateStockSnapshot(db, deliveryId, materialCode, materialName, category, unit, qty, qualityIssueQty, supplierId, poNo, batchNo) {
  const today = todayStr();
  const existing = db.prepare(`
    SELECT id, available_qty, quality_issue_qty FROM stock_snapshots
    WHERE snapshot_date = ? AND material_code = ? AND batch_no = ?
  `).get(today, materialCode, batchNo);
  const q = Number(qty) || 0;
  const qi = Number(qualityIssueQty) || 0;
  if (existing) {
    db.prepare(`
      UPDATE stock_snapshots SET
        available_qty = (available_qty + ?),
        quality_issue_qty = (quality_issue_qty + ?),
        created_at = datetime('now')
      WHERE id = ?
    `).run(q, qi, existing.id);
  } else {
    db.prepare(`
      INSERT INTO stock_snapshots
      (snapshot_date, material_code, material_name, category, unit, available_qty, quality_issue_qty, supplier_id, po_no, batch_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(today, materialCode, materialName, category, unit, q, qi, supplierId, poNo, batchNo);
  }
}

function syncFinanceDeduction(db, deduction) {
  const period = todayStr().substring(0, 7);
  const existing = db.prepare('SELECT id FROM finance_deductions WHERE deduction_id = ?').get(deduction.id);
  if (!existing) {
    db.prepare(`
      INSERT INTO finance_deductions
      (period, supplier_id, deduction_id, material_name, deduction_qty, deduction_value, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(period, deduction.supplier_id, deduction.id, deduction.material_name,
      deduction.deduction_qty, deduction.deduction_value, deduction.reason);
  }
}

module.exports = {
  generateNo,
  todayStr,
  nowTimeStr,
  BusinessError,
  checkDeliveryAcceptedAndLocked,
  checkDeliveryItemAccepted,
  checkDuplicateDeliveryForPO,
  getPOItemTotals,
  updatePOItemStatus,
  updatePOStatus,
  updateDeductionStatus,
  updateStockSnapshot,
  syncFinanceDeduction
};
