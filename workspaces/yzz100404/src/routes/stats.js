const express = require('express');
const { getDB } = require('../db');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/monthly-summary', (req, res) => {
  const db = getDB();
  const { year, month } = req.query;
  const now = dayjs();
  const targetYear = year ? Number(year) : now.year();
  const targetMonth = month ? Number(month) : now.month() + 1;

  const startOfMonth = dayjs(`${targetYear}-${String(targetMonth).padStart(2, '0')}-01`).format('YYYY-MM-DD HH:mm:ss');
  const endOfMonth = dayjs(startOfMonth).endOf('month').format('YYYY-MM-DD HH:mm:ss');

  const totalOrders = db.prepare(`
    SELECT COUNT(*) as cnt FROM fault_orders
    WHERE created_at >= ? AND created_at <= ? AND merged_to_order_id IS NULL
  `).get(startOfMonth, endOfMonth).cnt;

  const completedOrders = db.prepare(`
    SELECT COUNT(*) as cnt FROM fault_orders
    WHERE status = 'completed' AND review_at >= ? AND review_at <= ? AND merged_to_order_id IS NULL
  `).get(startOfMonth, endOfMonth).cnt;

  const pendingOrders = db.prepare(`
    SELECT COUNT(*) as cnt FROM fault_orders
    WHERE status IN ('pending', 'assigned', 'repairing', 'reviewing') AND merged_to_order_id IS NULL
  `).get().cnt;

  const avgRepairHours = db.prepare(`
    SELECT 
      AVG((julianday(review_at) - julianday(created_at)) * 24) as avg_hours
    FROM fault_orders
    WHERE status = 'completed' AND review_at >= ? AND review_at <= ? AND merged_to_order_id IS NULL
  `).get(startOfMonth, endOfMonth).avg_hours;

  const overdueOrders = db.prepare(`
    SELECT fo.*, cp.pile_no, cp.location, r.name as repairer_name
    FROM fault_orders fo
    LEFT JOIN charging_piles cp ON fo.pile_id = cp.id
    LEFT JOIN repairers r ON fo.repairer_id = r.id
    WHERE fo.status IN ('pending', 'assigned', 'repairing', 'reviewing')
      AND fo.deadline < ?
      AND fo.merged_to_order_id IS NULL
    ORDER BY fo.deadline ASC
  `).all(dayjs().format());

  res.json({
    period: `${targetYear}年${targetMonth}月`,
    total_orders: totalOrders,
    completed_orders: completedOrders,
    pending_orders: pendingOrders,
    avg_repair_hours: avgRepairHours ? Number(avgRepairHours.toFixed(2)) : 0,
    overdue_orders: overdueOrders,
    overdue_count: overdueOrders.length,
  });
});

router.get('/top-faults', (req, res) => {
  const db = getDB();
  const { year, month, limit = 10 } = req.query;
  const now = dayjs();
  const targetYear = year ? Number(year) : now.year();
  const targetMonth = month ? Number(month) : now.month() + 1;

  const startOfMonth = dayjs(`${targetYear}-${String(targetMonth).padStart(2, '0')}-01`).format('YYYY-MM-DD HH:mm:ss');
  const endOfMonth = dayjs(startOfMonth).endOf('month').format('YYYY-MM-DD HH:mm:ss');

  const topFaults = db.prepare(`
    SELECT 
      description,
      COUNT(*) as fault_count,
      GROUP_CONCAT(DISTINCT cp.pile_no) as affected_piles
    FROM fault_orders fo
    LEFT JOIN charging_piles cp ON fo.pile_id = cp.id
    WHERE fo.created_at >= ? AND fo.created_at <= ? AND fo.merged_to_order_id IS NULL
    GROUP BY description
    ORDER BY fault_count DESC
    LIMIT ?
  `).all(startOfMonth, endOfMonth, Number(limit));

  res.json({
    period: `${targetYear}年${targetMonth}月`,
    top_faults: topFaults,
  });
});

