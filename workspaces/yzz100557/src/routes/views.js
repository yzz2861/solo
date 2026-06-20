const express = require('express');
const XLSX = require('xlsx');
const { getDb } = require('../db/init');
const { authRequired, roleRequired, supplierOnly } = require('../middleware/auth');
const { todayStr, BusinessError } = require('../utils/business');

const router = express.Router();
router.use(authRequired);

function handleError(res, err) {
  if (err instanceof BusinessError) {
    return res.status(err.code).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: '服务器内部错误', detail: err.message });
}

// ==================== 采购员视图 - 待处理看板 ====================
router.get('/buyer/dashboard', roleRequired('buyer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const buyerId = req.user.role === 'admin' ? null : req.user.id;
    const date = req.query.date || todayStr();

    let poSql = `SELECT COUNT(*) as cnt, status FROM purchase_orders WHERE 1=1`;
    const params = [];
    if (buyerId) { poSql += ' AND buyer_id = ?'; params.push(buyerId); }
    poSql += ' GROUP BY status';
    const poStats = db.prepare(poSql).all(...params);
    const poCount = {};
    poStats.forEach(s => poCount[s.status] = s.cnt);

    let dedSql = `SELECT
      ded.id, ded.deduction_no, ded.material_code, ded.material_name, ded.unit,
      ded.deduction_qty, ded.deduction_value, ded.reason, ded.status, ded.created_at,
      ded.remaining_replace_qty, ded.replaced_qty, s.name as supplier_name, s.phone as supplier_phone,
      d.batch_no, d.delivery_date, po.po_no
      FROM deductions ded
      JOIN suppliers s ON ded.supplier_id = s.id
      JOIN deliveries d ON ded.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      WHERE ded.status IN ('pending_replace','partial_replaced')`;
    const dedParams = [];
    if (buyerId) { dedSql += ' AND po.buyer_id = ?'; dedParams.push(buyerId); }
    dedSql += ' ORDER BY ded.created_at DESC LIMIT 200';
    const pendingDeductions = db.prepare(dedSql).all(...dedParams);

    let repSql = `SELECT rp.*, s.name as supplier_name, s.phone as supplier_phone,
      po.po_no, d.batch_no as original_batch, u.name as buyer_name,
      ded.reason as deduction_reason
      FROM replacements rp
      JOIN suppliers s ON rp.supplier_id = s.id
      JOIN purchase_orders po ON rp.po_id = po.id
      JOIN deductions ded ON rp.original_deduction_id = ded.id
      LEFT JOIN deliveries d ON ded.delivery_id = d.id
      LEFT JOIN users u ON rp.buyer_id = u.id
      WHERE rp.status IN ('pending','partial_delivered')`;
    const repParams = [];
    if (buyerId) { repSql += ' AND rp.buyer_id = ?'; repParams.push(buyerId); }
    repSql += ' ORDER BY rp.follow_up_date IS NULL, rp.follow_up_date ASC, rp.created_at DESC LIMIT 200';
    const pendingReplacements = db.prepare(repSql).all(...repParams);

    const todaysDeliveries = db.prepare(`
      SELECT d.*, s.name as supplier_name, po.po_no, u.name as inspector_name
      FROM deliveries d
      JOIN suppliers s ON d.supplier_id = s.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON d.inspector_id = u.id
      WHERE d.delivery_date = ?
      ORDER BY d.delivery_time DESC
    `).all(date);

    const unsignReturns = db.prepare(`
      SELECT r.*, s.name as supplier_name, d.batch_no, po.po_no
      FROM returns r
      JOIN suppliers s ON r.supplier_id = s.id
      JOIN deliveries d ON r.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      WHERE r.status = 'pending' AND r.supplier_signed = 0
      ORDER BY r.created_at DESC LIMIT 100
    `).all();

    const today = date;
    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowStr = tomorrow.getFullYear() + '-' + (tomorrow.getMonth() + 1).toString().padStart(2, '0') + '-' + tomorrow.getDate().toString().padStart(2, '0');
    const expectedDeliveries = db.prepare(`
      SELECT po.*, s.name as supplier_name, s.phone as supplier_phone, s.contact_person
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.status IN ('pending','partial_accepted') AND po.expected_delivery_date IN (?, ?)
      ORDER BY po.expected_delivery_date ASC LIMIT 100
    `).all(today, tomorrowStr);

    const summary = {
      purchase_orders: poCount,
      pending_deduction_count: pendingDeductions.length,
      pending_replacement_count: pendingReplacements.length,
      today_delivery_count: todaysDeliveries.length,
      unsigned_return_count: unsignReturns.length,
      expected_delivery_count: expectedDeliveries.length,
      total_pending_value: pendingDeductions.reduce((s, d) => s + (d.deduction_value || 0), 0)
    };

    db.close();
    res.json({
      summary,
      pending_deductions: pendingDeductions,
      pending_replacements: pendingReplacements,
      todays_deliveries: todaysDeliveries,
      unsigned_returns: unsignReturns,
      expected_deliveries: expectedDeliveries
    });
  } catch (err) { handleError(res, err); }
});

