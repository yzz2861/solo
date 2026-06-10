const express = require('express');
const { db } = require('../db');
const { stringify } = require('csv-stringify/sync');

const router = express.Router();

router.get('/daily', (req, res) => {
  const { date, format = 'json' } = req.query;

  const reportDate = date || new Date().toISOString().split('T')[0];

  const dayStart = `${reportDate} 00:00:00`;
  const dayEnd = `${reportDate} 23:59:59`;

  const totalTrips = db.prepare(`
    SELECT COUNT(*) as cnt FROM trips
    WHERE date(COALESCE(entry_time, created_at)) = date(?)
  `).get(reportDate).cnt;

  const entryCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM entry_records
    WHERE date(entry_time) = date(?)
  `).get(reportDate).cnt;

  const exitCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM exit_weighbridge
    WHERE date(exit_time) = date(?)
  `).get(reportDate).cnt;

  const exitedTrips = db.prepare(`
    SELECT COUNT(*) as cnt FROM trips
    WHERE status = 'exited' AND date(exit_time) = date(?)
  `).get(reportDate).cnt;

  const anomalyTrips = db.prepare(`
    SELECT COUNT(*) as cnt FROM trips
    WHERE is_anomaly = 1 AND date(COALESCE(entry_time, created_at)) = date(?)
  `).get(reportDate).cnt;

  const closedAnomalies = db.prepare(`
    SELECT COUNT(*) as cnt FROM trips
    WHERE is_anomaly = 1 AND is_review_closed = 1
      AND date(COALESCE(entry_time, created_at)) = date(?)
  `).get(reportDate).cnt;

  const duplicateEntry = db.prepare(`
    SELECT COUNT(*) as cnt FROM trips
    WHERE anomaly_types LIKE '%duplicate_entry%'
      AND date(COALESCE(entry_time, created_at)) = date(?)
  `).get(reportDate).cnt;

  const weightDiff = db.prepare(`
    SELECT COUNT(*) as cnt FROM trips
    WHERE anomaly_types LIKE '%weight_diff_exceeded%'
      AND date(COALESCE(entry_time, created_at)) = date(?)
  `).get(reportDate).cnt;

  const missingExit = db.prepare(`
    SELECT COUNT(*) as cnt FROM trips
    WHERE anomaly_types LIKE '%missing_exit_weighbridge%'
      AND date(COALESCE(entry_time, created_at)) = date(?)
  `).get(reportDate).cnt;

  const driverMismatch = db.prepare(`
    SELECT COUNT(*) as cnt FROM trips
    WHERE anomaly_types LIKE '%driver_mismatch%'
      AND date(COALESCE(entry_time, created_at)) = date(?)
  `).get(reportDate).cnt;

  const duplicateExit = db.prepare(`
    SELECT COUNT(*) as cnt FROM trips
    WHERE anomaly_types LIKE '%duplicate_exit%'
      AND date(COALESCE(entry_time, created_at)) = date(?)
  `).get(reportDate).cnt;

  const weightStats = db.prepare(`
    SELECT
      COUNT(*) as cnt,
      SUM(net_weight) as total_net_weight,
      SUM(gross_weight) as total_gross_weight,
      SUM(tare_weight) as total_tare_weight,
      AVG(net_weight) as avg_net_weight
    FROM trips
    WHERE net_weight IS NOT NULL
      AND date(COALESCE(exit_time, created_at)) = date(?)
  `).get(reportDate);

  const vehicleStats = db.prepare(`
    SELECT
      plate_number,
      COUNT(*) as trip_count,
      SUM(net_weight) as total_net_weight
    FROM trips
    WHERE date(COALESCE(entry_time, created_at)) = date(?)
    GROUP BY plate_number
    ORDER BY trip_count DESC
  `).all(reportDate);

  const materialStats = db.prepare(`
    SELECT
      material,
      COUNT(*) as trip_count,
      SUM(net_weight) as total_net_weight
    FROM trips
    WHERE material IS NOT NULL
      AND date(COALESCE(entry_time, created_at)) = date(?)
    GROUP BY material
    ORDER BY trip_count DESC
  `).all(reportDate);

  const tripDetails = db.prepare(`
    SELECT
      id,
      plate_number,
      trip_no,
      driver_name,
      material,
      origin,
      destination,
      status,
      entry_time,
      exit_time,
      gross_weight,
      tare_weight,
      net_weight,
      is_anomaly,
      anomaly_types,
      is_review_closed,
      review_opinion
    FROM trips
    WHERE date(COALESCE(entry_time, created_at)) = date(?)
    ORDER BY entry_time
  `).all(reportDate).map(t => ({
    ...t,
    anomaly_list: t.anomaly_types ? t.anomaly_types.split(',') : []
  }));

  const anomalyDetails = tripDetails.filter(t => t.is_anomaly === 1);

  const report = {
    report_date: reportDate,
    generated_at: new Date().toISOString(),
    summary: {
      total_trips: totalTrips,
      entry_records: entryCount,
      exit_records: exitCount,
      completed_trips: exitedTrips,
      in_progress: totalTrips - exitedTrips,
      anomaly_trips: anomalyTrips,
      closed_anomalies: closedAnomalies,
      open_anomalies: anomalyTrips - closedAnomalies,
      anomaly_rate: totalTrips > 0 ? ((anomalyTrips / totalTrips) * 100).toFixed(2) + '%' : '0%'
    },
    anomaly_breakdown: {
      duplicate_entry: duplicateEntry,
      weight_diff_exceeded: weightDiff,
      missing_exit_weighbridge: missingExit,
      driver_mismatch: driverMismatch,
      duplicate_exit: duplicateExit
    },
    weight_summary: {
      trip_count: weightStats.cnt || 0,
      total_net_weight: weightStats.total_net_weight || 0,
      total_gross_weight: weightStats.total_gross_weight || 0,
      total_tare_weight: weightStats.total_tare_weight || 0,
      avg_net_weight: weightStats.avg_net_weight || 0
    },
    vehicle_stats: vehicleStats,
    material_stats: materialStats,
    anomaly_trips: anomalyDetails,
    all_trips: tripDetails
  };

  if (format === 'csv') {
    const csvRows = tripDetails.map(t => ({
      车牌: t.plate_number,
      车次: t.trip_no,
      司机: t.driver_name || '',
      物料: t.material || '',
      状态: t.status,
      进场时间: t.entry_time || '',
      出场时间: t.exit_time || '',
      毛重: t.gross_weight || '',
      皮重: t.tare_weight || '',
      净重: t.net_weight || '',
      是否异常: t.is_anomaly ? '是' : '否',
      异常类型: t.anomaly_types || '',
      是否已关闭: t.is_review_closed ? '是' : '否',
      复核意见: t.review_opinion || ''
    }));

    const csv = stringify(csvRows, { header: true });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="daily_report_${reportDate}.csv"`);
    return res.send('\uFEFF' + csv);
  }

  res.json(report);
});

router.get('/summary', (req, res) => {
  const { start_date, end_date } = req.query;

  let dateFilter = '';
  const params = [];

  if (start_date) {
    dateFilter += ' AND date(COALESCE(entry_time, created_at)) >= date(?)';
    params.push(start_date);
  }
  if (end_date) {
    dateFilter += ' AND date(COALESCE(entry_time, created_at)) <= date(?)';
    params.push(end_date);
  }

  const dailyStats = db.prepare(`
    SELECT
      date(COALESCE(entry_time, created_at)) as date,
      COUNT(*) as total_trips,
      SUM(CASE WHEN status = 'exited' THEN 1 ELSE 0 END) as completed_trips,
      SUM(CASE WHEN is_anomaly = 1 THEN 1 ELSE 0 END) as anomaly_trips,
      SUM(net_weight) as total_net_weight
    FROM trips
    WHERE 1=1 ${dateFilter}
    GROUP BY date(COALESCE(entry_time, created_at))
    ORDER BY date DESC
  `).all(...params);

  res.json({
    period: { start_date, end_date },
    days: dailyStats.length,
    daily_stats: dailyStats
  });
});

module.exports = router;
