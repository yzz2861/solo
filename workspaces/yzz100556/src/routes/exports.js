const express = require('express');
const db = require('../config/database');
const { authMiddleware, roleMiddleware, logOperation } = require('../middleware/auth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

const router = express.Router();
router.use(authMiddleware);

const EXPORT_DIR = path.join(__dirname, '../../exports');
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

function getMonthRange(year, month) {
  const y = year || new Date().getFullYear();
  const m = month || (new Date().getMonth() + 1);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endDate = new Date(nextYear, nextMonth - 1, 0);
  const end = `${y}-${String(m).padStart(2, '0')}-${endDate.getDate()}`;
  return { start, end, y, m };
}

router.get('/reissues/monthly', roleMiddleware('admin', 'receptionist'), (req, res) => {
  const { year, month, format = 'json' } = req.query;
  const { start, end, y, m } = getMonthRange(year, month);

  const data = db.prepare(`
    SELECT 
      cr.id,
      cr.reported_at,
      cr.status,
      cr.deposit_amount,
      cr.deposit_status,
      cr.deposit_paid_at,
      cr.deposit_refunded_at,
      cr.completed_at,
      cr.notes,
      cr.warning_flags,
      oc.card_number as old_card_number,
      oc.status as old_card_final_status,
      nc.card_number as new_card_number,
      r.room_number,
      r.building,
      r.unit,
      o.name as owner_name,
      o.phone,
      u1.real_name as reported_by_name,
      u2.real_name as stopped_by_name,
      u3.real_name as new_issued_by_name,
      u4.real_name as deposit_handler_name
    FROM card_reissues cr
    JOIN access_cards oc ON cr.old_card_id = oc.id
    LEFT JOIN access_cards nc ON cr.new_card_id = nc.id
    JOIN rooms r ON cr.room_id = r.id
    JOIN owners o ON cr.owner_id = o.id
    LEFT JOIN users u1 ON cr.reported_by = u1.id
    LEFT JOIN users u2 ON cr.stopped_by = u2.id
    LEFT JOIN users u3 ON cr.new_issued_by = u3.id
    LEFT JOIN users u4 ON cr.deposit_handler = u4.id
    WHERE DATE(cr.reported_at) >= ? AND DATE(cr.reported_at) <= ?
    ORDER BY cr.reported_at ASC
  `).all(start, end);

  const statusMap = {
    'pending_stop': '挂失待停用',
    'stopped': '旧卡已停用',
    'new_card_issued': '新卡已发放',
    'completed': '补办完成',
    'cancelled': '已取消',
    'old_card_recovered': '旧卡已找回'
  };
  const depositStatusMap = {
    'unpaid': '未缴纳',
    'paid': '已缴纳',
    'refunded': '已退还',
    'no_refund': '不予退还'
  };

  const enriched = data.map(r => ({
    ...r,
    status_text: statusMap[r.status],
    deposit_status_text: depositStatusMap[r.deposit_status],
    room_full: `${r.building}栋${r.unit ? r.unit + '单元' : ''}${r.room_number}`,
    is_same_day_multiple: !!r.warning_flags
  }));

  if (format === 'csv') {
    const filePath = path.join(EXPORT_DIR, `补办记录_${y}${m}.csv`);
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: '记录ID' },
        { id: 'reported_at', title: '挂失时间' },
        { id: 'room_full', title: '房间' },
        { id: 'owner_name', title: '业主' },
        { id: 'phone', title: '电话' },
        { id: 'old_card_number', title: '旧卡号' },
        { id: 'new_card_number', title: '新卡号' },
        { id: 'status_text', title: '办理状态' },
        { id: 'reported_by_name', title: '挂失经办人' },
        { id: 'stopped_by_name', title: '停用人' },
        { id: 'stopped_at', title: '停用时间' },
        { id: 'new_issued_by_name', title: '发卡人' },
        { id: 'completed_at', title: '完成时间' },
        { id: 'deposit_amount', title: '押金金额' },
        { id: 'deposit_status_text', title: '押金状态' },
        { id: 'is_same_day_multiple', title: '同日多次补办' },
        { id: 'notes', title: '备注' }
      ]
    });
    csvWriter.writeRecords(enriched).then(() => {
      logOperation(req.user.id, 'export_reissues_csv', 'export', null, { year: y, month: m }, req.ip);
      res.download(filePath);
    });
  } else {
    logOperation(req.user.id, 'export_reissues_json', 'export', null, { year: y, month: m }, req.ip);
    res.json({
      period: `${y}年${m}月`,
      dateRange: { start, end },
      total: enriched.length,
      summary: {
        total: enriched.length,
        pending: enriched.filter(r => r.status === 'pending_stop').length,
        stopped: enriched.filter(r => r.status === 'stopped').length,
        completed: enriched.filter(r => r.status === 'completed' || r.status === 'new_card_issued').length,
        cancelled: enriched.filter(r => r.status === 'cancelled').length,
        recovered: enriched.filter(r => r.status === 'old_card_recovered').length,
        sameDayMultiple: enriched.filter(r => r.is_same_day_multiple).length
      },
      records: enriched
    });
  }
});