router.get('/by-pile-type', (req, res) => {
  const db = getDB();
  const { year, month } = req.query;
  const now = dayjs();
  const targetYear = year ? Number(year) : now.year();
  const targetMonth = month ? Number(month) : now.month() + 1;

  const startOfMonth = dayjs(`${targetYear}-${String(targetMonth).padStart(2, '0')}-01`).format('YYYY-MM-DD HH:mm:ss');
  const endOfMonth = dayjs(startOfMonth).endOf('month').format('YYYY-MM-DD HH:mm:ss');

  const byType = db.prepare(`
    SELECT 
      cp.pile_type,
      COUNT(*) as fault_count,
      COUNT(DISTINCT cp.id) as affected_pile_count,
      COUNT(DISTINCT cp.batch_no) as affected_batch_count,
      GROUP_CONCAT(DISTINCT cp.batch_no) as affected_batches,
      GROUP_CONCAT(DISTINCT fo.description) as common_faults
    FROM fault_orders fo
    LEFT JOIN charging_piles cp ON fo.pile_id = cp.id
    WHERE fo.created_at >= ? AND fo.created_at <= ? AND fo.merged_to_order_id IS NULL
    GROUP BY cp.pile_type
    ORDER BY fault_count DESC
  `).all(startOfMonth, endOfMonth);

  const byBatch = db.prepare(`
    SELECT 
      cp.batch_no,
      cp.pile_type,
      COUNT(*) as fault_count,
      COUNT(DISTINCT cp.id) as affected_pile_count,
      GROUP_CONCAT(DISTINCT cp.pile_no) as affected_piles,
      GROUP_CONCAT(DISTINCT fo.description) as common_faults
    FROM fault_orders fo
    LEFT JOIN charging_piles cp ON fo.pile_id = cp.id
    WHERE fo.created_at >= ? AND fo.created_at <= ? AND fo.merged_to_order_id IS NULL AND cp.batch_no IS NOT NULL
    GROUP BY cp.batch_no, cp.pile_type
    ORDER BY fault_count DESC
  `).all(startOfMonth, endOfMonth);

  const totalPilesByType = db.prepare(`
    SELECT pile_type, COUNT(*) as total_count
    FROM charging_piles
    GROUP BY pile_type
  `).all();

  const pileTypeMap = {};
  totalPilesByType.forEach(t => { pileTypeMap[t.pile_type] = t.total_count; });

  const result = byType.map(t => ({
    ...t,
    total_piles: pileTypeMap[t.pile_type] || 0,
    fault_rate_per_pile: pileTypeMap[t.pile_type] ? Number((t.fault_count / pileTypeMap[t.pile_type]).toFixed(2)) : 0,
    is_batch_issue: t.affected_batch_count === 1 && t.fault_count >= 3,
  }));

  res.json({
    period: `${targetYear}年${targetMonth}月`,
    by_pile_type: result,
    by_batch: byBatch,
  });
});

router.get('/repairer-performance', (req, res) => {
  const db = getDB();
  const { year, month } = req.query;
  const now = dayjs();
  const targetYear = year ? Number(year) : now.year();
  const targetMonth = month ? Number(month) : now.month() + 1;

  const startOfMonth = dayjs(`${targetYear}-${String(targetMonth).padStart(2, '0')}-01`).format('YYYY-MM-DD HH:mm:ss');
  const endOfMonth = dayjs(startOfMonth).endOf('month').format('YYYY-MM-DD HH:mm:ss');

  const performance = db.prepare(`
    SELECT 
      r.id,
      r.name,
      r.phone,
      COUNT(fo.id) as total_orders,
      SUM(CASE WHEN fo.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
      SUM(CASE WHEN fo.status IN ('assigned', 'repairing') THEN 1 ELSE 0 END) as in_progress_orders,
      AVG(CASE WHEN fo.status = 'completed' THEN (julianday(fo.review_at) - julianday(fo.created_at)) * 24 END) as avg_repair_hours
    FROM repairers r
    LEFT JOIN fault_orders fo ON fo.repairer_id = r.id 
      AND fo.created_at >= ? AND fo.created_at <= ? AND fo.merged_to_order_id IS NULL
    GROUP BY r.id
    ORDER BY completed_orders DESC
  `).all(startOfMonth, endOfMonth);

  res.json({
    period: `${targetYear}年${targetMonth}月`,
    performance: performance.map(p => ({
      ...p,
      avg_repair_hours: p.avg_repair_hours ? Number(p.avg_repair_hours.toFixed(2)) : 0,
      completion_rate: p.total_orders > 0 ? Number(((p.completed_orders / p.total_orders) * 100).toFixed(1)) : 0,
    })),
  });
});