// 采购追补送 - 查看待补送扣量详情（不用翻照片）
router.get('/buyer/deductions-trace', roleRequired('buyer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;
    const sql = `SELECT
      ded.id, ded.deduction_no, ded.material_code, ded.material_name, ded.unit,
      ded.deduction_qty, ded.replaced_qty, ded.remaining_replace_qty,
      ded.deduction_value, ded.reason, ded.description, ded.photo_urls, ded.status, ded.created_at,
      s.id as supplier_id, s.name as supplier_name, s.phone as supplier_phone, s.contact_person,
      d.batch_no, d.delivery_date, d.photo_urls as delivery_photos,
      po.id as po_id, po.po_no, po.order_date, u.name as inspector_name
      FROM deductions ded
      JOIN suppliers s ON ded.supplier_id = s.id
      JOIN deliveries d ON ded.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON ded.inspector_id = u.id
      WHERE 1=1`;
    const params = [];
    if (status === 'pending') {
      sql += ` AND ded.status IN ('pending_replace','partial_replaced')`;
    } else if (status) {
      sql += ' AND ded.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY ded.created_at DESC LIMIT 500';
    const rows = db.prepare(sql).all(...params);
    rows.forEach(r => {
      r.replacements = db.prepare(`SELECT rp.replace_no, rp.replace_qty, rp.remaining_replace_qty,
        rp.status, rp.follow_up_date, rp.remarks, rp.created_at,
        u.name as buyer_name
        FROM replacements rp LEFT JOIN users u ON rp.buyer_id = u.id
        WHERE rp.original_deduction_id = ? ORDER BY rp.created_at DESC`).all(r.id);
      r.replacements.forEach(rp => {
        rp.deliveries = db.prepare(`SELECT rd.delivered_qty, rd.received_qty, rd.re_deduction_qty,
          d.batch_no, d.delivery_date
          FROM replace_deliveries rd JOIN deliveries d ON rd.delivery_id = d.id
          WHERE rd.replacement_id = (SELECT id FROM replacements WHERE replace_no = ?)`).all(rp.replace_no);
      });
    });
    db.close();
    res.json(rows);
  } catch (err) { handleError(res, err); }
});

