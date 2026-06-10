const express = require('express');
const { db } = require('../db');
const { getOrCreateTrip, updateTripAnomalies } = require('../utils/tripService');
const config = require('../config');

const router = express.Router();

router.post('/', (req, res) => {
  const {
    plate_number,
    trip_no,
    weigh_type,
    weight,
    weigh_time,
    weighbridge_no,
    source = 'supplementary',
    raw_data
  } = req.body;

  if (!plate_number || !trip_no || !weigh_type || weight == null) {
    return res.status(400).json({ error: '缺少必填字段: plate_number, trip_no, weigh_type, weight' });
  }

  if (!['gross', 'tare', 'net'].includes(weigh_type)) {
    return res.status(400).json({ error: 'weigh_type 必须是 gross, tare, net 之一' });
  }

  const { trip } = getOrCreateTrip(plate_number, trip_no);

  const suppInfo = db.prepare(`
    INSERT INTO supplementary_weighbridge
    (trip_id, plate_number, trip_no, weigh_type, weight, weigh_time, weighbridge_no, source, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip.id, plate_number, trip_no, weigh_type, weight,
    weigh_time, weighbridge_no, source,
    raw_data || JSON.stringify(req.body)
  );

  const updateFields = [];
  const updateValues = [];

  if (weigh_type === 'gross') {
    updateFields.push('gross_weight = ?');
    updateValues.push(weight);
    updateFields.push('gross_from_exit = ?');
    updateValues.push(weight);
  } else if (weigh_type === 'tare') {
    updateFields.push('tare_weight = ?');
    updateValues.push(weight);
    updateFields.push('tare_from_entry = ?');
    updateValues.push(weight);
    updateFields.push('has_entry_weighbridge = 1');
  } else if (weigh_type === 'net') {
    updateFields.push('net_weight = ?');
    updateValues.push(weight);
  }

  if (updateFields.length > 0) {
    updateValues.push(trip.id);
    db.prepare(`
      UPDATE trips SET ${updateFields.join(', ')}, updated_at = datetime('now')
      WHERE id = ?
    `).run(...updateValues);
  }

  const anomalies = updateTripAnomalies(trip.id);

  const updatedTrip = db.prepare('SELECT * FROM trips WHERE id = ?').get(trip.id);

  res.status(201).json({
    message: '补录地磅数据已记录',
    trip_id: trip.id,
    supplementary_id: suppInfo.lastInsertRowid,
    trip: updatedTrip,
    anomalies
  });
});

router.post('/batch', (req, res) => {
  const records = req.body.records || [];
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records 必须是非空数组' });
  }

  let created = 0;
  let failed = 0;
  const results = [];

  for (const record of records) {
    try {
      const { trip } = getOrCreateTrip(record.plate_number, record.trip_no);

      db.prepare(`
        INSERT INTO supplementary_weighbridge
        (trip_id, plate_number, trip_no, weigh_type, weight, weigh_time, weighbridge_no, source, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        trip.id, record.plate_number, record.trip_no, record.weigh_type,
        record.weight, record.weigh_time, record.weighbridge_no,
        record.source || 'supplementary_batch',
        JSON.stringify(record)
      );

      const updateFields = [];
      const updateValues = [];

      if (record.weigh_type === 'gross') {
        updateFields.push('gross_weight = COALESCE(?, gross_weight)');
        updateValues.push(record.weight);
        updateFields.push('gross_from_exit = COALESCE(?, gross_from_exit)');
        updateValues.push(record.weight);
      } else if (record.weigh_type === 'tare') {
        updateFields.push('tare_weight = COALESCE(?, tare_weight)');
        updateValues.push(record.weight);
        updateFields.push('tare_from_entry = COALESCE(?, tare_from_entry)');
        updateValues.push(record.weight);
      } else if (record.weigh_type === 'net') {
        updateFields.push('net_weight = COALESCE(?, net_weight)');
        updateValues.push(record.weight);
      }

      if (updateFields.length > 0) {
        updateValues.push(trip.id);
        db.prepare(`
          UPDATE trips SET ${updateFields.join(', ')}, updated_at = datetime('now')
          WHERE id = ?
        `).run(...updateValues);
      }

      updateTripAnomalies(trip.id);

      created++;
      results.push({ plate_number: record.plate_number, trip_no: record.trip_no, trip_id: trip.id, success: true });
    } catch (e) {
      failed++;
      results.push({ plate_number: record.plate_number, trip_no: record.trip_no, error: e.message });
    }
  }

  res.json({
    total: records.length,
    created,
    failed,
    results
  });
});

router.get('/', (req, res) => {
  const { plate_number, trip_no, weigh_type, page = 1, page_size = 20 } = req.query;

  let sql = 'SELECT * FROM supplementary_weighbridge WHERE 1=1';
  const params = [];

  if (plate_number) {
    sql += ' AND plate_number = ?';
    params.push(plate_number);
  }
  if (trip_no) {
    sql += ' AND trip_no = ?';
    params.push(trip_no);
  }
  if (weigh_type) {
    sql += ' AND weigh_type = ?';
    params.push(weigh_type);
  }

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as cnt');
  const total = db.prepare(countSql).get(...params).cnt;

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(page_size), (Number(page) - 1) * Number(page_size));

  const records = db.prepare(sql).all(...params);

  res.json({
    total,
    page: Number(page),
    page_size: Number(page_size),
    records
  });
});

module.exports = router;
