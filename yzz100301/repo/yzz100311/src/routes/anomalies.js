const express = require('express');
const { db } = require('../db');
const config = require('../config');

const router = express.Router();

router.get('/', (req, res) => {
  const {
    anomaly_type,
    plate_number,
    start_date,
    end_date,
    is_closed,
    page = 1,
    page_size = 20
  } = req.query;

  let sql = 'SELECT * FROM trips WHERE is_anomaly = 1';
  const params = [];

  if (anomaly_type) {
    sql += ' AND anomaly_types LIKE ?';
    params.push(`%${anomaly_type}%`);
  }
  if (plate_number) {
    sql += ' AND plate_number = ?';
    params.push(plate_number);
  }
  if (start_date) {
    sql += " AND date(COALESCE(entry_time, created_at)) >= date(?)";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND date(COALESCE(entry_time, created_at)) <= date(?)";
    params.push(end_date);
  }
  if (is_closed !== undefined) {
    sql += ' AND is_review_closed = ?';
    params.push(is_closed === 'true' || is_closed === '1' ? 1 : 0);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as cnt');
  const total = db.prepare(countSql).get(...params).cnt;

  sql += ' ORDER BY COALESCE(entry_time, created_at) DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), (Number(page) - 1) * Number(page_size));

  const trips = db.prepare(sql).all(...params).map(trip => ({
    ...trip,
    anomaly_list: trip.anomaly_types ? trip.anomaly_types.split(',') : []
  }));

  res.json({
    total,
    page: Number(page),
    page_size: Number(page_size),
    trips
  });
});

router.get('/summary', (req, res) => {
  const { start_date, end_date } = req.query;

  let dateFilter = '';
  const params = [];

  if (start_date) {
    dateFilter += " AND date(COALESCE(entry_time, created_at)) >= date(?)";
    params.push(start_date);
  }
  if (end_date) {
    dateFilter += " AND date(COALESCE(entry_time, created_at)) <= date(?)";
    params.push(end_date);
  }

  const totalTrips = db.prepare(
    `SELECT COUNT(*) as cnt FROM trips WHERE 1=1 ${dateFilter}`
  ).get(...params).cnt;

  const anomalyTrips = db.prepare(
    `SELECT COUNT(*) as cnt FROM trips WHERE is_anomaly = 1 ${dateFilter}`
  ).get(...params).cnt;

  const duplicateEntry = db.prepare(
    `SELECT COUNT(*) as cnt FROM trips WHERE anomaly_types LIKE '%duplicate_entry%' ${dateFilter}`
  ).get(...params).cnt;

  const weightDiff = db.prepare(
    `SELECT COUNT(*) as cnt FROM trips WHERE anomaly_types LIKE '%weight_diff_exceeded%' ${dateFilter}`
  ).get(...params).cnt;

  const missingExit = db.prepare(
    `SELECT COUNT(*) as cnt FROM trips WHERE anomaly_types LIKE '%missing_exit_weighbridge%' ${dateFilter}`
  ).get(...params).cnt;

  const driverMismatch = db.prepare(
    `SELECT COUNT(*) as cnt FROM trips WHERE anomaly_types LIKE '%driver_mismatch%' ${dateFilter}`
  ).get(...params).cnt;

  const duplicateExit = db.prepare(
    `SELECT COUNT(*) as cnt FROM trips WHERE anomaly_types LIKE '%duplicate_exit%' ${dateFilter}`
  ).get(...params).cnt;

  const closedAnomalies = db.prepare(
    `SELECT COUNT(*) as cnt FROM trips WHERE is_anomaly = 1 AND is_review_closed = 1 ${dateFilter}`
  ).get(...params).cnt;

  res.json({
    total_trips: totalTrips,
    anomaly_trips: anomalyTrips,
    anomaly_rate: totalTrips > 0 ? (anomalyTrips / totalTrips * 100).toFixed(2) + '%' : '0%',
    breakdown: {
      duplicate_entry: duplicateEntry,
      weight_diff_exceeded: weightDiff,
      missing_exit_weighbridge: missingExit,
      driver_mismatch: driverMismatch,
      duplicate_exit: duplicateExit
    },
    closed_anomalies: closedAnomalies,
    open_anomalies: anomalyTrips - closedAnomalies
  });
});

router.get('/weight-diff', (req, res) => {
  const { plate_number, start_date, end_date, page = 1, page_size = 20 } = req.query;

  let sql = `
    SELECT
      t.*,
      e.gross_weight as exit_gross,
      e.tare_weight as exit_tare,
      e.net_weight as exit_net,
      er.tare_weight as entry_tare,
      (t.gross_from_exit - t.tare_from_entry) as calculated_net,
      ABS(t.net_weight - (t.gross_from_exit - t.tare_from_entry)) as weight_diff,
      CASE WHEN t.net_weight > 0
        THEN ABS(t.net_weight - (t.gross_from_exit - t.tare_from_entry)) / t.net_weight * 100
        ELSE 0
      END as diff_percent
    FROM trips t
    LEFT JOIN exit_weighbridge e ON e.trip_id = t.id
    LEFT JOIN entry_records er ON er.trip_id = t.id
    WHERE t.is_anomaly = 1
      AND t.anomaly_types LIKE '%weight_diff_exceeded%'
  `;
  const params = [];

  if (plate_number) {
    sql += ' AND t.plate_number = ?';
    params.push(plate_number);
  }
  if (start_date) {
    sql += " AND date(COALESCE(t.entry_time, t.created_at)) >= date(?)";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND date(COALESCE(t.entry_time, t.created_at)) <= date(?)";
    params.push(end_date);
  }

  const countSql = sql.replace('SELECT t.*,', 'SELECT COUNT(*) as cnt FROM').replace(/LEFT JOIN.*/s, '');
  const countResult = db.prepare(
    `SELECT COUNT(*) as cnt FROM (${sql}) sub`
  ).get(...params);

  sql += ' ORDER BY diff_percent DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), (Number(page) - 1) * Number(page_size));

  const records = db.prepare(sql).all(...params);

  res.json({
    total: countResult.cnt,
    page: Number(page),
    page_size: Number(page_size),
    records
  });
});

router.get('/missing-exit', (req, res) => {
  const { plate_number, start_date, end_date, page = 1, page_size = 20 } = req.query;

  let sql = `
    SELECT t.*, er.entry_time, er.driver_name
    FROM trips t
    LEFT JOIN entry_records er ON er.trip_id = t.id
    WHERE t.is_anomaly = 1
      AND t.anomaly_types LIKE '%missing_exit_weighbridge%'
  `;
  const params = [];

  if (plate_number) {
    sql += ' AND t.plate_number = ?';
    params.push(plate_number);
  }
  if (start_date) {
    sql += " AND date(COALESCE(t.entry_time, t.created_at)) >= date(?)";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND date(COALESCE(t.entry_time, t.created_at)) <= date(?)";
    params.push(end_date);
  }

  const countResult = db.prepare(
    `SELECT COUNT(*) as cnt FROM (${sql}) sub`
  ).get(...params);

  sql += ' ORDER BY COALESCE(t.entry_time, t.created_at) DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), (Number(page) - 1) * Number(page_size));

  const records = db.prepare(sql).all(...params);

  res.json({
    total: countResult.cnt,
    page: Number(page),
    page_size: Number(page_size),
    records
  });
});

router.get('/driver-mismatch', (req, res) => {
  const { plate_number, start_date, end_date, page = 1, page_size = 20 } = req.query;

  let sql = `
    SELECT t.*, er.driver_name as entry_driver, ew.driver_name as exit_driver
    FROM trips t
    LEFT JOIN entry_records er ON er.trip_id = t.id
    LEFT JOIN exit_weighbridge ew ON ew.trip_id = t.id
    WHERE t.is_anomaly = 1
      AND t.anomaly_types LIKE '%driver_mismatch%'
  `;
  const params = [];

  if (plate_number) {
    sql += ' AND t.plate_number = ?';
    params.push(plate_number);
  }
  if (start_date) {
    sql += " AND date(COALESCE(t.entry_time, t.created_at)) >= date(?)";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND date(COALESCE(t.entry_time, t.created_at)) <= date(?)";
    params.push(end_date);
  }

  const countResult = db.prepare(
    `SELECT COUNT(*) as cnt FROM (${sql}) sub`
  ).get(...params);

  sql += ' ORDER BY COALESCE(t.entry_time, t.created_at) DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), (Number(page) - 1) * Number(page_size));

  const records = db.prepare(sql).all(...params);

  res.json({
    total: countResult.cnt,
    page: Number(page),
    page_size: Number(page_size),
    records
  });
});

module.exports = router;