// ==================== 财务视图 - 扣款导出 ====================
router.get('/finance/deductions', roleRequired('finance', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { period, supplier_id, status, date_from, date_to, format } = req.query;
    let sql = `SELECT
      fd.id, fd.period, fd.supplier_id, s.name as supplier_name, s.code as supplier_code,
      fd.deduction_id, ded.deduction_no, fd.material_name, fd.deduction_qty,
      ded.unit, ded.unit_price, fd.deduction_value, fd.reason, ded.description,
      ded.batch_no, ded.delivery_date, ded.po_no, fd.status as settle_status,
      fd.settled_at, fd.created_at
      FROM finance_deductions fd
      JOIN suppliers s ON fd.supplier_id = s.id
      JOIN (
        SELECT ded_inner.*, d.batch_no, d.delivery_date, po.po_no
        FROM deductions ded_inner
        JOIN deliveries d ON ded_inner.delivery_id = d.id
        JOIN purchase_orders po ON d.po_id = po.id
      ) ded ON fd.deduction_id = ded.id
      WHERE 1=1`;
    const params = [];
    if (period) { sql += ' AND fd.period = ?'; params.push(period); }
    if (supplier_id) { sql += ' AND fd.supplier_id = ?'; params.push(Number(supplier_id)); }
    if (status) { sql += ' AND fd.status = ?'; params.push(status); }
    if (date_from) { sql += ' AND ded.delivery_date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND ded.delivery_date <= ?'; params.push(date_to); }
    sql += ' ORDER BY ded.delivery_date DESC, s.name ASC LIMIT 2000';
    const rows = db.prepare(sql).all(...params);

    const reasonMap = {
      rotten: '腐烂变质', weight_insufficient: '重量不足', damaged: '破损',
      expired: '过期', contaminated: '污染', wrong_spec: '规格错误', other: '其他'
    };
    rows.forEach(r => { r.reason_cn = reasonMap[r.reason] || r.reason; });

    const bySupplier = {};
    rows.forEach(r => {
      if (!bySupplier[r.supplier_id]) {
        bySupplier[r.supplier_id] = {
          supplier_id: r.supplier_id,
          supplier_name: r.supplier_name,
          supplier_code: r.supplier_code,
          period: period || (r.delivery_date ? r.delivery_date.substring(0, 7) : ''),
          deduction_count: 0,
          total_deduction_qty: 0,
          total_deduction_value: 0,
          unsettled_value: 0,
          settled_value: 0,
          details: []
        };
      }
      const g = bySupplier[r.supplier_id];
      g.deduction_count++;
      g.total_deduction_qty += r.deduction_qty;
      g.total_deduction_value += r.deduction_value;
      if (r.settle_status === 'settled') g.settled_value += r.deduction_value;
      else g.unsettled_value += r.deduction_value;
      g.details.push(r);
    });

    db.close();

    if (format === 'excel' || format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const allData = rows.map(r => ({
        '期间': r.period,
        '供应商编码': r.supplier_code,
        '供应商名称': r.supplier_name,
        '扣量单号': r.deduction_no,
        '采购单号': r.po_no,
        '批次号': r.batch_no,
        '送货日期': r.delivery_date,
        '物料名称': r.material_name,
        '扣量数量': r.deduction_qty,
        '单位': r.unit,
        '单价': r.unit_price,
        '扣减金额(元)': r.deduction_value,
        '扣量原因': r.reason_cn,
        '说明': r.description || '',
        '结算状态': r.settle_status === 'settled' ? '已结算' : r.settle_status === 'waived' ? '已豁免' : '未结算',
        '创建时间': r.created_at
      }));
      const ws1 = XLSX.utils.json_to_sheet(allData);
      XLSX.utils.book_append_sheet(wb, ws1, '扣款明细');

      const summary = Object.values(bySupplier).map(g => ({
        '期间': g.period,
        '供应商编码': g.supplier_code,
        '供应商名称': g.supplier_name,
        '扣量笔数': g.deduction_count,
        '扣量总数量': g.total_deduction_qty,
        '扣款总金额(元)': g.total_deduction_value,
        '未结算金额(元)': g.unsettled_value,
        '已结算金额(元)': g.settled_value
      }));
      const ws2 = XLSX.utils.json_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, ws2, '按供应商汇总');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `deductions_${period || todayStr()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buf);
    }

    const totals = {
      deduction_count: rows.length,
      total_deduction_qty: rows.reduce((s, r) => s + r.deduction_qty, 0),
      total_deduction_value: rows.reduce((s, r) => s + r.deduction_value, 0),
      unsettled_value: rows.filter(r => r.settle_status === 'unsettled').reduce((s, r) => s + r.deduction_value, 0),
      settled_value: rows.filter(r => r.settle_status === 'settled').reduce((s, r) => s + r.deduction_value, 0)
    };

    res.json({
      period: period || (rows[0]?.period || ''),
      totals,
      by_supplier: Object.values(bySupplier),
      details: rows
    });
  } catch (err) { handleError(res, err); }
});

// 财务标记扣款已结算
router.post('/finance/deductions/:id/settle', roleRequired('finance', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const fd = db.prepare('SELECT * FROM finance_deductions WHERE id = ?').get(req.params.id);
    if (!fd) { db.close(); return res.status(404).json({ error: '财务扣款记录不存在' }); }
    const { status } = req.body;
    const s = status === 'waived' ? 'waived' : 'settled';
    db.prepare(`UPDATE finance_deductions SET status = ?, settled_at = datetime('now') WHERE id = ?`).run(s, req.params.id);
    const updated = db.prepare('SELECT * FROM finance_deductions WHERE id = ?').get(req.params.id);
    db.close();
    res.json({ message: s === 'waived' ? '已标记豁免' : '已标记结算', ...updated });
  } catch (err) { handleError(res, err); }
});

// ==================== 厨师长视图 - 当天可用库存 + 质量问题 ====================
router.get('/chef/dashboard', roleRequired('chef', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const date = req.query.date || todayStr();

    const stock = db.prepare(`SELECT
      material_code, material_name, category, unit,
      SUM(available_qty) as available_qty,
      SUM(quality_issue_qty) as quality_issue_qty,
      SUM(in_inspection_qty) as in_inspection_qty,
      COUNT(DISTINCT batch_no) as batch_count,
      GROUP_CONCAT(DISTINCT batch_no, '; ') as batch_nos,
      GROUP_CONCAT(DISTINCT po_no, '; ') as po_nos
      FROM stock_snapshots
      WHERE snapshot_date = ?
      GROUP BY material_code, material_name, category, unit
      ORDER BY category, material_name`).all(date);

    const todayIssues = db.prepare(`SELECT
      ded.id, ded.deduction_no, ded.material_code, ded.material_name, ded.category,
      ded.unit, ded.deduction_qty, ded.deduction_value, ded.reason, ded.description,
      ded.photo_urls, ded.created_at, s.name as supplier_name,
      d.batch_no, d.delivery_date, u.name as inspector_name
      FROM deductions ded
      JOIN suppliers s ON ded.supplier_id = s.id
      JOIN deliveries d ON ded.delivery_id = d.id
      LEFT JOIN users u ON ded.inspector_id = u.id
      WHERE d.delivery_date = ?
      ORDER BY ded.created_at DESC`).all(date);

    const todayDeliveries = db.prepare(`SELECT
      d.id, d.batch_no, d.delivery_date, d.delivery_time, d.is_final,
      s.name as supplier_name, s.category as supplier_category,
      po.po_no, u.name as inspector_name,
      (SELECT COUNT(*) FROM delivery_items di WHERE di.delivery_id = d.id) as item_count,
      (SELECT COUNT(*) FROM delivery_items di WHERE di.delivery_id = d.id AND di.has_quality_issue = 1) as issue_count
      FROM deliveries d
      JOIN suppliers s ON d.supplier_id = s.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON d.inspector_id = u.id
      WHERE d.delivery_date = ?
      ORDER BY d.delivery_time DESC`).all(date);

    const categorySummary = {};
    stock.forEach(s => {
      const cat = s.category;
      if (!categorySummary[cat]) categorySummary[cat] = { category: cat, item_count: 0, total_available: 0, total_quality_issue: 0 };
      categorySummary[cat].item_count++;
      categorySummary[cat].total_available += s.available_qty;
      categorySummary[cat].total_quality_issue += s.quality_issue_qty;
    });

    const reasonMap = {
      rotten: '腐烂变质', weight_insufficient: '重量不足', damaged: '破损',
      expired: '过期', contaminated: '污染', wrong_spec: '规格错误', other: '其他'
    };
    todayIssues.forEach(i => { i.reason_cn = reasonMap[i.reason] || i.reason; });

    const issueByReason = {};
    todayIssues.forEach(i => {
      const r = i.reason_cn;
      if (!issueByReason[r]) issueByReason[r] = { reason: r, count: 0, total_qty: 0, total_value: 0 };
      issueByReason[r].count++;
      issueByReason[r].total_qty += i.deduction_qty;
      issueByReason[r].total_value += i.deduction_value;
    });

    db.close();
    res.json({
      date,
      stock_summary: {
        total_item_types: stock.length,
        total_batches: stock.reduce((s, r) => s + r.batch_count, 0),
        total_available_value: 'N/A',
        total_quality_issue_count: todayIssues.length
      },
      stock_by_category: Object.values(categorySummary),
      stock_details: stock,
      today_quality_issues: todayIssues,
      issue_by_reason: Object.values(issueByReason),
      today_deliveries: todayDeliveries,
      deliveries_with_issues: todayDeliveries.filter(d => d.issue_count > 0)
    });
  } catch (err) { handleError(res, err); }
});

// 厨师长：按物料查看历史批次和质量趋势
router.get('/chef/material-history', roleRequired('chef', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { material_code, days } = req.query;
    if (!material_code) throw new BusinessError('请指定物料编码');
    const d = Number(days) || 30;
    const history = db.prepare(`SELECT
      ss.*,
      ded.deduction_count, ded.deduction_qty_total, ded.deduction_value_total
      FROM stock_snapshots ss
      LEFT JOIN (
        SELECT DATE(dd.delivery_date) as ddate, ded.material_code,
          COUNT(*) as deduction_count,
          SUM(ded.deduction_qty) as deduction_qty_total,
          SUM(ded.deduction_value) as deduction_value_total
        FROM deductions ded
        JOIN deliveries dd ON ded.delivery_id = dd.id
        WHERE ded.material_code = ? AND DATE(dd.delivery_date) >= DATE('now', ?)
        GROUP BY DATE(dd.delivery_date), ded.material_code
      ) ded ON ded.ddate = ss.snapshot_date AND ded.material_code = ss.material_code
      WHERE ss.material_code = ? AND ss.snapshot_date >= DATE('now', ?)
      ORDER BY ss.snapshot_date DESC`).all(material_code, `-${d} days`, material_code, `-${d} days`);
    db.close();
    res.json(history);
  } catch (err) { handleError(res, err); }
});

// ==================== 验收员视图 - 下班前按供应商汇总 ====================
router.get('/inspector/daily-summary', roleRequired('inspector', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const date = req.query.date || todayStr();
    const inspectorId = req.user.role === 'admin' ? null : req.user.id;

    let dSql = `SELECT
      d.id, d.batch_no, d.delivery_date, d.delivery_time, d.is_final, d.remarks,
      s.id as supplier_id, s.name as supplier_name, s.code as supplier_code, s.category as supplier_category,
      po.po_no, u.name as inspector_name, d.inspector_id
      FROM deliveries d
      JOIN suppliers s ON d.supplier_id = s.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON d.inspector_id = u.id
      WHERE d.delivery_date = ?`;
    const params = [date];
    if (inspectorId) { dSql += ' AND d.inspector_id = ?'; params.push(inspectorId); }
    dSql += ' ORDER BY d.delivery_time DESC';
    const deliveries = db.prepare(dSql).all(...params);

    const deliveryIds = deliveries.map(d => d.id);
    const diMap = {};
    const dedMap = {};
    const retMap = {};
    if (deliveryIds.length) {
      const qmarks = deliveryIds.map(() => '?').join(',');
      const dis = db.prepare(`SELECT * FROM delivery_items WHERE delivery_id IN (${qmarks})`).all(...deliveryIds);
      dis.forEach(di => {
        if (!diMap[di.delivery_id]) diMap[di.delivery_id] = [];
        diMap[di.delivery_id].push(di);
      });
      const deds = db.prepare(`SELECT * FROM deductions WHERE delivery_id IN (${qmarks})`).all(...deliveryIds);
      deds.forEach(ded => {
        if (!dedMap[ded.delivery_id]) dedMap[ded.delivery_id] = [];
        dedMap[ded.delivery_id].push(ded);
      });
      const rets = db.prepare(`SELECT * FROM returns WHERE delivery_id IN (${qmarks})`).all(...deliveryIds);
      rets.forEach(r => {
        if (!retMap[r.delivery_id]) retMap[r.delivery_id] = [];
        retMap[r.delivery_id].push(r);
      });
    }

    const bySupplier = {};
    deliveries.forEach(d => {
      if (!bySupplier[d.supplier_id]) {
        bySupplier[d.supplier_id] = {
          supplier_id: d.supplier_id,
          supplier_name: d.supplier_name,
          supplier_code: d.supplier_code,
          supplier_category: d.supplier_category,
          date,
          delivery_count: 0,
          final_count: 0,
          total_delivered_value: 0,
          total_accepted_value: 0,
          total_deduction_count: 0,
          total_deduction_qty: 0,
          total_deduction_value: 0,
          return_count: 0,
          total_return_qty: 0,
          total_return_value: 0,
          deliveries: [],
          quality_issue_count: 0,
          unsigned_return_count: 0
        };
      }
      const g = bySupplier[d.supplier_id];
      g.delivery_count++;
      if (d.is_final === 1) g.final_count++;
      const items = diMap[d.id] || [];
      const deds = dedMap[d.id] || [];
      const rets = retMap[d.id] || [];

      items.forEach(di => {
        g.total_delivered_value += (di.delivered_qty || 0) * (di.unit_price || 0);
        g.total_accepted_value += (di.actual_accepted_qty || 0) * (di.unit_price || 0);
        if (di.has_quality_issue) g.quality_issue_count++;
      });
      deds.forEach(ded => {
        g.total_deduction_count++;
        g.total_deduction_qty += ded.deduction_qty;
        g.total_deduction_value += ded.deduction_value;
      });
      rets.forEach(r => {
        g.return_count++;
        g.total_return_qty += r.total_qty;
        g.total_return_value += r.total_value || 0;
        if (r.supplier_signed === 0) g.unsigned_return_count++;
      });

      g.deliveries.push({
        ...d,
        items,
        deductions: deds,
        returns: rets
      });
    });

    const grandTotal = {
      total_suppliers: Object.keys(bySupplier).length,
      total_deliveries: deliveries.length,
      total_final_deliveries: deliveries.filter(d => d.is_final === 1).length,
      total_deduction_count: Object.values(bySupplier).reduce((s, g) => s + g.total_deduction_count, 0),
      total_deduction_value: Object.values(bySupplier).reduce((s, g) => s + g.total_deduction_value, 0),
      total_return_count: Object.values(bySupplier).reduce((s, g) => s + g.return_count, 0),
      total_return_value: Object.values(bySupplier).reduce((s, g) => s + g.total_return_value, 0),
      total_quality_issue_count: Object.values(bySupplier).reduce((s, g) => s + g.quality_issue_count, 0),
      unsigned_return_count: Object.values(bySupplier).reduce((s, g) => s + g.unsigned_return_count, 0),
      total_accepted_value: Object.values(bySupplier).reduce((s, g) => s + g.total_accepted_value, 0),
      total_delivered_value: Object.values(bySupplier).reduce((s, g) => s + g.total_delivered_value, 0)
    };

    db.close();
    res.json({
      date,
      inspector: inspectorId ? { id: req.user.id, name: req.user.name } : null,
      grand_total: grandTotal,
      by_supplier: Object.values(bySupplier).sort((a, b) => (b.total_deduction_value - a.total_deduction_value))
    });
  } catch (err) { handleError(res, err); }
});

// 验收员：下载日汇总 Excel
router.get('/inspector/daily-summary/export', roleRequired('inspector', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const date = req.query.date || todayStr();
    const inspectorId = req.user.role === 'admin' ? null : req.user.id;

    let dSql = `SELECT
      d.id, d.batch_no, s.id as supplier_id, s.name as supplier_name, s.code as supplier_code,
      po.po_no, d.delivery_date, d.delivery_time, d.is_final
      FROM deliveries d
      JOIN suppliers s ON d.supplier_id = s.id
      JOIN purchase_orders po ON d.po_id = po.id
      WHERE d.delivery_date = ?`;
    const params = [date];
    if (inspectorId) { dSql += ' AND d.inspector_id = ?'; params.push(inspectorId); }
    const deliveries = db.prepare(dSql).all(...params);
    const ids = deliveries.map(d => d.id);

    let items = [];
    let deds = [];
    let rets = [];
    if (ids.length) {
      const q = ids.map(() => '?').join(',');
      items = db.prepare(`SELECT
        di.*, s.name as supplier_name, d.batch_no, po.po_no
        FROM delivery_items di
        JOIN deliveries d ON di.delivery_id = d.id
        JOIN suppliers s ON d.supplier_id = s.id
        JOIN purchase_orders po ON d.po_id = po.id
        WHERE di.delivery_id IN (${q})`).all(...ids);
      deds = db.prepare(`SELECT
        ded.*, s.name as supplier_name, d.batch_no, po.po_no
        FROM deductions ded
        JOIN deliveries d ON ded.delivery_id = d.id
        JOIN suppliers s ON ded.supplier_id = s.id
        JOIN purchase_orders po ON d.po_id = po.id
        WHERE ded.delivery_id IN (${q})`).all(...ids);
      rets = db.prepare(`SELECT
        r.*, ri.material_code, ri.material_name, ri.return_qty, ri.return_value, ri.reason, ri.unit,
        s.name as supplier_name, d.batch_no, po.po_no
        FROM returns r
        JOIN return_items ri ON ri.return_id = r.id
        JOIN deliveries d ON r.delivery_id = d.id
        JOIN suppliers s ON r.supplier_id = s.id
        JOIN purchase_orders po ON d.po_id = po.id
        WHERE r.delivery_id IN (${q})`).all(...ids);
    }
    db.close();

    const reasonMap = {
      rotten: '腐烂变质', weight_insufficient: '重量不足', damaged: '破损',
      expired: '过期', contaminated: '污染', wrong_spec: '规格错误', other: '其他'
    };

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(items.map(i => ({
      '日期': date, '批次号': i.batch_no, '采购单号': i.po_no,
      '供应商': i.supplier_name, '物料编码': i.material_code, '物料名称': i.material_name,
      '类别': i.category, '送货数量': i.delivered_qty, '实收数量': i.actual_accepted_qty,
      '扣量数量': i.deduction_qty, '单位': i.unit, '单价': i.unit_price,
      '金额': (i.actual_accepted_qty * i.unit_price).toFixed(2),
      '有质量问题': i.has_quality_issue ? '是' : '否',
      '质量详情': i.quality_detail || '', '扣量原因': i.deduction_reason || ''
    })));
    XLSX.utils.book_append_sheet(wb, ws1, '送货明细');

    const ws2 = XLSX.utils.json_to_sheet(deds.map(d => ({
      '日期': date, '扣量单号': d.deduction_no, '批次号': d.batch_no,
      '采购单号': d.po_no, '供应商': d.supplier_name,
      '物料编码': d.material_code, '物料名称': d.material_name,
      '类别': d.category, '订单数量': d.expected_qty, '送货数量': d.delivered_qty,
      '扣量数量': d.deduction_qty, '单位': d.unit, '单价': d.unit_price,
      '扣减金额(元)': d.deduction_value.toFixed(2),
      '扣量原因': reasonMap[d.reason] || d.reason, '说明': d.description || '',
      '状态': d.status, '已补送': d.replaced_qty, '待补送': d.remaining_replace_qty
    })));
    XLSX.utils.book_append_sheet(wb, ws2, '扣量明细');

    const ws3 = XLSX.utils.json_to_sheet(rets.map(r => ({
      '日期': date, '退货单号': r.return_no, '批次号': r.batch_no,
      '采购单号': r.po_no, '供应商': r.supplier_name,
      '物料编码': r.material_code, '物料名称': r.material_name,
      '退货数量': r.return_qty, '单位': r.unit,
      '退货金额(元)': (r.return_value || 0).toFixed(2),
      '退货原因': r.reason, '退货类型': r.return_type,
      '供应商已签收': r.supplier_signed ? '是' : '否',
      '签收时间': r.supplier_signed_at || '', '状态': r.status
    })));
    XLSX.utils.book_append_sheet(wb, ws3, '退货明细');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `inspector_summary_${date}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) { handleError(res, err); }
});