router.get('/export-monthly', (req, res) => {
  const db = getDB();
  const { year, month } = req.query;
  const now = dayjs();
  const targetYear = year ? Number(year) : now.year();
  const targetMonth = month ? Number(month) : now.month() + 1;

  const startOfMonth = dayjs(`${targetYear}-${String(targetMonth).padStart(2, '0')}-01`).format('YYYY-MM-DD HH:mm:ss');
  const endOfMonth = dayjs(startOfMonth).endOf('month').format('YYYY-MM-DD HH:mm:ss');

  const orders = db.prepare(`
    SELECT 
      fo.order_no,
      cp.pile_no,
      cp.location,
      cp.pile_type,
      cp.batch_no,
      fo.description,
      fo.reporter,
      fo.reporter_phone,
      fo.status,
      r.name as repairer_name,
      r.phone as repairer_phone,
      fo.repair_result,
      fo.repair_at,
      o.name as reviewer_name,
      fo.review_comment,
      fo.review_at,
      fo.created_at,
      fo.deadline,
      CASE 
        WHEN fo.status IN ('pending', 'assigned', 'repairing', 'reviewing') AND fo.deadline < ? THEN 1
        ELSE 0
      END as is_overdue,
      CASE WHEN fo.status = 'completed' THEN (julianday(fo.review_at) - julianday(fo.created_at)) * 24 ELSE NULL END as repair_hours
    FROM fault_orders fo
    LEFT JOIN charging_piles cp ON fo.pile_id = cp.id
    LEFT JOIN repairers r ON fo.repairer_id = r.id
    LEFT JOIN operators o ON fo.reviewer_id = o.id
    WHERE fo.created_at >= ? AND fo.created_at <= ? AND fo.merged_to_order_id IS NULL
    ORDER BY fo.created_at DESC
  `).all(dayjs().format(), startOfMonth, endOfMonth);

  const statusMap = {
    pending: '待派单',
    assigned: '已派单',
    repairing: '处理中',
    reviewing: '待复核',
    completed: '已完成',
    merged: '已合并',
  };

  const exportData = orders.map(o => ({
    工单号: o.order_no,
    桩号: o.pile_no,
    位置: o.location,
    桩型: o.pile_type,
    批次: o.batch_no || '',
    故障描述: o.description,
    上报人: o.reporter,
    上报人电话: o.reporter_phone || '',
    状态: statusMap[o.status] || o.status,
    维修工: o.repairer_name || '',
    维修工电话: o.repairer_phone || '',
    维修结果: o.repair_result || '',
    维修完成时间: o.repair_at || '',
    复核人: o.reviewer_name || '',
    复核意见: o.review_comment || '',
    复核时间: o.review_at || '',
    上报时间: o.created_at,
    截止时间: o.deadline || '',
    是否逾期: o.is_overdue ? '是' : '否',
    修复时长_小时: o.repair_hours ? Number(o.repair_hours.toFixed(2)) : '',
  }));

  res.json({
    period: `${targetYear}年${targetMonth}月`,
    export_count: exportData.length,
    data: exportData,
  });
});

module.exports = router;
