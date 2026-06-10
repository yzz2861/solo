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
      loading_time,
      exit_time,
      review_time,
      material,
      gross_weight,
      tare_weight,
      net_weight,
      is_anomaly,
      anomaly_types,
      is_review_closed,
      review_opinion,
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

  const tripIds = trips.map(t => t.id);
  const loadingMap = {};
  if (tripIds.length > 0) {
    const placeholders = tripIds.map(() => '?').join(',');
    const loadingRecords = db.prepare(`
      SELECT * FROM loading_records WHERE trip_id IN (${placeholders}) ORDER BY loading_time
    `).all(...tripIds);
    for (const lr of loadingRecords) {
      if (!loadingMap[lr.trip_id]) loadingMap[lr.trip_id] = [];
      loadingMap[lr.trip_id].push(lr);
    }
  }

  const timeline = trips.map(trip => {
    const events = [];
    const loadingRecords = loadingMap[trip.id] || [];
    const loadingStart = loadingRecords.find(r => r.loading_action === 'start');
    const loadingComplete = loadingRecords.find(r => r.loading_action === 'complete');

    if (trip.entry_time) {
      events.push({
        type: 'entry',
        time: trip.entry_time,
        description: '进场',
        status: 'completed'
      });
    }

    if (loadingStart) {
      events.push({
        type: 'loading_start',
        time: loadingStart.loading_time,
        description: '开始装载',
        loader: loadingStart.loader,
        loading_point: loadingStart.loading_point,
        status: loadingComplete || trip.status !== 'loading' ? 'completed' : 'in_progress'
      });
    } else if (trip.status === 'loading' || trip.status === 'loaded' || trip.status === 'exited' || trip.status === 'reviewed') {
      events.push({
        type: 'loading_start',
        time: null,
        description: '开始装载',
        status: 'completed'
      });
    }

    if (loadingComplete) {
      events.push({
        type: 'loading_complete',
        time: loadingComplete.loading_time,
        description: '装载完成',
        loader: loadingComplete.loader,
        loaded_weight: loadingComplete.loaded_weight,
        loading_duration_minutes: loadingComplete.loading_duration,
        status: 'completed'
      });
    } else if (trip.loading_time) {
      events.push({
        type: 'loading_complete',
        time: trip.loading_time,
        description: '装载完成',
        status: 'completed'
      });
    } else if (trip.status === 'loaded' || trip.status === 'exited' || trip.status === 'reviewed') {
      events.push({
        type: 'loading_complete',
        time: null,
        description: '装载完成',
        status: 'completed'
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

    if (trip.review_time) {
      events.push({
        type: 'review',
        time: trip.review_time,
        description: trip.is_review_closed ? '复核完成(已关闭)' : '复核完成',
        opinion: trip.review_opinion,
        status: 'completed'
      });
    }

    if (trip.is_anomaly) {
      events.push({
        type: 'anomaly',
        time: null,
        description: `异常: ${trip.anomaly_types}`,
        status: trip.is_review_closed ? 'resolved' : 'warning'
      });
    }

    events.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return new Date(a.time) - new Date(b.time);
    });

    return {
      trip_id: trip.id,
      trip_no: trip.trip_no,
      plate_number: trip.plate_number,
      material: trip.material,
      status: trip.status,
      loading_start_time: loadingStart ? loadingStart.loading_time : null,
      loading_complete_time: loadingComplete ? loadingComplete.loading_time : trip.loading_time || null,
      loading_duration_minutes: loadingComplete ? loadingComplete.loading_duration : null,
      events,
      is_anomaly: trip.is_anomaly === 1,
      is_review_closed: trip.is_review_closed === 1
    };
  });

  res.json({
    plate_number,
    total: trips.length,
    timeline
  });
});

module.exports = router;