// ==================== 供应商视图 - 签收退货 + 我的扣量和补送 ====================
router.get('/supplier/dashboard', supplierOnly, (req, res) => {
  try {
    const db = getDb();
    const supplierId = req.user.role === 'admin' ? (req.query.supplier_id ? Number(req.query.supplier_id) : null) : req.user.supplier_id;
    if (!supplierId) throw new BusinessError('未指定供应商');

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);
    if (!supplier) throw new BusinessError('供应商不存在');

    const date = req.query.date || todayStr();

    const summary = {};
    summary.deliveries_today = db.prepare(`SELECT COUNT(*) as cnt FROM deliveries WHERE supplier_id = ? AND delivery_date = ?`).get(supplierId, date).cnt;
    summary.deductions_pending_replace = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(remaining_replace_qty),0) as qty, COALESCE(SUM(deduction_value),0) as val
      FROM deductions WHERE supplier_id = ? AND status IN ('pending_replace','partial_replaced')`).get(supplierId);
    summary.replacements_pending = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(remaining_replace_qty),0) as qty
      FROM replacements WHERE supplier_id = ? AND status IN ('pending','partial_delivered')`).get(supplierId);
    summary.returns_pending_sign = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(total_qty),0) as qty, COALESCE(SUM(total_value),0) as val
      FROM returns WHERE supplier_id = ? AND supplier_signed = 0 AND status = 'pending'`).get(supplierId);

    const pendingReturns = db.prepare(`SELECT
      r.id, r.return_no, r.return_date, r.return_type, r.total_qty, r.total_value,
      r.reason, r.photo_urls, r.status, r.supplier_signed,
      d.batch_no, d.delivery_date, po.po_no
      FROM returns r
      JOIN deliveries d ON r.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      WHERE r.supplier_id = ? AND r.supplier_signed = 0 AND r.status = 'pending'
      ORDER BY r.created_at DESC LIMIT 200`).all(supplierId);
    pendingReturns.forEach(r => {
      r.items = db.prepare(`SELECT ri.*, ded.deduction_qty as original_deduction_qty,
        ded.reason as deduction_reason, ded.description as deduction_description, ded.photo_urls as deduction_photos
        FROM return_items ri LEFT JOIN deductions ded ON ri.deduction_id = ded.id
        WHERE ri.return_id = ?`).all(r.id);
    });

    const myDeductions = db.prepare(`SELECT
      ded.id, ded.deduction_no, ded.material_code, ded.material_name, ded.unit,
      ded.deduction_qty, ded.replaced_qty, ded.remaining_replace_qty, ded.deduction_value,
      ded.reason, ded.description, ded.photo_urls, ded.status, ded.created_at,
      d.batch_no, d.delivery_date, po.po_no
      FROM deductions ded
      JOIN deliveries d ON ded.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      WHERE ded.supplier_id = ?
      ORDER BY ded.created_at DESC LIMIT 300`).all(supplierId);

    const myReplacements = db.prepare(`SELECT
      rp.id, rp.replace_no, rp.material_code, rp.material_name, rp.unit,
      rp.original_deduction_qty, rp.replace_qty, rp.remaining_replace_qty,
      rp.status, rp.follow_up_date, rp.remarks, rp.created_at,
      ded.deduction_no, d.batch_no, po.po_no
      FROM replacements rp
      JOIN deductions ded ON rp.original_deduction_id = ded.id
      JOIN deliveries d ON ded.delivery_id = d.id
      JOIN purchase_orders po ON rp.po_id = po.id
      WHERE rp.supplier_id = ?
      ORDER BY rp.created_at DESC LIMIT 300`).all(supplierId);

    const myReturns = db.prepare(`SELECT
      r.id, r.return_no, r.return_date, r.return_type, r.total_qty, r.total_value,
      r.status, r.supplier_signed, r.supplier_signed_at,
      d.batch_no, po.po_no
      FROM returns r
      JOIN deliveries d ON r.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      WHERE r.supplier_id = ?
      ORDER BY r.created_at DESC LIMIT 300`).all(supplierId);

    db.close();
    res.json({
      supplier,
      date,
      summary: {
        today_deliveries: summary.deliveries_today,
        pending_replace_deductions: summary.deductions_pending_replace,
        pending_replacements: summary.replacements_pending,
        pending_sign_returns: summary.returns_pending_sign
      },
      pending_sign_returns: pendingReturns,
      my_deductions: myDeductions,
      my_replacements: myReplacements,
      my_returns: myReturns
    });
  } catch (err) { handleError(res, err); }
});

// 供应商：查看退货单详情（含对应的扣量照片和原因）
router.get('/supplier/returns/:id', supplierOnly, (req, res) => {
  try {
    const db = getDb();
    const supplierId = req.user.role === 'admin' ? null : req.user.supplier_id;
    const r = db.prepare(`SELECT
      r.*, s.name as supplier_name, s.code as supplier_code,
      d.batch_no, d.delivery_date, d.photo_urls as delivery_photos,
      po.po_no, u.name as handler_name
      FROM returns r
      JOIN suppliers s ON r.supplier_id = s.id
      JOIN deliveries d ON r.delivery_id = d.id
      JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN users u ON r.handler_id = u.id
      WHERE r.id = ?`).get(req.params.id);
    if (!r) { db.close(); return res.status(404).json({ error: '退货单不存在' }); }
    if (supplierId && r.supplier_id !== supplierId) {
      db.close(); return res.status(403).json({ error: '只能查看本供应商的退货单' });
    }
    r.items = db.prepare(`SELECT
      ri.*,
      ded.deduction_no, ded.deduction_qty as original_deduction_qty,
      ded.reason as deduction_reason, ded.description as deduction_description,
      ded.photo_urls as deduction_photos
      FROM return_items ri
      LEFT JOIN deductions ded ON ri.deduction_id = ded.id
      WHERE ri.return_id = ?`).all(r.id);
    db.close();
    res.json(r);
  } catch (err) { handleError(res, err); }
});

module.exports = router;