router.get('/deposits/monthly', roleMiddleware('admin', 'receptionist'), (req, res) => {
  const { year, month, format = 'json' } = req.query;
  const { start, end, y, m } = getMonthRange(year, month);

  const records = db.prepare(`
    SELECT 
      dr.id,
      dr.reissue_id,
      dr.type,
      dr.amount,
      dr.handled_at,
      dr.notes,
      u.real_name as handler_name,
      r.room_number,
      r.building,
      r.unit,
      o.name as owner_name,
      o.phone,
      oc.card_number as old_card_number,
      nc.card_number as new_card_number,
      cr.deposit_status
    FROM deposit_records dr
    JOIN card_reissues cr ON dr.reissue_id = cr.id
    JOIN rooms r ON cr.room_id = r.id
    JOIN owners o ON cr.owner_id = o.id
    JOIN access_cards oc ON cr.old_card_id = oc.id
    LEFT JOIN access_cards nc ON cr.new_card_id = nc.id
    JOIN users u ON dr.handler = u.id
    WHERE DATE(dr.handled_at) >= ? AND DATE(dr.handled_at) <= ?
    ORDER BY dr.handled_at ASC
  `).all(start, end);

  const typeMap = { 'collect': '收取', 'refund': '退还' };
  const depositStatusMap = {
    'unpaid': '未缴纳',
    'paid': '已缴纳',
    'refunded': '已退还',
    'no_refund': '不予退还'
  };

  const enriched = records.map(r => ({
    ...r,
    type_text: typeMap[r.type],
    deposit_status_text: depositStatusMap[r.deposit_status],
    room_full: `${r.building}栋${r.unit ? r.unit + '单元' : ''}${r.room_number}`,
    is_no_refund: r.type === 'refund' && r.amount === 0
  }));

  if (format === 'csv') {
    const filePath = path.join(EXPORT_DIR, `押金记录_${y}${m}.csv`);
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: '记录ID' },
        { id: 'reissue_id', title: '补办ID' },
        { id: 'handled_at', title: '处理时间' },
        { id: 'room_full', title: '房间' },
        { id: 'owner_name', title: '业主' },
        { id: 'phone', title: '电话' },
        { id: 'type_text', title: '操作类型' },
        { id: 'amount', title: '金额' },
        { id: 'is_no_refund', title: '是否不退' },
        { id: 'deposit_status_text', title: '押金状态' },
        { id: 'handler_name', title: '经办人' },
        { id: 'old_card_number', title: '旧卡号' },
        { id: 'new_card_number', title: '新卡号' },
        { id: 'notes', title: '备注' }
      ]
    });
    csvWriter.writeRecords(enriched).then(() => {
      logOperation(req.user.id, 'export_deposits_csv', 'export', null, { year: y, month: m }, req.ip);
      res.download(filePath);
    });
  } else {
    const collected = enriched.filter(r => r.type === 'collect');
    const refunded = enriched.filter(r => r.type === 'refund' && r.amount > 0);
    const noRefund = enriched.filter(r => r.type === 'refund' && r.amount === 0);
    
    logOperation(req.user.id, 'export_deposits_json', 'export', null, { year: y, month: m }, req.ip);
    res.json({
      period: `${y}年${m}月`,
      dateRange: { start, end },
      summary: {
        totalRecords: enriched.length,
        totalCollected: collected.reduce((s, r) => s + r.amount, 0),
        totalRefunded: refunded.reduce((s, r) => s + r.amount, 0),
        noRefundCount: noRefund.length,
        netBalance: collected.reduce((s, r) => s + r.amount, 0) - refunded.reduce((s, r) => s + r.amount, 0),
        collectCount: collected.length,
        refundCount: refunded.length
      },
      records: enriched
    });
  }
});

