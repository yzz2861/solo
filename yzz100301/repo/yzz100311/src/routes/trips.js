const express = require('express');
const { db } = require('../db');
const { getTripDetail } = require('../utils/tripService');

const router = express.Router();

router.get('/', (req, res) => {
  const {
    plate_number,
    trip_no,
    status,
    is_anomaly,
    start_date,
    end_date,
    material,
    page = 1,
    page_size = 20
  } = req.query;

  let sql = 'SELECT * FROM trips WHERE 1=1';
  const params = [];

  if (plate_number) {
    sql += ' AND plate_number = ?';
    params.push(plate_number);
  }
  if (trip_no) {
    sql += ' AND trip_no = ?';
    params.push(trip_no);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (is_anomaly !== undefined) {
    sql += ' AND is_anomaly = ?';
    params.push(is_anomaly === 'true' || is_anomaly === '1' ? 1 : 0);
  }
  if (material) {
    sql += ' AND material = ?';
    params.push(material);
  }
  if (start_date) {
    sql += " AND date(COALESCE(entry_time, created_at)) >= date(?)";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND date(COALESCE(entry_time, created_at)) <= date(?)";
    params.push(end_date);
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

router.get('/:id', (req, res) => {
  const detail = getTripDetail(req.params.id);
  if (!detail) {
    return res.status(404).json({ error: '车次不存在' });
  }
  res.json(detail);
});

router.get('/by-plate/:plate_number', (req, res) => {
  const { plate_number } = req.params;
  const { page = 1, page_size = 20, start_date, end_date } = req.query;

  let sql = 'SELECT * FROM trips WHERE plate_number = ?';
  const params = [plate_number];

  if (start_date) {
    sql += " AND date(COALESCE(entry_time, created_at)) >= date(?)";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND date(COALESCE(entry_time, created_at)) <= date(?)";
    params.push(end_date);
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

router.get('/timeline/:plate_number', (req, res) => {
  const { plate_number } = req.params;
  const { start_date, end_date, limit = 50 } = req.query;

  let sql = `
    SELECT
      id,
      plate_number,
      trip_no,
      status,
      entry_time,
      exit_time,
      material,
      gross_weight,
      tare_weight,
      net_weight,
      is_anomaly,
      anomaly_types,
      'trip' as type
    FROM trips
    WHERE plate_number = ?
  `;
  const params = [plate_number];

  if (start_date) {
    sql += " AND date(COALESCE(entry_time, created_at)) >= date(?)";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND date(COALESCE(entry_time, created_at)) <= date(?)";
    params.push(end_date);
  }

  sql += ' ORDER BY COALESCE(entry_time, created_at) DESC LIMIT ?';
  params.push(Number(limit));

  const trips = db.prepare(sql).all(...params);

  const timeline = trips.map(trip => {
    const events = [];

    if (trip.entry_time) {
      events.push({
        type: 'entry',
        time: trip.entry_time,
        description: '进场',
        status: 'completed'
      });
    }

    if (trip.status === 'loading' || trip.status === 'loaded' || trip.status === 'exited') {
      events.push({
        type: 'loading',
        time: null,
        description: '装载中',
        status: trip.status === 'loading' ? 'in_progress' : 'completed'
      });
    }

    if (trip.exit_time) {
      events.push({
        type: 'exit',
        time: trip.exit_time,
        description: '出场',
        status: 'completed'
      });
    }

    if (trip.is_anomaly) {
      events.push({
        type: 'anomaly',
        time: null,
        description: `异常: ${trip.anomaly_types}`,
        status: 'warning'
      });
    }

    return {
      trip_id: trip.id,
      trip_no: trip.trip_no,
      plate_number: trip.plate_number,
      material: trip.material,
      status: trip.status,
      events,
      is_anomaly: trip.is_anomaly === 1
    };
  });

  res.json({
    plate_number,
    total: trips.length,
    timeline
  });
});

module.exports = router;