router.get('/anomalies/monthly', roleMiddleware('admin', 'receptionist'), (req, res) => {
  const { year, month, format = 'json' } = req.query;
  const { start, end, y, m } = getMonthRange(year, month);

  const anomalies = db.prepare(`
    SELECT 
      'recover' as anomaly_type,
      cr.id as source_id,
      cr.reported_at as event_time,
      cr.old_card_id as card_id,
      oc.card_number,
      r.room_number,
      r.building,
      r.unit,
      o.name as owner_name,
      '旧卡挂失后找回复开' as description,
      cr.completed_at as anomaly_time,
      null as handler_name
    FROM card_reissues cr
    JOIN access_cards oc ON cr.old_card_id = oc.id
    JOIN rooms r ON cr.room_id = r.id
    JOIN owners o ON cr.owner_id = o.id
    WHERE cr.status = 'old_card_recovered'
      AND DATE(cr.completed_at) >= ? AND DATE(cr.completed_at) <= ?
    UNION ALL
    SELECT 
      'same_day_multiple' as anomaly_type,
      cr.id as source_id,
      cr.reported_at as event_time,
      cr.old_card_id as card_id,
      oc.card_number,
      r.room_number,
      r.building,
      r.unit,
      o.name as owner_name,
      '同一房号同日多次补办: ' || cr.warning_flags as description,
      cr.reported_at as anomaly_time,
      u1.real_name as handler_name
    FROM card_reissues cr
    JOIN access_cards oc ON cr.old_card_id = oc.id
    JOIN rooms r ON cr.room_id = r.id
    JOIN owners o ON cr.owner_id = o.id
    LEFT JOIN users u1 ON cr.reported_by = u1.id
    WHERE cr.warning_flags IS NOT NULL AND cr.status != 'cancelled'
      AND DATE(cr.reported_at) >= ? AND DATE(cr.reported_at) <= ?
    UNION ALL
    SELECT 
      'deposit_no_refund' as anomaly_type,
      dr.id as source_id,
      dr.handled_at as event_time,
      cr.old_card_id as card_id,
      oc.card_number,
      r.room_number,
      r.building,
      r.unit,
      o.name as owner_name,
      '押金未退还: ' || COALESCE(dr.notes, '') as description,
      dr.handled_at as anomaly_time,
      u.real_name as handler_name
    FROM deposit_records dr
    JOIN card_reissues cr ON dr.reissue_id = cr.id
    JOIN access_cards oc ON cr.old_card_id = oc.id
    JOIN rooms r ON cr.room_id = r.id
    JOIN owners o ON cr.owner_id = o.id
    LEFT JOIN users u ON dr.handler = u.id
    WHERE dr.type = 'refund' AND dr.amount = 0
      AND DATE(dr.handled_at) >= ? AND DATE(dr.handled_at) <= ?
    UNION ALL
    SELECT 
      'cancelled_after_stop' as anomaly_type,
      cr.id as source_id,
      cr.completed_at as event_time,
      cr.old_card_id as card_id,
      oc.card_number,
      r.room_number,
      r.building,
      r.unit,
      o.name as owner_name,
      '旧卡停用后取消补办' as description,
      cr.completed_at as anomaly_time,
      null as handler_name
    FROM card_reissues cr
    JOIN access_cards oc ON cr.old_card_id = oc.id
    JOIN rooms r ON cr.room_id = r.id
    JOIN owners o ON cr.owner_id = o.id
    WHERE cr.status = 'cancelled' AND cr.stopped_at IS NOT NULL
      AND DATE(cr.completed_at) >= ? AND DATE(cr.completed_at) <= ?
    ORDER BY anomaly_time DESC
  `).all(start, end, start, end, start, end, start, end);

  const enriched = anomalies.map(a => ({
    ...a,
    room_full: `${a.building}栋${a.unit ? a.unit + '单元' : ''}${a.room_number}`,
    anomaly_type_text: {
      'recover': '旧卡找回复开',
      'same_day_multiple': '同日多次补办',
      'deposit_no_refund': '押金未退还',
      'cancelled_after_stop': '停用后取消补办'
    }[a.anomaly_type] || a.anomaly_type
  }));

  if (format === 'csv') {
    const filePath = path.join(EXPORT_DIR, `异常记录_${y}${m}.csv`);
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'source_id', title: '关联ID' },
        { id: 'anomaly_type_text', title: '异常类型' },
        { id: 'anomaly_time', title: '异常时间' },
        { id: 'room_full', title: '房间' },
        { id: 'owner_name', title: '业主' },
        { id: 'card_number', title: '关联卡号' },
        { id: 'description', title: '异常说明' },
        { id: 'handler_name', title: '经办人' }
      ]
    });
    csvWriter.writeRecords(enriched).then(() => {
      logOperation(req.user.id, 'export_anomalies_csv', 'export', null, { year: y, month: m }, req.ip);
      res.download(filePath);
    });
  } else {
    const typeCounts = enriched.reduce((acc, a) => {
      acc[a.anomaly_type] = (acc[a.anomaly_type] || 0) + 1;
      return acc;
    }, {});
    
    logOperation(req.user.id, 'export_anomalies_json', 'export', null, { year: y, month: m }, req.ip);
    res.json({
      period: `${y}年${m}月`,
      dateRange: { start, end },
      summary: {
        total: enriched.length,
        byType: typeCounts
      },
      records: enriched
    });
  }
});

module.exports = router;
